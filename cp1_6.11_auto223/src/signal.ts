export interface SignalParams {
  frequency: number;
  gain: number;
  signalStrength: number;
  snr: number;
}

export interface WaveformData {
  samples: Float32Array;
  timeWindow: number;
  sampleRate: number;
  hasPulse: boolean;
  pulseIntensity: number;
}

export interface SpectrumData {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  peakFreq: number;
  peakMag: number;
}

export interface DecodeResult {
  isTechSignal: boolean;
  binarySequence: string;
  carrierFreq: number;
}

const PULSAR_PERIOD = 1.337;
const PULSE_WIDTH = 0.02;
const SAMPLE_RATE = 44100;
const TIME_WINDOW = 2;

export class SignalProcessor {
  private params: SignalParams;
  private time: number = 0;
  private waveformSamples: Float32Array;
  private lastPulseTime: number = -999;
  private noiseBuffer: Float32Array;
  private noisePhase: number = 0;

  constructor() {
    this.params = {
      frequency: 1.42,
      gain: 50,
      signalStrength: 0.3,
      snr: 15
    };
    this.waveformSamples = new Float32Array(Math.floor(SAMPLE_RATE * TIME_WINDOW));
    this.noiseBuffer = this.generateNoiseBuffer();
  }

  private generateNoiseBuffer(): Float32Array {
    const size = SAMPLE_RATE * 2;
    const buffer = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        sum += (Math.random() * 2 - 1) * 0.25;
      }
      buffer[i] = sum;
    }
    return buffer;
  }

  setFrequency(freq: number): void {
    this.params.frequency = Math.max(0.1, Math.min(10, freq));
  }

  setGain(gain: number): void {
    this.params.gain = Math.max(0, Math.min(100, gain));
  }

  setSignalStrength(strength: number): void {
    this.params.signalStrength = Math.max(0, Math.min(1, strength));
  }

  setSNR(snr: number): void {
    this.params.snr = Math.max(0, Math.min(50, snr));
  }

  getParams(): SignalParams {
    return { ...this.params };
  }

  update(deltaTime: number): WaveformData {
    this.time += deltaTime;

    const numSamples = Math.floor(SAMPLE_RATE * TIME_WINDOW);
    const gainLinear = Math.pow(10, this.params.gain / 20);
    const signalAmp = this.params.signalStrength * 0.8;
    const noiseAmp = 1 / Math.pow(10, this.params.snr / 20);

    const currentPhase = this.noisePhase;

    for (let i = 0; i < numSamples; i++) {
      const t = this.time + i / SAMPLE_RATE - TIME_WINDOW;

      const noiseIdx = Math.floor((currentPhase + i / SAMPLE_RATE * 50) * SAMPLE_RATE) % this.noiseBuffer.length;
      const noise = this.noiseBuffer[Math.abs(noiseIdx)] * noiseAmp;

      const carrierFreq = this.params.frequency * 1e9;
      const normalizedFreq = (this.params.frequency - 0.1) / 9.9;
      const waveFreq = 2 + normalizedFreq * 8;
      const carrier = Math.sin(2 * Math.PI * waveFreq * t) * signalAmp * 0.3;

      const harmonic1 = Math.sin(2 * Math.PI * waveFreq * 2 * t + 0.5) * signalAmp * 0.15;
      const harmonic2 = Math.sin(2 * Math.PI * waveFreq * 3.5 * t + 1.2) * signalAmp * 0.1;

      const pulsePhase = (t % PULSAR_PERIOD) / PULSAR_PERIOD;
      const pulseCenter = 0.3;
      const pulseWidth = PULSE_WIDTH / PULSAR_PERIOD;
      const pulseDist = Math.abs(pulsePhase - pulseCenter);
      const pulseEnvelope = Math.exp(-0.5 * Math.pow(pulseDist / pulseWidth, 2));
      const pulse = pulseEnvelope * signalAmp * 2.5;

      const drift = Math.sin(t * 0.1) * 0.05 * signalAmp;

      let sample = noise + carrier + harmonic1 + harmonic2 + pulse * 0.6 + drift;

      const scintillation = 0.8 + 0.2 * Math.sin(t * 0.3 + Math.sin(t * 0.07));
      sample *= scintillation;

      sample *= gainLinear;

      const maxVal = 3;
      sample = Math.max(-maxVal, Math.min(maxVal, sample));

      this.waveformSamples[i] = sample;
    }

    this.noisePhase = (currentPhase + deltaTime * 50) % (this.noiseBuffer.length / SAMPLE_RATE);

    const pulseTime = this.time % PULSAR_PERIOD;
    const pulseIntensity = Math.exp(-0.5 * Math.pow((pulseTime - PULSAR_PERIOD * 0.3) / (PULSE_WIDTH), 2));
    const hasPulse = pulseIntensity > 0.3 && this.params.signalStrength > 0.2;

    return {
      samples: this.waveformSamples,
      timeWindow: TIME_WINDOW,
      sampleRate: SAMPLE_RATE,
      hasPulse,
      pulseIntensity
    };
  }

  computeFFT(waveform: WaveformData): SpectrumData {
    const fftSize = 1024;
    const numBins = fftSize / 2;
    const magnitudes = new Float32Array(numBins);
    const frequencies = new Float32Array(numBins);

    const freqMax = 10;
    const freqMin = 0;
    const centerFreq = this.params.frequency;

    for (let i = 0; i < numBins; i++) {
      const freqNorm = i / numBins;
      const freq = freqMin + freqNorm * (freqMax - freqMin);
      frequencies[i] = freq;

      const distFromCenter = Math.abs(freq - centerFreq);
      const bandwidth = 0.5 + this.params.gain * 0.02;
      const signalEnvelope = Math.exp(-0.5 * Math.pow(distFromCenter / bandwidth, 2));

      const noiseFloor = -30 + Math.random() * 5;

      let signalMag = -10 + this.params.gain * 0.3 + this.params.signalStrength * 20;
      signalMag *= signalEnvelope;

      const harmonicPeaks = [0.5, 1.5, 2.5].map((mult, idx) => {
        const harmFreq = centerFreq * (1 + mult * 0.1);
        const harmDist = Math.abs(freq - harmFreq);
        const harmWidth = 0.08;
        const harmEnv = Math.exp(-0.5 * Math.pow(harmDist / harmWidth, 2));
        return harmEnv * (15 - idx * 4) * this.params.signalStrength;
      });

      const pulseTime = this.time % PULSAR_PERIOD;
      const pulseMag = Math.exp(-0.5 * Math.pow((pulseTime - PULSAR_PERIOD * 0.3) / (PULSE_WIDTH * 2), 2));
      const pulseContrib = pulseMag * 8 * this.params.signalStrength;

      let mag = noiseFloor + signalMag + harmonicPeaks.reduce((a, b) => a + b, 0) + pulseContrib * 0.3;

      mag += (Math.random() - 0.5) * 3;

      magnitudes[i] = Math.max(-40, Math.min(20, mag));
    }

    let peakMag = -Infinity;
    let peakFreq = 0;
    for (let i = 0; i < numBins; i++) {
      if (magnitudes[i] > peakMag) {
        peakMag = magnitudes[i];
        peakFreq = frequencies[i];
      }
    }

    return {
      frequencies,
      magnitudes,
      peakFreq,
      peakMag
    };
  }

  smartDecode(spectrum: SpectrumData): DecodeResult {
    const { frequencies, magnitudes } = spectrum;
    const numBins = frequencies.length;

    let peakCount = 0;
    const peakIndices: number[] = [];
    const threshold = -5 + this.params.signalStrength * 15;

    for (let i = 2; i < numBins - 2; i++) {
      if (magnitudes[i] > threshold &&
          magnitudes[i] > magnitudes[i - 1] &&
          magnitudes[i] > magnitudes[i + 1] &&
          magnitudes[i] > magnitudes[i - 2] &&
          magnitudes[i] > magnitudes[i + 2]) {
        peakCount++;
        peakIndices.push(i);
      }
    }

    let isTechSignal = false;
    let carrierFreq = this.params.frequency;

    if (peakCount >= 2 && peakIndices.length >= 2) {
      const spacings: number[] = [];
      for (let i = 1; i < peakIndices.length; i++) {
        spacings.push(frequencies[peakIndices[i]] - frequencies[peakIndices[i - 1]]);
      }

      if (spacings.length > 0) {
        const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
        const variance = spacings.reduce((a, b) => a + Math.pow(b - avgSpacing, 2), 0) / spacings.length;

        if (variance < 0.05 * avgSpacing && peakCount >= 2) {
          isTechSignal = true;
          carrierFreq = frequencies[peakIndices[Math.floor(peakIndices.length / 2)]];
        }
      }
    }

    if (!isTechSignal && this.params.signalStrength > 0.5 && this.params.frequency > 1 && this.params.frequency < 2) {
      isTechSignal = true;
      carrierFreq = spectrum.peakFreq;
    }

    let binarySequence = '';
    if (isTechSignal) {
      const length = 24 + Math.floor(Math.random() * 16);
      const seed = Math.floor(this.params.frequency * 1000 + this.params.gain * 10);
      for (let i = 0; i < length; i++) {
        const pseudo = Math.sin(seed * (i + 1) * 0.7) * 10000;
        binarySequence += (pseudo - Math.floor(pseudo) > 0.5) ? '1' : '0';
      }
    }

    return {
      isTechSignal,
      binarySequence,
      carrierFreq
    };
  }

  getPulsarPeriod(): number {
    return PULSAR_PERIOD;
  }
}
