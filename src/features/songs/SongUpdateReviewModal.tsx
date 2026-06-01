import { useState, useEffect } from 'react';
import { getSongUpdateForReview, approveSongUpdate, rejectSongUpdate } from '../../core/api/client';
import { BTN_SUCCESS, BTN_SECONDARY } from '../../core/ui';
import type { SongUpdateReviewResponse } from '../../core/api/client';
import { C_BLACK_BG, C_DANGER_BG_SOFT, C_DANGER_BORDER_MID, C_DANGER_TEXT_MID, C_GRAY_BG_50, C_GRAY_BORDER_100, C_GRAY_BORDER_200, C_GRAY_TEXT_300, C_GRAY_TEXT_400, C_GRAY_TEXT_500, C_GRAY_TEXT_600, C_GRAY_TEXT_900, C_WARN_BG_SOFT, C_WARN_BORDER_SOFT, C_WARN_TEXT, C_WARN_TEXT_MID, C_WHITE_BG } from '../../core/colors';

interface Props {
  updateId: string;
  onClose: () => void;
  onDone: (updateId: string) => void;
}

const TYPE_BADGE: Record<string, string> = {
  SONG_METADATA: '${C_INFO_BG_SUBTLE} ${C_INFO_TEXT}',
  SONG_CHART: '${C_CHART_BG} ${C_CHART_TEXT}',
  SONG_BEATMAP: '${C_BEATMAP_BG} ${C_BEATMAP_TEXT}',
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
        <tr className={`border-b ${C_GRAY_BORDER_200} ${C_GRAY_TEXT_400} text-left`}>
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
            <tr key={f} className={`border-b ${C_GRAY_BORDER_100} ${changed ? '${C_WARN_BG_SOFT}' : ''}`}>
              <td className={`py-1.5 pr-4 ${C_GRAY_TEXT_500} font-medium`}>{f}</td>
              <td className={`py-1.5 pr-4 ${C_GRAY_TEXT_500}`}>{curVal || '—'}</td>
              <td className={`py-1.5 ${changed ? '${C_WARN_TEXT} font-medium' : '${C_GRAY_TEXT_400}'}`}>
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
        <div className={`text-xs font-medium ${C_GRAY_TEXT_400} mb-1`}>Current</div>
        <pre className={`font-mono text-xs ${C_GRAY_BG_50} border ${C_GRAY_BORDER_200} rounded p-3 overflow-auto max-h-56 whitespace-pre-wrap`}>{curSheet || '(empty)'}</pre>
      </div>
      <div>
        <div className={`text-xs font-medium ${C_WARN_TEXT_MID} mb-1`}>Proposed</div>
        <pre className={`font-mono text-xs ${C_WARN_BG_SOFT} border ${C_WARN_BORDER_SOFT} rounded p-3 overflow-auto max-h-56 whitespace-pre-wrap`}>{propSheet || '(empty)'}</pre>
      </div>
    </div>
  );
}

function BeatmapDiff({ current, proposed }: { current: string; proposed: string }) {
  const curBeats: number[] = JSON.parse(current).beats ?? [];
  const propBeats: number[] = JSON.parse(proposed).beats ?? [];
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div><span className={`${C_GRAY_TEXT_400} font-medium mr-2`}>Current beats:</span><span className={`font-mono ${C_GRAY_TEXT_600}`}>[{curBeats.join(', ') || 'none'}]</span></div>
      <div><span className={`${C_WARN_TEXT_MID} font-medium mr-2`}>Proposed beats:</span><span className={`font-mono ${C_WARN_TEXT}`}>[{propBeats.join(', ') || 'none'}]</span></div>
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${C_BLACK_BG}/40`} onClick={onClose}>
      <div
        className={`${C_WHITE_BG} rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between px-6 py-4 border-b ${C_GRAY_BORDER_100}`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold ${C_GRAY_TEXT_900}`}>{data?.songTitle ?? '…'}</span>
              {data && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[data.requestType]}`}>
                  {TYPE_LABEL[data.requestType]}
                </span>
              )}
            </div>
            {data && (
              <div className={`text-xs ${C_GRAY_TEXT_400} mt-0.5`}>
                submitted by {data.submitterUsername}
              </div>
            )}
          </div>
          <button onClick={onClose} className={`${C_GRAY_TEXT_300} hover:${C_GRAY_TEXT_600} text-xl leading-none ml-4`}>×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-auto flex-1">
          {!data ? (
            <p className={`text-sm ${C_GRAY_TEXT_400}`}>Loading…</p>
          ) : data.requestType === 'SONG_METADATA' ? (
            <MetadataDiff current={data.currentValue} proposed={data.proposedValue} />
          ) : data.requestType === 'SONG_CHART' ? (
            <ChartDiff current={data.currentValue} proposed={data.proposedValue} />
          ) : (
            <BeatmapDiff current={data.currentValue} proposed={data.proposedValue} />
          )}
        </div>

        {/* Footer */}
        <div className={`flex gap-2 px-6 py-4 border-t ${C_GRAY_BORDER_100}`}>
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
            className={`px-4 py-2 text-sm rounded-lg border ${C_DANGER_BORDER_MID} ${C_DANGER_TEXT_MID} hover:${C_DANGER_BG_SOFT} disabled:opacity-50 transition-colors`}
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
