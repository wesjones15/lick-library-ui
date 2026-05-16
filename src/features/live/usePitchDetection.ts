import { useState, useEffect } from 'react';

export interface PitchResult {
  midiNote: number | null;
  error: string | null;
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  let rms = 0;
  for (const v of buf) rms += v * v;
  if (Math.sqrt(rms / buf.length) < 0.01) return null;

  const HALF = Math.floor(buf.length / 2);
  // only search the offset range that corresponds to guitar frequencies (80–900 Hz)
  const minOffset = Math.floor(sampleRate / 900);
  const maxOffset = Math.min(HALF, Math.ceil(sampleRate / 80));

  let bestOffset = -1;
  let bestCorr = 0;
  let lastCorr = 1;
  let foundGood = false;

  for (let offset = minOffset; offset < maxOffset; offset++) {
    let corr = 0;
    for (let i = 0; i < HALF; i++) corr += Math.abs(buf[i] - buf[i + offset]);
    corr = 1 - corr / HALF;
    if (corr > 0.9 && corr > lastCorr) {
      foundGood = true;
      if (corr > bestCorr) { bestCorr = corr; bestOffset = offset; }
    } else if (foundGood) {
      break;
    }
    lastCorr = corr;
  }

  if (bestOffset === -1) return null;
  return sampleRate / bestOffset;
}

export function usePitchDetection(enabled: boolean): PitchResult {
  const [midiNote, setMidiNote] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMidiNote(null);
      setError(null);
      return;
    }

    // mediaDevices is undefined on non-secure (HTTP) contexts in Safari
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('NotSecureContext');
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;
    let stream: MediaStream;
    let ctx: AudioContext;
    let cancelled = false;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        // webkitAudioContext fallback for older Safari
        const AudioCtx = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const buf = new Float32Array(analyser.fftSize);

        function tick() {
          analyser.getFloatTimeDomainData(buf);
          const freq = autoCorrelate(buf, ctx.sampleRate);
          setMidiNote(freq !== null ? Math.round(12 * Math.log2(freq / 440) + 69) : null);
        }
        tick();
        intervalId = setInterval(tick, 100);
      })
      .catch(err => {
        if (!cancelled) setError((err as Error).name ?? 'Error');
      });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      stream?.getTracks().forEach(t => t.stop());
      ctx?.close();
    };
  }, [enabled]);

  return { midiNote, error };
}
