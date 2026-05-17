import type { CagedZone, PentatonicGroup } from './cagedUtils';

export interface NeckDot {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
  active: boolean;
  candidate?: boolean;
  candidateColor?: string;       // degree color for pulse stroke; replaces hardcoded dark-red
  ownNote?: boolean;             // same-degree candidate — dimmed relative to other candidates
  note?: string;                 // display label, e.g. "C#", "Bb"
  pentatonicGroup?: PentatonicGroup | null; // which of the 3 pentatonic subsets this note belongs to
}

interface GuitarNeckProps {
  // dots[string][fret]: string 0 = low E, string 5 = high e; fret 0 = open
  dots: NeckDot[][];
  fretCount?: number;
  width?: number | string;
  onDotClick?: (stringIndex: number, fret: number) => void;
  cagedZones?: CagedZone[];
}

export const DEGREE_COLORS: Record<number, string> = {
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
const PENT_COLORS: Record<number, string> = { 1: '#f59e0b', 2: '#14b8a6', 3: '#a855f7' };

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

export default function GuitarNeck({ dots, fretCount = 12, width = '100%', onDotClick, cagedZones }: GuitarNeckProps) {
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
      <style>{`
        @keyframes candidate-stroke {
          0%, 100% { stroke-width: 1; }
          50%       { stroke-width: 4; }
        }
        .candidate-dot { animation: candidate-stroke 0.8s ease-in-out infinite; }
      `}</style>
      {/* Tan fretboard backdrop */}
      <rect
        x={fretLineStart}
        y={strLineY0 - 6}
        width={fretCount * FRET_W}
        height={(STRING_COUNT - 1) * STR_H + 12}
        fill="#e8d5b7"
        rx={2}
      />

      {/* CAGED zone overlays — semi-transparent rects layered above fretboard */}
      {cagedZones?.map(zone => {
        const x = fretLineStart + (zone.fretStart - 1) * FRET_W;
        const w = (zone.fretEnd - zone.fretStart + 1) * FRET_W;
        const y = strLineY0 - 6;
        const h = (STRING_COUNT - 1) * STR_H + 12;
        return (
          <g key={`caged-${zone.shape}`}>
            <rect x={x} y={y} width={w} height={h} fill={zone.color} rx={2} />
            <text
              x={x + w / 2}
              y={y + h - 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight="700"
              fill="rgba(0,0,0,0.35)"
              fontFamily="sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {zone.shape}
            </text>
          </g>
        );
      })}

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
          stroke="#374151"
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

      {/* Fret lines — silver bar with black outlines */}
      {Array.from({ length: fretCount }, (_, i) => i + 1).map(f => (
        <rect
          key={`fl${f}`}
          x={fretLineStart + f * FRET_W - 1.5}
          y={strLineY0}
          width={3}
          height={strLineYN - strLineY0}
          fill="#c0c0c0"
          stroke="#374151"
          strokeWidth={0.5}
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
          const isCandidate = dot.candidate && !dot.active;
          const bright = dot.active || isCandidate;
          const textFill = bright ? '#111827' : '#9ca3af';
          const fontSize = dot.active
            ? (label.length > 1 ? 9 : 11)
            : (label.length > 1 ? 7 : 9);
          const si = dataIdx(di);
          const candidateStroke = isCandidate ? (dot.candidateColor ?? '#800020') : 'none';
          return (
            <g
              key={`d${di}-${fret}`}
              onClick={onDotClick ? () => onDotClick(si, fret) : undefined}
              style={onDotClick ? { cursor: 'pointer' } : undefined}
              opacity={dot.ownNote ? 0.5 : 1}
            >
              {/* active ring: dark outer outline + filled pale yellow (larger than before) */}
              {dot.active && (
                <circle cx={cx} cy={cy} r={16} fill="none" stroke="#374151" strokeWidth={1} />
              )}
              {dot.active && (
                <circle cx={cx} cy={cy} r={R_RING} fill={ACTIVE_RING_COLOR} />
              )}
              {/* white backing — larger for candidates to cover stroke bleed */}
              <circle cx={cx} cy={cy} r={isCandidate ? R_NORMAL + 3 : R_NORMAL} fill="#ffffff" />
              {/* colored circle — stroke on candidate pulses via CSS */}
              <circle
                cx={cx} cy={cy} r={R_NORMAL}
                fill={color} opacity={bright ? 1 : 0.4}
                stroke={candidateStroke}
                strokeWidth={isCandidate ? 1 : 0}
                style={isCandidate ? { stroke: candidateStroke } : undefined}
                className={isCandidate ? 'candidate-dot' : undefined}
              />
              {/* Pentatonic group ring — thin colored ring just outside the dot */}
              {dot.pentatonicGroup && PENT_COLORS[dot.pentatonicGroup] && (
                <circle
                  cx={cx} cy={cy} r={11.5}
                  fill="none"
                  stroke={PENT_COLORS[dot.pentatonicGroup]}
                  strokeWidth={2}
                  opacity={bright ? 0.9 : 0.6}
                  style={{ pointerEvents: 'none' }}
                />
              )}
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
