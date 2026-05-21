import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getSong, updateSong, deleteSong, getChordVoicings } from '../../core/api/client';
import type { SongDetail, ChordVoicing, GuitarTabLine } from '../../core/api/client';
import ChordDiagram from '../chords/ChordDiagram';
import { parseChordName } from './parseChordName';
import ChordUploadModal from '../chords/ChordUploadModal';
import { CHROMATIC_NOTES, SONG_MODES, SONG_MODE_TO_ENUM } from '../../core/music';
import InstrumentSelector from '../../components/InstrumentSelector';
import type { InstrumentName } from '../../core/useInstrument';

const LEGACY_KEY_MAP: Record<string, string> = {
  C_SHARP: 'C#', D_SHARP: 'D#', F_SHARP: 'F#', G_SHARP: 'G#', B_FLAT: 'Bb',
};

function parseStoredKey(stored: string): { root: string; mode: string } {
  if (!stored) return { root: '', mode: '' };
  const display = LEGACY_KEY_MAP[stored] ?? stored;
  const match = display.match(/^([A-G][#b]?)(m?)(?: (.+))?$/);
  if (!match) return { root: display, mode: '' };
  const [, root, minorSuffix, modeName] = match;
  return { root, mode: modeName ? ` ${modeName}` : minorSuffix };
}

const inputClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400';
const btnSecondary = 'px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors';

function extractChordNames(song: SongDetail): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  song.chordLines.forEach(line => {
    const text = (line as GuitarTabLine).type === 'tab'
      ? (line as GuitarTabLine).header
      : (line as { chords: string }).chords;
    text.split(/\s+/).forEach(t => {
      const core = t.replace(/^\(+/, '').replace(/[)*]+$/, '');
      if (/^[A-G]/.test(core) && !seen.has(core)) {
        seen.add(core);
        result.push(core);
      }
    });
  });
  return result;
}

export default function SongManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const semitones = parseInt(searchParams.get('semitones') ?? '0', 10);

  const [song, setSong] = useState<SongDetail | null>(null);
  const [mode, setMode] = useState<'metadata' | 'chart' | 'chords'>('metadata');

  // Metadata fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [keyRoot, setKeyRoot] = useState('');
  const [keyMode, setKeyMode] = useState('');
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');
  const [capo, setCapo] = useState('');
  const [tempo, setTempo] = useState('');

  // Chart field
  const [rawChordSheet, setRawChordSheet] = useState('');

  // Chord voicings
  const [chordVoicings, setChordVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [chordVoicingIdx, setChordVoicingIdx] = useState<Record<string, number>>({});

  // UI state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSong(id, semitones).then(s => {
      setSong(s);
      setTitle(s.title);
      setArtist(s.artist ?? '');
      const { root, mode: parsedMode } = parseStoredKey(s.originalKey ?? '');
      setKeyRoot(root);
      if (s.mode) {
        const modeEntry = Object.entries(SONG_MODE_TO_ENUM).find(([, v]) => v === s.mode);
        setKeyMode(modeEntry ? modeEntry[0] : '');
      } else {
        setKeyMode(parsedMode);
      }
      setInstrument((s.instrument ?? 'GUITAR') as InstrumentName);
      setCapo(s.capo != null ? String(s.capo) : '');
      setTempo(s.tempo != null ? String(s.tempo) : '');
      setRawChordSheet(s.rawChordSheet ?? '');
    });
  }, [id]);

  useEffect(() => {
    if (mode !== 'chords' || !song) return;
    const names = extractChordNames(song);
    Promise.all(
      names.map(async name => {
        const parsed = parseChordName(name);
        if (!parsed) return [name, []] as [string, ChordVoicing[]];
        const voicings = await getChordVoicings(parsed.root, parsed.quality);
        return [name, voicings] as [string, ChordVoicing[]];
      })
    ).then(results => {
      setChordVoicings(Object.fromEntries(results));
      setChordVoicingIdx({});
    });
  }, [mode, song]);

  const currentKey = keyRoot + keyMode;
  const savedKey = song
    ? (() => {
        if (song.mode) {
          const modeEntry = Object.entries(SONG_MODE_TO_ENUM).find(([, v]) => v === song.mode);
          return (song.originalKey ?? '') + (modeEntry ? modeEntry[0] : '');
        }
        const { root, mode } = parseStoredKey(song.originalKey ?? '');
        return root ? root + mode : '';
      })()
    : '';
  const metadataIsDirty = song && (
    title !== song.title ||
    artist !== (song.artist ?? '') ||
    currentKey !== savedKey ||
    instrument !== (song.instrument ?? 'GUITAR') ||
    capo !== (song.capo != null ? String(song.capo) : '') ||
    tempo !== (song.tempo != null ? String(song.tempo) : '')
  );

  const chartIsDirty = song && rawChordSheet !== (song.rawChordSheet ?? '');

  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !metadataIsDirty) return;
    setError(null);
    setLoading(true);
    try {
      await updateSong(id, {
        title: title.trim(),
        artist: artist.trim() || undefined,
        originalKey: keyRoot || undefined,
        mode: keyRoot ? (SONG_MODE_TO_ENUM[keyMode] ?? 'IONIAN') : undefined,
        instrument,
        capo: capo ? parseInt(capo, 10) : undefined,
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
    <div className={`mx-auto px-6 py-8 ${mode === 'chords' ? 'max-w-3xl' : 'max-w-lg'}`}>
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
              value={keyRoot}
              onChange={e => setKeyRoot(e.target.value)}
              className={`${inputClass} flex-1 bg-white`}
            >
              <option value="">— Key —</option>
              {CHROMATIC_NOTES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={keyMode}
              onChange={e => setKeyMode(e.target.value)}
              disabled={!keyRoot}
              className={`${inputClass} w-24 bg-white disabled:opacity-40`}
            >
              {SONG_MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={capo}
              onChange={e => setCapo(e.target.value)}
              placeholder="Capo"
              min={0}
              max={11}
              className={`${inputClass} w-20`}
            />
            <input
              type="number"
              value={tempo}
              onChange={e => setTempo(e.target.value)}
              placeholder="BPM"
              min={1}
              className={`${inputClass} w-24`}
            />
          </div>
          <InstrumentSelector
            excludeCustom
            compact
            instrument={instrument}
            onInstrumentChange={setInstrument}
          />
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
          <button type="button" onClick={() => { setRawChordSheet(song.rawChordSheet ?? ''); setMode('metadata'); }} className="text-sm text-indigo-500 hover:text-indigo-700 self-start">
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
          {extractChordNames(song).length === 0 ? (
            <p className="text-sm text-gray-400">No chords detected in this song.</p>
          ) : (
            <div className="grid grid-cols-6 gap-3">
              {extractChordNames(song).map(name => {
                const voicings = chordVoicings[name] ?? [];
                const idx = chordVoicingIdx[name] ?? 0;
                const frets = voicings.length > 0 ? voicings[idx].frets : [0, 0, 0, 0, 0, 0];
                return (
                  <div
                    key={name}
                    className="relative flex-shrink-0 flex flex-col items-center border border-gray-200 rounded-lg px-2 pt-2 pb-1 bg-white"
                  >
                    <span className="text-xs font-semibold text-gray-700 mb-1">{name}</span>
                    <button
                      title="Add voicing"
                      onClick={() => setSelectedChord(name)}
                      className="absolute top-1 right-2 text-gray-300 hover:text-indigo-500 text-xl leading-none"
                    >
                      +
                    </button>
                    <ChordDiagram frets={frets} width={90} />
                    {voicings.length > 1 && (
                      <div className="flex items-center justify-between w-full text-xs text-gray-400 mt-1">
                        <button
                          className="hover:text-gray-600 px-1 text-2xl leading-none"
                          onClick={() => setChordVoicingIdx(s => ({ ...s, [name]: (idx - 1 + voicings.length) % voicings.length }))}
                        >‹</button>
                        <span>{idx + 1}/{voicings.length}</span>
                        <button
                          className="hover:text-gray-600 px-1 text-2xl leading-none"
                          onClick={() => setChordVoicingIdx(s => ({ ...s, [name]: (idx + 1) % voicings.length }))}
                        >›</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
