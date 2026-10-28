import type { LoadState } from '../useLoader';

// Grays out the screen below the nav and blocks input until the page's data is in.
// Input is blocked at once; the gray layer and spinner fade in after a moment so fast loads don't flash.
export default function LoadingOverlay({ state, onRetry }: { state: LoadState; onRetry?: () => void }) {
  if (state === 'ready') return null;
  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex items-center justify-center" aria-busy={state === 'loading'}>
      <div className="absolute inset-0 bg-gray-500/40 animate-[fade-in_200ms_ease-out_150ms_both]" />
      {state === 'error' ? (
        <button
          onClick={onRetry}
          className="relative px-4 py-3 rounded-xl bg-white border border-gray-400 text-sm text-gray-900 shadow"
        >
          Couldn't load — tap to retry
        </button>
      ) : (
        <div className="relative animate-[fade-in_200ms_ease-out_150ms_both]" role="status" aria-label="Loading">
          <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-gray-900 animate-spin" />
        </div>
      )}
    </div>
  );
}
