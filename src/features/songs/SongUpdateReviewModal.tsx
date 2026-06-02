import { useState, useEffect } from 'react';
import { getSongUpdateForReview, approveSongUpdate, rejectSongUpdate } from '../../core/api/client';
import { BTN_SUCCESS, BTN_SECONDARY } from '../../core/ui';
import type { SongUpdateReviewResponse } from '../../core/api/client';

interface Props {
  updateId: string;
  onClose: () => void;
  onDone: (updateId: string) => void;
}

const TYPE_BADGE: Record<string, string> = {
  SONG_METADATA: 'bg-info-1 text-info-7',
  SONG_CHART: 'bg-chart-1 text-chart-2',
  SONG_BEATMAP: 'bg-beatmap-1 text-beatmap-2',
};

const TYPE_LABEL: Record<string, string> = {
  SONG_METADATA: 'Metadata',
  SONG_CHART: 'Chart',
  SONG_BEATMAP: 'Beatmap',
};

function MetadataDiff({ current, proposed }: { current: string; proposed: string }) {
  const cur = JSON.parse(current);
  const prop = JSON.parse(proposed);
  const fields = ['title', 'artist', 'originalKey', 'mode', 'instrument', 'capo', 'tempo'];
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-gray-200 text-gray-400 text-left">
          <th className="pb-2 pr-4">Field</th>
          <th className="pb-2 pr-4">Current</th>
          <th className="pb-2">Proposed</th>
        </tr>
      </thead>
      <tbody>
        {fields.map(f => {
          const curVal = String(cur[f] ?? '');
          const propVal = String(prop[f] ?? '');
          const changed = curVal !== propVal && propVal !== '' && propVal !== '0';
          return (
            <tr key={f} className={`border-b border-gray-100 ${changed ? 'bg-warn-1' : ''}`}>
              <td className="py-1.5 pr-4 text-gray-500 font-medium">{f}</td>
              <td className="py-1.5 pr-4 text-gray-500">{curVal || '—'}</td>
              <td className={`py-1.5 ${changed ? 'text-warn-6 font-medium' : 'text-gray-400'}`}>
                {propVal || '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ChartDiff({ current, proposed }: { current: string; proposed: string }) {
  const curSheet = JSON.parse(current).rawChordSheet ?? '';
  const propSheet = JSON.parse(proposed).rawChordSheet ?? '';
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-gray-400 mb-1">Current</div>
        <pre className="font-mono text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-56 whitespace-pre-wrap">{curSheet || '(empty)'}</pre>
      </div>
      <div>
        <div className="text-xs font-medium text-warn-5 mb-1">Proposed</div>
        <pre className="font-mono text-xs bg-warn-1 border border-warn-3 rounded p-3 overflow-auto max-h-56 whitespace-pre-wrap">{propSheet || '(empty)'}</pre>
      </div>
    </div>
  );
}

function BeatmapDiff({ current, proposed }: { current: string; proposed: string }) {
  const curBeats: number[] = JSON.parse(current).beats ?? [];
  const propBeats: number[] = JSON.parse(proposed).beats ?? [];
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div><span className="text-gray-400 font-medium mr-2">Current beats:</span><span className="font-mono text-gray-600">[{curBeats.join(', ') || 'none'}]</span></div>
      <div><span className="text-warn-5 font-medium mr-2">Proposed beats:</span><span className="font-mono text-warn-6">[{propBeats.join(', ') || 'none'}]</span></div>
    </div>
  );
}

export default function SongUpdateReviewModal({ updateId, onClose, onDone }: Props) {
  const [data, setData] = useState<SongUpdateReviewResponse | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    getSongUpdateForReview(updateId).then(setData).catch(() => {});
  }, [updateId]);

  async function handleApprove() {
    if (!data) return;
    setActing(true);
    try {
      await approveSongUpdate(updateId);
      onDone(updateId);
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!data) return;
    setActing(true);
    try {
      await rejectSongUpdate(updateId);
      onDone(updateId);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{data?.songTitle ?? '…'}</span>
              {data && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[data.requestType]}`}>
                  {TYPE_LABEL[data.requestType]}
                </span>
              )}
            </div>
            {data && (
              <div className="text-xs text-gray-400 mt-0.5">
                submitted by {data.submitterUsername}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-xl leading-none ml-4">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-auto flex-1">
          {!data ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : data.requestType === 'SONG_METADATA' ? (
            <MetadataDiff current={data.currentValue} proposed={data.proposedValue} />
          ) : data.requestType === 'SONG_CHART' ? (
            <ChartDiff current={data.currentValue} proposed={data.proposedValue} />
          ) : (
            <BeatmapDiff current={data.currentValue} proposed={data.proposedValue} />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleApprove}
            disabled={acting || !data}
            className={BTN_SUCCESS}
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={acting || !data}
            className="px-4 py-2 text-sm rounded-lg border border-danger-4 text-danger-7 hover:bg-danger-1 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onClose}
            className={`${BTN_SECONDARY} ml-auto`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
