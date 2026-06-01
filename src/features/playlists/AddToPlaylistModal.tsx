import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllPlaylists, addPlaylistEntry, removePlaylistEntry, updatePlaylistEntry, getPlaylistsContainingSong } from '../../core/api/client';
import type { PlaylistSummary } from '../../core/api/client';
import { SELECT } from '../../core/ui';
import { C_BLACK_BG, C_GRAY_BG_50, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_900, C_PRIMARY_TEXT, C_WHITE_BG } from '../../core/colors';

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

  const visible = playlists.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${C_BLACK_BG}/30`}
      onClick={onClose}
    >
      <div
        className={`${C_WHITE_BG} rounded-xl shadow-xl p-5 w-full max-w-sm mx-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`font-semibold ${C_GRAY_TEXT_900} text-sm truncate pr-4`}>Add "{songTitle}" to playlist</span>
          <button onClick={onClose} className={`${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} text-xl leading-none shrink-0`}>×</button>
        </div>

        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter playlists…"
          className={`w-full ${SELECT} mb-3`}
        />

        {visible.length === 0 ? (
          <p className={`text-xs ${C_GRAY_TEXT_400} text-center py-4`}>No playlists found</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {visible.map(pl => {
              const isRecent = recentlyAdded.has(pl.id);
              const isAdded = added.has(pl.id);
              const showUpdate = !isRecent && overrideChanged && pl.id === currentPlaylistId && isAdded && !updatedPlaylists.has(pl.id);
              return (
                <div key={pl.id} className={`flex items-center justify-between px-3 py-2 rounded-lg hover:${C_GRAY_BG_50}`}>
                  <button
                    className={`text-sm ${C_GRAY_TEXT_900} hover:${C_PRIMARY_TEXT} flex-1 text-left`}
                    onClick={() => { navigate(`/playlist/${pl.id}`); onClose(); }}
                  >
                    {pl.name}
                    <span className={`text-xs ${C_GRAY_TEXT_400} ml-2`}>{pl.songCount} songs</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isRecent) return;
                      if (showUpdate) { handleUpdate(pl.id); return; }
                      isAdded ? handleRemove(pl.id) : handleAdd(pl.id);
                    }}
                    className={`text-lg leading-none transition-colors ${
                      isRecent ? 'text-green-500 cursor-default'
                      : showUpdate ? '${C_PRIMARY_TEXT_MID} hover:${C_PRIMARY_TEXT_DARK}'
                      : isAdded ? '${C_DANGER_TEXT_MUTED} hover:${C_DANGER_TEXT_MID}'
                      : '${C_INFO_TEXT_SOFT} hover:${C_INFO_TEXT_DARK}'
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
