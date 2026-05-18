import { KEY_LABEL } from '../../core/music';

const MODES = [
  { value: 'IONIAN',     label: 'Ionian (Major)'     },
  { value: 'DORIAN',     label: 'Dorian'              },
  { value: 'PHRYGIAN',   label: 'Phrygian'            },
  { value: 'LYDIAN',     label: 'Lydian'              },
  { value: 'MIXOLYDIAN', label: 'Mixolydian'          },
  { value: 'AEOLIAN',    label: 'Aeolian (N. Minor)'  },
  { value: 'LOCRIAN',    label: 'Locrian'             },
];

const GRID_NOTES = [
  ['C', 'C_SHARP', 'D', 'D_SHARP'],
  ['E', 'F', 'F_SHARP', 'G'],
  ['G_SHARP', 'A', 'B_FLAT', 'B'],
];


const selectClass = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-white';
const btnClass = 'px-3 py-1.5 text-xs rounded-lg border transition-colors';

interface PentatonicWidgetProps {
  activePentKeys: string[];
  pentWidgetMode: string;
  pentModeSynced: boolean;
  recognizedPentKeys: Map<string, 'partial' | 'full'>;
  onKeyToggle: (key: string) => void;
  onModeChange: (mode: string) => void;
  show: boolean;
  onToggle: () => void;
}

export default function PentatonicWidget({
  activePentKeys,
  pentWidgetMode,
  pentModeSynced,
  recognizedPentKeys,
  onKeyToggle,
  onModeChange,
  show,
  onToggle,
}: PentatonicWidgetProps) {
  if (!show) {
    return (
      <div className="mt-4 p-3 inline-block">
        <button
          onClick={onToggle}
          className={`${btnClass} border-gray-300 text-gray-600 hover:bg-gray-50`}
        >
          Pentatonic
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50 inline-block">
      {/* Row 1: toggle button + mode dropdown */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`${btnClass} bg-gray-800 text-white border-gray-800`}
        >
          Pentatonic
        </button>
        <select
          className={selectClass}
          value={pentWidgetMode}
          onChange={e => onModeChange(e.target.value)}
        >
          {MODES.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Row 2: Clear (left, space-preserved) + synced (right, space-preserved) */}
      <div className="flex justify-between mt-1 h-4">
        <button
          style={{ visibility: activePentKeys.length > 0 ? 'visible' : 'hidden' }}
          onClick={() => activePentKeys.forEach(k => onKeyToggle(k))}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Clear
        </button>
        <span className="text-xs text-gray-400" style={{ visibility: pentModeSynced ? 'visible' : 'hidden' }}>
          synced
        </span>
      </div>

      {/* 4×3 note grid */}
      <div className="flex flex-col gap-1.5 mt-1">
        {GRID_NOTES.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.map(key => {
              const isActive = activePentKeys.includes(key);
              const matchLevel = recognizedPentKeys.get(key);
              const isFull = matchLevel === 'full' && !isActive;
              const isPartial = matchLevel === 'partial' && !isActive;
              return (
                <button
                  key={key}
                  onClick={() => onKeyToggle(key)}
                  className={`w-12 py-1.5 text-xs font-medium rounded border transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white border-gray-800'
                      : isFull
                        ? 'bg-orange-50 border-orange-400 text-orange-700'
                        : isPartial
                          ? 'bg-yellow-50 border-yellow-300 text-yellow-600'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {KEY_LABEL[key]}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
