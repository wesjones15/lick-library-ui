import { useState } from 'react';
import { addPlaylistEntry, removePlaylistEntry } from '../../core/api/client';
import type { PlaylistDetail, SongSummary } from '../../core/api/client';
import { SELECT } from '../../core/ui';

interface AddSongsModalProps {
  playlist: PlaylistDetail;
  allSongs: SongSummary[];
  onClose: () => void;
  onUpdate: (updated: PlaylistDetail) => void;
}

export default function AddSongsModal({ playlist, allSongs, onClose, onUpdate }: AddSongsModalProps) {
  const [filter, setFilter] = useState('');
  const [pending, setPending] = useState<Record<string, 'adding' | 'removing'>>({});
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const inPlaylist = new Set(playlist.entries.map(e => e.songId));

  const visible = allSongs.filter(s =>
    s.title.toLowerCase().includes(filter.toLowerCase()) ||
    (s.artist ?? '').toLowerCase().includes(filter.toLowerCase())
  );

  async function handleToggle(song: SongSummary) {
    if (pending[song.id]) return;
    if (inPlaylist.has(song.id)) {
      setPending(p => ({ ...p, [song.id]: 'removing' }));
      const entry = playlist.entries.find(e => e.songId === song.id);
      if (entry) {
        const updated = await removePlaylistEntry(playlist.id, entry.entryId);
        onUpdate(updated);
      }
    } else {
      setPending(p => ({ ...p, [song.id]: 'adding' }));
      const updated = await addPlaylistEntry(playlist.id, song.id);
      onUpdate(updated);
      setRecentlyAdded(s => new Set(s).add(song.id));
      setTimeout(() => setRecentlyAdded(s => { const n = new Set(s); n.delete(song.id); return n; }), 2000);
    }
    setPending(p => { const n = { ...p }; delete n[song.id]; return n; });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-lg mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900">Add Songs</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <input
          autoFocus
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search songs…"
          className={`${SELECT} mb-3`}
        />
        <div className="overflow-y-auto flex-1">
          {visible.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No songs found</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visible.map(s => {
                const isIn = inPlaylist.has(s.id);
                const justAdded = recentlyAdded.has(s.id);
                const busy = !!pending[s.id];
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${isIn ? 'border-primary-200 bg-brand-1' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="min-w-0 mr-2">
                      <div className="text-sm font-medium text-gray-900 truncate">{s.title}</div>
                      {s.artist && <div className="text-xs text-gray-400 truncate">{s.artist}</div>}
                    </div>
                    <button
                      onClick={() => handleToggle(s)}
                      disabled={busy || justAdded}
                      className={`text-xl leading-none shrink-0 transition-colors ${busy ? 'opacity-40' : justAdded ? 'text-success-5 cursor-default' : isIn ? 'text-danger-5 hover:text-danger-7' : 'text-gray-300 hover:text-success-5'}`}
                    >
                      {justAdded ? '✓' : isIn ? '×' : '+'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
