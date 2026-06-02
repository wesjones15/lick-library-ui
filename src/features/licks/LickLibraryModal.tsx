import { useState, useEffect } from 'react';
import { getAllLicks, type LickSummary } from '../../core/api/client';

interface Props {
  onSelect: (rawTab: string) => void;
  onClose: () => void;
}

export default function LickLibraryModal({ onSelect, onClose }: Props) {
  const [licks, setLicks] = useState<LickSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllLicks()
      .then(setLicks)
      .catch(() => setError('Failed to load licks'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Lick Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
          {error && <p className="text-sm text-danger-500 text-center py-6">{error}</p>}
          {!loading && !error && licks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No licks saved yet.</p>
          )}
          {licks.map(lick => (
            <button
              key={lick.id}
              onClick={() => onSelect(lick.rawTab)}
              className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:border-primary-400 hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                {lick.mode && (
                  <span className="text-xs bg-primary-100 text-primary-700 rounded px-1.5 py-0.5 font-medium">
                    {lick.mode}
                  </span>
                )}
                <span className="text-xs text-gray-400 font-mono">{lick.intervalDisplayString}</span>
              </div>
              <div className="font-mono text-xs text-gray-600 leading-tight">
                {lick.rawTab.split('\n').map((line, i) => (
                  <div key={i} className="truncate">{line}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
