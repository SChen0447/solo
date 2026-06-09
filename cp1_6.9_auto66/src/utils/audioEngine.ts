import { MelodyParams, Note } from '../types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.3;
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (_e) {
        // ignore
      }
      this.currentSource.disconnect();
      this.currentSource = null;
    }
  }

  public playMelody(melodyParams: MelodyParams): void {
    this.ensureContext();
    if (!this.audioContext || !this.gainNode) return;

    this.stop();

    const { type, notes, totalDuration } = melodyParams;
    const sampleRate = this.audioContext.sampleRate;
    const totalSamples = Math.floor(sampleRate * totalDuration);
    const buffer = this.audioContext.createBuffer(1, totalSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    notes.forEach((note: Note) => {
      const startSample = Math.floor(note.startTime * sampleRate);
      const noteSamples = Math.floor(note.duration * sampleRate);
      const endSample = Math.min(startSample + noteSamples, totalSamples);

      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate;
        const progress = (i - startSample) / noteSamples;
        const envelope = this.getEnvelope(progress);
        let sample = 0;

        if (type === 'sine') {
          sample = Math.sin(2 * Math.PI * note.frequency * t);
        } else {
          sample = Math.sign(Math.sin(2 * Math.PI * note.frequency * t));
        }

        channelData[i] += sample * envelope * 0.5;
      }
    });

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);
    source.start();
    this.currentSource = source;
  }

  private getEnvelope(progress: number): number {
    const attack = 0.05;
    const release = 0.1;
    if (progress < attack) {
      return progress / attack;
    } else if (progress > 1 - release) {
      return (1 - progress) / release;
    }
    return 1;
  }

  public generatePresetMelodies(): MelodyParams[] {
    return [
      {
        type: 'square',
        totalDuration: 3,
        notes: [
          { frequency: 523.25, duration: 0.3, startTime: 0 },
          { frequency: 659.25, duration: 0.3, startTime: 0.3 },
          { frequency: 783.99, duration: 0.3, startTime: 0.6 },
          { frequency: 1046.5, duration: 0.6, startTime: 0.9 },
          { frequency: 783.99, duration: 0.3, startTime: 1.5 },
          { frequency: 659.25, duration: 0.3, startTime: 1.8 },
          { frequency: 523.25, duration: 0.6, startTime: 2.1 },
          { frequency: 0, duration: 0.3, startTime: 2.7 }
        ]
      },
      {
        type: 'sine',
        totalDuration: 2.5,
        notes: [
          { frequency: 440, duration: 0.25, startTime: 0 },
          { frequency: 493.88, duration: 0.25, startTime: 0.25 },
          { frequency: 523.25, duration: 0.25, startTime: 0.5 },
          { frequency: 587.33, duration: 0.25, startTime: 0.75 },
          { frequency: 659.25, duration: 0.5, startTime: 1.0 },
          { frequency: 587.33, duration: 0.25, startTime: 1.5 },
          { frequency: 523.25, duration: 0.25, startTime: 1.75 },
          { frequency: 493.88, duration: 0.5, startTime: 2.0 }
        ]
      },
      {
        type: 'square',
        totalDuration: 4,
        notes: [
          { frequency: 261.63, duration: 0.4, startTime: 0 },
          { frequency: 329.63, duration: 0.4, startTime: 0.4 },
          { frequency: 392, duration: 0.4, startTime: 0.8 },
          { frequency: 523.25, duration: 0.4, startTime: 1.2 },
          { frequency: 392, duration: 0.4, startTime: 1.6 },
          { frequency: 329.63, duration: 0.4, startTime: 2.0 },
          { frequency: 440, duration: 0.4, startTime: 2.4 },
          { frequency: 493.88, duration: 0.4, startTime: 2.8 },
          { frequency: 523.25, duration: 0.8, startTime: 3.2 }
        ]
      },
      {
        type: 'sine',
        totalDuration: 3.5,
        notes: [
          { frequency: 349.23, duration: 0.35, startTime: 0 },
          { frequency: 440, duration: 0.35, startTime: 0.35 },
          { frequency: 523.25, duration: 0.35, startTime: 0.7 },
          { frequency: 698.46, duration: 0.7, startTime: 1.05 },
          { frequency: 523.25, duration: 0.35, startTime: 1.75 },
          { frequency: 440, duration: 0.35, startTime: 2.1 },
          { frequency: 349.23, duration: 0.35, startTime: 2.45 },
          { frequency: 293.66, duration: 0.7, startTime: 2.8 }
        ]
      },
      {
        type: 'square',
        totalDuration: 2,
        notes: [
          { frequency: 659.25, duration: 0.2, startTime: 0 },
          { frequency: 659.25, duration: 0.2, startTime: 0.2 },
          { frequency: 783.99, duration: 0.4, startTime: 0.4 },
          { frequency: 659.25, duration: 0.2, startTime: 0.8 },
          { frequency: 659.25, duration: 0.2, startTime: 1.0 },
          { frequency: 880, duration: 0.4, startTime: 1.2 },
          { frequency: 783.99, duration: 0.4, startTime: 1.6 }
        ]
      }
    ];
  }
}

export const audioEngine = new AudioEngine();
