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

// Chromatic index for each NOTE_KEYS value
const ROOT_INDEX: Record<string, number> = {
  C: 0, C_SHARP: 1, D: 2, D_SHARP: 3, E: 4, F: 5,
  F_SHARP: 6, G: 7, G_SHARP: 8, A: 9, B_FLAT: 10, B: 11,
};

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

export function getCagedZones(root: string): CagedZone[] {
  const R = ROOT_INDEX[root] ?? 0;
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
