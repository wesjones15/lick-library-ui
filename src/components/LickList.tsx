import type { LickSummary } from '../api/client';
import LickCard from './LickCard';

interface Props {
  licks: LickSummary[];
}

export default function LickList({ licks }: Props) {
  if (licks.length === 0) {
    return <p className="text-gray-400 text-sm">No licks yet. Upload one above.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {licks.map(lick => (
        <LickCard key={lick.id} lick={lick} />
      ))}
    </div>
  );
}
