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

export const SONG_MODES: { value: string; label: string }[] = [
  { value: '',            label: 'Major' },
  { value: 'm',           label: 'Minor' },
  { value: ' Dorian',     label: 'Dorian' },
  { value: ' Phrygian',   label: 'Phrygian' },
  { value: ' Lydian',     label: 'Lydian' },
  { value: ' Mixolydian', label: 'Mixolydian' },
  { value: ' Locrian',    label: 'Locrian' },
];

export const SONG_MODE_TO_ENUM: Record<string, string> = {
  '':            'IONIAN',
  'm':           'AEOLIAN',
  ' Dorian':     'DORIAN',
  ' Phrygian':   'PHRYGIAN',
  ' Lydian':     'LYDIAN',
  ' Mixolydian': 'MIXOLYDIAN',
  ' Locrian':    'LOCRIAN',
};

export const MODE_LABELS: Record<string, string> = {
  IONIAN: 'Major', DORIAN: 'Dorian', PHRYGIAN: 'Phrygian', LYDIAN: 'Lydian',
  MIXOLYDIAN: 'Mixolydian', AEOLIAN: 'Minor', LOCRIAN: 'Locrian',
};

export const MODE_SUFFIX: Record<string, string> = {
  AEOLIAN:    'm',
  DORIAN:     ' Dorian',
  PHRYGIAN:   ' Phrygian',
  LYDIAN:     ' Lydian',
  MIXOLYDIAN: ' Mixolydian',
  LOCRIAN:    ' Locrian',
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

export const VALID_INPUT = /^[0-9hp/\\b~|*-]$/;

export type StringEntry = { label: string; fretsIdx: number };

export const INSTRUMENT_STRING_DISPLAY: Record<string, StringEntry[]> = {
  GUITAR:   [{ label: 'e', fretsIdx: 5 }, { label: 'B', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'E', fretsIdx: 0 }],
  DROP_D:   [{ label: 'e', fretsIdx: 5 }, { label: 'B', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }],
  OPEN_G:   [{ label: 'D', fretsIdx: 5 }, { label: 'B', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'G', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }],
  OPEN_D:   [{ label: 'D', fretsIdx: 5 }, { label: 'A', fretsIdx: 4 }, { label: 'F#', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }],
  DADGAD:   [{ label: 'D', fretsIdx: 5 }, { label: 'A', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }],
  EB:       [{ label: 'eb', fretsIdx: 5 }, { label: 'Bb', fretsIdx: 4 }, { label: 'Gb', fretsIdx: 3 }, { label: 'Db', fretsIdx: 2 }, { label: 'Ab', fretsIdx: 1 }, { label: 'Eb', fretsIdx: 0 }],
  BASS:     [{ label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'E', fretsIdx: 0 }],
  UKULELE:  [{ label: 'A', fretsIdx: 3 }, { label: 'E', fretsIdx: 2 }, { label: 'C', fretsIdx: 1 }, { label: 'G', fretsIdx: 0 }],
  MANDOLIN: [{ label: 'E', fretsIdx: 3 }, { label: 'A', fretsIdx: 2 }, { label: 'D', fretsIdx: 1 }, { label: 'G', fretsIdx: 0 }],
  BANJO:    [{ label: 'g', fretsIdx: 4 }, { label: 'D', fretsIdx: 3 }, { label: 'B', fretsIdx: 2 }, { label: 'G', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }],
};

export function getStringCount(instrument: string | null | undefined): number {
  return INSTRUMENT_STRING_DISPLAY[instrument ?? 'GUITAR']?.length ?? 6;
}

export function getStringLabels(instrument: string): string[] {
  return (INSTRUMENT_STRING_DISPLAY[instrument] ?? INSTRUMENT_STRING_DISPLAY.GUITAR).map(e => e.label);
}

// Open-string semitone values from C=0, low string first (index = backend string index)
export const INSTRUMENT_OPEN_SEMITONES: Record<string, number[]> = {
  GUITAR:   [4,  9,  2,  7, 11,  4],  // E A D G B e
  DROP_D:   [2,  9,  2,  7, 11,  4],  // D A D G B e
  OPEN_G:   [2,  7,  2,  7, 11,  2],  // D G D G B D
  OPEN_D:   [2,  9,  2,  6,  9,  2],  // D A D F# A D
  DADGAD:   [2,  9,  2,  7,  9,  2],  // D A D G A D
  EB:       [3,  8,  1,  6, 10,  3],  // Eb Ab Db Gb Bb eb
  BASS:     [4,  9,  2,  7],           // E A D G
  UKULELE:  [7,  0,  4,  9],           // G C E A (reentrant)
  MANDOLIN: [7,  2,  9,  4],           // G D A E
  BANJO:    [2,  7, 11,  2,  7],       // D G B D g
};
