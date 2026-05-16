import GuitarNeck, { type NeckDot } from './GuitarNeck';

const STRING_COUNT = 6;
const FRET_COUNT = 12;

function blankDots(): NeckDot[][] {
  return Array.from({ length: STRING_COUNT }, () =>
    Array.from({ length: FRET_COUNT + 1 }, () => ({ degree: null, active: false }))
  );
}

export default function LivePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Live</h1>
      <p className="text-gray-400 text-sm mb-8">
        Choose key and mode to see scale.
      </p>
      <GuitarNeck dots={blankDots()} fretCount={FRET_COUNT} />
    </div>
  );
}
