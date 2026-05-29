export interface CagedZone {
  shape: 'C' | 'A' | 'G' | 'E' | 'D';
  fretStart: number;
  fretEnd: number;
  color: string;
}

const CAGED_COLORS: Record<string, string> = {
  E: 'rgba(34,197,94,0.18)',
  D: 'rgba(59,130,246,0.18)',
  C: 'rgba(239,68,68,0.18)',
  A: 'rgba(249,115,22,0.18)',
  G: 'rgba(234,179,8,0.18)',
};

import { MODE_SEMITONES, ROOT_CHROMATIC } from '../../core/music';

// CAGED shape positions defined by the fret where the root note falls on its
// primary string, relative to the root's chromatic index R.
// Reference (G major, R=7): E shape fret 3, D shape 5, C shape 7, A shape 10, G shape 12
// Each shape spans 4 frets (start..start+3, inclusive).
//
// Offsets (shape start fret relative to R):
//   E shape: R - 4  (root on low-E string)
//   D shape: R - 2
//   C shape: R
//   A shape: R + 3
//   G shape: R + 5
// All mod 12, then adjusted to fit the visible neck (frets 1-12 visible in GuitarNeck).

const SHAPE_ORDER: Array<{ shape: CagedZone['shape']; offset: number }> = [
  { shape: 'E', offset: -4 },
  { shape: 'D', offset: -2 },
  { shape: 'C', offset:  0 },
  { shape: 'A', offset:  3 },
  { shape: 'G', offset:  5 },
];

// Pentatonic group membership by scale degree for each mode.
// The 3 pentatonic subsets within a diatonic key are built on scale degrees I, IV, V.
// Group 1 = I pentatonic (degrees 1,2,3,5,6)
// Group 2 = IV pentatonic (degrees 4,5,6,1,2 relative to IV — mapped back to scale: 4,5,6,1,2)
// Group 3 = V pentatonic  (degrees 5,6,7,2,3 relative to V — mapped back to scale: 5,6,7,2,3)
// When a degree belongs to multiple groups, the first (lowest-numbered) group is assigned.
//
// Ionian  (1 2 3 4 5 6 7):
//   1: G1,G2  2: G1,G3  3: G1,G3  4: G2  5: G1,G2,G3  6: G1,G2  7: G3
// Primary assignment: 1→1, 2→1, 3→1, 4→2, 5→1, 6→1, 7→3
//
// For other modes, the interval layout shifts the I/IV/V positions.
// We compute at runtime: find which scale degrees land on steps 1,4,5 of the mode.
//

// Major pentatonic intervals from a root (semitones): 0,2,4,7,9
const PENT_INTERVALS = new Set([0, 2, 4, 7, 9]);

export type PentatonicGroup = 1 | 2 | 3;

// Returns for each scale degree (1-7) which pentatonic group it primarily belongs to, or null.
// Group 1 = pentatonic built on degree 1 of the mode
// Group 2 = pentatonic built on degree 4 (IV)
// Group 3 = pentatonic built on degree 5 (V)
export function getPentatonicGroupMap(mode: string): Record<number, PentatonicGroup | null> {
  const semitones = MODE_SEMITONES[mode] ?? MODE_SEMITONES.IONIAN;
  // Roots of the 3 pentatonics (in semitones from key root):
  const pentRoots = [semitones[0], semitones[3], semitones[4]]; // I, IV, V

  const result: Record<number, PentatonicGroup | null> = {};
  for (let di = 0; di < 7; di++) {
    const degree = di + 1;
    const noteSemitone = semitones[di];
    let assigned: PentatonicGroup | null = null;
    for (let g = 0; g < 3; g++) {
      const interval = (noteSemitone - pentRoots[g] + 12) % 12;
      if (PENT_INTERVALS.has(interval)) {
        assigned = (g + 1) as PentatonicGroup;
        break;
      }
    }
    result[degree] = assigned;
  }
  return result;
}

// Returns the 5 chromatic indices (0–11) for the pentatonic scale of rootKey + mode.
// Uses scale degrees 1,2,3,5,6 (MODE_SEMITONES indices [0,1,2,4,5]).
export function getPentatonicNoteSet(rootKey: string, mode: string): Set<number> {
  const semitones = MODE_SEMITONES[mode] ?? MODE_SEMITONES.IONIAN;
  const root = ROOT_CHROMATIC[rootKey] ?? 0;
  return new Set([0, 1, 2, 4, 5].map(i => (root + semitones[i]) % 12));
}

// Returns the scale degree (1,2,3,5,6) of chromaticNote within the pentatonic of rootKey+mode.
// Returns null if the note is not in that pentatonic.
export function getPentatonicDegree(chromaticNote: number, rootKey: string, mode: string): number | null {
  const semitones = MODE_SEMITONES[mode] ?? MODE_SEMITONES.IONIAN;
  const root = ROOT_CHROMATIC[rootKey] ?? 0;
  const map: Array<[number, number]> = [
    [(root + semitones[0]) % 12, 1],
    [(root + semitones[1]) % 12, 2],
    [(root + semitones[2]) % 12, 3],
    [(root + semitones[4]) % 12, 5],
    [(root + semitones[5]) % 12, 6],
  ];
  return map.find(([n]) => n === chromaticNote)?.[1] ?? null;
}

export function getCagedZones(root: string): CagedZone[] {
  const R = ROOT_CHROMATIC[root] ?? 0;
  const zones: CagedZone[] = [];

  for (const { shape, offset } of SHAPE_ORDER) {
    // Compute raw start fret; normalize into 1-12 range by cycling in octaves
    let start = R + offset;
    // Bring into 1-12 range
    while (start < 1) start += 12;
    while (start > 12) start -= 12;
    const end = start + 3;
    if (end > 15) continue; // skip if it extends too far up for a 12-fret neck
    zones.push({ shape, fretStart: start, fretEnd: end, color: CAGED_COLORS[shape] });
  }

  // Sort by fret start position for predictable rendering order
  zones.sort((a, b) => a.fretStart - b.fretStart);
  return zones;
}
