import type { CagedZone } from './cagedUtils';
import NeckNoteDot from './NeckNoteDot';

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
  capoFret?: number;
}

export const DEGREE_COLORS: Record<number, string> = {
  1: '#ef4444',  // red
  2: '#06d4d4',  // cyan
  3: '#019136',  // green
  4: '#eab308',  // yellow
  5: '#8b5cf6',  // purple
  6: '#3b82f6',  // blue
  7: '#ea7b0c',  // orange
};

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

const STRING_WEIGHTS = [0.5, 0.75, 1.0, 1.35, 1.75, 2.2]; // high e → low E

export default function GuitarNeck({ dots, fretCount = 12, width = '100%', onDotClick, cagedZones, stringLabels, bpm, capoFret }: GuitarNeckProps) {
  const pulseDuration = bpm ? `${Math.round(60000 / bpm)}ms` : '800ms';
  const n = Math.min(dots.length, 6);
  if (dots.length > 6) console.error(`GuitarNeck: max 6 strings supported, got ${dots.length}`);
  const labels = (stringLabels ?? STRING_LABELS_DEFAULT).slice(0, n);
  const strH = n > 1 ? TOTAL_STR_H / (n - 1) : TOTAL_STR_H;

  const vbW = LABEL_W + OPEN_W + NUT_W + fretCount * FRET_W;
  const vbH = TOP_PAD + TOTAL_STR_H + BOT_PAD;

  const xOpen = LABEL_W + OPEN_W / 2;
  const xFret = (f: number) => LABEL_W + OPEN_W + NUT_W + (f - 0.5) * FRET_W;
  const xForFret = (f: number) => (f === 0 ? xOpen : xFret(f));
  const yStr = (di: number) => TOP_PAD + di * strH;
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
        if (svgX < LABEL_W) return;
        const rawDi = (svgY - TOP_PAD) / strH;
        if (rawDi < -0.5 || rawDi > n - 0.5) return;
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

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderAnimations() {
    return (
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
          50%       { transform: scale(1.08); }
        }
        .next-chord-dot { animation: next-chord-scale ${pulseDuration} ease-in-out infinite; }
      `}</style>
    );
  }

  function renderFretboard() {
    return (
      <rect
        x={fretLineStart} y={strLineY0 - 6}
        width={fretCount * FRET_W} height={TOTAL_STR_H + 12}
        fill="#e8d5b7" rx={2}
      />
    );
  }

  function renderCagedZones() {
    return cagedZones?.map(zone => {
      const x = fretLineStart + (zone.fretStart - 1) * FRET_W;
      const w = (zone.fretEnd - zone.fretStart + 1) * FRET_W;
      const y = strLineY0 - 6;
      const h = TOTAL_STR_H + 12;
      return (
        <g key={`caged-${zone.shape}`}>
          <rect x={x} y={y} width={w} height={h} fill={zone.color} rx={2} />
          <text
            x={x + w / 2} y={y + h - 4}
            textAnchor="middle" fontSize={11} fontWeight="700"
            fill="rgba(0,0,0,0.35)" fontFamily="sans-serif"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {zone.shape}
          </text>
        </g>
      );
    });
  }

  function renderFretNumbers() {
    return Array.from({ length: fretCount }, (_, i) => i + 1).map(f => (
      <text
        key={`fn${f}`}
        x={xFret(f)} y={TOP_PAD - 10}
        textAnchor="middle" fontSize={10} fill="#9ca3af" fontFamily="sans-serif"
      >
        {f}
      </text>
    ));
  }

  function renderStringLines() {
    return Array.from({ length: n }, (_, di) => (
      <line
        key={`sl${di}`}
        x1={LABEL_W} y1={yStr(di)} x2={fretLineEnd} y2={yStr(di)}
        stroke="#374151" strokeWidth={getStringWeight(di)}
      />
    ));
  }

  function renderNut() {
    return (
      <rect
        x={LABEL_W + OPEN_W} y={strLineY0}
        width={NUT_W} height={TOTAL_STR_H}
        fill="#374151"
      />
    );
  }

  function renderFretLines() {
    return Array.from({ length: fretCount }, (_, i) => i + 1).map(f => (
      <rect
        key={`fl${f}`}
        x={fretLineStart + f * FRET_W - 1.5} y={strLineY0}
        width={3} height={TOTAL_STR_H}
        fill="#c0c0c0" stroke="#374151" strokeWidth={0.5}
      />
    ));
  }

  function renderCapo() {
    if (!capoFret || capoFret <= 0 || capoFret > fretCount) return null;
    return (
      <rect
        x={xFret(capoFret) - 4} y={strLineY0}
        width={8} height={TOTAL_STR_H}
        rx={4} fill="#7B3F00" opacity={0.75}
      />
    );
  }

  function renderInlays() {
    return (
      <>
        {INLAY_SINGLE.filter(f => f <= fretCount).map(f => (
          <circle key={`in${f}`} cx={xFret(f)} cy={TOP_PAD + TOTAL_STR_H / 2} r={4} fill="#e5e7eb" opacity={0.8} />
        ))}
        {INLAY_DOUBLE <= fretCount && (
          <>
            <circle cx={xFret(INLAY_DOUBLE)} cy={TOP_PAD + TOTAL_STR_H * 1.5 / 5} r={4} fill="#e5e7eb" opacity={0.8} />
            <circle cx={xFret(INLAY_DOUBLE)} cy={TOP_PAD + TOTAL_STR_H * 3.5 / 5} r={4} fill="#e5e7eb" opacity={0.8} />
          </>
        )}
      </>
    );
  }

  function renderStringLabels() {
    return Array.from({ length: n }, (_, di) => (
      <text
        key={`lbl${di}`}
        x={LABEL_W - 5} y={yStr(di) + 4}
        textAnchor="end" fontSize={11} fill="#6b7280" fontFamily="monospace"
      >
        {labels[di]}
      </text>
    ));
  }

  function renderNoteDots() {
    return Array.from({ length: n }, (_, di) => {
      const si = dataIdx(di);
      const row = dots[si] ?? [];
      return Array.from({ length: fretCount + 1 }, (_, fret) => (
        <NeckNoteDot
          key={`d${di}-${fret}`}
          dot={row[fret] ?? { degree: null, active: false }}
          cx={xForFret(fret)}
          cy={yStr(di)}
          pulseDuration={pulseDuration}
        />
      ));
    });
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={width}
      style={{ display: 'block', cursor: onDotClick ? 'pointer' : undefined }}
      aria-label="Guitar neck diagram"
      onClick={handleSvgClick}
    >
      {renderAnimations()}
      {renderFretboard()}
      {renderCagedZones()}
      {renderFretNumbers()}
      {renderStringLines()}
      {renderNut()}
      {renderFretLines()}
      {renderCapo()}
      {renderInlays()}
      {renderStringLabels()}
      {renderNoteDots()}
    </svg>
  );
}
