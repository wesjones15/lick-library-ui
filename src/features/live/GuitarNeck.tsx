export interface NeckDot {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
  active: boolean;
  note?: string; // display label, e.g. "C#", "Bb"
}

interface GuitarNeckProps {
  // dots[string][fret]: string 0 = low E, string 5 = high e; fret 0 = open
  dots: NeckDot[][];
  fretCount?: number;
  width?: number | string;
  onDotClick?: (stringIndex: number, fret: number) => void;
}

const DEGREE_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
  6: '#8b5cf6',
  7: '#ec4899',
};
const OFF_SCALE_COLOR = '#d1d5db';
const ACTIVE_RING_COLOR = '#fef08a';

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E']; // display top → bottom
const STRING_COUNT = 6;
const INLAY_SINGLE = [3, 5, 7, 9];
const INLAY_DOUBLE = 12;

const LABEL_W = 22;
const OPEN_W = 38;
const NUT_W = 5;
const FRET_W = 52;
const TOP_PAD = 28;
const STR_H = 36;
const BOT_PAD = 14;
const R_SMALL = 5;
const R_NORMAL = 9;
const R_RING = 13;

const STRING_WEIGHTS = [0.5, 0.75, 1.0, 1.35, 1.75, 2.2]; // high e → low E

export default function GuitarNeck({ dots, fretCount = 12, width = '100%', onDotClick }: GuitarNeckProps) {
  const vbW = LABEL_W + OPEN_W + NUT_W + fretCount * FRET_W;
  const vbH = TOP_PAD + (STRING_COUNT - 1) * STR_H + BOT_PAD;

  const xOpen = LABEL_W + OPEN_W / 2;
  const xFret = (f: number) => LABEL_W + OPEN_W + NUT_W + (f - 0.5) * FRET_W;
  const xForFret = (f: number) => (f === 0 ? xOpen : xFret(f));
  const yStr = (di: number) => TOP_PAD + di * STR_H; // di 0 = high e (top)
  const dataIdx = (di: number) => STRING_COUNT - 1 - di;

  const fretLineStart = LABEL_W + OPEN_W + NUT_W;
  const fretLineEnd = fretLineStart + fretCount * FRET_W;
  const strLineY0 = TOP_PAD;
  const strLineYN = TOP_PAD + (STRING_COUNT - 1) * STR_H;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={width}
      style={{ display: 'block' }}
      aria-label="Guitar neck diagram"
    >
      {/* Fret numbers */}
      {Array.from({ length: fretCount }, (_, i) => i + 1).map(f => (
        <text
          key={`fn${f}`}
          x={xFret(f)}
          y={TOP_PAD - 10}
          textAnchor="middle"
          fontSize={10}
          fill="#9ca3af"
          fontFamily="sans-serif"
        >
          {f}
        </text>
      ))}

      {/* String lines */}
      {STRING_LABELS.map((_, di) => (
        <line
          key={`sl${di}`}
          x1={LABEL_W}
          y1={yStr(di)}
          x2={fretLineEnd}
          y2={yStr(di)}
          stroke="#6b7280"
          strokeWidth={STRING_WEIGHTS[di]}
        />
      ))}

      {/* Nut */}
      <rect
        x={LABEL_W + OPEN_W}
        y={strLineY0}
        width={NUT_W}
        height={strLineYN - strLineY0}
        fill="#374151"
      />

      {/* Fret lines */}
      {Array.from({ length: fretCount }, (_, i) => i + 1).map(f => (
        <line
          key={`fl${f}`}
          x1={fretLineStart + f * FRET_W}
          y1={strLineY0}
          x2={fretLineStart + f * FRET_W}
          y2={strLineYN}
          stroke="#d1d5db"
          strokeWidth={1}
        />
      ))}

      {/* Inlay dots */}
      {INLAY_SINGLE.filter(f => f <= fretCount).map(f => (
        <circle
          key={`in${f}`}
          cx={xFret(f)}
          cy={TOP_PAD + (STRING_COUNT - 1) * STR_H / 2}
          r={4}
          fill="#e5e7eb"
          opacity={0.8}
        />
      ))}
      {INLAY_DOUBLE <= fretCount && (
        <>
          <circle
            cx={xFret(INLAY_DOUBLE)}
            cy={TOP_PAD + 1.5 * STR_H}
            r={4}
            fill="#e5e7eb"
            opacity={0.8}
          />
          <circle
            cx={xFret(INLAY_DOUBLE)}
            cy={TOP_PAD + 3.5 * STR_H}
            r={4}
            fill="#e5e7eb"
            opacity={0.8}
          />
        </>
      )}

      {/* String labels */}
      {STRING_LABELS.map((label, di) => (
        <text
          key={`lbl${di}`}
          x={LABEL_W - 5}
          y={yStr(di) + 4}
          textAnchor="end"
          fontSize={11}
          fill="#6b7280"
          fontFamily="monospace"
        >
          {label}
        </text>
      ))}

      {/* Note dots */}
      {STRING_LABELS.map((_, di) => {
        const si = dataIdx(di);
        const row = dots[si] ?? [];
        return Array.from({ length: fretCount + 1 }, (_, fret) => {
          const dot: NeckDot = row[fret] ?? { degree: null, active: false };
          const cx = xForFret(fret);
          const cy = yStr(di);

          if (dot.degree === null) {
            return (
              <circle key={`d${di}-${fret}`} cx={cx} cy={cy} r={R_SMALL} fill={OFF_SCALE_COLOR} />
            );
          }

          const color = DEGREE_COLORS[dot.degree];
          const label = dot.note ?? '';
          const textFill = dot.active ? '#111827' : '#9ca3af';
          const fontSize = label.length > 1 ? 5.5 : 7;
          const si = dataIdx(di);
          return (
            <g
              key={`d${di}-${fret}`}
              onClick={onDotClick ? () => onDotClick(si, fret) : undefined}
              style={onDotClick ? { cursor: 'pointer' } : undefined}
            >
              {dot.active && (
                <circle cx={cx} cy={cy} r={R_RING} fill={ACTIVE_RING_COLOR} />
              )}
              {/* white backing makes dot opaque over the string line */}
              <circle cx={cx} cy={cy} r={R_NORMAL} fill="#ffffff" />
              <circle cx={cx} cy={cy} r={R_NORMAL} fill={color} opacity={dot.active ? 1 : 0.4} />
              <text
                x={cx}
                y={cy + fontSize * 0.38}
                textAnchor="middle"
                fontSize={fontSize}
                fill={textFill}
                fontFamily="sans-serif"
                fontWeight="600"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {label}
              </text>
            </g>
          );
        });
      })}
    </svg>
  );
}
