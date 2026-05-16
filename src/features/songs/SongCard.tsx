import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reparseSong } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';

interface Props {
  song: SongSummary;
  reparsing?: boolean;
  onReparse?: () => void;
}

function keyDisplay(key: string | null): string {
  if (!key) return '';
  return key.replace('_SHARP', '#').replace('B_FLAT', 'Bb').replace('_FLAT', 'b').replace(/_/g, '');
}

export default function SongCard({ song, reparsing = false, onReparse }: Props) {
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

  const titleClass = song.title.length > 30
    ? 'text-xs font-semibold text-gray-900 break-words leading-snug'
    : 'text-sm font-semibold text-gray-900 break-words leading-snug';

  return (
    <div
      onClick={() => navigate(`/song/${song.id}`)}
      className="border border-gray-200 rounded-xl p-3 bg-white cursor-pointer hover:shadow-sm flex flex-col gap-1 min-h-[130px] transition-shadow"
    >
      <div className="flex-1">
        <div className={titleClass}>{song.title}</div>
        {song.artist && <div className="text-xs text-gray-400 mt-0.5">{song.artist}</div>}
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          {song.originalKey && <span>{keyDisplay(song.originalKey)}</span>}
          {song.tempo != null && <span>{song.tempo} BPM</span>}
        </div>
        <div className="flex items-center gap-2">
          {reparsing && song.canReparse && (
            <button
              onClick={reparsed ? undefined : handleReparse}
              className={`transition-colors text-base leading-none ${reparsed ? 'text-green-400 cursor-default' : 'text-gray-300 hover:text-indigo-500'}`}
              aria-label="Re-parse song"
            >
              {reparsed ? '✓' : '↺'}
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); navigate(`/song/${song.id}/manage`); }}
            className="text-gray-300 hover:text-indigo-500 transition-colors text-base leading-none"
            aria-label="Manage song"
          >
            ✎
          </button>
        </div>
      </div>
    </div>
  );
}
