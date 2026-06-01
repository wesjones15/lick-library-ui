import { useNavigate } from 'react-router-dom';
import type { LickSummary } from '../../core/api/client';
import { C_DANGER_TEXT_MID, C_DANGER_TEXT_MUTED, C_GRAY_BG_100, C_GRAY_BORDER_200, C_GRAY_TEXT_300, C_GRAY_TEXT_500, C_GRAY_TEXT_700, C_PRIMARY_BG_SUBTLE, C_PRIMARY_BORDER_MID, C_PRIMARY_TEXT, C_PRIMARY_TEXT_DARK, C_PRIMARY_TEXT_SOFT, C_WHITE_BG } from '../../core/colors';

interface Props {
  lick: LickSummary;
  onDelete: () => void;
  onFork: () => void;
  isManaging: boolean;
}

function modeLabel(mode: string) {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

export default function LickCard({ lick, onDelete, onFork, isManaging }: Props) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/lick/${lick.id}`)}
      className={`border ${C_GRAY_BORDER_200} rounded-lg p-4 cursor-pointer hover:${C_PRIMARY_BORDER_MID} hover:shadow-sm transition-all ${C_WHITE_BG}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-mono ${C_GRAY_TEXT_500} truncate`}>{lick.intervalDisplayString}</span>
          {lick.authorName && (
            <span className={`text-xs ${C_GRAY_TEXT_300} shrink-0`}>{lick.authorName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lick.instrument && lick.instrument !== 'GUITAR' && (
            <span className={`text-xs px-2 py-0.5 ${C_GRAY_BG_100} ${C_GRAY_TEXT_500} rounded-full font-medium`}>
              {modeLabel(lick.instrument)}
            </span>
          )}
          {lick.mode && (
            <span className={`text-xs px-2 py-0.5 ${C_PRIMARY_BG_SUBTLE} ${C_PRIMARY_TEXT_DARK} rounded-full font-medium`}>
              {modeLabel(lick.mode)}
            </span>
          )}
          {!lick.autoImported && isManaging && lick.ownedByCurrentUser && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className={`${C_DANGER_TEXT_MUTED} hover:${C_DANGER_TEXT_MID} text-base leading-none transition-colors`}
              aria-label="Delete lick"
            >
              ×
            </button>
          )}
          {!lick.autoImported && isManaging && !lick.ownedByCurrentUser && (
            <button
              onClick={e => { e.stopPropagation(); onFork(); }}
              className={`${C_PRIMARY_TEXT_SOFT} hover:${C_PRIMARY_TEXT} text-xs leading-none transition-colors border border-indigo-200 rounded px-1.5 py-0.5`}
              aria-label="Fork lick"
              title="Fork — save a copy to your library"
            >
              fork
            </button>
          )}
        </div>
      </div>
      <pre className={`text-xs font-mono ${C_GRAY_TEXT_700} whitespace-pre overflow-x-auto leading-tight`}>
        {lick.rawTab}
      </pre>
    </div>
  );
}
