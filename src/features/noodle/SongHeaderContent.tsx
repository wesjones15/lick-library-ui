import { Link } from 'react-router-dom';
import type { SongDetail } from '../../core/api/client';
import { isTabLine } from './songUtils';

interface SongTitleInfoProps {
  song: SongDetail | null;
  activeSongId: string | null;
  showBackLink: boolean;
}

export function SongTitleInfo({ song, activeSongId, showBackLink }: SongTitleInfoProps) {
  if (!song) return null;
  return (
    <div className="flex flex-col min-w-0">
      {song.artist && (
        <span className="text-xs text-gray-400 leading-tight truncate">{song.artist}</span>
      )}
      {showBackLink ? (
        <Link
          to={`/song/${activeSongId}`}
          className="font-bold text-base text-gray-900 hover:text-brand-6 leading-tight truncate"
        >
          {song.title}
        </Link>
      ) : (
        <span className="font-bold text-base text-gray-900 leading-tight truncate">{song.title}</span>
      )}
    </div>
  );
}

interface SongHeaderActionsProps {
  song: SongDetail | null;
  guitarKaraokeMode: boolean;
  setGuitarKaraokeMode: (fn: (v: boolean) => boolean) => void;
  lickModeEnabled: boolean;
  setLickModeEnabled: (fn: (v: boolean) => boolean) => void;
}

export function SongHeaderActions({
  song, guitarKaraokeMode, setGuitarKaraokeMode, lickModeEnabled, setLickModeEnabled,
}: SongHeaderActionsProps) {
  return (
    <>
      <button
        onClick={() => setGuitarKaraokeMode(v => !v)}
        className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${guitarKaraokeMode ? 'text-brand-5' : 'text-gray-300 hover:text-gray-500'}`}
        aria-label="Toggle guitar karaoke"
      >
        ◎
      </button>
      {song?.chordLines.some(isTabLine) && (
        <button
          onClick={() => setLickModeEnabled(v => !v)}
          className={`w-8 h-8 flex items-center justify-center text-base font-bold leading-none transition-colors ${lickModeEnabled ? 'text-brand-5' : 'text-gray-300 hover:text-gray-500'}`}
          aria-label="Toggle lick mode"
          title="Lick mode"
        >
          ⑇
        </button>
      )}
    </>
  );
}
