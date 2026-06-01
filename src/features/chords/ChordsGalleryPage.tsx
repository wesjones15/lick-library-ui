import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KeySelector from '../../core/components/KeySelector';
import ChordCard from './ChordCard';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import { getAllChordVoicings, reseedChordDefaults } from '../../core/api/client';
import type { ChordVoicing } from '../../core/api/client';
import type { InstrumentName } from '../../core/useInstrument';

import { formatNoteEnum, NOTE_KEYS, ROOT_CHROMATIC } from '../../core/music';

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

const KNOWN_QUALITIES = new Set(QUALITIES.map(q => q.quality));

function resolveSlashQuality(root: string, quality: string): string {
  const m = quality.match(/^([^/]*)\/(\d+)$/);
  if (!m) return quality;
  const base = m[1];
  const semitones = parseInt(m[2], 10);
  const rootIdx = ROOT_CHROMATIC[root] ?? -1;
  if (rootIdx === -1) return quality;
  const bassKey = NOTE_KEYS[(rootIdx + semitones) % 12].value;
  return `${base}/${formatNoteEnum(bassKey)}`;
}

export default function ChordsGalleryPage() {
  const navigate = useNavigate();
  const [root, setRoot] = useState('C');
  const [instrument, setInstrument] = useState('GUITAR');
  const [allVoicings, setAllVoicings] = useState<Record<string, ChordVoicing[]>>({});
  const [manageMode, setManageMode] = useState(false);
  const [reseedConfirm, setReseedConfirm] = useState(false);
  const [reseeding, setReseeding] = useState(false);

  const fetchVoicings = () => getAllChordVoicings(root, instrument).then(setAllVoicings);

  useEffect(() => { fetchVoicings(); }, [root, instrument]);

  const rootDisplay = formatNoteEnum(root);

  const extraQualities = Object.keys(allVoicings)
    .filter(q => !KNOWN_QUALITIES.has(q))
    .map(q => ({ quality: q, label: resolveSlashQuality(root, q) }));

  const allQualities = [...QUALITIES, ...extraQualities];

  async function handleReseed() {
    setReseeding(true);
    try {
      await reseedChordDefaults();
      await fetchVoicings();
    } finally {
      setReseeding(false);
      setReseedConfirm(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chord Gallery</h1>
        <div className="flex items-center gap-3">
          <KeySelector value={root} onChange={setRoot} />
          <InstrumentSelector
            instrument={instrument as InstrumentName}
            onInstrumentChange={name => setInstrument(name)}
            excludeCustom
          />
          {!manageMode && (
            <button
              onClick={() => navigate('/chords/theory')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            >
              Chord Theory
            </button>
          )}
          {!manageMode && (
            <button
              onClick={() => navigate('/chords/upload')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            >
              Upload Voicing
            </button>
          )}
          <button
            onClick={() => { setManageMode(m => !m); setReseedConfirm(false); }}
            className={`px-3 py-2 text-sm border rounded-lg transition-colors ${manageMode ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            {manageMode ? 'Done' : 'Manage'}
          </button>
        </div>
      </div>

      {manageMode && (
        <div className="mb-4 flex items-center gap-3">
          {reseedConfirm ? (
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span>This will restore any deleted system voicings. Continue?</span>
              <button
                onClick={handleReseed}
                disabled={reseeding}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {reseeding ? 'Restoring…' : 'Confirm'}
              </button>
              <button
                onClick={() => setReseedConfirm(false)}
                className="px-3 py-1 border border-red-300 rounded hover:bg-red-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setReseedConfirm(true)}
              className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              Reseed Defaults
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allQualities.map(({ quality, label }) => {
          const resolved = resolveSlashQuality(root, quality);
          const displayQuality = resolved !== quality ? resolved : undefined;
          return (
            <ChordCard
              key={`${root}-${quality}`}
              rootDisplay={rootDisplay}
              quality={quality}
              displayQuality={displayQuality}
              label={label}
              voicings={allVoicings[quality] ?? []}
              manageMode={manageMode}
              instrument={instrument}
              onChanged={fetchVoicings}
            />
          );
        })}
      </div>
    </div>
  );
}
