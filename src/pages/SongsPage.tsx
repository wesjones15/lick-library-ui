import { useState, useEffect } from 'react';
import { getAllSongs } from '../api/client';
import type { SongSummary } from '../api/client';
import SongList from '../components/SongList';
import SongUploadForm from '../components/SongUploadForm';

export default function SongsPage() {
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Songs</h1>

      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Upload a Song
        </h2>
        <SongUploadForm onSuccess={fetchSongs} />
      </section>

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
