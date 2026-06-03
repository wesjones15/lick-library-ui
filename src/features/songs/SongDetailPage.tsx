import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistNav } from '../playlists/playlistNavTypes';
import { getSong, getChordVoicings, reparseSong } from '../../core/api/client';
import AddToPlaylistModal from '../playlists/AddToPlaylistModal';
import ChordUploadModal from '../chords/ChordUploadModal';
import type { SongDetail, ChordVoicing, GuitarTabLine } from '../../core/api/client';
import ChordSheet from './ChordSheet';
import ChordDiagram from '../chords/ChordDiagram';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import CapoTransposeControls from '../../core/components/CapoTransposeControls';
import { useInstrument } from '../../core/useInstrument';
import type { InstrumentName } from '../../core/useInstrument';
import { parseChordName, extractChordNames } from './parseChordName';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';
import { useSongNavContext } from '../../core/context/SongNavContext';
import { NOTE_KEYS, getStringCount } from '../../core/music';
import { keyLabel } from './songKeyUtils';
import SongDetailToolbar from './SongDetailToolbar';

function usePortrait() {
  const [p, setP] = useState(() => window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const h = (e: MediaQueryListEvent) => setP(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return p;
}

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playlistState = usePlaylistNav();
  const { setBpm, setIsPlaying, bpm, isPlaying, setBeatsPerBar } = useMetronomeContext();
  const { setInfo, collapsed, showChords, setShowChords, setMiniActions } = useSongNavContext();
  const isPortrait = usePortrait();
  const [semitones, setSemitones] = useState(() => playlistState?.entries[playlistState.currentIndex]?.keyOffset ?? 0);
  const [capo, setCapo] = useState(0);
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'columns' | 'scroll'>('columns');
  const [showTabLicks, setShowTabLicks] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [chordVoicings, setChordVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [chordVoicingIdx, setChordVoicingIdx] = useState<Record<string, number>>({});
  const [uploadChord, setUploadChord] = useState<string | null>(null);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [capTranspOpen, setCapTranspOpen] = useState(false);
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [scrollFontScale, setScrollFontScale] = useState<number | null>(null);
  const { instrument, customTuning, setInstrument, setCustomTuning } = useInstrument();
  const loadedSongIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const prevIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (id && id !== prevIdRef.current) {
      prevIdRef.current = id;
      const entry = playlistState?.entries[playlistState.currentIndex];
      setSemitones(entry?.keyOffset ?? 0);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getSong(id, semitones)
      .then(s => {
        setSong(s);
        if (loadedSongIdRef.current !== id) {
          const navEntry = playlistState?.entries[playlistState.currentIndex];
          setCapo((s.capo ?? 0) + (navEntry?.capoOffset ?? 0));
          loadedSongIdRef.current = id;
        }
      })
      .catch(() => setError('Failed to load song.'))
      .finally(() => setLoading(false));
  }, [id, semitones]);

  useEffect(() => {
    if (!song) return;
    const navEntry = playlistState?.entries[playlistState.currentIndex];
    const target = (navEntry?.instrument ?? song.instrument ?? 'GUITAR') as InstrumentName;
    setInstrument(target);
  }, [song?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoScrolling) return;
    const id = setInterval(() => window.scrollBy({ top: 2 }), 50);
    return () => clearInterval(id);
  }, [autoScrolling]);

  useEffect(() => {
    if (viewMode !== 'scroll') setAutoScrolling(false);
  }, [viewMode]);

  useEffect(() => {
    if (!song) return;
    setInfo({
      title: song.title,
      artist: song.artist ?? undefined,
      bpm: song.tempo ?? undefined,
      shapeKey: keyLabel(song.originalKey, semitones - (song.capo ?? 0), song.mode),
      soundKey: keyLabel(song.originalKey, semitones + capo - (song.capo ?? 0), song.mode),
      capo,
    });
    return () => setInfo(null);
  }, [song, semitones, capo]);

  const hasTabLines = song?.chordLines.some(line => (line as GuitarTabLine).type === 'tab') ?? false;
  const hasSongLicks = Object.keys(song?.songLicks ?? {}).length > 0;

  useEffect(() => {
    if (!song) { setMiniActions(null); return; }
    const ps = playlistState;
    setMiniActions({
      addToPlaylist: () => setAddToPlaylistOpen(true),
      openTranspose: () => setCapTranspOpen(true),
      navigateManage: () => navigate(`/song/${id}/manage?semitones=${semitones}`),
      viewMode,
      toggleViewMode: () => setViewMode(m => m === 'columns' ? 'scroll' : 'columns'),
      autoScrolling,
      toggleAutoScroll: () => setAutoScrolling(a => !a),
      showTabLicks,
      toggleTabLicks: handleTabLicksToggle,
      hasTabLines,
      hasPlaylist: !!ps,
      playlistName: ps?.playlistName ?? null,
      playlistCurrentIndex: ps?.currentIndex ?? 0,
      playlistTotal: ps?.entries.length ?? 0,
      onPlaylistPrev: () => {
        if (!ps) return;
        const idx = (ps.currentIndex - 1 + ps.entries.length) % ps.entries.length;
        const e = ps.entries[idx];
        navigate(`/song/${e.songId}`, { state: { ...ps, currentIndex: idx } });
      },
      onPlaylistNext: () => {
        if (!ps) return;
        const idx = (ps.currentIndex + 1) % ps.entries.length;
        const e = ps.entries[idx];
        navigate(`/song/${e.songId}`, { state: { ...ps, currentIndex: idx } });
      },
      onPlaylistBack: () => { if (ps) navigate(`/playlist/${ps.playlistId}`); },
      instrument,
      setInstrument,
      customTuning,
      setCustomTuning,
      navigateNoodle: () => navigate(`/noodle?songId=${id}&semitones=${semitones}&capo=${capo}&tempoOverride=${currentPlaylistEntry?.tempoOverride ?? ''}`),
    });
    return () => setMiniActions(null);
  }, [song, viewMode, autoScrolling, showTabLicks, hasTabLines, playlistState, instrument, semitones, id, capo]);

  useEffect(() => {
    if (!showChords || !song) return;
    const names = extractChordNames(song);
    Promise.all(
      names.map(async name => {
        const parsed = parseChordName(name);
        if (!parsed) return [name, []] as [string, ChordVoicing[]];
        const voicings = await getChordVoicings(parsed.root, parsed.quality, instrument);
        return [name, voicings] as [string, ChordVoicing[]];
      })
    ).then(results => {
      setChordVoicings(Object.fromEntries(results));
      setChordVoicingIdx({});
    });
  }, [showChords, song, instrument]);

  const baseFontScale = isPortrait ? 1.5 : 2;
  const effectiveFontScale = viewMode === 'scroll' ? (scrollFontScale ?? baseFontScale) : undefined;

  useLayoutEffect(() => {
    if (viewMode !== 'scroll' || !scrollContainerRef.current || !song) return;
    const el = scrollContainerRef.current;
    const { numColumns } = song;
    function computeScale() {
      const containerWidth = el.clientWidth;
      if (containerWidth <= 0) return;
      const backendColumnWidth = 1100 / Math.max(1, numColumns);
      setScrollFontScale(Math.min(baseFontScale, containerWidth / backendColumnWidth));
    }
    computeScale();
    const ro = new ResizeObserver(computeScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode, song, isPortrait]);

  const currentNoteKey = (() => {
    if (!song?.originalKey) return null;
    const label = keyLabel(song.originalKey, semitones - (song.capo ?? 0));
    const rootMatch = label.match(/^([A-G][#b]?)/);
    if (!rootMatch) return null;
    return NOTE_KEYS.find(n => n.label === rootMatch[1])?.value ?? null;
  })();

  async function handleTabLicksToggle() {
    if (showTabLicks) { setShowTabLicks(false); return; }
    if (!hasTabLines) return;
    if (hasSongLicks) { setShowTabLicks(true); return; }
    setReparsing(true);
    try {
      const updated = await reparseSong(id!);
      setSong(updated);
      if (Object.keys(updated.songLicks ?? {}).length > 0) setShowTabLicks(true);
    } catch { /* silently ignore */ } finally {
      setReparsing(false);
    }
  }

  const currentPlaylistEntry = playlistState?.entries[playlistState.currentIndex];
  const overrideChanged = !!playlistState && song != null && (
    semitones !== (currentPlaylistEntry?.keyOffset ?? 0) ||
    (capo - (song.capo ?? 0)) !== (currentPlaylistEntry?.capoOffset ?? 0)
  );

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderSongMeta() {
    if (!song) return null;
    return (
      <div>
        {song.artist && <div className="text-xs text-gray-400">{song.artist}</div>}
        <h1 className="text-xl font-bold text-gray-900">{song.title}</h1>
        <div className="flex flex-col md:flex-row md:gap-3 mt-0.5 text-xs text-gray-400 gap-0.5">
          <div className="flex gap-2 items-center">
            <InstrumentSelector
              instrument={instrument as InstrumentName}
              onInstrumentChange={setInstrument}
              excludeCustom
              compact
            />
            {song.originalKey && <span>{keyLabel(song.originalKey, semitones + capo - (song.capo ?? 0), song.mode)}</span>}
          </div>
          {song.tempo != null && (
            <button
              onClick={() => {
                if (isPlaying && bpm === song.tempo) { setIsPlaying(false); }
                else { setBpm(song.tempo!); if (song.timeSignature) setBeatsPerBar(song.timeSignature); setIsPlaying(true); }
              }}
              className="text-left text-xs text-gray-400 hover:text-brand-5 transition-colors"
            >
              {song.tempo} BPM
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderCapoTransposeInline() {
    if (!song) return null;
    return (
      <>
        {/* Δ — mobile capo/transpose modal trigger (below md) */}
        <button
          onClick={() => setCapTranspOpen(true)}
          className={`md:hidden w-8 h-8 rounded-lg border flex items-center justify-center text-base transition-colors ${
            (capo !== (song.capo ?? 0) || semitones !== 0)
              ? 'border-brand-3 bg-brand-1 text-brand-6'
              : 'border-gray-200 text-gray-400 hover:text-gray-600'
          }`}
          aria-label="Capo & Transpose"
          title="Capo & Transpose"
        >
          Δ
        </button>
        <CapoTransposeControls
          capo={capo} setCapo={setCapo}
          semitones={semitones} setSemitones={setSemitones}
          originalKey={song.originalKey}
          originalCapo={song.capo ?? 0}
          mode={song.mode}
          className="hidden md:flex"
        />
      </>
    );
  }

  function renderChordSheet() {
    if (!song) return null;
    return (
      <div ref={scrollContainerRef} className={viewMode === 'scroll' ? 'max-w-2xl mx-auto mt-8 overflow-x-hidden' : 'overflow-hidden'}>
        <ChordSheet
          chordLines={song.chordLines}
          numColumns={viewMode === 'scroll' ? 1 : song.numColumns}
          fontScale={effectiveFontScale}
          className={loading ? 'opacity-50 transition-opacity duration-150' : 'transition-opacity duration-150'}
          showTabLicks={showTabLicks}
          songLicks={song.songLicks ?? {}}
          currentKey={currentNoteKey}
          semitones={semitones}
          instrument={instrument}
          customTuning={customTuning}
        />
      </div>
    );
  }

  function renderCapTranspModal() {
    if (!capTranspOpen || !song) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
        onClick={() => setCapTranspOpen(false)}
      >
        <div
          className="bg-white rounded-t-xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-6"
          onClick={e => e.stopPropagation()}
        >
          <CapoTransposeControls
            capo={capo} setCapo={setCapo}
            semitones={semitones} setSemitones={setSemitones}
            originalKey={song.originalKey}
            originalCapo={song.capo ?? 0}
            mode={song.mode}
          />
        </div>
      </div>
    );
  }

  function renderChordDiagramPanel() {
    if (!showChords || !song) return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex gap-3 overflow-x-auto px-4 py-3">
          {extractChordNames(song).map(name => {
            const voicings = chordVoicings[name] ?? [];
            const idx = chordVoicingIdx[name] ?? 0;
            const frets = voicings.length > 0 ? voicings[idx].frets : Array(getStringCount(instrument)).fill(0);
            const isEmpty = voicings.length === 0;
            return (
              <div
                key={name}
                className="flex-shrink-0 flex flex-col items-center border border-gray-200 rounded-lg px-2 pt-2 pb-1 bg-white"
              >
                <span className="text-xs font-semibold text-gray-700 mb-1">{name}</span>
                <div
                  style={isEmpty ? { cursor: 'pointer' } : undefined}
                  onClick={isEmpty ? () => setUploadChord(name) : undefined}
                >
                  <ChordDiagram frets={frets} width={90} stringCount={getStringCount(instrument)} />
                </div>
                {voicings.length > 1 && (
                  <div className="flex items-center justify-between w-full text-xs text-gray-400 mt-1">
                    <button
                      className="hover:text-gray-600 px-1 text-2xl leading-none"
                      onClick={() => setChordVoicingIdx(s => ({ ...s, [name]: (idx - 1 + voicings.length) % voicings.length }))}
                    >‹</button>
                    <span>{idx + 1}/{voicings.length}</span>
                    <button
                      className="hover:text-gray-600 px-1 text-2xl leading-none"
                      onClick={() => setChordVoicingIdx(s => ({ ...s, [name]: (idx + 1) % voicings.length }))}
                    >›</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderChordUploadModal() {
    if (!uploadChord) return null;
    return (
      <ChordUploadModal
        chordName={uploadChord}
        instrument={instrument}
        lockInstrument
        onClose={() => setUploadChord(null)}
        onSuccess={() => {
          const name = uploadChord;
          setUploadChord(null);
          const parsed = parseChordName(name);
          if (parsed) {
            getChordVoicings(parsed.root, parsed.quality, instrument).then(vs => {
              setChordVoicings(s => ({ ...s, [name]: vs }));
            });
          }
        }}
      />
    );
  }

  function renderAddToPlaylistModal() {
    if (!addToPlaylistOpen || !song) return null;
    return (
      <AddToPlaylistModal
        songId={id!}
        songTitle={song.title}
        onClose={() => setAddToPlaylistOpen(false)}
        keyOffset={semitones}
        capoOffset={capo - (song.capo ?? 0)}
        overrideChanged={overrideChanged}
        currentPlaylistId={playlistState?.playlistId}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={`px-3 sm:px-6 pb-4 ${viewMode === 'scroll' ? 'pt-0' : playlistState ? 'pt-2' : 'pt-4'}`}>
      {song && (
        <>
          {!collapsed && (
            <div className={viewMode === 'scroll' ? 'sticky top-14 z-40 bg-white border-b border-gray-100 relative' : ''}>
              <div className="flex items-start justify-between mb-1">
                {renderSongMeta()}
                <div className="flex items-center gap-2 md:gap-4">
                  <SongDetailToolbar
                    id={id!}
                    song={song}
                    semitones={semitones}
                    capo={capo}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    showChords={showChords}
                    setShowChords={setShowChords}
                    autoScrolling={autoScrolling}
                    setAutoScrolling={setAutoScrolling}
                    showTabLicks={showTabLicks}
                    hasTabLines={hasTabLines}
                    reparsing={reparsing}
                    handleTabLicksToggle={handleTabLicksToggle}
                    currentPlaylistEntryTempoOverride={currentPlaylistEntry?.tempoOverride}
                    overrideChanged={overrideChanged}
                    setAddToPlaylistOpen={setAddToPlaylistOpen}
                  />
                  {renderCapoTransposeInline()}
                </div>
              </div>
            </div>
          )}
          {error && <p className="text-danger-6 text-sm mb-4">{error}</p>}
          {renderChordSheet()}
          {renderCapTranspModal()}
          {renderChordDiagramPanel()}
        </>
      )}
      {!song && loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!song && error && <p className="text-danger-6 text-sm">{error}</p>}
      {renderChordUploadModal()}
      {renderAddToPlaylistModal()}
    </div>
  );
}
