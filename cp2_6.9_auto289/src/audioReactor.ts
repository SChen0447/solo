export interface BeatEvent {
  time: number;
  anchorIndex: number;
  energy: number;
}

export class AudioReactor {
  private beatPattern: BeatEvent[] = [];
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private speedMultiplier: number = 1.0;
  private currentBeatIndex: number = 0;
  private lastFrameTime: number = 0;
  private listeners: Set<(anchorIndex: number, energy: number) => void> = new Set();
  private beatCount: number = 0;
  private totalBeats: number = 0;

  constructor() {
    this.generatePresetPattern();
  }

  private generatePresetPattern(): void {
    const bpm = 120;
    const beatInterval = 60 / bpm;
    const totalDuration = 30;
    const pattern: BeatEvent[] = [];
    const totalBeats = Math.floor(totalDuration / beatInterval);

    for (let i = 0; i < totalBeats; i++) {
      const time = i * beatInterval;
      const anchorIndex = i % 12;
      const energy = 0.5 + 0.5 * Math.abs(Math.sin(i * 0.7));
      pattern.push({ time, anchorIndex, energy });
    }

    this.beatPattern = pattern;
    this.totalBeats = totalBeats;
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, multiplier));
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  public start(): void {
    this.isPlaying = true;
    this.startTime = performance.now();
    this.currentBeatIndex = 0;
    this.beatCount = 0;
  }

  public stop(): void {
    this.isPlaying = false;
  }

  public reset(): void {
    this.currentBeatIndex = 0;
    this.beatCount = 0;
    this.startTime = performance.now();
  }

  public getBeatCount(): number {
    return this.beatCount;
  }

  public getTotalBeats(): number {
    return this.totalBeats;
  }

  public onBeat(callback: (anchorIndex: number, energy: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public update(currentTime: number): void {
    if (!this.isPlaying) return;

    const elapsed = (currentTime - this.startTime) / 1000 * this.speedMultiplier;

    while (
      this.currentBeatIndex < this.beatPattern.length &&
      this.beatPattern[this.currentBeatIndex].time <= elapsed
    ) {
      const event = this.beatPattern[this.currentBeatIndex];
      this.beatCount++;
      this.listeners.forEach((cb) => cb(event.anchorIndex, event.energy));
      this.currentBeatIndex++;
    }

    this.lastFrameTime = currentTime;
  }

  public generateReverbSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      const convolver = audioCtx.createConvolver();

      const rate = audioCtx.sampleRate;
      const length = rate * 2;
      const impulse = audioCtx.createBuffer(2, length, rate);
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
      }
      convolver.buffer = impulse;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);

      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      oscillator.connect(gainNode);
      gainNode.connect(convolver);

      const dryGain = audioCtx.createGain();
      const wetGain = audioCtx.createGain();
      dryGain.gain.value = 0.4;
      wetGain.gain.value = 0.6;

      gainNode.connect(dryGain);
      convolver.connect(wetGain);
      dryGain.connect(audioCtx.destination);
      wetGain.connect(audioCtx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.8);
    } catch (e) {
      console.warn('Web Audio API not available');
    }
  }
}
