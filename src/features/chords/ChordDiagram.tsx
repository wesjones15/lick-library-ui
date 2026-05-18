import { useEffect, useRef } from 'react';
import { SVGuitarChord } from 'svguitar';
import type { Finger, Barre } from 'svguitar';

// index 0 = low E, index 5 = high e; null = muted, 0 = open, positive = fret
export type ChordFrets = (number | null)[];

interface Props {
  frets: ChordFrets;
  width?: number;
  stringCount?: number;
}

export default function ChordDiagram({ frets, width = 120, stringCount = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    const nonZeroFrets = frets.filter((f): f is number => f !== null && f > 0);
    const minFret = nonZeroFrets.length > 0 ? Math.min(...nonZeroFrets) : 0;
    const position = minFret > 4 ? minFret : 1;

    const fingers: Finger[] = frets.map((f, i) => {
      const svgString = stringCount - i;
      if (f === null) return [svgString, 'x'];
      if (f === 0) return [svgString, 0];
      return [svgString, f - position + 1];
    });

    // Minimum non-zero fret shared by ≥ 2 strings = barre (open strings excluded).
    const stringsAtMin = nonZeroFrets.length > 0
      ? frets.map((f, i) => (f === Math.min(...nonZeroFrets) ? stringCount - i : null)).filter((s): s is number => s !== null)
      : [];
    const barres: Barre[] = stringsAtMin.length >= 2
      ? [{ fret: Math.min(...nonZeroFrets) - position + 1, fromString: Math.max(...stringsAtMin), toString: Math.min(...stringsAtMin) }]
      : [];

    new SVGuitarChord(ref.current)
      .chord({ fingers, barres, position })
      .configure({ strings: stringCount, frets: 4, showTuning: false })
      .draw();
  }, [frets, stringCount]);

  return <div ref={ref} style={{ width }} />;
}
