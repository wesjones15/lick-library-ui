import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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

type NoodleMode = 'none' | 'song' | 'freeChords';

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

function isSectionHeader(line: ChordLyric): boolean {
  const t = line.lyrics.trim();
  return t.startsWith('[') && t.endsWith(']');
}

export default function NoodlePage() {
  const [searchParams] = useSearchParams();
  const urlSongId = searchParams.get('songId');
  const urlSemitones = parseInt(searchParams.get('semitones') ?? '0', 10);
  const urlCapo = parseInt(searchParams.get('capo') ?? '0', 10);

  const [noodleMode, setNoodleMode] = useState<NoodleMode>(urlSongId ? 'song' : 'none');
  const [song, setSong] = useState<SongDetail | null>(null);
  const [activeSongId, setActiveSongId] = useState<string | null>(urlSongId);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showLibrary, setShowLibrary] = useState(false);
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');

  const [localSemitones, setLocalSemitones] = useState(urlSemitones);
  const [localCapo, setLocalCapo] = useState(urlCapo);

  const { bpm, setBpm, isPlaying, setIsPlaying } = useMetronomeContext();
  const [bpmInput, setBpmInput] = useState(String(bpm));

  const [freeInput, setFreeInput] = useState('');
  const [freeChords, setFreeChords] = useState<string[]>([]);
  const [chordIdx, setChordIdx] = useState(0);
  const [freeRoot, setFreeRoot] = useState('C');
  const [freeMode, setFreeMode] = useState('IONIAN');

  // true when active song came from URL param on mount (Song Detail nav)
  const loadedViaUrl = useRef(!!urlSongId);
  // tracks last song ID we prefilled controls for; prevents re-prefill on semitone changes
  const prevSongIdForPrefill = useRef<string | null>(null);

  // Fetch song whenever activeSongId or localSemitones changes
  useEffect(() => {
    if (!activeSongId || noodleMode !== 'song') return;
    getSong(activeSongId, localSemitones).then(s => {
      setSong(s);
      setCurrentIdx(0);
      if (prevSongIdForPrefill.current !== activeSongId) {
        prevSongIdForPrefill.current = activeSongId;
        if (s.tempo) setBpmInput(String(s.tempo));
        // For modal loads, initialize capo to the song's native capo so offset starts at zero
        if (!loadedViaUrl.current) setLocalCapo(s.capo ?? 0);
      }
    }).catch(() => {});
  }, [activeSongId, localSemitones, noodleMode]);

  useEffect(() => {
    setFreeChords(parseFreeChords(freeInput));
    setChordIdx(0);
  }, [freeInput]);

  const contentLines = useMemo((): ChordLyric[] => {
    if (!song) return [];
    return song.chordLines.filter(
      (l): l is ChordLyric =>
        !isTabLine(l) && !((l as ChordLyric).chords.trim() === '' && (l as ChordLyric).lyrics.trim() === '')
    );
  }, [song]);

  const { soundingRoot, soundingMode } = useMemo(() => {
    if (noodleMode === 'freeChords') return { soundingRoot: freeRoot, soundingMode: freeMode };
    if (noodleMode !== 'song' || !song?.originalKey) return { soundingRoot: '', soundingMode: 'IONIAN' };
    const totalOffset = localSemitones + localCapo - (song.capo ?? 0);
    return parseSongKey(song.originalKey, totalOffset);
  }, [noodleMode, song, localSemitones, localCapo, freeRoot, freeMode]);

  const keyDisplay = useMemo(() => {
    if (noodleMode === 'freeChords') {
      const modeLabel = MODES_LIST.find(m => m.value === freeMode)?.label ?? '';
      if (freeMode === 'IONIAN') return freeRoot;
      if (freeMode === 'AEOLIAN') return `${freeRoot}m`;
      return `${freeRoot} ${modeLabel}`;
    }
    if (noodleMode !== 'song' || !song?.originalKey) return '';
    return keyDisplayLabel(song.originalKey, localSemitones + localCapo - (song.capo ?? 0));
  }, [noodleMode, song, localSemitones, localCapo, freeRoot, freeMode]);

  const activeChord = useMemo(() => {
    if (noodleMode === 'song' && contentLines.length > 0) {
      return firstChordToken(contentLines[currentIdx]?.chords ?? '');
    }
    if (noodleMode === 'freeChords' && freeChords.length > 0) {
      return freeChords[chordIdx % freeChords.length] ?? null;
    }
    return null;
  }, [noodleMode, contentLines, currentIdx, freeChords, chordIdx]);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (noodleMode === 'song' && contentLines.length > 0) {
      setCurrentIdx(i => {
        let next = (i + 1) % contentLines.length;
        let guard = 0;
        while (isSectionHeader(contentLines[next]) && guard < contentLines.length) {
          next = (next + 1) % contentLines.length;
          guard++;
        }
        return next;
      });
    } else if (noodleMode === 'freeChords' && freeChords.length > 0) {
      setChordIdx(i => (i + 1) % freeChords.length);
    }
  };

  const onBeat = useCallback((beat: number) => {
    if (beat === 0) advanceRef.current();
  }, []);

  useMetronome(bpm, isPlaying, onBeat);

  const capoOffset = noodleMode === 'song' ? localCapo : 0;
  const dots = useChordHighlight(activeChord, soundingRoot, soundingMode, instrument, capoOffset);

  function loadSongById(id: string) {
    setShowLibrary(false);
    loadedViaUrl.current = false;
    setActiveSongId(id);
    setLocalSemitones(0);
    setLocalCapo(0);
    setNoodleMode('song');
    setCurrentIdx(0);
  }

  function handlePlay() {
    if (!isPlaying) {
      const parsed = parseInt(bpmInput, 10);
      if (!isNaN(parsed) && parsed > 0) setBpm(parsed);
    }
    setIsPlaying(!isPlaying);
  }

  function handleRestart() {
    setCurrentIdx(0);
    setChordIdx(0);
    setIsPlaying(false);
  }

  const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border';
  const btnActive = `${btnBase} bg-indigo-600 text-white border-indigo-600`;
  const btnInactive = `${btnBase} border-gray-300 text-gray-600 hover:bg-gray-50`;

  const showBackLink = !!(activeSongId && loadedViaUrl.current && urlSongId === activeSongId);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-4">

      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-900 shrink-0">Noodle</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setIsPlaying(false); setNoodleMode('freeChords'); }}
            className={noodleMode === 'freeChords' ? btnActive : btnInactive}
          >
            Free Chords
          </button>
          <button
            onClick={() => setShowLibrary(true)}
            className={noodleMode === 'song' ? btnActive : btnInactive}
          >
            Load Song
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="w-8 h-8 flex items-center justify-center text-xl text-gray-400 hover:text-indigo-500 transition-colors"
            aria-label="Restart"
            title="Restart"
          >
            ↺
          </button>
          <button
            onClick={handlePlay}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isPlaying
                ? 'bg-red-50 border border-red-300 text-red-500 hover:bg-red-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
      </div>

      {/* Back link — only when song came from Song Detail page via URL */}
      {showBackLink && (
        <Link to={`/song/${activeSongId}`} className="text-sm text-indigo-500 hover:text-indigo-700 w-fit">
          ← {song?.title ?? '…'}
        </Link>
      )}

      {/* Song info */}
      {noodleMode === 'song' && song && (
        <div className="text-sm text-gray-500">
          {song.title}{song.artist ? ` · ${song.artist}` : ''}
        </div>
      )}

      {/* Guitar Neck — always shown */}
      <GuitarNeck dots={dots} stringLabels={getStringLabels(instrument)} />

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">BPM</span>
          <input
            type="number"
            value={bpmInput}
            onChange={e => setBpmInput(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-white w-16 text-center"
            min={20}
            max={300}
          />
        </div>

        {noodleMode === 'freeChords' ? (
          <>
            <select value={freeRoot} onChange={e => setFreeRoot(e.target.value)} className={selectClass}>
              {CHROMATIC_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={freeMode} onChange={e => setFreeMode(e.target.value)} className={selectClass}>
              {MODES_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </>
        ) : keyDisplay ? (
          <span className="text-sm font-medium text-gray-600 px-2 py-1.5">{keyDisplay}</span>
        ) : null}

        <InstrumentSelector
          instrument={instrument}
          onInstrumentChange={setInstrument}
          excludeCustom
          compact
        />

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Capo</span>
          <button
            onClick={() => setLocalCapo(c => Math.max(0, c - 1))}
            className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-indigo-500 border border-gray-200 rounded"
          >−</button>
          <span className="text-sm text-gray-700 w-5 text-center tabular-nums">{localCapo}</span>
          <button
            onClick={() => setLocalCapo(c => Math.min(11, c + 1))}
            className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-indigo-500 border border-gray-200 rounded"
          >+</button>
        </div>

        {noodleMode === 'song' && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Transpose</span>
            <button
              onClick={() => setLocalSemitones(s => s - 1)}
              className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-indigo-500 border border-gray-200 rounded"
            >−</button>
            <span className="text-sm text-gray-700 w-6 text-center tabular-nums">
              {localSemitones > 0 ? `+${localSemitones}` : localSemitones}
            </span>
            <button
              onClick={() => setLocalSemitones(s => s + 1)}
              className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-indigo-500 border border-gray-200 rounded"
            >+</button>
          </div>
        )}
      </div>

      {/* Free chords section */}
      {noodleMode === 'freeChords' && (
        <div className="flex flex-col gap-3">
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
      {noodleMode === 'song' && contentLines.length > 0 && (
        <KaraokeDisplay lines={contentLines} currentIdx={currentIdx} />
      )}

      {showLibrary && (
        <SongLibraryModal onSelect={loadSongById} onClose={() => setShowLibrary(false)} />
      )}
    </div>
  );
}
