import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getChordVoicings } from '../../core/api/client';
import type { ChordVoicing } from '../../core/api/client';
import { parseChordName } from '../songs/parseChordName';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';
import { CHROMATIC_NOTES, getStringLabels, MODE_DATA } from '../../core/music';
import { SELECT_COMPACT } from '../../core/ui';
import type { InstrumentName } from '../../core/useInstrument';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import GuitarNeck from '../../core/components/GuitarNeck';
import KaraokeDisplay from './KaraokeDisplay';
import SongLibraryModal from './SongLibraryModal';
import { useChordHighlight } from './useChordHighlight';
import ChordInfoBox from './ChordInfoBox';
import NumpadInput from '../../core/components/NumpadInput';
import FreeChordsPanel from './FreeChordsPanel';
import BeatmapEditorModal from './BeatmapEditorModal';
import { SongTitleInfo, SongHeaderActions } from './SongHeaderContent';
import SongControlsContent from './SongControlsContent';
import { useSongMode } from './useSongMode';

type NoodleMode = 'none' | 'song' | 'freeChords';

export default function NoodlePage() {
  const [searchParams] = useSearchParams();
  const urlSongId = searchParams.get('songId');
  const urlSemitones = parseInt(searchParams.get('semitones') ?? '0', 10);
  const urlCapo = parseInt(searchParams.get('capo') ?? '0', 10);
  const rawTempoOverride = searchParams.get('tempoOverride');
  const urlTempoOverride = rawTempoOverride !== null && rawTempoOverride !== '' ? parseInt(rawTempoOverride, 10) : null;

  const [noodleMode, setNoodleMode] = useState<NoodleMode>(urlSongId ? 'song' : 'none');
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');
  const [cachedVoicings, setCachedVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [pulsed, setPulsed] = useState(false);
  const [neckRefresh, setNeckRefresh] = useState(0);
  const [bpmInput, setBpmInput] = useState('120');

  const warmupRef = useRef(2);
  const halfBeatRef = useRef(0);

  const { bpm, setBpm, isPlaying, setIsPlaying, subscribeBeat, unsubscribeBeat } = useMetronomeContext();

  const songMode = useSongMode({
    instrument,
    isActive: noodleMode === 'song',
    urlSongId,
    urlSemitones,
    urlCapo,
    urlTempoOverride,
    setBpmInput,
    setCachedVoicings,
    onSetSongMode: () => setNoodleMode('song'),
    halfBeatRef,
  });

  const [freeChords, setFreeChords] = useState<string[]>([]);
  const [chordIdx, setChordIdx] = useState(0);
  const [freeRoot, setFreeRoot] = useState('C');
  const [freeMode, setFreeMode] = useState('IONIAN');
  const [freeHasAdvanced, setFreeHasAdvanced] = useState(false);

  function handleFreeApply(lines: string[][], chords: string[]) {
    setFreeChords(chords);
    setChordIdx(0);
    halfBeatRef.current = 0;
    setFreeHasAdvanced(false);
    if (!chords.length) return;
    const unique = [...new Set(chords)];
    Promise.all(
      unique.map(async name => {
        const parsed = parseChordName(name);
        if (!parsed) return [name, []] as const;
        const voicings = await getChordVoicings(parsed.root, parsed.quality, instrument);
        return [name, voicings] as const;
      })
    ).then(results =>
      setCachedVoicings(prev => ({ ...prev, ...Object.fromEntries(results) }))
    ).catch(() => {});
  }

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (noodleMode === 'song') {
      songMode.advance();
    } else if (noodleMode === 'freeChords' && freeChords.length > 0) {
      if (!freeHasAdvanced) {
        setFreeHasAdvanced(true);
        halfBeatRef.current = 0;
        return;
      }
      halfBeatRef.current++;
      if (halfBeatRef.current >= 4) {
        halfBeatRef.current = 0;
        setChordIdx(i => (i + 1) % freeChords.length);
      }
    }
  };

  const onBeat = useCallback((_beat: number) => {
    setPulsed(true);
    setTimeout(() => setPulsed(false), 120);
    if (warmupRef.current > 0) {
      warmupRef.current--;
      return;
    }
    advanceRef.current();
  }, []);

  useEffect(() => {
    subscribeBeat(onBeat);
    return () => unsubscribeBeat(onBeat);
  }, [subscribeBeat, unsubscribeBeat, onBeat]);

  function handlePlay() {
    if (!isPlaying) {
      const parsed = parseInt(bpmInput, 10);
      if (!isNaN(parsed)) {
        const clamped = Math.min(240, Math.max(40, parsed));
        setBpm(clamped);
        setBpmInput(String(clamped));
      }
      warmupRef.current = 4;
      halfBeatRef.current = 0;
      setFreeHasAdvanced(false);
    }
    setIsPlaying(!isPlaying);
  }

  function handleRestart() {
    songMode.setCurrentIdx(0);
    setChordIdx(0);
    halfBeatRef.current = 0;
    songMode.setIntraChordIdx(0);
    setFreeHasAdvanced(false);
    setIsPlaying(false);
  }

  const { soundingRoot, shapeRoot, soundingMode } = useMemo(() => {
    if (noodleMode === 'freeChords') return { soundingRoot: freeRoot, shapeRoot: freeRoot, soundingMode: freeMode };
    return {
      soundingRoot: songMode.soundingRoot,
      shapeRoot: songMode.shapeRoot,
      soundingMode: songMode.soundingMode,
    };
  }, [noodleMode, freeRoot, freeMode, songMode.soundingRoot, songMode.shapeRoot, songMode.soundingMode]);

  const activeChord = noodleMode === 'song'
    ? songMode.activeChord
    : noodleMode === 'freeChords' && freeChords.length > 0
      ? freeChords[chordIdx % freeChords.length] ?? null
      : null;

  const capoOffset = noodleMode === 'song' ? songMode.localCapo : 0;
  const activeVoicing = (activeChord ? cachedVoicings[activeChord]?.[0] : null) ?? null;
  const nextChord = noodleMode === 'song' ? songMode.nextActiveChord : null;
  const dots = useChordHighlight(activeChord, soundingRoot, soundingMode, instrument, capoOffset, activeVoicing, neckRefresh, nextChord);

  const mergedDots = useMemo(() => {
    if (!songMode.lickOverlayDots) return dots;
    return dots.map((string, si) =>
      string.map((dot, fi) =>
        songMode.lickOverlayDots![si]?.[fi]?.active ? { ...dot, active: true } : dot
      )
    );
  }, [dots, songMode.lickOverlayDots]);

  const btnBase = 'px-3 py-1 rounded-lg text-sm font-medium transition-colors border';
  const btnActive = `${btnBase} bg-brand-6 text-white border-brand-6`;
  const btnInactive = `${btnBase} border-gray-300 text-gray-600 hover:bg-gray-50`;

  return (
    <div className={`max-w-6xl mx-auto px-6 py-4 flex flex-col gap-2 ${noodleMode === 'song' ? 'min-h-[calc(100vh-3.5rem)]' : ''}`}>

      {/* Header row */}
      <div className="flex items-center">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 shrink-0">
            {songMode.guitarKaraokeMode && noodleMode === 'song' ? 'Guitar Karaoke' : 'Noodle'}
          </h1>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setIsPlaying(false); setNoodleMode('freeChords'); halfBeatRef.current = 0; setChordIdx(0); setFreeHasAdvanced(false); }}
              className={noodleMode === 'freeChords' ? btnActive : btnInactive}
            >
              Free Chords
            </button>
            <button
              onClick={() => songMode.setShowLibrary(true)}
              className={noodleMode === 'song' ? btnActive : btnInactive}
            >
              Load Song
            </button>
          </div>
          {noodleMode === 'song' && <SongTitleInfo song={songMode.song} activeSongId={songMode.activeSongId} showBackLink={songMode.showBackLink} />}
          {noodleMode === 'song' && activeChord && (
            <ChordInfoBox
              chordName={activeChord}
              voicing={activeVoicing}
              instrument={instrument}
              effectiveCapo={songMode.localCapo}
              pulsed={pulsed}
              isPlaying={isPlaying}
              shapeRoot={shapeRoot}
              shapeMode={soundingMode}
            />
          )}
        </div>

        {/* Center: chord box (free chords mode) */}
        <div className="flex-1 flex items-center justify-center">
          {noodleMode === 'freeChords' && activeChord && (
            <ChordInfoBox
              chordName={activeChord}
              voicing={activeVoicing}
              instrument={instrument}
              effectiveCapo={0}
              pulsed={pulsed}
              isPlaying={isPlaying}
              shapeRoot={shapeRoot}
              shapeMode={soundingMode}
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {noodleMode === 'song' && (
            <SongHeaderActions
              song={songMode.song}
              guitarKaraokeMode={songMode.guitarKaraokeMode}
              setGuitarKaraokeMode={songMode.setGuitarKaraokeMode}
              lickModeEnabled={songMode.lickModeEnabled}
              setLickModeEnabled={songMode.setLickModeEnabled}
            />
          )}
          <button
            onClick={handlePlay}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              isPlaying
                ? 'bg-danger-1 border border-danger-4 text-danger-6 hover:bg-danger-2'
                : 'bg-brand-6 text-white hover:bg-brand-7'
            }`}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={handleRestart}
            className="w-8 h-8 flex items-center justify-center text-xl text-gray-400 hover:text-brand-5 transition-colors"
            aria-label="Restart"
            title="Restart"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Guitar Neck */}
      {!songMode.guitarKaraokeMode && (
        <GuitarNeck
          dots={mergedDots}
          stringLabels={getStringLabels(instrument)}
          bpm={isPlaying ? bpm : undefined}
          capoFret={capoOffset}
        />
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">BPM</span>
          <NumpadInput
            value={bpmInput}
            onChange={val => setBpmInput(val)}
            onCommit={val => {
              const v = parseInt(val, 10);
              const clamped = isNaN(v) ? bpm : Math.min(240, Math.max(40, v));
              setBpmInput(String(clamped));
            }}
            placeholder="120"
            min={40}
            max={240}
            className="border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:border-brand-4 bg-white w-12 text-center"
          />
        </div>

        {noodleMode === 'freeChords' ? (
          <>
            <select value={freeRoot} onChange={e => setFreeRoot(e.target.value)} className={SELECT_COMPACT}>
              {CHROMATIC_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={freeMode} onChange={e => setFreeMode(e.target.value)} className={SELECT_COMPACT}>
              {MODE_DATA.map(m => <option key={m.value} value={m.value}>{m.longLabel}</option>)}
            </select>
          </>
        ) : songMode.keyDisplay ? (
          <button
            onClick={() => setNeckRefresh(n => n + 1)}
            className="text-xs font-medium text-brand-6 px-1.5 py-0.5 hover:bg-brand-1 rounded transition-colors"
            title="Reload scale for this key"
          >
            {songMode.keyDisplay}
          </button>
        ) : null}

        <InstrumentSelector
          instrument={instrument}
          onInstrumentChange={setInstrument}
          excludeCustom
          compact
        />

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Capo</span>
          <button
            onClick={() => songMode.setLocalCapo(c => Math.max(0, c - 1))}
            className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-brand-5 border border-gray-200 rounded"
          >−</button>
          <span className="text-sm text-gray-700 w-5 text-center tabular-nums">{songMode.localCapo}</span>
          <button
            onClick={() => songMode.setLocalCapo(c => Math.min(11, c + 1))}
            className="w-6 h-6 flex items-center justify-center text-sm text-gray-500 hover:text-brand-5 border border-gray-200 rounded"
          >+</button>
        </div>

        {noodleMode === 'song' && (
          <SongControlsContent
            localSemitones={songMode.localSemitones}
            setLocalSemitones={songMode.setLocalSemitones}
            setNeckRefresh={setNeckRefresh}
            beatmap={songMode.beatmap}
            beatmapAutoGenerated={songMode.beatmapAutoGenerated}
            showBeatmapEditor={songMode.showBeatmapEditor}
            setShowBeatmapEditor={songMode.setShowBeatmapEditor}
            setBeatmapDraft={songMode.setBeatmapDraft}
            lickModeEnabled={songMode.lickModeEnabled}
            lickSpeed={songMode.lickSpeed}
            setLickSpeed={songMode.setLickSpeed}
          />
        )}
      </div>

      {noodleMode === 'song' && songMode.showBeatmapEditor && songMode.beatmapDraft.length > 0 && (
        <BeatmapEditorModal
          contentLines={songMode.contentLines}
          beatmapDraft={songMode.beatmapDraft}
          setBeatmapDraft={songMode.setBeatmapDraft}
          beatmapSubmitSuccess={songMode.beatmapSubmitSuccess}
          setBeatmapSubmitSuccess={songMode.setBeatmapSubmitSuccess}
          activeSongId={songMode.activeSongId}
          song={songMode.song}
          setBeatmap={songMode.setBeatmap}
          setBeatmapAutoGenerated={songMode.setBeatmapAutoGenerated}
          setShowBeatmapEditor={songMode.setShowBeatmapEditor}
        />
      )}

      {noodleMode === 'freeChords' && (
        <FreeChordsPanel chordIdx={chordIdx} freeHasAdvanced={freeHasAdvanced} onApply={handleFreeApply} />
      )}

      {noodleMode === 'song' && songMode.karaokeLines.length > 0 && (
        <KaraokeDisplay
          lines={songMode.karaokeLines}
          currentIdx={songMode.currentIdx}
          intraChordIdx={songMode.karaokeChordIdx}
          guitarKaraoke={songMode.guitarKaraokeMode}
          beatInChord={songMode.beatInChord}
          currentChordBeats={songMode.currentChordBeats}
          nextChordBeats={songMode.nextChordBeats}
          pulsed={pulsed}
        />
      )}

      {songMode.showLibrary && (
        <SongLibraryModal onSelect={songMode.loadSongById} onClose={() => songMode.setShowLibrary(false)} />
      )}
    </div>
  );
}
