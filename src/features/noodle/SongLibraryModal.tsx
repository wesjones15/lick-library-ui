import { useState, useEffect } from 'react';
import { getAllSongs } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';

interface Props {
  onSelect: (song: SongSummary) => void;
  onClose: () => void;
}

export default function SongLibraryModal({ onSelect, onClose }: Props) {
  const [songs, setSongs] = useState<SongSummary[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getAllSongs().then(setSongs).catch(() => {});
  }, []);

  const filtered = query
    ? songs.filter(s =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.artist ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : songs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-300">
          <span className="font-semibold text-sm text-gray-900">Load Song</span>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-xl leading-none">✕</button>
        </div>
        <div className="px-4 py-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search songs…"
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-4"
          />
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-300">
          {filtered.map(song => (
            <button
              key={song.id}
              onClick={() => onSelect(song)}
              className="w-full text-left px-4 py-3 hover:bg-brand-1 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">{song.title}</div>
              {song.artist && <div className="text-xs text-gray-600">{song.artist}</div>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-600 text-center">No songs found</div>
          )}
        </div>
      </div>
    </div>
  );
}
