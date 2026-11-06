import { useState, useEffect, useMemo } from 'react';
import { getAllSongs, getSong, getBeatmap } from '../../core/api/client';
import type { SongSummary, ChordLyric } from '../../core/api/client';
import { generateBeatmap, isTabLine } from '../noodle/songUtils';
import { TOGGLE, TOGGLE_ON, TOGGLE_OFF } from '../../core/ui';
import LoadingOverlay from '../../core/components/LoadingOverlay';
import { useLoader } from '../../core/useLoader';
import SongMetaModal from './SongMetaModal';
import BeatmapHost from './BeatmapHost';

type Missing = 'artist' | 'key' | 'tempo';

function missingOf(s: SongSummary): Missing[] {
  const out: Missing[] = [];
  if (!s.artist?.trim()) out.push('artist');
  if (!s.originalKey) out.push('key');
  if (!s.tempo) out.push('tempo');
  return out;
}

// A song still has its default beatmap when none is saved, or the saved one equals the generated one
async function hasDefaultBeatmap(id: string): Promise<boolean> {
  const song = await getSong(id);
  const chordOnly = song.chordLines.filter(l => !isTabLine(l)) as ChordLyric[];
  const generated = generateBeatmap(chordOnly, song.timeSignature ?? 4);
  if (generated.length === 0) return false;
  const saved = await getBeatmap(id).then(b => b.beats).catch(() => null);
  if (!saved || saved.length < generated.length) return true;
  return generated.every((v, i) => v === saved[i]);
}

export default function DebugPage() {
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [showMissing, setShowMissing] = useState(true);
  const [showDefaultBeatmaps, setShowDefaultBeatmaps] = useState(false);
  const [defaults, setDefaults] = useState<Set<string> | null>(null);
  const [scanned, setScanned] = useState(0);
  const [editMeta, setEditMeta] = useState<string | null>(null);
  const [editBeatmap, setEditBeatmap] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const { state, retry } = useLoader(async isCancelled => {
    const list = await getAllSongs();
    if (!isCancelled()) setSongs(list);
  }, [refresh]);

  // Beatmap scan is one request pair per song, so it only runs when that filter is on
  useEffect(() => {
    if (!showDefaultBeatmaps || songs.length === 0) return;
    let cancelled = false;
    const found = new Set<string>();
    let next = 0;
    async function worker() {
      while (!cancelled && next < songs.length) {
        const song = songs[next++];
        try { if (await hasDefaultBeatmap(song.id)) found.add(song.id); } catch { /* skip */ }
        if (!cancelled) setScanned(n => n + 1);
      }
    }
    Promise.all(Array.from({ length: 6 }, worker)).then(() => { if (!cancelled) setDefaults(found); });
    return () => { cancelled = true; };
  }, [showDefaultBeatmaps, songs]);

  const rows = useMemo(() => songs.filter(s => {
    const miss = showMissing && missingOf(s).length > 0;
    const def = showDefaultBeatmaps && !!defaults?.has(s.id);
    return (showMissing || showDefaultBeatmaps) && (miss || def);
  }), [songs, showMissing, showDefaultBeatmaps, defaults]);

  const scanning = showDefaultBeatmaps && defaults === null;

  return (
    <div className="relative max-w-3xl mx-auto px-4 py-6 min-h-[calc(100vh-3.5rem)]">
      <LoadingOverlay state={state} onRetry={retry} />
      <h1 className="text-lg font-semibold text-gray-900 mb-3">Debug</h1>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setShowMissing(v => !v)} className={`${TOGGLE} ${showMissing ? TOGGLE_ON : TOGGLE_OFF}`}>
          Missing attributes
        </button>
        <button onClick={() => { setDefaults(null); setScanned(0); setShowDefaultBeatmaps(v => !v); }} className={`${TOGGLE} ${showDefaultBeatmaps ? TOGGLE_ON : TOGGLE_OFF}`}>
          Default beatmap
        </button>
        <span className="text-xs text-gray-600 ml-auto">
          {scanning ? `Scanning beatmaps ${scanned}/${songs.length}…` : `${rows.length} of ${songs.length} songs`}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(s => {
          const miss = missingOf(s);
          const isDefault = !!defaults?.has(s.id);
          return (
            <li key={s.id} className="border-2 border-gray-400 rounded-lg px-3 py-2 flex items-center gap-3">
              <button onClick={() => setEditMeta(s.id)} className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold text-gray-900 truncate">{s.title}</div>
                <div className="text-xs text-gray-600 truncate">{s.artist || '—'}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {showMissing && miss.map(m => (
                    <span key={m} className="text-[11px] px-1.5 py-0.5 rounded border-2 border-danger-3 bg-danger-1 text-danger-8">no {m}</span>
                  ))}
                  {showDefaultBeatmaps && isDefault && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded border-2 border-warn-3 bg-warn-1 text-warn-6">default beatmap</span>
                  )}
                </div>
              </button>
              {showDefaultBeatmaps && isDefault && (
                <button onClick={() => setEditBeatmap(s.id)} className="shrink-0 px-3 py-1.5 text-xs rounded-lg border-2 border-gray-400 text-gray-700 hover:bg-gray-50">
                  Beatmap
                </button>
              )}
            </li>
          );
        })}
        {rows.length === 0 && state === 'ready' && !scanning && (
          <li className="text-sm text-gray-600 py-6 text-center">Nothing to show.</li>
        )}
      </ul>

      {editMeta && (
        <SongMetaModal
          songId={editMeta}
          onClose={() => setEditMeta(null)}
          onSaved={() => { setEditMeta(null); setRefresh(n => n + 1); }}
        />
      )}
      {editBeatmap && (
        <BeatmapHost
          songId={editBeatmap}
          onClose={() => setEditBeatmap(null)}
          onSaved={() => {
            const id = editBeatmap;
            setDefaults(d => { if (!d) return d; const n = new Set(d); n.delete(id); return n; });
            // re-check this one song after the editor closes
            hasDefaultBeatmap(id).then(still => { if (still) setDefaults(d => d && new Set(d).add(id)); }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
