import ChordsProgressionPanel from '../theory/ChordsProgressionPanel';
import { C_GRAY_TEXT_900 } from '../../core/colors';

export default function ChordsTheoryPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className={`text-2xl font-bold ${C_GRAY_TEXT_900} mb-6`}>Chord Theory</h1>
      <ChordsProgressionPanel />
    </div>
  );
}
