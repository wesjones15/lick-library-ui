import type { ChordLyric } from '../../core/api/client';

interface Props {
  lines: ChordLyric[];
  currentIdx: number;
}

function KaraokeSlot({ line, variant }: { line: ChordLyric | undefined; variant: 'prev' | 'current' | 'next' }) {
  if (!line) return <div className="h-10" />;
  const isCurrent = variant === 'current';
  return (
    <div className={`font-mono transition-opacity ${isCurrent ? 'text-base' : 'text-sm opacity-35'}`}>
      <div style={{ color: '#4f46e5', whiteSpace: 'pre' }}>{line.chords.trimEnd() || ' '}</div>
      <div style={{ color: '#111827', whiteSpace: 'pre' }}>{line.lyrics.trimEnd() || ' '}</div>
    </div>
  );
}

export default function KaraokeDisplay({ lines, currentIdx }: Props) {
  return (
    <div className="flex flex-col gap-2 px-2 py-2 bg-gray-50 rounded-xl overflow-x-auto">
      <KaraokeSlot line={lines[currentIdx - 1]} variant="prev" />
      <KaraokeSlot line={lines[currentIdx]} variant="current" />
      <KaraokeSlot line={lines[currentIdx + 1]} variant="next" />
    </div>
  );
}
