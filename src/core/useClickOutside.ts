import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  close: () => void
) {
  useEffect(() => {
    if (!isOpen) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isOpen]);
}
