import { useState, useEffect, useMemo } from 'react';
import { getLick } from '../../core/api/client';
import type { PositionResponse } from '../../core/api/client';
import { getStringLabels, shapeShift, tuningSemitones } from '../../core/music';
import { shiftTab, tabTuning } from './tabTranspose';

interface Props {
  lickId: string | null;
  rawTab: string;
  // Key the lick sounds in on this instrument (shape key plus the tuning's sounding offset)
  currentKey: string | null;
  // Shape transposition applied to the song
  semitones: number;
  fontSize: number;
  instrument?: string;
  customTuning?: string;
}

function emptyTabForInstrument(instrument: string, customTuning?: string): string {
  if (instrument === 'CUSTOM' && customTuning?.trim()) {
    const notes = customTuning.trim().split(/\s+/).reverse();
    return notes.map(n => `${n}|--|`).join('\n');
  }
  const labels = getStringLabels(instrument);
  return labels.map(l => `${l}|--|`).join('\n');
}

function renderColoredTab(tab: string, fontSize: number): React.ReactNode {
  return (
    <div style={{ fontSize: `${fontSize}px`, fontFamily: 'monospace' }}>
      {tab.split('\n').map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre' }}>
          <span style={{ color: '#ef4444' }}>{line[0] ?? ''}</span>
          <span style={{ color: '#1f2937' }}>{line.slice(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SongLickCard({ lickId, rawTab, currentKey, semitones, fontSize, instrument = 'GUITAR', customTuning }: Props) {
  const [result, setResult] = useState<{ key: string; positions: PositionResponse[] } | null>(null);
  const [posIdx, setPosIdx] = useState(0);

  // When the instrument plays the tab's shapes (standard ↔ Eb, same string layout), the exact
  // transposition is the original tab moved up or down the neck; the builder only offers alternatives.
  const sameShapes = useMemo(() => {
    const target = tuningSemitones(instrument, customTuning);
    const source = tabTuning(rawTab) ?? (rawTab.split('\n').length === 6 ? tuningSemitones('GUITAR') : null);
    return !!target && !!source && shapeShift(source, target) !== null;
  }, [rawTab, instrument, customTuning]);
  const shiftedTab = useMemo(() => shiftTab(rawTab, semitones), [rawTab, semitones]);

  // Results are tagged with what was asked for, so a slow older response can never overwrite a newer key
  const fetchKey = lickId && currentKey ? [lickId, currentKey, instrument, customTuning ?? ''].join('|') : null;
  useEffect(() => {
    if (!fetchKey || !lickId || !currentKey) return;
    let cancelled = false;
    getLick(lickId, currentKey, 'greedy', instrument, customTuning)
      .then(detail => { if (!cancelled) setResult({ key: fetchKey, positions: detail.positions }); })
      .catch(() => { if (!cancelled) setResult({ key: fetchKey, positions: [] }); });
    return () => { cancelled = true; };
  }, [fetchKey, lickId, currentKey, instrument, customTuning]);
  const positions = result?.key === fetchKey ? result.positions : [];
  const loading = !!fetchKey && result?.key !== fetchKey;

  const options = sameShapes
    ? [shiftedTab, ...positions.map(p => p.tabString)]
    : positions.map(p => p.tabString);

  if (options.length === 0) {
    if (loading) {
      return <div className="my-1 opacity-50">{renderColoredTab(emptyTabForInstrument(instrument, customTuning), fontSize)}</div>;
    }
    const reason = !currentKey
      ? 'set the song key to convert this lick'
      : `no valid positions found for lick with ${instrument.toLowerCase()}`;
    return (
      <div className="my-1">
        {renderColoredTab(emptyTabForInstrument(instrument, customTuning), fontSize)}
        <p className="text-[10px] text-danger-5 mt-0.5 font-mono">{reason}</p>
      </div>
    );
  }

  const shown = Math.min(posIdx, options.length - 1);

  return (
    <div className="my-1">
      {renderColoredTab(options[shown], fontSize)}
      {options.length > 1 && (
        <div className="flex items-center gap-2 mt-0.5">
          <button
            onClick={e => { e.stopPropagation(); setPosIdx((shown - 1 + options.length) % options.length); }}
            className="text-gray-600 hover:text-brand-5 text-sm leading-none"
            aria-label="Previous position"
          >
            ‹
          </button>
          <span className="text-[10px] text-gray-600 font-mono">{shown + 1}/{options.length}</span>
          <button
            onClick={e => { e.stopPropagation(); setPosIdx((shown + 1) % options.length); }}
            className="text-gray-600 hover:text-brand-5 text-sm leading-none"
            aria-label="Next position"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
