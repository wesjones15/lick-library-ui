import { useRef, useEffect, useCallback, useState, forwardRef } from 'react';
import type { ReactNode } from 'react';
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
  isPlaying?: boolean;
  onLineClick?: (lineIdx: number) => void;
}

const CHORD_RE = /[A-G][A-Za-z#b/0-9]*/g;

function parseChordMatches(text: string): RegExpMatchArray[] {
  return [...text.matchAll(CHORD_RE)].filter(m => m[0] !== 'NC' && m[0] !== 'N.C.');
}

// Each dot+gap is roughly 1.5 monospace character widths (10px dot + 4px gap ÷ ~9px/char)
const DOT_CHAR_WIDTH = 1.5;

function dotRow(count: number, filled: number, size: number): ReactNode {
  return Array.from({ length: count }).map((_, i) => (
    <span
      key={i}
      className={`inline-block rounded-full flex-shrink-0 transition-colors duration-75 ${
        i < filled ? 'bg-indigo-500' : 'bg-gray-200'
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
  const matches = parseChordMatches(text);
  const nextTokenIdx = boldIdx !== undefined && boldIdx + 1 < matches.length ? boldIdx + 1 : null;

  // Overlap check: would the two dot rows bleed into each other?
  let wouldOverlap = false;
  if (nextTokenIdx !== null && currentChordBeats > 0 && nextChordBeats > 0) {
    const cur = matches[boldIdx];
    const nxt = matches[nextTokenIdx];
    const gap = (nxt.index ?? 0) - ((cur.index ?? 0) + cur[0].length);
    const curHalf = (currentChordBeats * DOT_CHAR_WIDTH) / 2;
    const nxtHalf = (nextChordBeats * DOT_CHAR_WIDTH) / 2;
    wouldOverlap = curHalf + nxtHalf > gap + cur[0].length / 2 + nxt[0].length / 2;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, i) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    // text before this chord
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
        {isCurrent ? (
          <strong className={`transition-colors duration-75 ${pulsed ? 'text-indigo-600' : 'text-indigo-400'}`}>
            {match[0]}
          </strong>
        ) : match[0]}
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

interface SlotProps {
  line: ChordLyric | undefined;
  variant: 'active' | 'secondary' | 'dim';
  expanded: boolean;
  boldIdx?: number;
  pulsed?: boolean;
  currentChordBeats?: number;
  beatInChord?: number;
  nextChordBeats?: number;
  leadingNextBeats?: number;
  onClick?: () => void;
}

const KaraokeSlot = forwardRef<HTMLDivElement, SlotProps>(function KaraokeSlot(
  { line, variant, expanded, boldIdx, pulsed, currentChordBeats, beatInChord, nextChordBeats, leadingNextBeats, onClick },
  ref
) {
  if (!line) return null;
  const isActive = variant === 'active';
  const opacity = isActive ? 1 : variant === 'secondary' ? 0.6 : 0.25;
  const sizeClass = expanded
    ? (isActive ? 'text-xl' : variant === 'secondary' ? 'text-base' : 'text-sm')
    : (isActive ? 'text-lg' : variant === 'secondary' ? 'text-sm' : 'text-xs');

  const showActiveLine = isActive && boldIdx !== undefined && (currentChordBeats ?? 0) > 0;

  return (
    <div
      ref={ref}
      className={`font-mono transition-opacity ${sizeClass}`}
      style={{ opacity, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <div style={{ color: '#4f46e5', whiteSpace: 'pre' }}>
        {showActiveLine ? (
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
            const matches = parseChordMatches(text);
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
      <div style={{ color: '#111827', whiteSpace: 'pre' }}>{line.lyrics.trimEnd() || ' '}</div>
    </div>
  );
});

export default function KaraokeDisplay({
  lines, currentIdx, intraChordIdx, guitarKaraoke,
  beatInChord = 0, currentChordBeats = 0, nextChordBeats = 0, pulsed, isPlaying, onLineClick,
}: Props) {
  const exp = !!guitarKaraoke;
  const activeLineRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [displayCenterIdx, setDisplayCenterIdx] = useState(currentIdx);

  // During playback, size gradient follows the song position
  useEffect(() => {
    if (isPlaying) setDisplayCenterIdx(currentIdx);
  }, [currentIdx, isPlaying]);

  // Auto-scroll active line into view during playback
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentIdx]);

  // When paused, size gradient follows scroll position
  const handleScroll = useCallback(() => {
    if (isPlaying) return;
    const el = innerRef.current;
    if (!el || lines.length === 0) return;
    const avgLineHeight = el.scrollHeight / lines.length;
    const centerPx = el.scrollTop + el.clientHeight / 2;
    const estimated = Math.max(0, Math.min(lines.length - 1, Math.round(centerPx / avgLineHeight)));
    setDisplayCenterIdx(estimated);
  }, [isPlaying, lines.length]);

  const activeLineChordCount = parseChordMatches(lines[currentIdx]?.chords ?? '').length;
  const nextIsOnNextLine =
    intraChordIdx !== undefined &&
    nextChordBeats > 0 &&
    intraChordIdx >= activeLineChordCount - 1 &&
    currentIdx + 1 < lines.length;

  return (
    <div className={`flex flex-col flex-1 items-center bg-gray-50 rounded-xl px-4 overflow-hidden ${exp ? 'justify-center py-3' : 'justify-start pt-2 pb-3'}`}>
      <div
        ref={innerRef}
        onScroll={handleScroll}
        className={`w-full flex-1 min-h-0 flex flex-col items-center overflow-y-auto ${exp ? 'gap-2' : 'gap-1'}`}
      >
        {lines.map((line, i) => {
          // Size/opacity follow displayCenterIdx (scroll position when paused, currentIdx when playing)
          const variant: 'active' | 'secondary' | 'dim' =
            (i === displayCenterIdx - 2 || i === displayCenterIdx - 1) ? 'active'
            : (i === displayCenterIdx - 3 || i === displayCenterIdx) ? 'secondary'
            : 'dim';

          // Playback state stays anchored to currentIdx
          const isCurrentLine = i === currentIdx;
          const isNextSlot = i === currentIdx + 1;

          return (
            <KaraokeSlot
              key={i}
              ref={isCurrentLine ? activeLineRef : null}
              line={line}
              variant={variant}
              expanded={exp}
              boldIdx={isCurrentLine ? intraChordIdx : undefined}
              pulsed={isCurrentLine ? pulsed : undefined}
              currentChordBeats={isCurrentLine ? currentChordBeats : 0}
              beatInChord={isCurrentLine ? beatInChord : 0}
              nextChordBeats={isCurrentLine ? nextChordBeats : 0}
              leadingNextBeats={isNextSlot && nextIsOnNextLine ? nextChordBeats : 0}
              onClick={onLineClick ? () => onLineClick(i) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
