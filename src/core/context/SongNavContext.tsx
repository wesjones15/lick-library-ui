import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface SongNavInfo {
  title: string;
  artist?: string;
  bpm?: number;
  shapeKey: string;
  soundKey: string;
  capo: number;
}

interface SongNavContextValue {
  info: SongNavInfo | null;
  setInfo: (info: SongNavInfo | null) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SongNavContext = createContext<SongNavContextValue | null>(null);

export function SongNavProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<SongNavInfo | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SongNavContext.Provider value={{ info, setInfo, collapsed, setCollapsed }}>
      {children}
    </SongNavContext.Provider>
  );
}

export function useSongNavContext() {
  const ctx = useContext(SongNavContext);
  if (!ctx) throw new Error('useSongNavContext must be used inside SongNavProvider');
  return ctx;
}
