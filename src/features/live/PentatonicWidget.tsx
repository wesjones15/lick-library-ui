const MODES = [
  { value: 'IONIAN',     label: 'Major (Ionian)'          },
  { value: 'DORIAN',     label: 'Dorian'                  },
  { value: 'PHRYGIAN',   label: 'Phrygian'                },
  { value: 'LYDIAN',     label: 'Lydian'                  },
  { value: 'MIXOLYDIAN', label: 'Mixolydian'              },
  { value: 'AEOLIAN',    label: 'Natural Minor (Aeolian)'  },
  { value: 'LOCRIAN',    label: 'Locrian'                 },
];

const GRID_NOTES = [
  ['C', 'C_SHARP', 'D', 'D_SHARP'],
  ['E', 'F', 'F_SHARP', 'G'],
  ['G_SHARP', 'A', 'B_FLAT', 'B'],
];

const NOTE_DISPLAY: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#',
  E: 'E', F: 'F', F_SHARP: 'F#', G: 'G',
  G_SHARP: 'G#', A: 'A', B_FLAT: 'Bb', B: 'B',
};

const selectClass = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white';
const btnClass = 'px-4 py-2 text-sm rounded-lg border transition-colors';

interface PentatonicWidgetProps {
  activePentKeys: string[];
  pentWidgetMode: string;
  pentModeSynced: boolean;
  recognizedPentKeys: Set<string>;
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
  return (
    <div className="mt-4">
      <button
        onClick={onToggle}
        className={`${btnClass} text-xs ${show
          ? 'bg-gray-800 text-white border-gray-800'
          : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
      >
        Pentatonic
      </button>

      {show && (
        <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 inline-block">
          {/* Mode selector */}
          <div className="flex items-center gap-2 mb-3">
            <select
              className={selectClass}
              value={pentWidgetMode}
              onChange={e => onModeChange(e.target.value)}
            >
              {MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {pentModeSynced && (
              <span className="text-xs text-gray-400">(synced)</span>
            )}
          </div>

          {/* 4×3 note grid */}
          <div className="flex flex-col gap-1.5">
            {GRID_NOTES.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map(key => {
                  const isActive = activePentKeys.includes(key);
                  const isRecognized = recognizedPentKeys.has(key) && !isActive;
                  return (
                    <button
                      key={key}
                      onClick={() => onKeyToggle(key)}
                      className={`w-12 py-1.5 text-xs font-medium rounded border transition-colors ${
                        isActive
                          ? 'bg-gray-800 text-white border-gray-800'
                          : isRecognized
                            ? 'bg-amber-50 border-amber-400 text-amber-700'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {NOTE_DISPLAY[key]}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {activePentKeys.length > 0 && (
            <button
              onClick={() => activePentKeys.forEach(k => onKeyToggle(k))}
              className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
