import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSongs } from '../api/client';
import type { SongSummary } from '../api/client';
import SongList from '../components/SongList';

export default function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = async () => {
    try {
      setError(null);
      const data = await getAllSongs();
      setSongs(data);
    } catch {
      setError('Could not connect to backend. Is it running on port 8080?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSongs(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Songs</h1>
        <button
          onClick={() => navigate('/songs/upload')}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Upload
        </button>
      </div>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Library
        </h2>
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {!loading && !error && (
          <SongList songs={songs} onDelete={id => setSongs(s => s.filter(x => x.id !== id))} />
        )}
      </section>
    </div>
  );
}
