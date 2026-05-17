import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import GuitarNeck, { type NeckDot } from './GuitarNeck';
import LickLibraryModal from './LickLibraryModal';
import LickInputModal from './LickInputModal';
import { uploadLick } from '../../core/api/client';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';

const STRING_COUNT = 6;
const FRET_COUNT = 12;
const SPREAD_SLOT = 4;
const BUILD_LABELS = ['e|', 'B|', 'G|', 'D|', 'A|', 'E|'];

const btnClass = 'px-4 py-2 text-sm rounded-lg border transition-colors';

type NoteCol = { isRest: false; notes: { string: number; fret: number }[] };
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
        line += '~';
      } else {
        const colWidth = colWidths[_i];
        const note = col.notes.find(n => n.string === stringIndex);
        const fretStr = note ? String(note.fret) : '';
        line += fretStr + '-'.repeat(colWidth - fretStr.length);
      }
      line += '-';
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
    let line = labels[displayRow];
    for (const col of columns) {
      if (col.isRest) {
        line += '~' + '-'.repeat(SPREAD_SLOT - 1);
      } else {
        const note = col.notes.find(n => n.string === stringIndex);
        const fretStr = note ? String(note.fret) : '';
        line += fretStr + '-'.repeat(SPREAD_SLOT - fretStr.length);
      }
    }
    line += '|';
    return line;
  }).join('\n');
}

export default function LickVisualizerPanel() {
  const { bpm } = useMetronomeContext();

  // Visualize mode
  const [rawTab, setRawTab] = useState('');
  const [columns, setColumns] = useState<TabColumn[]>([]);
  const [currentCol, setCurrentCol] = useState(0);
  const [displayMode, setDisplayMode] = useState<'column' | 'all'>('all');
  const [speedMode, setSpeedMode] = useState<'fixed' | 'metronome'>('fixed');
  const [isRunning, setIsRunning] = useState(false);
  const [lickSource, setLickSource] = useState<LickSource>('none');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Build mode
  const [panelMode, setPanelMode] = useState<'visualize' | 'build'>('visualize');
  const [builtCols, setBuiltCols] = useState<{ string: number; fret: number }[][]>([]);
  const [builtTabText, setBuiltTabText] = useState('');
  const [buildSaveLoading, setBuildSaveLoading] = useState(false);
  const [buildSaveError, setBuildSaveError] = useState<string | null>(null);

  // Modals
  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewLick, setShowNewLick] = useState(false);
  const [showEditLick, setShowEditLick] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleNeckClick = useCallback((stringIndex: number, fret: number) => {
    if (panelMode !== 'build') return;
    setBuiltCols(prev => {
      const newCols = [...prev, [{ string: stringIndex, fret }]];
      const tabCols: TabColumn[] = newCols.map(col => ({ isRest: false, notes: col }));
      setBuiltTabText(buildNormalizedTab(BUILD_LABELS, tabCols));
      return newCols;
    });
  }, [panelMode]);

  const handleSaveLick = useCallback(async () => {
    setSaveLoading(true);
    setSaveError(null);
    try {
      await uploadLick({ rawTab });
      setLickSource('library');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveLoading(false);
    }
  }, [rawTab]);

  const handleSaveBuiltLick = useCallback(async () => {
    if (!builtTabText.trim()) return;
    setBuildSaveLoading(true);
    setBuildSaveError(null);
    try {
      const normalized = normalizeTab(builtTabText);
      await uploadLick({ rawTab: normalized });
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
  }, [builtTabText, analyzeTab]);

  const dots = useMemo(() => {
    if (columns.length === 0) return blankDots();
    if (displayMode === 'all') return buildDotsForAllColumns(columns);
    if (currentCol >= columns.length) return blankDots();
    return buildDotsForColumn(columns[currentCol]);
  }, [columns, currentCol, displayMode]);

  const buildDots = useMemo(() => {
    const d = blankDots();
    for (const col of builtCols) {
      for (const { string: s, fret: f } of col) {
        if (s >= 0 && s < STRING_COUNT && f >= 0 && f <= FRET_COUNT) {
          d[s][f] = { degree: 1, active: true };
        }
      }
    }
    return d;
  }, [builtCols]);

  const canSave = lickSource === 'new' || lickSource === 'modified';

  const toggleBtnBase = 'px-3 py-1.5 text-xs rounded-md border transition-colors';
  const toggleActive = 'bg-indigo-600 text-white border-indigo-600';
  const toggleInactive = 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50';

  return (
    <div className="py-6">
      {/* Panel mode toggle + action buttons */}
      <div className="flex gap-3 items-center mb-4 flex-wrap">
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
            {lickSource === 'library' && (
              <button
                onClick={() => setShowEditLick(true)}
                className={`${btnClass} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`}
              >
                Edit Lick
              </button>
            )}
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
            <div style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto' }} className="mb-1">
              <pre className="font-mono text-xs text-gray-600 leading-tight m-0 p-0 whitespace-pre">
                {buildSpreadTab(rawTab, columns)}
              </pre>
              <div className="relative" style={{ paddingLeft: '2ch', paddingRight: '1ch' }}>
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

          {/* Playback controls */}
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
          </div>

          {/* Save Lick */}
          <div className="flex items-center gap-3">
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
          {saveError && <p className="text-sm text-red-500 mt-1">{saveError}</p>}
        </div>
      )}

      {panelMode === 'visualize' && lickSource === 'none' && (
        <p className="text-sm text-gray-400 mt-4">Load a lick from the library or create a new one to get started.</p>
      )}

      {/* Build mode content */}
      {panelMode === 'build' && (
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-2">Click any fret on the neck to add a note. Each click adds a new column.</p>
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
              onClick={() => { setBuiltCols([]); setBuiltTabText(''); }}
              className={`${btnClass} bg-white text-gray-600 border-gray-300 hover:bg-gray-50`}
            >
              Clear
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
          onVisualize={tab => {
            const normalized = normalizeTab(tab);
            setRawTab(normalized);
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
          onVisualize={tab => {
            const normalized = normalizeTab(tab);
            setRawTab(normalized);
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
