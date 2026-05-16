import { useState, useRef } from 'react';
import type { ChordLyric, ChordVoicing } from '../../core/api/client';
import { getChordVoicings } from '../../core/api/client';
import { parseChordName } from './parseChordName';
import ChordUploadModal from '../chords/ChordUploadModal';
import ChordDiagram from '../chords/ChordDiagram';

// Cache fetched voicings so re-hovering the same chord doesn't re-fetch
const voicingCache = new Map<string, ChordVoicing[]>();

interface ChordTokenProps {
  name: string;
}

function ChordToken({ name }: ChordTokenProps) {
  const [voicings, setVoicings] = useState<ChordVoicing[]>([]);
  const [voicingIdx, setVoicingIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAbove, setShowAbove] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);
  const parsed = parseChordName(name);

  async function handleMouseEnter() {
    if (!parsed) return;
    const { root, quality } = parsed;
    const key = `${root}:${quality}`;

    if (!voicingCache.has(key)) {
      const result = await getChordVoicings(root, quality);
      voicingCache.set(key, result);
    }
    const cached = voicingCache.get(key)!;
    setVoicings(cached);
    setVoicingIdx(0);
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setShowAbove(rect.bottom > window.innerHeight * 0.6);
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
      {open && (
        <span
          style={{
            position: 'absolute',
            ...(showAbove
              ? { bottom: '100%', marginBottom: '2px' }
              : { top: '100%', marginTop: '2px' }),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
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
            ? <ChordDiagram frets={voicings[voicingIdx].frets} width={100} />
            : <div
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setOpen(false); setModalOpen(true); }}
              >
                <ChordDiagram frets={[0, 0, 0, 0, 0, 0]} width={100} />
              </div>
          }
          {voicings.length > 1 && (
            <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '8px', color: '#9ca3af' }}>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: '24px', lineHeight: 1 }}
                onClick={e => { e.stopPropagation(); setVoicingIdx(i => (i - 1 + voicings.length) % voicings.length); }}
              >‹</button>
              <span>{voicingIdx + 1}/{voicings.length}</span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: '24px', lineHeight: 1 }}
                onClick={e => { e.stopPropagation(); setVoicingIdx(i => (i + 1) % voicings.length); }}
              >›</button>
            </span>
          )}
        </span>
      )}
      {modalOpen && parsed && (
        <ChordUploadModal
          chordName={name}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            const key = `${parsed.root}:${parsed.quality}`;
            voicingCache.delete(key);
            getChordVoicings(parsed.root, parsed.quality).then(vs => {
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

function renderChordToken(part: string, i: number): React.ReactNode {
  const prefix = part.match(/^\(+/)?.[0] ?? '';
  const suffix = part.match(/[)*]+$/)?.[0] ?? '';
  const core = part.slice(prefix.length, part.length - suffix.length);

  if (!/^[A-G]/.test(core)) {
    return <span key={i}>{part}</span>;
  }
  return (
    <span key={i} style={{ display: 'inline-block' }}>
      {prefix && <span style={{ fontWeight: 'normal' }}>{prefix}</span>}
      <ChordToken name={core} />
      {suffix && <span style={{ fontWeight: 'normal' }}>{suffix}</span>}
    </span>
  );
}

function renderChords(chords: string): React.ReactNode[] {
  const parts = chords.split(/(\s+)/);
  return parts.map((part, i) => {
    if (/^\s+$/.test(part) || part === '') return part;
    if (part === 'NC' || part === 'N.C.') return <span key={i}>{part}</span>;
    return renderChordToken(part, i);
  });
}

interface Props {
  chordLines: ChordLyric[];
  numColumns: number;
  className?: string;
  fontScale?: number;
}

export default function ChordSheet({ chordLines, numColumns, className, fontScale = 1 }: Props) {
  const perColumn = Math.ceil(chordLines.length / numColumns);
  const columns: ChordLyric[][] = [];
  for (let c = 0; c < numColumns; c++) {
    columns.push(chordLines.slice(c * perColumn, (c + 1) * perColumn));
  }

  return (
    <div className={`flex gap-6 font-mono overflow-hidden ${className ?? ''}`}>
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 flex flex-col">
          {col.map((pair, li) => (
            <div key={li} className="leading-tight">
              <div style={{ fontSize: `${pair.fontSize * fontScale}px`, whiteSpace: 'pre', color: '#111827' }}>
                {renderChords(pair.chords)}
              </div>
              <div style={{ fontSize: `${pair.fontSize * fontScale}px`, whiteSpace: 'pre', color: '#111827' }}>
                {pair.lyrics || ' '}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
