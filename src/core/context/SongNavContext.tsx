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

export interface MiniActions {
  addToPlaylist: () => void;
  openTranspose: () => void;
  navigateManage: () => void;
  viewMode: 'columns' | 'scroll';
  toggleViewMode: () => void;
  autoScrolling: boolean;
  toggleAutoScroll: () => void;
  showTabLicks: boolean;
  toggleTabLicks: () => void;
  hasTabLines: boolean;
  hasPlaylist: boolean;
  playlistName: string | null;
  playlistCurrentIndex: number;
  playlistTotal: number;
  onPlaylistPrev: () => void;
  onPlaylistNext: () => void;
  onPlaylistBack: () => void;
  instrument: string;
  setInstrument: (v: string) => void;
}

interface SongNavContextValue {
  info: SongNavInfo | null;
  setInfo: (info: SongNavInfo | null) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  showChords: boolean;
  setShowChords: (v: boolean | ((prev: boolean) => boolean)) => void;
  miniActions: MiniActions | null;
  setMiniActions: (actions: MiniActions | null) => void;
}

const SongNavContext = createContext<SongNavContextValue | null>(null);

export function SongNavProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<SongNavInfo | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showChords, setShowChords] = useState(false);
  const [miniActions, setMiniActions] = useState<MiniActions | null>(null);
  return (
    <SongNavContext.Provider value={{ info, setInfo, collapsed, setCollapsed, showChords, setShowChords, miniActions, setMiniActions }}>
      {children}
    </SongNavContext.Provider>
  );
}

export function useSongNavContext() {
  const ctx = useContext(SongNavContext);
  if (!ctx) throw new Error('useSongNavContext must be used inside SongNavProvider');
  return ctx;
}
