import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getPlaylist, deletePlaylist, addPlaylistEntry,
  removePlaylistEntry, updatePlaylistEntry, renamePlaylist,
  clearPlaylistEntryOverrides, getAllSongs,
} from '../../core/api/client';
import type { PlaylistDetail, PlaylistEntry, SongSummary } from '../../core/api/client';

import { KEY_LABEL, CHROMATIC_NOTES } from '../../core/music';

function keyLabel(originalKey: string | null, semitones: number): string {
  if (!originalKey) return '?';
  const display = KEY_LABEL[originalKey] ?? originalKey;
  const match = display.match(/^([A-G][#b]?)(m?)$/);
  if (!match) return display;
  const [, root, suffix] = match;
  const idx = CHROMATIC_NOTES.indexOf(root);
  if (idx === -1) return display;
  return CHROMATIC_NOTES[((idx + semitones) % 12 + 12) % 12] + suffix;
}

function VoicingModal({ entry, onSave, onClose }: {
  entry: PlaylistEntry;
  onSave: (keyOffset: number, capoOffset: number) => void;
  onClose: () => void;
}) {
  const [localSemitones, setLocalSemitones] = useState(entry.keyOffset);
  const [localCapo, setLocalCapo] = useState(entry.defaultCapo + entry.capoOffset);
  const btnClass = "w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
        <div className="font-semibold text-gray-900 text-sm mb-5 text-center">{entry.title}</div>
        <div className="flex gap-8 justify-center mb-6">

          {/* Capo widget */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">Capo</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setLocalCapo(c => Math.max(0, c - 1))} className={btnClass}>−</button>
              <div className="flex items-center justify-center w-8">
                <span className="text-base font-semibold text-gray-900">{localCapo}</span>
              </div>
              <button onClick={() => setLocalCapo(c => Math.min(12, c + 1))} className={btnClass}>+</button>
            </div>
            <button
              onClick={() => setLocalCapo(entry.defaultCapo)}
              className={`text-xs transition-colors ${localCapo !== entry.defaultCapo ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
            >reset</button>
          </div>

          {/* Transpose widget */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">Transpose</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setLocalSemitones(s => s - 1 <= -12 ? 0 : s - 1)} className={btnClass}>−</button>
              <div className="flex gap-2 items-center">
                <div className="flex flex-col items-center w-8">
                  <span className="text-base font-semibold text-gray-900">
                    {keyLabel(entry.originalKey, localSemitones - entry.defaultCapo)}
                  </span>
                  <span className="text-xs text-gray-400">shape</span>
                </div>
                <div className="flex flex-col items-center w-8">
                  <span className="text-base font-semibold text-gray-900">
                    {keyLabel(entry.originalKey, localSemitones + localCapo - entry.defaultCapo)}
                  </span>
                  <span className="text-xs text-gray-400">sound</span>
                </div>
              </div>
              <button onClick={() => setLocalSemitones(s => s + 1 >= 12 ? 0 : s + 1)} className={btnClass}>+</button>
            </div>
            <button
              onClick={() => setLocalSemitones(0)}
              className={`text-xs transition-colors ${localSemitones !== 0 ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
            >reset</button>
          </div>
        </div>
        <button
          onClick={() => { onSave(localSemitones, localCapo - entry.defaultCapo); onClose(); }}
          className="w-full px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >Save</button>
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

  async function handleSaveOverride(entryId: string, keyOffset: number, capoOffset: number) {
    const clearing = keyOffset === 0 && capoOffset === 0;
    setPlaylist(p => p ? {
      ...p,
      entries: p.entries.map(e => e.entryId === entryId
        ? { ...e, keyOffset: clearing ? 0 : keyOffset, capoOffset: clearing ? 0 : capoOffset }
        : e),
    } : p);
    const updated = clearing
      ? await clearPlaylistEntryOverrides(playlist!.id, entryId)
      : await updatePlaylistEntry(playlist!.id, entryId, { keyOffset, capoOffset });
    setPlaylist(updated);
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
          keyOffset: e.keyOffset,
          capoOffset: e.capoOffset,
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
              className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              title="Delete playlist">Delete</button>
          )}
          <button
            onClick={toggleManage}
            className={managing
              ? 'px-3 py-2 text-sm rounded-lg border border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors'
              : 'px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors'}
          >
            {managing ? 'Done' : 'Manage'}
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
                  onClick={() => !managing && handleOpenSong(idx)}
                >
                  <div className="font-medium text-gray-900 truncate">{entry.title}</div>
                  {entry.artist && <div className="text-xs text-gray-400 truncate">{entry.artist}</div>}
                  <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                    {entry.originalKey && (
                      <span className={entry.keyOffset !== 0 || entry.capoOffset !== 0 ? 'text-indigo-500' : 'text-gray-400'}>
                        {keyLabel(entry.originalKey, entry.keyOffset + entry.capoOffset)}
                      </span>
                    )}
                    {entry.tempo != null && <span className="text-gray-400">{entry.tempo} BPM</span>}
                  </div>
                </div>

                {/* Voicing edit button (manage only) */}
                {managing && (
                  <button
                    onClick={() => setEditingEntry(entry.entryId)}
                    className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 shrink-0"
                    title="Edit voicing offset"
                  >✎</button>
                )}

                {/* Open song (non-manage) */}
                {!managing && (
                  <button
                    onClick={() => handleOpenSong(idx)}
                    className="text-gray-300 hover:text-indigo-400 transition-colors text-lg leading-none shrink-0"
                    title="Open song"
                  >›</button>
                )}

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
            </div>
          ))}
        </div>
      )}

      {editingEntry && (() => {
        const entry = entries.find(e => e.entryId === editingEntry);
        return entry ? (
          <VoicingModal
            entry={entry}
            onSave={(k, c) => handleSaveOverride(entry.entryId, k, c)}
            onClose={() => setEditingEntry(null)}
          />
        ) : null;
      })()}

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
