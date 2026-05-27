import { createContext, useContext, useState } from 'react';

interface MetronomeContextValue {
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  beatsPerBar: number;
  setBeatsPerBar: (v: number) => void;
}

const MetronomeContext = createContext<MetronomeContextValue | null>(null);

export function MetronomeProvider({ children }: { children: React.ReactNode }) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  return (
    <MetronomeContext.Provider value={{ bpm, setBpm, isPlaying, setIsPlaying, beatsPerBar, setBeatsPerBar }}>
      {children}
    </MetronomeContext.Provider>
  );
}

export function useMetronomeContext() {
  const ctx = useContext(MetronomeContext);
  if (!ctx) throw new Error('useMetronomeContext must be used inside MetronomeProvider');
  return ctx;
}
