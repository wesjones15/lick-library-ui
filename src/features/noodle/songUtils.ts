import type { ChordLyric, GuitarTabLine } from '../../core/api/client';

export function parseChordsFromLine(chords: string): string[] {
  return chords.split(/[\s|]+/)
    .map(t => t.replace(/^\(+/, '').replace(/[)*]+$/, ''))
    .filter(t => /^[A-G]/.test(t) || t === 'NC' || t === 'N.C.');
}

export function countBars(chords: string): number {
  return Math.max(1, chords.split('|').map(s => s.trim()).filter(Boolean).length);
}

export function totalHalfBeats(chords: string): number {
  const bars = countBars(chords);
  if (bars > 1) return bars * 2;
  const n = parseChordsFromLine(chords).length;
  return n <= 3 ? 4 : 8;
}

export function halfBeatsPerChord(n: number, total: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [total];
  if (n === 5 && total === 8) return [2, 2, 1, 1, 2];
  const x = Math.max(0, Math.min(n, total - n));
  return Array.from({ length: n }, (_, i) => i < x ? 2 : 1);
}

export function generateBeatmap(lines: ChordLyric[], timeSig: number): number[] {
  if (timeSig !== 4) {
    return lines.flatMap(l => parseChordsFromLine(l.chords).map(() => timeSig));
  }
  return lines.flatMap(l => {
    const tokens = parseChordsFromLine(l.chords);
    const total = totalHalfBeats(l.chords);
    const dist = halfBeatsPerChord(tokens.length, total);
    return dist.map(hb => hb * 2);
  });
}

export function isTabLine(l: { type?: string }): l is GuitarTabLine {
  return l.type === 'tab';
}

export function isSectionHeader(line: ChordLyric): boolean {
  const t = line.lyrics.trim();
  return t.startsWith('[') && t.endsWith(']');
}

export const BEAT_CYCLES: Record<number, number[]> = {
  3: [0, 1, 2, 3, 6, 12, 15, 4, 5, 7, 8, 9, 10, 11, 13, 14, 16],
  6: [0, 1, 2, 3, 6, 9, 12, 15, 4, 5, 7, 8, 10, 11, 13, 14, 16],
};
export const BEAT_CYCLE_DEFAULT = [0, 1, 2, 4, 8, 16, 3, 6, 5, 7, 9, 10, 11, 12, 13, 14, 15];

export function getBeatCycle(timeSig: number): number[] {
  return BEAT_CYCLES[timeSig] ?? BEAT_CYCLE_DEFAULT;
}

export function stepBeat(val: number, dir: 1 | -1, cycle: number[]): number {
  const idx = cycle.indexOf(val);
  if (idx === -1) return dir === 1 ? cycle[0] : cycle[cycle.length - 1];
  return cycle[Math.max(0, Math.min(cycle.length - 1, idx + dir))];
}
