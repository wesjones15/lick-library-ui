import { useMemo } from 'react';
import { ROOT_CHROMATIC, GUITAR_OPEN_MIDI } from '../../core/music';
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const INTERVAL_NAMES = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

const CHORD_QUALITIES: Record<string, number[]> = {
  'major':  [0, 4, 7],
  'minor':  [0, 3, 7],
  'dim':    [0, 3, 6],
  'aug':    [0, 4, 8],
  'sus2':   [0, 2, 7],
  'sus4':   [0, 5, 7],
  '7':      [0, 4, 7, 10],
  'maj7':   [0, 4, 7, 11],
  'm7':     [0, 3, 7, 10],
  'dim7':   [0, 3, 6, 9],
  'm7b5':   [0, 3, 6, 10],
  'aug7':   [0, 4, 8, 10],
  '9':      [0, 4, 7, 10, 14],
  'maj9':   [0, 4, 7, 11, 14],
  'm9':     [0, 3, 7, 10, 14],
};

const btnClass = 'px-3 py-1.5 text-xs rounded-lg border transition-colors';

interface ChordsWidgetProps {
  show: boolean;
  onToggle: () => void;
  selectedPositions: Set<string>;
  root: string;
  onClear: () => void;
}

export default function ChordsWidget({ show, onToggle, selectedPositions, root, onClear }: ChordsWidgetProps) {
  const analysis = useMemo(() => {
    if (selectedPositions.size === 0) return { intervals: [], chords: [] };

    const rootChroma = ROOT_CHROMATIC[root] ?? 0;

    const uniqueChromatic = new Set<number>();
    for (const key of selectedPositions) {
      const [s, f] = key.split(',').map(Number);
      uniqueChromatic.add((GUITAR_OPEN_MIDI[s] + f) % 12);
    }

    const chromatics = [...uniqueChromatic].sort((a, b) => a - b);

    const intervals = chromatics.map(c => INTERVAL_NAMES[(c - rootChroma + 12) % 12]);

    const chords: Array<{ root: string; quality: string }> = [];
    for (const candidateRoot of chromatics) {
      const semitones = chromatics
        .map(c => (c - candidateRoot + 12) % 12)
        .sort((a, b) => a - b);
      for (const [quality, shape] of Object.entries(CHORD_QUALITIES)) {
        const shapeMod12 = [...new Set(shape.map(s => s % 12))].sort((a, b) => a - b);
        if (
          shapeMod12.length === semitones.length &&
          shapeMod12.every((v, i) => v === semitones[i])
        ) {
          chords.push({ root: NOTE_NAMES[candidateRoot], quality });
        }
      }
    }

    return { intervals, chords };
  }, [selectedPositions, root]);

  if (!show) {
    return (
      <div className="mt-4 p-3 inline-block">
        <button onClick={onToggle} className={`${btnClass} border-gray-300 text-gray-600 hover:bg-gray-50`}>
          Chords
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50 inline-block min-w-48">
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className={`${btnClass} bg-gray-800 text-white border-gray-800`}>
          Chords
        </button>
      </div>

      {selectedPositions.size > 0 && (
        <>
          <div className="flex gap-1 flex-wrap mt-2">
            {analysis.intervals.map((label, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 text-xs rounded border border-gray-300 bg-white text-gray-700 font-mono"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-0.5">
            {analysis.chords.length > 0 ? (
              analysis.chords.map((c, i) => (
                <span key={i} className="text-xs text-gray-800 font-medium">
                  {c.root} {c.quality}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No matching chord</span>
            )}
          </div>
        </>
      )}

      <div className="mt-1 h-4">
        <button
          style={{ visibility: selectedPositions.size > 0 ? 'visible' : 'hidden' }}
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
