import { useState } from 'react';
import ChordDiagram from './ChordDiagram';
import ChordUploadModal from './ChordUploadModal';
import { deleteChordVoicing } from '../../core/api/client';
import type { ChordVoicing } from '../../core/api/client';

interface Props {
  chordName: string;
  voicings: ChordVoicing[];
  onClose: () => void;
  onChanged: () => void;
}

export default function ChordManageModal({ chordName, voicings: initialVoicings, onClose, onChanged }: Props) {
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
                <div key={v.id} className="border border-gray-200 rounded-lg p-2 flex flex-row items-start gap-2">
                  <ChordDiagram frets={v.frets} width={120} />
                  <div className="flex flex-col items-center gap-1 pt-1">
                    {confirmId === v.id ? (
                      <>
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button
                          onClick={() => handleDelete(v.id)}
                          disabled={deleting}
                          className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmId(v.id)}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded text-xs leading-none"
                      >
                        ✕
                      </button>
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
