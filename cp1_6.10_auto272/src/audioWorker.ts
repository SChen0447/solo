const FFT_SIZE = 2048;
const SAMPLE_RATE = 44100;

class FFT {
  private size: number;
  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private reverseTable: Uint32Array;

  constructor(size: number) {
    this.size = size;
    this.cosTable = new Float32Array(size);
    this.sinTable = new Float32Array(size);
    this.reverseTable = new Uint32Array(size);

    for (let i = 0; i < size; i++) {
      this.cosTable[i] = Math.cos(-2 * Math.PI * i / size);
      this.sinTable[i] = Math.sin(-2 * Math.PI * i / size);
    }

    let bits = 0;
    while ((1 << bits) < size) bits++;
    for (let i = 0; i < size; i++) {
      let rev = 0;
      let val = i;
      for (let j = 0; j < bits; j++) {
        rev = (rev << 1) | (val & 1);
        val >>= 1;
      }
      this.reverseTable[i] = rev;
    }
  }

  forward(real: Float32Array, imag: Float32Array): void {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      const j = this.reverseTable[i];
      if (j > i) {
        let temp = real[i]; real[i] = real[j]; real[j] = temp;
        temp = imag[i]; imag[i] = imag[j]; imag[j] = temp;
      }
    }

    for (let size = 2; size <= n; size <<= 1) {
      const halfSize = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const idx = j * step;
          const cos = this.cosTable[idx];
          const sin = this.sinTable[idx];
          const tpre = real[i + j + halfSize] * cos - imag[i + j + halfSize] * sin;
          const tpim = real[i + j + halfSize] * sin + imag[i + j + halfSize] * cos;
          real[i + j + halfSize] = real[i + j] - tpre;
          imag[i + j + halfSize] = imag[i + j] - tpim;
          real[i + j] += tpre;
          imag[i + j] += tpim;
        }
      }
    }
  }
}

const fft = new FFT(FFT_SIZE);

function computeFFT(buffer: Float32Array): Float32Array {
  const real = new Float32Array(FFT_SIZE);
  const imag = new Float32Array(FFT_SIZE);

  for (let i = 0; i < FFT_SIZE; i++) {
    real[i] = i < buffer.length ? buffer[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1))) : 0;
    imag[i] = 0;
  }

  fft.forward(real, imag);

  const magnitude = new Float32Array(FFT_SIZE / 2);
  for (let i = 0; i < FFT_SIZE / 2; i++) {
    magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / FFT_SIZE;
  }
  return magnitude;
}

interface WorkerMessage {
  type: 'processChunk' | 'processFull';
  samples?: Float32Array;
  sampleRate?: number;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, samples, sampleRate } = e.data;

  if (!samples) return;

  if (type === 'processChunk') {
    const magnitude = computeFFT(samples);
    (self as unknown as Worker).postMessage({
      type: 'fftData',
      magnitude: magnitude.buffer,
      sampleRate: sampleRate || SAMPLE_RATE
    }, [magnitude.buffer]);
  } else if (type === 'processFull') {
    const allMagnitudes: Float32Array[] = [];
    const hopSize = FFT_SIZE / 4;

    for (let i = 0; i + FFT_SIZE <= samples.length; i += hopSize) {
      const chunk = samples.subarray(i, i + FFT_SIZE);
      allMagnitudes.push(computeFFT(chunk));
    }

    const combined = new Float32Array(allMagnitudes.length * (FFT_SIZE / 2));
    for (let i = 0; i < allMagnitudes.length; i++) {
      combined.set(allMagnitudes[i], i * (FFT_SIZE / 2));
    }

    (self as unknown as Worker).postMessage({
      type: 'fullFFTData',
      magnitudes: combined.buffer,
      frameCount: allMagnitudes.length,
      binCount: FFT_SIZE / 2,
      sampleRate: sampleRate || SAMPLE_RATE
    }, [combined.buffer]);
  }
};
