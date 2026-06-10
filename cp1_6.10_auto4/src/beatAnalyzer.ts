export interface BeatAnalysisResult {
  beatTimes: number[];
  bpm: number;
}

export class BeatAnalyzer {
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  generateSyntheticBeatTrack(bpm: number, duration: number): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(2, totalSamples, sampleRate);
    const beatInterval = 60 / bpm;

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < totalSamples; i++) {
        channelData[i] = 0;
      }
    }

    let beatTime = 0;
    let beatIndex = 0;
    while (beatTime < duration) {
      const isDownbeat = beatIndex % 4 === 0;
      this.writeKick(buffer, beatTime, isDownbeat ? 0.8 : 0.5);
      if (beatIndex % 2 === 1) {
        this.writeSnare(buffer, beatTime + beatInterval / 2, 0.4);
      }
      this.writeHihat(buffer, beatTime + beatInterval / 4, 0.15);
      this.writeHihat(buffer, beatTime + (beatInterval * 3) / 4, 0.15);

      beatIndex++;
      beatTime += beatInterval;
    }

    return buffer;
  }

  private writeKick(buffer: AudioBuffer, time: number, amplitude: number): void {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(time * sampleRate);
    const duration = 0.15;
    const endSample = Math.min(startSample + Math.floor(duration * sampleRate), buffer.length);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate;
        const freq = 150 * Math.exp(-t * 25) + 40;
        const env = Math.exp(-t * 12);
        data[i] += Math.sin(2 * Math.PI * freq * t) * env * amplitude;
      }
    }
  }

  private writeSnare(buffer: AudioBuffer, time: number, amplitude: number): void {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(time * sampleRate);
    const duration = 0.12;
    const endSample = Math.min(startSample + Math.floor(duration * sampleRate), buffer.length);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate;
        const noise = Math.random() * 2 - 1;
        const tone = Math.sin(2 * Math.PI * 200 * t);
        const env = Math.exp(-t * 20);
        data[i] += (noise * 0.7 + tone * 0.3) * env * amplitude;
      }
    }
  }

  private writeHihat(buffer: AudioBuffer, time: number, amplitude: number): void {
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(time * sampleRate);
    const duration = 0.05;
    const endSample = Math.min(startSample + Math.floor(duration * sampleRate), buffer.length);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate;
        const noise = Math.random() * 2 - 1;
        const env = Math.exp(-t * 60);
        data[i] += noise * env * amplitude;
      }
    }
  }

  async analyze(audioBuffer: AudioBuffer): Promise<BeatAnalysisResult> {
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const windowSize = Math.floor(sampleRate * 0.05);
    const hopSize = Math.floor(windowSize / 2);

    const energies: number[] = [];
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += channelData[i + j] * channelData[i + j];
      }
      energies.push(energy / windowSize);
    }

    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const threshold = avgEnergy * 1.3;

    const beatFrames: number[] = [];
    let lastBeatFrame = -Infinity;
    const minFrameGap = Math.floor((60 / 200) * sampleRate / hopSize);

    for (let i = 1; i < energies.length - 1; i++) {
      if (
        energies[i] > threshold &&
        energies[i] > energies[i - 1] &&
        energies[i] > energies[i + 1] &&
        i - lastBeatFrame > minFrameGap
      ) {
        beatFrames.push(i);
        lastBeatFrame = i;
      }
    }

    const beatTimes = beatFrames.map((f) => (f * hopSize) / sampleRate);

    let bpm = 120;
    if (beatTimes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < beatTimes.length; i++) {
        intervals.push(beatTimes[i] - beatTimes[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      bpm = Math.round(60 / medianInterval);
      if (bpm < 60) bpm *= 2;
      if (bpm > 200) bpm = Math.round(bpm / 2);
    }

    return { beatTimes, bpm };
  }
}
