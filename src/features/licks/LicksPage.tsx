import { Link } from 'react-router-dom';
import LickUploadForm from './LickUploadForm';

const navBtnClass = 'px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors border-gray-300 text-gray-700 hover:bg-gray-50';

export default function LicksPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Licks</h1>

      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Upload a Lick
        </h2>
        <LickUploadForm onSuccess={() => {}} />
      </section>

      <div className="flex gap-3">
        <Link to="/licks/library" className={navBtnClass}>
          Lick Library
        </Link>
        <Link to="/lick/visualizer" className={navBtnClass}>
          Lick Visualizer
        </Link>
        <Link to="/lick/visualizer?mode=build" className={navBtnClass}>
          Lick Builder
        </Link>
      </div>
    </div>
  );
}
