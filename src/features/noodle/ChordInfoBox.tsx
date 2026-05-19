import { useMemo } from 'react';
import type { ChordVoicing } from '../../core/api/client';
import { parseChordName } from '../songs/parseChordName';
import { INSTRUMENT_OPEN_SEMITONES } from '../../core/music';

const INTERVAL_NAMES: Record<number, string> = {
  0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
  6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7',
};

const ENUM_SEMITONES: Record<string, number> = {
  C: 0, C_SHARP: 1, D: 2, D_SHARP: 3, E: 4, F: 5,
  F_SHARP: 6, G: 7, G_SHARP: 8, A: 9, B_FLAT: 10, B: 11,
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7], 'm': [0, 3, 7], '5': [0, 7],
  '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9],
  '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
  'dim': [0, 3, 6], 'dim7': [0, 3, 6, 9], 'm7b5': [0, 3, 6, 10],
  'aug': [0, 4, 8], 'aug7': [0, 4, 8, 10],
  'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '7sus4': [0, 5, 7, 10],
  '9': [0, 4, 7, 10, 2], 'maj9': [0, 4, 7, 11, 2], 'm9': [0, 3, 7, 10, 2], 'add9': [0, 4, 7, 2],
};

function computeIntervalLabels(
  chordName: string,
  voicing: ChordVoicing | null,
  instrument: string,
  capoOffset: number,
): string[] {
  const parsed = parseChordName(chordName);
  if (!parsed) return [];
  const rootSemitone = ENUM_SEMITONES[parsed.root];
  if (rootSemitone === undefined) return [];

  if (voicing) {
    const openSemitones = INSTRUMENT_OPEN_SEMITONES[instrument];
    const offsets = new Set<number>();
    voicing.frets.forEach((fret, i) => {
      if (fret === null) return;
      const open = openSemitones?.[i];
      if (open === undefined) return;
      offsets.add(((open + fret + capoOffset) % 12 - rootSemitone + 12) % 12);
    });
    return [...offsets].sort((a, b) => a - b).map(o => INTERVAL_NAMES[o] ?? String(o));
  }

  const quality = parsed.quality.replace(/\/\d+$/, '');
  return (QUALITY_INTERVALS[quality] ?? QUALITY_INTERVALS['']).map(i => INTERVAL_NAMES[i] ?? String(i));
}

interface Props {
  chordName: string;
  voicing: ChordVoicing | null;
  instrument: string;
  capoOffset: number;
  pulsed: boolean;
  isPlaying: boolean;
}

export default function ChordInfoBox({ chordName, voicing, instrument, capoOffset, pulsed, isPlaying }: Props) {
  const intervals = useMemo(
    () => computeIntervalLabels(chordName, voicing, instrument, capoOffset),
    [chordName, voicing, instrument, capoOffset],
  );

  return (
    <div className="flex flex-col px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-base text-indigo-600 leading-tight">{chordName}</span>
        <span
          className={`w-2 h-2 rounded-full transition-colors duration-150 shrink-0 ${
            isPlaying && pulsed ? 'bg-indigo-500' : 'bg-gray-200'
          }`}
        />
      </div>
      {intervals.length > 0 && (
        <span className="text-xs text-gray-500 font-mono leading-tight">{intervals.join(' · ')}</span>
      )}
    </div>
  );
}
