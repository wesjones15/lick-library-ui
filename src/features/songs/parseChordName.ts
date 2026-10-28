import type { SongDetail, GuitarTabLine } from '../../core/api/client';

const CHORD_SYMBOL =
  /^[A-G][#b♯♭]?(?:maj|Maj|ma|M|min|mi|m|dim|°|aug|\+|ø|-)?(?:\d+|add[A-G][#b]?|(?:add|sus|maj|Maj|M|no)\d*|[#b♯♭+-]\d+|alt|\/9|\([^)]*\))*(?:\/[A-G][#b♯♭]?)?$/;

export function extractChordNames(song: SongDetail): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  song.chordLines.forEach(line => {
    const text = (line as GuitarTabLine).type === 'tab'
      ? (line as GuitarTabLine).header
      : (line as { chords: string }).chords;
    text.split(/\s+/).forEach(t => {
      const core = t.replace(/^[(|[]+/, '').replace(/[)*|\].,]+$/, '');
      // Tab headers can hold labels ("Bridge riff"), so only keep tokens shaped like chord symbols
      if (CHORD_SYMBOL.test(core) && !seen.has(core)) {
        seen.add(core);
        result.push(core);
      }
    });
  });
  return result;
}

// Maps display root names to Java Note enum names
const ROOT_TO_ENUM: Record<string, string> = {
  'C': 'C', 'C#': 'C_SHARP', 'Db': 'C_SHARP',
  'D': 'D', 'D#': 'D_SHARP', 'Eb': 'D_SHARP',
  'E': 'E', 'Fb': 'E',
  'F': 'F', 'F#': 'F_SHARP', 'Gb': 'F_SHARP',
  'G': 'G', 'G#': 'G_SHARP', 'Ab': 'G_SHARP',
  'A': 'A', 'A#': 'B_FLAT', 'Bb': 'B_FLAT',
  'B': 'B', 'Cb': 'B', 'E#': 'F', 'B#': 'C',
};

// Semitone offsets matching Java Note enum ordinals
const NOTE_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11, 'E#': 5, 'B#': 0,
};

export interface ParsedChord {
  root: string;   // Java Note enum name (e.g. "C_SHARP")
  quality: string; // chord suffix, slash chords encoded as e.g. "/4" or "m/3"
}

export function parseChordName(name: string): ParsedChord | null {
  if (!name || name === 'NC' || name === 'N.C.') return null;

  name = name.replace(/♯/g, '#').replace(/♭/g, 'b');
  const slashIdx = name.search(/\/[A-G]/);
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
