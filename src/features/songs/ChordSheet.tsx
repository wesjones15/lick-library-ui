import { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useSoundContext } from '../../core/sound/SoundContext';
import { voicingToMidi } from '../../core/sound/midiUtils';
import type { ChordLyric, ChordSheetLine, GuitarTabLine, ChordVoicing, SongLickInfo } from '../../core/api/client';
import { getChordVoicings } from '../../core/api/client';
import { parseChordName } from './parseChordName';
import ChordUploadModal from '../chords/ChordUploadModal';
import ChordDiagram from '../chords/ChordDiagram';
import SongLickCard from './SongLickCard';
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
            border: '1px solid #e5e7eb',
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
              style={{ background: 'none', border: 'none', cursor: voicings.length > 1 ? 'pointer' : 'default', padding: 0, color: voicings.length > 1 ? '#6b7280' : 'transparent', fontSize: '24px', lineHeight: 1 }}
              onClick={e => { e.stopPropagation(); if (voicings.length > 1) setVoicingIdx(i => (i - 1 + voicings.length) % voicings.length); }}
            >‹</button>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              {voicings.length > 1 && (
                <span style={{ fontSize: '8px', color: '#9ca3af', lineHeight: 1 }}>{voicingIdx + 1}/{voicings.length}</span>
              )}
              <span style={{ fontSize: '7px', color: '#9ca3af', lineHeight: 1 }}>{formatInstrumentLabel(instrument)}</span>
            </span>
            {voicings.length > 0 && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#6b7280', fontSize: '14px', lineHeight: 1 }}
                onClick={e => { e.stopPropagation(); playMidi(voicingToMidi(voicings[voicingIdx].frets, instrument), 20); }}
                title="Play chord"
              >▶</button>
            )}
            <button
              style={{ background: 'none', border: 'none', cursor: voicings.length > 1 ? 'pointer' : 'default', padding: 0, color: voicings.length > 1 ? '#6b7280' : 'transparent', fontSize: '24px', lineHeight: 1 }}
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
}

export default function ChordSheet({ chordLines, numColumns, className, fontScale = 1, showTabLicks = false, songLicks = {}, currentKey, semitones = 0, instrument, customTuning }: Props) {
  const perColumn = Math.ceil(chordLines.length / numColumns);
  const columns: ChordSheetLine[][] = [];
  for (let c = 0; c < numColumns; c++) {
    columns.push(chordLines.slice(c * perColumn, (c + 1) * perColumn));
  }

  // Precompute global index → tabOrder mapping
  const tabOrderMap = useMemo(() => {
    const m = new Map<number, number>();
    let order = 0;
    chordLines.forEach((line, idx) => {
      if (isTabBlock(line)) m.set(idx, order++);
    });
    return m;
  }, [chordLines]);

  return (
    <div className={`flex gap-6 font-mono ${className ?? ''}`}>
      {columns.map((col, ci) => (
        <div key={ci} className={`${numColumns === 1 ? 'w-max' : 'flex-1'} flex flex-col`}>
          {col.map((line, li) => {
            const globalIdx = ci * perColumn + li;
            if (isTabBlock(line)) {
              const tabOrder = tabOrderMap.get(globalIdx);
              const lickInfo = tabOrder !== undefined ? songLicks[tabOrder] : undefined;
              return (
                <div key={li} className="leading-tight my-1">
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
                    <div style={{ fontSize: `${line.fontSize * fontScale}px`, whiteSpace: 'pre', color: '#4b5563', fontFamily: 'monospace' }}>
                      {line.tabLines.join('\n')}
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
