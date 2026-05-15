import { useState } from 'react';
import { uploadChordVoicing } from '../../core/api/client';

const NOTE_OPTIONS = [
  { value: 'C',       label: 'C'  },
  { value: 'C_SHARP', label: 'C#' },
  { value: 'D',       label: 'D'  },
  { value: 'D_SHARP', label: 'D#' },
  { value: 'E',       label: 'E'  },
  { value: 'F',       label: 'F'  },
  { value: 'F_SHARP', label: 'F#' },
  { value: 'G',       label: 'G'  },
  { value: 'G_SHARP', label: 'G#' },
  { value: 'A',       label: 'A'  },
  { value: 'B_FLAT',  label: 'Bb' },
  { value: 'B',       label: 'B'  },
];

const KNOWN_QUALITIES = ['', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', 'add9', '6', 'm6', 'dim7', 'm7b5'];

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
  initialRoot?: string;
  initialQuality?: string;
  onSuccess?: () => void;
}

export default function ChordUploadForm({ initialRoot = 'C', initialQuality = '', onSuccess }: Props) {
  const [root, setRoot] = useState(initialRoot);
  const [quality, setQuality] = useState(initialQuality);
  const [frets, setFrets] = useState<string[]>(['', '', '', '', '', '']);
  const [shapeName, setShapeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFret = (idx: number, val: string) => {
    setFrets(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const allFretsSet = frets.every(f => f.trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFretsSet) return;
    setError(null);
    setLoading(true);
    try {
      await uploadChordVoicing({
        root,
        quality,
        frets,
        shapeName: shapeName.trim() || undefined,
      });
      setFrets(['', '', '', '', '', '']);
      setShapeName('');
      setQuality(initialQuality);
      setRoot(initialRoot);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        <select
          value={root}
          onChange={e => setRoot(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
        >
          {NOTE_OPTIONS.map(n => (
            <option key={n.value} value={n.value}>{n.label}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <input
            list="quality-options"
            placeholder="Quality (blank = major)"
            value={quality}
            onChange={e => setQuality(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          />
          <datalist id="quality-options">
            {KNOWN_QUALITIES.map(q => (
              <option key={q} value={q}>{q === '' ? 'major' : q}</option>
            ))}
          </datalist>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-xs text-gray-500 mb-3">Frets — enter a number (0–24) or <code>x</code> for muted</p>
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
      </div>

      <input
        type="text"
        placeholder="Shape name (optional, e.g. Open, Barre_E)"
        value={shapeName}
        onChange={e => setShapeName(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
      />

      <button
        type="submit"
        disabled={loading || !allFretsSet}
        className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
      >
        {loading ? 'Uploading…' : 'Upload Voicing'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
