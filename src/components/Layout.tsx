import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Metronome from '../core/metronome/MetronomeWidget';
import { useSongNavContext } from '../core/context/SongNavContext';
import { useMetronomeContext } from '../core/metronome/MetronomeContext';
import { useAuth } from '../core/auth/AuthContext';
import InstrumentSelector from './InstrumentSelector';
import type { InstrumentName } from '../core/useInstrument';

const NAV_LINKS: { label: ReactNode; to: string }[] = [
  { label: 'Licks', to: '/licks' },
  { label: 'Songs', to: '/songs' },
  {
    label: (
      <span className="flex flex-col items-center leading-none">
        <span>Chord</span>
        <span>Gallery</span>
      </span>
    ),
    to: '/chords',
  },
  { label: 'Playlists', to: '/playlists' },
  { label: 'Theory', to: '/theory' },
  { label: 'Noodle', to: '/noodle' },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { info, collapsed, setCollapsed, showChords, setShowChords, miniActions } = useSongNavContext();
  const { setBpm, setIsPlaying, bpm, isPlaying } = useMetronomeContext();
  const { currentUser, logout } = useAuth();
  const BACKEND = `http://${window.location.hostname}:8080`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [instrumentPanelOpen, setInstrumentPanelOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const playlistPanelRef = useRef<HTMLDivElement>(null);
  const instrumentPanelRef = useRef<HTMLDivElement>(null);

  // Close hamburger on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!instrumentPanelOpen) return;
    function handleClick(e: MouseEvent) {
      if (instrumentPanelRef.current && !instrumentPanelRef.current.contains(e.target as Node)) {
        setInstrumentPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [instrumentPanelOpen]);

  // Close playlist panel on outside click
  useEffect(() => {
    if (!playlistPanelOpen) return;
    function handleClick(e: MouseEvent) {
      if (playlistPanelRef.current && !playlistPanelRef.current.contains(e.target as Node)) {
        setPlaylistPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [playlistPanelOpen]);

  // Reset collapsed when leaving song detail
  useEffect(() => {
    if (!info) setCollapsed(false);
  }, [info]);

  // Reset expanded state when collapsing/expanding mini bar
  useEffect(() => {
    setIconsOpen(false);
    setPlaylistPanelOpen(false);
    setInstrumentPanelOpen(false);
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center px-4 sm:px-6">
        {collapsed && info ? (
          /* Mini bar — shown when song view is collapsed */
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="flex flex-col min-w-0">
              {info.artist && (
                <span className="text-xs text-gray-400 truncate">
                  {info.artist}
                </span>
              )}
              <span className="font-semibold text-sm text-gray-900 truncate">
                {info.title}
              </span>
            </div>
            <div className="flex items-start gap-1.5 shrink-0">
              <div className="flex flex-col">
                {info.soundKey && (
                  <span className="text-xs text-gray-500">
                    {info.soundKey}
                  </span>
                )}
                {info.bpm != null && (
                  <button
                    onClick={() => { if (isPlaying && bpm === info.bpm) { setIsPlaying(false); } else { setBpm(info.bpm!); setIsPlaying(true); } }}
                    className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    {info.bpm} BPM
                  </button>
                )}
              </div>
              {info.capo > 0 && (
                <span className="text-xs text-gray-400">Capo {info.capo}</span>
              )}
            </div>

            {/* Right-side mini bar actions */}
            <div className="ml-auto flex items-center gap-3 shrink-0">

              {/* Revealed icons — only when expanded */}
              {iconsOpen && (
                <>
                  {miniActions?.viewMode === 'scroll' && (
                    <button
                      onClick={() => miniActions?.toggleAutoScroll()}
                      className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.autoScrolling ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`}
                      aria-label={miniActions?.autoScrolling ? 'Pause autoscroll' : 'Start autoscroll'}
                    >
                      {miniActions?.autoScrolling ? '⏸' : '▶'}
                    </button>
                  )}

                  {miniActions?.hasPlaylist && (
                    <div className="relative w-8 h-8 flex items-center justify-center" ref={playlistPanelRef}>
                      <button
                        onClick={() => setPlaylistPanelOpen(o => !o)}
                        className={`w-8 h-8 flex items-center justify-center text-sm leading-none transition-colors ${playlistPanelOpen ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`}
                        aria-label="Playlist controls"
                      >
                        🎵
                      </button>
                      {playlistPanelOpen && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2">
                          <button
                            onClick={() => { miniActions?.onPlaylistBack(); setPlaylistPanelOpen(false); setIconsOpen(false); }}
                            className="text-xs text-left text-gray-500 hover:text-indigo-500 transition-colors"
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
                      className="w-12 h-12 flex items-center justify-center text-4xl leading-none text-yellow-500 hover:text-yellow-600 transition-colors"
                      aria-label="Noodle"
                      title="Noodle"
                    >
                      <span className="inline-block -translate-y-[0.15em]">∿</span>
                    </button>
                  )}

                  {miniActions?.hasTabLines && (
                    <button
                      onClick={() => miniActions?.toggleTabLicks()}
                      className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.showTabLicks ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
                      aria-label="Tab positions"
                    >
                      ≡
                    </button>
                  )}

                  <button
                    onClick={() => miniActions?.toggleViewMode()}
                    className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.viewMode === 'scroll' ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`}
                    aria-label="Toggle view"
                  >
                    {miniActions?.viewMode === 'scroll' ? '↕' : '⊞'}
                  </button>

                  <button
                    onClick={() => miniActions?.openTranspose()}
                    className="w-8 h-8 flex items-center justify-center text-xl leading-none text-gray-400 hover:text-indigo-500 transition-colors"
                    aria-label="Capo / Transpose"
                  >
                    Δ
                  </button>

                  {miniActions && (
                    <div className="relative w-8 h-8 flex items-center justify-center" ref={instrumentPanelRef}>
                      <button
                        onClick={() => setInstrumentPanelOpen(o => !o)}
                        className={`w-8 h-8 flex items-center justify-center text-sm leading-none transition-colors ${instrumentPanelOpen ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`}
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
                    onClick={() => { miniActions?.navigateManage(); setIconsOpen(false); }}
                    className="w-8 h-8 flex items-center justify-center text-2xl leading-none text-gray-400 hover:text-indigo-500 transition-colors"
                    aria-label="Manage"
                  >
                    ✎
                  </button>
                </>
              )}

              {/* Toggle button: ⋮ when closed, ✕ when open — leftmost of right section */}
              <button
                onClick={() => { setIconsOpen(o => !o); setPlaylistPanelOpen(false); setInstrumentPanelOpen(false); }}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${iconsOpen ? 'text-indigo-500 hover:text-indigo-700' : 'text-gray-400 hover:text-indigo-500'}`}
                aria-label={iconsOpen ? 'Less options' : 'More options'}
              >
                {iconsOpen ? '>' : '<'}
              </button>

              {/* Add to playlist — always visible */}
              <button
                onClick={() => miniActions?.addToPlaylist()}
                className="w-8 h-8 flex items-center justify-center text-xl leading-none text-blue-400 hover:text-blue-600 transition-colors"
                aria-label="Add to playlist"
              >
                ♪+
              </button>

              {/* Show chords — always visible */}
              <button
                onClick={() => setShowChords(v => !v)}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${showChords ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`}
                aria-label="Show chords"
                title="Show chords"
              >
                ♬
              </button>

              {/* Restore — always rightmost */}
              <button
                onClick={() => setCollapsed(false)}
                className="w-8 h-8 flex items-center justify-center text-xl leading-none text-gray-400 hover:text-indigo-500 transition-colors"
                aria-label="Restore full view"
                title="Restore full view"
              >
                ▼
              </button>
            </div>
          </div>
        ) : (
          /* Normal navbar */
          <>
            <Link
              to="/"
              className="text-gray-900 font-semibold text-base mr-2 sm:mr-8 hover:text-indigo-600 transition-colors shrink-0"
            >
              Lick Library
            </Link>

            {/* Hamburger — mobile only */}
            <div ref={menuRef} className="relative md:hidden">
              <button
                className="p-2 rounded-md text-gray-500 hover:bg-gray-50 transition-colors"
                onClick={() => setMenuOpen(m => !m)}
                aria-label="Menu"
              >
                ☰
              </button>
              {menuOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex flex-col py-1">
                  {NAV_LINKS.map(({ label, to }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        pathname === to
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ label, to }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-3">
              {miniActions?.hasPlaylist && (
                <>
                  <button
                    onClick={() => miniActions?.onPlaylistBack()}
                    className="w-6 h-6 flex items-center justify-center text-base text-gray-400 hover:text-indigo-500 transition-colors"
                    aria-label="Back to playlist"
                  >↩</button>
                  <button
                    onClick={() => miniActions?.onPlaylistPrev()}
                    className="w-6 h-6 flex items-center justify-center text-base text-gray-400 hover:text-indigo-500 transition-colors"
                    aria-label="Previous song"
                  >←</button>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {(miniActions?.playlistCurrentIndex ?? 0) + 1}/{miniActions?.playlistTotal ?? 0}
                  </span>
                  <button
                    onClick={() => miniActions?.onPlaylistNext()}
                    className="w-6 h-6 flex items-center justify-center text-base text-gray-400 hover:text-indigo-500 transition-colors"
                    aria-label="Next song"
                  >→</button>
                </>
              )}
              {!currentUser && (
                <a
                  href={`${BACKEND}/api/oauth2/authorize/google`}
                  className="text-sm text-gray-500 hover:text-indigo-600 transition-colors px-2 py-1"
                >
                  Sign in
                </a>
              )}
              {currentUser && (
                <>
                  <Link
                    to="/user"
                    className={`text-sm transition-colors px-2 py-1 ${currentUser.role === 'ADMIN' ? 'text-indigo-600 font-medium hover:text-indigo-800' : 'text-gray-500 hover:text-gray-900'}`}
                    title={`${currentUser.role} · ${currentUser.status}`}
                  >
                    {currentUser.role === 'ADMIN' ? 'Admin' : 'Account'}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-400 hover:text-gray-700 transition-colors px-2 py-1"
                  >
                    Sign out
                  </button>
                </>
              )}
              {info && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="text-gray-400 hover:text-indigo-500 transition-colors text-2xl leading-none ml-4"
                  aria-label="Collapse song view"
                  title="Collapse navbar"
                >
                  ▲
                </button>
              )}
            </div>
          </>
        )}
        <div className="ml-6 shrink-0">
          <Metronome />
        </div>
      </nav>
      <main className="pt-14">
        <Outlet />
      </main>
    </div>
  );
}
