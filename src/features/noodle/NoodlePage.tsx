import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getSong, getChordVoicings, getBeatmap, saveBeatmap, submitBeatmapUpdateRequest } from '../../core/api/client';
import type { SongDetail, SongSummary, ChordLyric, GuitarTabLine, ChordVoicing } from '../../core/api/client';
import { parseChordName } from '../songs/parseChordName';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';
import { CHROMATIC_NOTES, getStringLabels } from '../../core/music';
import { SELECT_COMPACT } from '../../core/ui';
import type { InstrumentName } from '../../core/useInstrument';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import GuitarNeck from '../theory/GuitarNeck';
import KaraokeDisplay from './KaraokeDisplay';
import SongLibraryModal from './SongLibraryModal';
import { useChordHighlight } from './useChordHighlight';
import ChordInfoBox from './ChordInfoBox';
import NumpadInput from '../../core/components/NumpadInput';

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

const BEAT_CYCLES: Record<number, number[]> = {
  3: [0, 1, 2, 3, 6, 12, 15, 4, 5, 7, 8, 9, 10, 11, 13, 14, 16],
  6: [0, 1, 2, 3, 6, 9, 12, 15, 4, 5, 7, 8, 10, 11, 13, 14, 16],
};
const BEAT_CYCLE_DEFAULT = [0, 1, 2, 4, 8, 16, 3, 6, 5, 7, 9, 10, 11, 12, 13, 14, 15];

function getBeatCycle(timeSig: number): number[] {
  return BEAT_CYCLES[timeSig] ?? BEAT_CYCLE_DEFAULT;
}

function stepBeat(val: number, dir: 1 | -1, cycle: number[]): number {
  const idx = cycle.indexOf(val);
  if (idx === -1) return dir === 1 ? cycle[0] : cycle[cycle.length - 1];
  return cycle[Math.max(0, Math.min(cycle.length - 1, idx + dir))];
}

function halfBeatsPerChord(n: number, total: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [total];
  if (n === 5 && total === 8) return [2, 2, 1, 1, 2];
  const x = Math.max(0, Math.min(n, total - n));
  return Array.from({ length: n }, (_, i) => i < x ? 2 : 1);
}

function parseFreeLines(input: string): string[][] {
  return input.split('\n')
    .map(line => line.split('|').map(s => s.trim()).filter(s => /^[A-G]/.test(s)))
    .filter(line => line.length > 0);
}

function FreeChordsKaraokeSlot({
  line, intraIdx, highlightActive, variant,
}: { line: string[] | undefined; intraIdx?: number; highlightActive?: boolean; variant: 'prev' | 'current' | 'next' }) {
  if (!line) return <div className="h-8" />;
  const isCurrent = variant === 'current';
  return (
    <div className={`font-mono transition-opacity ${isCurrent ? 'text-base' : 'text-sm opacity-35'}`}>
      <div style={{ color: '#4f46e5', whiteSpace: 'pre' }}>
        {line.map((chord, i) => (
          <span key={i}>
            {i > 0 && ' | '}
            {isCurrent && highlightActive && i === intraIdx
              ? <span className="font-bold">{chord}</span>
              : chord}
          </span>
        ))}
      </div>
    </div>
  );
}

function FreeChordsKaraoke({ lines, currentLineIdx, intraIdx, highlightActive }: {
  lines: string[][];
  currentLineIdx: number;
  intraIdx: number;
  highlightActive: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl overflow-x-auto">
      <FreeChordsKaraokeSlot line={lines[currentLineIdx - 1]} variant="prev" />
      <FreeChordsKaraokeSlot line={lines[currentLineIdx]} intraIdx={intraIdx} highlightActive={highlightActive} variant="current" />
      <FreeChordsKaraokeSlot line={lines[currentLineIdx + 1]} variant="next" />
    </div>
  );
}

function generateBeatmap(lines: ChordLyric[], timeSig: number): number[] {
  if (timeSig !== 4) {
    return lines.flatMap(l =>
      parseChordsFromLine(l.chords).map(() => timeSig)
    );
  }
  return lines.flatMap(l => {
    const tokens = parseChordsFromLine(l.chords);
    const total = totalHalfBeats(l.chords);
    const dist = halfBeatsPerChord(tokens.length, total);
    return dist.map(hb => hb * 2);
  });
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
  const rawTempoOverride = searchParams.get('tempoOverride');
  const urlTempoOverride = rawTempoOverride !== null && rawTempoOverride !== '' ? parseInt(rawTempoOverride, 10) : null;

  const [noodleMode, setNoodleMode] = useState<NoodleMode>(urlSongId ? 'song' : 'none');
  const [song, setSong] = useState<SongDetail | null>(null);
  const [activeSongId, setActiveSongId] = useState<string | null>(urlSongId);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showLibrary, setShowLibrary] = useState(false);
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');

  const [localSemitones, setLocalSemitones] = useState(urlSemitones);
  const [localCapo, setLocalCapo] = useState(urlCapo);

  const { bpm, setBpm, isPlaying, setIsPlaying, setBeatsPerBar, subscribeBeat, unsubscribeBeat } = useMetronomeContext();
  const [bpmInput, setBpmInput] = useState(String(bpm));

  const [freeInput, setFreeInput] = useState('');
  const [freeChords, setFreeChords] = useState<string[]>([]);
  const [freeLines, setFreeLines] = useState<string[][]>([]);
  const [chordIdx, setChordIdx] = useState(0);
  const [freeRoot, setFreeRoot] = useState('C');
  const [freeMode, setFreeMode] = useState('IONIAN');
  const [cachedVoicings, setCachedVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [pulsed, setPulsed] = useState(false);
  const [freeHasAdvanced, setFreeHasAdvanced] = useState(false);
  const [guitarKaraokeMode, setGuitarKaraokeMode] = useState(false);
  const [beatmap, setBeatmap] = useState<number[] | null>(null);
  const [beatmapAutoGenerated, setBeatmapAutoGenerated] = useState(false);
  const [showBeatmapEditor, setShowBeatmapEditor] = useState(false);
  const [beatmapDraft, setBeatmapDraft] = useState<number[]>([]);
  const [beatmapSubmitSuccess, setBeatmapSubmitSuccess] = useState(false);
  const [beatInChord, setBeatInChord] = useState(0);
  const [neckRefresh, setNeckRefresh] = useState(0);
  const beatmapFetchedForRef = useRef<string | null>(null);

  const freeInputRef = useRef<HTMLTextAreaElement>(null);

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
      if (s.timeSignature) setBeatsPerBar(s.timeSignature);
      if (prevSongIdForPrefill.current !== activeSongId) {
        prevSongIdForPrefill.current = activeSongId;
        setBpmInput(String(urlTempoOverride ?? s.tempo ?? 120));
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

  // Fetch (or auto-generate) the beatmap whenever the song changes
  useEffect(() => {
    if (!activeSongId || noodleMode !== 'song' || !contentLines.length) return;
    if (beatmapFetchedForRef.current === activeSongId) return;
    beatmapFetchedForRef.current = activeSongId;
    setBeatmap(null);
    getBeatmap(activeSongId)
      .then(data => { setBeatmap(data.beats); setBeatmapAutoGenerated(false); })
      .catch(() => {
        const generated = generateBeatmap(contentLines, song?.timeSignature ?? 4);
        setBeatmap(generated);
        setBeatmapAutoGenerated(true);
        if (song?.ownedByCurrentUser) saveBeatmap(activeSongId, generated).catch(() => {});
      });
  }, [activeSongId, noodleMode, contentLines]);

  const beatmapByLine = useMemo((): number[][] | null => {
    if (!beatmap) return null;
    let offset = 0;
    return contentLines.map(l => {
      const n = parseChordsFromLine(l.chords).length;
      const slice = beatmap.slice(offset, offset + n).map(b => Math.max(0, b));
      offset += n;
      return slice;
    });
  }, [beatmap, contentLines]);

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
    if (noodleMode !== 'song' || !song) return { soundingRoot: '', soundingMode: 'IONIAN' };
    const root = song.originalKey ?? 'C';
    const mode = song.mode ?? 'IONIAN';
    const idx = CHROMATIC_NOTES.indexOf(root);
    const transposedRoot = idx !== -1 ? CHROMATIC_NOTES[((idx + localSemitones + localCapo - (song.capo ?? 0)) % 12 + 12) % 12] : root;
    return { soundingRoot: transposedRoot, soundingMode: mode };
  }, [noodleMode, song, localSemitones, localCapo, freeRoot, freeMode]);
  console.log('[NoodlePage] soundingRoot:', soundingRoot, 'soundingMode:', soundingMode, 'noodleMode:', noodleMode, 'song.originalKey:', song?.originalKey ?? null, 'song.mode:', song?.mode ?? null);

  const keyDisplay = useMemo(() => {
    if (noodleMode === 'freeChords') {
      const modeLabel = MODES_LIST.find(m => m.value === freeMode)?.label ?? '';
      if (freeMode === 'IONIAN') return freeRoot;
      if (freeMode === 'AEOLIAN') return `${freeRoot}m`;
      return `${freeRoot} ${modeLabel}`;
    }
    if (noodleMode !== 'song' || !song?.originalKey) return '';
    const mode = song.mode ?? 'IONIAN';
    const modeLabel = MODES_LIST.find(m => m.value === mode)?.label ?? '';
    if (mode === 'IONIAN') return soundingRoot;
    if (mode === 'AEOLIAN') return `${soundingRoot}m`;
    return `${soundingRoot} ${modeLabel}`;
  }, [noodleMode, song, soundingRoot, freeRoot, freeMode]);

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

  const nextActiveChord = useMemo(() => {
    if (noodleMode !== 'song' || !contentLines.length) return null;
    const tokens = parseChordsFromLine(contentLines[currentIdx]?.chords ?? '');
    if (intraChordIdx + 1 < tokens.length) return tokens[intraChordIdx + 1];
    for (let i = currentIdx + 1; i < contentLines.length; i++) {
      if (!isSectionHeader(contentLines[i])) {
        const t = parseChordsFromLine(contentLines[i].chords);
        if (t.length) return t[0];
      }
    }
    return null;
  }, [noodleMode, contentLines, currentIdx, intraChordIdx]);

  const currentChordBeats = (isPlaying && beatmapByLine && noodleMode === 'song')
    ? (beatmapByLine[currentIdx]?.[intraChordIdx] ?? 0)
    : 0;

  const nextChordBeats = useMemo(() => {
    if (!isPlaying || !beatmapByLine || noodleMode !== 'song') return 0;
    const lineBeats = beatmapByLine[currentIdx];
    if (lineBeats && intraChordIdx + 1 < lineBeats.length) return lineBeats[intraChordIdx + 1];
    return beatmapByLine[currentIdx + 1]?.[0] ?? 0;
  }, [isPlaying, beatmapByLine, currentIdx, intraChordIdx, noodleMode]);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (noodleMode === 'song' && contentLines.length > 0) {
      const chords = contentLines[currentIdx]?.chords ?? '';
      const tokens = parseChordsFromLine(chords);
      const dist = beatmapByLine?.[currentIdx] ?? halfBeatsPerChord(tokens.length, totalHalfBeats(chords));
      const total = dist.reduce((a, b) => a + b, 0);

      console.log('[advance] currentIdx:', currentIdx, 'halfBeatRef:', halfBeatRef.current, 'dist:', dist, 'total:', total, 'beatmapByLine?.[currentIdx]:', beatmapByLine?.[currentIdx]);
      halfBeatRef.current++;

      if (halfBeatRef.current > total) {
        halfBeatRef.current = 1;
        setBeatInChord(1);
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
        return;
      }

      let accum = 0;
      let newChordIdx = Math.max(0, tokens.length - 1);
      for (let i = 0; i < dist.length; i++) {
        accum += dist[i];
        if (halfBeatRef.current <= accum) { newChordIdx = i; break; }
      }
      const priorBeats = dist.slice(0, newChordIdx).reduce((a, b) => a + b, 0);
      setBeatInChord(halfBeatRef.current - priorBeats);
      setIntraChordIdx(newChordIdx);
    } else if (noodleMode === 'freeChords' && freeChords.length > 0) {
      if (!freeHasAdvanced) {
        // First call after warmup: start the clock on chord 0, don't advance yet
        setFreeHasAdvanced(true);
        halfBeatRef.current = 0;
        return;
      }
      halfBeatRef.current++;
      if (halfBeatRef.current >= 4) {
        halfBeatRef.current = 0;
        setChordIdx(i => (i + 1) % freeChords.length);
      }
    }
  };

  const onBeat = useCallback((beat: number) => {
    setPulsed(true);
    setTimeout(() => setPulsed(false), 120);
    if (warmupRef.current > 0) {
      warmupRef.current--;
      return;
    }
    advanceRef.current();
  }, []);

  useEffect(() => {
    subscribeBeat(onBeat);
    return () => unsubscribeBeat(onBeat);
  }, [subscribeBeat, unsubscribeBeat, onBeat]);

  const capoOffset = noodleMode === 'song' ? localCapo : 0;
  const activeVoicing = (activeChord ? cachedVoicings[activeChord]?.[0] : null) ?? null;
  const dots = useChordHighlight(activeChord, soundingRoot, soundingMode, instrument, capoOffset, activeVoicing, neckRefresh, nextActiveChord);

  function loadSongById(summary: SongSummary) {
    setShowLibrary(false);
    setIsPlaying(false);
    loadedViaUrl.current = false;
    setSong(null);
    setActiveSongId(summary.id);
    setLocalSemitones(0);
    setLocalCapo(summary.capo ?? 0);
    setNoodleMode('song');
    setCurrentIdx(0);
    halfBeatRef.current = 0;
    setIntraChordIdx(0);
    beatmapFetchedForRef.current = null;
    setBeatmap(null);
    setShowBeatmapEditor(false);
  }

  function handlePlay() {
    if (!isPlaying) {
      const parsed = parseInt(bpmInput, 10);
      if (!isNaN(parsed)) {
        const clamped = Math.min(240, Math.max(40, parsed));
        setBpm(clamped);
        setBpmInput(String(clamped));
      }
      warmupRef.current = 4;
      halfBeatRef.current = 0;
      setFreeHasAdvanced(false);
      console.log('[handlePlay] halfBeatRef reset to 0, beatmap:', beatmap);
    }
    setIsPlaying(!isPlaying);
  }

  function handleRestart() {
    setCurrentIdx(0);
    setChordIdx(0);
    halfBeatRef.current = 0;
    setIntraChordIdx(0);
    setFreeHasAdvanced(false);
    setIsPlaying(false);
  }

  function handleFreeSubmit() {
    const lines = parseFreeLines(freeInput);
    const chords = lines.flat();
    setFreeLines(lines);
    setFreeChords(chords);
    setChordIdx(0);
    halfBeatRef.current = 0;
    setFreeHasAdvanced(false);
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
  const beatCycle = getBeatCycle(song?.timeSignature ?? 4);

  return (
    <div className={`max-w-6xl mx-auto px-6 py-4 flex flex-col gap-2 ${noodleMode === 'song' ? 'min-h-[calc(100vh-3.5rem)]' : ''}`}>

      {/* Header row */}
      <div className="flex items-center">
        {/* Left: title + mode buttons + song info + chord box (song mode) */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 shrink-0">{guitarKaraokeMode && noodleMode === 'song' ? 'Guitar Karaoke' : 'Noodle'}</h1>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setIsPlaying(false); setNoodleMode('freeChords'); halfBeatRef.current = 0; setChordIdx(0); setFreeHasAdvanced(false); }}
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
              soundingRoot={soundingRoot}
              soundingMode={soundingMode}
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
              soundingRoot={soundingRoot}
              soundingMode={soundingMode}
            />
          )}
        </div>

        {/* Right: guitar karaoke + play + restart */}
        <div className="flex items-center gap-2 shrink-0">
          {noodleMode === 'song' && (
            <button
              onClick={() => setGuitarKaraokeMode(v => !v)}
              className={`w-8 h-8 flex items-center justify-center text-xl leading-none transition-colors ${guitarKaraokeMode ? 'text-indigo-500' : 'text-gray-300 hover:text-gray-500'}`}
              aria-label="Toggle guitar karaoke"
            >
              ◎
            </button>
          )}
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

      {/* Guitar Neck */}
      {!guitarKaraokeMode && <GuitarNeck dots={dots} stringLabels={getStringLabels(instrument)} bpm={isPlaying ? bpm : undefined} />}

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">BPM</span>
          <NumpadInput
            value={bpmInput}
            onChange={val => setBpmInput(val)}
            onCommit={val => {
              const v = parseInt(val, 10);
              const clamped = isNaN(v) ? bpm : Math.min(240, Math.max(40, v));
              setBpmInput(String(clamped));
            }}
            placeholder="120"
            min={40}
            max={240}
            className="border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:border-indigo-400 bg-white w-12 text-center"
          />
        </div>

        {noodleMode === 'freeChords' ? (
          <>
            <select value={freeRoot} onChange={e => setFreeRoot(e.target.value)} className={SELECT_COMPACT}>
              {CHROMATIC_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={freeMode} onChange={e => setFreeMode(e.target.value)} className={SELECT_COMPACT}>
              {MODES_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </>
        ) : keyDisplay ? (
          <button
            onClick={() => setNeckRefresh(n => n + 1)}
            className="text-xs font-medium text-indigo-600 px-1.5 py-0.5 hover:bg-indigo-50 rounded transition-colors"
            title="Reload scale for this key"
          >
            {keyDisplay}
          </button>
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
              onClick={() => { setLocalSemitones(s => s - 1); setNeckRefresh(n => n + 1); }}
              className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-indigo-500 border border-gray-200 rounded"
            >−</button>
            <span className="text-sm text-gray-700 w-6 text-center tabular-nums">
              {localSemitones > 0 ? `+${localSemitones}` : localSemitones}
            </span>
            <button
              onClick={() => { setLocalSemitones(s => s + 1); setNeckRefresh(n => n + 1); }}
              className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-indigo-500 border border-gray-200 rounded"
            >+</button>
          </div>
        )}

        {noodleMode === 'song' && beatmap && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setBeatmapDraft([...beatmap]); setShowBeatmapEditor(v => !v); }}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${showBeatmapEditor ? 'border-indigo-400 text-indigo-600 bg-indigo-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              Beat Map
            </button>
            {beatmapAutoGenerated && (
              <span className="text-xs text-amber-500" title="Auto-generated — may be inaccurate">⚠ auto</span>
            )}
          </div>
        )}
      </div>

      {/* Beat Map editor modal */}
      {noodleMode === 'song' && showBeatmapEditor && beatmapDraft.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowBeatmapEditor(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <span className="font-semibold text-sm text-gray-800">Beat Map</span>
              <button onClick={() => setShowBeatmapEditor(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-3">
              {(() => {
                let offset = 0;
                return contentLines.map((line, li) => {
                  const tokens = parseChordsFromLine(line.chords);
                  if (!tokens.length) return null;
                  const start = offset;
                  offset += tokens.length;
                  return (
                    <div key={li} className="flex flex-col gap-1">
                      {/* Chord steppers */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {tokens.map((chord, ci) => {
                          const val = beatmapDraft[start + ci] ?? 4;
                          const set = (v: number) => setBeatmapDraft(d => { const n = [...d]; n[start + ci] = Math.max(0, Math.min(16, v)); return n; });
                          return (
                            <div key={ci} className="flex flex-col items-center gap-1">
                              <span className="font-mono text-xs text-indigo-600">{chord}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => set(stepBeat(val, -1, beatCycle))} className="w-7 h-7 flex items-center justify-center text-sm border border-gray-200 rounded text-gray-500 hover:bg-gray-100 active:bg-gray-200">−</button>
                                <span className="w-6 text-center text-xs tabular-nums">{val}</span>
                                <button onClick={() => set(stepBeat(val, 1, beatCycle))} className="w-7 h-7 flex items-center justify-center text-sm border border-gray-200 rounded text-gray-500 hover:bg-gray-100 active:bg-gray-200">+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Lyric reference */}
                      {line.lyrics.trim() && (
                        <span className="font-mono text-xs text-gray-400 pl-0.5">{line.lyrics.trimEnd()}</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 px-5 py-3 border-t border-gray-100 shrink-0">
              {beatmapSubmitSuccess && (
                <p className="text-xs text-green-600">Beatmap update submitted for review.</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!activeSongId) return;
                    const beats = beatmapDraft.map(v => v ?? 4);
                    if (song?.ownedByCurrentUser) {
                      saveBeatmap(activeSongId, beats)
                        .then(() => {
                          setBeatmap(beatmapDraft);
                          setBeatmapAutoGenerated(false);
                          setShowBeatmapEditor(false);
                        })
                        .catch(() => {});
                    } else {
                      submitBeatmapUpdateRequest(activeSongId, beats)
                        .then(() => {
                          setBeatmapSubmitSuccess(true);
                        })
                        .catch(() => {});
                    }
                  }}
                  className="px-4 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
                >
                  {song?.ownedByCurrentUser ? 'Save' : 'Submit for review'}
                </button>
                <button
                  onClick={() => { setShowBeatmapEditor(false); setBeatmapSubmitSuccess(false); }}
                  className="px-4 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free chords section */}
      {noodleMode === 'freeChords' && (
        <div className="grid grid-cols-3 gap-4 items-start">
          {/* Left: input + submit */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400">Separate chords with |, lines with ↵</label>
            <textarea
              ref={freeInputRef}
              value={freeInput}
              onChange={e => setFreeInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { handleFreeSubmit(); return; }
                if (e.key === ' ') {
                  e.preventDefault();
                  const el = freeInputRef.current;
                  if (!el) return;
                  const start = el.selectionStart;
                  const end = el.selectionEnd;
                  const insert = ' | ';
                  setFreeInput(prev => prev.slice(0, start) + insert + prev.slice(end));
                  requestAnimationFrame(() => el.setSelectionRange(start + insert.length, start + insert.length));
                }
              }}
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
              <FreeChordsKaraoke lines={freeLines} currentLineIdx={currentFreeLineIdx} intraIdx={currentFreeIntraIdx} highlightActive={freeHasAdvanced} />
            )}
          </div>

          {/* Right: empty */}
          <div />
        </div>
      )}

      {/* Karaoke display */}
      {noodleMode === 'song' && contentLines.length > 0 && (
        <KaraokeDisplay
          lines={contentLines}
          currentIdx={currentIdx}
          intraChordIdx={intraChordIdx}
          guitarKaraoke={guitarKaraokeMode}
          beatInChord={beatInChord}
          currentChordBeats={currentChordBeats}
          nextChordBeats={nextChordBeats}
          pulsed={pulsed}
        />
      )}

      {showLibrary && (
        <SongLibraryModal onSelect={loadSongById} onClose={() => setShowLibrary(false)} />
      )}
    </div>
  );
}
