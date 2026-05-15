import { useState } from 'react';
import { uploadChordVoicing } from '../../core/api/client';
import { parseChordName } from '../songs/parseChordName';
import ChordDiagram from './ChordDiagram';

// Display order: high e (index 5) on top → low E (index 0) on bottom
const STRING_DISPLAY = [
  { label: 'e', fretsIdx: 5 },
  { label: 'B', fretsIdx: 4 },
  { label: 'G', fretsIdx: 3 },
  { label: 'D', fretsIdx: 2 },
  { label: 'A', fretsIdx: 1 },
  { label: 'E', fretsIdx: 0 },
];

interface Props {
  initialChordName?: string;
  lockChordName?: boolean;
  onSuccess?: () => void;
}

export default function ChordUploadForm({ initialChordName = '', lockChordName = false, onSuccess }: Props) {
  const [chordName, setChordName] = useState(initialChordName);
  const [parseError, setParseError] = useState<string | null>(null);
  const [frets, setFrets] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChordNameChange = (val: string) => {
    setChordName(val);
    if (!val.trim()) {
      setParseError(null);
      return;
    }
    const parsed = parseChordName(val.trim());
    setParseError(parsed ? null : "Couldn't recognize chord name");
  };

  const setFret = (idx: number, val: string) => {
    setFrets(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const allFretsSet = frets.every(f => f.trim() !== '');
  const canSubmit = !loading && allFretsSet && !parseError && chordName.trim() !== '';

  const previewFrets: (number | null)[] = frets.map(f => {
    const t = f.trim().toLowerCase();
    if (t === 'x') return null;
    const n = parseInt(t, 10);
    return !isNaN(n) && n >= 0 ? n : 0;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseChordName(chordName.trim());
    if (!parsed) {
      setParseError("Couldn't recognize chord name");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await uploadChordVoicing({ root: parsed.root, quality: parsed.quality, frets });
      setFrets(['', '', '', '', '', '']);
      if (!lockChordName) setChordName(initialChordName);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <input
          type="text"
          placeholder="Chord name, e.g. Am, C#maj7, Bbsus4"
          value={chordName}
          onChange={e => handleChordNameChange(e.target.value)}
          disabled={lockChordName}
          className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 ${lockChordName ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
        />
        {parseError && <p className="text-red-500 text-xs">{parseError}</p>}
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-xs text-gray-500 mb-3">Frets — enter a number (0–24) or <code>x</code> for muted</p>
        <div className="flex items-start gap-6">
          <div className="flex flex-col gap-2">
            {STRING_DISPLAY.map(({ label, fretsIdx }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-4 text-right text-sm font-mono text-gray-600">{label}</span>
                <input
                  type="text"
                  inputMode="text"
                  value={frets[fretsIdx]}
                  onChange={e => setFret(fretsIdx, e.target.value)}
                  placeholder="—"
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-sm font-mono text-center focus:outline-none focus:border-indigo-400"
                />
              </div>
            ))}
          </div>
          <ChordDiagram frets={previewFrets} width={130} />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
      >
        {loading ? 'Uploading…' : 'Upload Voicing'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
