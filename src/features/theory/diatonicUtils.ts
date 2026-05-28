// Mode interval sequences (semitones from root)
const MODE_SEMITONES: Record<string, number[]> = {
  IONIAN:     [0, 2, 4, 5, 7, 9, 11],
  DORIAN:     [0, 2, 3, 5, 7, 9, 10],
  PHRYGIAN:   [0, 1, 3, 5, 7, 8, 10],
  LYDIAN:     [0, 2, 4, 6, 7, 9, 11],
  MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],
  AEOLIAN:    [0, 2, 3, 5, 7, 8, 10],
  LOCRIAN:    [0, 1, 3, 5, 6, 8, 10],
};

// Chromatic index → backend-acceptable note name (passed to GET /api/chord?root=)
const INDEX_TO_NOTE: Record<number, string> = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'Bb', 11: 'B',
};

// Display label for each chromatic index (shown in chord card UI)
const INDEX_TO_DISPLAY: Record<number, string> = { ...INDEX_TO_NOTE };

// NOTE_KEYS value → chromatic index (mirrors LivePage + cagedUtils)
const ROOT_INDEX: Record<string, number> = {
  C: 0, C_SHARP: 1, D: 2, D_SHARP: 3, E: 4, F: 5,
  F_SHARP: 6, G: 7, G_SHARP: 8, A: 9, B_FLAT: 10, B: 11,
};

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug';

export interface DiatonicChord {
  degree: number;       // 1-7
  roman: string;        // "I", "ii", "vii°", etc.
  rootDisplay: string;  // display label, e.g. "C#", "Bb"
  rootApi: string;      // backend-accepted name, e.g. "C#", "Bb"
  quality: ChordQuality;
  apiSuffix: string;    // suffix string matching ChordQuality in DB: "", "m", "dim", "aug"
}

const ROMAN_UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

function triadQuality(third: number, fifth: number): ChordQuality {
  if (third === 4 && fifth === 7) return 'maj';
  if (third === 3 && fifth === 7) return 'min';
  if (third === 3 && fifth === 6) return 'dim';
  if (third === 4 && fifth === 8) return 'aug';
  return 'maj'; // fallback
}

function romanNumeral(degree: number, quality: ChordQuality): string {
  const idx = degree - 1;
  switch (quality) {
    case 'maj': return ROMAN_UPPER[idx];
    case 'min': return ROMAN_LOWER[idx];
    case 'dim': return ROMAN_LOWER[idx] + '°';
    case 'aug': return ROMAN_UPPER[idx] + '+';
  }
}

const API_SUFFIX: Record<ChordQuality, string> = {
  maj: '', min: 'm', dim: 'dim', aug: 'aug',
};

export function getDiatonicChords(rootKey: string, mode: string): DiatonicChord[] {
  const semitones = MODE_SEMITONES[mode] ?? MODE_SEMITONES.IONIAN;
  const rootIdx = ROOT_INDEX[rootKey] ?? 0;

  return semitones.map((offset, di) => {
    const noteIdx = (rootIdx + offset) % 12;
    const thirdInterval = ((semitones[(di + 2) % 7] - offset + 12) % 12);
    const fifthInterval = ((semitones[(di + 4) % 7] - offset + 12) % 12);
    const quality = triadQuality(thirdInterval, fifthInterval);
    const degree = di + 1;
    return {
      degree,
      roman: romanNumeral(degree, quality),
      rootDisplay: INDEX_TO_DISPLAY[noteIdx],
      rootApi: INDEX_TO_NOTE[noteIdx],
      quality,
      apiSuffix: API_SUFFIX[quality],
    };
  });
}
