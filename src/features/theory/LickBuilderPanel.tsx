import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GuitarNeck, { type NeckDot, DEGREE_COLORS } from './GuitarNeck';
import { uploadLick, getScalePositions } from '../../core/api/client';
import { NOTE_KEYS, MODES, MODE_LABELS, formatNoteEnum, getStringCount, getStringLabels } from '../../core/music';
import { BTN } from '../../core/ui';
import InstrumentSelector from '../../components/InstrumentSelector';
import type { InstrumentName } from '../../core/useInstrument';
import {
  FRET_COUNT,
  type TabColumn,
  computeNoteName,
  blankDots,
  buildNormalizedTab,
  normalizeTab,
} from './lickUtils';


export default function LickBuilderPanel() {
  const navigate = useNavigate();

  const [builtCols, setBuiltCols] = useState<{ string: number; fret: number }[][]>([]);
  const [builtTabText, setBuiltTabText] = useState('');
  const [buildRoot, setBuildRoot] = useState('');
  const [buildMode, setBuildMode] = useState('IONIAN');
  const [scaleDots, setScaleDots] = useState<NeckDot[][]>(() => blankDots(6));
  const [buildCurrentNote, setBuildCurrentNote] = useState<{ string: number; fret: number; degree: number } | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [chordDetect, setChordDetect] = useState(false);
  const [buildSaveLoading, setBuildSaveLoading] = useState(false);
  const [buildSaveError, setBuildSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [instrument, setInstrument] = useState('GUITAR');
  const stringCount = getStringCount(instrument);
  const buildLabels = getStringLabels(instrument).map(l => l + '|');

  const pendingNotesRef = useRef<{ string: number; fret: number }[]>([]);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scale overlay fetch
  useEffect(() => {
    if (!buildRoot) { setScaleDots(blankDots(stringCount)); return; }
    getScalePositions(buildRoot, buildMode, instrument).then(res => {
      const next = blankDots(stringCount);
      for (const pos of res.positions) {
        if (pos.string >= 0 && pos.string < stringCount && pos.fret >= 0 && pos.fret <= FRET_COUNT) {
          next[pos.string][pos.fret] = {
            degree: pos.degree as 1 | 2 | 3 | 4 | 5 | 6 | 7,
            active: false,
            note: formatNoteEnum(pos.note),
          };
        }
      }
      setScaleDots(next);
    }).catch(() => {});
  }, [buildRoot, buildMode, instrument, stringCount]);

  const commitPendingColumn = useCallback(() => {
    if (pendingNotesRef.current.length === 0) return;
    const notes = pendingNotesRef.current.slice();
    pendingNotesRef.current = [];
    setBuiltCols(prev => {
      const newCols = [...prev, notes];
      const tabCols: TabColumn[] = newCols.map(col => ({ isRest: false, notes: col }));
      setBuiltTabText(buildNormalizedTab(buildLabels, tabCols));
      return newCols;
    });
  }, [buildLabels]);

  // Flush pending chord on Stop
  useEffect(() => {
    if (!isBuilding) {
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
      commitPendingColumn();
      setBuildCurrentNote(null);
    } else {
      if (buildHighlightTimerRef.current) {
        clearTimeout(buildHighlightTimerRef.current);
        buildHighlightTimerRef.current = null;
      }
    }
  }, [isBuilding, commitPendingColumn]);

  const handleNeckClick = useCallback((si: number, fret: number) => {
    const degree = scaleDots[si]?.[fret]?.degree ?? 1;
    setBuildCurrentNote({ string: si, fret, degree });
    if (!isBuilding) {
      if (buildHighlightTimerRef.current) clearTimeout(buildHighlightTimerRef.current);
      buildHighlightTimerRef.current = setTimeout(() => setBuildCurrentNote(null), 3000);
      return;
    }

    if (!chordDetect) {
      setBuiltCols(prev => {
        const newCols = [...prev, [{ string: si, fret }]];
        const tabCols: TabColumn[] = newCols.map(col => ({ isRest: false, notes: col }));
        setBuiltTabText(buildNormalizedTab(buildLabels, tabCols));
        return newCols;
      });
      return;
    }

    if (pendingNotesRef.current.some(n => n.string === si)) {
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
      commitPendingColumn();
    }
    pendingNotesRef.current = [...pendingNotesRef.current, { string: si, fret }];
    if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    chordTimerRef.current = setTimeout(() => commitPendingColumn(), 1500);
  }, [isBuilding, chordDetect, scaleDots, commitPendingColumn, buildLabels]);

  const handleSaveBuiltLick = useCallback(async () => {
    if (!builtTabText.trim()) return;
    setBuildSaveLoading(true);
    setBuildSaveError(null);
    try {
      const normalized = normalizeTab(builtTabText);
      await uploadLick({
        rawTab: normalized,
        inputKey: buildRoot || undefined,
        mode: buildRoot ? buildMode : undefined,
        instrument,
      });
      navigate('/lick/visualizer', { state: { preloadTab: normalized } });
    } catch (e) {
      setBuildSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBuildSaveLoading(false);
    }
  }, [builtTabText, buildRoot, buildMode, instrument, navigate]);

  // Candidate notes near the current build note
  const buildCandidates = useMemo(() => {
    const empty = { best: new Map<string, { candidateColor: string; ownNote: boolean }>(), second: new Map<string, { candidateColor: string }>(), third: new Map<string, { candidateColor: string }>() };
    if (!buildCurrentNote) return empty;
    if (scaleDots[buildCurrentNote.string]?.[buildCurrentNote.fret]?.degree === null) return empty;
    const byDegree = new Map<number, Array<{ string: number; fret: number; dist: number }>>();
    scaleDots.forEach((row, s) => {
      row.forEach((dot, f) => {
        if (!dot.degree) return;
        if (s === buildCurrentNote.string && f === buildCurrentNote.fret) return;
        const dist = Math.hypot(f - buildCurrentNote.fret, s - buildCurrentNote.string);
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
      const isOwn = degree === buildCurrentNote.degree;
      if (arr[0]) best.set(`${arr[0].string},${arr[0].fret}`, { candidateColor: color, ownNote: isOwn });
      if (arr[1]) second.set(`${arr[1].string},${arr[1].fret}`, { candidateColor: color });
      if (arr[2]) third.set(`${arr[2].string},${arr[2].fret}`, { candidateColor: color });
    });
    return { best, second, third };
  }, [scaleDots, buildCurrentNote]);

  // Build neck dots: scale overlay + pending chord notes + currentNote + candidates
  // Off-scale committed notes (builtCols with degree:null) stay as small grey dots — no degree:1 override
  const buildDots = useMemo(() => {
    const d = scaleDots.map(row => row.map(dot => ({ ...dot })));
    for (const { string: s, fret: f } of pendingNotesRef.current) {
      if (s >= 0 && s < stringCount && f >= 0 && f <= FRET_COUNT) {
        const deg = d[s][f].degree ?? 1;
        d[s][f] = { ...d[s][f], degree: deg, active: true };
      }
    }
    if (buildCurrentNote) {
      const { string: s, fret: f } = buildCurrentNote;
      if (s >= 0 && s < stringCount && f >= 0 && f <= FRET_COUNT) {
        if (scaleDots[s][f].degree === null) {
          d[s][f] = { degree: null, active: true, note: computeNoteName(s, f, instrument) };
        } else {
          d[s][f] = { ...d[s][f], active: true };
        }
      }
      buildCandidates.best.forEach((info, key) => {
        const [ks, kf] = key.split(',').map(Number);
        if (d[ks][kf].degree) d[ks][kf] = { ...d[ks][kf], candidate: true, candidateColor: info.candidateColor };
      });
      buildCandidates.second.forEach((info, key) => {
        const [ks, kf] = key.split(',').map(Number);
        if (d[ks][kf].degree && !d[ks][kf].candidate) d[ks][kf] = { ...d[ks][kf], secondCandidate: true, candidateColor: info.candidateColor };
      });
      buildCandidates.third.forEach((info, key) => {
        const [ks, kf] = key.split(',').map(Number);
        if (d[ks][kf].degree && !d[ks][kf].candidate && !d[ks][kf].secondCandidate) d[ks][kf] = { ...d[ks][kf], thirdCandidate: true, candidateColor: info.candidateColor };
      });
    }
    return d;
  }, [scaleDots, buildCurrentNote, buildCandidates, stringCount, instrument]);

  return (
    <div className="py-3">
      <GuitarNeck
        dots={buildDots}
        fretCount={FRET_COUNT}
        onDotClick={handleNeckClick}
        stringLabels={getStringLabels(instrument)}
      />

      <div className="mt-3">
        <div className="flex gap-2 items-center mb-3 flex-wrap">
          <select
            value={buildRoot}
            onChange={e => setBuildRoot(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:border-indigo-400"
          >
            <option value="">— None —</option>
            {NOTE_KEYS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            value={buildMode}
            onChange={e => setBuildMode(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:border-indigo-400"
          >
            {MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
          </select>
          <InstrumentSelector
            instrument={instrument as InstrumentName}
            onInstrumentChange={(name) => {
              setInstrument(name);
              setBuiltCols([]);
              setBuiltTabText('');
              setBuildCurrentNote(null);
            }}
            excludeCustom
            compact
          />
          <button
            onClick={() => setIsBuilding(b => !b)}
            className={`${BTN} ${isBuilding
              ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
          >
            {isBuilding ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={() => setChordDetect(c => !c)}
            title="Chord detection: accumulate notes within 1.5s into one column"
            className={`${BTN} ${chordDetect
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            ♭³
          </button>
        </div>
        <textarea
          value={builtTabText}
          onChange={e => setBuiltTabText(e.target.value)}
          spellCheck={false}
          className="font-mono text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none w-full max-w-lg"
          rows={6}
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSaveBuiltLick}
            disabled={!builtTabText.trim() || buildSaveLoading}
            className={`${BTN} bg-green-600 text-white border-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {buildSaveLoading ? 'Saving…' : 'Save Lick'}
          </button>
          <button
            onClick={() => { setBuiltCols([]); setBuiltTabText(''); setBuildCurrentNote(null); }}
            className={`${BTN} bg-white text-gray-600 border-gray-300 hover:bg-gray-50`}
          >
            Clear
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(builtTabText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            disabled={!builtTabText.trim()}
            title="Copy tab to clipboard"
            className={`${BTN} ${copied ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        </div>
        {buildSaveError && <p className="text-sm text-red-500 mt-1">{buildSaveError}</p>}
      </div>
    </div>
  );
}
