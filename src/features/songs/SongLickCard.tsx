import { useState, useEffect } from 'react';
import { getLick } from '../../core/api/client';
import type { PositionResponse } from '../../core/api/client';

interface Props {
  lickId: string | null;
  rawTab: string;
  currentKey: string | null;
  isTransposed: boolean;
  fontSize: number;
}

export default function SongLickCard({ lickId, rawTab, currentKey, isTransposed, fontSize }: Props) {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [posIdx, setPosIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lickId || !currentKey) return;
    setLoading(true);
    getLick(lickId, currentKey)
      .then(detail => {
        setPositions(detail.positions);
        setPosIdx(0);
      })
      .catch(() => setPositions([]))
      .finally(() => setLoading(false));
  }, [lickId, currentKey]);

  const hasPositions = positions.length > 0;
  const displayTab = hasPositions ? positions[posIdx].tabString : rawTab;

  if (!lickId) {
    if (!isTransposed) {
      return (
        <div style={{ fontSize: `${fontSize}px`, whiteSpace: 'pre', color: '#4b5563', fontFamily: 'monospace' }}>
          {rawTab}
        </div>
      );
    }
    return (
      <div
        style={{ fontSize: `${fontSize}px`, fontFamily: 'monospace', color: '#9ca3af', fontStyle: 'italic' }}
        className="py-1"
      >
        [tab unavailable at transposed key]
      </div>
    );
  }

  return (
    <div className="my-1">
      <div style={{ fontSize: `${fontSize}px`, whiteSpace: 'pre', color: '#4b5563', fontFamily: 'monospace' }}
           className={loading ? 'opacity-50' : ''}>
        {displayTab}
      </div>
      {hasPositions && (
        <div className="flex items-center gap-2 mt-0.5">
          <button
            onClick={e => { e.stopPropagation(); setPosIdx(i => (i - 1 + positions.length) % positions.length); }}
            className="text-gray-400 hover:text-indigo-500 text-sm leading-none"
            aria-label="Previous position"
          >
            ‹
          </button>
          <span className="text-[10px] text-gray-400 font-mono">{posIdx + 1}/{positions.length}</span>
          <button
            onClick={e => { e.stopPropagation(); setPosIdx(i => (i + 1) % positions.length); }}
            className="text-gray-400 hover:text-indigo-500 text-sm leading-none"
            aria-label="Next position"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
