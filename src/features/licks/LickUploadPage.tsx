import LickSubNav from './LickSubNav';
import LickUploadForm from './LickUploadForm';

export default function LickUploadPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <LickSubNav active="legacy" />
      <LickUploadForm onSuccess={() => {}} />
    </div>
  );
}
