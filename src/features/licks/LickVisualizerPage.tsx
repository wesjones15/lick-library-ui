import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import GuitarNeck from '../../core/components/GuitarNeck';
import LickLibraryModal from './LickLibraryModal';
import LickInputModal from './LickInputModal';
import LickSubNav from './LickSubNav';
import { uploadLick } from '../../core/api/client';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';
import { getStringCount, getStringLabels } from '../../core/music';
import { BTN, TOGGLE, TOGGLE_ON, TOGGLE_OFF } from '../../core/ui';
import {
  FRET_COUNT,
  SPREAD_SLOT,
  type LickSource,
  parseTabString,
  blankDots,
  buildDotsForColumn,
  buildDotsForAllColumns,
  normalizeTab,
  buildSpreadTab,
} from './lickUtils';


export default function LickVisualizerPage() {
  const { bpm } = useMetronomeContext();
  const location = useLocation();

  const [rawTab, setRawTab] = useState('');
  const [columns, setColumns] = useState(() => parseTabString(''));
  const [currentCol, setCurrentCol] = useState(0);
  const [displayMode, setDisplayMode] = useState<'column' | 'all'>('all');
  const [speedMode, setSpeedMode] = useState<'fixed' | 'metronome'>('fixed');
  const [isRunning, setIsRunning] = useState(false);
  const [lickSource, setLickSource] = useState<LickSource>('none');
  const [savedInputKey, setSavedInputKey] = useState<string | undefined>(undefined);
  const [savedMode, setSavedMode] = useState<string | undefined>(undefined);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewLick, setShowNewLick] = useState(false);
  const [showEditLick, setShowEditLick] = useState(false);

  const instrument = 'GUITAR';
  const stringCount = getStringCount(instrument);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const analyzeTab = useCallback((tab: string) => {
    const parsed = parseTabString(tab);
    setColumns(parsed);
    setCurrentCol(0);
    setDisplayMode('all');
    setIsRunning(false);
  }, []);

  // Pre-load a lick navigated from the builder after save
  useEffect(() => {
    const pre = (location.state as { preloadTab?: string } | null)?.preloadTab;
    if (pre) {
      setRawTab(pre);
      analyzeTab(pre);
      setLickSource('library');
    }
  }, []); // run once on mount

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isRunning || columns.length === 0 || displayMode === 'all') return;
    const ms = speedMode === 'metronome' ? Math.round(60000 / bpm) : 1000;
    timerRef.current = setInterval(() => {
      setCurrentCol(c => (c + 1) % columns.length);
    }, ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, speedMode, bpm, columns.length, displayMode]);

  const handleLibrarySelect = useCallback((selectedRawTab: string) => {
    const normalized = normalizeTab(selectedRawTab);
    setRawTab(normalized);
    setShowLibrary(false);
    analyzeTab(normalized);
    setLickSource('library');
    setSaveError(null);
  }, [analyzeTab]);

  const handleSaveLick = useCallback(async () => {
    setSaveLoading(true);
    setSaveError(null);
    try {
      await uploadLick({ rawTab, inputKey: savedInputKey, mode: savedMode, instrument });
      setLickSource('library');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveLoading(false);
    }
  }, [rawTab, savedInputKey, savedMode, instrument]);

  const dots = useMemo(() => {
    if (columns.length === 0) return blankDots(stringCount);
    if (displayMode === 'all') return buildDotsForAllColumns(columns, stringCount);
    if (currentCol >= columns.length) return blankDots(stringCount);
    return buildDotsForColumn(columns[currentCol], stringCount);
  }, [columns, currentCol, displayMode, stringCount]);

  const canSave = lickSource === 'new' || lickSource === 'modified';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <LickSubNav active="visualizer" />
      <div className="py-3">
        <div className="flex gap-3 items-center mb-2 flex-wrap">
          <button
            onClick={() => setShowLibrary(true)}
            className={`${BTN} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`}
          >
            Load from Library
          </button>
          <button
            onClick={() => setShowNewLick(true)}
            className={`${BTN} bg-primary-600 text-white border-primary-600 hover:bg-primary-700`}
          >
            New Lick
          </button>
        </div>

        <GuitarNeck
          dots={dots}
          fretCount={FRET_COUNT}
          stringLabels={getStringLabels(instrument)}
        />

        {columns.length > 0 && (
          <div className="mt-4">
            {displayMode === 'all' ? (
              <pre className="font-mono text-xs text-gray-600 leading-tight mb-3 whitespace-pre overflow-x-auto">
                {rawTab}
              </pre>
            ) : (
              <div className="font-mono text-xs mb-1" style={{ display: 'inline-block', maxWidth: '100%', overflowX: 'auto' }}>
                <pre className="text-gray-600 leading-tight m-0 p-0 whitespace-pre">
                  {buildSpreadTab(rawTab, columns)}
                </pre>
                <div className="relative" style={{ paddingLeft: '3ch', paddingRight: '5ch' }}>
                  <input
                    type="range"
                    min={0}
                    max={columns.length - 1}
                    step={1}
                    value={currentCol}
                    onChange={e => setCurrentCol(+e.target.value)}
                    className="w-full accent-primary-600"
                  />
                  {columns.length > 1 && columns.map((col, i) =>
                    col.isRest ? (
                      <span
                        key={i}
                        className="absolute top-5 text-[10px] text-gray-400 font-mono -translate-x-1/2 pointer-events-none"
                        style={{ left: `${(i / (columns.length - 1)) * 100}%` }}
                      >
                        ~
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 items-center flex-wrap mb-3 mt-4">
              <div className="flex rounded-md overflow-hidden border border-gray-300">
                <button
                  className={`${TOGGLE} rounded-none border-0 border-r border-gray-300 ${displayMode === 'column' ? TOGGLE_ON : TOGGLE_OFF}`}
                  onClick={() => setDisplayMode('column')}
                >
                  Column
                </button>
                <button
                  className={`${TOGGLE} rounded-none border-0 ${displayMode === 'all' ? TOGGLE_ON : TOGGLE_OFF}`}
                  onClick={() => setDisplayMode('all')}
                >
                  All
                </button>
              </div>

              {displayMode === 'column' && (
                <>
                  <div className="flex rounded-md overflow-hidden border border-gray-300">
                    <button
                      className={`${TOGGLE} rounded-none border-0 border-r border-gray-300 ${speedMode === 'fixed' ? TOGGLE_ON : TOGGLE_OFF}`}
                      onClick={() => setSpeedMode('fixed')}
                    >
                      1/sec
                    </button>
                    <button
                      className={`${TOGGLE} rounded-none border-0 ${speedMode === 'metronome' ? TOGGLE_ON : TOGGLE_OFF}`}
                      onClick={() => setSpeedMode('metronome')}
                    >
                      Metronome
                    </button>
                  </div>
                  <button
                    onClick={() => setIsRunning(r => !r)}
                    className={`${BTN} ${isRunning
                      ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'}`}
                  >
                    {isRunning ? 'Pause' : 'Resume'}
                  </button>
                </>
              )}

              <div className="ml-auto flex items-center gap-2">
                {lickSource === 'library' && (
                  <button
                    onClick={() => setShowEditLick(true)}
                    className={`${BTN} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`}
                  >
                    Edit Lick
                  </button>
                )}
                <button
                  onClick={handleSaveLick}
                  disabled={!canSave || saveLoading}
                  className={`${BTN} ${canSave
                    ? 'bg-success-600 text-white border-success-600 hover:bg-success-700'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'} disabled:opacity-60`}
                >
                  {saveLoading ? 'Saving…' : 'Save Lick'}
                </button>
              </div>
            </div>
            {saveError && <p className="text-sm text-danger-500 mt-1">{saveError}</p>}
          </div>
        )}

        {lickSource === 'none' && (
          <p className="text-sm text-gray-400 mt-4">Load a lick from the library or create a new one to get started.</p>
        )}

        {showLibrary && (
          <LickLibraryModal
            onSelect={handleLibrarySelect}
            onClose={() => setShowLibrary(false)}
          />
        )}
        {showNewLick && (
          <LickInputModal
            title="New Lick"
            onVisualize={(tab, inputKey, mode) => {
              const normalized = normalizeTab(tab);
              setRawTab(normalized);
              setSavedInputKey(inputKey);
              setSavedMode(mode);
              setShowNewLick(false);
              analyzeTab(normalized);
              setLickSource('new');
              setSaveError(null);
            }}
            onClose={() => setShowNewLick(false)}
          />
        )}
        {showEditLick && (
          <LickInputModal
            title="Edit Lick"
            initialTab={rawTab}
            onVisualize={(tab, inputKey, mode) => {
              const normalized = normalizeTab(tab);
              setRawTab(normalized);
              setSavedInputKey(inputKey);
              setSavedMode(mode);
              setShowEditLick(false);
              analyzeTab(normalized);
              setLickSource('modified');
              setSaveError(null);
            }}
            onClose={() => setShowEditLick(false)}
          />
        )}
      </div>
    </div>
  );
}
