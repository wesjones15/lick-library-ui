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

const CHORD_RE = /[A-G][A-Za-z#b/0-9]*/g;

interface TokenMatch {
  text: string;
  index: number;
  isNc: boolean;
}

function parseTokenMatches(raw: string): TokenMatch[] {
  const results: TokenMatch[] = [];
  for (const m of raw.matchAll(CHORD_RE)) {
    const idx = m.index ?? 0;
    if (idx > 0 && raw[idx - 1] === '.') continue; // phantom C inside "N.C."
    if (m[0] === 'NC' || m[0] === 'N.C.') continue;
    results.push({ text: m[0], index: idx, isNc: false });
  }
  for (const m of raw.matchAll(/N\.C\.|NC/g)) {
    results.push({ text: m[0], index: m.index ?? 0, isNc: true });
  }
  return results.sort((a, b) => a.index - b.index);
}

// Each dot+gap is roughly 1.5 monospace character widths (10px dot + 4px gap ÷ ~9px/char)
const DOT_CHAR_WIDTH = 1.5;

function dotRow(count: number, filled: number, size: number): React.ReactNode {
  return Array.from({ length: count }).map((_, i) => (
    <span
      key={i}
      className={`inline-block rounded-full flex-shrink-0 transition-colors duration-75 ${
        i < filled ? 'bg-brand-5' : 'bg-gray-200'
      }`}
      style={{ width: size, height: size }}
    />
  ));
}

function ActiveChordLine({
  chords, boldIdx, pulsed, currentChordBeats, beatInChord, nextChordBeats, nextOnlyDotIdx,
}: {
  chords: string;
  boldIdx?: number;
  pulsed?: boolean;
  currentChordBeats: number;
  beatInChord: number;
  nextChordBeats: number;
  nextOnlyDotIdx?: number;
}) {
  const text = chords.trimEnd() || ' ';
  const matches = parseTokenMatches(text);
  const nextTokenIdx = boldIdx !== undefined && boldIdx + 1 < matches.length ? boldIdx + 1 : null;

  // Overlap check: would the two dot rows bleed into each other?
  let wouldOverlap = false;
  if (nextTokenIdx !== null && currentChordBeats > 0 && nextChordBeats > 0) {
    const cur = matches[boldIdx];
    const nxt = matches[nextTokenIdx];
    const gap = nxt.index - (cur.index + cur.text.length);
    const curHalf = (currentChordBeats * DOT_CHAR_WIDTH) / 2;
    const nxtHalf = (nextChordBeats * DOT_CHAR_WIDTH) / 2;
    wouldOverlap = curHalf + nxtHalf > gap + cur.text.length / 2 + nxt.text.length / 2;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, i) => {
    const start = match.index;
    const end = start + match.text.length;

    // text before this token
    if (start > cursor) {
      nodes.push(
        <span key={`t${i}`} style={{ whiteSpace: 'pre' }}>{text.slice(cursor, start)}</span>
      );
    }

    const isCurrent = boldIdx !== undefined && i === boldIdx;
    const isNext =
      (nextTokenIdx !== null && i === nextTokenIdx) ||
      (nextOnlyDotIdx !== undefined && i === nextOnlyDotIdx);
    const showCurrentDots = isCurrent && currentChordBeats > 0;
    const showNextDots = isNext && nextChordBeats > 0;
    const currentDotSize = currentChordBeats > 8 ? 7 : 9;
    const nextDotBottom = wouldOverlap ? 'calc(100% + 10px)' : 'calc(100% - 3px)';

    nodes.push(
      <span key={`c${i}`} style={{ display: 'inline-block', position: 'relative' }}>
        {showCurrentDots && (
          <span style={{
            position: 'absolute', bottom: 'calc(100% - 3px)', left: '50%',
            transform: 'translateX(-50%)', whiteSpace: 'nowrap',
            display: 'flex', gap: '3px', paddingBottom: '0',
          }}>
            {dotRow(currentChordBeats, beatInChord, currentDotSize)}
          </span>
        )}
        {showNextDots && (
          <span style={{
            position: 'absolute', bottom: nextDotBottom, left: '50%',
            transform: 'translateX(-50%)', whiteSpace: 'nowrap',
            display: 'flex', gap: '3px', paddingBottom: '0',
          }}>
            {dotRow(nextChordBeats, 0, 6)}
          </span>
        )}
        {isCurrent && !match.isNc ? (
          <strong className={`transition-colors duration-75 ${pulsed ? 'text-brand-6' : 'text-brand-4'}`}>
            {match.text}
          </strong>
        ) : match.text}
      </span>
    );

    cursor = end;
  });

  // trailing text
  if (cursor < text.length) {
    nodes.push(<span key="end" style={{ whiteSpace: 'pre' }}>{text.slice(cursor)}</span>);
  }

  return <>{nodes}</>;
}

function KaraokeSlot({
  line, variant, expanded, boldIdx, pulsed, currentChordBeats, beatInChord, nextChordBeats, leadingNextBeats,
}: {
  line: ChordLyric | undefined;
  variant: 'active' | 'secondary' | 'dim';
  expanded: boolean;
  boldIdx?: number;
  pulsed?: boolean;
  currentChordBeats?: number;
  beatInChord?: number;
  nextChordBeats?: number;
  leadingNextBeats?: number;
}) {
  if (!line) return null;
  const isActive = variant === 'active';
  const opacity = isActive ? 1 : variant === 'secondary' ? 0.6 : 0.25;
  const sizeClass = expanded
    ? (isActive ? 'text-xl' : variant === 'secondary' ? 'text-base' : 'text-sm')
    : (isActive ? 'text-lg' : variant === 'secondary' ? 'text-sm' : 'text-xs');

  const isLickPlaying = isActive && line.chords === '' && (currentChordBeats ?? 0) > 0;
  const showActiveLine = isActive && !isLickPlaying && boldIdx !== undefined && (currentChordBeats ?? 0) > 0;

  return (
    <div className={`font-mono transition-opacity ${sizeClass}`} style={{ opacity }}>
      <div style={{ color: '#4f46e5', whiteSpace: 'pre' }}>
        {isLickPlaying ? (
          <span style={{ display: 'flex', gap: '3px' }}>
            {dotRow(currentChordBeats!, beatInChord ?? 0, (currentChordBeats!) > 8 ? 7 : 9)}
          </span>
        ) : showActiveLine ? (
          <ActiveChordLine
            chords={line.chords}
            boldIdx={boldIdx!}
            pulsed={pulsed}
            currentChordBeats={currentChordBeats ?? 0}
            beatInChord={beatInChord ?? 0}
            nextChordBeats={nextChordBeats ?? 0}
          />
        ) : isActive && boldIdx !== undefined ? (
          // playing but no beatmap yet — still show bold + pulse, no dots
          (() => {
            const text = line.chords.trimEnd() || ' ';
            const matches = parseTokenMatches(text);
            const target = matches[boldIdx];
            if (!target) return text;
            if (target.isNc) return <>{text}</>;
            const s = target.index, e = s + target.text.length;
            return (
              <>
                {text.slice(0, s)}
                <strong className={`transition-colors duration-75 ${pulsed ? 'text-brand-6' : 'text-brand-4'}`}>
                  {text.slice(s, e)}
                </strong>
                {text.slice(e)}
              </>
            );
          })()
        ) : (leadingNextBeats ?? 0) > 0 ? (
          <ActiveChordLine
            chords={line.chords}
            nextOnlyDotIdx={0}
            nextChordBeats={leadingNextBeats!}
            currentChordBeats={0}
            beatInChord={0}
          />
        ) : (
          line.chords.trimEnd() || ' '
        )}
      </div>
      <div style={{ color: isLickPlaying ? '#6b7280' : '#111827', whiteSpace: 'pre', fontStyle: isLickPlaying ? 'italic' : undefined }}>
        {line.lyrics.trimEnd() || ' '}
      </div>
    </div>
  );
}

export default function KaraokeDisplay({
  lines, currentIdx, intraChordIdx, guitarKaraoke,
  beatInChord = 0, currentChordBeats = 0, nextChordBeats = 0, pulsed,
}: Props) {
  const exp = !!guitarKaraoke;

  const activeLineChordCount = parseTokenMatches(lines[currentIdx]?.chords ?? '').length;
  const nextIsOnNextLine =
    intraChordIdx !== undefined &&
    nextChordBeats > 0 &&
    intraChordIdx >= activeLineChordCount - 1 &&
    currentIdx + 1 < lines.length;

  const activeSlot = (offset: number, variant: 'active' | 'secondary' | 'dim', boldIdx?: number, leadingNextBeats?: number) => (
    <KaraokeSlot
      line={lines[currentIdx + offset]}
      variant={variant}
      expanded={exp}
      boldIdx={boldIdx}
      pulsed={pulsed}
      currentChordBeats={currentChordBeats}
      beatInChord={beatInChord}
      nextChordBeats={nextChordBeats}
      leadingNextBeats={leadingNextBeats}
    />
  );

  const slot = (offset: number, variant: 'active' | 'secondary' | 'dim') => (
    <KaraokeSlot line={lines[currentIdx + offset]} variant={variant} expanded={exp} />
  );

  return (
    <div className={`flex flex-col flex-1 items-center bg-gray-50 rounded-xl px-4 overflow-hidden ${exp ? 'justify-center py-3 gap-2' : 'justify-start pt-2 pb-3 gap-1'}`}>
      {exp ? (
        <>
          {slot(-2, 'dim')}
          {slot(-1, 'secondary')}
          {activeSlot( 0, 'active', intraChordIdx)}
          {activeSlot(+1, 'active', undefined, nextIsOnNextLine ? nextChordBeats : 0)}
          {slot(+2, 'secondary')}
          {slot(+3, 'dim')}
          {slot(+4, 'dim')}
        </>
      ) : (
        <>
          {slot(-2, 'dim')}
          {slot(-1, 'secondary')}
          {activeSlot( 0, 'active', intraChordIdx)}
          {activeSlot(+1, 'active', undefined, nextIsOnNextLine ? nextChordBeats : 0)}
          {slot(+2, 'secondary')}
        </>
      )}
    </div>
  );
}
