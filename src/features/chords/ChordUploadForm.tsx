import { useState } from 'react';
import { uploadChordVoicing } from '../../core/api/client';
import { parseChordName } from '../songs/parseChordName';
import ChordDiagram from './ChordDiagram';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import NumpadInput from '../../core/components/NumpadInput';
import { getStringEntries } from '../../core/music';
import type { InstrumentName } from '../../core/useInstrument';
import { C_DANGER_TEXT_SOFT, C_GRAY_BG_100, C_GRAY_BG_50, C_GRAY_BORDER_200, C_GRAY_BORDER_300, C_GRAY_TEXT_500, C_GRAY_TEXT_600, C_PRIMARY_BG, C_PRIMARY_BG_DARK, C_PRIMARY_BORDER_MID, C_WHITE_TEXT } from '../../core/colors';

interface Props {
  initialChordName?: string;
  lockChordName?: boolean;
  initialInstrument?: string;
  lockInstrument?: boolean;
  onSuccess?: () => void;
}

export default function ChordUploadForm({
  initialChordName = '',
  lockChordName = false,
  initialInstrument,
  lockInstrument = false,
  onSuccess,
}: Props) {
  const [chordName, setChordName] = useState(initialChordName);
  const [parseError, setParseError] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<string>(initialInstrument ?? 'GUITAR');
  const [frets, setFrets] = useState<string[]>(() =>
    Array(getStringEntries(initialInstrument ?? 'GUITAR').length).fill('')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stringDisplay = getStringEntries(instrument);

  const handleChordNameChange = (val: string) => {
    setChordName(val);
    if (!val.trim()) {
      setParseError(null);
      return;
    }
    const parsed = parseChordName(val.trim());
    setParseError(parsed ? null : "Couldn't recognize chord name");
  };

  const handleInstrumentChange = (name: InstrumentName) => {
    setInstrument(name);
    setFrets(Array(getStringEntries(name).length).fill(''));
  };

  const setFret = (idx: number, val: string) => {
    setFrets(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const allFretsSet = frets.every(f => f.trim() !== '');
  const canSubmit = !loading && allFretsSet && !parseError && chordName.trim() !== '';

  const previewFrets: (number | null)[] = frets.map(f => {
    const t = f.trim().toLowerCase();
    if (t === 'x') return null;
    const n = parseInt(t, 10);
    return !isNaN(n) && n >= 0 ? n : 0;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseChordName(chordName.trim());
    if (!parsed) {
      setParseError("Couldn't recognize chord name");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await uploadChordVoicing({ root: parsed.root, quality: parsed.quality, frets, instrument });
      setFrets(Array(stringDisplay.length).fill(''));
      if (!lockChordName) setChordName(initialChordName);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <input
          type="text"
          placeholder="Chord name, e.g. Am, C#maj7, Bbsus4"
          value={chordName}
          onChange={e => handleChordNameChange(e.target.value)}
          disabled={lockChordName}
          className={`border ${C_GRAY_BORDER_300} rounded-lg px-3 py-2 text-sm focus:outline-none focus:${C_PRIMARY_BORDER_MID} ${lockChordName ? '${C_GRAY_BG_100} cursor-not-allowed ${C_GRAY_TEXT_500}' : ''}`}
        />
        {parseError && <p className={`${C_DANGER_TEXT_SOFT} text-xs`}>{parseError}</p>}
      </div>

      {lockInstrument ? (
        <div className={`text-sm ${C_GRAY_TEXT_500} ${C_GRAY_BG_100} rounded-lg px-3 py-2 border ${C_GRAY_BORDER_200}`}>
          {instrument.charAt(0) + instrument.slice(1).toLowerCase()}
        </div>
      ) : (
        <InstrumentSelector
          instrument={instrument as InstrumentName}
          onInstrumentChange={handleInstrumentChange}
          excludeCustom
        />
      )}

      <div className={`border ${C_GRAY_BORDER_200} rounded-lg p-4 ${C_GRAY_BG_50}`}>
        <p className={`text-xs ${C_GRAY_TEXT_500} mb-3`}>Frets — enter a number (0–24) or <code>x</code> for muted</p>
        <div className="flex items-start gap-6">
          <div className="flex flex-col gap-2">
            {stringDisplay.map(({ label, fretsIdx }) => (
              <div key={label + fretsIdx} className="flex items-center gap-3">
                <span className={`w-4 text-right text-sm font-mono ${C_GRAY_TEXT_600}`}>{label}</span>
                <NumpadInput
                  value={frets[fretsIdx] ?? ''}
                  onChange={val => setFret(fretsIdx, val)}
                  placeholder="—"
                  extraKeys={[{ label: 'x', value: 'x' }]}
                  className={`w-16 border ${C_GRAY_BORDER_300} rounded px-2 py-1 text-sm font-mono text-center focus:outline-none focus:${C_PRIMARY_BORDER_MID}`}
                />
              </div>
            ))}
          </div>
          <ChordDiagram frets={previewFrets} width={130} stringCount={stringDisplay.length} />
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={`px-5 py-2 ${C_PRIMARY_BG} ${C_WHITE_TEXT} text-sm font-medium rounded-lg hover:${C_PRIMARY_BG_DARK} disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end`}
      >
        {loading ? 'Uploading…' : 'Upload Voicing'}
      </button>
      {error && <p className={`${C_DANGER_TEXT_SOFT} text-sm`}>{error}</p>}
    </form>
  );
}
