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

// Semitone offsets matching Java Note enum ordinals
const NOTE_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

export interface ParsedChord {
  root: string;   // Java Note enum name (e.g. "C_SHARP")
  quality: string; // chord suffix, slash chords encoded as e.g. "/4" or "m/3"
}

export function parseChordName(name: string): ParsedChord | null {
  if (!name || name === 'NC' || name === 'N.C.') return null;

  const slashIdx = name.indexOf('/');
  const base = slashIdx !== -1 ? name.slice(0, slashIdx) : name;
  const bassDisplay = slashIdx !== -1 ? name.slice(slashIdx + 1) : null;

  // Match root: A-G followed by optional # or b
  const match = base.match(/^([A-G][#b]?)(.*)/);
  if (!match) return null;

  const [, rootDisplay, baseQuality] = match;
  const root = ROOT_TO_ENUM[rootDisplay];
  if (!root) return null;

  let quality = baseQuality;

  if (bassDisplay) {
    const rootSemitone = NOTE_SEMITONES[rootDisplay];
    const bassSemitone = NOTE_SEMITONES[bassDisplay];
    if (rootSemitone !== undefined && bassSemitone !== undefined) {
      const interval = (bassSemitone - rootSemitone + 12) % 12;
      quality = `${baseQuality}/${interval}`;
    }
  }

  return { root, quality };
}
