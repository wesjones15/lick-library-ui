import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSongs } from '../../core/api/client';
import { BTN_PRIMARY, BTN_XS } from '../../core/ui';
import type { SongSummary } from '../../core/api/client';
import SongList from './SongList';
import AddToPlaylistModal from '../playlists/AddToPlaylistModal';
import { useSongsListContext } from '../../core/context/SongsListContext';

type SortKey = 'title' | 'artist' | 'key' | 'tempo';
const PAGE_SIZE = 16;

const sortBtnClass = (active: boolean) =>
  `${BTN_XS} ${active ? 'border-brand-3 bg-brand-1 text-brand-6' : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`;

export default function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [addToPlaylist, setAddToPlaylist] = useState<SongSummary | null>(null);
  const { sortBy, setSortBy, sortDir, setSortDir, filterArtist, setFilterArtist, search, setSearch, page, setPage, showAll, setShowAll } = useSongsListContext();
  const prevFiltersRef = useRef({ sortBy, sortDir, filterArtist, search });

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
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.sortBy !== sortBy || prev.sortDir !== sortDir || prev.filterArtist !== filterArtist || prev.search !== search) {
      setPage(1);
      setShowAll(false);
    }
    prevFiltersRef.current = { sortBy, sortDir, filterArtist, search };
  }, [sortBy, sortDir, filterArtist, search]);

  function handleSort(key: SortKey) {
    if (key === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  }

  const artists = [...new Set(songs.map(s => s.artist).filter(Boolean))].sort() as string[];

  const searchLower = search.trim().toLowerCase();
  const filtered = songs
    .filter(s => !filterArtist || s.artist === filterArtist)
    .filter(s => !searchLower ||
      s.title?.toLowerCase().includes(searchLower) ||
      s.artist?.toLowerCase().includes(searchLower)
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title')  cmp = (a.title ?? '').localeCompare(b.title ?? '');
      if (sortBy === 'artist') cmp = (a.artist ?? '').localeCompare(b.artist ?? '');
      if (sortBy === 'key')    cmp = (a.originalKey ?? '').localeCompare(b.originalKey ?? '');
      if (sortBy === 'tempo')  cmp = (a.tempo ?? 0) - (b.tempo ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = showAll ? filtered : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Songs</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setManaging(m => !m)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${managing ? 'border-brand-3 text-brand-6 bg-brand-1' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
          >
            Manage
          </button>
          <button
            onClick={() => navigate('/songs/upload')}
            className={BTN_PRIMARY}
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
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 focus:outline-none focus:border-brand-4 bg-white"
          >
            <option value="">All artists</option>
            {artists.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 focus:outline-none focus:border-brand-4 bg-white min-w-[120px]"
        />
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-danger-6 text-sm">{error}</p>}
      {!loading && !error && (
        <>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mb-4 text-sm text-gray-500">
              {!showAll && (
                <>
                  <button onClick={() => setPage(1)} disabled={page === 1}
                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    «
                  </button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← Prev
                  </button>
                  <span>{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next →
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    »
                  </button>
                </>
              )}
              <button onClick={() => setShowAll(v => !v)}
                className="px-3 py-1 border border-gray-200 rounded-lg text-gray-400 hover:text-brand-5 hover:border-brand-3 transition-colors">
                {showAll ? 'Show Less' : 'Show All'}
              </button>
            </div>
          )}

          <SongList songs={paginated} managing={managing} onReparse={fetchSongs} onAddToPlaylist={managing ? s => setAddToPlaylist(s) : undefined} />

        </>
      )}

      {addToPlaylist && (
        <AddToPlaylistModal
          songId={addToPlaylist.id}
          songTitle={addToPlaylist.title}
          onClose={() => setAddToPlaylist(null)}
        />
      )}
    </div>
  );
}
