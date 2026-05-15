import { useState, useEffect } from 'react';

interface ChordCardProps {
  rootDisplay: string;
  quality: string;
  label: string;
  voicings: string[];
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
      <pre className="text-[9px] leading-[1.5] font-mono text-gray-800 whitespace-pre flex-1">
        {voicings[idx] ?? '???'}
      </pre>
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
