import type { InstrumentName } from '../hooks/useInstrument';

interface Props {
  instrument: InstrumentName;
  customTuning: string;
  onInstrumentChange: (name: InstrumentName) => void;
  onCustomTuningChange: (tuning: string) => void;
  error?: string | null;
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
  instrument, customTuning, onInstrumentChange, onCustomTuningChange, error,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <select
        value={instrument}
        onChange={e => onInstrumentChange(e.target.value as InstrumentName)}
        className={SELECT_CLASS}
      >
        {INSTRUMENTS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      {instrument === 'CUSTOM' && (
        <input
          type="text"
          value={customTuning}
          onChange={e => onCustomTuningChange(e.target.value)}
          placeholder="e.g. E A D G B E"
          className={SELECT_CLASS + ' w-44'}
        />
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
