import { useState, useEffect } from 'react';
import { getLick } from '../../core/api/client';
import type { PositionResponse } from '../../core/api/client';

interface Props {
  lickId: string | null;
  rawTab: string;
  currentKey: string | null;
  semitones: number;
  fontSize: number;
}

function shiftTabFrets(tab: string, semitones: number): string {
  return tab.split('\n').map(line => {
    if (line.length < 2) return line;
    const prefix = line.slice(0, 2);
    const body = line.slice(2);
    return prefix + body.replace(/\d+/g, n => String(Math.max(0, parseInt(n, 10) + semitones)));
  }).join('\n');
}

function renderColoredTab(tab: string, fontSize: number): React.ReactNode {
  return (
    <div style={{ fontSize: `${fontSize}px`, fontFamily: 'monospace' }}>
      {tab.split('\n').map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre' }}>
          <span style={{ color: '#ef4444' }}>{line[0] ?? ''}</span>
          <span style={{ color: '#4b5563' }}>{line.slice(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SongLickCard({ lickId, rawTab, currentKey, semitones, fontSize }: Props) {
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

  if (!lickId) {
    const tab = semitones !== 0 ? shiftTabFrets(rawTab, semitones) : rawTab;
    return renderColoredTab(tab, fontSize);
  }

  const hasPositions = positions.length > 0;
  const displayTab = hasPositions
    ? positions[posIdx].tabString
    : semitones !== 0 ? shiftTabFrets(rawTab, semitones) : rawTab;

  return (
    <div className="my-1">
      <div className={loading ? 'opacity-50' : ''}>
        {renderColoredTab(displayTab, fontSize)}
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
