import { useState, useEffect } from 'react';
import { getSong, updateSong } from '../../core/api/client';
import type { SongDetail } from '../../core/api/client';
import { CHROMATIC_NOTES, MODE_DATA, MODE_SUFFIX, SONG_MODE_TO_ENUM } from '../../core/music';
import { SELECT, BTN_PRIMARY, BTN_SECONDARY, ALERT_RED } from '../../core/ui';
import InstrumentSelector from '../../core/components/InstrumentSelector';
import NumpadInput from '../../core/components/NumpadInput';
import type { InstrumentName } from '../../core/useInstrument';

const LEGACY_KEY_MAP: Record<string, string> = {
  C_SHARP: 'C#', D_SHARP: 'D#', F_SHARP: 'F#', G_SHARP: 'G#', B_FLAT: 'Bb',
};

function parseStoredKey(stored: string): { root: string; mode: string } {
  if (!stored) return { root: '', mode: '' };
  const display = LEGACY_KEY_MAP[stored] ?? stored;
  const match = display.match(/^([A-G][#b]?)(m?)(?: (.+))?$/);
  if (!match) return { root: display, mode: '' };
  const [, root, minorSuffix, modeName] = match;
  return { root, mode: modeName ? ` ${modeName}` : minorSuffix };
}

interface Props {
  songId: string;
  onClose: () => void;
  onSaved: () => void;
}

// Direct metadata editor for the admin debug page (admins can save any song)
export default function SongMetaModal({ songId, onClose, onSaved }: Props) {
  const [song, setSong] = useState<SongDetail | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [keyRoot, setKeyRoot] = useState('');
  const [keyMode, setKeyMode] = useState('');
  const [instrument, setInstrument] = useState<InstrumentName>('GUITAR');
  const [capo, setCapo] = useState('');
  const [tempo, setTempo] = useState('');
  const [timeSignature, setTimeSignature] = useState(4);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSong(songId).then(s => {
      if (cancelled) return;
      setSong(s);
      setTitle(s.title);
      setArtist(s.artist ?? '');
      const parsed = parseStoredKey(s.originalKey ?? '');
      setKeyRoot(parsed.root);
      setKeyMode(s.mode ? (MODE_SUFFIX[s.mode] ?? '') : parsed.mode);
      setInstrument((s.instrument ?? 'GUITAR') as InstrumentName);
      setCapo(s.capo != null ? String(s.capo) : '');
      setTempo(s.tempo != null ? String(s.tempo) : '');
      setTimeSignature(s.timeSignature ?? 4);
    }).catch(() => { if (!cancelled) setError('Could not load song.'); });
    return () => { cancelled = true; };
  }, [songId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateSong(songId, {
        title: title.trim(),
        artist: artist.trim() || undefined,
        originalKey: keyRoot || undefined,
        mode: keyRoot ? (SONG_MODE_TO_ENUM[keyMode] ?? 'IONIAN') : undefined,
        instrument,
        capo: capo ? parseInt(capo, 10) : undefined,
        tempo: tempo ? parseInt(tempo, 10) : undefined,
        timeSignature,
      });
      onSaved();
    } catch {
      setError('Save failed.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-sm text-gray-900">Manage song</span>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-lg leading-none" aria-label="Close">✕</button>
        </div>
        {!song && !error && <p className="text-sm text-gray-600">Loading…</p>}
        {error && <p className={ALERT_RED}>{error}</p>}
        {song && (
          <form onSubmit={save} className="flex flex-col gap-3">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" required className={`${SELECT} w-full`} />
            <input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" className={`${SELECT} w-full`} />
            <div className="flex flex-wrap gap-2">
              <select value={keyRoot} onChange={e => setKeyRoot(e.target.value)} className={`${SELECT} flex-1`}>
                <option value="">— Key —</option>
                {CHROMATIC_NOTES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={keyMode} onChange={e => setKeyMode(e.target.value)} disabled={!keyRoot} className={`${SELECT} w-24 disabled:opacity-60`}>
                {MODE_DATA.map(m => <option key={m.suffix} value={m.suffix}>{m.label}</option>)}
              </select>
              <NumpadInput value={capo} onChange={setCapo} placeholder="Capo" className={`${SELECT} w-20`} />
              <NumpadInput value={tempo} onChange={setTempo} placeholder="BPM" className={`${SELECT} w-24`} />
              <select value={timeSignature} onChange={e => setTimeSignature(Number(e.target.value))} className={`${SELECT} w-20`}>
                <option value={1}>1/4</option>
                <option value={2}>2/4</option>
                <option value={3}>3/4</option>
                <option value={4}>4/4</option>
                <option value={6}>6/8</option>
              </select>
            </div>
            <InstrumentSelector excludeCustom compact instrument={instrument} onInstrumentChange={setInstrument} />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
              <button type="submit" disabled={saving || !title.trim()} className={`${BTN_PRIMARY} disabled:opacity-50`}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
