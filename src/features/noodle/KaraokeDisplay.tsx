import type { ChordLyric } from '../../core/api/client';

interface Props {
  lines: ChordLyric[];
  currentIdx: number;
  intraChordIdx?: number;
  guitarKaraoke?: boolean;
  beatInChord?: number;
  currentChordBeats?: number;
  nextChordBeats?: number;
  pulsed?: boolean;
}

function renderChordLine(chords: string, boldIdx?: number, pulsed?: boolean): React.ReactNode {
  const text = chords.trimEnd() || ' ';
  if (boldIdx === undefined || boldIdx < 0) return text;
  const matches = [...text.matchAll(/[A-G][A-Za-z#b/0-9]*/g)]
    .filter(m => m[0] !== 'NC' && m[0] !== 'N.C.');
  const target = matches[boldIdx];
  if (!target || target.index === undefined) return text;
  const s = target.index, e = s + target[0].length;
  return (
    <>
      {text.slice(0, s)}
      <strong className={`transition-colors duration-75 ${pulsed ? 'text-indigo-600' : 'text-indigo-400'}`}>
        {text.slice(s, e)}
      </strong>
      {text.slice(e)}
    </>
  );
}

function BeatDots({ count, filled, small }: { count: number; filled: number; small?: boolean }) {
  const size = small ? 6 : count > 8 ? 8 : 10;
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`inline-block rounded-full transition-colors duration-75 ${
            i < filled ? 'bg-indigo-500' : 'bg-gray-200'
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function KaraokeSlot({
  line, variant, expanded, boldIdx, pulsed,
}: {
  line: ChordLyric | undefined;
  variant: 'active' | 'secondary' | 'dim';
  expanded: boolean;
  boldIdx?: number;
  pulsed?: boolean;
}) {
  if (!line) return null;
  const isActive = variant === 'active';
  const opacity = isActive ? 1 : variant === 'secondary' ? 0.6 : 0.25;
  const sizeClass = expanded
    ? (isActive ? 'text-xl' : variant === 'secondary' ? 'text-base' : 'text-sm')
    : (isActive ? 'text-lg' : variant === 'secondary' ? 'text-sm' : 'text-xs');

  return (
    <div className={`font-mono transition-opacity ${sizeClass}`} style={{ opacity }}>
      <div style={{ color: '#4f46e5', whiteSpace: 'pre' }}>
        {isActive ? renderChordLine(line.chords, boldIdx, pulsed) : (line.chords.trimEnd() || ' ')}
      </div>
      <div style={{ color: '#111827', whiteSpace: 'pre' }}>{line.lyrics.trimEnd() || ' '}</div>
    </div>
  );
}

export default function KaraokeDisplay({
  lines, currentIdx, intraChordIdx, guitarKaraoke,
  beatInChord = 0, currentChordBeats = 0, nextChordBeats = 0, pulsed,
}: Props) {
  const exp = !!guitarKaraoke;
  const slot = (offset: number, variant: 'active' | 'secondary' | 'dim', boldIdx?: number, slotPulsed?: boolean) => (
    <KaraokeSlot line={lines[currentIdx + offset]} variant={variant} expanded={exp} boldIdx={boldIdx} pulsed={slotPulsed} />
  );

  return (
    <div className={`flex flex-col flex-1 items-center bg-gray-50 rounded-xl px-4 overflow-hidden ${exp ? 'justify-center py-3 gap-2' : 'justify-start pt-2 pb-3 gap-1'}`}>
      {exp ? (
        <>
          {slot(-2, 'dim')}
          {slot(-1, 'secondary')}
          {currentChordBeats > 0 && <BeatDots count={currentChordBeats} filled={beatInChord} />}
          {slot( 0, 'active', intraChordIdx, pulsed)}
          {nextChordBeats > 0 && <BeatDots count={nextChordBeats} filled={0} small />}
          {slot(+1, 'active')}
          {slot(+2, 'secondary')}
          {slot(+3, 'dim')}
          {slot(+4, 'dim')}
        </>
      ) : (
        <>
          {slot(-2, 'dim')}
          {slot(-1, 'secondary')}
          {currentChordBeats > 0 && <BeatDots count={currentChordBeats} filled={beatInChord} />}
          {slot( 0, 'active', intraChordIdx, pulsed)}
          {nextChordBeats > 0 && <BeatDots count={nextChordBeats} filled={0} small />}
          {slot(+1, 'active')}
          {slot(+2, 'secondary')}
        </>
      )}
    </div>
  );
}
