// Maps display root names to Java Note enum names
const ROOT_TO_ENUM: Record<string, string> = {
  'C': 'C', 'C#': 'C_SHARP', 'Db': 'C_SHARP',
  'D': 'D', 'D#': 'D_SHARP', 'Eb': 'D_SHARP',
  'E': 'E', 'Fb': 'E',
  'F': 'F', 'F#': 'F_SHARP', 'Gb': 'F_SHARP',
  'G': 'G', 'G#': 'G_SHARP', 'Ab': 'G_SHARP',
  'A': 'A', 'A#': 'B_FLAT', 'Bb': 'B_FLAT',
  'B': 'B', 'Cb': 'B',
};

export interface ParsedChord {
  root: string;   // Java Note enum name (e.g. "C_SHARP")
  quality: string; // chord suffix (e.g. "m", "7", "maj7", "")
}

export function parseChordName(name: string): ParsedChord | null {
  if (!name || name === 'NC' || name === 'N.C.') return null;

  // Strip slash bass note: "G/B" → "G"
  const base = name.split('/')[0];

  // Match root: A-G followed by optional # or b
  const match = base.match(/^([A-G][#b]?)(.*)/);
  if (!match) return null;

  const [, rootDisplay, quality] = match;
  const root = ROOT_TO_ENUM[rootDisplay];
  if (!root) return null;

  return { root, quality };
}
