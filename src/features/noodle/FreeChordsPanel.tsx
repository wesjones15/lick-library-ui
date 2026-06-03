import { useState, useMemo, useRef } from 'react';

interface FreeChordsPanelProps {
  chordIdx: number;
  freeHasAdvanced: boolean;
  onApply: (lines: string[][], flatChords: string[]) => void;
}

function parseFreeLines(input: string): string[][] {
  return input.split('\n')
    .map(line => line.split('|').map(s => s.trim()).filter(s => /^[A-G]/.test(s)))
    .filter(line => line.length > 0);
}

function FreeChordsKaraokeSlot({
  line, intraIdx, highlightActive, variant,
}: { line: string[] | undefined; intraIdx?: number; highlightActive?: boolean; variant: 'prev' | 'current' | 'next' }) {
  if (!line) return <div className="h-8" />;
  const isCurrent = variant === 'current';
  return (
    <div className={`font-mono transition-opacity ${isCurrent ? 'text-base' : 'text-sm opacity-35'}`}>
      <div style={{ color: '#4f46e5', whiteSpace: 'pre' }}>
        {line.map((chord, i) => (
          <span key={i}>
            {i > 0 && ' | '}
            {isCurrent && highlightActive && i === intraIdx
              ? <span className="font-bold">{chord}</span>
              : chord}
          </span>
        ))}
      </div>
    </div>
  );
}

function FreeChordsKaraoke({ lines, currentLineIdx, intraIdx, highlightActive }: {
  lines: string[][];
  currentLineIdx: number;
  intraIdx: number;
  highlightActive: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl overflow-x-auto">
      <FreeChordsKaraokeSlot line={lines[currentLineIdx - 1]} variant="prev" />
      <FreeChordsKaraokeSlot line={lines[currentLineIdx]} intraIdx={intraIdx} highlightActive={highlightActive} variant="current" />
      <FreeChordsKaraokeSlot line={lines[currentLineIdx + 1]} variant="next" />
    </div>
  );
}

export default function FreeChordsPanel({ chordIdx, freeHasAdvanced, onApply }: FreeChordsPanelProps) {
  const [freeInput, setFreeInput] = useState('');
  const [freeLines, setFreeLines] = useState<string[][]>([]);
  const freeInputRef = useRef<HTMLTextAreaElement>(null);

  const currentFreeLineIdx = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < freeLines.length; i++) {
      if (chordIdx < offset + freeLines[i].length) return i;
      offset += freeLines[i].length;
    }
    return Math.max(0, freeLines.length - 1);
  }, [chordIdx, freeLines]);

  const currentFreeIntraIdx = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < freeLines.length; i++) {
      if (chordIdx < offset + freeLines[i].length) return chordIdx - offset;
      offset += freeLines[i].length;
    }
    return 0;
  }, [chordIdx, freeLines]);

  function handleApply() {
    const lines = parseFreeLines(freeInput);
    setFreeLines(lines);
    onApply(lines, lines.flat());
  }

  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      {/* Left: input + submit */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400">Separate chords with |, lines with ↵</label>
        <textarea
          ref={freeInputRef}
          value={freeInput}
          onChange={e => setFreeInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { handleApply(); return; }
            if (e.key === ' ') {
              e.preventDefault();
              const el = freeInputRef.current;
              if (!el) return;
              const start = el.selectionStart;
              const end = el.selectionEnd;
              const insert = ' | ';
              setFreeInput(prev => prev.slice(0, start) + insert + prev.slice(end));
              requestAnimationFrame(() => el.setSelectionRange(start + insert.length, start + insert.length));
            }
          }}
          placeholder="G | Am | F | C"
          rows={3}
          className="w-full border border-gray-200 rounded-lg p-3 font-mono text-sm focus:outline-none focus:border-brand-4 resize-none"
        />
        <button
          onClick={handleApply}
          className="self-start px-3 py-1 rounded-lg text-sm font-medium bg-brand-6 text-white hover:bg-brand-7 transition-colors"
        >
          Apply
        </button>
      </div>

      {/* Center: karaoke display */}
      <div>
        {freeLines.length > 0 && (
          <FreeChordsKaraoke lines={freeLines} currentLineIdx={currentFreeLineIdx} intraIdx={currentFreeIntraIdx} highlightActive={freeHasAdvanced} />
        )}
      </div>

      {/* Right: empty */}
      <div />
    </div>
  );
}
