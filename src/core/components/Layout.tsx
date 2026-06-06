import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import Metronome from '../metronome/MetronomeWidget';
import { useSongNavContext } from '../context/SongNavContext';
import { useSoundContext } from '../sound/SoundContext';
import { useAuth } from '../auth/AuthContext';
import AccountDropdown from './AccountDropdown';
import MiniBar from './MiniBar';
import { useClickOutside } from '../useClickOutside';

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
  const { info, collapsed, setCollapsed, miniActions } = useSongNavContext();
  const { soundEnabled, setSoundEnabled } = useSoundContext();
  const { currentUser, logout } = useAuth();
  const BACKEND = (import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:8080/api`).replace(/\/api$/, '');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, menuOpen, () => setMenuOpen(false));

  useEffect(() => {
    if (!info) setCollapsed(false);
  }, [info]);

  function renderNormalNav() {
    return (
      <>
        <Link
          to="/"
          className="text-gray-900 font-semibold text-base mr-2 sm:mr-8 hover:text-brand-6 transition-colors shrink-0"
        >
          Lick Library
        </Link>

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
                      ? 'bg-brand-1 text-brand-6'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, to }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-1 text-brand-6'
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
                className="w-6 h-6 flex items-center justify-center text-base text-gray-400 hover:text-brand-5 transition-colors"
                aria-label="Back to playlist"
              >↩</button>
              <button
                onClick={() => miniActions?.onPlaylistPrev()}
                className="w-6 h-6 flex items-center justify-center text-base text-gray-400 hover:text-brand-5 transition-colors"
                aria-label="Previous song"
              >←</button>
              <span className="text-xs text-gray-400 tabular-nums">
                {(miniActions?.playlistCurrentIndex ?? 0) + 1}/{miniActions?.playlistTotal ?? 0}
              </span>
              <button
                onClick={() => miniActions?.onPlaylistNext()}
                className="w-6 h-6 flex items-center justify-center text-base text-gray-400 hover:text-brand-5 transition-colors"
                aria-label="Next song"
              >→</button>
            </>
          )}
          {!currentUser && (
            <a
              href={`${BACKEND}/api/oauth2/authorize/google`}
              className="text-sm text-gray-500 hover:text-brand-6 transition-colors px-2 py-1"
            >
              Sign in
            </a>
          )}
          {currentUser && (
            <AccountDropdown
              currentUser={currentUser}
              onNavigateProfile={() => navigate('/user')}
              onLogout={logout}
            />
          )}
          {info && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-400 hover:text-brand-5 transition-colors text-2xl leading-none ml-4"
              aria-label="Collapse song view"
              title="Collapse navbar"
            >
              ▲
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center px-4 sm:px-6">
        {collapsed && info ? <MiniBar /> : renderNormalNav()}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`shrink-0 px-2 py-1.5 rounded-md text-sm transition-colors ${soundEnabled ? 'text-brand-5' : 'text-gray-400 hover:text-gray-600'}`}
          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          title={soundEnabled ? 'Sound on' : 'Sound off'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
        <div className="ml-2 shrink-0">
          <Metronome />
        </div>
      </nav>
      <main className="pt-14">
        <Outlet />
      </main>
    </div>
  );
}
