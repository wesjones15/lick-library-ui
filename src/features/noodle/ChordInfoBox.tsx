import { useState, useMemo } from 'react';
import type { ChordVoicing } from '../../core/api/client';
import { parseChordName } from '../songs/parseChordName';
import { INSTRUMENT_OPEN_SEMITONES, CHROMATIC_NOTES, MODE_SEMITONES, ROOT_CHROMATIC, INTERVAL_NAMES } from '../../core/music';
import { DEGREE_COLORS } from '../../core/components/GuitarNeck';


const QUALITY_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7], 'm': [0, 3, 7], '5': [0, 7],
  '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9],
  '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
  'dim': [0, 3, 6], 'dim7': [0, 3, 6, 9], 'm7b5': [0, 3, 6, 10],
  'aug': [0, 4, 8], 'aug7': [0, 4, 8, 10],
  'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '7sus4': [0, 5, 7, 10],
  '9': [0, 4, 7, 10, 2], 'maj9': [0, 4, 7, 11, 2], 'm9': [0, 3, 7, 10, 2], 'add9': [0, 4, 7, 2],
};


const OFF_SCALE_COLOR = '#6b7280';

type ToneInfo = { chordLabel: string; scaleLabel: string; color: string };

function computeToneInfo(
  chordName: string,
  voicing: ChordVoicing | null,
  instrument: string,
  capoOffset: number,
  soundingRoot: string,
  soundingMode: string,
): ToneInfo[] {
  const parsed = parseChordName(chordName);
  if (!parsed) return [];
  const chordRootSemitone = ROOT_CHROMATIC[parsed.root];
  if (chordRootSemitone === undefined) return [];
  const songRootSemitone = CHROMATIC_NOTES.indexOf(soundingRoot);
  if (songRootSemitone === -1) return [];

  const modeScale = MODE_SEMITONES[soundingMode] ?? MODE_SEMITONES.IONIAN;

  let semitones: number[];
  if (voicing) {
    const openSemitones = INSTRUMENT_OPEN_SEMITONES[instrument];
    const seen = new Set<number>();
    voicing.frets.forEach((fret, i) => {
      if (fret === null) return;
      const open = openSemitones?.[i];
      if (open === undefined) return;
      seen.add((open + fret + capoOffset) % 12);
    });
    semitones = [...seen].sort((a, b) => a - b);
  } else {
    const quality = parsed.quality.replace(/\/\d+$/, '');
    semitones = (QUALITY_INTERVALS[quality] ?? QUALITY_INTERVALS['']).map(i => (chordRootSemitone + i + capoOffset) % 12);
  }

  return semitones.map(s => {
    const chordOffset = (s - chordRootSemitone + 12) % 12;
    const scaleOffset = (s - songRootSemitone + 12) % 12;
    const degreeIdx = modeScale.indexOf(scaleOffset);
    const degree = degreeIdx !== -1 ? degreeIdx + 1 : null;
    return {
      chordLabel: INTERVAL_NAMES[chordOffset] ?? String(chordOffset),
      scaleLabel: INTERVAL_NAMES[scaleOffset] ?? String(scaleOffset),
      color: degree !== null ? (DEGREE_COLORS[degree] ?? OFF_SCALE_COLOR) : OFF_SCALE_COLOR,
    };
  });
}

function computePlainIntervals(
  chordName: string,
  voicing: ChordVoicing | null,
  instrument: string,
  capoOffset: number,
): string[] {
  const parsed = parseChordName(chordName);
  if (!parsed) return [];
  const rootSemitone = ROOT_CHROMATIC[parsed.root];
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
  soundingRoot?: string;
  soundingMode?: string;
}

export default function ChordInfoBox({ chordName, voicing, instrument, capoOffset, pulsed, isPlaying, soundingRoot = '', soundingMode = 'IONIAN' }: Props) {
  const [showScale, setShowScale] = useState(false);

  const tones = useMemo(
    () => soundingRoot ? computeToneInfo(chordName, voicing, instrument, capoOffset, soundingRoot, soundingMode) : [],
    [chordName, voicing, instrument, capoOffset, soundingRoot, soundingMode],
  );

  const plainIntervals = useMemo(
    () => tones.length === 0 ? computePlainIntervals(chordName, voicing, instrument, capoOffset) : [],
    [chordName, voicing, instrument, capoOffset, tones.length],
  );

  const hasScale = tones.length > 0;

  return (
    <div className="flex flex-col px-3 py-1 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-base text-primary-600 leading-tight">{chordName}</span>
        <span
          className={`w-2 h-2 rounded-full transition-colors duration-150 shrink-0 ${
            isPlaying && pulsed ? 'bg-primary-500' : 'bg-gray-200'
          }`}
        />
        {hasScale && (
          <button
            onClick={() => setShowScale(v => !v)}
            className={`ml-auto text-[10px] leading-none transition-colors ${showScale ? 'text-primary-400' : 'text-gray-300 hover:text-gray-500'}`}
            title={showScale ? 'Show chord intervals' : 'Show scale degrees'}
          >
            ⇄
          </button>
        )}
      </div>
      {hasScale ? (
        <span className="text-xs font-mono leading-tight">
          {tones.map((t, i) => (
            <span key={i}>
              {i > 0 && <span className="text-gray-300"> · </span>}
              <span style={{ color: t.color }}>{showScale ? t.scaleLabel : t.chordLabel}</span>
            </span>
          ))}
        </span>
      ) : plainIntervals.length > 0 ? (
        <span className="text-xs text-gray-500 font-mono leading-tight">{plainIntervals.join(' · ')}</span>
      ) : null}
    </div>
  );
}
