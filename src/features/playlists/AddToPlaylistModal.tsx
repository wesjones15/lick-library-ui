import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaylists, addPlaylistEntry, removePlaylistEntry, getPlaylistsContainingSong } from '../../core/api/client';
import type { PlaylistSummary } from '../../core/api/client';

interface Props {
  songId: string;
  songTitle: string;
  onClose: () => void;
  keyOffset?: number;
  capoOffset?: number;
}

export default function AddToPlaylistModal({ songId, songTitle, onClose, keyOffset, capoOffset }: Props) {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [addedEntryIds, setAddedEntryIds] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    getAllPlaylists().then(setPlaylists).catch(() => {});
  }, []);

  useEffect(() => {
    getPlaylistsContainingSong(songId).then(entries => {
      setAdded(new Set(entries.map(e => e.playlistId)));
      setAddedEntryIds(new Map(entries.map(e => [e.playlistId, e.entryId])));
    }).catch(() => {});
  }, [songId]);

  async function handleAdd(playlistId: string) {
    try {
      const updated = await addPlaylistEntry(playlistId, songId, keyOffset ?? 0, capoOffset ?? 0);
      const entry = [...updated.entries].reverse().find(e => e.songId === songId);
      if (entry) setAddedEntryIds(m => new Map(m).set(playlistId, entry.entryId));
      setRecentlyAdded(s => new Set(s).add(playlistId));
      setTimeout(() => setRecentlyAdded(s => { const n = new Set(s); n.delete(playlistId); return n; }), 2000);
      setAdded(s => new Set(s).add(playlistId));
    } catch {
      // swallow
    }
  }

  async function handleRemove(playlistId: string) {
    const entryId = addedEntryIds.get(playlistId);
    if (!entryId) return;
    try {
      await removePlaylistEntry(playlistId, entryId);
      setAdded(s => { const n = new Set(s); n.delete(playlistId); return n; });
      setAddedEntryIds(m => { const n = new Map(m); n.delete(playlistId); return n; });
    } catch {
      // swallow
    }
  }

  const visible = playlists.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm truncate pr-4">Add "{songTitle}" to playlist</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">×</button>
        </div>

        <input
          autoFocus
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter playlists…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 mb-3"
        />

        {visible.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No playlists found</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {visible.map(pl => {
              const isRecent = recentlyAdded.has(pl.id);
              const isAdded = added.has(pl.id);
              return (
                <div key={pl.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                  <button
                    className="text-sm text-gray-900 hover:text-indigo-600 flex-1 text-left"
                    onClick={() => { navigate(`/playlist/${pl.id}`); onClose(); }}
                  >
                    {pl.name}
                    <span className="text-xs text-gray-400 ml-2">{pl.songCount} songs</span>
                  </button>
                  <button
                    onClick={() => { if (!isRecent) isAdded ? handleRemove(pl.id) : handleAdd(pl.id); }}
                    className={`text-lg leading-none transition-colors ${
                      isRecent ? 'text-green-500 cursor-default'
                      : isAdded ? 'text-red-400 hover:text-red-600'
                      : 'text-gray-300 hover:text-indigo-500'
                    }`}
                    disabled={isRecent}
                  >
                    {isRecent ? '✓' : isAdded ? '×' : '+'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
