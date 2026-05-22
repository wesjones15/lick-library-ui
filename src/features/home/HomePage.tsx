import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';

const FEATURES = [
  {
    to: '/licks',
    title: 'Licks',
    description: 'Upload a guitar tab and explore positions across the neck in any key, tuning, or algorithm.',
  },
  {
    to: '/songs',
    title: 'Songs',
    description: 'Chord sheets with live transposition, capo support, scroll view, and chord diagrams on hover.',
  },
  {
    to: '/chords',
    title: 'Chord Gallery',
    description: 'Browse and manage CAGED voicings for every chord quality. Upload custom fingerings.',
  },
  {
    to: '/playlists',
    title: 'Playlists',
    description: 'Organize songs into playlists with per-song key and capo overrides.',
  },
  {
    to: '/theory',
    title: 'Theory',
    description: 'Circle of fifths, CAGED shapes, mode reference, and chord progressions.',
  },
  {
    to: '/live',
    title: 'Live',
    description: 'Real-time pitch detection with an animated neck and scale overlays.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const BACKEND = `http://${window.location.hostname}:8080`;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">Lick Library</h1>
        {!currentUser && (
          <a
            href={`${BACKEND}/api/oauth2/authorize/google`}
            className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
          >
            Sign in with Google
          </a>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-6">A guitar practice tool.</p>
      {currentUser && currentUser.status !== 'APPROVED' && currentUser.role !== 'ADMIN' && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {currentUser.status === 'REJECTED'
            ? 'Your account request was not approved.'
            : "Your account is pending approval. You'll have full access once an admin approves your request."}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map(f => (
          <button
            key={f.to}
            onClick={() => navigate(f.to)}
            className="text-left border border-gray-200 rounded-xl p-5 bg-white hover:shadow-sm hover:border-indigo-200 transition-all"
          >
            <div className="text-base font-semibold text-gray-900 mb-1">{f.title}</div>
            <div className="text-xs text-gray-400 leading-snug">{f.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
