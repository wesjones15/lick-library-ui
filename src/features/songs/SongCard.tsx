import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reparseSong } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';

interface Props {
  song: SongSummary;
  reparsing?: boolean;
  onReparse?: () => void;
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

  return (
    <div
      onClick={() => navigate(`/song/${song.id}`)}
      className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-900">{song.title}</span>
        {song.artist && <span className="text-xs text-gray-500">{song.artist}</span>}
      </div>
      <div className="flex items-center gap-3">
        {song.originalKey && (
          <span className="text-xs text-gray-400 font-mono">{song.originalKey.replace('_SHARP', '#').replace('_FLAT', 'b').replace('_', '')}</span>
        )}
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
  );
}
