import { useState } from 'react';
import type { PlaylistEntry } from '../../core/api/client';
import { BTN_ICON } from '../../core/ui';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import CapoTransposeControls from '../../core/components/CapoTransposeControls';
import NumpadInput from '../../core/components/NumpadInput';
import type { InstrumentName } from '../../core/useInstrument';

interface VoicingModalProps {
  entry: PlaylistEntry;
  onSave: (keyOffset: number, capoOffset: number, instrument: string, tempoOverride: number | null) => void;
  onClose: () => void;
}

export default function VoicingModal({ entry, onSave, onClose }: VoicingModalProps) {
  const [localSemitones, setLocalSemitones] = useState(entry.keyOffset);
  const [localCapo, setLocalCapo] = useState(entry.defaultCapo + entry.capoOffset);
  const [localTempoOverride, setLocalTempoOverride] = useState<number | null>(entry.tempoOverride ?? null);
  const defaultInstrument = (entry.defaultInstrument ?? 'GUITAR') as InstrumentName;
  const [localInstrument, setLocalInstrument] = useState<InstrumentName>(
    (entry.instrument ?? entry.defaultInstrument ?? 'GUITAR') as InstrumentName
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
        <div className="font-semibold text-gray-900 text-sm mb-5 text-center">{entry.title}</div>
        <div className="flex justify-center mb-6">
          <CapoTransposeControls
            capo={localCapo} setCapo={setLocalCapo}
            semitones={localSemitones} setSemitones={setLocalSemitones}
            originalKey={entry.originalKey}
            originalCapo={entry.defaultCapo}
            mode={entry.mode}
          />
        </div>

          {/* BPM override widget */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">BPM</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocalTempoOverride(t => Math.min(240, Math.max(40, (t ?? entry.tempo ?? 120) - 1)))}
                className={BTN_ICON}
              >−</button>
              <div className="flex items-center justify-center w-12">
                <NumpadInput
                  value={localTempoOverride != null ? String(localTempoOverride) : ''}
                  onChange={val => {
                    if (val === '') { setLocalTempoOverride(null); return; }
                    const v = parseInt(val, 10);
                    setLocalTempoOverride(isNaN(v) ? null : v);
                  }}
                  onCommit={val => {
                    if (!val.trim()) { setLocalTempoOverride(null); return; }
                    const v = parseInt(val, 10);
                    if (!isNaN(v)) setLocalTempoOverride(Math.min(240, Math.max(40, v)));
                  }}
                  placeholder={entry.tempo != null ? String(entry.tempo) : '—'}
                  className="w-12 text-center text-base font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-brand-5 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setLocalTempoOverride(t => Math.min(240, Math.max(40, (t ?? entry.tempo ?? 120) + 1)))}
                className={BTN_ICON}
              >+</button>
            </div>
            <button
              onClick={() => setLocalTempoOverride(null)}
              className={`text-xs transition-colors ${localTempoOverride !== null ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
            >reset</button>
          </div>

        {/* Instrument selector */}
        <div className="flex flex-col items-center gap-1 mb-6">
          <span className="text-xs text-gray-400">Instrument</span>
          <InstrumentSelector excludeCustom compact instrument={localInstrument} onInstrumentChange={setLocalInstrument} />
          <button
            onClick={() => setLocalInstrument(defaultInstrument)}
            className={`text-xs transition-colors ${localInstrument !== defaultInstrument ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
          >reset</button>
        </div>

        <button
          onClick={() => { onSave(localSemitones, localCapo - entry.defaultCapo, localInstrument, localTempoOverride); onClose(); }}
          className="w-full px-4 py-2 text-sm rounded-lg bg-brand-6 text-white hover:bg-brand-7"
        >Save</button>
      </div>
    </div>
  );
}
