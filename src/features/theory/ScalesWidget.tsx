import { BTN_SM, BTN_XS, TOGGLE, TOGGLE_ON, TOGGLE_OFF } from '../../core/ui';
import { CHROMATIC_NOTES } from '../../core/music';
import type { MatchMode, Heard } from '../../core/sound/usePitchTracker';
import { SHAPE_ORDER, type ShapeName } from './scaleShapes';

interface ScalesWidgetProps {
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
  shape: ShapeName;
  onShape: (s: ShapeName) => void;
  onPrev: () => void;
  onNext: () => void;
  pentatonic: boolean;
  onPentatonic: (v: boolean) => void;
  drill: boolean;
  onDrill: (v: boolean) => void;
  matchMode: MatchMode;
  onMatchMode: (m: MatchMode) => void;
  refNote: boolean;
  onRefNote: (v: boolean) => void;
  progress: { idx: number; total: number } | null;
  heard: Heard | null;
  micError: string | null;
  micSuspended: boolean;
  onResumeMic: () => void;
}

function Toggle({ options, value, onChange }: {
  options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex">
      {options.map((o, i) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`${TOGGLE} ${value === o.value ? TOGGLE_ON : TOGGLE_OFF} ${
            i === 0 ? 'rounded-r-none' : 'rounded-l-none -ml-0.5'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function formatHeard(h: Heard): string {
  const name = CHROMATIC_NOTES[((h.midi % 12) + 12) % 12];
  const octave = Math.floor(h.midi / 12) - 1;
  const cents = h.cents === 0 ? '±0' : h.cents > 0 ? `+${h.cents}` : `${h.cents}`;
  return `${name}${octave} ${cents}¢`;
}

export default function ScalesWidget(p: ScalesWidgetProps) {
  if (!p.show) {
    return (
      <div className="mt-4 p-3 inline-block">
        <button
          onClick={p.onToggle}
          disabled={p.disabled}
          title={p.disabled ? 'CAGED shapes are for standard-tuned guitar' : undefined}
          className={`${BTN_SM} border-gray-400 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent`}
        >
          Scales
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 border-2 border-gray-400 rounded-lg bg-gray-50 inline-block">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={p.onToggle} className={`${BTN_SM} bg-gray-800 text-white border-gray-800`}>
          Scales
        </button>
        <Toggle
          options={[{ value: 'penta', label: 'Pentatonic' }, { value: 'full', label: 'Full' }]}
          value={p.pentatonic ? 'penta' : 'full'}
          onChange={v => p.onPentatonic(v === 'penta')}
        />
        <Toggle
          options={[{ value: 'tap', label: 'Tap' }, { value: 'drill', label: 'Drill' }]}
          value={p.drill ? 'drill' : 'tap'}
          onChange={v => p.onDrill(v === 'drill')}
        />
        <button
          onClick={() => p.onRefNote(!p.refNote)}
          className={`${TOGGLE} ${p.refNote ? TOGGLE_ON : TOGGLE_OFF}`}
        >
          Ref note
        </button>
      </div>

      {/* Shape picker */}
      <div className="flex items-center gap-1.5 mt-2">
        <button onClick={p.onPrev} className={`${BTN_XS} border-gray-400 text-gray-700 hover:bg-gray-100 bg-white`} aria-label="Previous shape">◀</button>
        {SHAPE_ORDER.map(s => (
          <button
            key={s}
            onClick={() => p.onShape(s)}
            className={`w-9 py-1 text-sm font-bold rounded border-2 transition-colors ${
              p.shape === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-400 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {s}
          </button>
        ))}
        <button onClick={p.onNext} className={`${BTN_XS} border-gray-400 text-gray-700 hover:bg-gray-100 bg-white`} aria-label="Next shape">▶</button>
      </div>

      <div className="mt-2 text-xs text-gray-700 min-h-4">
        {p.drill ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Toggle
              options={[{ value: 'pitch', label: 'Pitch' }, { value: 'any', label: 'Any note' }]}
              value={p.matchMode}
              onChange={v => p.onMatchMode(v as MatchMode)}
            />
            {p.progress && <span className="font-medium text-gray-900">Note {p.progress.idx + 1} / {p.progress.total}</span>}
            {p.micError ? (
              <span className="text-danger-8">{p.micError}</span>
            ) : p.micSuspended ? (
              <button onClick={p.onResumeMic} className={`${BTN_XS} border-gray-400 bg-white text-gray-800`}>Tap to start mic</button>
            ) : (
              <span className="font-mono">Hearing: {p.heard ? formatHeard(p.heard) : '—'}</span>
            )}
          </div>
        ) : (
          <span>Tap the neck for the next shape.</span>
        )}
      </div>
      {p.drill && <div className="text-xs text-gray-600 mt-1">Play the pulsing note. Tap the neck to skip a note.</div>}
    </div>
  );
}
