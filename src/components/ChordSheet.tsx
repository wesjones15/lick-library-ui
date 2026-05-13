import { useState } from 'react';
import type { ChordLyric } from '../api/client';
import { getChordVoicings } from '../api/client';
import { parseChordName } from '../utils/parseChordName';

// Cache fetched voicings so re-hovering the same chord doesn't re-fetch
const voicingCache = new Map<string, string[]>();

interface ChordTokenProps {
  name: string;
}

function ChordToken({ name }: ChordTokenProps) {
  const [voicings, setVoicings] = useState<string[]>([]);
  const [voicingIdx, setVoicingIdx] = useState(0);
  const [open, setOpen] = useState(false);
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
    setOpen(true);
  }

  function handleMouseLeave() {
    setOpen(false);
  }

  const canShowPopover = parsed !== null;

  return (
    <span
      style={{ display: 'inline-block', position: 'relative', fontWeight: 'bold' }}
      onMouseEnter={canShowPopover ? handleMouseEnter : undefined}
      onMouseLeave={canShowPopover ? handleMouseLeave : undefined}
    >
      {name}
      {open && (
        <span
          style={{
            position: 'absolute',
            top: '100%',
            marginTop: '2px',
            left: 0,
            zIndex: 100,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '9px',
            lineHeight: 1.5,
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            color: '#111827',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            pointerEvents: 'auto',
            minWidth: 'max-content',
          }}
        >
          <span style={{ display: 'block' }}>{voicings.length > 0 ? voicings[voicingIdx] : '???'}</span>
          {voicings.length > 1 && voicings.length > 0 && (
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#9ca3af', gap: '8px' }}>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: voicingIdx > 0 ? '#6b7280' : '#d1d5db' }}
                onClick={e => { e.stopPropagation(); setVoicingIdx(i => Math.max(0, i - 1)); }}
              >‹</button>
              <span>{voicingIdx + 1}/{voicings.length}</span>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: voicingIdx < voicings.length - 1 ? '#6b7280' : '#d1d5db' }}
                onClick={e => { e.stopPropagation(); setVoicingIdx(i => Math.min(voicings.length - 1, i + 1)); }}
              >›</button>
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function renderChords(chords: string): React.ReactNode[] {
  // Split into whitespace runs and non-whitespace tokens
  const parts = chords.split(/(\s+)/);
  return parts.map((part, i) => {
    if (/^\s+$/.test(part) || part === '') return part;
    if (part === 'NC' || part === 'N.C.') return <span key={i}>{part}</span>;
    return <ChordToken key={i} name={part} />;
  });
}

interface Props {
  chordLines: ChordLyric[];
  numColumns: number;
  className?: string;
}

export default function ChordSheet({ chordLines, numColumns, className }: Props) {
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
              <div style={{ fontSize: `${pair.fontSize}px`, whiteSpace: 'pre', color: '#4f46e5' }}>
                {renderChords(pair.chords)}
              </div>
              <div style={{ fontSize: `${pair.fontSize}px`, whiteSpace: 'pre', color: '#111827' }}>
                {pair.lyrics || ' '}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
