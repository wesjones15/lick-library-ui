import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaylists, createPlaylist, deletePlaylist, renamePlaylist } from '../../core/api/client';
import { BTN_PRIMARY, SELECT } from '../../core/ui';
import type { PlaylistSummary } from '../../core/api/client';
import { C_BLACK_BG, C_DANGER_BG, C_DANGER_BG_MID, C_DANGER_TEXT_MID, C_DANGER_TEXT_MUTED, C_GRAY_BG_50, C_GRAY_BORDER_200, C_GRAY_BORDER_300, C_GRAY_TEXT_300, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_900, C_PRIMARY_BG, C_PRIMARY_BG_DARK, C_PRIMARY_BG_SOFT, C_PRIMARY_BG_SUBTLE, C_PRIMARY_BORDER_MID, C_PRIMARY_BORDER_SOFT, C_PRIMARY_TEXT, C_PRIMARY_TEXT_DARK, C_PRIMARY_TEXT_MID, C_WHITE_BG, C_WHITE_TEXT } from '../../core/colors';

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
      <div className="flex items-center justify-between mb-6">
        <h1 className={`text-3xl font-bold ${C_GRAY_TEXT_900}`}>Playlists</h1>
        <div className="flex items-center gap-2">
          {managing ? (
            <button
              onClick={() => { setManaging(false); setEditingCardId(null); setConfirmDelete(null); }}
              className={`px-4 py-2 text-sm rounded-lg border ${C_PRIMARY_BORDER_SOFT} ${C_PRIMARY_TEXT} ${C_PRIMARY_BG_SOFT} hover:${C_PRIMARY_BG_SUBTLE} transition-colors`}
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
                className={`px-4 py-2 text-sm rounded-lg border ${C_GRAY_BORDER_200} ${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} hover:${C_GRAY_BORDER_300} transition-colors`}
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
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${filter === f ? '${C_PRIMARY_BORDER_SOFT} ${C_PRIMARY_BG_SOFT} ${C_PRIMARY_TEXT}' : '${C_GRAY_BORDER_200} ${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600}'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={`${C_GRAY_TEXT_400} text-sm`}>No playlists yet. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(pl => (
            <div
              key={pl.id}
              className={`border ${C_GRAY_BORDER_200} rounded-xl p-4 flex items-start justify-between transition-colors ${managing ? 'cursor-default' : 'hover:${C_PRIMARY_BORDER_SOFT} cursor-pointer group'}`}
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
                    className={`w-full text-sm font-semibold ${C_GRAY_TEXT_900} border-b ${C_PRIMARY_BORDER_MID} focus:outline-none bg-transparent pb-0.5`}
                  />
                ) : (
                  <div className={`font-semibold ${C_GRAY_TEXT_900} group-hover:${C_PRIMARY_TEXT_DARK} transition-colors truncate`}>{pl.name}</div>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs ${C_GRAY_TEXT_400}`}>{pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${pl.isPublic ? '${C_SUCCESS_BG_SOFT} text-green-600' : '${C_GRAY_BG_100} ${C_GRAY_TEXT_400}'}`}>
                    {pl.isPublic ? 'Public' : 'Private'}
                  </span>
                  {pl.authorName && (
                    <span className={`text-xs ${C_GRAY_TEXT_300}`}>{pl.authorName}</span>
                  )}
                </div>
              </div>

              {managing && pl.ownedByCurrentUser && (
                editingCardId === pl.id ? (
                  <button
                    onClick={e => { e.stopPropagation(); handleSaveCardName(pl.id); }}
                    className={`${C_PRIMARY_TEXT_MID} hover:${C_PRIMARY_TEXT_DARK} text-base leading-none shrink-0`}
                    title="Save"
                  >💾</button>
                ) : confirmDelete === pl.id ? (
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDelete(pl.id)} className={`text-xs px-2 py-1 rounded ${C_DANGER_BG_MID} ${C_WHITE_TEXT} hover:${C_DANGER_BG}`}>Delete</button>
                    <button onClick={() => setConfirmDelete(null)} className={`text-xs px-2 py-1 rounded border ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50}`}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingCardId(pl.id); setNameInput(pl.name); }}
                      className={`${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT_MID} transition-colors leading-none`}
                      style={{ fontSize: '2.1875rem' }}
                      title="Rename"
                    >✎</button>
                    <button
                      onClick={() => setConfirmDelete(pl.id)}
                      className={`${C_DANGER_TEXT_MUTED} hover:${C_DANGER_TEXT_MID} transition-colors text-2xl leading-none`}
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
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${C_BLACK_BG}/30`} onClick={() => setCreateOpen(false)}>
          <div className={`${C_WHITE_BG} rounded-xl shadow-xl p-6 w-full max-w-sm mx-4`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className={`font-semibold ${C_GRAY_TEXT_900}`}>New Playlist</span>
              <button onClick={() => setCreateOpen(false)} className={`${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} text-xl leading-none`}>×</button>
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
                className={`px-4 py-2 text-sm rounded-lg ${C_PRIMARY_BG} ${C_WHITE_TEXT} hover:${C_PRIMARY_BG_DARK} disabled:opacity-40 transition-colors`}
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
