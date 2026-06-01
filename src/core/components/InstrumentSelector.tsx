import { INSTRUMENT_LIST } from '../music';
import type { InstrumentName } from '../music';
import { C_DANGER_TEXT_SOFT, C_PRIMARY_BG, C_PRIMARY_BG_DARK, C_WHITE_TEXT } from '../colors';

interface Props {
  instrument: InstrumentName;
  customTuning?: string;
  onInstrumentChange: (name: InstrumentName) => void;
  onCustomTuningChange?: (tuning: string) => void;
  onSubmit?: () => void;
  error?: string | null;
  excludeCustom?: boolean;
  compact?: boolean;
}


const SELECT_CLASS =
  'border ${C_GRAY_BORDER_300} rounded-lg ${C_WHITE_BG} focus:outline-none focus:${C_PRIMARY_BORDER_MID}';

export default function InstrumentSelector({
  instrument, customTuning = '', onInstrumentChange, onCustomTuningChange, onSubmit, error, excludeCustom = false, compact = false,
}: Props) {
  const options = excludeCustom ? INSTRUMENT_LIST.filter(i => i.value !== 'CUSTOM') : INSTRUMENT_LIST;
  const sizeClass = compact ? 'px-1.5 py-0.5 text-xs' : 'px-3 py-2 text-sm';
  return (
    <div className="flex flex-col gap-1">
      <select
        value={instrument}
        onChange={e => onInstrumentChange(e.target.value as InstrumentName)}
        className={`${SELECT_CLASS} ${sizeClass}`}
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
            type="button"
            onClick={onSubmit}
            className={`px-3 py-2 text-sm ${C_PRIMARY_BG} ${C_WHITE_TEXT} rounded-lg hover:${C_PRIMARY_BG_DARK}`}
          >
            Apply
          </button>
        </div>
      )}

      {error && <p className={`${C_DANGER_TEXT_SOFT} text-xs`}>{error}</p>}
    </div>
  );
}
