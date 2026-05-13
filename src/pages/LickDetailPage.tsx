import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLick } from '../api/client';
import type { LickDetail } from '../api/client';
import KeySelector from '../components/KeySelector';
import InstrumentSelector from '../components/InstrumentSelector';
import LickPositionTab from '../components/LickPositionTab';
import { useInstrument } from '../hooks/useInstrument';

function modeLabel(mode: string) {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

const KEY_LABELS: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#', E: 'E',
  F: 'F', F_SHARP: 'F#', G: 'G', G_SHARP: 'G#', A: 'A',
  B_FLAT: 'Bb', B: 'B',
};

const INSTRUMENT_LABELS: Record<string, string> = {
  GUITAR:   'Standard Guitar',
  DROP_D:   'Drop D',
  OPEN_G:   'Open G',
  OPEN_D:   'Open D',
  DADGAD:   'DADGAD',
  BASS:     'Bass',
  UKULELE:  'Ukulele',
  MANDOLIN: 'Mandolin',
  BANJO:    'Banjo',
  CUSTOM:   'Custom',
};

const MODE_INTERVALS: Record<string, string> = {
  IONIAN:     '1  2  3  4  5  6  7',
  DORIAN:     '1  2  b3  4  5  6  b7',
  PHRYGIAN:   '1  b2  b3  4  5  b6  b7',
  LYDIAN:     '1  2  3  #4  5  6  7',
  MIXOLYDIAN: '1  2  3  4  5  6  b7',
  AEOLIAN:    '1  2  b3  4  5  b6  b7',
  LOCRIAN:    '1  b2  b3  4  b5  b6  b7',
};

export default function LickDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [key, setKey] = useState('A');
  const [algo, setAlgo] = useState<'greedy' | 'chord' | 'dfs'>('greedy');
  const [lick, setLick] = useState<LickDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrumentError, setInstrumentError] = useState<string | null>(null);

  const { instrument, customTuning, setInstrument, setCustomTuning } = useInstrument();

  const [appliedTuning, setAppliedTuning] = useState(customTuning);
  const applyTuning = () => setAppliedTuning(customTuning);

  useEffect(() => {
    if (!id) return;
    if (instrument === 'CUSTOM' && !appliedTuning.trim()) return;
    setLoading(true);
    setError(null);
    setInstrumentError(null);
    getLick(id, key, algo, instrument, instrument === 'CUSTOM' ? appliedTuning : undefined)
      .then(setLick)
      .catch(err => {
        if (err.message === '400')
          setInstrumentError('Invalid tuning — use space-separated note names, e.g. "E A D G B E".');
        else setError('Failed to load positions.');
      })
      .finally(() => setLoading(false));
  }, [id, key, algo, instrument, appliedTuning]);

  const tabLineLength = lick?.positions?.[0]?.tabString.split('\n')[0]?.length ?? 20;
  const minCellWidth = Math.round(tabLineLength * 8.4 + 32);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="max-w-2xl">
        {lick && (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm text-gray-500">{lick.intervalDisplayString}</span>
                {lick.mode && (
                  <span className="relative group w-fit">
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium cursor-default">
                      {modeLabel(lick.mode)}
                    </span>
                    <span className="absolute left-0 top-full mt-1 px-2 py-1 text-xs font-mono bg-gray-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {MODE_INTERVALS[lick.mode]}
                    </span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-3">
                <InstrumentSelector
                  instrument={instrument}
                  customTuning={customTuning}
                  onInstrumentChange={setInstrument}
                  onCustomTuningChange={setCustomTuning}
                  onSubmit={applyTuning}
                  error={instrumentError}
                />
                <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm self-start">
                  {(['greedy', 'chord', 'dfs'] as const).map(a => (
                    <button key={a} onClick={() => setAlgo(a)}
                      className={`px-3 py-1.5 ${algo === a ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {{ greedy: 'Greedy', chord: 'Chord', dfs: 'DFS' }[a]}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500 self-start pt-2">Key:</span>
                <div className="self-start"><KeySelector value={key} onChange={setKey} /></div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Original tab
              </p>
              <pre className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre leading-tight">
                {lick.rawTab}
              </pre>
            </div>
          </>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Positions in{' '}
          <span className="normal-case">{KEY_LABELS[key] ?? key}</span>
          {' — '}
          <span className="normal-case font-medium text-gray-500">
            {instrument === 'CUSTOM'
              ? (appliedTuning.trim() || 'Custom')
              : (INSTRUMENT_LABELS[instrument] ?? instrument)}
          </span>
        </p>
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {!loading && lick && lick.positions.length === 0 && (
          <p className="text-gray-400 text-sm">No positions found for this key.</p>
        )}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minCellWidth}px, 1fr))` }}
        >
          {lick?.positions.map((pos, i) => (
            <LickPositionTab key={i} tabString={pos.tabString} />
          ))}
        </div>
      </div>
    </div>
  );
}
