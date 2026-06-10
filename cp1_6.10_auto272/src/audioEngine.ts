import AudioWorker from './audioWorker?worker';

export interface FFTFrame {
  magnitude: Float32Array;
  timestamp: number;
}

export interface Marker {
  id: string;
  time: number;
  note: string;
  color: string;
}

type AudioEngineEvents = 'fftData' | 'recordingStarted' | 'recordingStopped' | 'audioLoaded';

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private worker: Worker;
  private isRecording = false;
  private eventListeners: Map<AudioEngineEvents, Set<Function>> = new Map();
  private recordedChunks: Blob[] = [];
  private fftFrames: FFTFrame[] = [];
  private animationFrameId: number | null = null;
  private startTime = 0;

  constructor() {
    this.worker = new AudioWorker();
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  private handleWorkerMessage(e: MessageEvent): void {
    const { type, magnitude, magnitudes, frameCount, binCount, sampleRate } = e.data;

    if (type === 'fftData' && magnitude) {
      const mag = new Float32Array(magnitude);
      const frame: FFTFrame = {
        magnitude: mag,
        timestamp: performance.now() - this.startTime
      };
      this.fftFrames.push(frame);
      this.emit('fftData', frame);
    } else if (type === 'fullFFTData' && magnitudes) {
      const mags = new Float32Array(magnitudes);
      this.fftFrames = [];
      for (let i = 0; i < frameCount; i++) {
        this.fftFrames.push({
          magnitude: mags.subarray(i * binCount, (i + 1) * binCount),
          timestamp: (i * 512 / sampleRate) * 1000
        });
      }
      this.emit('audioLoaded', this.fftFrames);
    }
  }

  on(event: AudioEngineEvents, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: AudioEngineEvents, callback: Function): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  private emit(event: AudioEngineEvents, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach(cb => cb(...args));
  }

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 44100 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async startRecording(): Promise<void> {
    await this.init();
    this.fftFrames = [];

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 44100,
        channelCount: 1
      }
    });

    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.sourceNode = this.audioContext!.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext!.createAnalyser();
    this.analyser.fftSize = 2048;
    this.sourceNode.connect(this.analyser);

    this.mediaRecorder.start();
    this.isRecording = true;
    this.startTime = performance.now();
    this.emit('recordingStarted');
    this.captureFFT();
  }

  private captureFFT(): void {
    if (!this.isRecording || !this.analyser || !this.audioContext) return;

    const buffer = new Float32Array(2048);
    this.analyser.getFloatTimeDomainData(buffer);

    const bufferCopy = new Float32Array(buffer);
    this.worker.postMessage({
      type: 'processChunk',
      samples: bufferCopy.buffer,
      sampleRate: this.audioContext.sampleRate
    }, [bufferCopy.buffer]);

    this.animationFrameId = requestAnimationFrame(() => this.captureFFT());
  }

  async stopRecording(): Promise<Blob | null> {
    this.isRecording = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      return new Promise((resolve) => {
        this.mediaRecorder!.onstop = async () => {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });

          this.mediaStream?.getTracks().forEach(t => t.stop());
          this.sourceNode?.disconnect();
          this.analyser?.disconnect();
          this.mediaStream = null;
          this.sourceNode = null;
          this.analyser = null;
          this.mediaRecorder = null;

          this.emit('recordingStopped', blob);
          resolve(blob);
        };
        this.mediaRecorder!.stop();
      });
    }

    return null;
  }

  async uploadAudio(file: File): Promise<void> {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('文件大小不能超过5MB');
    }
    if (!/\.wav$|\.mp3$/i.test(file.name)) {
      throw new Error('仅支持 .wav 和 .mp3 格式');
    }

    await this.init();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));

    const channelData = this.audioBuffer.getChannelData(0);
    const samples = new Float32Array(channelData);

    this.worker.postMessage({
      type: 'processFull',
      samples: samples.buffer,
      sampleRate: this.audioBuffer.sampleRate
    }, [samples.buffer]);
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  getFFTFrames(): FFTFrame[] {
    return this.fftFrames;
  }

  playSegment(startTime: number, duration: number = 2): void {
    if (!this.audioBuffer || !this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.audioContext.destination);

    const safeStart = Math.max(0, Math.min(startTime, this.audioBuffer.duration - duration));
    source.start(0, safeStart, duration);
  }

  reset(): void {
    this.isRecording = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.sourceNode?.disconnect();
    this.analyser?.disconnect();
    this.mediaStream = null;
    this.sourceNode = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioBuffer = null;
    this.fftFrames = [];
    this.recordedChunks = [];
  }

  getSampleCount(): number {
    if (!this.audioBuffer) return 0;
    return this.audioBuffer.length;
  }

  getDuration(): number {
    if (!this.audioBuffer) return 0;
    return this.audioBuffer.duration;
  }
}

export const audioEngine = new AudioEngine();
