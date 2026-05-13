import { useNavigate } from 'react-router-dom';
import SongUploadForm from '../components/SongUploadForm';

export default function SongUploadPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload a Song</h1>
      <SongUploadForm onSuccess={() => navigate('/songs')} />
    </div>
  );
}
