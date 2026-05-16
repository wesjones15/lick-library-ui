import SongCard from './SongCard';
import type { SongSummary } from '../../core/api/client';

interface Props {
  songs: SongSummary[];
  managing?: boolean;
  onReparse?: () => void;
}

export default function SongList({ songs, managing = false, onReparse }: Props) {
  if (songs.length === 0) {
    return <p className="text-gray-400 text-sm">No songs yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 portrait:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {songs.map(song => (
        <SongCard key={song.id} song={song} managing={managing} onReparse={onReparse} />
      ))}
    </div>
  );
}
