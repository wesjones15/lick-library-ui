import { useState, useEffect } from 'react';
import ChordDiagram from './ChordDiagram';
import ChordManageModal from './ChordManageModal';
import type { ChordVoicing } from '../../core/api/client';
import { getStringCount } from '../../core/music';
import { useSoundContext } from '../../core/sound/SoundContext';
import { voicingToMidi } from '../../core/sound/midiUtils';

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
  const { playMidi } = useSoundContext();

  useEffect(() => { setIdx(0); }, [voicings]);

  const chordName = `${rootDisplay}${quality}`;
  const displayName = `${rootDisplay}${displayQuality ?? quality}`;

  return (
    <>
      <div
        className={`border rounded-lg p-3 bg-white flex flex-col gap-2 min-h-[160px] transition-colors ${manageMode ? 'border-primary-200 cursor-pointer hover:ring-2 hover:ring-brand-3' : 'border-gray-200'}`}
        onClick={manageMode ? () => setModalOpen(true) : undefined}
      >
        <div>
          <div className="font-semibold text-gray-900 text-sm">{displayName}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {voicings.length > 0
            ? <ChordDiagram frets={voicings[idx].frets} width={140} stringCount={getStringCount(instrument)} />
            : <span className="text-gray-300 text-sm">???</span>
          }
        </div>
        {!manageMode && voicings.length > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400">
            <button
              className="hover:text-gray-600 px-1 text-2xl leading-none"
              style={{ visibility: voicings.length > 1 ? 'visible' : 'hidden' }}
              onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + voicings.length) % voicings.length); }}
            >‹</button>
            <button
              className="hover:text-gray-600 px-1 text-base leading-none"
              onClick={e => { e.stopPropagation(); playMidi(voicingToMidi(voicings[idx].frets, instrument ?? 'GUITAR'), 20); }}
              title="Play chord"
            >▶</button>
            {voicings.length > 1 && <span>{idx + 1}/{voicings.length}</span>}
            <button
              className="hover:text-gray-600 px-1 text-2xl leading-none"
              style={{ visibility: voicings.length > 1 ? 'visible' : 'hidden' }}
              onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % voicings.length); }}
            >›</button>
          </div>
        )}
        {manageMode && (
          <div className="text-xs text-brand-4 text-center">click to manage</div>
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
