import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import Metronome from '../core/metronome/MetronomeWidget';
import { useSongNavContext } from '../core/context/SongNavContext';
import { useMetronomeContext } from '../core/metronome/MetronomeContext';

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
  { label: 'Live', to: '/live' },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { info, collapsed, setCollapsed } = useSongNavContext();
  const { setBpm, setIsPlaying } = useMetronomeContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Reset collapsed when leaving song detail
  useEffect(() => {
    if (!info) setCollapsed(false);
  }, [info]);

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center px-4 sm:px-6">
        {collapsed && info ? (
          /* Mini bar — shown when song view is collapsed */
          <div className="flex items-center gap-3 w-full min-w-0">
            <span className="font-semibold text-sm text-gray-900 truncate max-w-[140px] sm:max-w-[200px]">
              {info.title}
            </span>
            {info.artist && (
              <span className="text-xs text-gray-400 truncate max-w-[100px] hidden sm:block">
                {info.artist}
              </span>
            )}
            {info.bpm != null && (
              <button
                onClick={() => { setBpm(info.bpm!); setIsPlaying(true); }}
                className="text-xs text-gray-400 hover:text-indigo-500 transition-colors shrink-0"
              >
                {info.bpm} BPM
              </button>
            )}
            {(info.shapeKey || info.soundKey) && (
              <span className="text-xs text-gray-500 shrink-0">
                {info.shapeKey}{info.soundKey && info.soundKey !== info.shapeKey ? `/${info.soundKey}` : ''}
              </span>
            )}
            {info.capo > 0 && (
              <span className="text-xs text-gray-400 shrink-0">Capo {info.capo}</span>
            )}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCollapsed(false)}
                className="text-gray-400 hover:text-indigo-500 transition-colors text-lg leading-none"
                aria-label="Restore full view"
                title="Restore full view"
              >
                ∨
              </button>
              <Metronome />
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

            <div className="ml-auto flex items-center gap-2">
              {/* Collapse chevron — only on song detail pages */}
              {info && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="text-gray-400 hover:text-indigo-500 transition-colors text-lg leading-none"
                  aria-label="Collapse song view"
                  title="Collapse navbar"
                >
                  ^
                </button>
              )}
              <Metronome />
            </div>
          </>
        )}
      </nav>
      <main className="pt-14">
        <Outlet />
      </main>
    </div>
  );
}
