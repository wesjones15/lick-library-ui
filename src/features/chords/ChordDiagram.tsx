import { useEffect, useRef } from 'react';
import { SVGuitarChord } from 'svguitar';
import type { Finger, Barre } from 'svguitar';

// index 0 = low E, index 5 = high e; null = muted, 0 = open, positive = fret
export type ChordFrets = (number | null)[];

// Minimum non-zero, non-muted fret shared by ≥ 2 strings = barre.
// fret 0 (open) is excluded, preventing false positives on open chords.
function detectBarre(frets: ChordFrets): { fret: number; fromString: number; toString: number } | null {
  const nonZeroFrets = frets.filter((f): f is number => f !== null && f > 0);
  if (nonZeroFrets.length === 0) return null;
  const minFret = Math.min(...nonZeroFrets);
  // svguitar: string 1 = high e, string 6 = low E  →  svgString = 6 - index
  const stringsAtMin = frets
    .map((f, i) => (f === minFret ? 6 - i : null))
    .filter((s): s is number => s !== null);
  if (stringsAtMin.length < 2) return null;
  return {
    fret: minFret,
    fromString: Math.max(...stringsAtMin),
    toString: Math.min(...stringsAtMin),
  };
}

interface Props {
  frets: ChordFrets;
  width?: number;
}

export default function ChordDiagram({ frets, width = 120 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    const nonZeroFrets = frets.filter((f): f is number => f !== null && f > 0);
    const minFret = nonZeroFrets.length > 0 ? Math.min(...nonZeroFrets) : 0;
    const position = minFret > 4 ? minFret : 1;

    const fingers: Finger[] = frets.map((f, i) => {
      const svgString = 6 - i;
      if (f === null) return [svgString, 'x'];
      if (f === 0) return [svgString, 0];
      return [svgString, f - position + 1];
    });

    const barre = detectBarre(frets);
    const barres: Barre[] = barre
      ? [{ fret: barre.fret - position + 1, fromString: barre.fromString, toString: barre.toString }]
      : [];

    new SVGuitarChord(ref.current)
      .chord({ fingers, barres, position })
      .configure({ strings: 6, frets: 4, showTuning: false })
      .draw();
  }, [frets]);

  return <div ref={ref} style={{ width }} />;
}
