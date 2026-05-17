import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from './GuitarNeck';
import { getScalePositions } from '../../core/api/client';
import { usePitchDetection } from './usePitchDetection';

type ViewMode = 'live' | 'lick' | 'chords';

const STRING_COUNT = 6;
const FRET_COUNT = 12;
const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // low E → high e

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

const MODE_INTERVALS: Record<string, string[]> = {
  IONIAN:     ['1', '2',  '3',  '4',  '5',  '6',  '7' ],
  DORIAN:     ['1', '2',  'b3', '4',  '5',  '6',  'b7'],
  PHRYGIAN:   ['1', 'b2', 'b3', '4',  '5',  'b6', 'b7'],
  LYDIAN:     ['1', '2',  '3',  '#4', '5',  '6',  '7' ],
  MIXOLYDIAN: ['1', '2',  '3',  '4',  '5',  '6',  'b7'],
  AEOLIAN:    ['1', '2',  'b3', '4',  '5',  'b6', 'b7'],
  LOCRIAN:    ['1', 'b2', 'b3', '4',  'b5', 'b6', 'b7'],
};

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
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const param = searchParams.get('mode');
    return (param === 'lick' || param === 'chords') ? param : 'live';
  });

  const [root, setRoot] = useState('C');
  const [mode, setMode] = useState('IONIAN');
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

  // Candidate degrees — lifted out so legend can use them too
  const candidateDegrees = useMemo(() =>
    currentNote
      ? new Set([
          wrapDegree(currentNote.degree - 2),
          wrapDegree(currentNote.degree - 1),
          wrapDegree(currentNote.degree + 1),
          wrapDegree(currentNote.degree + 2),
        ])
      : new Set<number>(),
    [currentNote]
  );

  // For each candidate degree, find the 2 closest notes on the neck
  const bestCandidates = useMemo<Set<string>>(() => {
    if (!currentNote) return new Set();
    const bestByDegree = new Map<number, Array<{ string: number; fret: number; distance: number }>>();
    scaleDots.forEach((row, s) => {
      row.forEach((dot, f) => {
        if (dot.degree === null) return;
        if (currentNote.string === s && currentNote.fret === f) return;
        if (!candidateDegrees.has(dot.degree)) return;
        const dist = Math.hypot(f - currentNote.fret, s - currentNote.string);
        if (dist > 3.9) return;
        const list = bestByDegree.get(dot.degree) ?? [];
        list.push({ string: s, fret: f, distance: dist });
        list.sort((a, b) => a.distance - b.distance);
        // Keep 2 only if tied for closest; otherwise keep 1
        const top = list[0];
        bestByDegree.set(dot.degree, list.filter(x => x.distance === top.distance));
      });
    });
    return new Set(
      Array.from(bestByDegree.values()).flatMap(list => list.map(({ string, fret }) => `${string},${fret}`))
    );
  }, [scaleDots, currentNote, candidateDegrees]);

  // Derived dots: overlay active + candidate state onto the scale dots
  const dots = useMemo<NeckDot[][]>(() => {
    return scaleDots.map((row, s) =>
      row.map((dot, f) => {
        if (dot.degree === null) return dot;
        const isActive = currentNote?.string === s && currentNote?.fret === f;
        const isCandidate = !isActive && bestCandidates.has(`${s},${f}`);
        return { ...dot, active: isActive, candidate: isCandidate };
      })
    );
  }, [scaleDots, currentNote, bestCandidates]);

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

  const intervalLabels = MODE_INTERVALS[mode] ?? [];

  const VIEW_MODES: { id: ViewMode; label: string }[] = [
    { id: 'live',   label: 'Live'   },
    { id: 'lick',   label: 'Lick'   },
    { id: 'chords', label: 'Chords' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <style>{`
        @keyframes legend-pulse {
          0%, 100% { box-shadow: 0 0 0 1px #800020; }
          50%       { box-shadow: 0 0 0 3px #800020; }
        }
        .legend-candidate { animation: legend-pulse 0.8s ease-in-out infinite; }
      `}</style>

      {/* Top toolbar */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-900">Live</h1>

        {/* Key + Mode selectors: visible in live and chords modes */}
        {(viewMode === 'live' || viewMode === 'chords') && (<>
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
        </>)}

        {/* Mic button: live mode only */}
        {viewMode === 'live' && (<>
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
        </>)}

        {/* View mode pill buttons — right-aligned */}
        <div className="ml-auto flex rounded-lg overflow-hidden border border-gray-300">
          {VIEW_MODES.map(vm => (
            <button
              key={vm.id}
              onClick={() => setViewMode(vm.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === vm.id
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } ${vm.id !== 'live' ? 'border-l border-gray-300' : ''}`}
            >
              {vm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live mode content */}
      {viewMode === 'live' && (<>
        {/* Interval key legend */}
        <div className="flex gap-2 items-center flex-wrap mb-6">
          {intervalLabels.map((label, idx) => {
            const degree = idx + 1;
            const isActive   = currentNote?.degree === degree;
            const isCandidate = candidateDegrees.has(degree);
            return (
              <div
                key={degree}
                className={isCandidate && !isActive ? 'legend-candidate' : undefined}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: DEGREE_COLORS[degree],
                  opacity: isActive || isCandidate ? 1 : 0.35,
                  border: isActive ? '2px solid #fef08a' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: label.length > 1 ? 9 : 11,
                  fontWeight: 700,
                  color: isActive || isCandidate ? '#111827' : '#9ca3af',
                  flexShrink: 0,
                }}
              >
                {label}
              </div>
            );
          })}
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
      </>)}

      {/* Lick Visualizer mode — stub */}
      {viewMode === 'lick' && (
        <div className="py-16 text-center text-gray-400 text-sm">
          Lick Visualizer coming soon.
        </div>
      )}

      {/* Chords/Progressions mode — stub */}
      {viewMode === 'chords' && (
        <div className="py-16 text-center text-gray-400 text-sm">
          Chords &amp; Progressions coming soon.
        </div>
      )}
    </div>
  );
}
