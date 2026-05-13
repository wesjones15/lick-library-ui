import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSong } from '../api/client';
import type { SongDetail } from '../api/client';
import ChordSheet from '../components/ChordSheet';

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

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(0);
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getSong(id, semitones)
      .then(s => { setSong(s); setCapo(s.capo ?? 0); })
      .catch(() => setError('Failed to load song.'))
      .finally(() => setLoading(false));
  }, [id, semitones]);

  const btnClass = "w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium";

  return (
    <div className="px-6 pt-4 pb-0">
      {song && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold text-gray-900">{song.title}</h1>
                {song.artist && <span className="text-gray-400 text-sm">{song.artist}</span>}
              </div>
              <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                {song.tempo != null && <span>{song.tempo} BPM</span>}
              </div>
            </div>

            {/* Transpose + Capo controls */}
            <div className="flex items-start gap-4">

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
              </div>

              {/* Divider */}
              <div className="self-stretch border-l border-gray-200 mt-5" />

              {/* Transpose group */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">Transpose</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSemitones(s => s - 1)} className={btnClass}>−</button>

                  {/* Dual key display */}
                  <div className="flex gap-3 items-center">
                    <div className="flex flex-col items-center w-10">
                      <span className="text-base font-semibold text-gray-900">
                        {keyLabel(song.originalKey, semitones - capo)}
                      </span>
                      <span className="text-xs text-gray-400">shape</span>
                    </div>
                    <span className="text-xs text-gray-300">
                      {semitones > 0 ? `+${semitones}` : `${semitones}`}
                    </span>
                    <div className="flex flex-col items-center w-10">
                      <span className="text-base font-semibold text-gray-900">
                        {keyLabel(song.originalKey, semitones)}
                      </span>
                      <span className="text-xs text-gray-400">sound</span>
                    </div>
                  </div>

                  <button onClick={() => setSemitones(s => s + 1)} className={btnClass}>+</button>
                </div>
                {/* Reset below transpose controls */}
                <button
                  onClick={() => setSemitones(0)}
                  className={`text-xs text-center transition-colors ${semitones !== 0 ? 'text-gray-400 hover:text-gray-600' : 'invisible'}`}
                >
                  reset
                </button>
              </div>

            </div>
          </div>

          {loading && <p className="text-gray-400 text-sm mb-4">Transposing…</p>}
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <ChordSheet chordLines={song.chordLines} numColumns={song.numColumns} />
        </>
      )}

      {!song && loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {!song && error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
