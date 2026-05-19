import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getSong } from '../../core/api/client';
import type { SongDetail, ChordLyric, GuitarTabLine } from '../../core/api/client';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';
import { useMetronome } from '../../core/metronome/useMetronome';
import { CHROMATIC_NOTES, KEY_LABEL, getStringLabels } from '../../core/music';
import type { InstrumentName } from '../../core/useInstrument';
import InstrumentSelector from '../../components/InstrumentSelector';
import GuitarNeck from '../live/GuitarNeck';
import KaraokeDisplay from './KaraokeDisplay';
import SongLibraryModal from './SongLibraryModal';
import { useChordHighlight } from './useChordHighlight';

type NoodleView = 'empty' | 'song' | 'freeChords';

const MODES_LIST = [
  { value: 'IONIAN',     label: 'Major (Ionian)' },
  { value: 'AEOLIAN',    label: 'Minor (Aeolian)' },
  { value: 'DORIAN',     label: 'Dorian' },
  { value: 'MIXOLYDIAN', label: 'Mixolydian' },
  { value: 'PHRYGIAN',   label: 'Phrygian' },
  { value: 'LYDIAN',     label: 'Lydian' },
  { value: 'LOCRIAN',    label: 'Locrian' },
];

const MODE_NAME_TO_ENUM: Record<string, string> = {
  'Dorian': 'DORIAN', 'Phrygian': 'PHRYGIAN', 'Lydian': 'LYDIAN',
  'Mixolydian': 'MIXOLYDIAN', 'Locrian': 'LOCRIAN',
  'Ionian': 'IONIAN', 'Aeolian': 'AEOLIAN',
};

const selectClass = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-white';

function parseSongKey(originalKey: string | null, semitones: number): { root: string; mode: string } {
  if (!originalKey) return { root: 'C', mode: 'IONIAN' };
  const display = KEY_LABEL[originalKey] ?? originalKey;
  const match = display.match(/^([A-G][#b]?)(m?)(?: (.+))?$/);
  if (!match) return { root: 'C', mode: 'IONIAN' };
  const [, root, minorSuffix, modeName] = match;
  let modeEnum = 'IONIAN';
  if (minorSuffix === 'm') modeEnum = 'AEOLIAN';
  else if (modeName) modeEnum = MODE_NAME_TO_ENUM[modeName] ?? 'IONIAN';
  const idx = CHROMATIC_NOTES.indexOf(root);
  const transposedRoot = idx !== -1 ? CHROMATIC_NOTES[((idx + semitones) % 12 + 12) % 12] : root;
  return { root: transposedRoot, mode: modeEnum };
}

function keyDisplayLabel(originalKey: string | null, semitones: number): string {
  if (!originalKey) return '';
  const { root, mode } = parseSongKey(originalKey, semitones);
  const modeLabel = MODES_LIST.find(m => m.value === mode)?.label ?? '';
  if (mode === 'IONIAN') return root;
  if (mode === 'AEOLIAN') return `${root}m`;
  return `${root} ${modeLabel}`;
}

function firstChordToken(chords: string): string | null {
  const tokens = chords.trim().split(/\s+/);
  for (const t of tokens) {
    const core = t.replace(/^\(+/, '').replace(/[)*]+$/, '');
    if (/^[A-G]/.test(core) && core !== 'NC' && core !== 'N.C.') return core;
  }
  return null;
}

function parseFreeChords(input: string): string[] {
  return input.split('|').map(s => s.trim()).filter(s => /^[A-G]/.test(s));
}

function isTabLine(l: { type?: string }): l is GuitarTabLine {
  return l.type === 'tab';
}

export default function NoodlePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const songId = searchParams.get('songId');
  const semitones = parseInt(searchParams.get('semitones') ?? '0', 10);
  const urlCapo = parseInt(searchParams.get('capo') ?? '0', 10);

  const [view, setView] = useState<NoodleView>('empty');
  const [song, setSong] = useState<SongDetail | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showLibrary, setShowLibrary] = useState(false);
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');

  // Free chords state
  const [freeInput, setFreeInput] = useState('');
  const [freeChords, setFreeChords] = useState<string[]>([]);
  const [chordIdx, setChordIdx] = useState(0);
  const [freeRoot, setFreeRoot] = useState('C');
  const [freeMode, setFreeMode] = useState('IONIAN');

  const { bpm, isPlaying, setIsPlaying } = useMetronomeContext();

  // Load song from URL on mount
  useEffect(() => {
    if (!songId) return;
    getSong(songId, semitones).then(s => {
      setSong(s);
      setCurrentIdx(0);
      setView('song');
    }).catch(() => {});
  }, [songId, semitones]);

  // Parse free chords on input change
  useEffect(() => {
    setFreeChords(parseFreeChords(freeInput));
    setChordIdx(0);
  }, [freeInput]);

  // Content lines: non-blank ChordLyric only (skip tabs and blank spacers)
  const contentLines = useMemo((): ChordLyric[] => {
    if (!song) return [];
    return song.chordLines.filter(
      (l): l is ChordLyric =>
        !isTabLine(l) && !((l as ChordLyric).chords.trim() === '' && (l as ChordLyric).lyrics.trim() === '')
    );
  }, [song]);

  // Sounding key for the neck
  const { soundingRoot, soundingMode } = useMemo(() => {
    if (view === 'freeChords') return { soundingRoot: freeRoot, soundingMode: freeMode };
    if (!song?.originalKey) return { soundingRoot: 'C', soundingMode: 'IONIAN' };
    const totalSemitones = semitones + urlCapo - (song.capo ?? 0);
    return parseSongKey(song.originalKey, totalSemitones);
  }, [view, song, semitones, urlCapo, freeRoot, freeMode]);

  const keyDisplay = useMemo(() => {
    if (view === 'freeChords') {
      const modeLabel = MODES_LIST.find(m => m.value === freeMode)?.label ?? '';
      if (freeMode === 'IONIAN') return freeRoot;
      if (freeMode === 'AEOLIAN') return `${freeRoot}m`;
      return `${freeRoot} ${modeLabel}`;
    }
    if (!song?.originalKey) return '';
    return keyDisplayLabel(song.originalKey, semitones + urlCapo - (song.capo ?? 0));
  }, [view, song, semitones, urlCapo, freeRoot, freeMode]);

  // Current active chord for highlighting
  const activeChord = useMemo(() => {
    if (view === 'song' && contentLines.length > 0) {
      return firstChordToken(contentLines[currentIdx]?.chords ?? '');
    }
    if (view === 'freeChords' && freeChords.length > 0) {
      return freeChords[chordIdx % freeChords.length] ?? null;
    }
    return null;
  }, [view, contentLines, currentIdx, freeChords, chordIdx]);

  // Metronome advance — stable callback via ref
  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (view === 'song' && contentLines.length > 0) {
      setCurrentIdx(i => (i + 1) % contentLines.length);
    } else if (view === 'freeChords' && freeChords.length > 0) {
      setChordIdx(i => (i + 1) % freeChords.length);
    }
  };

  const onBeat = useCallback((beat: number) => {
    if (beat === 0) advanceRef.current();
  }, []);

  useMetronome(bpm, isPlaying, onBeat);

  const dots = useChordHighlight(activeChord, soundingRoot, soundingMode, instrument);

  function loadSongById(id: string) {
    setShowLibrary(false);
    navigate(`/noodle?songId=${id}`);
  }

  function enterFreeChords() {
    setIsPlaying(false);
    setChordIdx(0);
    setView('freeChords');
  }

  function backToEmpty() {
    setIsPlaying(false);
    setSong(null);
    setView('empty');
    navigate('/noodle', { replace: true });
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (view === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
        <h1 className="text-3xl font-bold text-gray-800">Noodle</h1>
        <div className="flex gap-4">
          <button
            onClick={enterFreeChords}
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            Free Chords
          </button>
          <button
            onClick={() => setShowLibrary(true)}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Load Song
          </button>
        </div>
        {showLibrary && (
          <SongLibraryModal onSelect={loadSongById} onClose={() => setShowLibrary(false)} />
        )}
      </div>
    );
  }

  // ── Song / Free Chords state ─────────────────────────────────────────────
  return (
    <div className="px-4 py-4 flex flex-col gap-4 max-w-3xl mx-auto">

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {view === 'song' && songId ? (
          <Link to={`/song/${songId}`} className="text-sm text-indigo-500 hover:text-indigo-700 shrink-0">
            ← {song?.title ?? '…'}
          </Link>
        ) : (
          <button onClick={backToEmpty} className="text-sm text-indigo-500 hover:text-indigo-700 shrink-0">
            ← Noodle
          </button>
        )}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {keyDisplay && (
            <span className="text-sm text-gray-500 font-medium">{keyDisplay}</span>
          )}
          <InstrumentSelector
            instrument={instrument}
            onInstrumentChange={setInstrument}
            excludeCustom
            compact
          />
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isPlaying
                ? 'bg-red-50 border border-red-300 text-red-500 hover:bg-red-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => setShowLibrary(true)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Load Song
          </button>
        </div>
      </div>

      {/* Guitar Neck */}
      <GuitarNeck dots={dots} stringLabels={getStringLabels(instrument)} />

      {/* Free chords controls */}
      {view === 'freeChords' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <select value={freeRoot} onChange={e => setFreeRoot(e.target.value)} className={selectClass}>
              {CHROMATIC_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={freeMode} onChange={e => setFreeMode(e.target.value)} className={selectClass}>
              {MODES_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {freeChords.length > 0 && (
            <div className="text-center py-2">
              <span className="text-3xl font-bold text-indigo-600">
                {freeChords[chordIdx % freeChords.length]}
              </span>
              <span className="text-sm text-gray-400 ml-2">
                {(chordIdx % freeChords.length) + 1}/{freeChords.length}
              </span>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Chord progression — separate measures with |</label>
            <textarea
              value={freeInput}
              onChange={e => setFreeInput(e.target.value)}
              placeholder="G | Am | F | C"
              rows={2}
              className="w-full border border-gray-200 rounded-lg p-3 font-mono text-sm focus:outline-none focus:border-indigo-400 resize-none"
            />
          </div>
        </div>
      )}

      {/* Karaoke display */}
      {view === 'song' && contentLines.length > 0 && (
        <KaraokeDisplay lines={contentLines} currentIdx={currentIdx} />
      )}

      {showLibrary && (
        <SongLibraryModal onSelect={loadSongById} onClose={() => setShowLibrary(false)} />
      )}
    </div>
  );
}
