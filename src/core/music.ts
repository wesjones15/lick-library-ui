export type InstrumentName =
  | 'GUITAR' | 'DROP_D' | 'OPEN_G' | 'OPEN_D' | 'DADGAD' | 'EB'
  | 'BASS' | 'UKULELE' | 'MANDOLIN' | 'BANJO' | 'CUSTOM';

export const INSTRUMENT_LIST: { value: InstrumentName; label: string }[] = [
  { value: 'GUITAR',   label: 'Standard Guitar' },
  { value: 'DROP_D',   label: 'Drop D'          },
  { value: 'OPEN_G',   label: 'Open G'          },
  { value: 'OPEN_D',   label: 'Open D'          },
  { value: 'DADGAD',   label: 'DADGAD'          },
  { value: 'EB',       label: 'Eb Tuning'       },
  { value: 'BASS',     label: 'Bass'            },
  { value: 'UKULELE',  label: 'Ukulele'         },
  { value: 'MANDOLIN', label: 'Mandolin'        },
  { value: 'BANJO',    label: 'Banjo'           },
  { value: 'CUSTOM',   label: 'Custom…'         },
];

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

export const NOTE_LABEL_TO_KEY: Record<string, string> =
  Object.fromEntries(NOTE_KEYS.map(({ value, label }) => [label, value]));

export const KEY_LABEL: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#',
  E: 'E', F: 'F', F_SHARP: 'F#', G: 'G',
  G_SHARP: 'G#', A: 'A', B_FLAT: 'Bb', B: 'B',
};

export const MODE_DATA = [
  { value: 'IONIAN',     suffix: '',            label: 'Major',      longLabel: 'Major (Ionian)'          },
  { value: 'DORIAN',     suffix: ' Dorian',     label: 'Dorian',     longLabel: 'Dorian'                  },
  { value: 'PHRYGIAN',   suffix: ' Phrygian',   label: 'Phrygian',   longLabel: 'Phrygian'                },
  { value: 'LYDIAN',     suffix: ' Lydian',     label: 'Lydian',     longLabel: 'Lydian'                  },
  { value: 'MIXOLYDIAN', suffix: ' Mixolydian', label: 'Mixolydian', longLabel: 'Mixolydian'              },
  { value: 'AEOLIAN',    suffix: 'm',           label: 'Minor',      longLabel: 'Natural Minor (Aeolian)' },
  { value: 'LOCRIAN',    suffix: ' Locrian',    label: 'Locrian',    longLabel: 'Locrian'                 },
] as const;

export const MODE_SUFFIX: Record<string, string> =
  Object.fromEntries(MODE_DATA.filter(m => m.suffix).map(m => [m.value, m.suffix]));

export const SONG_MODE_TO_ENUM: Record<string, string> =
  Object.fromEntries(MODE_DATA.map(m => [m.suffix, m.value]));

export function formatKeyWithMode(root: string, mode: string): string {
  return root + (MODE_SUFFIX[mode] ?? '');
}

export const MODE_INTERVALS: Record<string, string[]> = {
  IONIAN:     ['1', '2',  '3',  '4',  '5',  '6',  '7' ],
  DORIAN:     ['1', '2',  'b3', '4',  '5',  '6',  'b7'],
  PHRYGIAN:   ['1', 'b2', 'b3', '4',  '5',  'b6', 'b7'],
  LYDIAN:     ['1', '2',  '3',  '#4', '5',  '6',  '7' ],
  MIXOLYDIAN: ['1', '2',  '3',  '4',  '5',  '6',  'b7'],
  AEOLIAN:    ['1', '2',  'b3', '4',  '5',  'b6', 'b7'],
  LOCRIAN:    ['1', 'b2', 'b3', '4',  'b5', 'b6', 'b7'],
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

// Guitar standard tuning MIDI values, low string first (E A D G B e)
export const GUITAR_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

// Semitone offsets from root for each scale degree, by mode
export const MODE_SEMITONES: Record<string, number[]> = {
  IONIAN:     [0, 2, 4, 5, 7, 9, 11],
  DORIAN:     [0, 2, 3, 5, 7, 9, 10],
  PHRYGIAN:   [0, 1, 3, 5, 7, 8, 10],
  LYDIAN:     [0, 2, 4, 6, 7, 9, 11],
  MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],
  AEOLIAN:    [0, 2, 3, 5, 7, 8, 10],
  LOCRIAN:    [0, 1, 3, 5, 6, 8, 10],
};

// Chromatic index for each NOTE_KEYS enum value
export const ROOT_CHROMATIC: Record<string, number> = {
  C: 0, C_SHARP: 1, D: 2, D_SHARP: 3, E: 4,  F: 5,
  F_SHARP: 6, G: 7, G_SHARP: 8, A: 9, B_FLAT: 10, B: 11,
};

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
