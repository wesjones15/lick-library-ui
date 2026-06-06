import { useState, useEffect, useRef } from 'react';
import { useSongNavContext } from '../context/SongNavContext';
import { useMetronomeContext } from '../metronome/MetronomeContext';
import { useSoundContext } from '../sound/SoundContext';
import { useClickOutside } from '../useClickOutside';
import InstrumentSelector from './InstrumentSelector';
import type { InstrumentName } from '../useInstrument';

export default function MiniBar() {
  const { info, collapsed, setCollapsed, showChords, setShowChords, miniActions } = useSongNavContext();
  const { bpm, isPlaying, setBpm, setIsPlaying } = useMetronomeContext();
  const { soundEnabled, setSoundEnabled } = useSoundContext();
  const [iconsOpen, setIconsOpen] = useState(false);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [instrumentPanelOpen, setInstrumentPanelOpen] = useState(false);
  const playlistPanelRef = useRef<HTMLDivElement>(null);
  const instrumentPanelRef = useRef<HTMLDivElement>(null);

  useClickOutside(instrumentPanelRef, instrumentPanelOpen, () => setInstrumentPanelOpen(false));
  useClickOutside(playlistPanelRef, playlistPanelOpen, () => setPlaylistPanelOpen(false));

  useEffect(() => {
    setIconsOpen(false);
    setPlaylistPanelOpen(false);
    setInstrumentPanelOpen(false);
  }, [collapsed]);

  return (
    <div className="flex-1 min-w-0 flex items-center gap-3">
      <div className="flex flex-col min-w-0">
        {info!.artist && (
          <span className="text-xs text-gray-400 truncate">
            {info!.artist}
          </span>
        )}
        <span className="font-semibold text-sm text-gray-900 truncate">
          {info!.title}
        </span>
      </div>
      <div className="flex items-start gap-1.5 shrink-0">
        <div className="flex flex-col">
          {info!.soundKey && (
            <span className="text-xs text-gray-500">
              {info!.soundKey}
            </span>
          )}
          {info!.bpm != null && (
            <button
              onClick={() => { if (isPlaying && bpm === info!.bpm) { setIsPlaying(false); } else { setBpm(info!.bpm!); setIsPlaying(true); } }}
              className="text-xs text-gray-400 hover:text-brand-5 transition-colors"
            >
              {info!.bpm} BPM
            </button>
          )}
        </div>
        {info!.capo > 0 && (
          <span className="text-xs text-gray-400">Capo {info!.capo}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        {iconsOpen && (
          <>
            {miniActions?.viewMode === 'scroll' && (
              <button
                onClick={() => miniActions?.toggleAutoScroll()}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.autoScrolling ? 'text-brand-5' : 'text-gray-400 hover:text-brand-5'}`}
                aria-label={miniActions?.autoScrolling ? 'Pause autoscroll' : 'Start autoscroll'}
              >
                {miniActions?.autoScrolling ? '⏸' : '▶'}
              </button>
            )}

            {miniActions?.hasPlaylist && (
              <div className="relative w-8 h-8 flex items-center justify-center" ref={playlistPanelRef}>
                <button
                  onClick={() => setPlaylistPanelOpen(o => !o)}
                  className={`w-8 h-8 flex items-center justify-center text-sm leading-none transition-colors ${playlistPanelOpen ? 'text-brand-5' : 'text-gray-400 hover:text-brand-5'}`}
                  aria-label="Playlist controls"
                >
                  🎵
                </button>
                {playlistPanelOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2">
                    <button
                      onClick={() => { miniActions?.onPlaylistBack(); setPlaylistPanelOpen(false); setIconsOpen(false); }}
                      className="text-xs text-left text-gray-500 hover:text-brand-5 transition-colors"
                    >
                      ← {miniActions?.playlistName}
                    </button>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => miniActions?.onPlaylistPrev()}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Prev
                      </button>
                      <span className="text-xs text-gray-400">
                        {(miniActions?.playlistCurrentIndex ?? 0) + 1}/{miniActions?.playlistTotal ?? 0}
                      </span>
                      <button
                        onClick={() => miniActions?.onPlaylistNext()}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {miniActions && (
              <button
                onClick={() => { miniActions.navigateNoodle(); setIconsOpen(false); }}
                className="w-12 h-12 flex items-center justify-center text-4xl leading-none text-noodle-1 hover:text-noodle-2 transition-colors"
                aria-label="Noodle"
                title="Noodle"
              >
                <span className="inline-block -translate-y-[0.15em]">∿</span>
              </button>
            )}

            {miniActions?.hasTabLines && (
              <button
                onClick={() => miniActions?.toggleTabLicks()}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.showTabLicks ? 'text-danger-6' : 'text-gray-400 hover:text-gray-600'}`}
                aria-label="Tab positions"
              >
                ≡
              </button>
            )}

            <button
              onClick={() => miniActions?.toggleViewMode()}
              className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.viewMode === 'scroll' ? 'text-brand-5' : 'text-gray-400 hover:text-brand-5'}`}
              aria-label="Toggle view"
            >
              {miniActions?.viewMode === 'scroll' ? '↕' : '⊞'}
            </button>

            <button
              onClick={() => miniActions?.openTranspose()}
              className="w-8 h-8 flex items-center justify-center text-xl leading-none text-gray-400 hover:text-brand-5 transition-colors"
              aria-label="Capo / Transpose"
            >
              Δ
            </button>

            {miniActions && (
              <div className="relative w-8 h-8 flex items-center justify-center" ref={instrumentPanelRef}>
                <button
                  onClick={() => setInstrumentPanelOpen(o => !o)}
                  className={`w-8 h-8 flex items-center justify-center text-sm leading-none transition-colors ${instrumentPanelOpen ? 'text-brand-5' : 'text-gray-400 hover:text-brand-5'}`}
                  aria-label="Instrument"
                >
                  🎸
                </button>
                {instrumentPanelOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                    <InstrumentSelector
                      instrument={miniActions.instrument as InstrumentName}
                      onInstrumentChange={v => { miniActions.setInstrument(v); setInstrumentPanelOpen(false); }}
                      customTuning={miniActions.customTuning ?? ''}
                      onCustomTuningChange={miniActions.setCustomTuning}
                      excludeCustom
                      compact
                    />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${soundEnabled ? 'text-brand-5' : 'text-gray-400 hover:text-brand-5'}`}
              aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>

            <button
              onClick={() => { miniActions?.navigateManage(); setIconsOpen(false); }}
              className="w-8 h-8 flex items-center justify-center text-2xl leading-none text-gray-400 hover:text-brand-5 transition-colors"
              aria-label="Manage"
            >
              ✎
            </button>
          </>
        )}

        <button
          onClick={() => { setIconsOpen(o => !o); setPlaylistPanelOpen(false); setInstrumentPanelOpen(false); }}
          className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${iconsOpen ? 'text-brand-5 hover:text-brand-7' : 'text-gray-400 hover:text-brand-5'}`}
          aria-label={iconsOpen ? 'Less options' : 'More options'}
        >
          {iconsOpen ? '>' : '<'}
        </button>

        <button
          onClick={() => miniActions?.addToPlaylist()}
          className="w-8 h-8 flex items-center justify-center text-xl leading-none text-info-4 hover:text-info-6 transition-colors"
          aria-label="Add to playlist"
        >
          ♪+
        </button>

        <button
          onClick={() => setShowChords(v => !v)}
          className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${showChords ? 'text-brand-5' : 'text-gray-400 hover:text-brand-5'}`}
          aria-label="Show chords"
          title="Show chords"
        >
          ♬
        </button>

        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 flex items-center justify-center text-xl leading-none text-gray-400 hover:text-brand-5 transition-colors"
          aria-label="Restore full view"
          title="Restore full view"
        >
          ▼
        </button>
      </div>
    </div>
  );
}
