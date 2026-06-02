import { useState, useEffect, useCallback } from 'react';
import LickSubNav from './LickSubNav';
import { getAllLicks, deleteLick, forkLick } from '../../core/api/client';
import type { LickSummary } from '../../core/api/client';
import LickList from './LickList';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import type { InstrumentName } from '../../core/useInstrument';
import { MODE_DATA } from '../../core/music';
import NumpadInput from '../../core/components/NumpadInput';
import { TOGGLE_SOFT, TOGGLE_SOFT_ON, TOGGLE_SOFT_OFF, INPUT_SM } from '../../core/ui';

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

  const handleFork = async (id: string) => {
    try {
      await forkLick(id);
      fetchLicks();
    } catch {
      setError('Failed to fork lick.');
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
          className={`ml-auto ${TOGGLE_SOFT} ${includeSongLicks ? TOGGLE_SOFT_ON : TOGGLE_SOFT_OFF}`}
        >
          {includeSongLicks ? 'Song Licks: on' : 'Song Licks'}
        </button>
        <button
          onClick={() => setIsManaging(v => !v)}
          className={`${TOGGLE_SOFT} ${isManaging ? TOGGLE_SOFT_ON : TOGGLE_SOFT_OFF}`}
        >
          {isManaging ? 'Managing' : 'Manage'}
        </button>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <select
          value={modeFilter}
          onChange={e => setModeFilter(e.target.value)}
          className={INPUT_SM}
        >
          <option value="">All modes</option>
          {MODE_DATA.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <NumpadInput
          min={0}
          value={minLength}
          onChange={val => setMinLength(val)}
          placeholder="Min length"
          className={`${INPUT_SM} w-24`}
        />
        <NumpadInput
          min={0}
          value={maxLength}
          onChange={val => setMaxLength(val)}
          placeholder="Max length"
          className={`${INPUT_SM} w-24`}
        />
        <input
          type="text"
          value={intervalSearch}
          onChange={e => setIntervalSearch(e.target.value)}
          placeholder="Intervals e.g. 1,b3,4"
          className={`${INPUT_SM} flex-1 min-w-32`}
        />
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-danger-500 text-sm">{error}</p>}
      {!loading && !error && (
        <LickList licks={licks} onDelete={handleDelete} onFork={handleFork} isManaging={isManaging} />
      )}
    </div>
  );
}
