import { useState } from 'react';
import { uploadLick } from '../api/client';
import type { UploadRequest } from '../api/client';

const MODES = ['IONIAN', 'DORIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN'];

interface Props {
  onSuccess: () => void;
}

export default function UploadForm({ onSuccess }: Props) {
  const [rawTab, setRawTab] = useState('');
  const [mode, setMode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const req: UploadRequest = { rawTab };
      if (mode) req.mode = mode;
      await uploadLick(req);
      setRawTab('');
      setMode('');
      onSuccess();
    } catch {
      setError('Upload failed. Check your tab format and that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        value={rawTab}
        onChange={e => setRawTab(e.target.value)}
        placeholder={"e|---------|\nB|---------|\nG|---------|\nD|---------|\nA|-0-2-4---|\nE|---------|"}
        rows={7}
        className="font-mono text-sm border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-400 bg-gray-50"
      />
      <div className="flex gap-2">
        <select
          value={mode}
          onChange={e => setMode(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 flex-1"
        >
          <option value="">Auto-detect mode</option>
          {MODES.map(m => (
            <option key={m} value={m}>
              {m.charAt(0) + m.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !rawTab.trim()}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
