import { useLocation } from 'react-router-dom';

export interface PlaylistNavEntry {
  entryId: string;
  songId: string;
  title: string;
  keyOffset: number;
  capoOffset: number;
  tempoOverride?: number | null;
  instrument?: string | null;
}

export interface PlaylistNavState {
  playlistId: string;
  playlistName: string;
  entries: PlaylistNavEntry[];
  currentIndex: number;
}

export function usePlaylistNav(): PlaylistNavState | null {
  const location = useLocation();
  return (location.state as PlaylistNavState | null) ?? null;
}
