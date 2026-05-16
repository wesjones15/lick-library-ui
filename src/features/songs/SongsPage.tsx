import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSongs } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';
import SongList from './SongList';

type SortKey = 'title' | 'artist' | 'key' | 'tempo';
const PAGE_SIZE = 18;

const sortBtnClass = (active: boolean) =>
  `px-2 py-1 text-xs rounded border transition-colors ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`;

export default function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterArtist, setFilterArtist] = useState('');
  const [page, setPage] = useState(1);

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
  useEffect(() => { setPage(1); }, [sortBy, sortDir, filterArtist]);

  function handleSort(key: SortKey) {
    if (key === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  }

  const artists = [...new Set(songs.map(s => s.artist).filter(Boolean))].sort() as string[];

  const filtered = songs
    .filter(s => !filterArtist || s.artist === filterArtist)
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title')  cmp = (a.title ?? '').localeCompare(b.title ?? '');
      if (sortBy === 'artist') cmp = (a.artist ?? '').localeCompare(b.artist ?? '');
      if (sortBy === 'key')    cmp = (a.originalKey ?? '').localeCompare(b.originalKey ?? '');
      if (sortBy === 'tempo')  cmp = (a.tempo ?? 0) - (b.tempo ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Songs</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setManaging(m => !m)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${managing ? 'border-indigo-300 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
          >
            Manage
          </button>
          <button
            onClick={() => navigate('/songs/upload')}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Upload
          </button>
        </div>
      </div>

      {/* Sort + filter controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1">
          {(['title', 'artist', 'key', 'tempo'] as SortKey[]).map(k => (
            <button key={k} onClick={() => handleSort(k)} className={sortBtnClass(sortBy === k)}>
              {k.charAt(0).toUpperCase() + k.slice(1)}{sortBy === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
        </div>
        {artists.length > 0 && (
          <select
            value={filterArtist}
            onChange={e => setFilterArtist(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 focus:outline-none focus:border-indigo-400 bg-white"
          >
            <option value="">All artists</option>
            {artists.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!loading && !error && (
        <>
          <SongList songs={paginated} managing={managing} onReparse={fetchSongs} />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
