import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaylists, createPlaylist, deletePlaylist, renamePlaylist } from '../../core/api/client';
import type { PlaylistSummary } from '../../core/api/client';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [managing, setManaging] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editNames, setEditNames] = useState<Record<string, string>>({});

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
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deletePlaylist(id);
    setPlaylists(p => p.filter(pl => pl.id !== id));
    setConfirmDelete(null);
  }

  async function handleExitManage() {
    // Save any pending renames
    const saves = Object.entries(editNames).map(async ([id, name]) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = playlists.find(p => p.id === id);
      if (current && trimmed !== current.name) {
        const updated = await renamePlaylist(id, trimmed);
        setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p));
      }
    });
    await Promise.all(saves);
    setManaging(false);
    setEditNames({});
    setConfirmDelete(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
        <div className="flex items-center gap-2">
          {managing ? (
            <button
              onClick={handleExitManage}
              className="px-3 py-2 text-sm rounded-lg border border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setManaging(true)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
              >
                Manage
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                New Playlist
              </button>
            </>
          )}
        </div>
      </div>

      {playlists.length === 0 ? (
        <p className="text-gray-400 text-sm">No playlists yet. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map(pl => {
            const editName = editNames[pl.id] ?? pl.name;
            return (
              <div
                key={pl.id}
                className={`border border-gray-200 rounded-xl p-4 flex items-start justify-between transition-colors ${managing ? 'cursor-default' : 'hover:border-indigo-300 cursor-pointer group'}`}
                onClick={managing ? undefined : () => navigate(`/playlist/${pl.id}`)}
              >
                <div className="flex-1 min-w-0 mr-3">
                  {managing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditNames(n => ({ ...n, [pl.id]: e.target.value }))}
                      className="w-full text-sm font-semibold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-indigo-400 bg-transparent pb-0.5"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{pl.name}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">{pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</div>
                </div>

                {managing && (
                  confirmDelete === pl.id ? (
                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDelete(pl.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDelete(pl.id); }}
                      className="text-gray-300 hover:text-red-400 transition-colors text-xl ml-2 leading-none shrink-0"
                    >×</button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create playlist modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-900">New Playlist</span>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Playlist name…"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
