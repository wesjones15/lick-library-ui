import ChordUploadForm from './ChordUploadForm';
import { C_BLACK_BG, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_900, C_WHITE_BG } from '../../core/colors';

interface Props {
  chordName: string;
  instrument?: string;
  lockInstrument?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChordUploadModal({ chordName, instrument, lockInstrument, onClose, onSuccess }: Props) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${C_BLACK_BG}/40`}
      onClick={onClose}
    >
      <div
        className={`${C_WHITE_BG} rounded-lg shadow-lg p-6 w-full max-w-sm mx-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm font-semibold ${C_GRAY_TEXT_900}`}>Add voicing for {chordName}</span>
          <button
            onClick={onClose}
            className={`${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} text-lg leading-none`}
          >
            ✕
          </button>
        </div>
        <ChordUploadForm
          initialChordName={chordName}
          lockChordName
          initialInstrument={instrument}
          lockInstrument={lockInstrument}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}
