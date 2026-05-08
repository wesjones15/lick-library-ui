import { useNavigate } from 'react-router-dom';
import type { LickSummary } from '../api/client';

interface Props {
  lick: LickSummary;
  onDelete: () => void;
}

function modeLabel(mode: string) {
  return mode.charAt(0) + mode.slice(1).toLowerCase();
}

export default function LickCard({ lick, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/lick/${lick.id}`)}
      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-indigo-400 hover:shadow-sm transition-all bg-white"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-gray-500">{lick.intervalDisplayString}</span>
        <div className="flex items-center gap-2">
          {lick.mode && (
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              {modeLabel(lick.mode)}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-red-400 hover:text-red-600 text-base leading-none transition-colors"
            aria-label="Delete lick"
          >
            ×
          </button>
        </div>
      </div>
      <pre className="text-xs font-mono text-gray-700 whitespace-pre overflow-x-auto leading-tight">
        {lick.rawTab}
      </pre>
    </div>
  );
}
