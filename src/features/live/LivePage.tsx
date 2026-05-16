import { useState, useEffect } from 'react';
import GuitarNeck, { type NeckDot } from './GuitarNeck';
import { getScalePositions } from '../../core/api/client';

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

const MODES = [
  { value: 'IONIAN',     label: 'Major (Ionian)'    },
  { value: 'DORIAN',     label: 'Dorian'             },
  { value: 'PHRYGIAN',   label: 'Phrygian'           },
  { value: 'LYDIAN',     label: 'Lydian'             },
  { value: 'MIXOLYDIAN', label: 'Mixolydian'         },
  { value: 'AEOLIAN',    label: 'Natural Minor (Aeolian)' },
  { value: 'LOCRIAN',    label: 'Locrian'            },
];

function formatNote(enumName: string): string {
  if (enumName === 'B_FLAT') return 'Bb';
  return enumName.replace('_SHARP', '#');
}

function blankDots(): NeckDot[][] {
  return Array.from({ length: STRING_COUNT }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

const selectClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white';

export default function LivePage() {
  const [root, setRoot] = useState('');
  const [mode, setMode] = useState('AEOLIAN');
  const [dots, setDots] = useState<NeckDot[][]>(blankDots);

  useEffect(() => {
    if (!root) {
      setDots(blankDots());
      return;
    }
    getScalePositions(root, mode).then(res => {
      const next = blankDots();
      for (const pos of res.positions) {
        if (pos.string >= 0 && pos.string < STRING_COUNT && pos.fret >= 0 && pos.fret <= FRET_COUNT) {
          next[pos.string][pos.fret] = { degree: pos.degree as 1|2|3|4|5|6|7, active: false, note: formatNote(pos.note) };
        }
      }
      setDots(next);
    }).catch(() => {});
  }, [root, mode]);

  function handleDotClick(stringIndex: number, fret: number) {
    setDots(prev => prev.map((row, s) =>
      s === stringIndex
        ? row.map((dot, f) => f === fret ? { ...dot, active: !dot.active } : dot)
        : row
    ));
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Live</h1>

      <div className="flex items-center gap-4 mb-8">
        <select className={selectClass} value={root} onChange={e => setRoot(e.target.value)}>
          <option value="">— Key —</option>
          {NOTE_KEYS.map(k => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <select className={selectClass} value={mode} onChange={e => setMode(e.target.value)}>
          {MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {!root && (
          <span className="text-gray-400 text-sm">Choose a key to see scale.</span>
        )}
      </div>

      <GuitarNeck dots={dots} fretCount={FRET_COUNT} onDotClick={handleDotClick} />
    </div>
  );
}
