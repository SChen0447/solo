export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentNoteIndex: number = 0;
  private bpm: number = 90;
  private noteQueue: { frequency: number; time: number; duration: number }[] = [];
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private schedulerTimer: number | null = null;

  private readonly noteFrequencies: number[] = [];

  constructor() {
    const baseFreq = 261.63;
    for (let i = 0; i < 12; i++) {
      this.noteFrequencies.push(baseFreq * Math.pow(2, i / 12));
    }
  }

  private initContext(): void {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);
  }

  public resume(): void {
    this.initContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playNextNote(): number {
    this.initContext();
    const frequency = this.noteFrequencies[this.currentNoteIndex];
    this.currentNoteIndex = (this.currentNoteIndex + 1) % 12;
    this.playNote(frequency);
    return frequency;
  }

  private playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const duration = 0.8;

    const osc1 = this.audioContext.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    const osc2 = this.audioContext.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = frequency * 2;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const gainNode2 = this.audioContext.createGain();
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode2);
    gainNode.connect(this.masterGain);
    gainNode2.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  public setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  public getBPM(): number {
    return this.bpm;
  }

  public getBeatInterval(): number {
    return 60 / this.bpm;
  }

  public startRhythm(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextNoteTime = this.audioContext?.currentTime || 0;
    this.scheduler();
  }

  public stopRhythm(): void {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;

    const scheduleAheadTime = 0.1;
    while (this.nextNoteTime < this.audioContext.currentTime + scheduleAheadTime) {
      this.scheduleNote(this.nextNoteTime);
      this.nextNoteTime += this.getBeatInterval();
    }

    this.schedulerTimer = window.setTimeout(() => this.scheduler(), 25);
  }

  private scheduleNote(time: number): void {
    if (this.noteQueue.length > 0) {
      const note = this.noteQueue.shift()!;
      if (this.audioContext && this.masterGain) {
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = note.frequency;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.3, time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.duration);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + note.duration);
      }
    }
  }

  public queueNote(frequency: number, duration: number = 0.5): void {
    this.noteQueue.push({ frequency, time: 0, duration });
  }

  public getCurrentNoteIndex(): number {
    return this.currentNoteIndex;
  }

  public getNoteFrequency(index: number): number {
    return this.noteFrequencies[index % 12];
  }
}
