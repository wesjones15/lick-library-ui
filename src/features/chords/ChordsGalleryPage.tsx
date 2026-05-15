import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KeySelector from '../../components/KeySelector';
import ChordCard from './ChordCard';
import { getAllChordVoicings } from '../../core/api/client';

const NOTE_DISPLAY: Record<string, string> = {
  C: 'C', C_SHARP: 'C#', D: 'D', D_SHARP: 'D#', E: 'E', F: 'F',
  F_SHARP: 'F#', G: 'G', G_SHARP: 'G#', A: 'A', B_FLAT: 'Bb', B: 'B',
};

const QUALITIES = [
  { quality: '',     label: 'Major'    },
  { quality: 'm',    label: 'Minor'    },
  { quality: '7',    label: 'Dom 7'    },
  { quality: 'maj7', label: 'Maj 7'   },
  { quality: 'm7',   label: 'Min 7'   },
  { quality: 'sus2', label: 'Sus 2'   },
  { quality: 'sus4', label: 'Sus 4'   },
  { quality: 'dim',  label: 'Dim'     },
  { quality: 'aug',  label: 'Aug'     },
  { quality: 'add9', label: 'Add 9'   },
  { quality: '6',    label: 'Sixth'   },
  { quality: 'm6',   label: 'Min 6'   },
  { quality: 'dim7', label: 'Dim 7'   },
  { quality: 'm7b5', label: 'Half Dim'},
];

export default function ChordsGalleryPage() {
  const navigate = useNavigate();
  const [root, setRoot] = useState('C');
  const [allVoicings, setAllVoicings] = useState<Record<string, string[]>>({});

  useEffect(() => {
    getAllChordVoicings(root).then(setAllVoicings);
  }, [root]);

  const rootDisplay = NOTE_DISPLAY[root] ?? root;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chord Gallery</h1>
        <div className="flex items-center gap-3">
          <KeySelector value={root} onChange={setRoot} />
          <button
            onClick={() => navigate('/chords/upload')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          >
            Upload Voicing
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {QUALITIES.map(({ quality, label }) => (
          <ChordCard
            key={`${root}-${quality}`}
            rootDisplay={rootDisplay}
            quality={quality}
            label={label}
            voicings={allVoicings[quality] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
