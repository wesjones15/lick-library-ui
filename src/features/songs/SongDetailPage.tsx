import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSong, getChordVoicings } from '../../core/api/client';
import ChordUploadModal from '../chords/ChordUploadModal';
import type { SongDetail, ChordVoicing } from '../../core/api/client';
import ChordSheet from './ChordSheet';
import ChordDiagram from '../chords/ChordDiagram';
import { parseChordName } from './parseChordName';
import { useMetronomeContext } from '../../core/metronome/MetronomeContext';

const KEY_LABELS: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#', E: 'E',
  F: 'F', F_SHARP: 'F#', G: 'G', G_SHARP: 'G#', A: 'A',
  B_FLAT: 'Bb', B: 'B',
};

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function keyLabel(originalKey: string | null, semitones: number): string {
  if (!originalKey) return '';
  const base = KEY_LABELS[originalKey] ?? originalKey;
  const baseIdx = CHROMATIC.indexOf(base);
  if (baseIdx === -1) return base;
  return CHROMATIC[((baseIdx + semitones) % 12 + 12) % 12];
}

function extractChordNames(song: SongDetail): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  song.chordLines.forEach(line => {
    line.chords.split(/\s+/).forEach(t => {
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
  const { setBpm, setIsPlaying } = useMetronomeContext();
  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(0);
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChords, setShowChords] = useState(false);
  const [viewMode, setViewMode] = useState<'columns' | 'scroll'>('columns');
  const [chordVoicings, setChordVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [chordVoicingIdx, setChordVoicingIdx] = useState<Record<string, number>>({});
  const [uploadChord, setUploadChord] = useState<string | null>(null);
  const loadedSongIdRef = useRef<string | null>(null);

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

  const btnClass = "w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium";
  const stubBtnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded border transition-colors ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'}`;

  return (
    <div className="px-6 pt-4 pb-0">
      {song && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            {/* Left: title + meta */}
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold text-gray-900">{song.title}</h1>
                {song.artist && <span className="text-gray-400 text-sm">{song.artist}</span>}
              </div>
              <div className="flex gap-3 mt-0.5 text-xs text-gray-400 items-center">
                {song.tempo != null && (
                  <button
                    onClick={() => { setBpm(song.tempo!); setIsPlaying(true); }}
                    className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    {song.tempo} BPM
                  </button>
                )}
                <span>Standard</span>
              </div>
            </div>

            {/* Right: single row — action buttons + capo/transpose */}
            <div className="flex items-center gap-4">

              {/* View button */}
              <button
                title="Toggle scrolling view (coming soon)"
                onClick={() => setViewMode(m => m === 'columns' ? 'scroll' : 'columns')}
                className={`${stubBtnClass(viewMode === 'scroll')} flex flex-col items-center`}
              >
                <span style={{ fontSize: '9px' }}>view:</span>
                <span style={{ fontSize: '9px' }}>{viewMode}</span>
              </button>

              {/* Show Chords */}
              <button
                onClick={() => setShowChords(v => !v)}
                className={stubBtnClass(showChords)}
              >
                Show Chords
              </button>

              {/* ✎ manage */}
              <button
                onClick={() => navigate(`/song/${id}/manage?semitones=${semitones}`)}
                className="text-gray-300 hover:text-indigo-500 transition-colors text-4xl leading-none"
                aria-label="Manage song"
              >
                ✎
              </button>

              {/* Capo group */}
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
                  onClick={() => setCapo(song.capo ?? 0)}
                  className={`text-xs text-center transition-colors ${capo !== (song.capo ?? 0) ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
                >
                  reset
                </button>
              </div>

              {/* Divider */}
              <div className="self-stretch border-l border-gray-200" />

                {/* Transpose group */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">Transpose</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSemitones(s => s - 1 <= -12 ? 0 : s - 1)} className={btnClass}>−</button>

                    {/* Dual key display */}
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

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <ChordSheet
            chordLines={song.chordLines}
            numColumns={song.numColumns}
            className={loading ? 'opacity-50 transition-opacity duration-150' : 'transition-opacity duration-150'}
          />

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
