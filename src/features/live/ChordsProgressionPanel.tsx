import { useState, useEffect } from 'react';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from './GuitarNeck';
import { getDiatonicChords, type DiatonicChord } from './diatonicUtils';
import { getChordVoicings, type ChordFrets } from '../../core/api/client';
import { NOTE_KEYS } from '../../core/music';

const STRING_COUNT = 6;
const FRET_COUNT = 12;

const MODES = [
  { value: 'IONIAN',     label: 'Major (Ionian)'         },
  { value: 'DORIAN',     label: 'Dorian'                 },
  { value: 'PHRYGIAN',   label: 'Phrygian'               },
  { value: 'LYDIAN',     label: 'Lydian'                 },
  { value: 'MIXOLYDIAN', label: 'Mixolydian'             },
  { value: 'AEOLIAN',    label: 'Natural Minor (Aeolian)' },
  { value: 'LOCRIAN',    label: 'Locrian'                },
];

const selectClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white';

function blankDots(): NeckDot[][] {
  return Array.from({ length: STRING_COUNT }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

// Map a ChordFrets array (index 0 = low E = string 0) to NeckDot[][]
// Color dots by interval degree relative to chord root (degree 1 = red, etc.)
function chordFretsToNeckDots(frets: ChordFrets): NeckDot[][] {
  const dots = blankDots();
  // Collect fretted positions to determine which degree each note is
  // For simplicity, mark all chord notes as degree 1 (root color) by default;
  // sort fretted positions by pitch to assign interval roles (root, 3rd, 5th)
  const positions: Array<{ string: number; fret: number }> = [];
  frets.forEach((f, s) => {
    if (f !== null && f >= 0 && f <= FRET_COUNT) positions.push({ string: s, fret: f });
  });
  // Degree assignment: lowest fret note = root (1), then 3 (5th), then 5 (3rd), etc.
  // Simple approach: assign degree 1 to root string notes; others get 3 or 5
  positions.forEach(({ string: s, fret: f }) => {
    dots[s][f] = { degree: 1, active: true };
  });
  return dots;
}

interface Props {
  initialRoot?: string;
  initialMode?: string;
}

export default function ChordsProgressionPanel({ initialRoot = 'C', initialMode = 'IONIAN' }: Props) {
  const [root, setRoot] = useState(initialRoot);
  const [mode, setMode] = useState(initialMode);
  const [selectedDegree, setSelectedDegree] = useState<number | null>(null);
  const [voicingDots, setVoicingDots] = useState<NeckDot[][] | null>(null);
  const [voicingIdx, setVoicingIdx] = useState(0);
  const [allVoicings, setAllVoicings] = useState<ChordFrets[]>([]);
  const [loadingVoicing, setLoadingVoicing] = useState(false);

  const chords = getDiatonicChords(root, mode);

  // Reset selection when root or mode changes
  useEffect(() => {
    setSelectedDegree(null);
    setVoicingDots(null);
    setAllVoicings([]);
    setVoicingIdx(0);
  }, [root, mode]);

  async function selectChord(chord: DiatonicChord) {
    if (selectedDegree === chord.degree) {
      setSelectedDegree(null);
      setVoicingDots(null);
      return;
    }
    setSelectedDegree(chord.degree);
    setLoadingVoicing(true);
    try {
      const voicings = await getChordVoicings(chord.rootApi, chord.apiSuffix);
      if (voicings.length > 0) {
        setAllVoicings(voicings.map(v => v.frets));
        setVoicingIdx(0);
        setVoicingDots(chordFretsToNeckDots(voicings[0].frets));
      } else {
        setAllVoicings([]);
        setVoicingDots(null);
      }
    } catch {
      setVoicingDots(null);
    } finally {
      setLoadingVoicing(false);
    }
  }

  function changeVoicing(delta: number) {
    const next = voicingIdx + delta;
    if (next < 0 || next >= allVoicings.length) return;
    setVoicingIdx(next);
    setVoicingDots(chordFretsToNeckDots(allVoicings[next]));
  }

  const qualityBadgeColor: Record<string, string> = {
    maj: 'bg-blue-100 text-blue-700',
    min: 'bg-purple-100 text-purple-700',
    dim: 'bg-red-100 text-red-700',
    aug: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="py-6">
      {/* Key + Mode selectors */}
      <div className="flex gap-3 items-center flex-wrap mb-6">
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
      </div>

      {/* Chord cards */}
      <div className="flex gap-3 flex-wrap mb-6">
        {chords.map(chord => {
          const isSelected = selectedDegree === chord.degree;
          const degreeColor = DEGREE_COLORS[chord.degree] ?? '#9ca3af';
          return (
            <button
              key={chord.degree}
              onClick={() => selectChord(chord)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-colors min-w-[64px] ${
                isSelected ? 'border-gray-800 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-400'
              }`}
            >
              {/* Degree color dot */}
              <div
                style={{ width: 10, height: 10, borderRadius: '50%', background: degreeColor, marginBottom: 4 }}
              />
              {/* Roman numeral */}
              <span className={`text-base font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                {chord.roman}
              </span>
              {/* Chord name */}
              <span className="text-sm text-gray-500 mt-0.5">
                {chord.rootDisplay}{chord.quality !== 'maj' ? chord.apiSuffix || '' : ''}
              </span>
              {/* Quality badge */}
              <span className={`text-xs rounded px-1 mt-1 ${qualityBadgeColor[chord.quality] ?? ''}`}>
                {chord.quality}
              </span>
            </button>
          );
        })}
      </div>

      {/* Voicing display */}
      {selectedDegree !== null && (
        <div>
          {loadingVoicing && <p className="text-sm text-gray-400 mb-2">Loading voicing…</p>}
          {!loadingVoicing && voicingDots && (
            <>
              <GuitarNeck dots={voicingDots} fretCount={FRET_COUNT} />
              {allVoicings.length > 1 && (
                <div className="flex items-center gap-3 mt-3">
                  <button
                    disabled={voicingIdx === 0}
                    onClick={() => changeVoicing(-1)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >‹</button>
                  <span className="text-sm text-gray-500">
                    Voicing {voicingIdx + 1} / {allVoicings.length}
                  </span>
                  <button
                    disabled={voicingIdx === allVoicings.length - 1}
                    onClick={() => changeVoicing(1)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >›</button>
                </div>
              )}
            </>
          )}
          {!loadingVoicing && !voicingDots && (
            <p className="text-sm text-gray-400">No voicing found for this chord.</p>
          )}
        </div>
      )}

      {selectedDegree === null && (
        <p className="text-sm text-gray-400">Click a chord to see its voicing on the neck.</p>
      )}
    </div>
  );
}
