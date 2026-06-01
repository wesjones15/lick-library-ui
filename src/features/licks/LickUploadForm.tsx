import { useState, useRef, useLayoutEffect } from 'react';
import { uploadLick } from '../../core/api/client';
import type { UploadRequest } from '../../core/api/client';
import { NOTE_KEYS, MODE_DATA, VALID_INPUT } from '../../core/music';
import { TEXTAREA_MONO, SELECT } from '../../core/ui';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import { useInstrument } from '../../core/useInstrument';
import type { InstrumentName } from '../../core/useInstrument';

const EMPTY_TAB_LINES: Record<InstrumentName, string[]> = {
  GUITAR:   ['e', 'B', 'G', 'D', 'A', 'E'],
  DROP_D:   ['e', 'B', 'G', 'D', 'A', 'D'],
  OPEN_G:   ['d', 'B', 'G', 'D', 'G', 'D'],
  OPEN_D:   ['d', 'A', 'F', 'D', 'A', 'D'],
  DADGAD:   ['d', 'A', 'G', 'D', 'A', 'D'],
  EB:       ['eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb'],
  BASS:     ['g', 'D', 'A', 'E'],
  UKULELE:  ['a', 'E', 'C', 'G'],
  MANDOLIN: ['e', 'A', 'D', 'G'],
  BANJO:    ['g', 'D', 'B', 'G', 'D'],
  CUSTOM:   ['e', 'B', 'G', 'D', 'A', 'E'],
};

function getEmptyTab(name: InstrumentName): string {
  return EMPTY_TAB_LINES[name]
    .map(label => `${label}|----------------|`)
    .join('\n');
}

function getCustomTab(tuning: string): string {
  const tokens = tuning.trim().split(/\s+/);
  if (tokens.length < 2) return getEmptyTab('GUITAR');
  return tokens.reverse().map(label => `${label}|----------------|`).join('\n');
}

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
  onSuccess: () => void;
}

export default function LickUploadForm({ onSuccess }: Props) {
  const { instrument, customTuning, setInstrument, setCustomTuning } = useInstrument();
  const [rawTab, setRawTab] = useState(() => getEmptyTab(instrument));
  const [mode, setMode] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextCursorRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (nextCursorRef.current !== null && textareaRef.current) {
      textareaRef.current.setSelectionRange(nextCursorRef.current, nextCursorRef.current);
      nextCursorRef.current = null;
    }
  });

  function handleInstrumentChange(name: InstrumentName) {
    setInstrument(name);
    setRawTab(name === 'CUSTOM' ? getCustomTab(customTuning) : getEmptyTab(name));
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const req: UploadRequest = { rawTab };
      if (mode) req.mode = mode;
      if (inputKey) req.inputKey = inputKey;
      if (instrument === 'CUSTOM' && customTuning.trim()) {
        req.tuning = customTuning.trim();
      } else {
        req.instrument = instrument;
      }
      await uploadLick(req);
      setRawTab(getEmptyTab(instrument));
      setMode('');
      setInputKey('');
      onSuccess();
    } catch {
      setError('Upload failed. Check your tab format and that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const stringCount = EMPTY_TAB_LINES[instrument].length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        ref={textareaRef}
        value={rawTab}
        onChange={e => setRawTab(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={stringCount + 1}
        className={TEXTAREA_MONO}
      />
      <div className="flex gap-2 flex-wrap items-start">
        <InstrumentSelector
          instrument={instrument}
          customTuning={customTuning}
          onInstrumentChange={handleInstrumentChange}
          onCustomTuningChange={setCustomTuning}
          onSubmit={() => setRawTab(getCustomTab(customTuning))}
        />
        <select
          value={inputKey}
          onChange={e => setInputKey(e.target.value)}
          className={`${SELECT} flex-1`}
        >
          <option value="">Root: first note</option>
          {NOTE_KEYS.map(k => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <select
          value={mode}
          onChange={e => setMode(e.target.value)}
          className={`${SELECT} flex-1`}
        >
          <option value="">Auto-detect mode</option>
          {MODE_DATA.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading || !/[0-9]/.test(rawTab)}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
