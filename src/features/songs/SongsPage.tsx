import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSongs } from '../../core/api/client';
import LoadingOverlay from '../../core/components/LoadingOverlay';
import { BTN_PRIMARY } from '../../core/ui';
import type { SongSummary } from '../../core/api/client';
import SongList from './SongList';
import AddToPlaylistModal from '../playlists/AddToPlaylistModal';
import { useSongsListContext } from '../../core/context/SongsListContext';

type SortKey = 'title' | 'artist' | 'key' | 'tempo';
const DEFAULT_PAGE_SIZE = 16;
// Landscape tablets and desktops size each page to the rows that fit on screen
const FILL_SCREEN_QUERY = '(min-width: 1024px) and (orientation: landscape) and (min-height: 541px)';
const PAGER_RESERVE_PX = 76; // page controls row below the grid, plus its margin and the page's bottom padding

const CONTROL = 'min-h-10 px-3 py-2 text-sm rounded-lg border-2 transition-colors';
const sortBtnClass = (active: boolean) =>
  `${CONTROL} ${active ? 'border-brand-3 bg-brand-1 text-brand-6' : 'border-gray-400 text-gray-600 hover:text-gray-900 hover:border-gray-500'}`;
const PAGER_BTN = 'min-h-11 px-4 py-2 border-2 border-gray-400 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors';

export default function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [addToPlaylist, setAddToPlaylist] = useState<SongSummary | null>(null);
  const { sortBy, setSortBy, sortDir, setSortDir, filterArtist, setFilterArtist, search, setSearch, page, setPage, showAll, setShowAll } = useSongsListContext();
  const prevFiltersRef = useRef({ sortBy, sortDir, filterArtist, search });
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  // Columns come from the grid's CSS; rows are however many cards fit between the grid's top and the page controls
  useLayoutEffect(() => {
    function measure() {
      if (!window.matchMedia(FILL_SCREEN_QUERY).matches) { setPageSize(DEFAULT_PAGE_SIZE); return; }
      const grid = gridWrapRef.current?.querySelector<HTMLElement>('.grid');
      const cards = grid ? [...grid.children] as HTMLElement[] : [];
      if (!grid || cards.length === 0) return;
      // Rows grow to their tallest card (long titles wrap), so size rows by the tallest one
      const cardHeight = Math.max(...cards.map(c => c.offsetHeight));
      const style = getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(' ').filter(Boolean).length;
      const gap = parseFloat(style.rowGap) || 0;
      const avail = window.innerHeight - (grid.getBoundingClientRect().top + window.scrollY) - PAGER_RESERVE_PX;
      const rows = Math.max(2, Math.floor((avail + gap) / (cardHeight + gap)));
      setPageSize(prev => (prev === cols * rows ? prev : cols * rows));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [loading, songs.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages, setPage]);
  const paginated = showAll ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="max-w-4xl lg:max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 pb-8 sm:pt-10 lg:pt-6 short:pt-3">
      {/* One row on wide screens: title, filters, actions. Narrower screens put the filters on their own row */}
      <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6 short:mb-2">
        <h1 className="order-1 text-2xl sm:text-3xl font-bold text-gray-900">Songs</h1>
        <div className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1 flex flex-wrap items-center lg:justify-center gap-2">
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
              className={`${CONTROL} border-gray-400 text-gray-700 focus:outline-none focus:border-brand-4 bg-white max-w-[12rem]`}
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
            className={`${CONTROL} border-gray-400 text-gray-700 focus:outline-none focus:border-brand-4 bg-white min-w-[120px] w-40`}
          />
        </div>
        <div className="order-2 ml-auto lg:order-3 flex items-center gap-2">
          <button
            onClick={() => setManaging(m => !m)}
            className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${managing ? 'border-brand-3 text-brand-6 bg-brand-1' : 'border-gray-400 text-gray-600 hover:text-gray-900'}`}
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

      <LoadingOverlay
        state={loading ? 'loading' : error && songs.length === 0 ? 'error' : 'ready'}
        onRetry={() => { setLoading(true); fetchSongs(); }}
      />
      {error && <p className="text-danger-6 text-sm">{error}</p>}
      {!loading && !error && (
        <>
          {/* With every song showing, the way back to pages sits at the top rather than after the whole list */}
          {showAll && totalPages > 1 && (
            <div className="flex justify-center mb-4">
              <button onClick={() => setShowAll(false)}
                className={`${PAGER_BTN} text-sm text-gray-600 hover:text-brand-5 hover:border-brand-3`}>
                Show Less
              </button>
            </div>
          )}
          <div ref={gridWrapRef}>
            <SongList songs={paginated} managing={managing} onReparse={fetchSongs} onAddToPlaylist={managing ? s => setAddToPlaylist(s) : undefined} />
          </div>

          {!showAll && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 sm:gap-4 mt-4 text-sm text-gray-700 whitespace-nowrap">
              <>
                  <button onClick={() => setPage(1)} disabled={page === 1} className={PAGER_BTN}>«</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={PAGER_BTN}>
                    ←<span className="hidden sm:inline"> Prev</span>
                  </button>
                  <span className="px-1">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={PAGER_BTN}>
                    <span className="hidden sm:inline">Next </span>→
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className={PAGER_BTN}>»</button>
              </>
              <button onClick={() => setShowAll(true)}
                className={`${PAGER_BTN} text-gray-600 hover:text-brand-5 hover:border-brand-3`}>
                Show All
              </button>
            </div>
          )}
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
