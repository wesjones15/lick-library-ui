import { useState, useEffect, useRef, useMemo } from 'react';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from '../../core/components/GuitarNeck';
import { getScalePositions } from '../../core/api/client';
import { usePitchDetection } from './usePitchDetection';
import { NOTE_KEYS, formatNoteEnum, getStringCount, getStringLabels, GUITAR_OPEN_MIDI, MODES_WITH_LABELS } from '../../core/music';
import { BTN, SELECT } from '../../core/ui';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import type { InstrumentName } from '../../core/useInstrument';

const FRET_COUNT = 12;

function blankScaleDots(n: number): NeckDot[][] {
  return Array.from({ length: n }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

function midiToPositions(midi: number): Array<{ string: number; fret: number }> {
  const result: Array<{ string: number; fret: number }> = [];
  for (let s = 0; s < OPEN_MIDI.length; s++) {
    const fret = midi - GUITAR_OPEN_MIDI[s];
    if (fret >= 0 && fret <= FRET_COUNT) result.push({ string: s, fret });
  }
  return result;
}


interface CurrentNote { string: number; fret: number; degree: number; }

export default function LivePage() {
  const [root, setRoot] = useState('C');
  const [mode, setMode] = useState('IONIAN');
  const [instrument, setInstrument] = useState('GUITAR');
  const [scaleDots, setScaleDots] = useState<NeckDot[][]>(() => blankScaleDots(6));
  const [currentNote, setCurrentNote] = useState<CurrentNote | null>(null);
  const [listening, setListening] = useState(false);
  const noteHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { midiNote, error: micError } = usePitchDetection(listening);

  useEffect(() => {
    const sc = getStringCount(instrument);
    if (!root) { setScaleDots(blankScaleDots(sc)); return; }
    getScalePositions(root, mode, instrument).then(res => {
      const next = blankScaleDots(sc);
      for (const pos of res.positions) {
        if (pos.string >= 0 && pos.string < sc && pos.fret >= 0 && pos.fret <= FRET_COUNT) {
          next[pos.string][pos.fret] = {
            degree: pos.degree as 1 | 2 | 3 | 4 | 5 | 6 | 7,
            active: false,
            note: formatNoteEnum(pos.note),
          };
        }
      }
      setScaleDots(next);
      setCurrentNote(null);
    }).catch(() => {});
  }, [root, mode, instrument]);

  const allCandidates = useMemo<{
    best: Map<string, { candidateColor: string; ownNote: boolean }>;
    second: Map<string, { candidateColor: string }>;
    third: Map<string, { candidateColor: string }>;
  }>(() => {
    const empty = { best: new Map(), second: new Map(), third: new Map() };
    if (!currentNote) return empty;

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
  }, [scaleDots, currentNote]);

  const bestCandidates = allCandidates.best;
  const secondCandidates = allCandidates.second;
  const thirdCandidates = allCandidates.third;

  const dots = useMemo<NeckDot[][]>(() => {
    return scaleDots.map((row, s) =>
      row.map((dot, f) => {
        if (dot.degree === null) return dot;
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
        };
      })
    );
  }, [scaleDots, currentNote, allCandidates]);

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

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-900">Live</h1>

        <select className={SELECT} value={root} onChange={e => setRoot(e.target.value)}>
          <option value="">— Key —</option>
          {NOTE_KEYS.map(k => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <select className={SELECT} value={mode} onChange={e => setMode(e.target.value)}>
          {MODES_WITH_LABELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <InstrumentSelector
          instrument={instrument as InstrumentName}
          onInstrumentChange={name => { setInstrument(name); setCurrentNote(null); }}
          excludeCustom
          compact
        />

        <button
          className={`${BTN} ${listening
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

      <GuitarNeck
        dots={dots}
        fretCount={FRET_COUNT}
        stringLabels={getStringLabels(instrument)}
      />
    </div>
  );
}
