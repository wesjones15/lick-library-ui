import { useState, useEffect } from 'react';
import { getAllSongs } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';

interface Props {
  onSelect: (songId: string) => void;
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-800">Load Song</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-4 py-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search songs…"
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {filtered.map(song => (
            <button
              key={song.id}
              onClick={() => onSelect(song.id)}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-800">{song.title}</div>
              {song.artist && <div className="text-xs text-gray-400">{song.artist}</div>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-400 text-center">No songs found</div>
          )}
        </div>
      </div>
    </div>
  );
}
