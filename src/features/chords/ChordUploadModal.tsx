import ChordUploadForm from './ChordUploadForm';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-gray-900">Add voicing for {chordName}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
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
