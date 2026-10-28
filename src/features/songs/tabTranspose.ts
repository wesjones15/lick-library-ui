import { noteSemitone } from '../../core/music';

const MAX_FRET = 24;
const TECHNIQUE = /[hp/\\b~r]/;

type Run = { start: number; len: number; fret: number };

// Digit runs after the label's "|". "x4"/"4x" repeat counts are not frets.
function fretRuns(body: string): Run[] {
  return [...body.matchAll(/\d+/g)]
    .filter(m => !/x/i.test(body[m.index! - 1] ?? '') && !/x/i.test(body[m.index! + m[0].length] ?? ''))
    .map(m => ({ start: m.index!, len: m[0].length, fret: parseInt(m[0], 10) }));
}

// The smaller of the two octave choices that keeps every fret on the neck
export function chooseFretShift(frets: number[], semitones: number): number {
  const up = ((semitones % 12) + 12) % 12;
  if (frets.length === 0 || up === 0) return 0;
  const lo = Math.min(...frets);
  const hi = Math.max(...frets);
  const fits = (s: number) => lo + s >= 0 && hi + s <= MAX_FRET;
  const [near, far] = [up, up - 12].sort((a, b) => Math.abs(a) - Math.abs(b));
  if (fits(near)) return near;
  if (fits(far)) return far;
  return lo + up - 12 >= 0 ? up - 12 : up;
}

/**
 * Moves every fret in an ASCII tab by the same amount, so the lick keeps its exact shape and contour.
 * When a fret gains a digit (9 → 10) the column is widened on every string, keeping chords stacked.
 */
export function shiftTab(tab: string, semitones: number): string {
  const lines = tab.split('\n').map(line => {
    const pipe = line.indexOf('|');
    return pipe < 0 ? null : { prefix: line.slice(0, pipe + 1), body: line.slice(pipe + 1) };
  });
  const runs = lines.map(l => (l ? fretRuns(l.body) : []));
  const shift = chooseFretShift(runs.flat().map(r => r.fret), semitones);
  if (shift === 0) return tab;

  const width = Math.max(0, ...lines.map(l => l?.body.length ?? 0));
  const growth = new Array<number>(width + 1).fill(0);
  runs.forEach(rs => rs.forEach(r => {
    const grow = String(r.fret + shift).length - r.len;
    growth[r.start] = Math.max(growth[r.start], grow);
  }));

  return tab.split('\n').map((original, li) => {
    const line = lines[li];
    if (!line) return original;
    const byStart = new Map(runs[li].map(r => [r.start, r]));
    let out = '';
    for (let j = 0; j < line.body.length;) {
      const run = byStart.get(j);
      if (run) {
        let slot = 0;
        for (let k = j; k < j + run.len; k++) slot += 1 + growth[k];
        const fret = String(run.fret + shift);
        const pad = '-'.repeat(slot - fret.length);
        // Keep a technique glued to its fret ("-9h11", not "9-h11")
        out += TECHNIQUE.test(line.body[j + run.len] ?? '') ? pad + fret : fret + pad;
        j += run.len;
      } else {
        const c = line.body[j];
        out += c + (c === ' ' ? ' ' : '-').repeat(growth[j]);
        j++;
      }
    }
    return line.prefix + out;
  }).join('\n');
}

// Open-string semitones of a tab from its string labels, low string first; null if any label is unreadable
export function tabTuning(tab: string): number[] | null {
  const labels = tab.split('\n').filter(l => l.includes('|')).map(l => l.slice(0, l.indexOf('|')));
  if (labels.length === 0) return null;
  const notes = labels.map(noteSemitone);
  return notes.every(n => n !== null) ? (notes as number[]).reverse() : null;
}
