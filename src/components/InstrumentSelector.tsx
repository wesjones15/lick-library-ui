import type { InstrumentName } from '../core/useInstrument';

interface Props {
  instrument: InstrumentName;
  customTuning?: string;
  onInstrumentChange: (name: InstrumentName) => void;
  onCustomTuningChange?: (tuning: string) => void;
  onSubmit?: () => void;
  error?: string | null;
  excludeCustom?: boolean;
}

const INSTRUMENTS: { value: InstrumentName; label: string }[] = [
  { value: 'GUITAR',   label: 'Standard Guitar' },
  { value: 'DROP_D',   label: 'Drop D' },
  { value: 'OPEN_G',   label: 'Open G' },
  { value: 'OPEN_D',   label: 'Open D' },
  { value: 'DADGAD',   label: 'DADGAD' },
  { value: 'BASS',     label: 'Bass' },
  { value: 'UKULELE',  label: 'Ukulele' },
  { value: 'MANDOLIN', label: 'Mandolin' },
  { value: 'BANJO',    label: 'Banjo' },
  { value: 'CUSTOM',   label: 'Custom…' },
];

const SELECT_CLASS =
  'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400';

export default function InstrumentSelector({
  instrument, customTuning = '', onInstrumentChange, onCustomTuningChange, onSubmit, error, excludeCustom = false,
}: Props) {
  const options = excludeCustom ? INSTRUMENTS.filter(i => i.value !== 'CUSTOM') : INSTRUMENTS;
  return (
    <div className="flex flex-col gap-1">
      <select
        value={instrument}
        onChange={e => onInstrumentChange(e.target.value as InstrumentName)}
        className={SELECT_CLASS}
      >
        {options.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {instrument === 'CUSTOM' && !excludeCustom && (
        <div className="flex gap-1">
          <input
            type="text"
            value={customTuning}
            onChange={e => onCustomTuningChange?.(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit?.(); }}
            placeholder="e.g. E A D G B E"
            className={SELECT_CLASS + ' w-36'}
          />
          <button
            onClick={onSubmit}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
