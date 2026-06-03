import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getPlaylist, deletePlaylist, updatePlaylistEntry, renamePlaylist,
  clearPlaylistEntryOverrides, removePlaylistEntry, getAllSongs, setPlaylistVisibility,
} from '../../core/api/client';
import type { PlaylistDetail, PlaylistEntry, SongSummary } from '../../core/api/client';

import { keyLabel } from '../songs/songKeyUtils';
import VoicingModal from './VoicingModal';
import AddSongsModal from './AddSongsModal';

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

  async function handleToggleVisibility() {
    const newValue = !playlist!.isPublic;
    await setPlaylistVisibility(playlist!.id, newValue);
    setPlaylist(p => p ? { ...p, isPublic: newValue } : p);
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

  async function handleSaveOverride(entryId: string, keyOffset: number, capoOffset: number, instrument: string, tempoOverride: number | null) {
    const entry = entries.find(e => e.entryId === entryId);
    const defaultInstrument = entry?.defaultInstrument ?? 'GUITAR';
    const clearing = keyOffset === 0 && capoOffset === 0 && tempoOverride === null && instrument === defaultInstrument;
    setPlaylist(p => p ? {
      ...p,
      entries: p.entries.map(e => e.entryId === entryId
        ? { ...e, keyOffset: clearing ? 0 : keyOffset, capoOffset: clearing ? 0 : capoOffset, tempoOverride: clearing ? null : tempoOverride, instrument: clearing ? null : instrument }
        : e),
    } : p);
    const updated = clearing
      ? await clearPlaylistEntryOverrides(playlist!.id, entryId)
      : await updatePlaylistEntry(playlist!.id, entryId, { keyOffset, capoOffset, tempoOverride, instrument });
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
          tempoOverride: e.tempoOverride ?? null,
          instrument: e.instrument,
        })),
        currentIndex: index,
      },
    });
  }

  function renderHeader() {
    return (
      <div className="flex items-start justify-between mb-6 gap-3">
        <div className="min-w-0 flex-1">
          <Link to="/playlists" className="text-sm text-gray-400 hover:text-brand-5 transition-colors">← Playlists</Link>
          {editingName ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="text-2xl font-bold text-gray-900 border-b-2 border-brand-4 focus:outline-none bg-transparent"
              />
              <button onClick={handleSaveName} className="text-brand-5 hover:text-brand-7 text-lg" title="Save name">💾</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-3xl font-bold text-gray-900">{playlist.name}</h1>
              {managing && playlist.ownedByCurrentUser && (
                <button
                  onClick={() => { setNameInput(playlist.name); setEditingName(true); }}
                  className="text-gray-400 hover:text-brand-5 transition-colors text-3xl leading-none"
                  title="Rename playlist"
                >✎</button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{entries.length} {entries.length === 1 ? 'song' : 'songs'}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${playlist.isPublic ? 'bg-success-1 text-success-6' : 'bg-gray-100 text-gray-400'}`}>
              {playlist.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {managing && playlist.ownedByCurrentUser && confirmDelete && (
            <div className="flex gap-2">
              <button onClick={handleDeletePlaylist} className="text-xs px-3 py-1.5 rounded bg-danger-6 text-white hover:bg-danger-7">Delete playlist</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          )}
          {managing && playlist.ownedByCurrentUser && !confirmDelete && (
            <>
              <button
                onClick={handleToggleVisibility}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
                title={playlist.isPublic ? 'Make private' : 'Make public'}
              >
                {playlist.isPublic ? 'Make Private' : 'Make Public'}
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 text-sm rounded-lg border border-danger-3 text-danger-6 hover:bg-danger-1 transition-colors"
                title="Delete playlist">Delete</button>
            </>
          )}
          {playlist.ownedByCurrentUser && (
            <button
              onClick={toggleManage}
              className={managing
                ? 'px-4 py-2 text-sm rounded-lg border border-brand-3 text-brand-6 bg-brand-1 hover:bg-brand-2 transition-colors'
                : 'px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors'}
            >
              {managing ? 'Done' : 'Manage'}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderEntryRow(entry: PlaylistEntry, idx: number) {
    return (
      <div key={entry.entryId} className="border border-gray-200 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-300 w-5 text-right shrink-0">{idx + 1}</span>

          {managing && playlist!.ownedByCurrentUser && (
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => handleReorder(entry.entryId, -1)} disabled={idx === 0}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
              <button onClick={() => handleReorder(entry.entryId, 1)} disabled={idx === entries.length - 1}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
            </div>
          )}

          <div
            className="flex-1 cursor-pointer hover:text-brand-7 transition-colors min-w-0"
            onClick={() => !managing && handleOpenSong(idx)}
          >
            <div className="font-medium text-gray-900 truncate">{entry.title}</div>
            {entry.artist && <div className="text-xs text-gray-400 truncate">{entry.artist}</div>}
            <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
              {entry.originalKey && (
                <span className={entry.keyOffset !== 0 || entry.capoOffset !== 0 ? 'text-brand-5' : 'text-gray-400'}>
                  {keyLabel(entry.originalKey, entry.keyOffset + entry.capoOffset, entry.mode)}
                </span>
              )}
              <span className={entry.capoOffset !== 0 ? 'text-brand-5' : 'text-gray-400'}>
                {entry.defaultCapo + entry.capoOffset > 0 ? `Capo ${entry.defaultCapo + entry.capoOffset}` : 'No Capo'}
              </span>
              {(entry.tempoOverride != null || entry.tempo != null) && (
                <span className={entry.tempoOverride != null ? 'text-brand-5' : 'text-gray-400'}>
                  {entry.tempoOverride ?? entry.tempo} BPM{entry.tempoOverride != null ? ' (override)' : ''}
                </span>
              )}
            </div>
          </div>

          {!managing && (
            <button
              onClick={() => handleOpenSong(idx)}
              className="text-gray-300 hover:text-brand-4 transition-colors text-lg leading-none shrink-0"
              title="Open song"
            >›</button>
          )}

          {managing && playlist!.ownedByCurrentUser && (
            <div className="flex items-center gap-4 shrink-0 ml-2 mr-2">
              <button
                onClick={() => setEditingEntry(entry.entryId)}
                className="text-gray-400 hover:text-brand-5 transition-colors leading-none"
                style={{ fontSize: '2.1875rem' }}
                title="Edit voicing offset"
              >✎</button>
              {confirmRemove === entry.entryId ? (
                <div className="flex gap-1">
                  <button onClick={() => handleRemoveEntry(entry.entryId)} className="text-xs px-2 py-0.5 rounded bg-danger-6 text-white hover:bg-danger-7">Remove</button>
                  <button onClick={() => setConfirmRemove(null)} className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmRemove(entry.entryId)}
                  className="text-danger-5 hover:text-danger-7 transition-colors text-2xl leading-none">×</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {renderHeader()}

      {playlist.ownedByCurrentUser && (managing || entries.length === 0) && (
        <button
          onClick={() => setShowAddSongs(true)}
          className="flex items-center gap-2 text-sm text-brand-6 hover:text-brand-7 border border-dashed border-brand-3 rounded-xl px-4 py-3 w-full hover:bg-brand-1 transition-colors mb-4"
        >
          <span className="text-lg leading-none">+</span> Add Songs
        </button>
      )}

      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm">{managing ? 'Use Add Songs to add songs to this playlist.' : 'No songs yet.'}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, idx) => renderEntryRow(entry, idx))}
        </div>
      )}

      {editingEntry && (() => {
        const entry = entries.find(e => e.entryId === editingEntry);
        return entry ? (
          <VoicingModal
            entry={entry}
            onSave={(k, c, instr, bpm) => handleSaveOverride(entry.entryId, k, c, instr, bpm)}
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
