import { useState, useEffect } from 'react';
import ChordDiagram from './ChordDiagram';
import ChordManageModal from './ChordManageModal';
import type { ChordVoicing } from '../../core/api/client';
import { getStringCount } from '../../core/music';
import { C_GRAY_BORDER_200, C_GRAY_TEXT_300, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_900, C_PRIMARY_TEXT_SOFT, C_WHITE_BG } from '../../core/colors';

interface ChordCardProps {
  rootDisplay: string;
  quality: string;
  displayQuality?: string;
  label: string;
  voicings: ChordVoicing[];
  manageMode?: boolean;
  instrument?: string;
  onChanged?: () => void;
}

export default function ChordCard({ rootDisplay, quality, displayQuality, label, voicings, manageMode, instrument, onChanged }: ChordCardProps) {
  const [idx, setIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { setIdx(0); }, [voicings]);

  const chordName = `${rootDisplay}${quality}`;
  const displayName = `${rootDisplay}${displayQuality ?? quality}`;

  return (
    <>
      <div
        className={`border rounded-lg p-3 ${C_WHITE_BG} flex flex-col gap-2 min-h-[160px] transition-colors ${manageMode ? 'border-indigo-200 cursor-pointer hover:ring-2 hover:ring-indigo-300' : C_GRAY_BORDER_200}`}
        onClick={manageMode ? () => setModalOpen(true) : undefined}
      >
        <div>
          <div className={`font-semibold ${C_GRAY_TEXT_900} text-sm`}>{displayName}</div>
          <div className={`text-xs ${C_GRAY_TEXT_400}`}>{label}</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {voicings.length > 0
            ? <ChordDiagram frets={voicings[idx].frets} width={140} stringCount={getStringCount(instrument)} />
            : <span className={`${C_GRAY_TEXT_300} text-sm`}>???</span>
          }
        </div>
        {!manageMode && voicings.length > 1 && (
          <div className={`flex items-center justify-between text-xs ${C_GRAY_TEXT_400}`}>
            <button
              className={`hover:${C_GRAY_TEXT_600} px-1 text-2xl leading-none`}
              onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + voicings.length) % voicings.length); }}
            >‹</button>
            <span>{idx + 1}/{voicings.length}</span>
            <button
              className={`hover:${C_GRAY_TEXT_600} px-1 text-2xl leading-none`}
              onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % voicings.length); }}
            >›</button>
          </div>
        )}
        {manageMode && (
          <div className={`text-xs ${C_PRIMARY_TEXT_SOFT} text-center`}>click to manage</div>
        )}
      </div>

      {modalOpen && (
        <ChordManageModal
          chordName={displayName}
          voicings={voicings}
          instrument={instrument}
          onClose={() => setModalOpen(false)}
          onChanged={() => { onChanged?.(); }}
        />
      )}
    </>
  );
}
