import AudioWorker from './audio.worker?worker';
import type { AudioData } from './types';

export class AudioInputManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private worker: Worker | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Float32Array | null = null;
  private onDataCallback: ((data: AudioData) => void) | null = null;
  private initialized = false;

  set onData(callback: (data: AudioData) => void) {
    this.onDataCallback = callback;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyser);

      this.dataArray = new Float32Array(this.analyser.frequencyBinCount);

      this.worker = new AudioWorker();
      this.worker.onmessage = (e: MessageEvent<AudioData>) => {
        if (this.onDataCallback) {
          this.onDataCallback(e.data);
        }
      };

      this.initialized = true;
      this.startAnalysis();
    } catch (error) {
      console.error('Failed to initialize audio input:', error);
      throw error;
    }
  }

  private startAnalysis(): void {
    if (!this.analyser || !this.dataArray || !this.worker) return;

    const analyze = () => {
      if (!this.analyser || !this.dataArray || !this.worker) return;

      this.analyser.getFloatTimeDomainData(this.dataArray);
      this.worker.postMessage({
        timeDomainData: this.dataArray.buffer,
        sampleRate: this.audioContext?.sampleRate || 44100,
      }, [this.dataArray.buffer]);

      this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
      requestAnimationFrame(analyze);
    };

    analyze();
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.initialized = false;
  }
}
