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
  const [song, setSong] = useState<SongDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getSong(id, semitones)
      .then(setSong)
      .catch(() => setError('Failed to load song.'))
      .finally(() => setLoading(false));
  }, [id, semitones]);

  return (
    <div className="px-6 py-8">
      {song && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-6 max-w-5xl">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{song.title}</h1>
              {song.artist && <p className="text-gray-500 text-sm mt-0.5">{song.artist}</p>}
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                {song.capo != null && song.capo > 0 && <span>Capo {song.capo}</span>}
                {song.tempo != null && <span>{song.tempo} BPM</span>}
              </div>
            </div>

            {/* Transpose controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSemitones(s => s - 1)}
                className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium"
              >
                −
              </button>
              <div className="flex flex-col items-center w-12">
                <span className="text-base font-semibold text-gray-900">
                  {keyLabel(song.originalKey, semitones)}
                </span>
                {semitones !== 0 && (
                  <span className="text-xs text-gray-400">
                    {semitones > 0 ? `+${semitones}` : semitones}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSemitones(s => s + 1)}
                className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium"
              >
                +
              </button>
              {semitones !== 0 && (
                <button
                  onClick={() => setSemitones(0)}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                >
                  reset
                </button>
              )}
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
