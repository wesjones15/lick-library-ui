import { useState, useEffect, useRef, useMemo } from 'react';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from './GuitarNeck';
import { getPentatonicDegree, getPentatonicNoteSet, ROOT_CHROMATIC } from './cagedUtils';
import PentatonicWidget from './PentatonicWidget';
import { getScalePositions } from '../../core/api/client';
import { usePitchDetection } from './usePitchDetection';

const STRING_COUNT = 6;
const FRET_COUNT = 12;
const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // low E → high e
const CHROMATIC_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

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

interface LivePageProps {
  pageMode?: 'live' | 'theory';
}

export default function LivePage({ pageMode = 'live' }: LivePageProps) {
  const [root, setRoot] = useState('C');
  const [mode, setMode] = useState('IONIAN');
  const [scaleDots, setScaleDots] = useState<NeckDot[][]>(blankScaleDots);
  const [currentNote, setCurrentNote] = useState<CurrentNote | null>(null);
  const [highlightedDegrees, setHighlightedDegrees] = useState<Set<number>>(new Set());
  const [showPentatonicWidget, setShowPentatonicWidget] = useState(false);
  const [activePentKeys, setActivePentKeys] = useState<string[]>([]);
  const [pentWidgetMode, setPentWidgetMode] = useState(mode);
  const [pentModeSynced, setPentModeSynced] = useState(true);
  const [listening, setListening] = useState(false);
  const noteHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { midiNote, error: micError } = usePitchDetection(pageMode === 'live' && listening);

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

  useEffect(() => {
    if (pentModeSynced) setPentWidgetMode(mode);
  }, [mode, pentModeSynced]);

  const allCandidates = useMemo<{
    best: Map<string, { candidateColor: string; ownNote: boolean }>;
    second: Map<string, { candidateColor: string }>;
    third: Map<string, { candidateColor: string }>;
  }>(() => {
    const empty = { best: new Map(), second: new Map(), third: new Map() };
    if (!currentNote || highlightedDegrees.size > 0) return empty;

    const byDegree = new Map<number, Array<{ string: number; fret: number; dist: number }>>();
    scaleDots.forEach((row, s) => {
      row.forEach((dot, f) => {
        if (!dot.degree) return;
        if (s === currentNote.string && f === currentNote.fret) return;
        const dist = Math.hypot(f - currentNote.fret, s - currentNote.string);
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
      const isOwn = degree === currentNote.degree;
      if (arr[0]) best.set(`${arr[0].string},${arr[0].fret}`, { candidateColor: color, ownNote: isOwn });
      if (arr[1]) second.set(`${arr[1].string},${arr[1].fret}`, { candidateColor: color });
      if (arr[2]) third.set(`${arr[2].string},${arr[2].fret}`, { candidateColor: color });
    });

    return { best, second, third };
  }, [scaleDots, currentNote, highlightedDegrees]);

  const bestCandidates = allCandidates.best;
  const secondCandidates = allCandidates.second;
  const thirdCandidates = allCandidates.third;

  const candidateDegrees = useMemo(() => {
    if (highlightedDegrees.size > 0) return new Set<number>();
    const s = new Set<number>();
    bestCandidates.forEach(({ ownNote }, key) => {
      const [str, fret] = key.split(',').map(Number);
      const deg = scaleDots[str]?.[fret]?.degree;
      if (deg && !ownNote) s.add(deg);
    });
    return s;
  }, [allCandidates, highlightedDegrees, scaleDots]);

  const recognizedPentKeys = useMemo<Map<string, 'partial' | 'full'>>(() => {
    if (highlightedDegrees.size < 2 || !root) return new Map();
    const rootIdx = ROOT_CHROMATIC[root] ?? 0;
    const liveSemis = ((): number[] => {
      const semMap: Record<string, number[]> = {
        IONIAN:     [0,2,4,5,7,9,11],
        DORIAN:     [0,2,3,5,7,9,10],
        PHRYGIAN:   [0,1,3,5,7,8,10],
        LYDIAN:     [0,2,4,6,7,9,11],
        MIXOLYDIAN: [0,2,4,5,7,9,10],
        AEOLIAN:    [0,2,3,5,7,8,10],
        LOCRIAN:    [0,1,3,5,6,8,10],
      };
      return semMap[mode] ?? semMap.IONIAN;
    })();
    const selectedChromatic = new Set(
      Array.from(highlightedDegrees).map(d => (rootIdx + liveSemis[d - 1]) % 12)
    );
    const result = new Map<string, 'partial' | 'full'>();
    for (const key of Object.keys(ROOT_CHROMATIC)) {
      const pentNotes = getPentatonicNoteSet(key, pentWidgetMode);
      const notRuledOut = [...selectedChromatic].every(n => pentNotes.has(n));
      if (!notRuledOut) continue;
      const isFull = [...pentNotes].every(n => selectedChromatic.has(n));
      result.set(key, isFull ? 'full' : 'partial');
    }
    return result;
  }, [highlightedDegrees, root, mode, pentWidgetMode]);

  const dots = useMemo<NeckDot[][]>(() => {
    return scaleDots.map((row, s) =>
      row.map((dot, f) => {
        let pentatonicRings: string[] | undefined;
        let pentatonicOutOfScale: boolean | undefined;

        if (activePentKeys.length > 0) {
          const chromatic = (OPEN_MIDI[s] + f) % 12;
          const rings: string[] = [];
          for (const key of activePentKeys) {
            const deg = getPentatonicDegree(chromatic, key, pentWidgetMode);
            if (deg !== null) rings.push(DEGREE_COLORS[deg]);
          }
          if (rings.length > 0) {
            pentatonicRings = rings;
            if (dot.degree === null) pentatonicOutOfScale = true;
          }
        }

        if (dot.degree === null) {
          const note = pentatonicOutOfScale ? CHROMATIC_LABELS[(OPEN_MIDI[s] + f) % 12] : undefined;
          return { ...dot, pentatonicRings, pentatonicOutOfScale, note };
        }
        if (highlightedDegrees.size > 0) {
          return { ...dot, active: false, highlighted: highlightedDegrees.has(dot.degree!), candidate: false, pentatonicRings };
        }
        const isActive = currentNote?.string === s && currentNote?.fret === f;
        const candidateInfo = !isActive ? bestCandidates.get(`${s},${f}`) : undefined;
        const secondInfo = !isActive && !candidateInfo ? secondCandidates.get(`${s},${f}`) : undefined;
        const thirdInfo = !isActive && !candidateInfo && !secondInfo ? thirdCandidates.get(`${s},${f}`) : undefined;
        return {
          ...dot,
          active: isActive,
          candidate: !!candidateInfo,
          candidateColor: candidateInfo?.candidateColor ?? secondInfo?.candidateColor ?? thirdInfo?.candidateColor,
          ownNote: candidateInfo?.ownNote,
          secondCandidate: !!secondInfo,
          thirdCandidate: !!thirdInfo,
          highlighted: pentatonicRings && !isActive ? true : undefined,
          pentatonicRings,
        };
      })
    );
  }, [scaleDots, currentNote, allCandidates, highlightedDegrees, activePentKeys, pentWidgetMode]);

  function selectNote(s: number, f: number, degree: number) {
    if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
    setCurrentNote({ string: s, fret: f, degree });
    noteHoldTimer.current = setTimeout(() => setCurrentNote(null), 3000);
  }

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
    if (highlightedDegrees.size > 0) return;
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
        <h1 className="text-3xl font-bold text-gray-900">
          {pageMode === 'theory' ? 'Theory' : 'Live'}
        </h1>

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

        {pageMode === 'live' && (
          <>
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
          </>
        )}
      </div>

      {/* Interval legend: theory mode only */}
      {pageMode === 'theory' && (
        <div className="flex gap-2 items-center flex-wrap mb-6">
          {intervalLabels.map((label, idx) => {
            const degree = idx + 1;
            const isNoteActive = currentNote?.degree === degree;
            const isDegreeHighlighted = highlightedDegrees.has(degree);
            const isCandidate = candidateDegrees.has(degree);
            const lit = isNoteActive || isDegreeHighlighted || isCandidate;
            return (
              <div
                key={degree}
                className={isCandidate && !isNoteActive && !isDegreeHighlighted ? 'legend-candidate' : undefined}
                onClick={() => {
                  setCurrentNote(null);
                  if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
                  setHighlightedDegrees(prev => {
                    const next = new Set(prev);
                    if (next.has(degree)) next.delete(degree);
                    else next.add(degree);
                    return next;
                  });
                }}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: DEGREE_COLORS[degree],
                  opacity: lit ? 1 : 0.35,
                  border: isDegreeHighlighted ? '2px solid #ffffff' : isNoteActive ? '2px solid #fef08a' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: label.length > 1 ? 9 : 11,
                  fontWeight: 700,
                  color: lit ? '#111827' : '#9ca3af',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                {label}
              </div>
            );
          })}
          {highlightedDegrees.size > 0 && (
            <button
              onClick={() => setHighlightedDegrees(new Set())}
              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-500 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Mic errors: live mode only */}
      {pageMode === 'live' && micError === 'NotAllowedError' && (
        <p className="text-sm text-red-500 mb-4">Mic access denied. Allow microphone permission and try again.</p>
      )}
      {pageMode === 'live' && micError === 'NotFoundError' && (
        <p className="text-sm text-red-500 mb-4">No microphone found.</p>
      )}
      {pageMode === 'live' && micError === 'NotSecureContext' && (
        <p className="text-sm text-red-500 mb-4">Mic requires a secure connection (HTTPS). Try accessing the app via HTTPS, or on the same device as the server.</p>
      )}

      <GuitarNeck
        dots={dots}
        fretCount={FRET_COUNT}
        onDotClick={pageMode === 'theory' ? handleDotClick : undefined}
      />

      {/* Pentatonic widget: theory mode only */}
      {pageMode === 'theory' && (
        <PentatonicWidget
          activePentKeys={activePentKeys}
          pentWidgetMode={pentWidgetMode}
          pentModeSynced={pentModeSynced}
          recognizedPentKeys={recognizedPentKeys}
          onKeyToggle={key => setActivePentKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
          )}
          onModeChange={m => { setPentWidgetMode(m); setPentModeSynced(false); }}
          show={showPentatonicWidget}
          onToggle={() => setShowPentatonicWidget(v => !v)}
        />
      )}
    </div>
  );
}
