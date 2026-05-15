import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSong, updateSong, deleteSong } from '../../core/api/client';
import type { SongDetail } from '../../core/api/client';
import ChordUploadModal from '../chords/ChordUploadModal';

const INPUT_KEYS = [
  { value: '',        label: '—'  },
  { value: 'C',       label: 'C'  },
  { value: 'C_SHARP', label: 'C#' },
  { value: 'D',       label: 'D'  },
  { value: 'D_SHARP', label: 'D#' },
  { value: 'E',       label: 'E'  },
  { value: 'F',       label: 'F'  },
  { value: 'F_SHARP', label: 'F#' },
  { value: 'G',       label: 'G'  },
  { value: 'G_SHARP', label: 'G#' },
  { value: 'A',       label: 'A'  },
  { value: 'B_FLAT',  label: 'Bb' },
  { value: 'B',       label: 'B'  },
];

const inputClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400';
const btnSecondary = 'px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors';

export default function SongManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [song, setSong] = useState<SongDetail | null>(null);
  const [mode, setMode] = useState<'metadata' | 'chart' | 'chords'>('metadata');

  // Metadata fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('');
  const [tempo, setTempo] = useState('');

  // Chart field
  const [rawChordSheet, setRawChordSheet] = useState('');

  // UI state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSong(id).then(s => {
      setSong(s);
      setTitle(s.title);
      setArtist(s.artist ?? '');
      setOriginalKey(s.originalKey ?? '');
      setTempo(s.tempo != null ? String(s.tempo) : '');
      setRawChordSheet(s.rawChordSheet ?? '');
    });
  }, [id]);

  const metadataIsDirty = song && (
    title !== song.title ||
    artist !== (song.artist ?? '') ||
    originalKey !== (song.originalKey ?? '') ||
    tempo !== (song.tempo != null ? String(song.tempo) : '')
  );

  const chartIsDirty = song && rawChordSheet !== (song.rawChordSheet ?? '');

  const uniqueChords = song ? [...new Set(
    song.chordLines
      .flatMap(l => l.chords.trim().split(/\s+/))
      .filter(c => c && /^[A-G]/.test(c))
  )].sort() : [];

  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !metadataIsDirty) return;
    setError(null);
    setLoading(true);
    try {
      await updateSong(id, {
        title: title.trim(),
        artist: artist.trim() || undefined,
        originalKey: originalKey || undefined,
        tempo: tempo ? parseInt(tempo, 10) : undefined,
      });
      navigate(`/song/${id}`);
    } catch {
      setError('Update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleChartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !chartIsDirty) return;
    setError(null);
    setLoading(true);
    try {
      await updateSong(id, { rawChordSheet });
      navigate(`/song/${id}`);
    } catch {
      setError('Update failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteSong(id);
      navigate('/songs');
    } catch {
      setError('Delete failed.');
    }
  };

  if (!song) return <div className="px-6 pt-8 text-sm text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <Link to={`/song/${id}`} className="text-sm text-indigo-500 hover:text-indigo-700 mb-6 inline-block">
        ← {song.title}
      </Link>

      {mode === 'metadata' && (
        <form onSubmit={handleMetadataSubmit} className="flex flex-col gap-3 mt-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title *"
            required
            className={`${inputClass} w-full`}
          />
          <input
            type="text"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            placeholder="Artist"
            className={`${inputClass} w-full`}
          />
          <div className="flex gap-2">
            <select
              value={originalKey}
              onChange={e => setOriginalKey(e.target.value)}
              className={`${inputClass} flex-1 bg-white`}
            >
              {INPUT_KEYS.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={tempo}
              onChange={e => setTempo(e.target.value)}
              placeholder="BPM"
              min={1}
              className={`${inputClass} w-24`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !metadataIsDirty || !title.trim()}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>

          {/* Mode switchers */}
          <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setMode('chart')} className={btnSecondary}>
              Update Song Chart
            </button>
            <button type="button" onClick={() => setMode('chords')} className={btnSecondary}>
              Manage Chords
            </button>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm border border-red-200 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
              >
                Delete Song
              </button>
            ) : (
              <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      )}

      {mode === 'chart' && (
        <form onSubmit={handleChartSubmit} className="flex flex-col gap-3 mt-4">
          <button type="button" onClick={() => setMode('metadata')} className="text-sm text-indigo-500 hover:text-indigo-700 self-start">
            ← Back
          </button>
          <textarea
            value={rawChordSheet}
            onChange={e => setRawChordSheet(e.target.value)}
            rows={14}
            className="font-mono text-sm border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-400 bg-gray-50"
          />
          <button
            type="submit"
            disabled={loading || !chartIsDirty}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            {loading ? 'Saving…' : 'Save & Re-parse'}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      )}

      {mode === 'chords' && (
        <div className="flex flex-col gap-4 mt-4">
          <button type="button" onClick={() => setMode('metadata')} className="text-sm text-indigo-500 hover:text-indigo-700 self-start">
            ← Back
          </button>
          {uniqueChords.length === 0 ? (
            <p className="text-sm text-gray-400">No chords detected in this song.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {uniqueChords.map(chord => (
                <button
                  key={chord}
                  onClick={() => setSelectedChord(chord)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-full text-gray-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors font-mono"
                >
                  {chord}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400">Click a chord to add a voicing for it.</p>
        </div>
      )}

      {selectedChord && (
        <ChordUploadModal
          chordName={selectedChord}
          onClose={() => setSelectedChord(null)}
          onSuccess={() => setSelectedChord(null)}
        />
      )}
    </div>
  );
}
