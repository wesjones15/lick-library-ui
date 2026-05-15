import { useState, useEffect } from 'react';
import ChordDiagram from './ChordDiagram';
import type { ChordFrets } from '../../core/api/client';

interface ChordCardProps {
  rootDisplay: string;
  quality: string;
  label: string;
  voicings: ChordFrets[];
}

export default function ChordCard({ rootDisplay, quality, label, voicings }: ChordCardProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [voicings]);

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white flex flex-col gap-2 min-h-[160px]">
      <div>
        <div className="font-semibold text-gray-900 text-sm">{rootDisplay}{quality}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        {voicings.length > 0
          ? <ChordDiagram frets={voicings[idx]} width={140} />
          : <span className="text-gray-300 text-sm">???</span>
        }
      </div>
      {voicings.length > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <button
            className="hover:text-gray-600 px-1"
            onClick={() => setIdx(i => (i - 1 + voicings.length) % voicings.length)}
          >‹</button>
          <span>{idx + 1}/{voicings.length}</span>
          <button
            className="hover:text-gray-600 px-1"
            onClick={() => setIdx(i => (i + 1) % voicings.length)}
          >›</button>
        </div>
      )}
    </div>
  );
}
