export const NOTE_KEYS: { value: string; label: string }[] = [
  { value: 'C',       label: 'C'  },
  { value: 'C_SHARP', label: 'C#' },
  { value: 'D',       label: 'D'  },
  { value: 'D_SHARP', label: 'D#' },
  { value: 'E',       label: 'E'  },
  { value: 'F',       label: 'F'  },
  { value: 'F_SHARP', label: 'F#' },
  { value: 'G',       label: 'G'  },
  { value: 'G_SHARP', label: 'G#' },
  { value: 'A',       label: 'A'  },
  { value: 'B_FLAT',  label: 'Bb' },
  { value: 'B',       label: 'B'  },
];

export const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export const KEY_LABEL: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#',
  E: 'E', F: 'F', F_SHARP: 'F#', G: 'G',
  G_SHARP: 'G#', A: 'A', B_FLAT: 'Bb', B: 'B',
};

export const MODES = ['IONIAN', 'DORIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN'];

export const MODE_LABELS: Record<string, string> = {
  IONIAN: 'Major', DORIAN: 'Dorian', PHRYGIAN: 'Phrygian', LYDIAN: 'Lydian',
  MIXOLYDIAN: 'Mixolydian', AEOLIAN: 'Minor', LOCRIAN: 'Locrian',
};

export function formatNoteEnum(enumName: string): string {
  if (enumName === 'B_FLAT') return 'Bb';
  return enumName.replace('_SHARP', '#');
}

export const EMPTY_TAB =
  'e|----------------|\n' +
  'B|----------------|\n' +
  'G|----------------|\n' +
  'D|----------------|\n' +
  'A|----------------|\n' +
  'E|----------------|';

export const VALID_INPUT = /^[0-9hp/\\-]$/;
