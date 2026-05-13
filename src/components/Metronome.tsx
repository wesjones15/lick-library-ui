import { useState, useRef, useEffect, useCallback } from 'react';
import { useMetronome } from '../hooks/useMetronome';

const MIN_BPM = 40;
const MAX_BPM = 240;

export default function Metronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [bpmInput, setBpmInput] = useState('120');
  const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const onBeat = useCallback((beat: number) => {
    setActiveBeat(beat);
  }, []);

  useMetronome(bpm, isPlaying, onBeat);

  // Reset beat display when stopped
  useEffect(() => {
    if (!isPlaying) setActiveBeat(null);
  }, [isPlaying]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  function commitBpm(raw: string) {
    const val = parseInt(raw, 10);
    const clamped = isNaN(val) ? bpm : Math.min(MAX_BPM, Math.max(MIN_BPM, val));
    setBpm(clamped);
    setBpmInput(String(clamped));
  }

  function adjustBpm(delta: number) {
    const next = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm + delta));
    setBpm(next);
    setBpmInput(String(next));
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Navbar widget */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          open ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        {isPlaying && (
          <span className={`inline-block w-2 h-2 rounded-full bg-indigo-500 ${activeBeat === 0 ? 'opacity-100' : 'opacity-40'} transition-opacity duration-75`} />
        )}
        <span>♩ {bpm}</span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 flex flex-col gap-4">

          {/* BPM control */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => adjustBpm(-1)}
              className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium leading-none"
            >
              −
            </button>
            <div className="flex flex-col items-center">
              <input
                type="text"
                inputMode="numeric"
                value={bpmInput}
                onChange={e => setBpmInput(e.target.value.replace(/\D/g, ''))}
                onBlur={() => commitBpm(bpmInput)}
                onKeyDown={e => e.key === 'Enter' && commitBpm(bpmInput)}
                className="w-14 text-center text-2xl font-bold text-gray-900 tabular-nums bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-xs text-gray-400">BPM</span>
            </div>
            <button
              onClick={() => adjustBpm(1)}
              className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium leading-none"
            >
              +
            </button>
          </div>

          {/* Beat indicators */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map(beat => (
              <span
                key={beat}
                className={`rounded-full transition-all duration-75 ${
                  beat === 0 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'
                } ${
                  activeBeat === beat
                    ? 'bg-indigo-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Start / Stop */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            className={`w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              isPlaying
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isPlaying ? 'Stop' : 'Start'}
          </button>
        </div>
      )}
    </div>
  );
}
