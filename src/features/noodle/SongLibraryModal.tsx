import { useState, useEffect } from 'react';
import { getAllSongs } from '../../core/api/client';
import type { SongSummary } from '../../core/api/client';
import { C_BLACK_BG, C_GRAY_BORDER_100, C_GRAY_BORDER_200, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_800, C_PRIMARY_BG_SOFT, C_PRIMARY_BORDER_MID, C_WHITE_BG } from '../../core/colors';

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
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${C_BLACK_BG}/40`} onClick={onClose}>
      <div
        className={`${C_WHITE_BG} rounded-xl shadow-xl w-full max-w-sm mx-4 flex flex-col max-h-[70vh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b ${C_GRAY_BORDER_100}`}>
          <span className={`font-semibold text-sm ${C_GRAY_TEXT_800}`}>Load Song</span>
          <button onClick={onClose} className={`${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} text-xl leading-none`}>✕</button>
        </div>
        <div className="px-4 py-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search songs…"
            className={`w-full border ${C_GRAY_BORDER_200} rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:${C_PRIMARY_BORDER_MID}`}
          />
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {filtered.map(song => (
            <button
              key={song.id}
              onClick={() => onSelect(song)}
              className={`w-full text-left px-4 py-3 hover:${C_PRIMARY_BG_SOFT} transition-colors`}
            >
              <div className={`text-sm font-medium ${C_GRAY_TEXT_800}`}>{song.title}</div>
              {song.artist && <div className={`text-xs ${C_GRAY_TEXT_400}`}>{song.artist}</div>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={`px-4 py-6 text-sm ${C_GRAY_TEXT_400} text-center`}>No songs found</div>
          )}
        </div>
      </div>
    </div>
  );
}
