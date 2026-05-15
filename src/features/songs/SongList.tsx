import SongCard from './SongCard';
import type { SongSummary } from '../../core/api/client';

interface Props {
  songs: SongSummary[];
  reparsing?: boolean;
  onReparse?: () => void;
}

export default function SongList({ songs, reparsing = false, onReparse }: Props) {
  if (songs.length === 0) {
    return <p className="text-gray-400 text-sm">No songs yet.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {songs.map(song => (
        <SongCard key={song.id} song={song} reparsing={reparsing} onReparse={onReparse} />
      ))}
    </div>
  );
}
