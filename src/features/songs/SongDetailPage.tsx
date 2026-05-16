import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSong, getChordVoicings } from '../../core/api/client';
import ChordUploadModal from '../chords/ChordUploadModal';
import type { SongDetail, ChordVoicing, GuitarTabLine } from '../../core/api/client';
import ChordSheet from './ChordSheet';
import ChordDiagram from '../chords/ChordDiagram';
import { parseChordName } from './parseChordName';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';
import { useSongNavContext } from '../../core/context/SongNavContext';

const KEY_LABELS: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#', E: 'E',
  F: 'F', F_SHARP: 'F#', G: 'G', G_SHARP: 'G#', A: 'A',
  B_FLAT: 'Bb', B: 'B',
};

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function keyLabel(originalKey: string | null, semitones: number): string {
  if (!originalKey) return '';
  const display = KEY_LABELS[originalKey] ?? originalKey;
  const match = display.match(/^([A-G][#b]?)(m?)$/);
  if (!match) return display;
  const [, root, suffix] = match;
  const idx = CHROMATIC.indexOf(root);
  if (idx === -1) return display;
  return CHROMATIC[((idx + semitones) % 12 + 12) % 12] + suffix;
}

function modeLabel(originalKey: string | null): string | null {
  if (!originalKey) return null;
  const display = KEY_LABELS[originalKey] ?? originalKey;
  if (/m$/.test(display)) return 'Minor';
  if (/^[A-G][#b]?$/.test(display)) return 'Major';
  return null;
}

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

function extractChordNames(song: SongDetail): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  song.chordLines.forEach(line => {
    const text = (line as GuitarTabLine).type === 'tab'
      ? (line as GuitarTabLine).header
      : (line as { chords: string }).chords;
    text.split(/\s+/).forEach(t => {
      const core = t.replace(/^\(+/, '').replace(/[)*]+$/, '');
      if (/^[A-G]/.test(core) && !seen.has(core)) {
        seen.add(core);
        result.push(core);
      }
    });
  });
  return result;
}

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBpm, setIsPlaying, bpm, isPlaying } = useMetronomeContext();
  const { setInfo, collapsed, showChords, setShowChords } = useSongNavContext();
  const isPortrait = usePortrait();
  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(0);
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'columns' | 'scroll'>('columns');
  const [chordVoicings, setChordVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [chordVoicingIdx, setChordVoicingIdx] = useState<Record<string, number>>({});
  const [uploadChord, setUploadChord] = useState<string | null>(null);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [capTranspOpen, setCapTranspOpen] = useState(false);
  const [scrollFontScale, setScrollFontScale] = useState<number | null>(null);
  const loadedSongIdRef = useRef<string | null>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getSong(id, semitones)
      .then(s => {
        setSong(s);
        if (loadedSongIdRef.current !== id) {
          setCapo(s.capo ?? 0);
          loadedSongIdRef.current = id;
        }
      })
      .catch(() => setError('Failed to load song.'))
      .finally(() => setLoading(false));
  }, [id, semitones]);

  useEffect(() => {
    if (!autoScrolling) return;
    const id = setInterval(() => window.scrollBy({ top: 2 }), 50);
    return () => clearInterval(id);
  }, [autoScrolling]);

  useEffect(() => {
    if (viewMode !== 'scroll') setAutoScrolling(false);
  }, [viewMode]);

  // Populate mini-navbar context
  useEffect(() => {
    if (!song) return;
    setInfo({
      title: song.title,
      artist: song.artist ?? undefined,
      bpm: song.tempo ?? undefined,
      shapeKey: keyLabel(song.originalKey, semitones - (song.capo ?? 0)),
      soundKey: keyLabel(song.originalKey, semitones + capo - (song.capo ?? 0)),
      capo,
    });
    return () => setInfo(null);
  }, [song, semitones, capo]);

  useEffect(() => {
    if (!overflowOpen) return;
    function handle(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [overflowOpen]);

  useEffect(() => {
    if (!showChords || !song) return;
    const names = extractChordNames(song);
    Promise.all(
      names.map(async name => {
        const parsed = parseChordName(name);
        if (!parsed) return [name, []] as [string, ChordVoicing[]];
        const voicings = await getChordVoicings(parsed.root, parsed.quality);
        return [name, voicings] as [string, ChordVoicing[]];
      })
    ).then(results => {
      setChordVoicings(Object.fromEntries(results));
      setChordVoicingIdx({});
    });
  }, [showChords, song]);

  const baseFontScale = isPortrait ? 1.5 : 2;
  const effectiveFontScale = viewMode === 'scroll' ? (scrollFontScale ?? baseFontScale) : undefined;

  useEffect(() => {
    setScrollFontScale(null);
  }, [song?.id, viewMode, isPortrait]);

  useLayoutEffect(() => {
    if (viewMode !== 'scroll' || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    if (el.scrollWidth > el.clientWidth + 1) {
      const ratio = el.clientWidth / el.scrollWidth;
      setScrollFontScale(prev => (prev ?? baseFontScale) * ratio);
    }
  }, [viewMode, song, semitones, capo, isPortrait, scrollFontScale]);

  const btnClass = "w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium";
  const stubBtnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded border transition-colors ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`;

  return (
    <div className={`px-3 sm:px-6 pb-4 ${viewMode === 'scroll' ? 'pt-0' : 'pt-4'}`}>
      {song && (
        <>
          {/* Header — hidden when collapsed */}
          {!collapsed && (
          <div className={viewMode === 'scroll' ? 'sticky top-14 z-40 bg-white border-b border-gray-100 relative' : ''}>
          <div className="flex items-start justify-between mb-1">
            {/* Left: title + meta */}
            <div>
              {song.artist && <div className="text-xs text-gray-400">{song.artist}</div>}
              <h1 className="text-xl font-bold text-gray-900">{song.title}</h1>
              <div className="flex flex-col md:flex-row md:gap-3 mt-0.5 text-xs text-gray-400 gap-0.5">
                <div className="flex gap-2 items-center">
                  <span>Standard</span>
                  {modeLabel(song.originalKey) && <span>{modeLabel(song.originalKey)}</span>}
                </div>
                {song.tempo != null && (
                  <button
                    onClick={() => { if (isPlaying && bpm === song.tempo) { setIsPlaying(false); } else { setBpm(song.tempo!); setIsPlaying(true); } }}
                    className="text-left text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    {song.tempo} BPM
                  </button>
                )}
              </div>
            </div>

            {/* Right: action buttons + capo/transpose */}
            <div className="flex items-center gap-2 md:gap-4">

              {/* Desktop (md+): named text buttons */}
              <button
                onClick={() => setViewMode(m => m === 'columns' ? 'scroll' : 'columns')}
                className={`hidden md:flex ${stubBtnClass(viewMode === 'scroll')} flex-col items-center w-14`}
              >
                <span style={{ fontSize: '9px' }}>view:</span>
                <span style={{ fontSize: '9px' }}>{viewMode === 'scroll' ? 'scroll' : 'columns'}</span>
              </button>
              <button
                onClick={() => setShowChords(v => !v)}
                className={`hidden md:block ${stubBtnClass(showChords)}`}
              >
                Show Chords
              </button>
              <button
                onClick={() => navigate(`/song/${id}/manage?semitones=${semitones}`)}
                className="hidden md:block text-gray-300 hover:text-indigo-500 transition-colors text-4xl leading-none"
                aria-label="Manage song"
              >
                ✎
              </button>

              {/* Landscape (sm–md): icon buttons */}
              <button
                onClick={() => setViewMode(m => m === 'columns' ? 'scroll' : 'columns')}
                className={`hidden sm:flex md:hidden w-8 h-8 rounded-lg border items-center justify-center text-xs transition-colors ${viewMode === 'scroll' ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
                aria-label="Toggle view"
                title={viewMode === 'scroll' ? 'Switch to columns' : 'Switch to scroll'}
              >
                {viewMode === 'scroll' ? '↕' : '⊞'}
              </button>
              <button
                onClick={() => setShowChords(v => !v)}
                className={`hidden sm:flex md:hidden w-8 h-8 rounded-lg border items-center justify-center text-base transition-colors ${showChords ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
                aria-label="Show chords"
                title="Show chords"
              >
                ♬
              </button>
              <button
                onClick={() => navigate(`/song/${id}/manage?semitones=${semitones}`)}
                className="hidden sm:block md:hidden text-gray-300 hover:text-indigo-500 transition-colors text-3xl leading-none"
                aria-label="Manage song"
              >
                ✎
              </button>

              {/* Portrait (<sm): hamburger ⋮ */}
              <div ref={overflowRef} className="relative sm:hidden">
                <button
                  onClick={() => setOverflowOpen(o => !o)}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-xl leading-none"
                  aria-label="More options"
                >
                  ⋮
                </button>
                {overflowOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex flex-col py-1">
                    <button
                      onClick={() => { setViewMode(m => m === 'columns' ? 'scroll' : 'columns'); setOverflowOpen(false); }}
                      className="px-4 py-2 text-sm text-left text-gray-600 hover:bg-gray-50"
                    >
                      View: {viewMode === 'scroll' ? 'columns' : 'scroll'}
                    </button>
                    <button
                      onClick={() => { setShowChords(v => !v); setOverflowOpen(false); }}
                      className="px-4 py-2 text-sm text-left text-gray-600 hover:bg-gray-50"
                    >
                      {showChords ? 'Hide Chords' : 'Show Chords'}
                    </button>
                    <button
                      onClick={() => { navigate(`/song/${id}/manage?semitones=${semitones}`); setOverflowOpen(false); }}
                      className="px-4 py-2 text-sm text-left text-gray-600 hover:bg-gray-50"
                    >
                      Manage
                    </button>
                  </div>
                )}
              </div>

              {/* Δ — mobile capo/transpose modal trigger (below md) */}
              <button
                onClick={() => setCapTranspOpen(true)}
                className={`md:hidden w-8 h-8 rounded-lg border flex items-center justify-center text-base transition-colors ${
                  (capo !== (song?.capo ?? 0) || semitones !== 0)
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                    : 'border-gray-200 text-gray-400 hover:text-gray-600'
                }`}
                aria-label="Capo & Transpose"
                title="Capo & Transpose"
              >
                Δ
              </button>

              {/* Desktop inline capo (md+) */}
              <div className="hidden md:flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">Capo</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCapo(c => Math.max(0, c - 1))} className={btnClass}>−</button>
                  <div className="flex items-center justify-center w-8">
                    <span className="text-base font-semibold text-gray-900">{capo}</span>
                  </div>
                  <button onClick={() => setCapo(c => Math.min(11, c + 1))} className={btnClass}>+</button>
                </div>
                <button
                  onClick={() => setCapo(song.capo ?? 0)}
                  className={`text-xs text-center transition-colors ${capo !== (song.capo ?? 0) ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
                >
                  reset
                </button>
              </div>

              {/* Divider (md+) */}
              <div className="hidden md:block self-stretch border-l border-gray-200" />

              {/* Desktop inline transpose (md+) */}
              <div className="hidden md:flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">Transpose</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSemitones(s => s - 1 <= -12 ? 0 : s - 1)} className={btnClass}>−</button>
                  <div className="flex gap-3 items-center">
                    <div className="flex flex-col items-center w-10">
                      <span className="text-base font-semibold text-gray-900">
                        {keyLabel(song.originalKey, semitones - (song.capo ?? 0))}
                      </span>
                      <span className="text-xs text-gray-400">shape</span>
                    </div>
                    <span className="text-xs text-gray-300">
                      {semitones > 0 ? `+${semitones}` : `${semitones}`}
                    </span>
                    <div className="flex flex-col items-center w-10">
                      <span className="text-base font-semibold text-gray-900">
                        {keyLabel(song.originalKey, semitones + capo - (song.capo ?? 0))}
                      </span>
                      <span className="text-xs text-gray-400">sound</span>
                    </div>
                  </div>
                  <button onClick={() => setSemitones(s => s + 1 >= 12 ? 0 : s + 1)} className={btnClass}>+</button>
                </div>
                <button
                  onClick={() => setSemitones(0)}
                  className={`text-xs text-center transition-colors ${semitones !== 0 ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
                >
                  reset
                </button>
              </div>

            </div>
          </div>
          {viewMode === 'scroll' && (
            <button
              onClick={() => setAutoScrolling(a => !a)}
              style={{ position: 'absolute', top: '100%', marginTop: '4px', left: 0 }}
              className={`text-xl leading-none transition-colors ${autoScrolling ? 'text-indigo-500' : 'text-gray-300 hover:text-gray-500'}`}
              aria-label={autoScrolling ? 'Pause autoscroll' : 'Start autoscroll'}
            >
              {autoScrolling ? '⏸' : '▶'}
            </button>
          )}
          </div>
          )} {/* end !collapsed */}

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div ref={scrollContainerRef} className={viewMode === 'scroll' ? 'max-w-2xl mx-auto mt-8 overflow-x-hidden' : 'overflow-hidden'}>
            <ChordSheet
              chordLines={song.chordLines}
              numColumns={viewMode === 'scroll' ? 1 : song.numColumns}
              fontScale={effectiveFontScale}
              className={loading ? 'opacity-50 transition-opacity duration-150' : 'transition-opacity duration-150'}
            />
          </div>

          {capTranspOpen && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
              onClick={() => setCapTranspOpen(false)}
            >
              <div
                className="bg-white rounded-t-xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-6"
                onClick={e => e.stopPropagation()}
              >
                {/* Capo */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">Capo</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCapo(c => Math.max(0, c - 1))} className={btnClass}>−</button>
                    <div className="flex items-center justify-center w-8">
                      <span className="text-base font-semibold text-gray-900">{capo}</span>
                    </div>
                    <button onClick={() => setCapo(c => Math.min(11, c + 1))} className={btnClass}>+</button>
                  </div>
                  <button
                    onClick={() => setCapo(song?.capo ?? 0)}
                    className={`text-xs text-center transition-colors ${capo !== (song?.capo ?? 0) ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
                  >
                    reset
                  </button>
                </div>
                <div className="border-t border-gray-100" />
                {/* Transpose */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">Transpose</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSemitones(s => s - 1 <= -12 ? 0 : s - 1)} className={btnClass}>−</button>
                    <div className="flex gap-3 items-center">
                      <div className="flex flex-col items-center w-10">
                        <span className="text-base font-semibold text-gray-900">
                          {keyLabel(song?.originalKey ?? null, semitones - (song?.capo ?? 0))}
                        </span>
                        <span className="text-xs text-gray-400">shape</span>
                      </div>
                      <span className="text-xs text-gray-300">
                        {semitones > 0 ? `+${semitones}` : `${semitones}`}
                      </span>
                      <div className="flex flex-col items-center w-10">
                        <span className="text-base font-semibold text-gray-900">
                          {keyLabel(song?.originalKey ?? null, semitones + capo - (song?.capo ?? 0))}
                        </span>
                        <span className="text-xs text-gray-400">sound</span>
                      </div>
                    </div>
                    <button onClick={() => setSemitones(s => s + 1 >= 12 ? 0 : s + 1)} className={btnClass}>+</button>
                  </div>
                  <button
                    onClick={() => setSemitones(0)}
                    className={`text-xs text-center transition-colors ${semitones !== 0 ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
                  >
                    reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {showChords && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
              <div className="flex gap-3 overflow-x-auto px-4 py-3">
                {extractChordNames(song).map(name => {
                  const voicings = chordVoicings[name] ?? [];
                  const idx = chordVoicingIdx[name] ?? 0;
                  const frets = voicings.length > 0 ? voicings[idx].frets : [0, 0, 0, 0, 0, 0];
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
                        <ChordDiagram frets={frets} width={90} />
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
          )}
        </>
      )}

      {!song && loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!song && error && <p className="text-red-500 text-sm">{error}</p>}

      {uploadChord && (
        <ChordUploadModal
          chordName={uploadChord}
          onClose={() => setUploadChord(null)}
          onSuccess={() => {
            const name = uploadChord;
            setUploadChord(null);
            setChordVoicings(s => { const n = { ...s }; delete n[name]; return n; });
          }}
        />
      )}
    </div>
  );
}
