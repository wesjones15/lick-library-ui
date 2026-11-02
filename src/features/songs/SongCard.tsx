import { useState, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { reparseSong } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';
import { formatNoteEnum, formatKeyWithMode } from '../../core/music';

// Landscape tablets and wider: every card is one height, and a card whose text doesn't fit shrinks its text
const FIXED_CARD_QUERY = '(min-width: 1024px) and (orientation: landscape)';
const CARD_FONT_PX = 16;
const MIN_CARD_FONT_PX = 11;

interface Props {
  song: SongSummary;
  managing?: boolean;
  onReparse?: () => void;
  onAddToPlaylist?: () => void;
}

export default function SongCard({ song, managing = false, onReparse, onAddToPlaylist }: Props) {
  const navigate = useNavigate();
  const [reparsed, setReparsed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Sets the font size on the card element directly; title, artist, key and tempo all follow it (1em)
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    function fit() {
      if (!el) return;
      if (!window.matchMedia(FIXED_CARD_QUERY).matches) { el.style.fontSize = ''; return; }
      let size = CARD_FONT_PX;
      el.style.fontSize = `${size}px`;
      while (size > MIN_CARD_FONT_PX && el.scrollHeight > el.clientHeight + 1) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [song.title, song.artist, managing]);

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

  // Same size for every title; long ones wrap between words onto more lines.
  // On wide screens title, artist, key and tempo all share one larger size.
  const titleClass = 'text-sm lg:text-[1em] font-semibold text-gray-900 break-words leading-snug';

  return (
    <div
      ref={cardRef}
      onClick={managing ? undefined : () => navigate(`/song/${song.id}`)}
      className={`border-2 border-gray-400 rounded-xl p-2 bg-white flex flex-col gap-0.5 min-h-[110px] lg:landscape:h-[124px] lg:landscape:min-h-0 lg:landscape:overflow-hidden lg:text-base compact:flex-row compact:min-h-0 compact:items-center compact:gap-3 transition-shadow ${managing ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'}`}
    >
      <div className="flex-1">
        <div className={titleClass}>{song.title}</div>
        {song.artist && <div className="text-xs lg:text-[1em] text-gray-600 mt-0.5">{song.artist}</div>}
      </div>

      {managing ? (
        <div className="flex gap-2 mt-1">
          {song.canReparse && song.ownedByCurrentUser && (
            <button
              onClick={reparsed ? undefined : handleReparse}
              title={reparsed ? 'done' : 'reparse'}
              className={`flex-1 flex items-center justify-center py-0.5 rounded-lg text-2xl leading-none transition-colors ${
                reparsed ? 'text-success-4 cursor-default' : 'text-gray-600 hover:text-brand-5 hover:bg-brand-1'
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
              className="flex-1 flex items-center justify-center py-0.5 rounded-lg text-4xl leading-none text-gray-600 hover:text-brand-5 hover:bg-brand-1 transition-colors"
              aria-label="Manage song"
            >
              ✎
            </button>
          )}
          {onAddToPlaylist && (
            <button
              onClick={e => { e.stopPropagation(); onAddToPlaylist(); }}
              title="add to playlist"
              className="flex-1 flex items-center justify-center py-0.5 rounded-lg text-2xl leading-none text-gray-600 hover:text-brand-5 hover:bg-brand-1 transition-colors"
              aria-label="Add to playlist"
            >
              ♪+
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center mt-auto pt-1 compact:mt-0 compact:pt-0 compact:flex-col compact:items-end compact:gap-0.5">
          <div className="flex items-center gap-2 text-xs lg:text-[1em] text-gray-600 font-mono compact:flex-col compact:items-end compact:gap-0">
            {song.originalKey && <span>{formatKeyWithMode(formatNoteEnum(song.originalKey), song.mode ?? '')}</span>}
            {song.tempo != null && <span>{song.tempo} BPM</span>}
          </div>
        </div>
      )}
    </div>
  );
}
