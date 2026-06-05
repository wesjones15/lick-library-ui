import type { NeckDot } from './GuitarNeck';
import { DEGREE_COLORS } from './GuitarNeck';

interface NeckNoteDotProps {
  dot: NeckDot;
  cx: number;
  cy: number;
  pulseDuration: string;
}

const OFF_SCALE_COLOR = '#d1d5db';
const ACTIVE_RING_COLOR = '#fef08a';
const R_SMALL = 5;
const R_NORMAL = 9;
const R_RING = 13;

export default function NeckNoteDot({ dot, cx, cy }: NeckNoteDotProps) {
  if (dot.degree === null) {
    if (dot.pentatonicOutOfScale && dot.pentatonicRings?.length) {
      return (
        <g>
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
        <g className="next-chord-dot" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <circle cx={cx} cy={cy} r={R_NORMAL} fill={OFF_SCALE_COLOR} />
          {dot.note && (
            <text x={cx} y={cy + fontSize * 0.38} textAnchor="middle"
              fontSize={fontSize} fill="#9ca3af" fontFamily="sans-serif" fontWeight="600"
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
        <g>
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
      <g>
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
      opacity={isThirdCandidate ? 0.33 : isSecondCandidate ? 0.67 : isCandidate ? 0.8 : 1}
      className={isNextChord ? 'next-chord-dot' : undefined}
      style={isNextChord ? { transformOrigin: `${cx}px ${cy}px` } : undefined}
    >
      {dot.active && (
        <circle cx={cx} cy={cy} r={R_RING} fill={ACTIVE_RING_COLOR} />
      )}
      {!bright && !isSecondCandidate && !isThirdCandidate && <circle cx={cx} cy={cy} r={R_NORMAL} fill="#ffffff" />}
      <circle
        cx={cx} cy={cy} r={R_NORMAL}
        fill={color} opacity={bright || isSecondCandidate || isThirdCandidate ? 1 : 0.4}
        stroke={dot.active ? color : candidateStroke}
        strokeWidth={dot.active || isCandidate || isSecondCandidate || isThirdCandidate || isHighlighted ? 1 : 0}
        style={dot.active ? { stroke: color } : ((isCandidate || isSecondCandidate || isThirdCandidate) ? { stroke: candidateStroke } : (isHighlighted ? { stroke: color } : undefined))}
        className={dot.active || isHighlighted ? 'active-dot' : (isCandidate || isSecondCandidate || isThirdCandidate) ? 'candidate-dot' : undefined}
      />
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
}
