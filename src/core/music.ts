export type InstrumentName =
  | 'GUITAR' | 'DROP_D' | 'OPEN_G' | 'OPEN_D' | 'DADGAD' | 'EB'
  | 'BASS' | 'UKULELE' | 'MANDOLIN' | 'BANJO' | 'CUSTOM';

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

export const CHROMATIC_NOTES: string[] = NOTE_KEYS.map(n => n.label);

// Chromatic index for each NOTE_KEYS enum value
export const ROOT_CHROMATIC: Record<string, number> =
  Object.fromEntries(NOTE_KEYS.map((n, i) => [n.value, i]));

export const MODE_DATA = [
  { value: 'IONIAN',     suffix: '',            label: 'Major',      longLabel: 'Major (Ionian)',
    intervals: ['1', '2',  '3',  '4',  '5',  '6',  '7' ],  semitones: [0, 2, 4, 5, 7, 9, 11] },
  { value: 'DORIAN',     suffix: ' Dorian',     label: 'Dorian',     longLabel: 'Dorian',
    intervals: ['1', '2',  'b3', '4',  '5',  '6',  'b7'],  semitones: [0, 2, 3, 5, 7, 9, 10] },
  { value: 'PHRYGIAN',   suffix: ' Phrygian',   label: 'Phrygian',   longLabel: 'Phrygian',
    intervals: ['1', 'b2', 'b3', '4',  '5',  'b6', 'b7'],  semitones: [0, 1, 3, 5, 7, 8, 10] },
  { value: 'LYDIAN',     suffix: ' Lydian',     label: 'Lydian',     longLabel: 'Lydian',
    intervals: ['1', '2',  '3',  '#4', '5',  '6',  '7' ],  semitones: [0, 2, 4, 6, 7, 9, 11] },
  { value: 'MIXOLYDIAN', suffix: ' Mixolydian', label: 'Mixolydian', longLabel: 'Mixolydian',
    intervals: ['1', '2',  '3',  '4',  '5',  '6',  'b7'],  semitones: [0, 2, 4, 5, 7, 9, 10] },
  { value: 'AEOLIAN',    suffix: 'm',           label: 'Minor',      longLabel: 'Minor (Aeolian)',
    intervals: ['1', '2',  'b3', '4',  '5',  'b6', 'b7'],  semitones: [0, 2, 3, 5, 7, 8, 10] },
  { value: 'LOCRIAN',    suffix: ' Locrian',    label: 'Locrian',    longLabel: 'Locrian',
    intervals: ['1', 'b2', 'b3', '4',  'b5', 'b6', 'b7'],  semitones: [0, 1, 3, 5, 6, 8, 10] },
] as const;

export const MODE_SUFFIX: Record<string, string> =
  Object.fromEntries(MODE_DATA.filter(m => m.suffix).map(m => [m.value, m.suffix]));

export const SONG_MODE_TO_ENUM: Record<string, string> =
  Object.fromEntries(MODE_DATA.map(m => [m.suffix, m.value]));

export function formatKeyWithMode(root: string, mode: string): string {
  return root + (MODE_SUFFIX[mode] ?? '');
}

export const MODE_INTERVALS: Record<string, string[]> =
  Object.fromEntries(MODE_DATA.map(m => [m.value, [...m.intervals]]));

export const MODE_SEMITONES: Record<string, number[]> =
  Object.fromEntries(MODE_DATA.map(m => [m.value, [...m.semitones]]));

export const INTERVAL_NAMES: string[] =
  ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

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

const INSTRUMENT_DATA: {
  value: Exclude<InstrumentName, 'CUSTOM'>;
  label: string;
  strings: StringEntry[];
  openSemitones: number[];
}[] = [
  { value: 'GUITAR',   label: 'Standard Guitar', strings: [{ label: 'e', fretsIdx: 5 }, { label: 'B', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'E', fretsIdx: 0 }], openSemitones: [4,  9,  2,  7, 11,  4] },
  { value: 'DROP_D',   label: 'Drop D',          strings: [{ label: 'e', fretsIdx: 5 }, { label: 'B', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }], openSemitones: [2,  9,  2,  7, 11,  4] },
  { value: 'OPEN_G',   label: 'Open G',          strings: [{ label: 'D', fretsIdx: 5 }, { label: 'B', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'G', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }], openSemitones: [2,  7,  2,  7, 11,  2] },
  { value: 'OPEN_D',   label: 'Open D',          strings: [{ label: 'D', fretsIdx: 5 }, { label: 'A', fretsIdx: 4 }, { label: 'F#', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }], openSemitones: [2,  9,  2,  6,  9,  2] },
  { value: 'DADGAD',   label: 'DADGAD',          strings: [{ label: 'D', fretsIdx: 5 }, { label: 'A', fretsIdx: 4 }, { label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }], openSemitones: [2,  9,  2,  7,  9,  2] },
  { value: 'EB',       label: 'Eb Tuning',       strings: [{ label: 'eb', fretsIdx: 5 }, { label: 'Bb', fretsIdx: 4 }, { label: 'Gb', fretsIdx: 3 }, { label: 'Db', fretsIdx: 2 }, { label: 'Ab', fretsIdx: 1 }, { label: 'Eb', fretsIdx: 0 }], openSemitones: [3,  8,  1,  6, 10,  3] },
  { value: 'BASS',     label: 'Bass',            strings: [{ label: 'G', fretsIdx: 3 }, { label: 'D', fretsIdx: 2 }, { label: 'A', fretsIdx: 1 }, { label: 'E', fretsIdx: 0 }], openSemitones: [4,  9,  2,  7]          },
  { value: 'UKULELE',  label: 'Ukulele',         strings: [{ label: 'A', fretsIdx: 3 }, { label: 'E', fretsIdx: 2 }, { label: 'C', fretsIdx: 1 }, { label: 'G', fretsIdx: 0 }], openSemitones: [7,  0,  4,  9]          },
  { value: 'MANDOLIN', label: 'Mandolin',        strings: [{ label: 'E', fretsIdx: 3 }, { label: 'A', fretsIdx: 2 }, { label: 'D', fretsIdx: 1 }, { label: 'G', fretsIdx: 0 }], openSemitones: [7,  2,  9,  4]          },
  { value: 'BANJO',    label: 'Banjo',           strings: [{ label: 'g', fretsIdx: 4 }, { label: 'D', fretsIdx: 3 }, { label: 'B', fretsIdx: 2 }, { label: 'G', fretsIdx: 1 }, { label: 'D', fretsIdx: 0 }], openSemitones: [2,  7, 11,  2,  7]       },
];

export const INSTRUMENT_LIST: { value: InstrumentName; label: string }[] = [
  ...INSTRUMENT_DATA.map(i => ({ value: i.value as InstrumentName, label: i.label })),
  { value: 'CUSTOM', label: 'Custom…' },
];

export function getStringEntries(instrument: string): StringEntry[] {
  return (INSTRUMENT_DATA.find(i => i.value === instrument) ?? INSTRUMENT_DATA[0]).strings;
}

export function getStringCount(instrument: string | null | undefined): number {
  return getStringEntries(instrument ?? 'GUITAR').length;
}

export function getStringLabels(instrument: string): string[] {
  return getStringEntries(instrument).map(e => e.label);
}

// Guitar standard tuning MIDI values, low string first (E A D G B e)
export const GUITAR_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

// Open-string semitone values from C=0, low string first (index = backend string index)
export const INSTRUMENT_OPEN_SEMITONES: Record<string, number[]> =
  Object.fromEntries(INSTRUMENT_DATA.map(i => [i.value, i.openSemitones]));

// Semitone delta from A4 (440 Hz = offset 0). Used to compute click pitch from song key.
export const NOTE_SEMITONE_DELTA: Record<string, number> = {
  'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4,
  'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'Bb': 1, 'B': 2,
};

// octaveOffset = 0 → octave 4 (A4 = 440 Hz), octaveOffset = 12 → octave 5 (A5 = 880 Hz)
export function noteToHz(label: string, octaveOffset = 0): number {
  const delta = NOTE_SEMITONE_DELTA[label] ?? 0;
  return 440 * Math.pow(2, (delta + octaveOffset) / 12);
}

// Open-string MIDI note numbers, low string first (index 0 = lowest string)
export const INSTRUMENT_OPEN_MIDI: Record<string, number[]> = {
  GUITAR:   [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
  DROP_D:   [38, 45, 50, 55, 59, 64], // D2 A2 D3 G3 B3 E4
  OPEN_G:   [38, 43, 50, 55, 59, 62], // D2 G2 D3 G3 B3 D4
  OPEN_D:   [38, 45, 50, 54, 57, 62], // D2 A2 D3 F#3 A3 D4
  DADGAD:   [38, 45, 50, 55, 57, 62], // D2 A2 D3 G3 A3 D4
  EB:       [39, 44, 49, 54, 58, 63], // Eb2 Ab2 Db3 Gb3 Bb3 Eb4
  BASS:     [28, 33, 38, 43],         // E1 A1 D2 G2
  UKULELE:  [55, 60, 64, 69],         // G3 C4 E4 A4
  MANDOLIN: [55, 62, 69, 76],         // G3 D4 A4 E5
  BANJO:    [38, 55, 59, 62, 67],     // D2 G3 B3 D4 G4
};
