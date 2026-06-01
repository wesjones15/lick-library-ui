import { useState, useRef, useEffect, useCallback } from 'react';
import { useMetronomeContext } from './MetronomeContext';
import NumpadInput from '../components/NumpadInput';
import { C_GRAY_BG_50, C_GRAY_BORDER_200, C_GRAY_BORDER_300, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_900, C_WHITE_BG, C_WHITE_TEXT } from '../colors';

const MIN_BPM = 40;
const MAX_BPM = 240;

const TIME_SIG_OPTIONS = [
  { label: '1/4', value: 1 },
  { label: '2/4', value: 2 },
  { label: '3/4', value: 3 },
  { label: '4/4', value: 4 },
  { label: '6/8', value: 6 },
];

export default function Metronome() {
  const { bpm, setBpm, isPlaying, setIsPlaying, beatsPerBar, setBeatsPerBar, subscribeBeat, unsubscribeBeat } = useMetronomeContext();
  const [bpmInput, setBpmInput] = useState(String(bpm));
  const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const [pulsed, setPulsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync text input when BPM is changed from outside (e.g. song page click)
  useEffect(() => { setBpmInput(String(bpm)); }, [bpm]);

  const containerRef = useRef<HTMLDivElement>(null);

  const onBeat = useCallback((beat: number) => {
    setActiveBeat(beat);
    setPulsed(true);
    setTimeout(() => setPulsed(false), 120);
  }, []);

  useEffect(() => {
    subscribeBeat(onBeat);
    return () => unsubscribeBeat(onBeat);
  }, [subscribeBeat, unsubscribeBeat, onBeat]);

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
          open ? '${C_GRAY_BG_100} ${C_GRAY_TEXT_900}' : '${C_GRAY_TEXT_500} hover:${C_GRAY_TEXT_900} hover:${C_GRAY_BG_50}'
        }`}
      >
        <span className={`inline-block w-2 h-2 rounded-full transition-all duration-75 ${
          isPlaying ? (pulsed ? '${C_WHITE_BG}' : 'bg-indigo-500') : 'opacity-0'
        }`} />
        <span>♩ {bpm}</span>
      </button>

      {/* Popover */}
      {open && (
        <div className={`absolute right-0 top-full mt-2 w-52 ${C_WHITE_BG} border ${C_GRAY_BORDER_200} rounded-xl shadow-lg p-4 z-50`}>
          <div className="flex flex-col gap-4">

            {/* BPM control */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => adjustBpm(-1)}
                className={`w-8 h-8 rounded-lg border ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50} flex items-center justify-center text-lg font-medium leading-none`}
              >
                −
              </button>
              <div className="flex flex-col items-center">
                <NumpadInput
                  value={bpmInput}
                  onChange={val => setBpmInput(val)}
                  onCommit={val => commitBpm(val)}
                  placeholder="BPM"
                  className={`w-14 text-center text-2xl font-bold ${C_GRAY_TEXT_900} tabular-nums bg-transparent border-b ${C_GRAY_BORDER_300} focus:border-indigo-500 focus:outline-none`}
                />
                <span className={`text-xs ${C_GRAY_TEXT_400}`}>BPM</span>
              </div>
              <button
                onClick={() => adjustBpm(1)}
                className={`w-8 h-8 rounded-lg border ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50} flex items-center justify-center text-lg font-medium leading-none`}
              >
                +
              </button>
            </div>

            {/* Beat indicators + gear toggle */}
            <div className="flex items-center">
              <div className="flex-1 flex justify-center gap-2">
                {Array.from({ length: beatsPerBar }, (_, beat) => (
                  <span
                    key={beat}
                    className={`rounded-full transition-all duration-75 ${
                      beat === 0 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'
                    } ${activeBeat === beat ? (pulsed ? '${C_WHITE_BG}' : 'bg-indigo-500') : '${C_GRAY_BG_200}'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowAdvanced(a => !a)}
                className={`text-sm leading-none transition-colors ${
                  showAdvanced ? '${C_PRIMARY_TEXT_MID}' : '${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_700}'
                }`}
                title="Time signature"
              >⚙︎</button>
            </div>

            {/* Time signature selector */}
            {showAdvanced && (
              <div className="flex justify-center gap-1.5 flex-wrap">
                {TIME_SIG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBeatsPerBar(opt.value)}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                      beatsPerBar === opt.value
                        ? '${C_PRIMARY_BG} ${C_WHITE_TEXT} ${C_PRIMARY_BORDER}'
                        : '${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50}'
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            )}

            {/* Start / Stop */}
            <button
              onClick={() => setIsPlaying(p => !p)}
              className={`w-full py-2 rounded-lg text-sm font-semibold ${C_WHITE_TEXT} transition-colors ${
                isPlaying
                  ? '${C_DANGER_BG_MID} hover:${C_DANGER_BG}'
                  : '${C_SUCCESS_BG_MID} hover:${C_SUCCESS_BG}'
              }`}
            >
              {isPlaying ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
