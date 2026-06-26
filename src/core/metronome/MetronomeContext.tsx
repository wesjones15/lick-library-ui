import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useMetronome } from './useMetronome';

interface MetronomeContextValue {
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  beatsPerBar: number;
  setBeatsPerBar: (v: number) => void;
  subscribeBeat: (fn: (beat: number) => void) => void;
  unsubscribeBeat: (fn: (beat: number) => void) => void;
  clickKey: string | null;
  setClickKey: (key: string | null) => void;
}

const MetronomeContext = createContext<MetronomeContextValue | null>(null);

export function MetronomeProvider({ children }: { children: React.ReactNode }) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [clickKey, setClickKey] = useState<string | null>(null);

  const beatListeners = useRef<Set<(beat: number) => void>>(new Set());

  const subscribeBeat = useCallback((fn: (beat: number) => void) => {
    beatListeners.current.add(fn);
  }, []);

  const unsubscribeBeat = useCallback((fn: (beat: number) => void) => {
    beatListeners.current.delete(fn);
  }, []);

  const masterOnBeat = useCallback((beat: number) => {
    beatListeners.current.forEach(fn => fn(beat));
  }, []);

  useMetronome(bpm, isPlaying, masterOnBeat, beatsPerBar, clickKey);

  return (
    <MetronomeContext.Provider value={{ bpm, setBpm, isPlaying, setIsPlaying, beatsPerBar, setBeatsPerBar, subscribeBeat, unsubscribeBeat, clickKey, setClickKey }}>
      {children}
    </MetronomeContext.Provider>
  );
}

export function useMetronomeContext() {
  const ctx = useContext(MetronomeContext);
  if (!ctx) throw new Error('useMetronomeContext must be used inside MetronomeProvider');
  return ctx;
}
