import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getSong, getChordVoicings } from '../../core/api/client';
import type { SongDetail, ChordLyric, GuitarTabLine, ChordVoicing } from '../../core/api/client';
import { parseChordName } from '../songs/parseChordName';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';
import { useMetronome } from '../../core/metronome/useMetronome';
import { CHROMATIC_NOTES, KEY_LABEL, getStringLabels } from '../../core/music';
import type { InstrumentName } from '../../core/useInstrument';
import InstrumentSelector from '../../components/InstrumentSelector';
import GuitarNeck from '../live/GuitarNeck';
import KaraokeDisplay from './KaraokeDisplay';
import SongLibraryModal from './SongLibraryModal';
import { useChordHighlight } from './useChordHighlight';
import ChordInfoBox from './ChordInfoBox';

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

const selectClass = 'border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:border-indigo-400 bg-white';

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

function parseChordsFromLine(chords: string): string[] {
  return chords.split(/[\s|]+/)
    .map(t => t.replace(/^\(+/, '').replace(/[)*]+$/, ''))
    .filter(t => /^[A-G]/.test(t) && t !== 'NC' && t !== 'N.C.');
}

function countBars(chords: string): number {
  return Math.max(1, chords.split('|').map(s => s.trim()).filter(Boolean).length);
}

function totalHalfBeats(chords: string): number {
  const bars = countBars(chords);
  if (bars > 1) return bars * 2;
  const n = parseChordsFromLine(chords).length;
  return n <= 3 ? 4 : 8;
}

function halfBeatsPerChord(n: number, total: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [total];
  const x = Math.max(0, Math.min(n, total - n));
  return Array.from({ length: n }, (_, i) => i < x ? 2 : 1);
}

function parseFreeLines(input: string): string[][] {
  return input.split('\n')
    .map(line => line.split('|').map(s => s.trim()).filter(s => /^[A-G]/.test(s)))
    .filter(line => line.length > 0);
}

function FreeChordsKaraokeSlot({
  line, intraIdx, variant,
}: { line: string[] | undefined; intraIdx?: number; variant: 'prev' | 'current' | 'next' }) {
  if (!line) return <div className="h-8" />;
  const isCurrent = variant === 'current';
  return (
    <div className={`font-mono transition-opacity ${isCurrent ? 'text-base' : 'text-sm opacity-35'}`}>
      <div style={{ color: '#4f46e5', whiteSpace: 'pre' }}>
        {line.map((chord, i) => (
          <span key={i}>
            {i > 0 && ' | '}
            {isCurrent && i === intraIdx
              ? <span className="font-bold">{chord}</span>
              : chord}
          </span>
        ))}
      </div>
    </div>
  );
}

function FreeChordsKaraoke({ lines, currentLineIdx, intraIdx }: {
  lines: string[][];
  currentLineIdx: number;
  intraIdx: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl overflow-x-auto">
      <FreeChordsKaraokeSlot line={lines[currentLineIdx - 1]} variant="prev" />
      <FreeChordsKaraokeSlot line={lines[currentLineIdx]} intraIdx={intraIdx} variant="current" />
      <FreeChordsKaraokeSlot line={lines[currentLineIdx + 1]} variant="next" />
    </div>
  );
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
  const [freeLines, setFreeLines] = useState<string[][]>([]);
  const [chordIdx, setChordIdx] = useState(0);
  const [freeRoot, setFreeRoot] = useState('C');
  const [freeMode, setFreeMode] = useState('IONIAN');
  const [cachedVoicings, setCachedVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [pulsed, setPulsed] = useState(false);

  // true when active song came from URL param on mount (Song Detail nav)
  const loadedViaUrl = useRef(!!urlSongId);
  // tracks last song ID we prefilled controls for; prevents re-prefill on semitone changes
  const prevSongIdForPrefill = useRef<string | null>(null);
  // skips first 2 half-beats after pressing Play so a full warmup measure plays before advancing
  const warmupRef = useRef(2);
  const halfBeatRef = useRef(0);
  const [intraChordIdx, setIntraChordIdx] = useState(0);

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

  const contentLines = useMemo((): ChordLyric[] => {
    if (!song) return [];
    return song.chordLines.filter(
      (l): l is ChordLyric =>
        !isTabLine(l) && !((l as ChordLyric).chords.trim() === '' && (l as ChordLyric).lyrics.trim() === '')
    );
  }, [song]);

  const currentFreeLineIdx = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < freeLines.length; i++) {
      if (chordIdx < offset + freeLines[i].length) return i;
      offset += freeLines[i].length;
    }
    return Math.max(0, freeLines.length - 1);
  }, [chordIdx, freeLines]);

  const currentFreeIntraIdx = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < freeLines.length; i++) {
      if (chordIdx < offset + freeLines[i].length) return chordIdx - offset;
      offset += freeLines[i].length;
    }
    return 0;
  }, [chordIdx, freeLines]);

  useEffect(() => {
    if (!contentLines.length) return;
    const unique = [...new Set(contentLines.flatMap(l => parseChordsFromLine(l.chords)))];
    setCachedVoicings({});
    Promise.all(
      unique.map(async name => {
        const parsed = parseChordName(name);
        if (!parsed) return [name, []] as const;
        const voicings = await getChordVoicings(parsed.root, parsed.quality, instrument);
        return [name, voicings] as const;
      })
    ).then(results => setCachedVoicings(Object.fromEntries(results)))
     .catch(() => {});
  }, [contentLines, instrument]);

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
      const chords = contentLines[currentIdx]?.chords ?? '';
      const tokens = parseChordsFromLine(chords);
      return tokens[intraChordIdx] ?? tokens[0] ?? null;
    }
    if (noodleMode === 'freeChords' && freeChords.length > 0) {
      return freeChords[chordIdx % freeChords.length] ?? null;
    }
    return null;
  }, [noodleMode, contentLines, currentIdx, intraChordIdx, freeChords, chordIdx]);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (noodleMode === 'song' && contentLines.length > 0) {
      const chords = contentLines[currentIdx]?.chords ?? '';
      const tokens = parseChordsFromLine(chords);
      const total = totalHalfBeats(chords);
      const dist = halfBeatsPerChord(tokens.length, total);

      halfBeatRef.current++;

      let accum = 0;
      let newChordIdx = Math.max(0, tokens.length - 1);
      for (let i = 0; i < dist.length; i++) {
        accum += dist[i];
        if (halfBeatRef.current <= accum) { newChordIdx = i; break; }
      }
      setIntraChordIdx(newChordIdx);

      if (halfBeatRef.current >= total) {
        halfBeatRef.current = 0;
        setIntraChordIdx(0);
        setCurrentIdx(i => {
          let next = (i + 1) % contentLines.length;
          let guard = 0;
          while (isSectionHeader(contentLines[next]) && guard < contentLines.length) {
            next = (next + 1) % contentLines.length;
            guard++;
          }
          return next;
        });
      }
    } else if (noodleMode === 'freeChords' && freeChords.length > 0) {
      halfBeatRef.current++;
      if (halfBeatRef.current >= 2) {
        halfBeatRef.current = 0;
        setChordIdx(i => (i + 1) % freeChords.length);
      }
    }
  };

  const onBeat = useCallback((beat: number) => {
    setPulsed(true);
    setTimeout(() => setPulsed(false), 120);
    if (beat !== 0 && beat !== 2) return;
    if (warmupRef.current > 0) {
      warmupRef.current--;
      return;
    }
    advanceRef.current();
  }, []);

  useMetronome(bpm, isPlaying, onBeat);

  const capoOffset = noodleMode === 'song' ? localCapo : 0;
  const activeVoicing = (activeChord ? cachedVoicings[activeChord]?.[0] : null) ?? null;
  const dots = useChordHighlight(activeChord, soundingRoot, soundingMode, instrument, capoOffset, activeVoicing);

  function loadSongById(id: string) {
    setShowLibrary(false);
    setIsPlaying(false);
    loadedViaUrl.current = false;
    setActiveSongId(id);
    setLocalSemitones(0);
    setLocalCapo(0);
    setNoodleMode('song');
    setCurrentIdx(0);
    halfBeatRef.current = 0;
    setIntraChordIdx(0);
  }

  function handlePlay() {
    if (!isPlaying) {
      const parsed = parseInt(bpmInput, 10);
      if (!isNaN(parsed) && parsed > 0) setBpm(parsed);
      warmupRef.current = 2;
    }
    setIsPlaying(!isPlaying);
  }

  function handleRestart() {
    setCurrentIdx(0);
    setChordIdx(0);
    halfBeatRef.current = 0;
    setIntraChordIdx(0);
    setIsPlaying(false);
  }

  function handleFreeSubmit() {
    const lines = parseFreeLines(freeInput);
    const chords = lines.flat();
    setFreeLines(lines);
    setFreeChords(chords);
    setChordIdx(0);
    halfBeatRef.current = 0;
    if (!chords.length) return;
    const unique = [...new Set(chords)];
    Promise.all(
      unique.map(async name => {
        const parsed = parseChordName(name);
        if (!parsed) return [name, []] as const;
        const voicings = await getChordVoicings(parsed.root, parsed.quality, instrument);
        return [name, voicings] as const;
      })
    ).then(results =>
      setCachedVoicings(prev => ({ ...prev, ...Object.fromEntries(results) }))
    ).catch(() => {});
  }

  const btnBase = 'px-3 py-1 rounded-lg text-sm font-medium transition-colors border';
  const btnActive = `${btnBase} bg-indigo-600 text-white border-indigo-600`;
  const btnInactive = `${btnBase} border-gray-300 text-gray-600 hover:bg-gray-50`;

  const showBackLink = !!(activeSongId && loadedViaUrl.current && urlSongId === activeSongId);

  return (
    <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-2">

      {/* Header row */}
      <div className="flex items-center">
        {/* Left: title + mode buttons + song info + chord box (song mode) */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 shrink-0">Noodle</h1>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setIsPlaying(false); setNoodleMode('freeChords'); halfBeatRef.current = 0; setChordIdx(0); }}
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

          {noodleMode === 'song' && song && (
            <div className="flex flex-col min-w-0">
              {song.artist && (
                <span className="text-xs text-gray-400 leading-tight truncate">{song.artist}</span>
              )}
              {showBackLink ? (
                <Link
                  to={`/song/${activeSongId}`}
                  className="font-bold text-base text-gray-900 hover:text-indigo-600 leading-tight truncate"
                >
                  {song.title}
                </Link>
              ) : (
                <span className="font-bold text-base text-gray-900 leading-tight truncate">{song.title}</span>
              )}
            </div>
          )}

          {noodleMode === 'song' && activeChord && (
            <ChordInfoBox
              chordName={activeChord}
              voicing={activeVoicing}
              instrument={instrument}
              capoOffset={capoOffset}
              pulsed={pulsed}
              isPlaying={isPlaying}
            />
          )}
        </div>

        {/* Center: chord box (free chords mode) — centered in remaining space */}
        <div className="flex-1 flex items-center justify-center">
          {noodleMode === 'freeChords' && activeChord && (
            <ChordInfoBox
              chordName={activeChord}
              voicing={activeVoicing}
              instrument={instrument}
              capoOffset={0}
              pulsed={pulsed}
              isPlaying={isPlaying}
            />
          )}
        </div>

        {/* Right: play + restart */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePlay}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              isPlaying
                ? 'bg-red-50 border border-red-300 text-red-500 hover:bg-red-100'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={handleRestart}
            className="w-8 h-8 flex items-center justify-center text-xl text-gray-400 hover:text-indigo-500 transition-colors"
            aria-label="Restart"
            title="Restart"
          >
            ↺
          </button>
        </div>
      </div>

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
            className="border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:border-indigo-400 bg-white w-12 text-center"
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
          <span className="text-xs font-medium text-gray-600 px-1.5 py-0.5">{keyDisplay}</span>
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
        <div className="grid grid-cols-3 gap-4 items-start">
          {/* Left: input + submit */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400">Separate chords with |, lines with ↵</label>
            <textarea
              value={freeInput}
              onChange={e => setFreeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleFreeSubmit(); }}
              placeholder="G | Am | F | C"
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 font-mono text-sm focus:outline-none focus:border-indigo-400 resize-none"
            />
            <button
              onClick={handleFreeSubmit}
              className="self-start px-3 py-1 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Apply
            </button>
          </div>

          {/* Center: karaoke display */}
          <div>
            {freeLines.length > 0 && (
              <FreeChordsKaraoke lines={freeLines} currentLineIdx={currentFreeLineIdx} intraIdx={currentFreeIntraIdx} />
            )}
          </div>

          {/* Right: empty */}
          <div />
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
