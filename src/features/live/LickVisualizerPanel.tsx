import { useState, useEffect, useRef, useCallback } from 'react';
import GuitarNeck, { type NeckDot } from './GuitarNeck';
import { uploadLick, getLick } from '../../core/api/client';
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
const navBtnClass = 'px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed';

// Parse an ASCII tab string (6 lines with | | delimiters) into columns of {string, fret} pairs.
// Returns an array of columns; each column is an array of notes played simultaneously.
function parseTabString(tabString: string): Array<Array<{ string: number; fret: number }>> {
  const lines = tabString.split('\n').filter(l => l.includes('|'));
  if (lines.length < 2) return [];

  // Extract content between the first and last | on each line
  const contents = lines.map(line => {
    const first = line.indexOf('|');
    const last = line.lastIndexOf('|');
    return first >= 0 && last > first ? line.slice(first + 1, last) : '';
  });

  // Scan each string line for digit positions, group by horizontal character position
  const colMap = new Map<number, Array<{ string: number; fret: number }>>();

  contents.forEach((content, displayRow) => {
    // GuitarNeck display order: row 0 = high e (string 5), row N-1 = low E (string 0)
    const stringIndex = (lines.length - 1) - displayRow;
    let i = 0;
    while (i < content.length) {
      if (/\d/.test(content[i])) {
        const colKey = i;
        let fretStr = content[i];
        // Two-digit fret lookahead
        if (i + 1 < content.length && /\d/.test(content[i + 1])) {
          fretStr += content[i + 1];
          i += 2;
        } else {
          i++;
        }
        const fret = parseInt(fretStr, 10);
        if (!colMap.has(colKey)) colMap.set(colKey, []);
        colMap.get(colKey)!.push({ string: stringIndex, fret });
      } else {
        i++;
      }
    }
  });

  return Array.from(colMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, notes]) => notes);
}

function blankDots(): NeckDot[][] {
  return Array.from({ length: STRING_COUNT }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

function buildDotsForColumn(column: Array<{ string: number; fret: number }>): NeckDot[][] {
  const dots = blankDots();
  for (const { string: s, fret: f } of column) {
    if (s >= 0 && s < STRING_COUNT && f >= 0 && f <= FRET_COUNT) {
      dots[s][f] = { degree: 1, active: true };
    }
  }
  return dots;
}

export default function LickVisualizerPanel() {
  const { bpm, isPlaying } = useMetronomeContext();

  const [rawTab, setRawTab] = useState(PLACEHOLDER_TAB);
  const [renderKey, setRenderKey] = useState('C');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [positions, setPositions] = useState<string[]>([]);
  const [currentPos, setCurrentPos] = useState(0);
  const [columns, setColumns] = useState<Array<Array<{ string: number; fret: number }>>>([]);
  const [currentCol, setCurrentCol] = useState(0);

  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse columns whenever position changes
  useEffect(() => {
    if (!positions[currentPos]) { setColumns([]); setCurrentCol(0); return; }
    const parsed = parseTabString(positions[currentPos]);
    setColumns(parsed);
    setCurrentCol(0);
  }, [positions, currentPos]);

  // Metronome-driven column advance
  useEffect(() => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    if (!isPlaying || columns.length === 0) return;
    const ms = Math.round(60000 / bpm);
    playTimerRef.current = setInterval(() => {
      setCurrentCol(c => (c + 1) % columns.length);
    }, ms);
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [isPlaying, bpm, columns.length]);

  const handleVisualize = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const summary = await uploadLick({ rawTab, inputKey: renderKey });
      const detail = await getLick(summary.id, renderKey, 'dfs');
      setPositions(detail.positions.map(p => p.tabString));
      setCurrentPos(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to visualize');
    } finally {
      setLoading(false);
    }
  }, [rawTab, renderKey]);

  const dots = columns.length > 0 && currentCol < columns.length
    ? buildDotsForColumn(columns[currentCol])
    : blankDots();

  return (
    <div className="py-6">
      {/* Input row */}
      <div className="flex gap-3 items-start flex-wrap mb-4">
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
            disabled={loading}
            className={`${btnClass} bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 disabled:opacity-50`}
          >
            {loading ? 'Loading…' : 'Visualize'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {positions.length > 0 && (
        <>
          <GuitarNeck dots={dots} fretCount={FRET_COUNT} />

          {/* Navigation row */}
          <div className="flex gap-6 items-center mt-3 flex-wrap">
            {/* Column navigation */}
            {columns.length > 1 && (
              <div className="flex items-center gap-2">
                <button className={navBtnClass} disabled={currentCol === 0} onClick={() => setCurrentCol(c => c - 1)}>‹</button>
                <span className="text-sm text-gray-500 w-20 text-center">Col {currentCol + 1} / {columns.length}</span>
                <button className={navBtnClass} disabled={currentCol === columns.length - 1} onClick={() => setCurrentCol(c => c + 1)}>›</button>
              </div>
            )}

            {/* Position navigation */}
            {positions.length > 1 && (
              <div className="flex items-center gap-2">
                <button className={navBtnClass} disabled={currentPos === 0} onClick={() => setCurrentPos(p => p - 1)}>‹</button>
                <span className="text-sm text-gray-500 w-24 text-center">Pos {currentPos + 1} / {positions.length}</span>
                <button className={navBtnClass} disabled={currentPos === positions.length - 1} onClick={() => setCurrentPos(p => p + 1)}>›</button>
              </div>
            )}

            <span className="text-xs text-gray-400">Use metronome to auto-advance columns</span>
          </div>
        </>
      )}

      {positions.length === 0 && !loading && (
        <p className="text-sm text-gray-400 mt-4">Paste a guitar tab above and click Visualize to see it on the neck.</p>
      )}
    </div>
  );
}
