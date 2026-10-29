import { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useSoundContext } from '../../core/sound/SoundContext';
import { voicingToMidi } from '../../core/sound/midiUtils';
import type { ChordLyric, ChordSheetLine, GuitarTabLine, ChordVoicing, SongLickInfo } from '../../core/api/client';
import { getChordVoicings } from '../../core/api/client';
import { parseChordName } from './parseChordName';
import ChordUploadModal from '../chords/ChordUploadModal';
import ChordDiagram from '../chords/ChordDiagram';
import SongLickCard from './SongLickCard';
import { shiftTab } from './tabTranspose';
import { getStringCount } from '../../core/music';

// Cache fetched voicings so re-hovering the same chord doesn't re-fetch
const voicingCache = new Map<string, ChordVoicing[]>();

function formatInstrumentLabel(instrument?: string): string {
  if (!instrument) return 'Guitar';
  return instrument.split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

interface ChordTokenProps {
  name: string;
  instrument?: string;
}

function ChordToken({ name, instrument }: ChordTokenProps) {
  const [voicings, setVoicings] = useState<ChordVoicing[]>([]);
  const [voicingIdx, setVoicingIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const { playMidi } = useSoundContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
  const [popoverOffset, setPopoverOffset] = useState(0);
  const [anchorRect, setAnchorRect] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const parsed = parseChordName(name);

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) {
      setPopoverOffset(0);
      return;
    }
    const r = popoverRef.current.getBoundingClientRect();
    const margin = 8;
    let offset = 0;
    if (r.left < margin) offset = margin - r.left;
    else if (r.right > window.innerWidth - margin) offset = window.innerWidth - margin - r.right;
    setPopoverOffset(offset);
  }, [open]);

  async function handleMouseEnter() {
    if (!parsed) return;
    const { root, quality } = parsed;
    const key = `${root}:${quality}:${instrument ?? 'GUITAR'}`;

    if (!voicingCache.has(key)) {
      const result = await getChordVoicings(root, quality, instrument ?? 'GUITAR');
      voicingCache.set(key, result);
    }
    const cached = voicingCache.get(key)!;
    setVoicings(cached);
    setVoicingIdx(0);
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top - 56;
      setShowAbove(spaceAbove > spaceBelow);
      setAnchorRect({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
    }
    setOpen(true);
  }

  function handleMouseLeave() {
    setOpen(false);
  }

  const canShowPopover = parsed !== null;

  return (
    <span
      ref={spanRef}
      style={{ display: 'inline-block', position: 'relative', fontWeight: 'bold', color: '#4f46e5' }}
      onMouseEnter={canShowPopover ? handleMouseEnter : undefined}
      onMouseLeave={canShowPopover ? handleMouseLeave : undefined}
    >
      {name}
      {open && anchorRect && (
        <span
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: showAbove ? anchorRect.top : anchorRect.bottom,
            left: anchorRect.left + anchorRect.width / 2,
            transform: showAbove
              ? `translateX(calc(-50% + ${popoverOffset}px)) translateY(-100%)`
              : `translateX(calc(-50% + ${popoverOffset}px))`,
            zIndex: 1000,
            background: 'white',
            border: '2px solid #9ca3af',
            borderRadius: '8px',
            padding: '6px 8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'auto',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#111827', textAlign: 'center', width: '100%' }}>
            {name}
          </span>
          {voicings.length > 0
            ? <ChordDiagram frets={voicings[voicingIdx].frets} width={100} stringCount={getStringCount(instrument)} />
            : <div
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setOpen(false); setModalOpen(true); }}
              >
                <ChordDiagram frets={Array(getStringCount(instrument)).fill(0)} width={100} stringCount={getStringCount(instrument)} />
                <div style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '18px', fontWeight: 700,
                  color: 'rgba(107,114,128,0.65)',
                  pointerEvents: 'none',
                }}>???</div>
              </div>
          }
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button
              style={{ background: 'none', border: 'none', cursor: voicings.length > 1 ? 'pointer' : 'default', padding: 0, color: voicings.length > 1 ? '#374151' : 'transparent', fontSize: '24px', lineHeight: 1 }}
              onClick={e => { e.stopPropagation(); if (voicings.length > 1) setVoicingIdx(i => (i - 1 + voicings.length) % voicings.length); }}
            >‹</button>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              {voicings.length > 1 && (
                <span style={{ fontSize: '8px', color: '#4b5563', lineHeight: 1 }}>{voicingIdx + 1}/{voicings.length}</span>
              )}
              <span style={{ fontSize: '7px', color: '#4b5563', lineHeight: 1 }}>{formatInstrumentLabel(instrument)}</span>
            </span>
            {voicings.length > 0 && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#374151', fontSize: '14px', lineHeight: 1 }}
                onClick={e => { e.stopPropagation(); playMidi(voicingToMidi(voicings[voicingIdx].frets, instrument), 20); }}
                title="Play chord"
              >▶</button>
            )}
            <button
              style={{ background: 'none', border: 'none', cursor: voicings.length > 1 ? 'pointer' : 'default', padding: 0, color: voicings.length > 1 ? '#374151' : 'transparent', fontSize: '24px', lineHeight: 1 }}
              onClick={e => { e.stopPropagation(); if (voicings.length > 1) setVoicingIdx(i => (i + 1) % voicings.length); }}
            >›</button>
          </span>
        </span>
      )}
      {modalOpen && parsed && (
        <ChordUploadModal
          chordName={name}
          instrument={instrument ?? 'GUITAR'}
          lockInstrument
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            const key = `${parsed.root}:${parsed.quality}:${instrument ?? 'GUITAR'}`;
            voicingCache.delete(key);
            getChordVoicings(parsed.root, parsed.quality, instrument ?? 'GUITAR').then(vs => {
              voicingCache.set(key, vs);
              setVoicings(vs);
            });
            setModalOpen(false);
          }}
        />
      )}
    </span>
  );
}

function renderChordToken(part: string, i: number, instrument?: string): React.ReactNode {
  const prefix = part.match(/^\(+/)?.[0] ?? '';
  const suffix = part.match(/[)*]+$/)?.[0] ?? '';
  const core = part.slice(prefix.length, part.length - suffix.length);

  if (!/^[A-G]/.test(core)) {
    return <span key={i}>{part}</span>;
  }
  return (
    <span key={i} style={{ display: 'inline-block' }}>
      {prefix && <span style={{ fontWeight: 'normal' }}>{prefix}</span>}
      <ChordToken name={core} instrument={instrument} />
      {suffix && <span style={{ fontWeight: 'normal' }}>{suffix}</span>}
    </span>
  );
}

function renderChords(chords: string, instrument?: string): React.ReactNode[] {
  const parts = chords.split(/(\s+)/);
  return parts.map((part, i) => {
    if (/^\s+$/.test(part) || part === '') return part;
    if (part === 'NC' || part === 'N.C.') return <span key={i}>{part}</span>;
    return renderChordToken(part, i, instrument);
  });
}

function isTabBlock(line: ChordSheetLine): line is GuitarTabLine {
  return (line as GuitarTabLine).type === 'tab';
}

interface Props {
  chordLines: ChordSheetLine[];
  numColumns: number;
  className?: string;
  fontScale?: number;
  showTabLicks?: boolean;
  songLicks?: Record<number, SongLickInfo>;
  currentKey?: string | null;
  semitones?: number;
  instrument?: string;
  customTuning?: string;
  // 'columns': fit the whole sheet on screen in columns, as large as possible.
  // 'phoneScroll': one column across a phone screen at a readable size, long lines wrapped.
  fitMode?: 'columns' | 'phoneScroll';
}

const COLUMN_GAP_PX = 24; // gap-6
const TAB_MARGIN_PX = 8;  // my-1 around tab blocks
const MAX_FIT_SCALE = 2.5;
// Single scrolling column (phones): text size range, sized so most lines fit without wrapping
const PHONE_MIN_PX = 14;
const PHONE_MAX_PX = 18;
// Below this, fitting the whole sheet on one screen isn't worth it: let full-height columns flow sideways
const MIN_COLUMN_PX = { phone: 12, other: 8 };

// Height in px at scale 1, as rendered: a pair is two 1.25em rows, a blank spacer one row, a tab one row per string
function lineHeight(line: ChordSheetLine): number {
  if (isTabBlock(line)) return (line.tabLines.length + (line.header ? 1 : 0)) * 1.25 * line.fontSize + TAB_MARGIN_PX;
  const pair = line as ChordLyric;
  return (pair.chords.trim() || pair.lyrics.trim() ? 2.5 : 1.25) * pair.fontSize;
}

// Widest row in px at scale 1, given the monospace advance as a fraction of the font size
function lineWidth(line: ChordSheetLine, charRatio: number): number {
  const rows = isTabBlock(line) ? [line.header ?? '', ...line.tabLines] : [(line as ChordLyric).chords, (line as ChordLyric).lyrics];
  return Math.max(0, ...rows.map(r => r.trimEnd().length)) * line.fontSize * charRatio;
}

type Column = { start: number; lines: ChordSheetLine[] };

// Split by height, not line count, so a column holding tabs isn't twice as tall as the rest
function splitColumns(lines: ChordSheetLine[], numColumns: number): Column[] {
  const heights = lines.map(lineHeight);
  const target = heights.reduce((a, b) => a + b, 0) / numColumns;
  const columns: Column[] = [{ start: 0, lines: [] }];
  let filled = 0;
  lines.forEach((line, i) => {
    const overshoot = filled + heights[i] - target * columns.length;
    if (columns.length < numColumns && columns[columns.length - 1].lines.length > 0 && overshoot > heights[i] / 2) {
      columns.push({ start: i, lines: [] });
    }
    columns[columns.length - 1].lines.push(line);
    filled += heights[i];
  });
  return columns;
}

// `flow`: columns are one screen tall and the sheet scrolls sideways to the next one
type Fit = { numColumns: number; scale: number; wrapChars?: number; flow?: boolean };

// Column count and scale giving the largest text that keeps the whole sheet on one screen
function fitColumns(lines: ChordSheetLine[], availW: number, availH: number, charRatio: number, phone: boolean): Fit {
  const baseFont = Math.max(1, ...lines.filter(l => isTabBlock(l) || (l as ChordLyric).lyrics.trim()).map(l => l.fontSize));
  let best: Fit | null = null;
  for (let n = 1; n <= 4; n++) {
    const cols = splitColumns(lines, n);
    const width = cols.reduce((w, c) => w + Math.max(0, ...c.lines.map(l => lineWidth(l, charRatio))), 0);
    const height = Math.max(0, ...cols.map(c => c.lines.reduce((h, l) => h + lineHeight(l), 0)));
    if (width <= 0 || height <= 0) continue;
    const scale = Math.min(MAX_FIT_SCALE, (availW - COLUMN_GAP_PX * (n - 1)) / width, availH / height);
    if (!best || scale > best.scale + 0.01) best = { numColumns: n, scale };
  }
  const minPx = phone ? MIN_COLUMN_PX.phone : MIN_COLUMN_PX.other;
  if (best && baseFont * best.scale >= minPx) return best;

  // Too small on one screen (a phone held sideways): readable text in screen-tall columns, swipe for more
  const scale = (phone ? PHONE_MIN_PX : minPx) / baseFont;
  const total = lines.reduce((h, l) => h + lineHeight(l), 0) * scale;
  return { numColumns: Math.max(1, Math.ceil(total / (availH * 0.92))), scale, flow: true };
}

// One scrolling column on a phone: size the text so nine lines in ten fit, and wrap the rest
function fitPhoneScroll(lines: ChordSheetLine[], availW: number, charRatio: number): Fit {
  const baseFont = Math.max(1, ...lines.filter(l => isTabBlock(l) || (l as ChordLyric).lyrics.trim()).map(l => l.fontSize));
  const pairChars = lines
    .filter(l => !isTabBlock(l) && ((l as ChordLyric).chords.trim() || (l as ChordLyric).lyrics.trim()))
    .map(l => Math.max((l as ChordLyric).chords.trimEnd().length, (l as ChordLyric).lyrics.trimEnd().length))
    .sort((a, b) => a - b);
  const typical = pairChars[Math.floor(pairChars.length * 0.9)] ?? 40;
  const font = Math.min(PHONE_MAX_PX, Math.max(PHONE_MIN_PX, availW / (Math.max(1, typical) * charRatio)));
  return { numColumns: 1, scale: font / baseFont, wrapChars: Math.max(10, Math.floor(availW / (font * charRatio))) };
}

function isCleanBreak(s: string, at: number): boolean {
  return at >= s.length || s[at - 1] === ' ' || s[at] === ' ';
}

// Same rules as the parser: break where neither a chord nor a word is split, keep chords over their syllables
function wrapPair(pair: ChordLyric, limit: number): ChordLyric[] {
  if (Math.max(pair.chords.trimEnd().length, pair.lyrics.trimEnd().length) <= limit) return [pair];
  const out: ChordLyric[] = [];
  let chords = pair.chords.trimEnd();
  let lyrics = pair.lyrics.trimEnd();
  while (Math.max(chords.length, lyrics.length) > limit) {
    let at = limit;
    while (at > 0 && !(isCleanBreak(chords, at) && isCleanBreak(lyrics, at))) at--;
    if (at === 0) {
      at = limit;
      while (at > 0 && !isCleanBreak(chords, at)) at--;
      if (at === 0) at = limit;
    }
    out.push({ ...pair, chords: chords.slice(0, at), lyrics: lyrics.slice(0, at) });
    chords = chords.slice(at);
    lyrics = lyrics.slice(at);
    const lead = (t: string) => (t.trim() ? t.length - t.trimStart().length : Infinity);
    const indent = Math.min(lead(chords), lead(lyrics));
    if (Number.isFinite(indent)) { chords = chords.slice(indent); lyrics = lyrics.slice(indent); }
    else { chords = ''; lyrics = ''; }
  }
  if (chords.trim() || lyrics.trim()) out.push({ ...pair, chords, lyrics });
  return out;
}

function monospaceCharRatio(el: HTMLElement): number {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return 0.6;
  ctx.font = `100px ${getComputedStyle(el).fontFamily}`;
  return ctx.measureText('M').width / 100 || 0.6;
}

export default function ChordSheet({ chordLines, numColumns: parsedColumns, className, fontScale: baseFontScale = 1, showTabLicks = false, songLicks = {}, currentKey, semitones = 0, instrument, customTuning, fitMode }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const fitted = fitMode && fit ? fit : null;
  const numColumns = fitted ? fitted.numColumns : parsedColumns;
  const fontScale = baseFontScale * (fitted ? fitted.scale : 1);
  const wrapChars = fitted?.wrapChars;
  const lines = useMemo(() => (wrapChars
    ? chordLines.flatMap<ChordSheetLine>(l => (isTabBlock(l) ? [l] : wrapPair(l as ChordLyric, wrapChars)))
    : chordLines), [chordLines, wrapChars]);
  const columns = useMemo(() => splitColumns(lines, numColumns), [lines, numColumns]);

  // Size the sheet to the space left on screen: below the header, inside the page's width
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!fitMode || !el?.parentElement) return;
    const parent = el.parentElement;
    const charRatio = monospaceCharRatio(el);
    function refit() {
      const availW = parent.clientWidth * 0.98;
      const availH = window.innerHeight - (el!.getBoundingClientRect().top + window.scrollY) - 16;
      if (availW <= 0 || (fitMode === 'columns' && availH <= 0)) return;
      const next = fitMode === 'phoneScroll'
        ? fitPhoneScroll(chordLines, availW, charRatio)
        : fitColumns(chordLines, availW, availH, charRatio, window.matchMedia('(max-width: 639px), (max-height: 540px)').matches);
      setFit(prev => prev && prev.numColumns === next.numColumns && prev.wrapChars === next.wrapChars && prev.flow === next.flow
        && Math.abs(prev.scale - next.scale) < 0.01 ? prev : next);
    }
    refit();
    const ro = new ResizeObserver(refit);
    ro.observe(parent);
    window.addEventListener('resize', refit);
    return () => { ro.disconnect(); window.removeEventListener('resize', refit); };
  }, [fitMode, chordLines]);

  // Precompute global index → tabOrder mapping
  const tabOrderMap = useMemo(() => {
    const m = new Map<number, number>();
    let order = 0;
    lines.forEach((line, idx) => {
      if (isTabBlock(line)) m.set(idx, order++);
    });
    return m;
  }, [lines]);

  return (
    <div ref={rootRef} className={`flex gap-6 font-mono ${fitted?.flow ? 'overflow-x-auto pb-2' : fitMode === 'columns' ? 'justify-between' : ''} ${className ?? ''}`}>
      {columns.map((col, ci) => (
        <div key={ci} className={`${wrapChars ? 'w-full min-w-0' : numColumns === 1 || fitMode ? 'w-max' : 'flex-1'} flex flex-col`}>
          {col.lines.map((line, li) => {
            const globalIdx = col.start + li;
            if (isTabBlock(line)) {
              const tabOrder = tabOrderMap.get(globalIdx);
              const lickInfo = tabOrder !== undefined ? songLicks[tabOrder] : undefined;
              return (
                <div key={li} className={`leading-tight my-1 ${wrapChars ? 'overflow-x-auto' : ''}`}>
                  {line.header && (
                    <div style={{ fontSize: `${line.fontSize * fontScale}px`, whiteSpace: 'pre', color: '#111827' }}>
                      {renderChords(line.header, instrument)}
                    </div>
                  )}
                  {showTabLicks && lickInfo ? (
                    <SongLickCard
                      lickId={lickInfo.lickId}
                      rawTab={lickInfo.rawTab}
                      currentKey={currentKey ?? null}
                      semitones={semitones}
                      fontSize={line.fontSize * fontScale}
                      instrument={instrument}
                      customTuning={customTuning}
                    />
                  ) : (
                    <div style={{ fontSize: `${line.fontSize * fontScale}px`, whiteSpace: 'pre', color: '#1f2937', fontFamily: 'monospace' }}>
                      {shiftTab(line.tabLines.join('\n'), semitones)}
                    </div>
                  )}
                </div>
              );
            }
            const pair = line as ChordLyric;
            return (
              <div key={li} className="leading-tight">
                <div style={{ fontSize: `${pair.fontSize * fontScale}px`, whiteSpace: 'pre', color: '#111827' }}>
                  {renderChords(pair.chords, instrument)}
                </div>
                <div style={{ fontSize: `${pair.fontSize * fontScale}px`, whiteSpace: 'pre', color: '#111827' }}>
                  {pair.lyrics || ' '}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
