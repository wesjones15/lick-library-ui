import { useNavigate } from 'react-router-dom';
import type { LickSummary } from '../../core/api/client';

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
      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary-400 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-gray-500 truncate">{lick.intervalDisplayString}</span>
          {lick.authorName && (
            <span className="text-xs text-gray-300 shrink-0">{lick.authorName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lick.instrument && lick.instrument !== 'GUITAR' && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
              {modeLabel(lick.instrument)}
            </span>
          )}
          {lick.mode && (
            <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">
              {modeLabel(lick.mode)}
            </span>
          )}
          {!lick.autoImported && isManaging && lick.ownedByCurrentUser && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="text-danger-400 hover:text-danger-600 text-base leading-none transition-colors"
              aria-label="Delete lick"
            >
              ×
            </button>
          )}
          {!lick.autoImported && isManaging && !lick.ownedByCurrentUser && (
            <button
              onClick={e => { e.stopPropagation(); onFork(); }}
              className="text-primary-400 hover:text-primary-600 text-xs leading-none transition-colors border border-primary-200 rounded px-1.5 py-0.5"
              aria-label="Fork lick"
              title="Fork — save a copy to your library"
            >
              fork
            </button>
          )}
        </div>
      </div>
      <pre className="text-xs font-mono text-gray-700 whitespace-pre overflow-x-auto leading-tight">
        {lick.rawTab}
      </pre>
    </div>
  );
}
