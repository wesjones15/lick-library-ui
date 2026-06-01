import { MODE_SEMITONES, ROOT_CHROMATIC, CHROMATIC_NOTES } from '../../core/music';

const INDEX_TO_NOTE: Record<number, string> =
  Object.fromEntries(CHROMATIC_NOTES.map((n, i) => [i, n]));


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
  const rootIdx = ROOT_CHROMATIC[rootKey] ?? 0;

  return semitones.map((offset, di) => {
    const noteIdx = (rootIdx + offset) % 12;
    const thirdInterval = ((semitones[(di + 2) % 7] - offset + 12) % 12);
    const fifthInterval = ((semitones[(di + 4) % 7] - offset + 12) % 12);
    const quality = triadQuality(thirdInterval, fifthInterval);
    const degree = di + 1;
    return {
      degree,
      roman: romanNumeral(degree, quality),
      rootDisplay: INDEX_TO_NOTE[noteIdx],
      rootApi: INDEX_TO_NOTE[noteIdx],
      quality,
      apiSuffix: API_SUFFIX[quality],
    };
  });
}
