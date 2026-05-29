import { CHROMATIC_NOTES, INSTRUMENT_OPEN_SEMITONES } from '../../core/music';
import type { NeckDot } from '../theory/GuitarNeck';

export const FRET_COUNT = 12;
export const SPREAD_SLOT = 4;

export type NoteCol = { isRest: false; notes: { string: number; fret: number; technique?: string }[] };
export type RestCol = { isRest: true };
export type TabColumn = NoteCol | RestCol;
export type LickSource = 'none' | 'new' | 'library' | 'modified';

export function computeNoteName(si: number, fret: number, instrument: string): string {
  const openSemis = INSTRUMENT_OPEN_SEMITONES[instrument] ?? INSTRUMENT_OPEN_SEMITONES.GUITAR;
  return CHROMATIC_NOTES[((openSemis[si] ?? 0) + fret) % 12];
}

export function parseTabString(tabString: string): TabColumn[] {
  const lines = tabString.split('\n').filter(l => l.includes('|'));
  if (lines.length < 2) return [];

  const contents = lines.map(line => {
    const first = line.indexOf('|');
    const last = line.lastIndexOf('|');
    return first >= 0 && last > first ? line.slice(first + 1, last) : '';
  });

  const noteMap = new Map<number, { string: number; fret: number; technique?: string }[]>();
  const restSet = new Set<number>();

  contents.forEach((content, displayRow) => {
    const stringIndex = (lines.length - 1) - displayRow;
    let i = 0;
    while (i < content.length) {
      if (/\d/.test(content[i])) {
        const colKey = i;
        let fretStr = content[i];
        if (i + 1 < content.length && /\d/.test(content[i + 1])) {
          fretStr += content[i + 1];
          i += 2;
        } else {
          i++;
        }
        const fret = parseInt(fretStr, 10);
        let technique: string | undefined;
        if (i < content.length && /[hp/\\]/.test(content[i])) {
          technique = content[i];
        }
        if (!noteMap.has(colKey)) noteMap.set(colKey, []);
        noteMap.get(colKey)!.push({ string: stringIndex, fret, ...(technique && { technique }) });
      } else if (content[i] === '~') {
        if (!noteMap.has(i)) restSet.add(i);
        i++;
      } else {
        i++;
      }
    }
  });

  const allKeys = new Set([...noteMap.keys(), ...restSet]);
  return Array.from(allKeys)
    .sort((a, b) => a - b)
    .map(key =>
      noteMap.has(key)
        ? { isRest: false, notes: noteMap.get(key)! } as NoteCol
        : { isRest: true } as RestCol
    );
}

export function blankDots(n: number): NeckDot[][] {
  return Array.from({ length: n }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

export function buildDotsForColumn(col: TabColumn, n: number): NeckDot[][] {
  if (col.isRest) return blankDots(n);
  const dots = blankDots(n);
  for (const { string: s, fret: f } of col.notes) {
    if (s >= 0 && s < n && f >= 0 && f <= FRET_COUNT) {
      dots[s][f] = { degree: 1, active: true };
    }
  }
  return dots;
}

export function buildDotsForAllColumns(cols: TabColumn[], n: number): NeckDot[][] {
  const dots = blankDots(n);
  for (const col of cols) {
    if (col.isRest) continue;
    for (const { string: s, fret: f } of col.notes) {
      if (s >= 0 && s < n && f >= 0 && f <= FRET_COUNT) {
        dots[s][f] = { degree: 1, active: true };
      }
    }
  }
  return dots;
}

export function buildNormalizedTab(labels: string[], columns: TabColumn[]): string {
  const numStrings = labels.length;
  const colWidths = columns.map(col => {
    if (col.isRest) return 1;
    return col.notes.reduce((m, n) => Math.max(m, String(n.fret).length), 1);
  });

  return Array.from({ length: numStrings }, (_, displayRow) => {
    const stringIndex = (numStrings - 1) - displayRow;
    let line = labels[displayRow] + '-';
    columns.forEach((col, _i) => {
      if (col.isRest) {
        line += '~-';
      } else {
        const colWidth = colWidths[_i];
        const note = col.notes.find(n => n.string === stringIndex);
        const fretStr = note ? String(note.fret) : '';
        line += fretStr + '-'.repeat(colWidth - fretStr.length);
        line += note?.technique ?? '-';
      }
    });
    line += '|';
    return line;
  }).join('\n');
}

export function normalizeTab(rawTab: string): string {
  const columns = parseTabString(rawTab);
  if (columns.length === 0) return rawTab;
  const lines = rawTab.split('\n').filter(l => l.includes('|'));
  const labels = lines.map(l => l.slice(0, l.indexOf('|') + 1));
  return buildNormalizedTab(labels, columns);
}

export function buildSpreadTab(rawTab: string, columns: TabColumn[]): string {
  const lines = rawTab.split('\n').filter(l => l.includes('|'));
  if (lines.length === 0) return '';
  const numStrings = lines.length;
  const labels = lines.map(l => l.slice(0, l.indexOf('|') + 1));

  return Array.from({ length: numStrings }, (_, displayRow) => {
    const stringIndex = (numStrings - 1) - displayRow;
    let line = labels[displayRow] + '-';
    for (const col of columns) {
      if (col.isRest) {
        line += '~' + '-'.repeat(SPREAD_SLOT - 1);
      } else {
        const note = col.notes.find(n => n.string === stringIndex);
        const fretStr = note ? String(note.fret) : '';
        const technique = note?.technique;
        const padLen = SPREAD_SLOT - fretStr.length;
        if (technique && padLen >= 2) {
          line += fretStr + '-' + technique + '-'.repeat(padLen - 2);
        } else {
          line += fretStr + '-'.repeat(padLen);
        }
      }
    }
    line += '|';
    return line;
  }).join('\n');
}
