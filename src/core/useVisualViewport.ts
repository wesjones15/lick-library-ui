import { useState, useEffect } from 'react';

// The part of the screen actually visible: on phones it shrinks when the on-screen keyboard opens,
// while fixed elements still span the full layout height behind the keyboard.
export function useVisualViewport() {
  const read = () => ({
    top: window.visualViewport?.offsetTop ?? 0,
    height: window.visualViewport?.height ?? window.innerHeight,
  });
  const [box, setBox] = useState(read);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox(read());
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return box;
}
