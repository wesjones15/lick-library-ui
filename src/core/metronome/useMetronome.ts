import { useRef, useEffect, useCallback } from 'react';
import { noteToHz } from '../music';

const LOOKAHEAD = 0.1;       // seconds to schedule ahead
const TICK_INTERVAL = 25;    // ms between scheduler ticks

function scheduleClick(ctx: AudioContext, time: number, accent: boolean, accentHz: number, regularHz: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = accent ? accentHz : regularHz;
  gain.gain.setValueAtTime(accent ? 0.4 : 0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.start(time);
  osc.stop(time + 0.06);
}

export function useMetronome(
  bpm: number,
  isPlaying: boolean,
  onBeat: (beat: number) => void,
  beatsPerBar = 4,
  clickKey?: string | null,
) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextBeatTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep latest values in refs so the scheduler closure doesn't go stale
  const bpmRef = useRef(bpm);
  const onBeatRef = useRef(onBeat);
  const beatsPerBarRef = useRef(beatsPerBar);
  const clickKeyRef = useRef(clickKey);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { onBeatRef.current = onBeat; }, [onBeat]);
  useEffect(() => { beatsPerBarRef.current = beatsPerBar; }, [beatsPerBar]);
  useEffect(() => { clickKeyRef.current = clickKey; }, [clickKey]);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const secondsPerBeat = 60 / bpmRef.current;
    while (nextBeatTimeRef.current < ctx.currentTime + LOOKAHEAD) {
      const beat = currentBeatRef.current;
      const key = clickKeyRef.current;
      const accentHz  = key ? noteToHz(key, 12) : 1000;
      const regularHz = key ? noteToHz(key, 0)  : 800;
      scheduleClick(ctx, nextBeatTimeRef.current, beat === 0, accentHz, regularHz);
      const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000);
      setTimeout(() => onBeatRef.current(beat), delay);
      currentBeatRef.current = (beat + 1) % beatsPerBarRef.current;
      nextBeatTimeRef.current += secondsPerBeat;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      nextBeatTimeRef.current = ctx.currentTime + 0.05;
      currentBeatRef.current = 0;
      tickerRef.current = setInterval(scheduler, TICK_INTERVAL);
    } else {
      if (tickerRef.current !== null) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    }
    return () => {
      if (tickerRef.current !== null) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    };
  }, [isPlaying, scheduler]);
}
