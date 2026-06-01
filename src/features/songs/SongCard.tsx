import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reparseSong } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';
import { formatNoteEnum, formatKeyWithMode } from '../../core/music';

interface Props {
  song: SongSummary;
  managing?: boolean;
  onReparse?: () => void;
  onAddToPlaylist?: () => void;
}

export default function SongCard({ song, managing = false, onReparse, onAddToPlaylist }: Props) {
  const navigate = useNavigate();
  const [reparsed, setReparsed] = useState(false);

  async function handleReparse(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await reparseSong(song.id);
      setReparsed(true);
      onReparse?.();
    } catch {
      // swallow
    }
  }

  const titleClass =
    song.title.length > 40
      ? 'text-[10px] font-semibold text-gray-900 break-words leading-snug line-clamp-2'
      : song.title.length > 22
      ? 'text-xs font-semibold text-gray-900 break-words leading-snug line-clamp-2'
      : 'text-sm font-semibold text-gray-900 break-words leading-snug line-clamp-2';

  return (
    <div
      onClick={managing ? undefined : () => navigate(`/song/${song.id}`)}
      className={`border border-gray-200 rounded-xl p-2 bg-white flex flex-col gap-0.5 min-h-[110px] portrait:flex-row portrait:min-h-0 portrait:items-center portrait:gap-3 transition-shadow ${managing ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'}`}
    >
      <div className="flex-1">
        <div className={titleClass}>{song.title}</div>
        {song.artist && <div className="text-xs text-gray-400 mt-0.5">{song.artist}</div>}
      </div>

      {managing ? (
        <div className="flex gap-2 mt-1">
          {song.canReparse && song.ownedByCurrentUser && (
            <button
              onClick={reparsed ? undefined : handleReparse}
              title={reparsed ? 'done' : 'reparse'}
              className={`flex-1 flex items-center justify-center py-0.5 rounded-lg text-2xl leading-none transition-colors ${
                reparsed ? 'text-green-400 cursor-default' : 'text-gray-300 hover:text-indigo-500 hover:bg-indigo-50'
              }`}
              aria-label="Re-parse song"
            >
              {reparsed ? '✓' : '↺'}
            </button>
          )}
          {song.ownedByCurrentUser && (
            <button
              onClick={e => { e.stopPropagation(); navigate(`/song/${song.id}/manage`); }}
              title="manage"
              className="flex-1 flex items-center justify-center py-0.5 rounded-lg text-4xl leading-none text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
              aria-label="Manage song"
            >
              ✎
            </button>
          )}
          {onAddToPlaylist && (
            <button
              onClick={e => { e.stopPropagation(); onAddToPlaylist(); }}
              title="add to playlist"
              className="flex-1 flex items-center justify-center py-0.5 rounded-lg text-2xl leading-none text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
              aria-label="Add to playlist"
            >
              ♪+
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center mt-auto pt-1 portrait:mt-0 portrait:pt-0 portrait:flex-col portrait:items-end portrait:gap-0.5">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono portrait:flex-col portrait:items-end portrait:gap-0">
            {song.originalKey && <span>{formatKeyWithMode(formatNoteEnum(song.originalKey), song.mode ?? '')}</span>}
            {song.tempo != null && <span>{song.tempo} BPM</span>}
          </div>
        </div>
      )}
    </div>
  );
}
