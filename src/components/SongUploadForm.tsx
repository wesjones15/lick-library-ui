import { useState } from 'react';
import { uploadSong } from '../api/client';

const INPUT_KEYS = [
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

interface Props {
  onSuccess: () => void;
}

export default function SongUploadForm({ onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('');
  const [capo, setCapo] = useState('');
  const [tempo, setTempo] = useState('');
  const [rawChordSheet, setRawChordSheet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawChordSheet.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await uploadSong({
        title: title.trim(),
        artist: artist.trim() || undefined,
        originalKey: originalKey || undefined,
        capo: capo ? parseInt(capo, 10) : undefined,
        tempo: tempo ? parseInt(tempo, 10) : undefined,
        rawChordSheet,
      });
      setTitle('');
      setArtist('');
      setOriginalKey('');
      setCapo('');
      setTempo('');
      setRawChordSheet('');
      onSuccess();
    } catch {
      setError('Upload failed. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <input
          type="text"
          placeholder="Artist"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>
      <div className="flex gap-2">
        <select
          value={originalKey}
          onChange={e => setOriginalKey(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
        >
          <option value="">Key (optional)</option>
          {INPUT_KEYS.map(k => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Capo"
          min={0}
          max={11}
          value={capo}
          onChange={e => setCapo(e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <input
          type="number"
          placeholder="BPM"
          min={1}
          value={tempo}
          onChange={e => setTempo(e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>
      <textarea
        placeholder="Paste chord sheet here..."
        value={rawChordSheet}
        onChange={e => setRawChordSheet(e.target.value)}
        rows={10}
        className="font-mono text-sm border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-400 bg-gray-50"
      />
      <button
        type="submit"
        disabled={loading || !title.trim() || !rawChordSheet.trim()}
        className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
      >
        {loading ? 'Uploading…' : 'Upload'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
