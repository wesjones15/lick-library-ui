import { useNavigate } from 'react-router-dom';
import ChordUploadForm from './ChordUploadForm';

export default function ChordUploadPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Chord Voicing</h1>
      <ChordUploadForm onSuccess={() => navigate('/chords')} />
    </div>
  );
}
