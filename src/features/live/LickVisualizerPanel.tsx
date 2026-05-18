import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from './GuitarNeck';
import LickLibraryModal from './LickLibraryModal';
import LickInputModal from './LickInputModal';
import { uploadLick, getScalePositions } from '../../core/api/client';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';

const STRING_COUNT = 6;
const FRET_COUNT = 12;
const SPREAD_SLOT = 4;
const BUILD_LABELS = ['e|', 'B|', 'G|', 'D|', 'A|', 'E|'];

function formatNote(enumName: string): string {
  if (enumName === 'B_FLAT') return 'Bb';
  return enumName.replace('_SHARP', '#');
}

const STANDARD_OPEN_NOTES = [4, 9, 2, 7, 11, 4]; // E A D G B e in semitones from C
const NOTE_NAMES_BUILD = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
function computeNoteName(si: number, fret: number): string {
  return NOTE_NAMES_BUILD[((STANDARD_OPEN_NOTES[si] ?? 0) + fret) % 12];
}

const ROOT_NOTES = [
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
const MODES = ['IONIAN', 'DORIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN'];
const MODE_LABELS: Record<string, string> = {
  IONIAN: 'Major', DORIAN: 'Dorian', PHRYGIAN: 'Phrygian', LYDIAN: 'Lydian',
  MIXOLYDIAN: 'Mixolydian', AEOLIAN: 'Minor', LOCRIAN: 'Locrian',
};

const btnClass = 'px-4 py-2 text-sm rounded-lg border transition-colors';

type NoteCol = { isRest: false; notes: { string: number; fret: number; technique?: string }[] };
type RestCol = { isRest: true };
type TabColumn = NoteCol | RestCol;
type LickSource = 'none' | 'new' | 'library' | 'modified';

function parseTabString(tabString: string): TabColumn[] {
  const lines = tabString.split('\n').filter(l => l.includes('|'));
  if (lines.length < 2) return [];

  const contents = lines.map(line => {
    const first = line.indexOf('|');
    const last = line.lastIndexOf('|');
    return first >= 0 && last > first ? line.slice(first + 1, last) : '';
  });

  const noteMap = new Map<number, { string: number; fret: number; technique?: string }[]>();
  const restSet = new Set<number>();

  contents.forEach((content, displayRow) => {
    const stringIndex = (lines.length - 1) - displayRow;
    let i = 0;
    while (i < content.length) {
      if (/\d/.test(content[i])) {
        const colKey = i;
        let fretStr = content[i];
        if (i + 1 < content.length && /\d/.test(content[i + 1])) {
          fretStr += content[i + 1];
          i += 2;
        } else {
          i++;
        }
        const fret = parseInt(fretStr, 10);
        let technique: string | undefined;
        if (i < content.length && /[hp/\\]/.test(content[i])) {
          technique = content[i];
          // don't advance i; the else branch skips it next iteration
        }
        if (!noteMap.has(colKey)) noteMap.set(colKey, []);
        noteMap.get(colKey)!.push({ string: stringIndex, fret, ...(technique && { technique }) });
      } else if (content[i] === '~') {
        if (!noteMap.has(i)) restSet.add(i);
        i++;
      } else {
        i++;
      }
    }
  });

  const allKeys = new Set([...noteMap.keys(), ...restSet]);
  return Array.from(allKeys)
    .sort((a, b) => a - b)
    .map(key =>
      noteMap.has(key)
        ? { isRest: false, notes: noteMap.get(key)! } as NoteCol
        : { isRest: true } as RestCol
    );
}

function blankDots(): NeckDot[][] {
  return Array.from({ length: STRING_COUNT }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

function buildDotsForColumn(col: TabColumn): NeckDot[][] {
  if (col.isRest) return blankDots();
  const dots = blankDots();
  for (const { string: s, fret: f } of col.notes) {
    if (s >= 0 && s < STRING_COUNT && f >= 0 && f <= FRET_COUNT) {
      dots[s][f] = { degree: 1, active: true };
    }
  }
  return dots;
}

function buildDotsForAllColumns(cols: TabColumn[]): NeckDot[][] {
  const dots = blankDots();
  for (const col of cols) {
    if (col.isRest) continue;
    for (const { string: s, fret: f } of col.notes) {
      if (s >= 0 && s < STRING_COUNT && f >= 0 && f <= FRET_COUNT) {
        dots[s][f] = { degree: 1, active: true };
      }
    }
  }
  return dots;
}

// Compact format: |-col0-col1-...-colN-|
// Column width = max fret digit count across all notes in that column.
// Non-note strings get dashes to fill the column width.
function buildNormalizedTab(labels: string[], columns: TabColumn[]): string {
  const numStrings = labels.length;
  const colWidths = columns.map(col => {
    if (col.isRest) return 1;
    return col.notes.reduce((m, n) => Math.max(m, String(n.fret).length), 1);
  });

  return Array.from({ length: numStrings }, (_, displayRow) => {
    const stringIndex = (numStrings - 1) - displayRow;
    let line = labels[displayRow] + '-';
    columns.forEach((col, _i) => {
      if (col.isRest) {
        line += '~-';
      } else {
        const colWidth = colWidths[_i];
        const note = col.notes.find(n => n.string === stringIndex);
        const fretStr = note ? String(note.fret) : '';
        line += fretStr + '-'.repeat(colWidth - fretStr.length);
        line += note?.technique ?? '-';
      }
    });
    line += '|';
    return line;
  }).join('\n');
}

function normalizeTab(rawTab: string): string {
  const columns = parseTabString(rawTab);
  if (columns.length === 0) return rawTab;
  const lines = rawTab.split('\n').filter(l => l.includes('|'));
  const labels = lines.map(l => l.slice(0, l.indexOf('|') + 1));
  return buildNormalizedTab(labels, columns);
}

// Spread tab: each column gets SPREAD_SLOT chars, for visual alignment with the range slider.
function buildSpreadTab(rawTab: string, columns: TabColumn[]): string {
  const lines = rawTab.split('\n').filter(l => l.includes('|'));
  if (lines.length === 0) return '';
  const numStrings = lines.length;
  const labels = lines.map(l => l.slice(0, l.indexOf('|') + 1));

  return Array.from({ length: numStrings }, (_, displayRow) => {
    const stringIndex = (numStrings - 1) - displayRow;
    let line = labels[displayRow] + '-';
    for (const col of columns) {
      if (col.isRest) {
        line += '~' + '-'.repeat(SPREAD_SLOT - 1);
      } else {
        const note = col.notes.find(n => n.string === stringIndex);
        const fretStr = note ? String(note.fret) : '';
        const technique = note?.technique;
        const padLen = SPREAD_SLOT - fretStr.length;
        if (technique && padLen >= 2) {
          line += fretStr + '-' + technique + '-'.repeat(padLen - 2);
        } else {
          line += fretStr + '-'.repeat(padLen);
        }
      }
    }
    line += '|';
    return line;
  }).join('\n');
}

export default function LickVisualizerPanel() {
  const { bpm } = useMetronomeContext();
  const [searchParams] = useSearchParams();

  // Visualize mode
  const [rawTab, setRawTab] = useState('');
  const [columns, setColumns] = useState<TabColumn[]>([]);
  const [currentCol, setCurrentCol] = useState(0);
  const [displayMode, setDisplayMode] = useState<'column' | 'all'>('all');
  const [speedMode, setSpeedMode] = useState<'fixed' | 'metronome'>('fixed');
  const [isRunning, setIsRunning] = useState(false);
  const [lickSource, setLickSource] = useState<LickSource>('none');
  const [savedInputKey, setSavedInputKey] = useState<string | undefined>(undefined);
  const [savedMode, setSavedMode] = useState<string | undefined>(undefined);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Panel mode — reads ?mode=build from URL on mount
  const [panelMode, setPanelMode] = useState<'visualize' | 'build'>(() =>
    searchParams.get('mode') === 'build' ? 'build' : 'visualize'
  );

  // Build mode
  const [builtCols, setBuiltCols] = useState<{ string: number; fret: number }[][]>([]);
  const [builtTabText, setBuiltTabText] = useState('');
  const [buildRoot, setBuildRoot] = useState('');
  const [buildMode, setBuildMode] = useState('IONIAN');
  const [scaleDots, setScaleDots] = useState<NeckDot[][]>(blankDots);
  const [buildCurrentNote, setBuildCurrentNote] = useState<{ string: number; fret: number; degree: number } | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [chordDetect, setChordDetect] = useState(false);
  const [buildSaveLoading, setBuildSaveLoading] = useState(false);
  const [buildSaveError, setBuildSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals
  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewLick, setShowNewLick] = useState(false);
  const [showEditLick, setShowEditLick] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingNotesRef = useRef<{ string: number; fret: number }[]>([]);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isRunning || columns.length === 0 || displayMode === 'all') return;
    const ms = speedMode === 'metronome' ? Math.round(60000 / bpm) : 1000;
    timerRef.current = setInterval(() => {
      setCurrentCol(c => (c + 1) % columns.length);
    }, ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, speedMode, bpm, columns.length, displayMode]);

  // Scale overlay — fetch when root/mode changes or when switching to build mode
  useEffect(() => {
    if (panelMode !== 'build') return;
    if (!buildRoot) { setScaleDots(blankDots()); return; }
    getScalePositions(buildRoot, buildMode).then(res => {
      const next = blankDots();
      for (const pos of res.positions) {
        if (pos.string >= 0 && pos.string < STRING_COUNT && pos.fret >= 0 && pos.fret <= FRET_COUNT) {
          next[pos.string][pos.fret] = {
            degree: pos.degree as 1 | 2 | 3 | 4 | 5 | 6 | 7,
            active: false,
            note: formatNote(pos.note),
          };
        }
      }
      setScaleDots(next);
    }).catch(() => {});
  }, [buildRoot, buildMode, panelMode]);

  const commitPendingColumn = useCallback(() => {
    if (pendingNotesRef.current.length === 0) return;
    const notes = pendingNotesRef.current.slice();
    pendingNotesRef.current = [];
    setBuiltCols(prev => {
      const newCols = [...prev, notes];
      const tabCols: TabColumn[] = newCols.map(col => ({ isRest: false, notes: col }));
      setBuiltTabText(buildNormalizedTab(BUILD_LABELS, tabCols));
      return newCols;
    });
  }, []);

  // Flush pending chord on Stop
  useEffect(() => {
    if (!isBuilding) {
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
      commitPendingColumn();
      setBuildCurrentNote(null);
    } else {
      if (buildHighlightTimerRef.current) {
        clearTimeout(buildHighlightTimerRef.current);
        buildHighlightTimerRef.current = null;
      }
    }
  }, [isBuilding, commitPendingColumn]);

  const analyzeTab = useCallback((tab: string) => {
    const parsed = parseTabString(tab);
    setColumns(parsed);
    setCurrentCol(0);
    setDisplayMode('all');
    setIsRunning(false);
  }, []);

  const handleLibrarySelect = useCallback((selectedRawTab: string) => {
    const normalized = normalizeTab(selectedRawTab);
    setRawTab(normalized);
    setShowLibrary(false);
    analyzeTab(normalized);
    setLickSource('library');
    setSaveError(null);
  }, [analyzeTab]);

  const handleNeckClick = useCallback((si: number, fret: number) => {
    if (panelMode !== 'build') return;
    const degree = scaleDots[si]?.[fret]?.degree ?? 1;
    setBuildCurrentNote({ string: si, fret, degree });
    if (!isBuilding) {
      if (buildHighlightTimerRef.current) clearTimeout(buildHighlightTimerRef.current);
      buildHighlightTimerRef.current = setTimeout(() => setBuildCurrentNote(null), 3000);
      return;
    }

    if (!chordDetect) {
      setBuiltCols(prev => {
        const newCols = [...prev, [{ string: si, fret }]];
        const tabCols: TabColumn[] = newCols.map(col => ({ isRest: false, notes: col }));
        setBuiltTabText(buildNormalizedTab(BUILD_LABELS, tabCols));
        return newCols;
      });
      return;
    }

    // Chord detect ON: same string = commit current column first
    if (pendingNotesRef.current.some(n => n.string === si)) {
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
      commitPendingColumn();
    }
    pendingNotesRef.current = [...pendingNotesRef.current, { string: si, fret }];
    if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    chordTimerRef.current = setTimeout(() => commitPendingColumn(), 1500);
  }, [panelMode, isBuilding, chordDetect, scaleDots, commitPendingColumn]);

  const handleSaveLick = useCallback(async () => {
    setSaveLoading(true);
    setSaveError(null);
    try {
      await uploadLick({ rawTab, inputKey: savedInputKey, mode: savedMode });
      setLickSource('library');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveLoading(false);
    }
  }, [rawTab, savedInputKey, savedMode]);

  const handleSaveBuiltLick = useCallback(async () => {
    if (!builtTabText.trim()) return;
    setBuildSaveLoading(true);
    setBuildSaveError(null);
    try {
      const normalized = normalizeTab(builtTabText);
      await uploadLick({ rawTab: normalized, inputKey: savedInputKey, mode: savedMode });
      setRawTab(normalized);
      analyzeTab(normalized);
      setLickSource('library');
      setPanelMode('visualize');
      setBuiltCols([]);
      setBuiltTabText('');
    } catch (e) {
      setBuildSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBuildSaveLoading(false);
    }
  }, [builtTabText, analyzeTab, savedInputKey, savedMode]);

  const dots = useMemo(() => {
    if (columns.length === 0) return blankDots();
    if (displayMode === 'all') return buildDotsForAllColumns(columns);
    if (currentCol >= columns.length) return blankDots();
    return buildDotsForColumn(columns[currentCol]);
  }, [columns, currentCol, displayMode]);

  // Candidate notes near the current build note
  const buildCandidates = useMemo(() => {
    const empty = { best: new Map<string, { candidateColor: string; ownNote: boolean }>(), second: new Map<string, { candidateColor: string }>(), third: new Map<string, { candidateColor: string }>() };
    if (!buildCurrentNote) return empty;
    if (scaleDots[buildCurrentNote.string]?.[buildCurrentNote.fret]?.degree === null) return empty;
    const byDegree = new Map<number, Array<{ string: number; fret: number; dist: number }>>();
    scaleDots.forEach((row, s) => {
      row.forEach((dot, f) => {
        if (!dot.degree) return;
        if (s === buildCurrentNote.string && f === buildCurrentNote.fret) return;
        const dist = Math.hypot(f - buildCurrentNote.fret, s - buildCurrentNote.string);
        if (dist > 3.9) return;
        const arr = byDegree.get(dot.degree) ?? [];
        arr.push({ string: s, fret: f, dist });
        byDegree.set(dot.degree, arr);
      });
    });
    byDegree.forEach(arr => arr.sort((a, b) => a.dist - b.dist));
    const best = new Map<string, { candidateColor: string; ownNote: boolean }>();
    const second = new Map<string, { candidateColor: string }>();
    const third = new Map<string, { candidateColor: string }>();
    byDegree.forEach((arr, degree) => {
      const color = DEGREE_COLORS[degree];
      const isOwn = degree === buildCurrentNote.degree;
      if (arr[0]) best.set(`${arr[0].string},${arr[0].fret}`, { candidateColor: color, ownNote: isOwn });
      if (arr[1]) second.set(`${arr[1].string},${arr[1].fret}`, { candidateColor: color });
      if (arr[2]) third.set(`${arr[2].string},${arr[2].fret}`, { candidateColor: color });
    });
    return { best, second, third };
  }, [scaleDots, buildCurrentNote]);

  // Build neck dots: scale overlay + built notes + pending chord notes + currentNote + candidates
  const buildDots = useMemo(() => {
    const d = scaleDots.map(row => row.map(dot => ({ ...dot })));
    for (const col of builtCols) {
      for (const { string: s, fret: f } of col) {
        if (s >= 0 && s < STRING_COUNT && f >= 0 && f <= FRET_COUNT) {
          if (d[s][f].degree === null) d[s][f] = { ...d[s][f], degree: 1, active: false };
        }
      }
    }
    for (const { string: s, fret: f } of pendingNotesRef.current) {
      if (s >= 0 && s < STRING_COUNT && f >= 0 && f <= FRET_COUNT) {
        const deg = d[s][f].degree ?? 1;
        d[s][f] = { ...d[s][f], degree: deg, active: true };
      }
    }
    if (buildCurrentNote) {
      const { string: s, fret: f } = buildCurrentNote;
      if (s >= 0 && s < STRING_COUNT && f >= 0 && f <= FRET_COUNT) {
        if (scaleDots[s][f].degree === null) {
          // off-scale: override any degree builtCols set, keep grey with note name
          d[s][f] = { degree: null, active: true, note: computeNoteName(s, f) };
        } else {
          d[s][f] = { ...d[s][f], active: true };
        }
      }
      buildCandidates.best.forEach((info, key) => {
        const [ks, kf] = key.split(',').map(Number);
        if (d[ks][kf].degree) d[ks][kf] = { ...d[ks][kf], candidate: true, candidateColor: info.candidateColor };
      });
      buildCandidates.second.forEach((info, key) => {
        const [ks, kf] = key.split(',').map(Number);
        if (d[ks][kf].degree && !d[ks][kf].candidate) d[ks][kf] = { ...d[ks][kf], secondCandidate: true, candidateColor: info.candidateColor };
      });
      buildCandidates.third.forEach((info, key) => {
        const [ks, kf] = key.split(',').map(Number);
        if (d[ks][kf].degree && !d[ks][kf].candidate && !d[ks][kf].secondCandidate) d[ks][kf] = { ...d[ks][kf], thirdCandidate: true, candidateColor: info.candidateColor };
      });
    }
    return d;
  }, [scaleDots, builtCols, buildCurrentNote, buildCandidates]);

  const canSave = lickSource === 'new' || lickSource === 'modified';

  const toggleBtnBase = 'px-3 py-1.5 text-xs rounded-md border transition-colors';
  const toggleActive = 'bg-indigo-600 text-white border-indigo-600';
  const toggleInactive = 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50';

  return (
    <div className="py-3">
      {/* Panel mode toggle + action buttons */}
      <div className="flex gap-3 items-center mb-2 flex-wrap">
        <div className="flex rounded-md overflow-hidden border border-gray-300">
          <button
            className={`${toggleBtnBase} rounded-none border-0 border-r border-gray-300 ${panelMode === 'visualize' ? toggleActive : toggleInactive}`}
            onClick={() => setPanelMode('visualize')}
          >
            Visualize
          </button>
          <button
            className={`${toggleBtnBase} rounded-none border-0 ${panelMode === 'build' ? toggleActive : toggleInactive}`}
            onClick={() => setPanelMode('build')}
          >
            Build
          </button>
        </div>

        {panelMode === 'visualize' && (
          <>
            <button
              onClick={() => setShowLibrary(true)}
              className={`${btnClass} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`}
            >
              Load from Library
            </button>
            <button
              onClick={() => setShowNewLick(true)}
              className={`${btnClass} bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700`}
            >
              New Lick
            </button>
          </>
        )}
      </div>

      {/* Guitar neck — always visible */}
      <GuitarNeck
        dots={panelMode === 'build' ? buildDots : dots}
        fretCount={FRET_COUNT}
        onDotClick={panelMode === 'build' ? handleNeckClick : undefined}
      />

      {/* Visualize mode content */}
      {panelMode === 'visualize' && columns.length > 0 && (
        <div className="mt-4">
          {/* Tab display: compact rawTab in all mode, spread tab aligned to slider in column mode */}
          {displayMode === 'all' ? (
            <pre className="font-mono text-xs text-gray-600 leading-tight mb-3 whitespace-pre overflow-x-auto">
              {rawTab}
            </pre>
          ) : (
            <div className="font-mono text-xs mb-1" style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto' }}>
              <pre className="text-gray-600 leading-tight m-0 p-0 whitespace-pre">
                {buildSpreadTab(rawTab, columns)}
              </pre>
              <div className="relative" style={{ paddingLeft: '3ch', paddingRight: '5ch' }}>
                <input
                  type="range"
                  min={0}
                  max={columns.length - 1}
                  step={1}
                  value={currentCol}
                  onChange={e => setCurrentCol(+e.target.value)}
                  className="w-full accent-indigo-600"
                />
                {columns.length > 1 && columns.map((col, i) =>
                  col.isRest ? (
                    <span
                      key={i}
                      className="absolute top-5 text-[10px] text-gray-400 font-mono -translate-x-1/2 pointer-events-none"
                      style={{ left: `${(i / (columns.length - 1)) * 100}%` }}
                    >
                      ~
                    </span>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Playback controls + Edit/Save */}
          <div className="flex gap-4 items-center flex-wrap mb-3 mt-4">
            <div className="flex rounded-md overflow-hidden border border-gray-300">
              <button
                className={`${toggleBtnBase} rounded-none border-0 border-r border-gray-300 ${displayMode === 'column' ? toggleActive : toggleInactive}`}
                onClick={() => setDisplayMode('column')}
              >
                Column
              </button>
              <button
                className={`${toggleBtnBase} rounded-none border-0 ${displayMode === 'all' ? toggleActive : toggleInactive}`}
                onClick={() => setDisplayMode('all')}
              >
                All
              </button>
            </div>

            {displayMode === 'column' && (
              <>
                <div className="flex rounded-md overflow-hidden border border-gray-300">
                  <button
                    className={`${toggleBtnBase} rounded-none border-0 border-r border-gray-300 ${speedMode === 'fixed' ? toggleActive : toggleInactive}`}
                    onClick={() => setSpeedMode('fixed')}
                  >
                    1/sec
                  </button>
                  <button
                    className={`${toggleBtnBase} rounded-none border-0 ${speedMode === 'metronome' ? toggleActive : toggleInactive}`}
                    onClick={() => setSpeedMode('metronome')}
                  >
                    Metronome
                  </button>
                </div>
                <button
                  onClick={() => setIsRunning(r => !r)}
                  className={`${btnClass} ${isRunning
                    ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
                >
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              {lickSource === 'library' && (
                <button
                  onClick={() => setShowEditLick(true)}
                  className={`${btnClass} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`}
                >
                  Edit Lick
                </button>
              )}
              <button
                onClick={handleSaveLick}
                disabled={!canSave || saveLoading}
                className={`${btnClass} ${canSave
                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'} disabled:opacity-60`}
              >
                {saveLoading ? 'Saving…' : 'Save Lick'}
              </button>
            </div>
          </div>
          {saveError && <p className="text-sm text-red-500 mt-1">{saveError}</p>}
        </div>
      )}

      {panelMode === 'visualize' && lickSource === 'none' && (
        <p className="text-sm text-gray-400 mt-4">Load a lick from the library or create a new one to get started.</p>
      )}

      {/* Build mode content */}
      {panelMode === 'build' && (
        <div className="mt-3">
          <div className="flex gap-2 items-center mb-3 flex-wrap">
            <select
              value={buildRoot}
              onChange={e => setBuildRoot(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:border-indigo-400"
            >
              <option value="">— None —</option>
              {ROOT_NOTES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              value={buildMode}
              onChange={e => setBuildMode(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:border-indigo-400"
            >
              {MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
            </select>
            <button
              onClick={() => setIsBuilding(b => !b)}
              className={`${btnClass} ${isBuilding
                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
            >
              {isBuilding ? 'Stop' : 'Start'}
            </button>
            <button
              onClick={() => setChordDetect(c => !c)}
              title="Chord detection: accumulate notes within 1.5s into one column"
              className={`${btnClass} ${chordDetect
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              ♭³
            </button>
          </div>
          <textarea
            value={builtTabText}
            onChange={e => setBuiltTabText(e.target.value)}
            spellCheck={false}
            className="font-mono text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none w-full max-w-lg"
            rows={6}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSaveBuiltLick}
              disabled={!builtTabText.trim() || buildSaveLoading}
              className={`${btnClass} bg-green-600 text-white border-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {buildSaveLoading ? 'Saving…' : 'Save Lick'}
            </button>
            <button
              onClick={() => { setBuiltCols([]); setBuiltTabText(''); setBuildCurrentNote(null); }}
              className={`${btnClass} bg-white text-gray-600 border-gray-300 hover:bg-gray-50`}
            >
              Clear
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(builtTabText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              disabled={!builtTabText.trim()}
              title="Copy tab to clipboard"
              className={`${btnClass} ${copied ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              )}
            </button>
          </div>
          {buildSaveError && <p className="text-sm text-red-500 mt-1">{buildSaveError}</p>}
        </div>
      )}

      {/* Modals */}
      {showLibrary && (
        <LickLibraryModal
          onSelect={handleLibrarySelect}
          onClose={() => setShowLibrary(false)}
        />
      )}
      {showNewLick && (
        <LickInputModal
          title="New Lick"
          onVisualize={(tab, inputKey, mode) => {
            const normalized = normalizeTab(tab);
            setRawTab(normalized);
            setSavedInputKey(inputKey);
            setSavedMode(mode);
            setShowNewLick(false);
            analyzeTab(normalized);
            setLickSource('new');
            setSaveError(null);
          }}
          onClose={() => setShowNewLick(false)}
        />
      )}
      {showEditLick && (
        <LickInputModal
          title="Edit Lick"
          initialTab={rawTab}
          onVisualize={(tab, inputKey, mode) => {
            const normalized = normalizeTab(tab);
            setRawTab(normalized);
            setSavedInputKey(inputKey);
            setSavedMode(mode);
            setShowEditLick(false);
            analyzeTab(normalized);
            setLickSource('modified');
            setSaveError(null);
          }}
          onClose={() => setShowEditLick(false)}
        />
      )}
    </div>
  );
}
