import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from './GuitarNeck';
import { getCagedZones, getPentatonicDegree } from './cagedUtils';
import PentatonicWidget from './PentatonicWidget';
import LickVisualizerPanel from './LickVisualizerPanel';
import ChordsProgressionPanel from './ChordsProgressionPanel';
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
  const [highlightedDegrees, setHighlightedDegrees] = useState<Set<number>>(new Set());
  const [showCaged, setShowCaged] = useState(false);
  const [showPentatonicWidget, setShowPentatonicWidget] = useState(false);
  const [activePentKeys, setActivePentKeys] = useState<string[]>([]);
  const [pentWidgetMode, setPentWidgetMode] = useState(mode);
  const [pentModeSynced, setPentModeSynced] = useState(true);
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

  // Keep pentWidgetMode in sync with Live toolbar mode unless user has detached it
  useEffect(() => {
    if (pentModeSynced) setPentWidgetMode(mode);
  }, [mode, pentModeSynced]);

  // For each degree (including same-degree), find exactly 1 closest note within 3.9
  const bestCandidates = useMemo<Map<string, { candidateColor: string; ownNote: boolean }>>(() => {
    if (!currentNote || highlightedDegrees.size > 0) return new Map();
    const closestByDegree = new Map<number, { string: number; fret: number; dist: number }>();
    scaleDots.forEach((row, s) => {
      row.forEach((dot, f) => {
        if (!dot.degree) return;
        if (s === currentNote.string && f === currentNote.fret) return;
        const dist = Math.hypot(f - currentNote.fret, s - currentNote.string);
        if (dist > 3.9) return;
        const prev = closestByDegree.get(dot.degree);
        if (!prev || dist < prev.dist) closestByDegree.set(dot.degree, { string: s, fret: f, dist });
      });
    });
    const result = new Map<string, { candidateColor: string; ownNote: boolean }>();
    closestByDegree.forEach((pos, degree) => {
      result.set(`${pos.string},${pos.fret}`, {
        candidateColor: DEGREE_COLORS[degree],
        ownNote: degree === currentNote.degree,
      });
    });
    return result;
  }, [scaleDots, currentNote]);

  // Neighbors of the own-note (same-degree) candidate — rendered at half brightness
  const secondCandidates = useMemo<Map<string, { candidateColor: string }>>(() => {
    if (!currentNote || highlightedDegrees.size > 0) return new Map();
    let ownPos: { string: number; fret: number } | null = null;
    bestCandidates.forEach(({ ownNote }, key) => {
      if (ownNote) {
        const [s, f] = key.split(',').map(Number);
        ownPos = { string: s, fret: f };
      }
    });
    if (!ownPos) return new Map();
    const op = ownPos as { string: number; fret: number };
    const closestByDegree = new Map<number, { string: number; fret: number; dist: number }>();
    scaleDots.forEach((row, s) => {
      row.forEach((dot, f) => {
        if (!dot.degree) return;
        if (s === op.string && f === op.fret) return;
        if (s === currentNote.string && f === currentNote.fret) return;
        const dist = Math.hypot(f - op.fret, s - op.string);
        if (dist > 3.9) return;
        const prev = closestByDegree.get(dot.degree);
        if (!prev || dist < prev.dist) closestByDegree.set(dot.degree, { string: s, fret: f, dist });
      });
    });
    const result = new Map<string, { candidateColor: string }>();
    closestByDegree.forEach((pos, degree) => {
      const key = `${pos.string},${pos.fret}`;
      if (!bestCandidates.has(key)) result.set(key, { candidateColor: DEGREE_COLORS[degree] });
    });
    return result;
  }, [scaleDots, currentNote, bestCandidates, highlightedDegrees]);

  // candidateDegrees: derived from bestCandidates, used for legend highlighting
  const candidateDegrees = useMemo(() => {
    if (highlightedDegrees.size > 0) return new Set<number>();
    const s = new Set<number>();
    bestCandidates.forEach(({ ownNote }, key) => {
      const [str, fret] = key.split(',').map(Number);
      const deg = scaleDots[str]?.[fret]?.degree;
      if (deg && !ownNote) s.add(deg);
    });
    return s;
  }, [bestCandidates, highlightedDegrees, scaleDots]);

  // Derived dots: overlay active + candidate state onto scale dots
  const dots = useMemo<NeckDot[][]>(() => {
    return scaleDots.map((row, s) =>
      row.map((dot, f) => {
        // Pentatonic ring overlay
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
          return { ...dot, pentatonicRings, pentatonicOutOfScale };
        }
        if (highlightedDegrees.size > 0) {
          return { ...dot, active: false, highlighted: highlightedDegrees.has(dot.degree!), candidate: false, pentatonicRings };
        }
        const isActive = currentNote?.string === s && currentNote?.fret === f;
        const candidateInfo = !isActive ? bestCandidates.get(`${s},${f}`) : undefined;
        const secondInfo = !isActive && !candidateInfo ? secondCandidates.get(`${s},${f}`) : undefined;
        return {
          ...dot,
          active: isActive,
          candidate: !!candidateInfo,
          candidateColor: candidateInfo?.candidateColor ?? secondInfo?.candidateColor,
          ownNote: candidateInfo?.ownNote,
          secondCandidate: !!secondInfo,
          highlighted: pentatonicRings && !isActive ? true : undefined,
          pentatonicRings,
        };
      })
    );
  }, [scaleDots, currentNote, bestCandidates, secondCandidates, highlightedDegrees, activePentKeys, pentWidgetMode]);

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
        {/* Interval key legend — clickable bubbles highlight all notes of that degree */}
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

        {micError === 'NotAllowedError' && (
          <p className="text-sm text-red-500 mb-4">Mic access denied. Allow microphone permission and try again.</p>
        )}
        {micError === 'NotFoundError' && (
          <p className="text-sm text-red-500 mb-4">No microphone found.</p>
        )}
        {micError === 'NotSecureContext' && (
          <p className="text-sm text-red-500 mb-4">Mic requires a secure connection (HTTPS). Try accessing the app via HTTPS, or on the same device as the server.</p>
        )}

        {/* Overlay toggle buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowCaged(v => !v)}
            className={`${btnClass} text-xs ${showCaged
              ? 'bg-gray-800 text-white border-gray-800'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            CAGED Zones
          </button>
        </div>

        <GuitarNeck
          dots={dots}
          fretCount={FRET_COUNT}
          onDotClick={handleDotClick}
          cagedZones={showCaged && root ? getCagedZones(root) : undefined}
        />

        <PentatonicWidget
          activePentKeys={activePentKeys}
          pentWidgetMode={pentWidgetMode}
          pentModeSynced={pentModeSynced}
          recognizedPentKeys={new Set()}
          onKeyToggle={key => setActivePentKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
          )}
          onModeChange={m => { setPentWidgetMode(m); setPentModeSynced(false); }}
          show={showPentatonicWidget}
          onToggle={() => setShowPentatonicWidget(v => !v)}
        />
      </>)}

      {/* Lick Visualizer mode */}
      {viewMode === 'lick' && <LickVisualizerPanel />}

      {/* Chords/Progressions mode */}
      {viewMode === 'chords' && (
        <ChordsProgressionPanel initialRoot={root} initialMode={mode} />
      )}
    </div>
  );
}
