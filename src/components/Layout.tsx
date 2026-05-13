import { Link, Outlet, useLocation } from 'react-router-dom';
import Metronome from './Metronome';

const NAV_LINKS = [
  { label: 'Licks', to: '/' },
  { label: 'Songs', to: '/songs' },
];

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center px-6">
        <Link to="/" className="text-gray-900 font-semibold text-base mr-8 hover:text-indigo-600 transition-colors">
          Lick Library
        </Link>
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
        <div className="ml-auto">
          <Metronome />
        </div>
      </nav>
      <main className="pt-14">
        <Outlet />
      </main>
    </div>
  );
}
