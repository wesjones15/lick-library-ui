import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLick } from '../../core/api/client';
import LoadingOverlay from '../../core/components/LoadingOverlay';
import type { LickDetail } from '../../core/api/client';
import KeySelector from '../../core/components/KeySelector';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import LickPositionTab from './LickPositionTab';
import { useInstrument } from '../../core/useInstrument';

function modeLabel(mode: string) {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

import { formatNoteEnum, INSTRUMENT_LIST, MODE_INTERVALS } from '../../core/music';

export default function LickDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [key, setKey] = useState('A');
  const [algo, setAlgo] = useState<'greedy' | 'chord' | 'dfs'>('greedy');
  const [lick, setLick] = useState<LickDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrumentError, setInstrumentError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

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
  }, [id, key, algo, instrument, appliedTuning, attempt]);

  // Cover the page until the lick first arrives; later key/algo changes show the inline "Loading…"
  const waitingForTuning = instrument === 'CUSTOM' && !appliedTuning.trim();
  const overlayState = lick || waitingForTuning || instrumentError ? 'ready' : error ? 'error' : 'loading';

  const tabLineLength = lick?.positions?.[0]?.tabString.split('\n')[0]?.length ?? 20;
  const minCellWidth = Math.round(tabLineLength * 8.4 + 32);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <LoadingOverlay state={overlayState} onRetry={() => setAttempt(n => n + 1)} />
      <div className="max-w-2xl">
        {lick && (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm text-gray-700">{lick.intervalDisplayString}</span>
                {lick.mode && (
                  <span className="relative group w-fit">
                    <span className="text-xs px-2 py-0.5 bg-brand-2 text-brand-7 rounded-full font-medium cursor-default">
                      {modeLabel(lick.mode)}
                    </span>
                    <span className="absolute left-0 top-full mt-1 px-2 py-1 text-xs font-mono bg-gray-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {(MODE_INTERVALS[lick.mode] ?? []).join('  ')}
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
                <div className="flex rounded-lg overflow-hidden border-2 border-gray-400 text-sm self-start">
                  {(['greedy', 'chord', 'dfs'] as const).map(a => (
                    <button key={a} onClick={() => setAlgo(a)}
                      className={`px-3 py-1.5 ${algo === a ? 'bg-brand-6 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                      {{ greedy: 'Greedy', chord: 'Chord', dfs: 'DFS' }[a]}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-700 self-start pt-2">Key:</span>
                <div className="self-start"><KeySelector value={key} onChange={setKey} /></div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2">
                Original tab
              </p>
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 border-2 border-gray-400 rounded-lg p-4 overflow-x-auto whitespace-pre leading-tight">
                {lick.rawTab}
              </pre>
            </div>
          </>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">
          Positions in{' '}
          <span className="normal-case">{formatNoteEnum(key)}</span>
          {' — '}
          <span className="normal-case font-medium text-gray-700">
            {instrument === 'CUSTOM'
              ? (appliedTuning.trim() || 'Custom')
              : (INSTRUMENT_LIST.find(i => i.value === instrument)?.label ?? instrument)}
          </span>
        </p>
        {loading && <p className="text-gray-600 text-sm">Loading…</p>}
        {error && <p className="text-danger-6 text-sm">{error}</p>}
        {!loading && lick && lick.positions.length === 0 && (
          <p className="text-gray-600 text-sm">No positions found for this key.</p>
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
