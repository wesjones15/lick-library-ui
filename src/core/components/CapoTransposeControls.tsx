import type { Dispatch, SetStateAction } from 'react';
import { BTN_ICON } from '../ui';
import { rootKeyLabel } from '../../features/songs/songKeyUtils';

interface CapoTransposeControlsProps {
  capo: number;
  setCapo: Dispatch<SetStateAction<number>>;
  semitones: number;
  setSemitones: Dispatch<SetStateAction<number>>;
  originalKey: string | null;
  originalCapo: number;
  mode?: string | null;
  className?: string;
}

export default function CapoTransposeControls({
  capo, setCapo, semitones, setSemitones,
  originalKey, originalCapo, mode, className = '',
}: CapoTransposeControlsProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Capo */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-400">Capo</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCapo(c => Math.max(0, c - 1))} className={BTN_ICON}>−</button>
          <div className="flex items-center justify-center w-8">
            <span className="text-base font-semibold text-gray-900">{capo}</span>
          </div>
          <button onClick={() => setCapo(c => Math.min(11, c + 1))} className={BTN_ICON}>+</button>
        </div>
        <button
          onClick={() => setCapo(originalCapo)}
          className={`text-xs text-center transition-colors ${capo !== originalCapo ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
        >
          reset
        </button>
      </div>

      <div className="self-stretch border-l border-gray-200" />

      {/* Transpose */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-400">Transpose</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setSemitones(s => s - 1 <= -12 ? 0 : s - 1)} className={BTN_ICON}>−</button>
          <div className="flex gap-3 items-center">
            <div className="flex flex-col items-center w-10">
              <span className="text-base font-semibold text-gray-900">
                {rootKeyLabel(originalKey, semitones - originalCapo, mode)}
              </span>
              <span className="text-xs text-gray-400">shape</span>
            </div>
            <span className="text-xs text-gray-300">
              {semitones > 0 ? `+${semitones}` : `${semitones}`}
            </span>
            <div className="flex flex-col items-center w-10">
              <span className="text-base font-semibold text-gray-900">
                {rootKeyLabel(originalKey, semitones + capo - originalCapo, mode)}
              </span>
              <span className="text-xs text-gray-400">sound</span>
            </div>
          </div>
          <button onClick={() => setSemitones(s => s + 1 >= 12 ? 0 : s + 1)} className={BTN_ICON}>+</button>
        </div>
        <button
          onClick={() => setSemitones(0)}
          className={`text-xs text-center transition-colors ${semitones !== 0 ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
        >
          reset
        </button>
      </div>
    </div>
  );
}
