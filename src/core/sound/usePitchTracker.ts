import { useState, useEffect, useRef, useCallback } from 'react';
import { PitchDetector } from 'pitchy';

// Listens to the mic and reports when the player hits a target note.
//
// Real tablet mics, with the browser's voice processing switched off (it is tuned for
// speech and smears a sustained guitar note), deliver a raw signal: often quiet, often
// carrying a constant offset or low rumble from handling. Those break pitch detection
// and fixed loudness thresholds, so:
// - A steep high-pass filter (4th-order Butterworth at 65 Hz, below low E's 82 Hz) and per-window mean removal strip offset and
//   rumble before anything is measured.
// - Loudness is judged against the room's own noise floor, never a fixed level, so a
//   quiet mic works as well as a loud one.
// - McLeod Pitch Method (pitchy) over a 4096-sample window (~85 ms, several cycles of
//   low E), analysed every animation frame. A frame only counts when it is confident
//   (clarity), clearly above the noise floor, and in guitar range.
// - Pitch mode accepts the target ±40 cents, or exactly one octave off: overtone octave
//   errors are the classic failure, and within a scale shape each pitch appears once and
//   the next target is a step away, so the allowance can't be mistaken for a neighbour.
//   The pitch must hold for HOLD_MS.
// - Notes are tracked by loudness with hysteresis: a note starts when the sound rises well
//   above the noise floor, or, while one is ringing, when it has decayed and then jumps
//   again (a re-pluck). A held sound, however it wobbles, is one note.
// - After a hit, the next one needs a new note, a settled pitch change, or a moment of
//   silence first, so one ringing note never counts twice.
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
const MIN_CLARITY = 0.85;
const ABS_MIN_RMS = 0.0005;        // below this nothing is sound, however quiet the room
const MIN_HZ = 75;
const MAX_HZ = 1400;
const CENTS_TOLERANCE = 40;
const HOLD_MS = 50;                // pitch held on target this long to count
const NOTE_ON_RATIO = 3;           // a note starts this far above the noise floor…
const NOTE_OFF_RATIO = 1.8;        // …and ends when it falls back under this
const VOICED_RATIO = 2;            // a pitch is only trusted this far above the floor
const OFF_MS = 70;                 // under the off level this long before a note ends
const REPLUCK_DECAY = 0.7;         // while ringing, the sound must fall to this share of its peak…
const REPLUCK_RISE = 1.8;          // …then rise this much from its low point to count as a re-pluck
const MIN_NOTE_GAP_MS = 150;       // shortest time between two note starts
const SILENCE_MS = 70;
const MIN_HIT_GAP_MS = 120;
const FLOOR_DOWN_MS = 150;         // noise floor follows quiet quickly…
const FLOOR_UP_MS = 4000;          // …and loudness slowly, so a long held note can't wedge a note on
const WARMUP_MS = 600;            // learn the room before listening for notes
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
      detector.minVolumeAbsolute = ABS_MIN_RMS;
      const buf = new Float32Array(FFT_SIZE);

      // Noise floor and note tracking by loudness
      let floor = ABS_MIN_RMS;
      let noteOn = false;
      let offSince = -1;         // when the level last dropped under the off level
      let peak = 0;              // loudest since the note started
      let valley = 0;            // quietest since that peak
      let noteStartAt = -Infinity;

      let matchSince = -1;       // pitch mode: on target since
      let candMidi = -1;         // same semitone since candSince
      let candSince = 0;
      let silentSince = -1;
      let armed = true;
      let lastHitMidi = -1;
      let lastHitAt = -Infinity;
      let lastReadout = 0;
      let lastTick = performance.now();
      let startedAt = -1;        // first running frame
      let paused = false;

      const hit = (midi: number, now: number) => {
        armed = false;
        lastHitMidi = midi;
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

        // Noise floor: quick to fall, slow to rise
        const tau = warming ? 100 : rms < floor ? FLOOR_DOWN_MS : FLOOR_UP_MS;
        floor += (rms - floor) * (1 - Math.exp(-dt / tau));
        floor = Math.max(floor, ABS_MIN_RMS / 3);

        // New note? `onset` is true on exactly one frame per note.
        let onset = false;
        const onLevel = Math.max(ABS_MIN_RMS, floor * NOTE_ON_RATIO);
        const offLevel = Math.max(ABS_MIN_RMS * 0.6, floor * NOTE_OFF_RATIO);
        if (warming) {
          // still learning the noise floor
        } else if (!noteOn) {
          if (rms > onLevel && now - noteStartAt >= MIN_NOTE_GAP_MS) {
            noteOn = true; onset = true; noteStartAt = now; peak = valley = rms; offSince = -1;
          }
        } else {
          if (rms > peak) peak = valley = rms;
          else if (rms < valley) valley = rms;
          if (valley < peak * REPLUCK_DECAY && rms > valley * REPLUCK_RISE && now - noteStartAt >= MIN_NOTE_GAP_MS) {
            onset = true; noteStartAt = now; peak = valley = rms;
          }
          if (rms < offLevel) {
            if (offSince < 0) offSince = now;
            if (now - offSince >= OFF_MS) noteOn = false;
          } else offSince = -1;
        }

        const [freq, clarity] = detector.findPitch(buf, ctx.sampleRate);
        const voiced = clarity >= MIN_CLARITY && freq >= MIN_HZ && freq <= MAX_HZ
          && rms >= Math.max(ABS_MIN_RMS, floor * VOICED_RATIO);
        const midiFloat = voiced ? 69 + 12 * Math.log2(freq / 440) : null;
        const midi = midiFloat === null ? null : Math.round(midiFloat);

        if (midi === null) {
          if (silentSince < 0) silentSince = now;
          candMidi = -1;
        } else {
          silentSince = -1;
          if (midi !== candMidi) { candMidi = midi; candSince = now; }
        }
        const newStablePitch = midi !== null && now - candSince >= HOLD_MS && midi !== lastHitMidi;
        const silent = silentSince >= 0 && now - silentSince >= SILENCE_MS;

        if (!armed && (onset || newStablePitch || silent)) armed = true;

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
          if (onset) hit(midi ?? -1, now);
          return;
        }

        if (midiFloat === null) { matchSince = -1; return; }
        const diff = midiFloat - tgt;
        const octave = Math.round(diff / 12);
        const onTarget = Math.abs(octave) <= 1 && Math.abs((diff - 12 * octave) * 100) <= CENTS_TOLERANCE;
        if (!onTarget) { matchSince = -1; return; }
        if (matchSince < 0) matchSince = now;
        if (armed && now - matchSince >= HOLD_MS) hit(midi!, now);
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
