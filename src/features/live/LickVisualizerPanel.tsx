import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import GuitarNeck, { type NeckDot } from './GuitarNeck';
import LickLibraryModal from './LickLibraryModal';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';

const STRING_COUNT = 6;
const FRET_COUNT = 12;

const NOTE_KEYS = [
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

const PLACEHOLDER_TAB = `e|---------|
B|---------|
G|---------|
D|---------|
A|---------|
E|---------|`;

const selectClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white';
const btnClass = 'px-4 py-2 text-sm rounded-lg border transition-colors';

type NoteCol = { isRest: false; notes: { string: number; fret: number }[] };
type RestCol = { isRest: true };
type TabColumn = NoteCol | RestCol;

function parseTabString(tabString: string): TabColumn[] {
  const lines = tabString.split('\n').filter(l => l.includes('|'));
  if (lines.length < 2) return [];

  const contents = lines.map(line => {
    const first = line.indexOf('|');
    const last = line.lastIndexOf('|');
    return first >= 0 && last > first ? line.slice(first + 1, last) : '';
  });

  // colKey → notes or rest marker
  const noteMap = new Map<number, { string: number; fret: number }[]>();
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
        if (!noteMap.has(colKey)) noteMap.set(colKey, []);
        noteMap.get(colKey)!.push({ string: stringIndex, fret });
      } else if (content[i] === '~') {
        // Only register as rest if no note column exists at this position
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
    .map(key => {
      if (noteMap.has(key)) return { isRest: false, notes: noteMap.get(key)! } as NoteCol;
      return { isRest: true } as RestCol;
    });
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

export default function LickVisualizerPanel() {
  const { bpm } = useMetronomeContext();

  const [rawTab, setRawTab] = useState(PLACEHOLDER_TAB);
  const [renderKey, setRenderKey] = useState('C');
  const [columns, setColumns] = useState<TabColumn[]>([]);
  const [currentCol, setCurrentCol] = useState(0);
  const [displayMode, setDisplayMode] = useState<'column' | 'all'>('column');
  const [speedMode, setSpeedMode] = useState<'fixed' | 'metronome'>('fixed');
  const [isRunning, setIsRunning] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Column cycling — independent of metronome play state; only speed is borrowed
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isRunning || columns.length === 0 || displayMode === 'all') return;
    const ms = speedMode === 'metronome' ? Math.round(60000 / bpm) : 1000;
    timerRef.current = setInterval(() => {
      setCurrentCol(c => (c + 1) % columns.length);
    }, ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, speedMode, bpm, columns.length, displayMode]);

  const analyzeTab = useCallback((tab: string) => {
    const parsed = parseTabString(tab);
    setColumns(parsed);
    setCurrentCol(0);
    setIsRunning(true);
  }, []);

  const handleVisualize = useCallback(() => {
    analyzeTab(rawTab);
  }, [rawTab, analyzeTab]);

  const handleLibrarySelect = useCallback((selectedRawTab: string) => {
    setRawTab(selectedRawTab);
    setShowLibrary(false);
    analyzeTab(selectedRawTab);
  }, [analyzeTab]);

  const dots = useMemo(() => {
    if (columns.length === 0) return blankDots();
    if (displayMode === 'all') return buildDotsForAllColumns(columns);
    if (currentCol >= columns.length) return blankDots();
    return buildDotsForColumn(columns[currentCol]);
  }, [columns, currentCol, displayMode]);

  const toggleBtnBase = 'px-3 py-1.5 text-xs rounded-md border transition-colors';
  const toggleActive = 'bg-indigo-600 text-white border-indigo-600';
  const toggleInactive = 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50';

  return (
    <div className="py-6">
      {/* Library button */}
      <div className="mb-3">
        <button
          onClick={() => setShowLibrary(true)}
          className={`${btnClass} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`}
        >
          Load from Library
        </button>
      </div>

      {/* Tab input row */}
      <div className="flex gap-3 items-start flex-wrap mb-3">
        <textarea
          value={rawTab}
          onChange={e => setRawTab(e.target.value)}
          spellCheck={false}
          className="font-mono text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none w-full max-w-lg"
          rows={6}
          placeholder={PLACEHOLDER_TAB}
        />
        <div className="flex flex-col gap-2">
          <select
            className={selectClass}
            value={renderKey}
            onChange={e => setRenderKey(e.target.value)}
          >
            {NOTE_KEYS.map(k => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <button
            onClick={handleVisualize}
            className={`${btnClass} bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700`}
          >
            Visualize
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {columns.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1 max-w-lg">
          {columns.map((col, i) => (
            <button
              key={i}
              onClick={() => setCurrentCol(i)}
              className={`min-w-[24px] h-6 px-1 text-xs rounded border transition-colors font-mono
                ${i === currentCol && displayMode === 'column'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
            >
              {col.isRest ? '~' : i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Controls row */}
      {columns.length > 0 && (
        <div className="flex gap-4 items-center flex-wrap mb-4">
          {/* Display mode toggle */}
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

          {/* Speed toggle — only when in column mode */}
          {displayMode === 'column' && (
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
          )}

          {/* Pause / Resume — only when in column mode */}
          {displayMode === 'column' && (
            <button
              onClick={() => setIsRunning(r => !r)}
              className={`${btnClass} ${isRunning
                ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
            >
              {isRunning ? 'Pause' : 'Resume'}
            </button>
          )}
        </div>
      )}

      {/* Guitar neck */}
      {columns.length > 0 && <GuitarNeck dots={dots} fretCount={FRET_COUNT} />}

      {columns.length === 0 && (
        <p className="text-sm text-gray-400 mt-4">Paste a guitar tab above and click Visualize to see it on the neck.</p>
      )}

      {showLibrary && (
        <LickLibraryModal
          onSelect={handleLibrarySelect}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
