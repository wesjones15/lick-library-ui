import { GUITAR_OPEN_MIDI, MODE_DATA, MODE_SEMITONES, ROOT_CHROMATIC } from '../../core/music';

// The five CAGED shapes of the major scale, named after the major chord shape each one
// surrounds. Every mode uses these same five shapes, anchored on its parent major scale:
// D Dorian, E Phrygian and A Aeolian all sit exactly where C major's shapes do.

export type ShapeName = 'C' | 'A' | 'G' | 'E' | 'D';

// Order up the neck: C → A → G → E → D, then C again an octave higher.
export const SHAPE_ORDER: ShapeName[] = ['C', 'A', 'G', 'E', 'D'];

// Frets on each string (low E → high e) for C major. Each shape is an unbroken run of
// the scale, every pitch appears once, and the strings ascend in pitch, so reading the
// table string by string gives the notes low to high. Keeping only degrees 1 2 3 5 6
// leaves two notes per string: the five pentatonic boxes.
const C_MAJOR_SHAPES: Record<ShapeName, number[][]> = {
  C: [[0, 1, 3], [0, 2, 3], [0, 2, 3], [0, 2], [0, 1, 3], [0, 1, 3]],
  A: [[3, 5], [2, 3, 5], [2, 3, 5], [2, 4, 5], [3, 5, 6], [3, 5]],
  G: [[5, 7, 8], [5, 7, 8], [5, 7], [4, 5, 7], [5, 6, 8], [5, 7, 8]],
  E: [[7, 8, 10], [7, 8, 10], [7, 9, 10], [7, 9, 10], [8, 10], [7, 8, 10]],
  D: [[10, 12, 13], [10, 12], [9, 10, 12], [9, 10, 12], [10, 12, 13], [10, 12, 13]],
};

// Every shape in every key fits in frets 0–15 (12 is not enough: C major's D shape is 9–13).
export const SCALES_FRET_COUNT = 15;

export interface ShapeNote { string: number; fret: number; midi: number; }

export interface PlacedShape {
  shape: ShapeName;
  notes: ShapeNote[]; // low → high pitch
  lo: number;         // lowest fret used
  hi: number;         // highest fret used
}

// Chromatic index (0–11) of the major scale that contains root+mode.
export function parentMajorRoot(root: string, mode: string): number {
  const degreeIdx = Math.max(0, MODE_DATA.findIndex(m => m.value === mode));
  return ((ROOT_CHROMATIC[root] ?? 0) - MODE_SEMITONES.IONIAN[degreeIdx] + 12) % 12;
}

export function placeShape(shape: ShapeName, root: string, mode: string): PlacedShape {
  const table = C_MAJOR_SHAPES[shape];
  const all = table.flat();
  let shift = parentMajorRoot(root, mode); // semitones above C, 0–11
  // Drop an octave when the shape would run off the top of the neck; it always fits then.
  if (Math.max(...all) + shift > SCALES_FRET_COUNT) shift -= 12;

  const notes = table.flatMap((frets, s) =>
    frets.map(f => ({ string: s, fret: f + shift, midi: GUITAR_OPEN_MIDI[s] + f + shift }))
  );
  return { shape, notes, lo: Math.min(...all) + shift, hi: Math.max(...all) + shift };
}

// The CAGED cycle starting from whichever shape sits lowest on the neck in this key,
// so stepping forward walks up the neck.
export function shapesUpTheNeck(root: string, mode: string): ShapeName[] {
  let start = 0;
  let lowest = Infinity;
  SHAPE_ORDER.forEach((s, i) => {
    const { lo } = placeShape(s, root, mode);
    if (lo < lowest) { lowest = lo; start = i; }
  });
  return [...SHAPE_ORDER.slice(start), ...SHAPE_ORDER.slice(0, start)];
}

// Low to high and back down; the top note is played once.
export function upAndDown<T>(notes: T[]): T[] {
  return [...notes, ...notes.slice(0, -1).reverse()];
}
