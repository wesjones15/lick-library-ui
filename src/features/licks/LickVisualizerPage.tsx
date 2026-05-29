import { useSearchParams } from 'react-router-dom';
import LickVisualizerPanel from './LickVisualizerPanel';
import LickBuilderPanel from './LickBuilderPanel';
import LickSubNav from './LickSubNav';

export default function LickVisualizerPage() {
  const [searchParams] = useSearchParams();
  const isBuilder = searchParams.get('mode') === 'build';
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <LickSubNav active={isBuilder ? 'builder' : 'visualizer'} />
      {isBuilder ? <LickBuilderPanel /> : <LickVisualizerPanel />}
    </div>
  );
}
