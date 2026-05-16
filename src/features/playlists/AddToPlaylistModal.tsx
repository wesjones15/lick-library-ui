import { useState, useEffect } from 'react';
import { getAllPlaylists, addPlaylistEntry } from '../../core/api/client';
import type { PlaylistSummary } from '../../core/api/client';

interface Props {
  songId: string;
  songTitle: string;
  onClose: () => void;
}

export default function AddToPlaylistModal({ songId, songTitle, onClose }: Props) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    getAllPlaylists().then(setPlaylists).catch(() => {});
  }, []);

  async function handleAdd(playlistId: string) {
    try {
      await addPlaylistEntry(playlistId, songId);
      setAdded(s => new Set(s).add(playlistId));
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
              const isAdded = added.has(pl.id);
              return (
                <div key={pl.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="text-sm text-gray-900">{pl.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{pl.songCount} songs</span>
                  </div>
                  <button
                    onClick={() => !isAdded && handleAdd(pl.id)}
                    className={`text-lg leading-none transition-colors ${isAdded ? 'text-green-500 cursor-default' : 'text-gray-300 hover:text-indigo-500'}`}
                    disabled={isAdded}
                  >
                    {isAdded ? '✓' : '+'}
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
