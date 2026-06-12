const self = globalThis as unknown as Worker;

function calculateVolume(timeDomainData: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    sum += timeDomainData[i] * timeDomainData[i];
  }
  const rms = Math.sqrt(sum / timeDomainData.length);
  return Math.min(1, Math.max(0, rms * 3));
}

function autocorrelation(signal: Float32Array): number {
  const SIZE = signal.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += signal[i] * signal[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1, thresh = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(signal[i]) < thresh) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(signal[SIZE - i]) < thresh) { r2 = SIZE - i; break; }
  }

  const trim = signal.slice(r1, r2);
  const c = new Float32Array(trim.length);
  for (let i = 0; i < trim.length; i++) {
    for (let j = 0; j < trim.length - i; j++) {
      c[i] += trim[j] * trim[j + i];
    }
  }

  let d = 0;
  while (d < c.length - 1 && c[d] > c[d + 1]) d++;

  let maxval = -1, maxpos = -1;
  for (let i = d; i < c.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;

  if (T0 === 0 || T0 >= c.length - 1) return -1;

  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) {
    T0 = T0 - b / (2 * a);
  }

  return T0;
}

function calculateFrequency(timeDomainData: Float32Array, sampleRate: number): number {
  const period = autocorrelation(timeDomainData);
  if (period === -1) return 0;
  return sampleRate / period;
}

function clampFrequency(freq: number): number {
  if (freq === 0) return 0;
  return Math.max(20, Math.min(2000, freq));
}

self.onmessage = (e: MessageEvent) => {
  const { timeDomainData: dataBuffer, sampleRate } = e.data;
  const timeDomainData = new Float32Array(dataBuffer);

  const volume = calculateVolume(timeDomainData);
  const rawFreq = calculateFrequency(timeDomainData, sampleRate);
  const frequency = clampFrequency(rawFreq);

  self.postMessage({ volume, frequency });
};

export {};
