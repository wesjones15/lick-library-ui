import { INSTRUMENT_OPEN_MIDI } from '../music';

export function dotToMidi(stringIndex: number, fret: number, instrumentName: string): number {
  const open = (INSTRUMENT_OPEN_MIDI[instrumentName] ?? INSTRUMENT_OPEN_MIDI['GUITAR']);
  return Math.min(127, (open[stringIndex] ?? open[0]) + fret);
}

export function voicingToMidi(frets: (number | null)[], instrumentName: string): number[] {
  const open = (INSTRUMENT_OPEN_MIDI[instrumentName] ?? INSTRUMENT_OPEN_MIDI['GUITAR']);
  return frets
    .map((f, i) => (f !== null ? Math.min(127, (open[i] ?? open[0]) + f) : null))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
}
