import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLick } from '../api/client';
import type { LickDetail } from '../api/client';
import KeySelector from '../components/KeySelector';
import PositionTab from '../components/PositionTab';

function modeLabel(mode: string) {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

const MODE_INTERVALS: Record<string, string> = {
  IONIAN:     '1  2  3  4  5  6  7',
  DORIAN:     '1  2  b3  4  5  6  b7',
  PHRYGIAN:   '1  b2  b3  4  5  b6  b7',
  LYDIAN:     '1  2  3  #4  5  6  7',
  MIXOLYDIAN: '1  2  3  4  5  6  b7',
  AEOLIAN:    '1  2  b3  4  5  b6  b7',
  LOCRIAN:    '1  b2  b3  4  b5  b6  b7',
};

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [key, setKey] = useState('A');
  const [algo, setAlgo] = useState<'greedy' | 'dfs'>('greedy');
  const [lick, setLick] = useState<LickDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getLick(id, key, algo)
      .then(setLick)
      .catch(() => setError('Failed to load positions.'))
      .finally(() => setLoading(false));
  }, [id, key, algo]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/" className="text-indigo-600 text-sm hover:underline mb-8 inline-block">
        ← Back to library
      </Link>

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
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
                {(['greedy', 'dfs'] as const).map(a => (
                  <button key={a} onClick={() => setAlgo(a)}
                    className={`px-3 py-1.5 ${algo === a ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {a === 'greedy' ? 'Greedy' : 'DFS'}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500">Key:</span>
              <KeySelector value={key} onChange={setKey} />
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

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Positions in {key}
        </p>
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {!loading && lick && lick.positions.length === 0 && (
          <p className="text-gray-400 text-sm">No positions found for this key.</p>
        )}
        <div className="flex flex-col gap-4">
          {lick?.positions.map((pos, i) => (
            <PositionTab key={i} tabString={pos.tabString} />
          ))}
        </div>
      </div>
    </div>
  );
}
