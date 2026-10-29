import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaylists, createPlaylist, deletePlaylist, renamePlaylist } from '../../core/api/client';
import { BTN_PRIMARY, SELECT } from '../../core/ui';
import type { PlaylistSummary } from '../../core/api/client';
import LoadingOverlay from '../../core/components/LoadingOverlay';
import { useLoader } from '../../core/useLoader';

type PlaylistFilter = 'all' | 'mine' | 'public';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [filter, setFilter] = useState<PlaylistFilter>('all');
  const [managing, setManaging] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const load = useLoader(async isCancelled => {
    const data = await getAllPlaylists();
    if (!isCancelled()) setPlaylists(data);
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

  const filtered = playlists.filter(pl => {
    if (filter === 'mine') return pl.ownedByCurrentUser;
    if (filter === 'public') return pl.isPublic;
    return true;
  });

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
      <LoadingOverlay state={load.firstLoad} onRetry={load.retry} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
        <div className="flex items-center gap-2">
          {managing ? (
            <button
              onClick={() => { setManaging(false); setEditingCardId(null); setConfirmDelete(null); }}
              className="px-4 py-2 text-sm rounded-lg border-2 border-brand-3 text-brand-6 bg-brand-1 hover:bg-brand-2 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setCreateOpen(true)}
                className={BTN_PRIMARY}
              >
                New Playlist
              </button>
              <button
                onClick={() => setManaging(true)}
                className="px-4 py-2 text-sm rounded-lg border-2 border-gray-400 text-gray-600 hover:text-gray-900 hover:border-gray-500 transition-colors"
              >
                Manage
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter buttons */}
      {playlists.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'mine', 'public'] as PlaylistFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg border-2 transition-colors ${filter === f ? 'border-brand-3 bg-brand-1 text-brand-6' : 'border-gray-400 text-gray-600 hover:text-gray-900'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-gray-600 text-sm">No playlists yet. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(pl => (
            <div
              key={pl.id}
              className={`border-2 border-gray-400 rounded-xl p-4 flex items-start justify-between transition-colors ${managing ? 'cursor-default' : 'hover:border-brand-3 cursor-pointer group'}`}
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
                    className="w-full text-sm font-semibold text-gray-900 border-b-2 border-brand-4 focus:outline-none bg-transparent pb-0.5"
                  />
                ) : (
                  <div className="font-semibold text-gray-900 group-hover:text-brand-7 transition-colors truncate">{pl.name}</div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600">{pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${pl.isPublic ? 'bg-success-1 text-success-6' : 'bg-gray-100 text-gray-600'}`}>
                    {pl.isPublic ? 'Public' : 'Private'}
                  </span>
                  {pl.authorName && (
                    <span className="text-xs text-gray-600">{pl.authorName}</span>
                  )}
                </div>
              </div>

              {managing && pl.ownedByCurrentUser && (
                editingCardId === pl.id ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleSaveCardName(pl.id); }}
                    className="text-brand-5 hover:text-brand-7 text-base leading-none shrink-0"
                    title="Save"
                  >💾</button>
                ) : confirmDelete === pl.id ? (
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDelete(pl.id)} className="text-xs px-2 py-1 rounded bg-danger-6 text-white hover:bg-danger-7">Delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded border-2 border-gray-400 text-gray-700 hover:bg-gray-50">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingCardId(pl.id); setNameInput(pl.name); }}
                      className="text-gray-600 hover:text-brand-5 transition-colors leading-none"
                      style={{ fontSize: '2.1875rem' }}
                      title="Rename"
                    >✎</button>
                    <button
                      onClick={() => setConfirmDelete(pl.id)}
                      className="text-danger-5 hover:text-danger-7 transition-colors text-2xl leading-none"
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
              <button onClick={() => setCreateOpen(false)} className="text-gray-600 hover:text-gray-900 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Playlist name…"
                className={SELECT}
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-brand-6 text-white hover:bg-brand-7 disabled:opacity-40 transition-colors"
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
