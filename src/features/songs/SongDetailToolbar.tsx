import { useState, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SongDetail } from '../../core/api/client';

interface SongDetailToolbarProps {
  id: string;
  song: SongDetail;
  semitones: number;
  capo: number;
  viewMode: 'columns' | 'scroll';
  setViewMode: Dispatch<SetStateAction<'columns' | 'scroll'>>;
  showChords: boolean;
  setShowChords: Dispatch<SetStateAction<boolean>>;
  autoScrolling: boolean;
  setAutoScrolling: Dispatch<SetStateAction<boolean>>;
  showTabLicks: boolean;
  hasTabLines: boolean;
  reparsing: boolean;
  handleTabLicksToggle: () => void;
  currentPlaylistEntryTempoOverride?: number | null;
  overrideChanged: boolean;
  setAddToPlaylistOpen: Dispatch<SetStateAction<boolean>>;
}

const MENU_ITEM = 'px-4 py-2 text-sm text-left text-gray-600 hover:bg-gray-50';

function stubBtnClass(active: boolean) {
  return `px-2 py-1 text-xs rounded border transition-colors ${active
    ? 'border-brand-3 bg-brand-1 text-brand-6'
    : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`;
}

export default function SongDetailToolbar({
  id, song, semitones, capo,
  viewMode, setViewMode,
  showChords, setShowChords,
  autoScrolling, setAutoScrolling,
  showTabLicks, hasTabLines, reparsing, handleTabLicksToggle,
  currentPlaylistEntryTempoOverride,
  overrideChanged,
  setAddToPlaylistOpen,
}: SongDetailToolbarProps) {
  const navigate = useNavigate();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function handle(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [overflowOpen]);

  const noodleUrl = `/noodle?songId=${id}&semitones=${semitones}&capo=${capo}&tempoOverride=${currentPlaylistEntryTempoOverride ?? ''}`;

  return (
    <>
      {/* Auto-scroll play/pause — shown only in scroll mode */}
      {viewMode === 'scroll' && (
        <button
          onClick={() => setAutoScrolling(a => !a)}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xl leading-none transition-colors ${autoScrolling ? 'border-brand-3 bg-brand-1 text-brand-5' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
          aria-label={autoScrolling ? 'Pause autoscroll' : 'Start autoscroll'}
        >
          {autoScrolling ? '⏸' : '▶'}
        </button>
      )}

      {/* Desktop (md+): named/icon buttons */}
      <button
        onClick={() => navigate(noodleUrl)}
        className="hidden md:flex items-center text-noodle-1 hover:text-noodle-2 transition-colors text-5xl leading-none"
        aria-label="Noodle" title="Noodle"
      >
        <span className="inline-block -translate-y-[0.15em]">∿</span>
      </button>
      {hasTabLines && (
        <button
          onClick={handleTabLicksToggle}
          disabled={reparsing}
          className={`hidden md:flex w-8 h-8 rounded-lg border items-center justify-center text-xs font-mono transition-colors disabled:opacity-40 ${showTabLicks ? 'border-danger-4 bg-danger-1 text-danger-6' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
          aria-label="Tab positions (experimental)" title="Tab positions (experimental)"
        >
          {reparsing ? '…' : '≡'}
        </button>
      )}
      <button
        onClick={() => setViewMode(m => m === 'columns' ? 'scroll' : 'columns')}
        className={`hidden md:flex ${stubBtnClass(viewMode === 'scroll')} flex-col items-center w-14`}
      >
        <span style={{ fontSize: '9px' }}>view:</span>
        <span style={{ fontSize: '9px' }}>{viewMode === 'scroll' ? 'scroll' : 'columns'}</span>
      </button>
      <button
        onClick={() => setShowChords(v => !v)}
        className={`hidden md:block ${stubBtnClass(showChords)}`}
      >
        Show Chords
      </button>
      <button
        onClick={() => setAddToPlaylistOpen(true)}
        className={`hidden md:block transition-colors text-xl leading-none ${overrideChanged ? 'text-brand-5 hover:text-brand-7' : 'text-info-4 hover:text-info-6'}`}
        aria-label="Add to playlist" title="Add to playlist"
      >
        ♪+
      </button>
      {song.ownedByCurrentUser && (
        <button
          onClick={() => navigate(`/song/${id}/manage?semitones=${semitones}`)}
          className="hidden md:block text-gray-300 hover:text-brand-5 transition-colors text-4xl leading-none"
          aria-label="Manage song"
        >
          ✎
        </button>
      )}

      {/* Landscape (sm–md): icon buttons */}
      <button
        onClick={() => navigate(noodleUrl)}
        className="hidden sm:flex md:hidden w-8 h-8 rounded-lg border border-gray-200 items-center justify-center text-4xl leading-none transition-colors text-noodle-1 hover:text-noodle-2"
        aria-label="Noodle" title="Noodle"
      >
        <span className="inline-block -translate-y-[0.15em]">∿</span>
      </button>
      {hasTabLines && (
        <button
          onClick={handleTabLicksToggle}
          disabled={reparsing}
          className={`hidden sm:flex md:hidden w-8 h-8 rounded-lg border items-center justify-center text-xs font-mono transition-colors disabled:opacity-40 ${showTabLicks ? 'border-danger-4 bg-danger-1 text-danger-6' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
          aria-label="Tab positions (experimental)" title="Tab positions (experimental)"
        >
          {reparsing ? '…' : '≡'}
        </button>
      )}
      <button
        onClick={() => setViewMode(m => m === 'columns' ? 'scroll' : 'columns')}
        className={`hidden sm:flex md:hidden w-8 h-8 rounded-lg border items-center justify-center text-xs transition-colors ${viewMode === 'scroll' ? 'border-brand-3 bg-brand-1 text-brand-6' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
        aria-label="Toggle view"
        title={viewMode === 'scroll' ? 'Switch to columns' : 'Switch to scroll'}
      >
        {viewMode === 'scroll' ? '↕' : '⊞'}
      </button>
      <button
        onClick={() => setShowChords(v => !v)}
        className={`hidden sm:flex md:hidden w-8 h-8 rounded-lg border items-center justify-center text-base transition-colors ${showChords ? 'border-brand-3 bg-brand-1 text-brand-6' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
        aria-label="Show chords" title="Show chords"
      >
        ♬
      </button>
      <button
        onClick={() => setAddToPlaylistOpen(true)}
        className={`hidden sm:flex md:hidden w-8 h-8 rounded-lg border items-center justify-center text-base transition-colors ${overrideChanged ? 'border-brand-3 text-brand-5 hover:text-brand-7 hover:border-brand-4' : 'border-gray-200 text-info-4 hover:text-info-6 hover:border-gray-300'}`}
        aria-label="Add to playlist" title="Add to playlist"
      >
        ♪+
      </button>
      {song.ownedByCurrentUser && (
        <button
          onClick={() => navigate(`/song/${id}/manage?semitones=${semitones}`)}
          className="hidden sm:block md:hidden text-gray-300 hover:text-brand-5 transition-colors text-3xl leading-none"
          aria-label="Manage song"
        >
          ✎
        </button>
      )}

      {/* Portrait (<sm): hamburger ⋮ */}
      <div ref={overflowRef} className="relative sm:hidden">
        <button
          onClick={() => setOverflowOpen(o => !o)}
          className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-xl leading-none"
          aria-label="More options"
        >
          ⋮
        </button>
        {overflowOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex flex-col py-1">
            <button
              onClick={() => { setViewMode(m => m === 'columns' ? 'scroll' : 'columns'); setOverflowOpen(false); }}
              className={MENU_ITEM}
            >
              View: {viewMode === 'scroll' ? 'columns' : 'scroll'}
            </button>
            <button
              onClick={() => { setShowChords(v => !v); setOverflowOpen(false); }}
              className={MENU_ITEM}
            >
              {showChords ? 'Hide Chords' : 'Show Chords'}
            </button>
            <button
              onClick={() => { setAddToPlaylistOpen(true); setOverflowOpen(false); }}
              className={`px-4 py-2 text-sm text-left hover:bg-gray-50 ${overrideChanged ? 'text-brand-6' : 'text-info-5'}`}
            >
              Add to playlist
            </button>
            {song.ownedByCurrentUser && (
              <button
                onClick={() => { navigate(`/song/${id}/manage?semitones=${semitones}`); setOverflowOpen(false); }}
                className={MENU_ITEM}
              >
                Manage
              </button>
            )}
            <button
              onClick={() => { navigate(noodleUrl); setOverflowOpen(false); }}
              className={MENU_ITEM}
            >
              Noodle
            </button>
            {hasTabLines && (
              <button
                onClick={() => { handleTabLicksToggle(); setOverflowOpen(false); }}
                disabled={reparsing}
                className={`px-4 py-2 text-sm text-left transition-colors disabled:opacity-40 ${showTabLicks ? 'text-danger-6' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {reparsing ? 'Detecting tabs…' : showTabLicks ? 'Tab positions: on' : 'Tab positions'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
