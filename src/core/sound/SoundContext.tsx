import { createContext, useContext, useState, useRef, useCallback } from 'react';
import type * as ToneType from 'tone';

interface SoundContextValue {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  playMidi: (notes: number[], staggerMs?: number) => void;
  preload: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const synthRef = useRef<ToneType.PolySynth | null>(null);

  const preload = useCallback(() => {
    import('tone').then(async Tone => {
      await Tone.start();
      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 8,
          oscillator: { type: 'triangle' } as ToneType.OmniOscillatorOptions,
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.8 },
        }).toDestination();
      }
    }).catch(() => {});
  }, []);

  const playMidi = useCallback(async (notes: number[], staggerMs = 0) => {
    if (!soundEnabled || notes.length === 0) return;

    const Tone = await import('tone');
    await Tone.start();

    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        oscillator: { type: 'triangle' } as ToneType.OmniOscillatorOptions,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.8 },
      }).toDestination();
    }

    const synth = synthRef.current;
    const now = Tone.now();
    notes.forEach((midi, i) => {
      const noteTime = now + (i * staggerMs) / 1000;
      const noteName = Tone.Frequency(midi, 'midi').toNote();
      synth.triggerAttackRelease(noteName, '8n', noteTime);
    });
  }, [soundEnabled]);

  return (
    <SoundContext.Provider value={{ soundEnabled, setSoundEnabled, playMidi, preload }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSoundContext must be used inside SoundProvider');
  return ctx;
}
