import { useState, useEffect, useRef, useCallback } from 'react';
import { PitchDetector } from 'pitchy';

// Listens to the mic and reports when the player hits a target note.
//
// Accuracy choices:
// - The browser's voice processing (echo cancellation, noise suppression, auto gain) is
//   switched off: it is tuned for speech and smears a sustained guitar note.
// - McLeod Pitch Method (pitchy) over a 4096-sample window (~85 ms, several cycles of low E),
//   analysed every animation frame.
// - A frame only counts when it is confident (clarity), loud enough, and in guitar range.
// - Pitch mode accepts the target ±40 cents, or exactly one octave off: overtone octave
//   errors are the classic failure, and within a scale shape each pitch appears once and
//   the next target is a step away, so the allowance can't be mistaken for a neighbour.
// - A hit needs the pitch held for HOLD_FRAMES frames in a row.
// - Notes are tracked by volume with hysteresis: a note starts when the sound rises well
//   above the room's noise floor, or, while one is ringing, when it has decayed and then
//   jumps again (a re-pluck). A held sound, however it wobbles, is one note.
// - After a hit, the next one needs a new note, a settled pitch change, or a moment of
//   silence first, so one ringing note never counts twice.

export type MatchMode = 'pitch' | 'any';

export interface Heard { midi: number; cents: number; }

interface Options {
  target: number | null; // MIDI note expected next
  mode: MatchMode;
  onHit: () => void;
}

const FFT_SIZE = 4096;
const MIN_CLARITY = 0.9;
const MIN_RMS = 0.006;
const MIN_HZ = 75;
const MAX_HZ = 1400;
const CENTS_TOLERANCE = 40;
const HOLD_FRAMES = 3;
const NOTE_ON_FLOOR_RATIO = 3;   // a note starts this far above the noise floor…
const NOTE_OFF_FLOOR_RATIO = 1.8; // …and ends when it falls back under this
const OFF_FRAMES = 4;             // frames under the off level before a note ends
const REPLUCK_DECAY = 0.7;        // while ringing, the sound must fall to this share of its peak…
const REPLUCK_RISE = 1.8;         // …then rise this much from its low point to count as a re-pluck
const MIN_NOTE_GAP_MS = 150;      // shortest time between two note starts
const SILENCE_FRAMES = 4;
const MIN_HIT_GAP_MS = 120;
const READOUT_MS = 100;

function micErrorMessage(name: string): string {
  if (name === 'NotSecureContext') return 'The mic needs a secure (https) connection.';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Mic access was blocked. Allow it in the browser settings.';
  if (name === 'NotFoundError') return 'No microphone found.';
  return 'Could not start the mic.';
}

export function usePitchTracker(enabled: boolean, { target, mode, onHit }: Options) {
  const [heard, setHeard] = useState<Heard | null>(null);
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
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      ctx.createMediaStreamSource(s).connect(analyser);

      const detector = PitchDetector.forFloat32Array(FFT_SIZE);
      detector.minVolumeAbsolute = MIN_RMS;
      const buf = new Float32Array(FFT_SIZE);

      // Note tracking by volume
      let floor = MIN_RMS / 3;   // room noise level: follows quiet quickly, loud slowly
      let noteOn = false;
      let offFrames = 0;
      let peak = 0;              // loudest since the note started
      let valley = 0;            // quietest since that peak
      let noteStartAt = -Infinity;

      let matchFrames = 0;      // consecutive frames on the target (pitch mode)
      let candMidi = -1;        // consecutive frames on the same semitone
      let candFrames = 0;
      let silentFrames = 0;
      let armed = true;
      let lastHitMidi = -1;
      let lastHitAt = 0;
      let lastReadout = 0;
      let paused = false;

      const hit = (midi: number, now: number) => {
        armed = false;
        lastHitMidi = midi;
        lastHitAt = now;
        matchFrames = 0;
        optsRef.current.onHit();
      };

      const tick = () => {
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        if (ctx.state !== 'running') {
          if (!paused) { paused = true; setSuspended(true); }
          return;
        }
        if (paused) { paused = false; setSuspended(false); }

        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);

        // New note? `onset` is true on exactly one frame per note.
        let onset = false;
        const onLevel = Math.max(MIN_RMS, floor * NOTE_ON_FLOOR_RATIO);
        const offLevel = Math.max(MIN_RMS * 0.6, floor * NOTE_OFF_FLOOR_RATIO);
        if (!noteOn) {
          if (rms > onLevel && now - noteStartAt >= MIN_NOTE_GAP_MS) {
            noteOn = true; onset = true; noteStartAt = now; peak = valley = rms; offFrames = 0;
          } else {
            // Only learn the noise floor between notes
            floor = rms < floor ? floor + (rms - floor) * 0.3 : floor + (rms - floor) * 0.01;
          }
        } else {
          if (rms > peak) { peak = valley = rms; }
          else if (rms < valley) valley = rms;
          if (valley < peak * REPLUCK_DECAY && rms > valley * REPLUCK_RISE && now - noteStartAt >= MIN_NOTE_GAP_MS) {
            onset = true; noteStartAt = now; peak = valley = rms;
          }
          offFrames = rms < offLevel ? offFrames + 1 : 0;
          if (offFrames >= OFF_FRAMES) noteOn = false;
        }

        const [freq, clarity] = detector.findPitch(buf, ctx.sampleRate);
        const voiced = clarity >= MIN_CLARITY && freq >= MIN_HZ && freq <= MAX_HZ && rms >= MIN_RMS;
        const midiFloat = voiced ? 69 + 12 * Math.log2(freq / 440) : null;
        const midi = midiFloat === null ? null : Math.round(midiFloat);

        if (midi === null) {
          silentFrames++;
          candFrames = 0;
          candMidi = -1;
        } else {
          silentFrames = 0;
          if (midi === candMidi) candFrames++;
          else { candMidi = midi; candFrames = 1; }
        }
        const newStablePitch = midi !== null && candFrames >= HOLD_FRAMES && midi !== lastHitMidi;

        if (!armed && (onset || newStablePitch || silentFrames >= SILENCE_FRAMES)) armed = true;

        if (now - lastReadout >= READOUT_MS) {
          lastReadout = now;
          setHeard(midiFloat === null ? null : { midi: midi!, cents: Math.round((midiFloat - midi!) * 100) });
        }

        const { target: tgt, mode: m } = optsRef.current;
        if (tgt === null || now < ignoreUntil.current || now - lastHitAt < MIN_HIT_GAP_MS) {
          matchFrames = 0;
          return;
        }

        if (m === 'any') {
          if (onset) hit(midi ?? -1, now);
          return;
        }

        if (midiFloat === null) { matchFrames = 0; return; }
        const diff = midiFloat - tgt;
        const octave = Math.round(diff / 12);
        const onTarget = Math.abs(octave) <= 1 && Math.abs((diff - 12 * octave) * 100) <= CENTS_TOLERANCE;
        matchFrames = onTarget ? matchFrames + 1 : 0;
        if (armed && matchFrames >= HOLD_FRAMES) hit(midi!, now);
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
      setError(null);
      setSuspended(false);
    };
  }, [enabled]);

  return { heard, error, suspended, suppress, resume };
}
