import { createContext, useContext, useState } from 'react';

interface MetronomeContextValue {
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
}

const MetronomeContext = createContext<MetronomeContextValue | null>(null);

export function MetronomeProvider({ children }: { children: React.ReactNode }) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <MetronomeContext.Provider value={{ bpm, setBpm, isPlaying, setIsPlaying }}>
      {children}
    </MetronomeContext.Provider>
  );
}

export function useMetronomeContext() {
  const ctx = useContext(MetronomeContext);
  if (!ctx) throw new Error('useMetronomeContext must be used inside MetronomeProvider');
  return ctx;
}
