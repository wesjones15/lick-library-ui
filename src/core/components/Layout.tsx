import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import Metronome from '../metronome/MetronomeWidget';
import { useSongNavContext } from '../context/SongNavContext';
import { useMetronomeContext } from '../metronome/MetronomeContext';
import { useAuth } from '../auth/AuthContext';
import InstrumentSelector from './InstrumentSelector';
import type { InstrumentName } from '../useInstrument';
import { C_GRAY_BG_50, C_GRAY_BORDER_200, C_GRAY_TEXT_400, C_GRAY_TEXT_500, C_GRAY_TEXT_700, C_GRAY_TEXT_900, C_INFO_TEXT_DARK, C_INFO_TEXT_SOFT, C_PRIMARY_TEXT, C_PRIMARY_TEXT_MID, C_TEMPO_TEXT, C_TEMPO_TEXT_MID, C_WHITE_BG } from '../colors';

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
  const navigate = useNavigate();
  const { info, collapsed, setCollapsed, showChords, setShowChords, miniActions } = useSongNavContext();
  const { setBpm, setIsPlaying, bpm, isPlaying } = useMetronomeContext();
  const { currentUser, logout } = useAuth();
  const BACKEND = (import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8080/api`).replace(/\/api$/, '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [instrumentPanelOpen, setInstrumentPanelOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const playlistPanelRef = useRef<HTMLDivElement>(null);
  const instrumentPanelRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

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

  // Close account dropdown on outside click
  useEffect(() => {
    if (!accountOpen) return;
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [accountOpen]);

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
    <div className={`min-h-screen ${C_WHITE_BG}`}>
      <nav className={`fixed top-0 left-0 right-0 h-14 ${C_WHITE_BG} border-b ${C_GRAY_BORDER_200} z-50 flex items-center px-4 sm:px-6`}>
        {collapsed && info ? (
          /* Mini bar — shown when song view is collapsed */
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="flex flex-col min-w-0">
              {info.artist && (
                <span className={`text-xs ${C_GRAY_TEXT_400} truncate`}>
                  {info.artist}
                </span>
              )}
              <span className={`font-semibold text-sm ${C_GRAY_TEXT_900} truncate`}>
                {info.title}
              </span>
            </div>
            <div className="flex items-start gap-1.5 shrink-0">
              <div className="flex flex-col">
                {info.soundKey && (
                  <span className={`text-xs ${C_GRAY_TEXT_500}`}>
                    {info.soundKey}
                  </span>
                )}
                {info.bpm != null && (
                  <button
                    onClick={() => { if (isPlaying && bpm === info.bpm) { setIsPlaying(false); } else { setBpm(info.bpm!); setIsPlaying(true); } }}
                    className={`text-xs ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
                  >
                    {info.bpm} BPM
                  </button>
                )}
              </div>
              {info.capo > 0 && (
                <span className={`text-xs ${C_GRAY_TEXT_400}`}>Capo {info.capo}</span>
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
                      className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.autoScrolling ? '${C_PRIMARY_TEXT_MID}' : '${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID}'}`}
                      aria-label={miniActions?.autoScrolling ? 'Pause autoscroll' : 'Start autoscroll'}
                    >
                      {miniActions?.autoScrolling ? '⏸' : '▶'}
                    </button>
                  )}

                  {miniActions?.hasPlaylist && (
                    <div className="relative w-8 h-8 flex items-center justify-center" ref={playlistPanelRef}>
                      <button
                        onClick={() => setPlaylistPanelOpen(o => !o)}
                        className={`w-8 h-8 flex items-center justify-center text-sm leading-none transition-colors ${playlistPanelOpen ? '${C_PRIMARY_TEXT_MID}' : '${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID}'}`}
                        aria-label="Playlist controls"
                      >
                        🎵
                      </button>
                      {playlistPanelOpen && (
                        <div className={`absolute right-0 top-full mt-1 w-48 ${C_WHITE_BG} border ${C_GRAY_BORDER_200} rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2`}>
                          <button
                            onClick={() => { miniActions?.onPlaylistBack(); setPlaylistPanelOpen(false); setIconsOpen(false); }}
                            className={`text-xs text-left ${C_GRAY_TEXT_500} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
                          >
                            ← {miniActions?.playlistName}
                          </button>
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => miniActions?.onPlaylistPrev()}
                              className={`text-xs px-2 py-1 rounded border ${C_GRAY_BORDER_200} ${C_GRAY_TEXT_500} hover:${C_GRAY_BG_50}`}
                            >
                              Prev
                            </button>
                            <span className={`text-xs ${C_GRAY_TEXT_400}`}>
                              {(miniActions?.playlistCurrentIndex ?? 0) + 1}/{miniActions?.playlistTotal ?? 0}
                            </span>
                            <button
                              onClick={() => miniActions?.onPlaylistNext()}
                              className={`text-xs px-2 py-1 rounded border ${C_GRAY_BORDER_200} ${C_GRAY_TEXT_500} hover:${C_GRAY_BG_50}`}
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
                      className={`w-12 h-12 flex items-center justify-center text-4xl leading-none ${C_TEMPO_TEXT} hover:${C_TEMPO_TEXT_MID} transition-colors`}
                      aria-label="Noodle"
                      title="Noodle"
                    >
                      <span className="inline-block -translate-y-[0.15em]">∿</span>
                    </button>
                  )}

                  {miniActions?.hasTabLines && (
                    <button
                      onClick={() => miniActions?.toggleTabLicks()}
                      className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.showTabLicks ? '${C_DANGER_TEXT_SOFT}' : '${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600}'}`}
                      aria-label="Tab positions"
                    >
                      ≡
                    </button>
                  )}

                  <button
                    onClick={() => miniActions?.toggleViewMode()}
                    className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${miniActions?.viewMode === 'scroll' ? '${C_PRIMARY_TEXT_MID}' : '${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID}'}`}
                    aria-label="Toggle view"
                  >
                    {miniActions?.viewMode === 'scroll' ? '↕' : '⊞'}
                  </button>

                  <button
                    onClick={() => miniActions?.openTranspose()}
                    className={`w-8 h-8 flex items-center justify-center text-xl leading-none ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
                    aria-label="Capo / Transpose"
                  >
                    Δ
                  </button>

                  {miniActions && (
                    <div className="relative w-8 h-8 flex items-center justify-center" ref={instrumentPanelRef}>
                      <button
                        onClick={() => setInstrumentPanelOpen(o => !o)}
                        className={`w-8 h-8 flex items-center justify-center text-sm leading-none transition-colors ${instrumentPanelOpen ? '${C_PRIMARY_TEXT_MID}' : '${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID}'}`}
                        aria-label="Instrument"
                      >
                        🎸
                      </button>
                      {instrumentPanelOpen && (
                        <div className={`absolute right-0 top-full mt-1 ${C_WHITE_BG} border ${C_GRAY_BORDER_200} rounded-lg shadow-lg z-50 p-2`}>
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
                    className={`w-8 h-8 flex items-center justify-center text-2xl leading-none ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
                    aria-label="Manage"
                  >
                    ✎
                  </button>
                </>
              )}

              {/* Toggle button: ⋮ when closed, ✕ when open — leftmost of right section */}
              <button
                onClick={() => { setIconsOpen(o => !o); setPlaylistPanelOpen(false); setInstrumentPanelOpen(false); }}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${iconsOpen ? '${C_PRIMARY_TEXT_MID} hover:${C_PRIMARY_TEXT_DARK}' : '${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID}'}`}
                aria-label={iconsOpen ? 'Less options' : 'More options'}
              >
                {iconsOpen ? '>' : '<'}
              </button>

              {/* Add to playlist — always visible */}
              <button
                onClick={() => miniActions?.addToPlaylist()}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none ${C_INFO_TEXT_SOFT} hover:${C_INFO_TEXT_DARK} transition-colors`}
                aria-label="Add to playlist"
              >
                ♪+
              </button>

              {/* Show chords — always visible */}
              <button
                onClick={() => setShowChords(v => !v)}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${showChords ? '${C_PRIMARY_TEXT_MID}' : '${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID}'}`}
                aria-label="Show chords"
                title="Show chords"
              >
                ♬
              </button>

              {/* Restore — always rightmost */}
              <button
                onClick={() => setCollapsed(false)}
                className={`w-8 h-8 flex items-center justify-center text-xl leading-none ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
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
              className={`${C_GRAY_TEXT_900} font-semibold text-base mr-2 sm:mr-8 hover:${C_PRIMARY_TEXT} transition-colors shrink-0`}
            >
              Lick Library
            </Link>

            {/* Hamburger — mobile only */}
            <div ref={menuRef} className="relative md:hidden">
              <button
                className={`p-2 rounded-md ${C_GRAY_TEXT_500} hover:${C_GRAY_BG_50} transition-colors`}
                onClick={() => setMenuOpen(m => !m)}
                aria-label="Menu"
              >
                ☰
              </button>
              {menuOpen && (
                <div className={`absolute top-full left-0 mt-1 w-44 ${C_WHITE_BG} border ${C_GRAY_BORDER_200} rounded-lg shadow-lg z-50 flex flex-col py-1`}>
                  {NAV_LINKS.map(({ label, to }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        pathname === to
                          ? '${C_PRIMARY_BG_SOFT} ${C_PRIMARY_TEXT}'
                          : '${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50}'
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
                        ? '${C_PRIMARY_BG_SOFT} ${C_PRIMARY_TEXT}'
                        : '${C_GRAY_TEXT_500} hover:${C_GRAY_TEXT_900} hover:${C_GRAY_BG_50}'
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
                    className={`w-6 h-6 flex items-center justify-center text-base ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
                    aria-label="Back to playlist"
                  >↩</button>
                  <button
                    onClick={() => miniActions?.onPlaylistPrev()}
                    className={`w-6 h-6 flex items-center justify-center text-base ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
                    aria-label="Previous song"
                  >←</button>
                  <span className={`text-xs ${C_GRAY_TEXT_400} tabular-nums`}>
                    {(miniActions?.playlistCurrentIndex ?? 0) + 1}/{miniActions?.playlistTotal ?? 0}
                  </span>
                  <button
                    onClick={() => miniActions?.onPlaylistNext()}
                    className={`w-6 h-6 flex items-center justify-center text-base ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors`}
                    aria-label="Next song"
                  >→</button>
                </>
              )}
              {!currentUser && (
                <a
                  href={`${BACKEND}/api/oauth2/authorize/google`}
                  className={`text-sm ${C_GRAY_TEXT_500} hover:${C_PRIMARY_TEXT} transition-colors px-2 py-1`}
                >
                  Sign in
                </a>
              )}
              {currentUser && (
                <div className="relative" ref={accountRef}>
                  <button
                    onClick={() => setAccountOpen(o => !o)}
                    className={`text-xl transition-colors px-2 py-1 leading-none ${currentUser.role === 'ADMIN' ? '${C_PRIMARY_TEXT} hover:${C_PRIMARY_TEXT_STRONG}' : '${C_GRAY_TEXT_500} hover:${C_GRAY_TEXT_900}'}`}
                    title={`${currentUser.role} · ${currentUser.status}`}
                    aria-label="Account menu"
                  >
                    {currentUser.role === 'ADMIN' ? '⚙︎' : '👤'}
                  </button>
                  {accountOpen && (
                    <div className={`absolute right-0 top-full mt-1 ${C_WHITE_BG} border ${C_GRAY_BORDER_200} rounded-lg shadow-md py-1 z-50 min-w-[120px]`}>
                      <button
                        onClick={() => { navigate('/user'); setAccountOpen(false); }}
                        className={`w-full text-left text-sm px-4 py-2 ${C_GRAY_TEXT_700} hover:${C_GRAY_BG_50} transition-colors`}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => { logout(); setAccountOpen(false); }}
                        className={`w-full text-left text-sm px-4 py-2 ${C_GRAY_TEXT_500} hover:${C_GRAY_BG_50} transition-colors`}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
              {info && (
                <button
                  onClick={() => setCollapsed(true)}
                  className={`${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors text-2xl leading-none ml-4`}
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
