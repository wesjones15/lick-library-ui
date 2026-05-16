import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getPlaylist, deletePlaylist, addPlaylistEntry,
  removePlaylistEntry, updatePlaylistEntry, renamePlaylist,
  getAllSongs,
} from '../../core/api/client';
import type { PlaylistDetail, PlaylistEntry, SongSummary } from '../../core/api/client';

const KEY_LABELS: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#', E: 'E',
  F: 'F', F_SHARP: 'F#', G: 'G', G_SHARP: 'G#', A: 'A',
  B_FLAT: 'Bb', B: 'B',
};
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function semitoneLabel(originalKey: string | null, semitones: number | null): string {
  if (semitones === null || !originalKey) return 'Default';
  const base = KEY_LABELS[originalKey] ?? originalKey;
  const match = base.match(/^([A-G][#b]?)(m?)$/);
  if (!match) return 'Default';
  const [, root, suffix] = match;
  const idx = CHROMATIC.indexOf(root);
  if (idx === -1) return 'Default';
  return CHROMATIC[((idx + semitones) % 12 + 12) % 12] + suffix;
}

interface EntryOverrideEditorProps {
  entry: PlaylistEntry;
  songs: SongSummary[];
  onSave: (overrideSemitones: number | null, overrideCapo: number | null) => void;
  onClose: () => void;
}

function EntryOverrideEditor({ entry, songs, onSave, onClose }: EntryOverrideEditorProps) {
  const song = songs.find(s => s.id === entry.songId);
  const [semitones, setSemitones] = useState(entry.overrideSemitones ?? 0);
  const [capo, setCapo] = useState(entry.overrideCapo ?? 0);
  const [hasOverride, setHasOverride] = useState(entry.overrideSemitones !== null || entry.overrideCapo !== null);

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm" onClick={e => e.stopPropagation()}>
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input type="checkbox" checked={hasOverride} onChange={e => setHasOverride(e.target.checked)} className="rounded" />
        <span className="text-gray-600">Custom key/capo for this playlist</span>
      </label>
      {hasOverride && (
        <div className="flex gap-6 flex-wrap mb-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">Key ({semitoneLabel(song?.originalKey ?? null, semitones)})</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSemitones(s => s - 1 <= -12 ? 0 : s - 1)}
                className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center">−</button>
              <span className="w-6 text-center font-semibold text-gray-900">{semitones > 0 ? `+${semitones}` : semitones}</span>
              <button onClick={() => setSemitones(s => s + 1 >= 12 ? 0 : s + 1)}
                className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center">+</button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">Capo</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCapo(c => Math.max(0, c - 1))}
                className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center">−</button>
              <span className="w-6 text-center font-semibold text-gray-900">{capo}</span>
              <button onClick={() => setCapo(c => Math.min(11, c + 1))}
                className="w-7 h-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center">+</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onSave(hasOverride ? semitones : null, hasOverride ? capo : null)}
          className="px-3 py-1 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700">Save</button>
        <button onClick={onClose} className="px-3 py-1 rounded border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}

function AddSongsModal({
  playlist,
  allSongs,
  onClose,
  onUpdate,
}: {
  playlist: PlaylistDetail;
  allSongs: SongSummary[];
  onClose: () => void;
  onUpdate: (updated: PlaylistDetail) => void;
}) {
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
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 mb-3"
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
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${isIn ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="min-w-0 mr-2">
                      <div className="text-sm font-medium text-gray-900 truncate">{s.title}</div>
                      {s.artist && <div className="text-xs text-gray-400 truncate">{s.artist}</div>}
                    </div>
                    <button
                      onClick={() => handleToggle(s)}
                      disabled={busy || justAdded}
                      className={`text-xl leading-none shrink-0 transition-colors ${busy ? 'opacity-40' : justAdded ? 'text-green-500 cursor-default' : isIn ? 'text-red-400 hover:text-red-600' : 'text-gray-300 hover:text-green-500'}`}
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

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [allSongs, setAllSongs] = useState<SongSummary[]>([]);
  const [managing, setManaging] = useState(false);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPlaylist(id).then(setPlaylist).catch(() => {});
    getAllSongs().then(setAllSongs).catch(() => {});
  }, [id]);

  if (!playlist) return <div className="max-w-3xl mx-auto px-6 py-10 text-gray-400 text-sm">Loading…</div>;

  const entries = playlist.entries;

  function toggleManage() {
    if (managing) {
      setManaging(false);
      setEditingName(false);
      setConfirmDelete(false);
      setConfirmRemove(null);
      setEditingEntry(null);
    } else {
      setManaging(true);
    }
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === playlist!.name) { setEditingName(false); return; }
    const updated = await renamePlaylist(playlist!.id, trimmed);
    setPlaylist(p => p ? { ...p, name: updated.name } : p);
    setEditingName(false);
  }

  async function handleDeletePlaylist() {
    await deletePlaylist(playlist!.id);
    navigate('/playlists');
  }

  async function handleRemoveEntry(entryId: string) {
    const updated = await removePlaylistEntry(playlist!.id, entryId);
    setPlaylist(updated);
    setConfirmRemove(null);
  }

  async function handleReorder(entryId: string, direction: -1 | 1) {
    const entry = entries.find(e => e.entryId === entryId)!;
    const updated = await updatePlaylistEntry(playlist!.id, entryId, { position: entry.position + direction });
    setPlaylist(updated);
  }

  async function handleSaveOverride(entryId: string, overrideSemitones: number | null, overrideCapo: number | null) {
    const updated = await updatePlaylistEntry(playlist!.id, entryId, { overrideSemitones, overrideCapo });
    setPlaylist(updated);
    setEditingEntry(null);
  }

  function handleOpenSong(index: number) {
    const entry = entries[index];
    navigate(`/song/${entry.songId}`, {
      state: {
        playlistId: playlist!.id,
        playlistName: playlist!.name,
        entries: entries.map(e => ({
          entryId: e.entryId,
          songId: e.songId,
          title: e.title,
          overrideSemitones: e.overrideSemitones,
          overrideCapo: e.overrideCapo,
        })),
        currentIndex: index,
      },
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div className="min-w-0 flex-1">
          <Link to="/playlists" className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">← Playlists</Link>
          {editingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-400 focus:outline-none bg-transparent"
              />
              <button onClick={handleSaveName} className="text-indigo-500 hover:text-indigo-700 text-lg" title="Save name">💾</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-3xl font-bold text-gray-900">{playlist.name}</h1>
              {managing && (
                <button
                  onClick={() => { setNameInput(playlist.name); setEditingName(true); }}
                  className="text-gray-400 hover:text-indigo-500 transition-colors text-lg leading-none"
                  title="Rename playlist"
                >✎</button>
              )}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">{entries.length} {entries.length === 1 ? 'song' : 'songs'}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {managing && confirmDelete && (
            <div className="flex gap-2">
              <button onClick={handleDeletePlaylist} className="text-xs px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600">Delete playlist</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          )}
          {managing && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="text-gray-300 hover:text-red-400 transition-colors text-2xl leading-none"
              title="Delete playlist">×</button>
          )}
          <button
            onClick={toggleManage}
            className={`text-xl leading-none transition-colors ${managing ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`}
            title={managing ? 'Done managing' : 'Manage playlist'}
          >
            {managing ? '✓' : '⚙'}
          </button>
        </div>
      </div>

      {/* Add Songs button (manage mode only) */}
      {managing && (
        <button
          onClick={() => setShowAddSongs(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 border border-dashed border-indigo-300 rounded-xl px-4 py-3 w-full hover:bg-indigo-50 transition-colors mb-4"
        >
          <span className="text-lg leading-none">+</span> Add Songs
        </button>
      )}

      {/* Song list */}
      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm">{managing ? 'Use Add Songs to add songs to this playlist.' : 'No songs yet.'}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, idx) => (
            <div key={entry.entryId} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-300 w-5 text-right shrink-0">{idx + 1}</span>

                {/* Reorder (manage only) */}
                {managing && (
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => handleReorder(entry.entryId, -1)} disabled={idx === 0}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
                    <button onClick={() => handleReorder(entry.entryId, 1)} disabled={idx === entries.length - 1}
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
                  </div>
                )}

                {/* Song info */}
                <div
                  className="flex-1 cursor-pointer hover:text-indigo-700 transition-colors min-w-0"
                  onClick={() => handleOpenSong(idx)}
                >
                  <div className="font-medium text-gray-900 truncate">{entry.title}</div>
                  {entry.artist && <div className="text-xs text-gray-400 truncate">{entry.artist}</div>}
                </div>

                {/* Override badge */}
                <button
                  onClick={() => setEditingEntry(editingEntry === entry.entryId ? null : entry.entryId)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                    entry.overrideSemitones !== null || entry.overrideCapo !== null
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {entry.overrideSemitones !== null || entry.overrideCapo !== null
                    ? `Key${entry.overrideSemitones !== null ? ` +${entry.overrideSemitones}` : ''} Capo${entry.overrideCapo !== null ? ` ${entry.overrideCapo}` : ''}`
                    : 'Default'}
                </button>

                {/* Remove (manage only) */}
                {managing && (
                  confirmRemove === entry.entryId ? (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleRemoveEntry(entry.entryId)} className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600">Remove</button>
                      <button onClick={() => setConfirmRemove(null)} className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmRemove(entry.entryId)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
                  )
                )}
              </div>

              {editingEntry === entry.entryId && (
                <EntryOverrideEditor
                  entry={entry}
                  songs={allSongs}
                  onSave={(s, c) => handleSaveOverride(entry.entryId, s, c)}
                  onClose={() => setEditingEntry(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {showAddSongs && (
        <AddSongsModal
          playlist={playlist}
          allSongs={allSongs}
          onClose={() => setShowAddSongs(false)}
          onUpdate={updated => setPlaylist(updated)}
        />
      )}
    </div>
  );
}
