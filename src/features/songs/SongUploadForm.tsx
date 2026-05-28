import { useState } from 'react';
import { uploadSong } from '../../core/api/client';
import { CHROMATIC_NOTES, SONG_MODES, SONG_MODE_TO_ENUM } from '../../core/music';
import InstrumentSelector from '../../components/InstrumentSelector';
import type { InstrumentName } from '../../core/useInstrument';

interface Props {
  onSuccess: () => void;
}

export default function SongUploadForm({ onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [keyRoot, setKeyRoot] = useState('');
  const [keyMode, setKeyMode] = useState('');
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');
  const [capo, setCapo] = useState('');
  const [tempo, setTempo] = useState('');
  const [timeSignature, setTimeSignature] = useState(4);
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
        originalKey: keyRoot || undefined,
        mode: keyRoot ? (SONG_MODE_TO_ENUM[keyMode] ?? 'IONIAN') : undefined,
        instrument,
        capo: capo ? parseInt(capo, 10) : undefined,
        tempo: tempo ? parseInt(tempo, 10) : undefined,
        rawChordSheet,
        timeSignature,
      });
      setTitle('');
      setArtist('');
      setKeyRoot('');
      setKeyMode('');
      setInstrument('GUITAR');
      setCapo('');
      setTempo('');
      setTimeSignature(4);
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
          value={keyRoot}
          onChange={e => setKeyRoot(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
        >
          <option value="">Key (optional)</option>
          {CHROMATIC_NOTES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={keyMode}
          onChange={e => setKeyMode(e.target.value)}
          disabled={!keyRoot}
          className="w-24 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 disabled:opacity-40"
        >
          {SONG_MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Capo"
          min={0}
          max={11}
          value={capo}
          onChange={e => setCapo(e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="BPM"
          min={1}
          value={tempo}
          onChange={e => setTempo(e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <select
          value={timeSignature}
          onChange={e => setTimeSignature(Number(e.target.value))}
          className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
        >
          <option value={1}>1/4</option>
          <option value={2}>2/4</option>
          <option value={3}>3/4</option>
          <option value={4}>4/4</option>
          <option value={6}>6/8</option>
        </select>
      </div>
      <InstrumentSelector excludeCustom compact instrument={instrument} onInstrumentChange={setInstrument} />
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
