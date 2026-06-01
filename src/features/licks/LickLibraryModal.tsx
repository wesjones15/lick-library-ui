import { useState, useEffect } from 'react';
import { getAllLicks, type LickSummary } from '../../core/api/client';
import { C_BLACK_BG, C_DANGER_TEXT_SOFT, C_GRAY_BORDER_100, C_GRAY_BORDER_200, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_800, C_PRIMARY_BG_SOFT, C_PRIMARY_BG_SUBTLE, C_PRIMARY_BORDER_MID, C_PRIMARY_TEXT_DARK, C_WHITE_BG } from '../../core/colors';

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
      className={`fixed inset-0 z-50 flex items-center justify-center ${C_BLACK_BG}/40`}
      onClick={onClose}
    >
      <div
        className={`${C_WHITE_BG} rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${C_GRAY_BORDER_100}`}>
          <h2 className={`text-base font-semibold ${C_GRAY_TEXT_800}`}>Lick Library</h2>
          <button
            onClick={onClose}
            className={`${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} text-xl leading-none`}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {loading && <p className={`text-sm ${C_GRAY_TEXT_400} text-center py-6`}>Loading…</p>}
          {error && <p className={`text-sm ${C_DANGER_TEXT_SOFT} text-center py-6`}>{error}</p>}
          {!loading && !error && licks.length === 0 && (
            <p className={`text-sm ${C_GRAY_TEXT_400} text-center py-6`}>No licks saved yet.</p>
          )}
          {licks.map(lick => (
            <button
              key={lick.id}
              onClick={() => onSelect(lick.rawTab)}
              className={`w-full text-left border ${C_GRAY_BORDER_200} rounded-lg px-4 py-3 hover:${C_PRIMARY_BORDER_MID} hover:${C_PRIMARY_BG_SOFT} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {lick.mode && (
                  <span className={`text-xs ${C_PRIMARY_BG_SUBTLE} ${C_PRIMARY_TEXT_DARK} rounded px-1.5 py-0.5 font-medium`}>
                    {lick.mode}
                  </span>
                )}
                <span className={`text-xs ${C_GRAY_TEXT_400} font-mono`}>{lick.intervalDisplayString}</span>
              </div>
              <div className={`font-mono text-xs ${C_GRAY_TEXT_600} leading-tight`}>
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
