import { useState, useEffect } from 'react';
import { getAllLicks, deleteLick } from '../api/client';
import type { LickSummary } from '../api/client';
import LickList from '../components/LickList';
import UploadForm from '../components/UploadForm';

export default function LibraryPage() {
  const [licks, setLicks] = useState<LickSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Upload a Lick
        </h2>
        <UploadForm onSuccess={fetchLicks} />
      </section>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Library
        </h2>
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {!loading && !error && <LickList licks={licks} onDelete={handleDelete} />}
      </section>
    </div>
  );
}
