import { useState } from 'react';

export type InstrumentName =
  | 'GUITAR' | 'DROP_D' | 'OPEN_G' | 'OPEN_D' | 'DADGAD' | 'EB'
  | 'BASS' | 'UKULELE' | 'MANDOLIN' | 'BANJO' | 'CUSTOM';

const LS_INSTRUMENT    = 'lick_instrument';
const LS_CUSTOM_TUNING = 'lick_custom_tuning';

export function useInstrument() {
  const [instrument, setInst] = useState<InstrumentName>(
    () => (localStorage.getItem(LS_INSTRUMENT) as InstrumentName) ?? 'GUITAR'
  );
  const [customTuning, setCt] = useState<string>(
    () => localStorage.getItem(LS_CUSTOM_TUNING) ?? ''
  );

  const setInstrument = (v: InstrumentName) => {
    localStorage.setItem(LS_INSTRUMENT, v);
    setInst(v);
  };
  const setCustomTuning = (v: string) => {
    localStorage.setItem(LS_CUSTOM_TUNING, v);
    setCt(v);
  };

  return { instrument, customTuning, setInstrument, setCustomTuning };
}
