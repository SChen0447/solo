const NOTE_FREQUENCIES: Record<string, number> = {
  'C4': 261.63,
  'D4': 293.66,
  'E4': 329.63,
  'F4': 349.23,
  'G4': 392.00,
  'A4': 440.00,
  'B4': 493.88,
  'C5': 523.25,
  'D5': 587.33,
  'E5': 659.25,
  'F5': 698.46,
  'G5': 783.99,
  'A5': 880.00,
  'B5': 987.77,
  'C6': 1046.50,
};

interface NoteEvent {
  note: string;
  time: number;
  duration: number;
  velocity: number;
  type: 'melody' | 'bass';
}

interface DrumEvent {
  type: 'kick' | 'snare' | 'hihat';
  time: number;
  velocity: number;
}

class SynthEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private melodyGain: GainNode | null = null;
  private drumGain: GainNode | null = null;
  private destinationStream: MediaStreamAudioDestinationNode | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private bpm: number = 120;
  private volume: number = 0.7;
  private masterVolume: number = 0.8;
  private animationFrameId: number | null = null;
  private scheduledEvents: Set<number> = new Set();
  private lastBeatTime: number = 0;
  private beatCallback: (() => void) | null = null;

  private melodyNotes: NoteEvent[] = [];
  private drumEvents: DrumEvent[] = [];
  private totalBars: number = 8;

  constructor() {
    this.generateScore();
  }

  private generateScore(): void {
    this.melodyNotes = [];
    this.drumEvents = [];

    const melodyPattern = [
      ['C5', 'E5', 'G5', 'C6'],
      ['B4', 'D5', 'G5', 'B5'],
      ['A4', 'C5', 'E5', 'A5'],
      ['G4', 'B4', 'D5', 'G5'],
      ['F4', 'A4', 'C5', 'F5'],
      ['E4', 'G4', 'C5', 'E5'],
      ['D4', 'F4', 'A4', 'D5'],
      ['C4', 'E4', 'G4', 'C5'],
    ];

    const bassPattern = [
      'C3', 'C3', 'G3', 'G3',
      'A3', 'A3', 'E3', 'E3',
      'F3', 'F3', 'C3', 'C3',
      'G3', 'G3', 'C3', 'C3',
    ];

    const beatsPerBar = 4;
    const totalBeats = this.totalBars * beatsPerBar;

    for (let bar = 0; bar < this.totalBars; bar++) {
      const barNotes = melodyPattern[bar % melodyPattern.length];
      for (let beat = 0; beat < beatsPerBar; beat++) {
        const time = (bar * beatsPerBar + beat) * (60 / this.bpm);
        const noteIndex = beat % barNotes.length;

        this.melodyNotes.push({
          note: barNotes[noteIndex],
          time,
          duration: (60 / this.bpm) * 0.9,
          velocity: 0.7,
          type: 'melody',
        });

        if (beat % 2 === 0) {
          this.melodyNotes.push({
            note: bassPattern[Math.floor((bar * beatsPerBar + beat) / 2) % bassPattern.length],
            time,
            duration: (60 / this.bpm) * 0.8,
            velocity: 0.5,
            type: 'bass',
          });
        }
      }
    }

    for (let beat = 0; beat < totalBeats; beat++) {
      const time = beat * (60 / this.bpm);

      if (beat % 4 === 0 || beat % 4 === 2) {
        this.drumEvents.push({
          type: 'kick',
          time,
          velocity: 0.9,
        });
      }

      if (beat % 4 === 1 || beat % 4 === 3) {
        this.drumEvents.push({
          type: 'snare',
          time,
          velocity: 0.7,
        });
      }

      for (let sub = 0; sub < 2; sub++) {
        this.drumEvents.push({
          type: 'hihat',
          time: time + sub * (60 / this.bpm) * 0.5,
          velocity: 0.3,
        });
      }
    }
  }

  public init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;

      this.melodyGain = this.audioContext.createGain();
      this.melodyGain.gain.value = this.volume;

      this.drumGain = this.audioContext.createGain();
      this.drumGain.gain.value = this.volume * 0.8;

      this.destinationStream = this.audioContext.createMediaStreamDestination();

      this.melodyGain.connect(this.masterGain);
      this.drumGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.connect(this.destinationStream);
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setBPM(bpm: number): void {
    this.bpm = bpm;
    this.generateScore();
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.melodyGain && this.drumGain) {
      this.melodyGain.gain.setTargetAtTime(this.volume, this.audioContext!.currentTime, 0.01);
      this.drumGain.gain.setTargetAtTime(this.volume * 0.8, this.audioContext!.currentTime, 0.01);
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioContext!.currentTime, 0.01);
    }
  }

  public getAudioStream(): MediaStream {
    if (!this.destinationStream) {
      this.init();
    }
    return this.destinationStream!.stream;
  }

  private getNoteFrequency(note: string): number {
    const baseNote = note.replace(/\d/, '');
    const octave = parseInt(note.slice(-1));
    const baseFreq = NOTE_FREQUENCIES[baseNote + '4'] || 440;
    return baseFreq * Math.pow(2, octave - 4);
  }

  private playNote(note: string, startTime: number, duration: number, velocity: number, type: 'melody' | 'bass'): void {
    if (!this.audioContext || !this.melodyGain) return;

    const frequency = this.getNoteFrequency(note);
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    if (type === 'melody') {
      osc.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
    } else {
      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.value = 500;
    }

    osc.frequency.value = frequency;

    const adjustedVelocity = velocity * (type === 'bass' ? 0.6 : 1);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(adjustedVelocity, startTime + 0.01);
    gain.gain.setValueAtTime(adjustedVelocity, startTime + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.melodyGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private playKick(startTime: number, velocity: number): void {
    if (!this.audioContext || !this.drumGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.1);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(velocity, startTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

    osc.connect(gain);
    gain.connect(this.drumGain);

    osc.start(startTime);
    osc.stop(startTime + 0.2);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private playSnare(startTime: number, velocity: number): void {
    if (!this.audioContext || !this.drumGain) return;

    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    noiseGain.gain.setValueAtTime(0, startTime);
    noiseGain.gain.linearRampToValueAtTime(velocity * 0.5, startTime + 0.001);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, startTime);
    osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.1);

    oscGain.gain.setValueAtTime(0, startTime);
    oscGain.gain.linearRampToValueAtTime(velocity * 0.5, startTime + 0.001);
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.drumGain);

    osc.connect(oscGain);
    oscGain.connect(this.drumGain);

    noise.start(startTime);
    osc.start(startTime);
    noise.stop(startTime + 0.15);
    osc.stop(startTime + 0.1);

    noise.onended = () => {
      noise.disconnect();
      noiseFilter.disconnect();
      noiseGain.disconnect();
    };

    osc.onended = () => {
      osc.disconnect();
      oscGain.disconnect();
    };
  }

  private playHiHat(startTime: number, velocity: number): void {
    if (!this.audioContext || !this.drumGain) return;

    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(velocity * 0.3, startTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);

    noise.start(startTime);
    noise.stop(startTime + 0.05);

    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private scheduleLoop = (): void => {
    if (!this.isPlaying || !this.audioContext) return;

    const currentTime = this.audioContext.currentTime;
    const elapsed = currentTime - this.startTime;
    const loopDuration = this.totalBars * 4 * (60 / this.bpm);
    const position = elapsed % loopDuration;

    const lookAhead = 0.1;
    const scheduleTime = position + lookAhead;

    const currentBeat = Math.floor(position / (60 / this.bpm));
    if (currentBeat !== this.lastBeatTime) {
      this.lastBeatTime = currentBeat;
      if (this.beatCallback) {
        this.beatCallback();
      }
    }

    this.melodyNotes.forEach((note, index) => {
      const noteTime = note.time % loopDuration;
      const eventId = index * 100000 + Math.floor(elapsed / loopDuration);

      if (
        noteTime >= position &&
        noteTime < scheduleTime &&
        !this.scheduledEvents.has(eventId)
      ) {
        this.scheduledEvents.add(eventId);
        const playTime = currentTime + (noteTime - position);
        this.playNote(note.note, playTime, note.duration, note.velocity, note.type);

        setTimeout(() => {
          this.scheduledEvents.delete(eventId);
        }, loopDuration * 1000);
      }
    });

    this.drumEvents.forEach((event, index) => {
      const eventTime = event.time % loopDuration;
      const eventId = (index + 10000) * 100000 + Math.floor(elapsed / loopDuration);

      if (
        eventTime >= position &&
        eventTime < scheduleTime &&
        !this.scheduledEvents.has(eventId)
      ) {
        this.scheduledEvents.add(eventId);
        const playTime = currentTime + (eventTime - position);

        switch (event.type) {
          case 'kick':
            this.playKick(playTime, event.velocity);
            break;
          case 'snare':
            this.playSnare(playTime, event.velocity);
            break;
          case 'hihat':
            this.playHiHat(playTime, event.velocity);
            break;
        }

        setTimeout(() => {
          this.scheduledEvents.delete(eventId);
        }, loopDuration * 1000);
      }
    });

    this.animationFrameId = requestAnimationFrame(this.scheduleLoop);
  };

  public start(): void {
    if (this.isPlaying) return;

    this.init();
    this.isPlaying = true;
    this.startTime = this.audioContext!.currentTime;
    this.scheduledEvents.clear();
    this.lastBeatTime = -1;
    this.scheduleLoop();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.scheduledEvents.clear();
  }

  public setBeatCallback(callback: () => void): void {
    this.beatCallback = callback;
  }

  public getBPM(): number {
    return this.bpm;
  }
}

export default SynthEngine;
