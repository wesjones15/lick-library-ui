import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaylists, createPlaylist, deletePlaylist } from '../../core/api/client';
import type { PlaylistSummary } from '../../core/api/client';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    getAllPlaylists().then(setPlaylists).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await createPlaylist(name);
      setPlaylists(p => [...p, created]);
      setNewName('');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deletePlaylist(id);
    setPlaylists(p => p.filter(pl => pl.id !== id));
    setConfirmDelete(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New playlist name…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Create
        </button>
      </form>

      {playlists.length === 0 ? (
        <p className="text-gray-400 text-sm">No playlists yet. Create one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map(pl => (
            <div
              key={pl.id}
              className="border border-gray-200 rounded-xl p-4 flex items-start justify-between hover:border-indigo-300 transition-colors cursor-pointer group"
              onClick={() => confirmDelete !== pl.id && navigate(`/playlist/${pl.id}`)}
            >
              <div>
                <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{pl.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</div>
              </div>

              {confirmDelete === pl.id ? (
                <div className="flex gap-2 ml-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleDelete(pl.id)}
                    className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(pl.id); }}
                  className="text-gray-300 hover:text-red-400 transition-colors text-xl ml-2 leading-none"
                  aria-label="Delete playlist"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
