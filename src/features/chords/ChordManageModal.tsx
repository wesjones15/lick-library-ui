import { useState } from 'react';
import ChordDiagram from './ChordDiagram';
import ChordUploadModal from './ChordUploadModal';
import { deleteChordVoicing } from '../../core/api/client';
import type { ChordVoicing } from '../../core/api/client';
import { getStringCount } from '../../core/music';

interface Props {
  chordName: string;
  voicings: ChordVoicing[];
  instrument?: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function ChordManageModal({ chordName, voicings: initialVoicings, instrument, onClose, onChanged }: Props) {
  const [voicings, setVoicings] = useState(initialVoicings);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [changed, setChanged] = useState(false);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deleteChordVoicing(id);
      setVoicings(vs => vs.filter(v => v.id !== id));
      setChanged(true);
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  }

  function handleClose() {
    if (changed) onChanged();
    onClose();
  }

  if (addOpen) {
    return (
      <ChordUploadModal
        chordName={chordName}
        instrument={instrument}
        lockInstrument
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          setChanged(true);
          onChanged();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-gray-900">Manage voicings — {chordName}</span>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {voicings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No voicings for {chordName}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {voicings.map(v => (
                <div key={v.id} className="border border-gray-200 rounded-lg p-2 flex flex-row items-center gap-2">
                  <ChordDiagram frets={v.frets} width={120} stringCount={getStringCount(instrument)} />
                  <div className="flex flex-col items-center justify-center gap-1">
                    {v.authorName && (
                      <span className="text-xs text-gray-300">{v.authorName}</span>
                    )}
                    {v.ownedByCurrentUser && (
                      confirmId === v.id ? (
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={deleting}
                          className="text-red-500 hover:text-red-700 font-semibold text-sm disabled:opacity-50"
                        >
                          delete?
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmId(v.id)}
                          className="text-gray-300 hover:text-red-400 text-5xl leading-none"
                        >
                          ✕
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add Voicing
          </button>
        </div>
      </div>
    </div>
  );
}
