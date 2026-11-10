import { useState, useEffect, useRef, useMemo } from 'react';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from '../../core/components/GuitarNeck';
import { getPentatonicDegree, getPentatonicNoteSet } from './cagedUtils';
import PentatonicWidget from './PentatonicWidget';
import ChordsWidget from './ChordsWidget';
import ScalesWidget from './ScalesWidget';
import { CAGED_COLORS } from './cagedUtils';
import { placeShape, shapesUpTheNeck, upAndDown, SCALES_FRET_COUNT, type ShapeName } from './scaleShapes';
import { usePitchTracker, type MatchMode } from '../../core/sound/usePitchTracker';
import { getScalePositions } from '../../core/api/client';
import { NOTE_KEYS, CHROMATIC_NOTES, formatNoteEnum, getStringCount, getStringLabels, GUITAR_OPEN_MIDI, MODE_SEMITONES, ROOT_CHROMATIC, MODE_DATA, MODE_INTERVALS } from '../../core/music';
import { useSoundContext } from '../../core/sound/SoundContext';
import { dotToMidi } from '../../core/sound/midiUtils';
import { SELECT } from '../../core/ui';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import type { InstrumentName } from '../../core/useInstrument';

const FRET_COUNT = 12;


function blankScaleDots(n: number): NeckDot[][] {
  return Array.from({ length: n }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}


interface CurrentNote { string: number; fret: number; degree: number; }

export default function TheoryPage() {
  const [root, setRoot] = useState('C');
  const [mode, setMode] = useState('IONIAN');
  const [instrument, setInstrument] = useState('GUITAR');
  const [scaleDots, setScaleDots] = useState<NeckDot[][]>(() => blankScaleDots(6));
  const [currentNote, setCurrentNote] = useState<CurrentNote | null>(null);
  const [highlightedDegrees, setHighlightedDegrees] = useState<Set<number>>(new Set());
  const [showPentatonicWidget, setShowPentatonicWidget] = useState(false);
  const [showChordsWidget, setShowChordsWidget] = useState(false);
  const [chordSelectedPositions, setChordSelectedPositions] = useState<Set<string>>(new Set());
  const [activePentKeys, setActivePentKeys] = useState<string[]>([]);
  const [pentWidgetMode, setPentWidgetMode] = useState(mode);
  const [pentModeSynced, setPentModeSynced] = useState(true);
  const noteHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playMidi, setSoundEnabled, preload } = useSoundContext();

  // ── Scales (CAGED shapes + drill) ──────────────────────────────────────────
  const [showScales, setShowScales] = useState(false);
  const [scaleShape, setScaleShape] = useState<ShapeName>('C');
  const [scalePent, setScalePent] = useState(false);
  const [drill, setDrill] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('pitch');
  const [refNote, setRefNote] = useState(false);
  // Drill position, tied to what it was counted against so a key/mode/shape change restarts it
  const [drillPos, setDrillPos] = useState({ sig: '', idx: 0 });

  const scalesActive = showScales && !!root && instrument === 'GUITAR';
  const fretCount = showScales ? SCALES_FRET_COUNT : FRET_COUNT;

  // The scale API stops at fret 12; frets 13–15 repeat 1–3 an octave up
  const neckScaleDots = useMemo(() => showScales
    ? scaleDots.map(row => [...row, ...row.slice(1, 4).map(d => ({ ...d, active: false }))])
    : scaleDots,
  [showScales, scaleDots]);

  const placed = useMemo(() => scalesActive ? placeShape(scaleShape, root, mode) : null, [scalesActive, scaleShape, root, mode]);

  // Pentatonic = the Theory page's degrees 1 2 3 5 6 of the selected mode
  const shapeNotes = useMemo(() => (placed?.notes ?? []).filter(n =>
    !scalePent || [1, 2, 3, 5, 6].includes(neckScaleDots[n.string]?.[n.fret]?.degree ?? 0)
  ), [placed, scalePent, neckScaleDots]);
  const shapeKeys = useMemo(() => new Set(shapeNotes.map(n => `${n.string},${n.fret}`)), [shapeNotes]);

  const sequence = useMemo(() => drill ? upAndDown(shapeNotes) : [], [drill, shapeNotes]);
  const drillSig = `${root}|${mode}|${scaleShape}|${scalePent}|${drill}`;
  const drillIdx = drillPos.sig === drillSig ? drillPos.idx : 0;
  const target = scalesActive && drill ? sequence[drillIdx] ?? null : null;
  const targetMidi = target?.midi ?? null;

  const rootMidi = useMemo(() => {
    const roots = shapeNotes.filter(n => neckScaleDots[n.string]?.[n.fret]?.degree === 1);
    return roots[0]?.midi ?? null;
  }, [shapeNotes, neckScaleDots]);

  function selectShape(s: ShapeName) {
    setScaleShape(s);
    setDrillPos({ sig: '', idx: 0 });
  }

  function stepShape(dir: 1 | -1) {
    if (!root) return;
    const order = shapesUpTheNeck(root, mode);
    const i = order.indexOf(scaleShape);
    selectShape(order[(i + dir + order.length) % order.length]);
  }

  // Up and down the shape, then on to the next shape
  function advanceNote() {
    if (drillIdx + 1 >= sequence.length) stepShape(1);
    else setDrillPos({ sig: drillSig, idx: drillIdx + 1 });
  }

  const { heard, error: micError, suspended: micSuspended, suppress, resume: resumeMic } =
    usePitchTracker(scalesActive && drill, { target: targetMidi, mode: matchMode, onHit: advanceNote });

  // Reference note: each drill target, or the shape's root when stepping through shapes.
  // The mic ignores input while it sounds so the drill can't hear itself.
  useEffect(() => {
    if (!scalesActive || !drill || !refNote || targetMidi === null) return;
    suppress(800);
    playMidi([targetMidi]);
  }, [scalesActive, drill, refNote, targetMidi, drillIdx, playMidi, suppress]);

  useEffect(() => {
    if (!scalesActive || drill || !refNote || rootMidi === null) return;
    playMidi([rootMidi]);
  }, [scalesActive, drill, refNote, rootMidi, scaleShape, playMidi]);

  function closeScales() {
    setShowScales(false);
    setDrill(false);
  }

  function toggleScales() {
    if (showScales) { closeScales(); return; }
    // Scales, Chords and Pentatonic each repaint the neck, so only one runs at a time
    setShowScales(true);
    setShowChordsWidget(false);
    setChordSelectedPositions(new Set());
    setShowPentatonicWidget(false);
    setActivePentKeys([]);
    setHighlightedDegrees(new Set());
    if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
    setCurrentNote(null);
    if (root) selectShape(shapesUpTheNeck(root, mode)[0]);
  }

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

  useEffect(() => {
    if (pentModeSynced) setPentWidgetMode(mode);
  }, [mode, pentModeSynced]);

  const allCandidates = useMemo<{
    best: Map<string, { candidateColor: string; ownNote: boolean }>;
    second: Map<string, { candidateColor: string }>;
    third: Map<string, { candidateColor: string }>;
  }>(() => {
    const empty = { best: new Map(), second: new Map(), third: new Map() };
    if (!currentNote || highlightedDegrees.size > 0 || showChordsWidget) return empty;

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
  }, [scaleDots, currentNote, highlightedDegrees, showChordsWidget]);

  const bestCandidates = allCandidates.best;
  const secondCandidates = allCandidates.second;
  const thirdCandidates = allCandidates.third;

  const recognizedPentKeys = useMemo<Map<string, 'partial' | 'full'>>(() => {
    if (highlightedDegrees.size < 2 || !root) return new Map();
    const rootIdx = ROOT_CHROMATIC[root] ?? 0;
    const liveSemis = MODE_SEMITONES[mode] ?? MODE_SEMITONES.IONIAN;
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
    if (showScales) {
      return neckScaleDots.map((row, s) => row.map((dot, f) => {
        if (dot.degree === null) return dot;
        const isTarget = target?.string === s && target?.fret === f;
        return { ...dot, active: isTarget, shapeMember: shapeKeys.has(`${s},${f}`) };
      }));
    }
    return scaleDots.map((row, s) =>
      row.map((dot, f) => {
        let pentatonicRings: string[] | undefined;
        let pentatonicOutOfScale: boolean | undefined;

        if (activePentKeys.length > 0) {
          const chromatic = (GUITAR_OPEN_MIDI[s] + f) % 12;
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

        if (showChordsWidget) {
          const posKey = `${s},${f}`;
          const isSelected = chordSelectedPositions.has(posKey);
          if (dot.degree === null) {
            if (isSelected) {
              return { ...dot, active: true, note: CHROMATIC_NOTES[(GUITAR_OPEN_MIDI[s] + f) % 12], pentatonicRings };
            }
            return { ...dot, pentatonicRings };
          }
          return { ...dot, active: false, highlighted: isSelected, candidate: false, pentatonicRings };
        }

        if (dot.degree === null) {
          const note = pentatonicOutOfScale ? CHROMATIC_NOTES[(GUITAR_OPEN_MIDI[s] + f) % 12] : undefined;
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
  }, [scaleDots, currentNote, allCandidates, highlightedDegrees, activePentKeys, pentWidgetMode, showChordsWidget, chordSelectedPositions, showScales, neckScaleDots, target, shapeKeys]);

  function selectNote(s: number, f: number, degree: number) {
    if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
    setCurrentNote({ string: s, fret: f, degree });
    noteHoldTimer.current = setTimeout(() => setCurrentNote(null), 3000);
  }

  function handleDotClick(stringIndex: number, fret: number) {
    if (showScales) {
      // Tap anywhere on the neck: next shape, or (drilling) skip the current note
      if (!scalesActive) return;
      if (drill) advanceNote();
      else stepShape(1);
      return;
    }
    if (showChordsWidget) {
      const key = `${stringIndex},${fret}`;
      setChordSelectedPositions(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          for (const k of next) {
            if (k.startsWith(`${stringIndex},`)) next.delete(k);
          }
          next.add(key);
        }
        return next;
      });
      return;
    }
    if (highlightedDegrees.size > 0) return;
    const dot = scaleDots[stringIndex]?.[fret];
    if (!dot || dot.degree === null) return;
    playMidi([dotToMidi(stringIndex, fret, instrument)]);
    if (currentNote?.string === stringIndex && currentNote?.fret === fret) {
      if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
      setCurrentNote(null);
    } else {
      selectNote(stringIndex, fret, dot.degree);
    }
  }

  const intervalLabels = MODE_INTERVALS[mode] ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 short:py-2">
      {/* On a sideways phone the scale degrees sit beside the controls so the neck fits without scrolling */}
      <div className="short:flex short:flex-wrap short:items-center short:gap-x-4 short:mb-2">
      <div className="flex items-center gap-x-4 gap-y-2 mb-4 short:mb-0 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Theory</h1>

        <select className={SELECT} value={root} onChange={e => setRoot(e.target.value)}>
          <option value="">— Key —</option>
          {NOTE_KEYS.map(k => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <select className={SELECT} value={mode} onChange={e => setMode(e.target.value)}>
          {MODE_DATA.map(m => (
            <option key={m.value} value={m.value}>{m.longLabel}</option>
          ))}
        </select>
        <InstrumentSelector
          instrument={instrument as InstrumentName}
          onInstrumentChange={name => { setInstrument(name); setCurrentNote(null); setHighlightedDegrees(new Set()); if (name !== 'GUITAR') closeScales(); }}
          excludeCustom
          compact
        />
      </div>

      <div className="flex gap-2 items-center flex-wrap mb-6 short:mb-0">
        {intervalLabels.map((label, idx) => {
          const degree = idx + 1;
          const isNoteActive = currentNote?.degree === degree;
          const isDegreeHighlighted = highlightedDegrees.has(degree);
          const lit = isNoteActive || isDegreeHighlighted;
          return (
            <div
              key={degree}
              onClick={() => {
                if (showScales) return;
                setCurrentNote(null);
                if (noteHoldTimer.current) clearTimeout(noteHoldTimer.current);
                setHighlightedDegrees(prev => {
                  const next = new Set(prev);
                  if (next.has(degree)) next.delete(degree);
                  else next.add(degree);
                  return next;
                });
              }}
              className="w-8 h-8 short:w-6 short:h-6"
              style={{
                borderRadius: '50%',
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
            className="px-2 py-1 text-xs rounded border-2 border-gray-400 text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      </div>

      {/* The neck is ~3.1x wider than tall: on short screens, cap its width so its height fits */}
      <div className={`short:mx-auto ${showScales ? 'short:max-w-[calc((100dvh-7.5rem)*3.8)]' : 'short:max-w-[calc((100dvh-7.5rem)*3.1)]'}`}>
        <GuitarNeck
          dots={dots}
          fretCount={fretCount}
          cagedZones={placed ? [{ shape: placed.shape, fretStart: placed.lo, fretEnd: placed.hi, color: CAGED_COLORS[placed.shape] }] : undefined}
          stringLabels={getStringLabels(instrument)}
          onDotClick={handleDotClick}
        />
      </div>

      <div className="flex gap-3 flex-wrap items-start">
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
          onToggle={() => { if (!showPentatonicWidget) closeScales(); setShowPentatonicWidget(v => !v); }}
        />
        <ChordsWidget
          show={showChordsWidget}
          onToggle={() => {
            if (!showChordsWidget) closeScales();
            setShowChordsWidget(v => !v);
            setChordSelectedPositions(new Set());
          }}
          selectedPositions={chordSelectedPositions}
          root={root}
          onClear={() => setChordSelectedPositions(new Set())}
        />
        <ScalesWidget
          show={showScales}
          onToggle={toggleScales}
          disabled={instrument !== 'GUITAR'}
          shape={scaleShape}
          onShape={selectShape}
          onPrev={() => stepShape(-1)}
          onNext={() => stepShape(1)}
          pentatonic={scalePent}
          onPentatonic={setScalePent}
          drill={drill}
          onDrill={v => { setDrill(v); setDrillPos({ sig: '', idx: 0 }); if (v && refNote) preload(); }}
          matchMode={matchMode}
          onMatchMode={setMatchMode}
          refNote={refNote}
          onRefNote={v => { setRefNote(v); if (v) { setSoundEnabled(true); preload(); } }}
          progress={target ? { idx: drillIdx, total: sequence.length } : null}
          heard={heard}
          micError={micError}
          micSuspended={micSuspended}
          onResumeMic={resumeMic}
        />
      </div>
    </div>
  );
}
