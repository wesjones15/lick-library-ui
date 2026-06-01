import { formatNoteEnum, MODE_DATA } from '../../core/music';
import { BTN_SM, SELECT } from '../../core/ui';
import { C_GRAY_BG_50, C_GRAY_BG_800, C_GRAY_BORDER_200, C_GRAY_BORDER_300, C_GRAY_BORDER_800, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_WHITE_TEXT } from '../../core/colors';

const GRID_NOTES = [
  ['C', 'C_SHARP', 'D', 'D_SHARP'],
  ['E', 'F', 'F_SHARP', 'G'],
  ['G_SHARP', 'A', 'B_FLAT', 'B'],
];



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
          className={`${BTN_SM} ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50}`}
        >
          Pentatonic
        </button>
      </div>
    );
  }

  return (
    <div className={`mt-4 p-3 border ${C_GRAY_BORDER_200} rounded-lg ${C_GRAY_BG_50} inline-block`}>
      {/* Row 1: toggle button + mode dropdown */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`${BTN_SM} ${C_GRAY_BG_800} ${C_WHITE_TEXT} ${C_GRAY_BORDER_800}`}
        >
          Pentatonic
        </button>
        <select
          className={SELECT}
          value={pentWidgetMode}
          onChange={e => onModeChange(e.target.value)}
        >
          {MODE_DATA.map(m => (
            <option key={m.value} value={m.value}>{m.longLabel}</option>
          ))}
        </select>
      </div>

      {/* Row 2: Clear (left, space-preserved) + synced (right, space-preserved) */}
      <div className="flex justify-between mt-1 h-4">
        <button
          style={{ visibility: activePentKeys.length > 0 ? 'visible' : 'hidden' }}
          onClick={() => activePentKeys.forEach(k => onKeyToggle(k))}
          className={`text-xs ${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} underline`}
        >
          Clear
        </button>
        <span className={`text-xs ${C_GRAY_TEXT_400}`} style={{ visibility: pentModeSynced ? 'visible' : 'hidden' }}>
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
                      ? '${C_GRAY_BG_800} ${C_WHITE_TEXT} ${C_GRAY_BORDER_800}'
                      : isFull
                        ? '${C_THEORY_BG_SOFT} ${C_THEORY_BORDER} ${C_THEORY_TEXT}'
                        : isPartial
                          ? '${C_TEMPO_BG_SOFT} ${C_TEMPO_BORDER_MID} ${C_TEMPO_TEXT_MID}'
                          : '${C_WHITE_BG} ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_100}'
                  }`}
                >
                  {formatNoteEnum(key)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
