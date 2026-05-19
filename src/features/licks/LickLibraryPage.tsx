import { useState, useEffect, useCallback } from 'react';
import LickSubNav from './LickSubNav';
import { getAllLicks, deleteLick } from '../../core/api/client';
import type { LickSummary } from '../../core/api/client';
import LickList from './LickList';
import InstrumentSelector from '../../components/InstrumentSelector';
import type { InstrumentName } from '../../core/useInstrument';
import { MODES } from '../../core/music';

const TOGGLE_BASE = 'px-3 py-1.5 text-xs rounded-lg border transition-colors';
const TOGGLE_ON = 'border-indigo-300 bg-indigo-50 text-indigo-600';
const TOGGLE_OFF = 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300';
const INPUT_CLASS = 'border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400';

export default function LickLibraryPage() {
  const [licks, setLicks] = useState<LickSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeSongLicks, setIncludeSongLicks] = useState(false);
  const [modeFilter, setModeFilter] = useState('');
  const [minLength, setMinLength] = useState('');
  const [maxLength, setMaxLength] = useState('');
  const [intervalSearch, setIntervalSearch] = useState('');
  const [isManaging, setIsManaging] = useState(false);
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');
  const [customTuning, setCustomTuning] = useState('');

  const fetchLicks = useCallback(async () => {
    try {
      setError(null);
      const data = await getAllLicks(includeSongLicks, {
        instrument,
        mode: modeFilter || undefined,
        minLength: minLength ? parseInt(minLength) : undefined,
        maxLength: maxLength ? parseInt(maxLength) : undefined,
        intervals: intervalSearch || undefined,
      });
      setLicks(data);
    } catch {
      setError('Could not connect to backend. Is it running on port 8080?');
    } finally {
      setLoading(false);
    }
  }, [includeSongLicks, instrument, modeFilter, minLength, maxLength, intervalSearch]);

  useEffect(() => { fetchLicks(); }, [fetchLicks]);

  const handleDelete = async (id: string) => {
    try {
      await deleteLick(id);
      fetchLicks();
    } catch {
      setError('Failed to delete lick.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <LickSubNav active="library" />

      <div className="mb-4 flex items-start gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2.5">Instrument</span>
        <InstrumentSelector
          instrument={instrument}
          customTuning={customTuning}
          onInstrumentChange={setInstrument}
          onCustomTuningChange={setCustomTuning}
        />
        <button
          onClick={() => setIncludeSongLicks(v => !v)}
          className={`ml-auto ${TOGGLE_BASE} ${includeSongLicks ? TOGGLE_ON : TOGGLE_OFF}`}
        >
          {includeSongLicks ? 'Song Licks: on' : 'Song Licks'}
        </button>
        <button
          onClick={() => setIsManaging(v => !v)}
          className={`${TOGGLE_BASE} ${isManaging ? TOGGLE_ON : TOGGLE_OFF}`}
        >
          {isManaging ? 'Managing' : 'Manage'}
        </button>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <select
          value={modeFilter}
          onChange={e => setModeFilter(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">All modes</option>
          {MODES.map(m => (
            <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={minLength}
          onChange={e => setMinLength(e.target.value)}
          placeholder="Min length"
          className={`${INPUT_CLASS} w-24`}
        />
        <input
          type="number"
          min={0}
          value={maxLength}
          onChange={e => setMaxLength(e.target.value)}
          placeholder="Max length"
          className={`${INPUT_CLASS} w-24`}
        />
        <input
          type="text"
          value={intervalSearch}
          onChange={e => setIntervalSearch(e.target.value)}
          placeholder="Intervals e.g. 1,b3,4"
          className={`${INPUT_CLASS} flex-1 min-w-32`}
        />
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!loading && !error && (
        <LickList licks={licks} onDelete={handleDelete} isManaging={isManaging} />
      )}
    </div>
  );
}
