import { useState, useEffect, useMemo } from 'react';
import { getScalePositions } from '../../core/api/client';
import type { ChordVoicing } from '../../core/api/client';
import type { NeckDot } from '../live/GuitarNeck';
import { parseChordName } from '../songs/parseChordName';
import { CHROMATIC_NOTES, formatNoteEnum, getStringCount, INSTRUMENT_OPEN_SEMITONES } from '../../core/music';

const FRET_COUNT = 12;

const ENUM_SEMITONES: Record<string, number> = {
  'C': 0, 'C_SHARP': 1, 'D': 2, 'D_SHARP': 3, 'E': 4, 'F': 5,
  'F_SHARP': 6, 'G': 7, 'G_SHARP': 8, 'A': 9, 'B_FLAT': 10, 'B': 11,
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  '':       [0, 4, 7],
  'm':      [0, 3, 7],
  '5':      [0, 7],
  '6':      [0, 4, 7, 9],
  'm6':     [0, 3, 7, 9],
  '7':      [0, 4, 7, 10],
  'maj7':   [0, 4, 7, 11],
  'm7':     [0, 3, 7, 10],
  'dim':    [0, 3, 6],
  'dim7':   [0, 3, 6, 9],
  'm7b5':   [0, 3, 6, 10],
  'aug':    [0, 4, 8],
  'aug7':   [0, 4, 8, 10],
  'sus2':   [0, 2, 7],
  'sus4':   [0, 5, 7],
  '7sus4':  [0, 5, 7, 10],
  '9':      [0, 4, 7, 10, 2],
  'maj9':   [0, 4, 7, 11, 2],
  'm9':     [0, 3, 7, 10, 2],
  'add9':   [0, 4, 7, 2],
};

function blankDots(stringCount: number): NeckDot[][] {
  return Array.from({ length: stringCount }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

function semitonesFromVoicing(voicing: ChordVoicing, instrument: string, capoOffset: number): Set<number> {
  const openSemitones = INSTRUMENT_OPEN_SEMITONES[instrument];
  const result = new Set<number>();
  voicing.frets.forEach((fret, stringIdx) => {
    if (fret === null) return;
    const open = openSemitones?.[stringIdx];
    if (open === undefined) return;
    result.add((open + fret + capoOffset) % 12);
  });
  return result;
}

function chordToneSemitones(chordName: string, capoOffset: number): Set<number> | null {
  const parsed = parseChordName(chordName);
  if (!parsed) return null;
  const baseQuality = parsed.quality.replace(/\/\d+$/, '');
  const rootSemitone = ENUM_SEMITONES[parsed.root];
  if (rootSemitone === undefined) return null;
  const intervals = QUALITY_INTERVALS[baseQuality] ?? QUALITY_INTERVALS[''];
  return new Set(intervals.map(i => (rootSemitone + i + capoOffset) % 12));
}

export function useChordHighlight(
  chordName: string | null,
  root: string,
  mode: string,
  instrument: string,
  capoOffset: number,
  voicing?: ChordVoicing | null,
  refreshToken?: number,
  nextChordName?: string | null,
): NeckDot[][] {
  const stringCount = getStringCount(instrument);
  const [scaleDots, setScaleDots] = useState<NeckDot[][]>(() => blankDots(stringCount));

  useEffect(() => {
    console.log('[useChordHighlight] effect fired', { root, mode, instrument, refreshToken });
    if (!root || !mode) {
      console.log('[useChordHighlight] early return — root or mode empty');
      return;
    }
    let cancelled = false;
    const enumRoot = root === 'Bb' ? 'B_FLAT' : root.replace('#', '_SHARP').toUpperCase();
    console.log('[useChordHighlight] fetching scale', { enumRoot, mode, instrument });
    getScalePositions(enumRoot, mode, instrument).then(res => {
      if (cancelled) {
        console.log('[useChordHighlight] fetch completed but CANCELLED', { enumRoot, mode });
        return;
      }
      console.log('[useChordHighlight] fetch SUCCESS, positions:', res.positions.length);
      const dots = blankDots(getStringCount(instrument));
      for (const pos of res.positions) {
        if (pos.string >= 0 && pos.string < dots.length && pos.fret >= 0 && pos.fret <= FRET_COUNT) {
          dots[pos.string][pos.fret] = {
            degree: pos.degree as 1 | 2 | 3 | 4 | 5 | 6 | 7,
            active: false,
            note: formatNoteEnum(pos.note),
          };
        }
      }
      // Populate note for off-scale positions so chord-tone highlighting can reach them
      const openSemitones = INSTRUMENT_OPEN_SEMITONES[instrument];
      if (openSemitones) {
        for (let si = 0; si < dots.length; si++) {
          for (let fret = 0; fret <= FRET_COUNT; fret++) {
            if (!dots[si][fret].note) {
              dots[si][fret] = {
                ...dots[si][fret],
                note: CHROMATIC_NOTES[(openSemitones[si] + fret) % 12],
              };
            }
          }
        }
      }
      setScaleDots(dots);
    }).catch(err => { console.error('[useChordHighlight] fetch FAILED', err); });
    return () => { cancelled = true; };
  }, [root, mode, instrument, refreshToken]);

  return useMemo(() => {
    const tones: Set<number> | null = chordName
      ? (voicing
          ? semitonesFromVoicing(voicing, instrument, capoOffset)
          : chordToneSemitones(chordName, capoOffset))
      : null;
    const nextTones: Set<number> | null = nextChordName
      ? chordToneSemitones(nextChordName, capoOffset)
      : null;

    if (!tones && !nextTones) return scaleDots;

    return scaleDots.map(string =>
      string.map(dot => {
        if (!dot.note) return dot;
        const semitone = CHROMATIC_NOTES.indexOf(dot.note);
        if (semitone === -1) return dot;
        const isCurrentTone = tones?.has(semitone) ?? false;
        const isNextTone = nextTones?.has(semitone) ?? false;
        return {
          ...dot,
          highlighted: isCurrentTone,
          ...(isNextTone && !isCurrentTone ? { nextChord: true } : {}),
        };
      })
    );
  }, [scaleDots, chordName, capoOffset, voicing, instrument, nextChordName]);
}
