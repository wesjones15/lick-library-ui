import type { CagedZone } from './cagedUtils';

export interface NeckDot {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null;
  active: boolean;
  candidate?: boolean;
  candidateColor?: string;       // degree color for pulse stroke; replaces hardcoded dark-red
  ownNote?: boolean;             // same-degree candidate
  secondCandidate?: boolean;     // 2nd closest candidate from currentNote; renders at 2/3 brightness
  thirdCandidate?: boolean;      // 3rd closest candidate from currentNote; renders at 1/3 brightness
  nextChord?: boolean;           // note is in the upcoming chord; subtle static hint, no animation
  highlighted?: boolean;         // toolbar-selected or pentatonic-active; degree pulse, no pale yellow ring
  note?: string;                 // display label, e.g. "C#", "Bb"
  pentatonicRings?: string[];    // ordered ring colors; index 0 = r=11.5, 1 = r=14.5, 2 = r=17.5
  pentatonicOutOfScale?: boolean; // in active pentatonic but not in diatonic scale → grey pulsing circle
}

interface GuitarNeckProps {
  // dots[string][fret]: string 0 = lowest, string N-1 = highest; fret 0 = open
  dots: NeckDot[][];
  fretCount?: number;
  width?: number | string;
  onDotClick?: (stringIndex: number, fret: number) => void;
  cagedZones?: CagedZone[];
  // Labels displayed left of each string, high string first. Defaults to standard guitar.
  stringLabels?: string[];
  bpm?: number;
}

export const DEGREE_COLORS: Record<number, string> = {
  1: '#ef4444',  // red
  2: '#06b6d4',  // cyan
  3: '#22c55e',  // green
  4: '#eab308',  // yellow
  5: '#8b5cf6',  // purple
  6: '#3b82f6',  // blue
  7: '#ea580c',  // orange
};
const OFF_SCALE_COLOR = '#d1d5db';
const ACTIVE_RING_COLOR = '#fef08a';

const STRING_LABELS_DEFAULT = ['e', 'B', 'G', 'D', 'A', 'E']; // display top → bottom (guitar)
const INLAY_SINGLE = [3, 5, 7, 9];
const INLAY_DOUBLE = 12;

const LABEL_W = 22;
const OPEN_W = 38;
const NUT_W = 5;
const FRET_W = 52;
const TOP_PAD = 28;
const STR_H = 36;
const BOT_PAD = 14;
const TOTAL_STR_H = STR_H * 5; // = 180; total height for 5 string gaps (6-string max)
const R_SMALL = 5;
const R_NORMAL = 9;
const R_RING = 13;

const STRING_WEIGHTS = [0.5, 0.75, 1.0, 1.35, 1.75, 2.2]; // high e → low E

export default function GuitarNeck({ dots, fretCount = 12, width = '100%', onDotClick, cagedZones, stringLabels, bpm }: GuitarNeckProps) {
  const pulseDuration = bpm ? `${Math.round(60000 / bpm)}ms` : '800ms';
  const n = Math.min(dots.length, 6);
  if (dots.length > 6) console.error(`GuitarNeck: max 6 strings supported, got ${dots.length}`);
  const labels = (stringLabels ?? STRING_LABELS_DEFAULT).slice(0, n);
  const strH = n > 1 ? TOTAL_STR_H / (n - 1) : TOTAL_STR_H;

  const vbW = LABEL_W + OPEN_W + NUT_W + fretCount * FRET_W;
  const vbH = TOP_PAD + TOTAL_STR_H + BOT_PAD; // always 222 regardless of string count

  const xOpen = LABEL_W + OPEN_W / 2;
  const xFret = (f: number) => LABEL_W + OPEN_W + NUT_W + (f - 0.5) * FRET_W;
  const xForFret = (f: number) => (f === 0 ? xOpen : xFret(f));
  const yStr = (di: number) => TOP_PAD + di * strH; // di 0 = highest string (top)
  const dataIdx = (di: number) => n - 1 - di;

  function getStringWeight(di: number): number {
    if (n <= 1) return 1.0;
    if (n === 6) return STRING_WEIGHTS[di];
    const t = di * 5 / (n - 1);
    const lo = Math.floor(t);
    const hi = Math.min(5, lo + 1);
    return STRING_WEIGHTS[lo] * (1 - (t - lo)) + STRING_WEIGHTS[hi] * (t - lo);
  }

  const fretLineStart = LABEL_W + OPEN_W + NUT_W;
  const fretLineEnd = fretLineStart + fretCount * FRET_W;
  const strLineY0 = TOP_PAD;
  const strLineYN = TOP_PAD + TOTAL_STR_H;

  // Single SVG-level click handler: computes (string, fret) from raw coordinates.
  // Avoids per-element onClick on SVG <g> elements which have proven unreliable for grey dots.
  const handleSvgClick = onDotClick
    ? (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const svgX = (e.clientX - rect.left) * (vbW / rect.width);
        const svgY = (e.clientY - rect.top) * (vbH / rect.height);
        if (svgX < LABEL_W) return; // string label margin
        const rawDi = (svgY - TOP_PAD) / strH;
        if (rawDi < -0.5 || rawDi > n - 0.5) return; // above/below string band
        const di = Math.max(0, Math.min(n - 1, Math.round(rawDi)));
        const si = n - 1 - di;
        let fret: number;
        if (svgX < fretLineStart) {
          fret = 0;
        } else {
          fret = Math.max(1, Math.min(fretCount, Math.floor((svgX - fretLineStart) / FRET_W) + 1));
        }
        onDotClick(si, fret);
      }
    : undefined;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={width}
      style={{ display: 'block', cursor: onDotClick ? 'pointer' : undefined }}
      aria-label="Guitar neck diagram"
      onClick={handleSvgClick}
    >
      <style>{`
        @keyframes candidate-stroke {
          0%, 100% { stroke-width: 1; }
          50%       { stroke-width: 4; }
        }
        .candidate-dot { animation: candidate-stroke ${pulseDuration} ease-in-out infinite; }
        @keyframes active-stroke {
          0%, 100% { stroke-width: 1; }
          50%       { stroke-width: 4; }
        }
        .active-dot { animation: active-stroke ${pulseDuration} ease-in-out infinite; }
        @keyframes next-chord-scale {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.4); }
        }
        .next-chord-dot { animation: next-chord-scale ${pulseDuration} ease-in-out infinite; }
      `}</style>
      {/* Tan fretboard backdrop */}
      <rect
        x={fretLineStart}
        y={strLineY0 - 6}
        width={fretCount * FRET_W}
        height={TOTAL_STR_H + 12}
        fill="#e8d5b7"
        rx={2}
      />

      {/* CAGED zone overlays — semi-transparent rects layered above fretboard */}
      {cagedZones?.map(zone => {
        const x = fretLineStart + (zone.fretStart - 1) * FRET_W;
        const w = (zone.fretEnd - zone.fretStart + 1) * FRET_W;
        const y = strLineY0 - 6;
        const h = TOTAL_STR_H + 12;
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
      {Array.from({ length: n }, (_, di) => (
        <line
          key={`sl${di}`}
          x1={LABEL_W}
          y1={yStr(di)}
          x2={fretLineEnd}
          y2={yStr(di)}
          stroke="#374151"
          strokeWidth={getStringWeight(di)}
        />
      ))}

      {/* Nut */}
      <rect
        x={LABEL_W + OPEN_W}
        y={strLineY0}
        width={NUT_W}
        height={TOTAL_STR_H}
        fill="#374151"
      />

      {/* Fret lines — silver bar with black outlines */}
      {Array.from({ length: fretCount }, (_, i) => i + 1).map(f => (
        <rect
          key={`fl${f}`}
          x={fretLineStart + f * FRET_W - 1.5}
          y={strLineY0}
          width={3}
          height={TOTAL_STR_H}
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
          cy={TOP_PAD + TOTAL_STR_H / 2}
          r={4}
          fill="#e5e7eb"
          opacity={0.8}
        />
      ))}
      {INLAY_DOUBLE <= fretCount && (
        <>
          <circle
            cx={xFret(INLAY_DOUBLE)}
            cy={TOP_PAD + TOTAL_STR_H * 1.5 / 5}
            r={4}
            fill="#e5e7eb"
            opacity={0.8}
          />
          <circle
            cx={xFret(INLAY_DOUBLE)}
            cy={TOP_PAD + TOTAL_STR_H * 3.5 / 5}
            r={4}
            fill="#e5e7eb"
            opacity={0.8}
          />
        </>
      )}

      {/* String labels */}
      {Array.from({ length: n }, (_, di) => (
        <text
          key={`lbl${di}`}
          x={LABEL_W - 5}
          y={yStr(di) + 4}
          textAnchor="end"
          fontSize={11}
          fill="#6b7280"
          fontFamily="monospace"
        >
          {labels[di]}
        </text>
      ))}

      {/* Note dots */}
      {Array.from({ length: n }, (_, di) => {
        const si = dataIdx(di);
        const row = dots[si] ?? [];
        return Array.from({ length: fretCount + 1 }, (_, fret) => {
          const dot: NeckDot = row[fret] ?? { degree: null, active: false };
          const cx = xForFret(fret);
          const cy = yStr(di);

          if (dot.degree === null) {
            if (dot.pentatonicOutOfScale && dot.pentatonicRings?.length) {
              return (
                <g key={`d${di}-${fret}`}>
                  <circle cx={cx} cy={cy} r={R_NORMAL} fill="#9ca3af" className="active-dot"
                    stroke="#9ca3af" strokeWidth={1} />
                  {dot.pentatonicRings.map((color, i) => (
                    <g key={i} style={{ pointerEvents: 'none' }}>
                      <circle cx={cx} cy={cy} r={11.5 + i * 3} fill="none"
                        stroke="rgba(0,0,0,0.55)" strokeWidth={3.5} />
                      <circle cx={cx} cy={cy} r={11.5 + i * 3} fill="none"
                        stroke={color} strokeWidth={2} />
                    </g>
                  ))}
                  {dot.note && (
                    <text x={cx} y={cy + (dot.note.length > 1 ? 7 : 9) * 0.38}
                      textAnchor="middle" fontSize={dot.note.length > 1 ? 7 : 9}
                      fill="#374151" fontFamily="sans-serif" fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {dot.note}
                    </text>
                  )}
                </g>
              );
            }
            if (dot.nextChord && !dot.active && !dot.highlighted) {
              const fontSize = dot.note && dot.note.length > 1 ? 7 : 9;
              return (
                <g key={`d${di}-${fret}`} className="next-chord-dot" style={{ transformOrigin: `${cx}px ${cy}px` }}>
                  <circle cx={cx} cy={cy} r={R_NORMAL} fill={OFF_SCALE_COLOR} />
                  {dot.note && (
                    <text x={cx} y={cy + fontSize * 0.38} textAnchor="middle"
                      fontSize={fontSize} fill="#111827" fontFamily="sans-serif" fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {dot.note}
                    </text>
                  )}
                </g>
              );
            }
            if (dot.active || dot.highlighted) {
              const fontSize = dot.note && dot.note.length > 1 ? 7 : 9;
              return (
                <g key={`d${di}-${fret}`}>
                  <circle cx={cx} cy={cy} r={R_NORMAL} fill={OFF_SCALE_COLOR}
                    className="active-dot" stroke={OFF_SCALE_COLOR} strokeWidth={1} />
                  {dot.note && (
                    <text x={cx} y={cy + fontSize * 0.38} textAnchor="middle"
                      fontSize={fontSize} fill="#111827" fontFamily="sans-serif" fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {dot.note}
                    </text>
                  )}
                </g>
              );
            }
            return (
              <g key={`d${di}-${fret}`}>
                <circle cx={cx} cy={cy} r={R_SMALL} fill={OFF_SCALE_COLOR} />
              </g>
            );
          }

          const color = DEGREE_COLORS[dot.degree];
          const label = dot.note ?? '';
          const isCandidate = dot.candidate && !dot.active;
          const isSecondCandidate = !!dot.secondCandidate && !dot.active && !isCandidate;
          const isThirdCandidate = !!dot.thirdCandidate && !dot.active && !isCandidate && !isSecondCandidate;
          const isHighlighted = !!dot.highlighted && !dot.active;
          const isNextChord = !!dot.nextChord && !dot.active && !isCandidate && !isHighlighted;
          const bright = dot.active || isCandidate || isHighlighted;
          const textFill = (bright || isSecondCandidate || isThirdCandidate) ? '#111827' : '#9ca3af';
          const fontSize = dot.active
            ? (label.length > 1 ? 9 : 11)
            : (label.length > 1 ? 7 : 9);
          const candidateStroke = (isCandidate || isSecondCandidate || isThirdCandidate)
            ? (dot.candidateColor ?? DEGREE_COLORS[dot.degree] ?? '#800020')
            : 'none';
          return (
            <g
              key={`d${di}-${fret}`}
              opacity={isThirdCandidate ? 0.33 : isSecondCandidate ? 0.67 : isCandidate ? 0.8 : 1}
              className={isNextChord ? 'next-chord-dot' : undefined}
              style={isNextChord ? { transformOrigin: `${cx}px ${cy}px` } : undefined}
            >
              {/* pale yellow ring — outer border of active pulse */}
              {dot.active && (
                <circle cx={cx} cy={cy} r={R_RING} fill={ACTIVE_RING_COLOR} />
              )}
              {/* white backing for inactive dots — dim color stays opaque, not translucent */}
              {!bright && !isSecondCandidate && !isThirdCandidate && <circle cx={cx} cy={cy} r={R_NORMAL} fill="#ffffff" />}
              {/* colored circle — stroke pulses via CSS for active, candidate, and second candidate */}
              <circle
                cx={cx} cy={cy} r={R_NORMAL}
                fill={color} opacity={bright || isSecondCandidate || isThirdCandidate ? 1 : 0.4}
                stroke={dot.active ? color : candidateStroke}
                strokeWidth={dot.active || isCandidate || isSecondCandidate || isThirdCandidate || isHighlighted ? 1 : 0}
                style={dot.active ? { stroke: color } : ((isCandidate || isSecondCandidate || isThirdCandidate) ? { stroke: candidateStroke } : (isHighlighted ? { stroke: color } : undefined))}
                className={dot.active || isHighlighted ? 'active-dot' : (isCandidate || isSecondCandidate || isThirdCandidate) ? 'candidate-dot' : undefined}
              />
              {/* Pentatonic rings — one per selected pentatonic key, outward from r=11.5 */}
              {dot.pentatonicRings?.map((color, i) => (
                <g key={i} style={{ pointerEvents: 'none' }} opacity={bright ? 0.9 : 0.6}>
                  <circle cx={cx} cy={cy} r={11.5 + i * 3} fill="none"
                    stroke="rgba(0,0,0,0.55)" strokeWidth={3.5} />
                  <circle cx={cx} cy={cy} r={11.5 + i * 3} fill="none"
                    stroke={color} strokeWidth={2} />
                </g>
              ))}
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
