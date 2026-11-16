import { useState, useEffect, useRef, useCallback } from 'react';
import { PitchDetector } from 'pitchy';
import { SpectralDenoiser } from './spectralDenoiser';

// Listens to the mic and reports when the player hits a target note.
//
// Built for real rooms: a tablet mic with the browser's voice processing switched off
// (it is tuned for speech and smears a sustained guitar note) hears the guitar plus
// whatever else is going on: a fan, hum, hiss, a constant offset, handling rumble.
// - A steep high-pass filter (4th-order Butterworth at 65 Hz, below low E's 82 Hz) and
//   per-window mean removal strip offset and rumble.
// - Spectral subtraction (SpectralDenoiser) learns the steady background frequency by
//   frequency and removes it from every frame. Note detection and pitch detection both
//   run on what is left, so a fan's roar or hum neither hides a pluck nor looks like one.
// - McLeod Pitch Method (pitchy) on the cleaned 4096-sample window (~85 ms), analysed
//   every animation frame. The readout shows a pitch only when it is confident (clarity),
//   stands clearly above the background, and is in guitar range.
// - Pitch mode accepts the target ±40 cents, or exactly one octave off: overtone octave
//   errors are the classic failure, and within a scale shape each pitch appears once and
//   the next target is a step away, so the allowance can't be mistaken for a neighbour.
//   The reading must stay on the target for HOLD_MS. Because the target is known, a less
//   certain reading still counts when it lands on it; noise won't sit on one exact note.
// - Notes are tracked with hysteresis on the sound above the background: a note starts
//   when it rises well above it, or, while one is ringing, when new frequencies appear
//   (a new note's harmonics). A held sound, however its volume or pitch wobbles, is one
//   note, and one held past NOTE_MAX_MS is closed and learned as background.
// - Any note mode advances once per note start. Pitch mode needs no such guard: each
//   target differs from the note before it, so a note still ringing can't match.
// All timings are in milliseconds, so slow or throttled screens behave the same.

export type MatchMode = 'pitch' | 'any';

export interface Heard { midi: number; cents: number; }

interface Options {
  target: number | null; // MIDI note expected next
  mode: MatchMode;
  onHit: () => void;
}

const FFT_SIZE = 4096;
const HIGHPASS_HZ = 65;
const MIN_CLARITY = 0.8;           // to show or trust a pitch in general…
const MATCH_CLARITY = 0.6;         // …and, lower, to confirm the one note the drill is waiting for
const ABS_MIN_RMS = 0.0005;        // cleaned sound below this is nothing, however quiet the room
const MIN_HZ = 75;
const MAX_HZ = 1400;
const CENTS_TOLERANCE = 40;
const HOLD_MS = 50;                // pitch held on target this long to count
// Sound above the background, as a power ratio to the background (pure background reads ~0.14)
const NOTE_ON_EXCESS = 0.6;        // a note starts above this…
const NOTE_OFF_EXCESS = 0.3;       // …and ends below this
const VOICED_EXCESS = 0.3;         // a pitch is only trusted above this…
const MATCH_EXCESS = 0.2;          // …and, lower, to confirm the one note the drill is waiting for
const OFF_MS = 70;                 // below the off level this long before a note ends
// New sound (SpectralDenoiser flux) that counts as a re-pluck while a note rings; it must
// drop back under FLUX_OFF before another can count
const FLUX_ON = 0.12;
const FLUX_OFF = 0.05;
const MIN_NOTE_GAP_MS = 150;       // shortest time between two note starts
const MIN_HIT_GAP_MS = 120;
// How quickly the learned background follows the room
// Between notes it moves the same speed both ways, so it settles on the background's average
// rather than its quiet moments (which would make ordinary fan flutter look like sound).
const NOISE_MS = 800;
const NOISE_NOTE_MS = 20000;       // during a note it barely moves, so the note isn't learned as noise
const NOTE_MAX_MS = 2500;          // a sound held this long is closed and learned as background
const WARMUP_MS = 600;             // learn the room before listening for notes
const READOUT_MS = 100;

function micErrorMessage(name: string): string {
  if (name === 'NotSecureContext') return 'The mic needs a secure (https) connection.';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Mic access was blocked. Allow it in the browser settings.';
  if (name === 'NotFoundError') return 'No microphone found.';
  return 'Could not start the mic.';
}

export function usePitchTracker(enabled: boolean, { target, mode, onHit }: Options) {
  const [heard, setHeard] = useState<Heard | null>(null);
  const [level, setLevel] = useState(0); // 0–1, for the input meter
  const [error, setError] = useState<string | null>(null);
  const [suspended, setSuspended] = useState(false);

  const optsRef = useRef({ target, mode, onHit });
  useEffect(() => { optsRef.current = { target, mode, onHit }; }, [target, mode, onHit]);

  const ignoreUntil = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);

  // Ignore the mic for a while, e.g. while the reference note sounds.
  const suppress = useCallback((ms: number) => {
    ignoreUntil.current = performance.now() + ms;
  }, []);

  // iPad Safari may keep the audio context paused until a tap.
  const resume = useCallback(() => {
    ctxRef.current?.resume().then(() => setSuspended(false)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setError(micErrorMessage('NotSecureContext')));
      return;
    }

    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    }).then(s => {
      if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s;
      const AudioCtx = window.AudioContext
        ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      ctx.resume().catch(() => {});
      // Two biquads with Butterworth Qs (0.5412, 1.3066) make a 4th-order high-pass.
      // Web Audio takes a high-pass Q in dB.
      const [hp1, hp2] = [0.5412, 1.3066].map(q => {
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = HIGHPASS_HZ;
        f.Q.value = 20 * Math.log10(q);
        return f;
      });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      ctx.createMediaStreamSource(s).connect(hp1);
      hp1.connect(hp2);
      hp2.connect(analyser);

      const detector = PitchDetector.forFloat32Array(FFT_SIZE);
      detector.minVolumeAbsolute = 0;
      const denoiser = new SpectralDenoiser(FFT_SIZE, ctx.sampleRate);
      const buf = new Float32Array(FFT_SIZE);

      // Note tracking on the sound above the background
      let noteOn = false;
      let offSince = -1;         // when the level last dropped under the off level
      let fluxArmed = true;      // new sound has dropped back since the last re-pluck
      let noteStartAt = -Infinity;
      let needQuiet = false;     // after closing a held sound, wait for quiet before a new note

      let matchSince = -1;       // pitch mode: on target since
      let lastHitAt = -Infinity;
      let lastReadout = 0;
      let lastTick = performance.now();
      let startedAt = -1;        // first running frame
      let paused = false;

      const hit = (now: number) => {
        lastHitAt = now;
        matchSince = -1;
        optsRef.current.onHit();
      };

      const tick = () => {
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const dt = Math.min(250, now - lastTick);
        lastTick = now;
        if (ctx.state !== 'running') {
          if (!paused) { paused = true; setSuspended(true); }
          return;
        }
        if (paused) { paused = false; setSuspended(false); }
        if (startedAt < 0) startedAt = now;
        const warming = now - startedAt < WARMUP_MS;

        analyser.getFloatTimeDomainData(buf);
        let mean = 0;
        for (let i = 0; i < buf.length; i++) mean += buf[i];
        mean /= buf.length;
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { buf[i] -= mean; sum += buf[i] * buf[i]; }
        const rms = Math.sqrt(sum / buf.length);

        // Remove the learned background. It is learned fast while warming up, and barely moves
        // either way during a note (a one-sided pull would bias it).
        const learnMs = warming ? 100 : noteOn ? NOISE_NOTE_MS : NOISE_MS;
        const rate = 1 - Math.exp(-dt / learnMs);
        const { clean, excess, cleanRms, flux } = denoiser.process(buf, rate, rate, now);
        const audible = cleanRms >= ABS_MIN_RMS;
        if (flux < FLUX_OFF) fluxArmed = true;
        // New note? `onset` is true on exactly one frame per note.
        let onset = false;
        if (warming) {
          // still learning the background
        } else if (!noteOn) {
          if (needQuiet && excess < NOTE_OFF_EXCESS) needQuiet = false;
          if (!needQuiet && excess > NOTE_ON_EXCESS && audible && now - noteStartAt >= MIN_NOTE_GAP_MS) {
            noteOn = true; onset = true; noteStartAt = now; offSince = -1; fluxArmed = false;
          }
        } else {
          // Re-pluck: new frequencies appearing while a note rings. A held note's volume
          // wobble or vibrato brings none, so it stays one note.
          if (fluxArmed && flux > FLUX_ON && excess > NOTE_ON_EXCESS && now - noteStartAt >= MIN_NOTE_GAP_MS) {
            onset = true; noteStartAt = now; fluxArmed = false;
          }
          if (excess < NOTE_OFF_EXCESS || !audible) {
            if (offSince < 0) offSince = now;
            if (now - offSince >= OFF_MS) noteOn = false;
          } else offSince = -1;
          // A sound held this long (a hum, a drone, a long sustain) is closed rather than
          // re-counted as it fades into the learned background
          if (noteOn && now - noteStartAt > NOTE_MAX_MS) { noteOn = false; needQuiet = true; }
        }

        const [freq, clarity] = detector.findPitch(clean, ctx.sampleRate);
        const pitched = freq >= MIN_HZ && freq <= MAX_HZ && audible && excess >= MATCH_EXCESS;
        const voiced = pitched && clarity >= MIN_CLARITY && excess >= VOICED_EXCESS;
        const midiFloat = voiced ? 69 + 12 * Math.log2(freq / 440) : null;
        const midi = midiFloat === null ? null : Math.round(midiFloat);

        if (now - lastReadout >= READOUT_MS) {
          lastReadout = now;
          setHeard(midiFloat === null ? null : { midi: midi!, cents: Math.round((midiFloat - midi!) * 100) });
          // -66 dB … -6 dB mapped onto the meter
          const db = 20 * Math.log10(Math.max(rms, 1e-6));
          setLevel(Math.max(0, Math.min(1, (db + 66) / 60)));
        }

        const { target: tgt, mode: m } = optsRef.current;
        if (warming || tgt === null || now < ignoreUntil.current || now - lastHitAt < MIN_HIT_GAP_MS) {
          matchSince = -1;
          return;
        }

        if (m === 'any') {
          if (onset) hit(now);
          return;
        }

        // Knowing the target, a less certain reading still counts when it lands on it: noise
        // won't sit within CENTS_TOLERANCE of one exact note for HOLD_MS
        if (!pitched || clarity < MATCH_CLARITY) { matchSince = -1; return; }
        const diff = 69 + 12 * Math.log2(freq / 440) - tgt;
        const octave = Math.round(diff / 12);
        const onTarget = Math.abs(octave) <= 1 && Math.abs((diff - 12 * octave) * 100) <= CENTS_TOLERANCE;
        if (!onTarget) { matchSince = -1; return; }
        if (matchSince < 0) matchSince = now;
        // No re-arm wait here: each target differs from the note before it, so a note still
        // ringing from the last hit can't match
        if (now - matchSince >= HOLD_MS) hit(now);
      };
      tick();
    }).catch(err => {
      if (!cancelled) setError(micErrorMessage((err as Error).name ?? 'Error'));
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      setHeard(null);
      setLevel(0);
      setError(null);
      setSuspended(false);
    };
  }, [enabled]);

  return { heard, level, error, suspended, suppress, resume };
}
