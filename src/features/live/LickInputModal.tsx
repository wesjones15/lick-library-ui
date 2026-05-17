import { useState, useRef, useLayoutEffect } from 'react';

const MODES = ['IONIAN', 'DORIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN'];

const INPUT_KEYS = [
  { value: 'C',       label: 'C'  },
  { value: 'C_SHARP', label: 'C#' },
  { value: 'D',       label: 'D'  },
  { value: 'D_SHARP', label: 'D#' },
  { value: 'E',       label: 'E'  },
  { value: 'F',       label: 'F'  },
  { value: 'F_SHARP', label: 'F#' },
  { value: 'G',       label: 'G'  },
  { value: 'G_SHARP', label: 'G#' },
  { value: 'A',       label: 'A'  },
  { value: 'B_FLAT',  label: 'Bb' },
  { value: 'B',       label: 'B'  },
];

const EMPTY_TAB =
  'e|----------------|\n' +
  'B|----------------|\n' +
  'G|----------------|\n' +
  'D|----------------|\n' +
  'A|----------------|\n' +
  'E|----------------|';

const VALID_INPUT = /^[0-9hp/\\-]$/;

function expandTab(tab: string): string {
  return tab.split('\n').map(line => {
    const lastPipe = line.lastIndexOf('|');
    return lastPipe === -1 ? line : line.slice(0, lastPipe) + '-' + line.slice(lastPipe);
  }).join('\n');
}

function isProtected(str: string, pos: number): boolean {
  if (pos < 0 || pos >= str.length) return true;
  const ch = str[pos];
  if (ch === '\n' || ch === '|') return true;
  if (pos === 0 || str[pos - 1] === '\n') return true;
  return false;
}

interface Props {
  title: string;
  initialTab?: string;
  onVisualize: (rawTab: string, inputKey?: string, mode?: string) => void;
  onClose: () => void;
}

export default function LickInputModal({ title, initialTab, onVisualize, onClose }: Props) {
  const [rawTab, setRawTab] = useState(initialTab ?? EMPTY_TAB);
  const [inputKey, setInputKey] = useState('');
  const [mode, setMode] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextCursorRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (nextCursorRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(nextCursorRef.current, nextCursorRef.current);
      nextCursorRef.current = null;
    }
  });

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const target = pos - 1;
      if (!isProtected(rawTab, target)) {
        nextCursorRef.current = target;
        setRawTab(rawTab.slice(0, target) + '-' + rawTab.slice(target + 1));
      } else {
        ta.setSelectionRange(Math.max(0, pos - 1), Math.max(0, pos - 1));
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const atClosingPipe =
        rawTab[pos] === '|' &&
        (pos === rawTab.length - 1 || rawTab[pos + 1] === '\n');

      if (VALID_INPUT.test(e.key) && atClosingPipe) {
        const expanded = expandTab(rawTab);
        const linesBefore = rawTab.slice(0, pos).split('\n').length - 1;
        const newPos = pos + linesBefore;
        nextCursorRef.current = newPos + 1;
        setRawTab(expanded.slice(0, newPos) + e.key + expanded.slice(newPos + 1));
      } else if (VALID_INPUT.test(e.key) && !isProtected(rawTab, pos)) {
        nextCursorRef.current = pos + 1;
        setRawTab(rawTab.slice(0, pos) + e.key + rawTab.slice(pos + 1));
      }
    }
  }

  const hasNotes = /[0-9]/.test(rawTab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={rawTab}
            onChange={e => setRawTab(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            rows={7}
            className="w-full font-mono text-sm border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-400 bg-gray-50"
          />
          <div className="flex gap-2 mt-3">
            <select
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 flex-1"
            >
              <option value="">Root: first note</option>
              {INPUT_KEYS.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400 flex-1"
            >
              <option value="">Auto-detect mode</option>
              {MODES.map(m => (
                <option key={m} value={m}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onVisualize(rawTab, inputKey || undefined, mode || undefined)}
              disabled={!hasNotes}
              className="px-5 py-2 text-sm rounded-lg bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Visualize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
