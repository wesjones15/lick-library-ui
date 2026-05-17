import { useState, useEffect } from 'react';
import { getAllLicks, deleteLick } from '../../core/api/client';
import type { LickSummary } from '../../core/api/client';
import LickList from './LickList';
import InstrumentSelector from '../../components/InstrumentSelector';
import { useInstrument } from '../../core/useInstrument';

export default function LickLibraryPage() {
  const [licks, setLicks] = useState<LickSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeSongLicks, setIncludeSongLicks] = useState(false);
  const { instrument, customTuning, setInstrument, setCustomTuning } = useInstrument();

  const fetchLicks = async () => {
    try {
      setError(null);
      const data = await getAllLicks(includeSongLicks);
      setLicks(data);
    } catch {
      setError('Could not connect to backend. Is it running on port 8080?');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLick(id);
      fetchLicks();
    } catch {
      setError('Failed to delete lick.');
    }
  };

  useEffect(() => { fetchLicks(); }, [includeSongLicks]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Lick Library</h1>

      <div className="mb-6 flex items-start gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2.5">Instrument</span>
        <InstrumentSelector
          instrument={instrument}
          customTuning={customTuning}
          onInstrumentChange={setInstrument}
          onCustomTuningChange={setCustomTuning}
        />
        <button
          onClick={() => setIncludeSongLicks(v => !v)}
          className={`ml-auto px-3 py-1.5 text-xs rounded-lg border transition-colors ${includeSongLicks ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
        >
          {includeSongLicks ? 'Song Licks: on' : 'Song Licks'}
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!loading && !error && <LickList licks={licks} onDelete={handleDelete} />}
    </div>
  );
}
