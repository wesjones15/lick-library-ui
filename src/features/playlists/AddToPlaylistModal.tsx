import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaylists, addPlaylistEntry, removePlaylistEntry, updatePlaylistEntry, getPlaylistsContainingSong, createPlaylist, setPlaylistVisibility } from '../../core/api/client';
import type { PlaylistSummary } from '../../core/api/client';
import { SELECT, BTN_PRIMARY, BTN_SECONDARY } from '../../core/ui';
import { useVisualViewport } from '../../core/useVisualViewport';

interface Props {
  songId: string;
  songTitle: string;
  onClose: () => void;
  keyOffset?: number;
  capoOffset?: number;
  overrideChanged?: boolean;
  currentPlaylistId?: string;
}

export default function AddToPlaylistModal({ songId, songTitle, onClose, keyOffset, capoOffset, overrideChanged, currentPlaylistId }: Props) {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [updatedPlaylists, setUpdatedPlaylists] = useState<Set<string>>(new Set());
  const [addedEntryIds, setAddedEntryIds] = useState<Map<string, string>>(new Map());
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const viewport = useVisualViewport();

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

  async function handleUpdate(playlistId: string) {
    const entryId = addedEntryIds.get(playlistId);
    if (!entryId) return;
    try {
      await updatePlaylistEntry(playlistId, entryId, {
        keyOffset: keyOffset ?? 0,
        capoOffset: capoOffset ?? 0,
      });
      setUpdatedPlaylists(s => new Set(s).add(playlistId));
      setRecentlyAdded(s => new Set(s).add(playlistId));
      setTimeout(() => setRecentlyAdded(s => { const n = new Set(s); n.delete(playlistId); return n; }), 2000);
    } catch {
      // swallow
    }
  }

  // New playlists start private; the song is then one tap away on the new row
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    setCreateError(null);
    try {
      const created = await createPlaylist(name);
      let isPublic = created.isPublic;
      try {
        await setPlaylistVisibility(created.id, false);
        isPublic = false;
      } catch {
        // keep the playlist; it just stays at the server's default visibility
      }
      setPlaylists(p => [{ ...created, isPublic }, ...p.filter(pl => pl.id !== created.id)]);
      setFilter('');
      setNewName('');
      setCreatingNew(false);
      setJustCreated(created.id);
    } catch {
      setCreateError("Couldn't create the playlist. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const visible = playlists.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    // Sized to the visible area, so the on-screen keyboard never covers the modal or its text fields
    <div
      className="fixed inset-x-0 z-50 flex items-center justify-center bg-black/30"
      style={{ top: viewport.top, height: viewport.height }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm mx-4 max-h-[calc(100%-1rem)] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900 text-sm truncate pr-4">Add "{songTitle}" to playlist</span>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-xl leading-none shrink-0">×</button>
        </div>

        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter playlists…"
          className={`w-full ${SELECT} mb-3`}
        />

        {creatingNew ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-2 mb-3 p-3 rounded-lg border-2 border-gray-400">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onFocus={e => { const el = e.currentTarget; setTimeout(() => el.scrollIntoView({ block: 'center' }), 300); }}
              placeholder="New playlist name"
              autoFocus
              enterKeyHint="done"
              className={`w-full ${SELECT}`}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 flex-1">Private — only you can see it</span>
              <button type="button" onClick={() => { setCreatingNew(false); setNewName(''); setCreateError(null); }} className={BTN_SECONDARY}>
                Cancel
              </button>
              <button type="submit" disabled={!newName.trim() || saving} className={`${BTN_PRIMARY} disabled:opacity-60`}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
            {createError && <p className="text-xs text-danger-6">{createError}</p>}
          </form>
        ) : (
          <button
            onClick={() => { setCreatingNew(true); setNewName(filter.trim()); }}
            className="w-full mb-3 px-3 py-2 text-sm text-left rounded-lg border-2 border-dashed border-gray-400 text-gray-700 hover:text-brand-6 hover:border-brand-3"
          >
            + New playlist{filter.trim() ? ` "${filter.trim()}"` : ''}
          </button>
        )}

        {visible.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">No playlists found</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {visible.map(pl => {
              const isRecent = recentlyAdded.has(pl.id);
              const isAdded = added.has(pl.id);
              const showUpdate = !isRecent && overrideChanged && pl.id === currentPlaylistId && isAdded && !updatedPlaylists.has(pl.id);
              return (
                <div key={pl.id} className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 ${pl.id === justCreated && !isAdded ? 'bg-brand-1' : ''}`}>
                  <button
                    className="text-sm text-gray-900 hover:text-brand-6 flex-1 text-left"
                    onClick={() => { navigate(`/playlist/${pl.id}`); onClose(); }}
                  >
                    {pl.name}
                    <span className="text-xs text-gray-600 ml-2">{pl.songCount} songs</span>
                    {pl.id === justCreated && !isAdded && <span className="text-xs text-brand-6 ml-2">new — tap + to add</span>}
                  </button>
                  <button
                    onClick={() => {
                      if (isRecent) return;
                      if (showUpdate) { handleUpdate(pl.id); return; }
                      isAdded ? handleRemove(pl.id) : handleAdd(pl.id);
                    }}
                    className={`text-lg leading-none transition-colors ${
                      isRecent ? 'text-success-5 cursor-default'
                      : showUpdate ? 'text-brand-5 hover:text-brand-7'
                      : isAdded ? 'text-danger-5 hover:text-danger-7'
                      : 'text-info-4 hover:text-info-6'
                    }`}
                    disabled={isRecent}
                  >
                    {isRecent ? '✓' : showUpdate ? '↑' : isAdded ? '×' : '+'}
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
