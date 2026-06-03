import { formatNoteEnum, CHROMATIC_NOTES, MODE_SUFFIX } from '../../core/music';

export function keyLabel(originalKey: string | null, semitones: number, mode?: string | null): string {
  if (!originalKey) return '';
  const display = formatNoteEnum(originalKey);
  const match = display.match(/^([A-G][#b]?)/);
  if (!match) return display;
  const idx = CHROMATIC_NOTES.indexOf(match[1]);
  if (idx === -1) return display;
  const root = CHROMATIC_NOTES[((idx + semitones) % 12 + 12) % 12];
  return root + (mode ? (MODE_SUFFIX[mode] ?? '') : '');
}

export function rootKeyLabel(originalKey: string | null, semitones: number, mode?: string | null): string {
  return keyLabel(originalKey, semitones, mode).replace(/ .+$/, '');
}
