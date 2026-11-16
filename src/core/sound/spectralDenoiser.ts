import FFT from 'fft.js';

// Removes steady background noise (a fan, an air conditioner, mains hum, mic hiss) from
// each analysis frame by spectral subtraction: it learns the noise's power at every
// frequency while nothing is being played, then subtracts that from each frame. A steady
// noise is the same from frame to frame; a plucked note is not, so it survives.
//
// It also reports how much sound stands above the learned noise, which is what note
// detection uses instead of raw loudness.

const MIN_HZ = 65;           // below low E
const MAX_HZ = 5000;         // enough harmonics for pitch detection
const OVERSUBTRACT = 2;      // subtract twice the learned noise to clear its frame-to-frame jitter
const GAIN_FLOOR = 0.1;      // never silence a bin completely (avoids "musical noise")
const RATIO_CAP = 50;        // one loud bin can't stand in for a note
// New-sound measure: compare each frequency now with its strongest level 100–300 ms ago.
// The analysis window is ~85 ms, so frames from 100 ms back can't contain a note that
// is starting now.
const FLUX_LAG_MS = 100;
const FLUX_SPAN_MS = 300;

export interface DenoisedFrame {
  clean: Float32Array;       // the frame with the noise removed (Hann-windowed)
  // How far this frame stands above the learned noise: the average over frequencies of
  // (power / noise − OVERSUBTRACT), floored at 0. Every frequency counts equally, so the
  // loudest few frequencies of a fan can't swing it; pure background reads about 0.14
  // (e^−2), a plucked note lifts dozens of harmonic frequencies far above it.
  excess: number;
  cleanRms: number;          // RMS of the cleaned frame, in input units
  // How much new sound appeared: the average over frequencies of how far each rose above
  // its level 100–300 ms ago (in log terms). A new note brings harmonics that weren't
  // sounding; a held note's volume wobble or vibrato, or a fan, brings almost none.
  flux: number;
}

export class SpectralDenoiser {
  private readonly n: number;
  private readonly fft: FFT;
  private readonly window: Float32Array;
  private readonly windowPower: number;
  private readonly lo: number;
  private readonly hi: number;
  private readonly noise: Float64Array;     // learned noise power per bin
  private readonly power: Float64Array;
  private readonly spectrum: number[];
  private readonly timeOut: number[];
  private readonly windowed: Float32Array;
  private readonly clean: Float32Array;
  private primed = false;
  private readonly history: { t: number; levels: Float32Array }[] = [];
  private readonly levels: Float32Array;

  constructor(size: number, sampleRate: number) {
    this.n = size;
    this.fft = new FFT(size);
    this.window = new Float32Array(size);
    let wp = 0;
    for (let i = 0; i < size; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
      wp += this.window[i] * this.window[i];
    }
    this.windowPower = wp / size;
    this.lo = Math.max(1, Math.floor((MIN_HZ * size) / sampleRate));
    this.hi = Math.min(size / 2, Math.ceil((MAX_HZ * size) / sampleRate));
    this.noise = new Float64Array(size / 2 + 1);
    this.power = new Float64Array(size / 2 + 1);
    this.spectrum = this.fft.createComplexArray();
    this.timeOut = this.fft.createComplexArray();
    this.windowed = new Float32Array(size);
    this.clean = new Float32Array(size);
    this.levels = new Float32Array(size / 2 + 1);
  }

  // `riseRate` / `fallRate`: 0–1, how far each frequency's noise estimate moves toward this
  // frame when the frame is louder / quieter than it. `now` is in milliseconds.
  process(frame: Float32Array, riseRate: number, fallRate: number, now: number): DenoisedFrame {
    const { n, window, power, noise, spectrum, lo, hi, levels } = this;
    for (let i = 0; i < n; i++) this.windowed[i] = frame[i] * window[i];
    this.fft.realTransform(spectrum, this.windowed);
    this.fft.completeSpectrum(spectrum);

    let ratioSum = 0;
    let bins = 0;
    for (let k = 0; k <= n / 2; k++) {
      const re = spectrum[2 * k];
      const im = spectrum[2 * k + 1];
      power[k] = re * re + im * im;
    }
    if (!this.primed) { noise.set(power); this.primed = true; }

    for (let k = 0; k <= n / 2; k++) {
      const p = power[k];
      let g = 0;
      if (k >= lo && k <= hi) {
        const nk = noise[k];
        const r = nk > 0 ? Math.min(RATIO_CAP, Math.max(0, p / nk - OVERSUBTRACT)) : 0;
        if (nk > 0) { ratioSum += r; bins++; }
        levels[k] = Math.log1p(r);
        g = p > 0 ? Math.sqrt(Math.max(GAIN_FLOOR * GAIN_FLOOR, 1 - (OVERSUBTRACT * nk) / p)) : 0;
        noise[k] = nk + (p - nk) * (p < nk ? fallRate : riseRate);
      }
      // apply the same gain to the bin and its mirror image
      spectrum[2 * k] *= g; spectrum[2 * k + 1] *= g;
      if (k > 0 && k < n / 2) { spectrum[2 * (n - k)] *= g; spectrum[2 * (n - k) + 1] *= g; }
    }

    this.fft.inverseTransform(this.timeOut, spectrum);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = this.timeOut[2 * i];
      this.clean[i] = v;
      sum += v * v;
    }
    // New sound against the 100–300 ms reference
    const refs = this.history.filter(h => now - h.t >= FLUX_LAG_MS && now - h.t <= FLUX_SPAN_MS);
    let flux = 0;
    if (refs.length > 0) {
      for (let k = lo; k <= hi; k++) {
        let ref = 0;
        for (const h of refs) if (h.levels[k] > ref) ref = h.levels[k];
        if (levels[k] > ref) flux += levels[k] - ref;
      }
      flux /= hi - lo + 1;
    }
    // Keep this frame for later comparisons, reusing the oldest buffer
    while (this.history.length > 0 && now - this.history[0].t > FLUX_SPAN_MS) this.history.shift();
    const slot = this.history.length >= 64 ? this.history.shift()!.levels : new Float32Array(levels.length);
    slot.set(levels);
    this.history.push({ t: now, levels: slot });

    return {
      clean: this.clean,
      flux,
      excess: bins > 0 ? ratioSum / bins : 0,
      cleanRms: Math.sqrt(sum / n / this.windowPower),
    };
  }
}
