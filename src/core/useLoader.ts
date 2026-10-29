import { useState, useEffect } from 'react';

export type LoadState = 'loading' | 'ready' | 'error';

// Runs `load(isCancelled)` on mount and whenever `deps` change; `load` fetches and sets page state,
// skipping the set if isCancelled() is true. `deps` must be plain values (ids, keys).
// `state` follows the latest load; `firstLoad` stays 'ready' once anything has loaded, for overlays
// that should only cover the initial load.
export function useLoader(load: (isCancelled: () => boolean) => Promise<unknown>, deps: unknown[]) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; ok: boolean } | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const key = JSON.stringify([...deps, attempt]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => load(() => cancelled))
      .then(
        () => { if (!cancelled) { setResult({ key, ok: true }); setLoadedOnce(true); } },
        () => { if (!cancelled) setResult({ key, ok: false }); },
      );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const state: LoadState = result?.key !== key ? 'loading' : result.ok ? 'ready' : 'error';
  return {
    state,
    firstLoad: loadedOnce ? 'ready' as LoadState : state,
    retry: () => setAttempt(n => n + 1),
  };
}
