import { useSearchParams } from 'react-router-dom';
import LickVisualizerPanel from '../live/LickVisualizerPanel';
import LickSubNav from './LickSubNav';

export default function LickVisualizerPage() {
  const [searchParams] = useSearchParams();
  const active = searchParams.get('mode') === 'build' ? 'builder' : 'visualizer';
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <LickSubNav active={active} />
      <LickVisualizerPanel />
    </div>
  );
}
