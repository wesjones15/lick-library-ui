import { useState, useEffect } from 'react';
import ChordDiagram from './ChordDiagram';
import ChordManageModal from './ChordManageModal';
import type { ChordVoicing } from '../../core/api/client';

interface ChordCardProps {
  rootDisplay: string;
  quality: string;
  label: string;
  voicings: ChordVoicing[];
  manageMode?: boolean;
  onChanged?: () => void;
}

export default function ChordCard({ rootDisplay, quality, label, voicings, manageMode, onChanged }: ChordCardProps) {
  const [idx, setIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { setIdx(0); }, [voicings]);

  const chordName = `${rootDisplay}${quality}`;

  return (
    <>
      <div
        className={`border rounded-lg p-3 bg-white flex flex-col gap-2 min-h-[160px] transition-colors ${manageMode ? 'border-indigo-200 cursor-pointer hover:ring-2 hover:ring-indigo-300' : 'border-gray-200'}`}
        onClick={manageMode ? () => setModalOpen(true) : undefined}
      >
        <div>
          <div className="font-semibold text-gray-900 text-sm">{chordName}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {voicings.length > 0
            ? <ChordDiagram frets={voicings[idx].frets} width={140} />
            : <span className="text-gray-300 text-sm">???</span>
          }
        </div>
        {!manageMode && voicings.length > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-400">
            <button
              className="hover:text-gray-600 px-1"
              onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + voicings.length) % voicings.length); }}
            >‹</button>
            <span>{idx + 1}/{voicings.length}</span>
            <button
              className="hover:text-gray-600 px-1"
              onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % voicings.length); }}
            >›</button>
          </div>
        )}
        {manageMode && (
          <div className="text-xs text-indigo-400 text-center">click to manage</div>
        )}
      </div>

      {modalOpen && (
        <ChordManageModal
          chordName={chordName}
          voicings={voicings}
          onClose={() => setModalOpen(false)}
          onChanged={() => { onChanged?.(); }}
        />
      )}
    </>
  );
}
