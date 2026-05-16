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
    <div className="grid grid-cols-4 gap-3">
      {songs.map(song => (
        <SongCard key={song.id} song={song} managing={managing} onReparse={onReparse} />
      ))}
    </div>
  );
}
