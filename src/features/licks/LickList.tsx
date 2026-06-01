import type { LickSummary } from '../../core/api/client';
import LickCard from './LickCard';
import { C_GRAY_TEXT_400 } from '../../core/colors';

interface Props {
  licks: LickSummary[];
  onDelete: (id: string) => void;
  onFork: (id: string) => void;
  isManaging: boolean;
}

export default function LickList({ licks, onDelete, onFork, isManaging }: Props) {
  if (licks.length === 0) {
    return <p className={`${C_GRAY_TEXT_400} text-sm`}>No licks yet. Upload one above.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {licks.map(lick => (
        <LickCard key={lick.id} lick={lick} onDelete={() => onDelete(lick.id)} onFork={() => onFork(lick.id)} isManaging={isManaging} />
      ))}
    </div>
  );
}
