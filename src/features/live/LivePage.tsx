import { useState, useEffect, useRef, useMemo } from 'react';
import GuitarNeck, { type NeckDot } from './GuitarNeck';
import { getScalePositions } from '../../core/api/client';
import { usePitchDetection } from './usePitchDetection';

const STRING_COUNT = 6;
const FRET_COUNT = 12;
const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // low E → high e
const MAX_FRET_DISTANCE = 4;

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
  { value: 'IONIAN',     label: 'Major (Ionian)'          },
  { value: 'DORIAN',     label: 'Dorian'                  },
  { value: 'PHRYGIAN',   label: 'Phrygian'                },
  { value: 'LYDIAN',     label: 'Lydian'                  },
  { value: 'MIXOLYDIAN', label: 'Mixolydian'              },
  { value: 'AEOLIAN',    label: 'Natural Minor (Aeolian)'  },
  { value: 'LOCRIAN',    label: 'Locrian'                 },
];

function formatNote(enumName: string): string {
  if (enumName === 'B_FLAT') return 'Bb';
  return enumName.replace('_SHARP', '#');
}

function blankScaleDots(): NeckDot[][] {
  return Array.from({ length: STRING_COUNT }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

function wrapDegree(d: number): number {
  return ((d - 1 + 7) % 7) + 1;
}

function midiToPositions(midi: number): Array<{ string: number; fret: number }> {
  const result: Array<{ string: number; fret: number }> = [];
  for (let s = 0; s < STRING_COUNT; s++) {
    const fret = midi - OPEN_MIDI[s];
    if (fret >= 0 && fret <= FRET_COUNT) result.push({ string: s, fret });
  }
  return result;
}

const selectClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white';
const btnClass = 'px-4 py-2 text-sm rounded-lg border transition-colors';

interface CurrentNote { string: number; fret: number; degree: number; }

export default function LivePage() {
  const [root, setRoot] = useState('C');
  const [mode, setMode] = useState('IONIAN');
  // pure scale overlay — no active/candidate state
  const [scaleDots, setScaleDots] = useState<NeckDot[][]>(blankScaleDots);
  const [currentNote, setCurrentNote] = useState<CurrentNote | null>(null);
  const [listening, setListening] = useState(false);
  const noteHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { midiNote, error: micError } = usePitchDetection(listening);

  // Fetch scale overlay when key/mode changes
  useEffect(() => {
    if (!root) { setScaleDots(blankScaleDots()); return; }
    getScalePositions(root, mode).then(res => {
      const next = blankScaleDots();
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
      setCurrentNote(null);
    }).catch(() => {});
  }, [root, mode]);

  // Derived dots: overlay active + candidate state onto the scale dots
  const dots = useMemo<NeckDot[][]>(() => {
    const candidateDegrees = currentNote
      ? new Set([
          wrapDegree(currentNote.degree - 2),
          wrapDegree(currentNote.degree - 1),
          wrapDegree(currentNote.degree + 1),
          wrapDegree(currentNote.degree + 2),
        ])
      : new Set<number>();

    return scaleDots.map((row, s) =>
      row.map((dot, f) => {
        if (dot.degree === null) return dot;
        const isActive = currentNote?.string === s && currentNote?.fret === f;
        const isCandidate = !isActive
          && candidateDegrees.has(dot.degree)
          && Math.abs(f - currentNote!.fret) <= MAX_FRET_DISTANCE;
        return { ...dot, active: isActive, candidate: isCandidate };
      })
    );
  }, [scaleDots, currentNote]);

  function selectNote(s: number, f: number, degree: number) {
    if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
    setCurrentNote({ string: s, fret: f, degree });
    noteHoldTimer.current = setTimeout(() => setCurrentNote(null), 3000);
  }

  // Mic pitch → select matching in-scale note
  useEffect(() => {
    if (midiNote === null) return;
    const positions = midiToPositions(midiNote);
    const match = positions.find(p => scaleDots[p.string]?.[p.fret]?.degree != null);
    if (match) {
      const deg = scaleDots[match.string][match.fret].degree!;
      selectNote(match.string, match.fret, deg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiNote]);

  function handleDotClick(stringIndex: number, fret: number) {
    const dot = scaleDots[stringIndex]?.[fret];
    if (!dot || dot.degree === null) return;
    if (currentNote?.string === stringIndex && currentNote?.fret === fret) {
      if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
      setCurrentNote(null);
    } else {
      selectNote(stringIndex, fret, dot.degree);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-900">Live</h1>
        <select className={selectClass} value={root} onChange={e => { setRoot(e.target.value); }}>
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
        <button
          className={`${btnClass} ${listening
            ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
            : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          onClick={() => setListening(l => !l)}
        >
          {listening ? '⏹ Stop' : '🎙 Listen'}
        </button>
        {listening && !micError && (
          <span className="text-sm text-green-600 animate-pulse">● Listening</span>
        )}
      </div>

      {micError === 'NotAllowedError' && (
        <p className="text-sm text-red-500 mb-4">Mic access denied. Allow microphone permission and try again.</p>
      )}
      {micError === 'NotFoundError' && (
        <p className="text-sm text-red-500 mb-4">No microphone found.</p>
      )}
      {micError === 'NotSecureContext' && (
        <p className="text-sm text-red-500 mb-4">Mic requires a secure connection (HTTPS). Try accessing the app via HTTPS, or on the same device as the server.</p>
      )}

      <GuitarNeck dots={dots} fretCount={FRET_COUNT} onDotClick={handleDotClick} />
    </div>
  );
}
