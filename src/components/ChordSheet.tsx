import type { ChordLyric } from '../api/client';

interface Props {
  chordLines: ChordLyric[];
  numColumns: number;
  className?: string;
}

export default function ChordSheet({ chordLines, numColumns, className }: Props) {
  // Split lines into columns (top-to-bottom fill)
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
              <div
                style={{ fontSize: `${pair.fontSize}px`, whiteSpace: 'pre', color: '#4f46e5' }}
              >
                {pair.chords}
              </div>
              <div
                style={{ fontSize: `${pair.fontSize}px`, whiteSpace: 'pre', color: '#111827' }}
              >
                {pair.lyrics || ' '}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
