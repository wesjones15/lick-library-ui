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
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

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

  async function handleSaveCardName(id: string) {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== playlists.find(p => p.id === id)?.name) {
      const updated = await renamePlaylist(id, trimmed);
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p));
    }
    setEditingCardId(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
        <div className="flex items-center gap-2">
          {managing ? (
            <button
              onClick={() => { setManaging(false); setEditingCardId(null); setConfirmDelete(null); }}
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
          {playlists.map(pl => (
            <div
              key={pl.id}
              className={`border border-gray-200 rounded-xl p-4 flex items-start justify-between transition-colors ${managing ? 'cursor-default' : 'hover:border-indigo-300 cursor-pointer group'}`}
              onClick={managing ? undefined : () => navigate(`/playlist/${pl.id}`)}
            >
              <div className="flex-1 min-w-0 mr-3">
                {editingCardId === pl.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveCardName(pl.id); if (e.key === 'Escape') setEditingCardId(null); }}
                    onClick={e => e.stopPropagation()}
                    className="w-full text-sm font-semibold text-gray-900 border-b border-indigo-400 focus:outline-none bg-transparent pb-0.5"
                  />
                ) : (
                  <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{pl.name}</div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">{pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</div>
              </div>

              {managing && (
                editingCardId === pl.id ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleSaveCardName(pl.id); }}
                    className="text-indigo-500 hover:text-indigo-700 text-base leading-none shrink-0"
                    title="Save"
                  >💾</button>
                ) : confirmDelete === pl.id ? (
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDelete(pl.id)} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingCardId(pl.id); setNameInput(pl.name); }}
                      className="text-gray-400 hover:text-indigo-500 transition-colors leading-none"
                      style={{ fontSize: '2.1875rem' }}
                      title="Rename"
                    >✎</button>
                    <button
                      onClick={() => setConfirmDelete(pl.id)}
                      className="text-red-400 hover:text-red-600 transition-colors text-xl leading-none"
                    >×</button>
                  </div>
                )
              )}
            </div>
          ))}
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
