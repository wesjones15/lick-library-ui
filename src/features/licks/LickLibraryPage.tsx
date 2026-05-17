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
  const { instrument, customTuning, setInstrument, setCustomTuning } = useInstrument();

  const fetchLicks = async () => {
    try {
      setError(null);
      const data = await getAllLicks();
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

  useEffect(() => { fetchLicks(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Lick Library</h1>

      <div className="mb-6 flex items-start gap-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2.5">Instrument</span>
        <InstrumentSelector
          instrument={instrument}
          customTuning={customTuning}
          onInstrumentChange={setInstrument}
          onCustomTuningChange={setCustomTuning}
        />
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!loading && !error && <LickList licks={licks} onDelete={handleDelete} />}
    </div>
  );
}
