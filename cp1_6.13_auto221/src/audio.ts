import * as Tone from 'tone';

export type NoteSpeed = 1 | 2 | 3;

const NOTES_OCTAVE = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'];

const PENTATONIC = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];

const MAJOR_SCALE = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

export interface AudioSynthesizerOptions {
  speed: NoteSpeed;
  masterVolume: number;
}

export class AudioSynthesizer {
  private initialized: boolean = false;
  private polySynth: Tone.PolySynth | null = null;
  private padSynth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private masterGain: Tone.Gain | null = null;
  private speed: NoteSpeed = 2;
  private lastNoteTimes: Map<string, number> = new Map();
  private speedCooldowns: Record<NoteSpeed, number> = { 1: 450, 2: 220, 3: 100 };
  private sustainedNotes: string[] = [];
  private sustainTimeoutIds: Set<number> = new Set();

  constructor(options: AudioSynthesizerOptions) {
    this.speed = options.speed;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    await Tone.loaded();

    this.masterGain = new Tone.Gain(0.45).toDestination();

    this.reverb = new Tone.Reverb({
      decay: 3.5,
      wet: 0.55,
      preDelay: 0.05
    });
    await this.reverb.generate();

    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.25,
      wet: 0.2
    });

    this.polySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.02,
        decay: 0.4,
        sustain: 0.25,
        release: 1.8
      }
    });

    this.padSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.6,
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.6,
        decay: 0.5,
        sustain: 0.4,
        release: 3.2
      },
      modulation: {
        type: 'sine'
      },
      modulationEnvelope: {
        attack: 0.3,
        decay: 0.5,
        sustain: 0.6,
        release: 2.5
      }
    });

    this.polySynth.volume.value = -6;
    this.padSynth.volume.value = -16;

    this.polySynth.chain(this.delay, this.reverb, this.masterGain);
    this.padSynth.chain(this.reverb, this.masterGain);

    this.initialized = true;
    this.startPadDrone();
  }

  private startPadDrone(): void {
    if (!this.padSynth) return;
    const chordNotes = ['C3', 'G3', 'E4', 'B4'];
    this.padSynth.triggerAttack(chordNotes);
  }

  setSpeed(speed: NoteSpeed): void {
    this.speed = speed;
  }

  getSpeed(): NoteSpeed {
    return this.speed;
  }

  private pickRandomNote(): string {
    const scale = Math.random() < 0.75 ? PENTATONIC : MAJOR_SCALE;
    return scale[Math.floor(Math.random() * scale.length)];
  }

  triggerCollisionNote(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.initialized || !this.polySynth) return;
    const now = performance.now();
    const cooldown = this.speedCooldowns[this.speed];
    const posKey = `${Math.floor(x / 50)}-${Math.floor(y / 50)}`;
    const lastTime = this.lastNoteTimes.get(posKey) ?? 0;
    if (now - lastTime < cooldown) return;
    this.lastNoteTimes.set(posKey, now);

    const note = this.pickRandomNote();

    const xRatio = x / canvasWidth;
    const yRatio = y / canvasHeight;

    const baseVelocity = 0.4;
    const velocityJitter = Math.random() * 0.3;
    const velocity = Math.min(1, baseVelocity + velocityJitter + (1 - yRatio) * 0.15);

    let durationRatio = 0.5;
    switch (this.speed) {
      case 1:
        durationRatio = 1.2 + Math.random() * 0.6;
        break;
      case 2:
        durationRatio = 0.6 + Math.random() * 0.4;
        break;
      case 3:
        durationRatio = 0.25 + Math.random() * 0.2;
        break;
    }

    const duration = `${durationRatio}n`;

    this.polySynth.triggerAttackRelease(note, duration, undefined, velocity);

    const harmonyChance = xRatio;
    if (harmonyChance > 0.6 && Math.random() < 0.4) {
      const third = this.findHarmonyNote(note, 2);
      if (third) {
        this.polySynth.triggerAttackRelease(
          third,
          duration,
          undefined,
          velocity * 0.55
        );
      }
    }

    if (yRatio < 0.25 && Math.random() < 0.25) {
      const octaveUp = this.octaveShift(note, 1);
      this.polySynth.triggerAttackRelease(
        octaveUp,
        `${durationRatio * 0.6}n`,
        undefined,
        velocity * 0.4
      );
    }

    this.queueSustainRelease(note, durationRatio);
  }

  private findHarmonyNote(note: string, interval: number): string | null {
    const idx = PENTATONIC.indexOf(note);
    if (idx !== -1) {
      const newIdx = (idx + interval) % PENTATONIC.length;
      return PENTATONIC[newIdx];
    }
    const idx2 = NOTES_OCTAVE.indexOf(note);
    if (idx2 !== -1) {
      const steps = interval === 2 ? 4 : 7;
      const newIdx = (idx2 + steps) % NOTES_OCTAVE.length;
      return NOTES_OCTAVE[newIdx];
    }
    return null;
  }

  private octaveShift(note: string, shift: number): string {
    const match = /^([A-G]#?)(\d)$/.exec(note);
    if (!match) return note;
    const pitch = match[1];
    const octave = parseInt(match[2], 10);
    return `${pitch}${octave + shift}`;
  }

  private queueSustainRelease(note: string, durationRatio: number): void {
    this.sustainedNotes.push(note);
    const timeoutId = window.setTimeout(() => {
      const idx = this.sustainedNotes.indexOf(note);
      if (idx !== -1) {
        this.sustainedNotes.splice(idx, 1);
      }
      this.sustainTimeoutIds.delete(timeoutId);
    }, durationRatio * 600);
    this.sustainTimeoutIds.add(timeoutId);
  }

  triggerExplosionBurst(centerX: number, centerY: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.initialized || !this.polySynth) return;
    const count = 3;
    for (let i = 0; i < count; i++) {
      const delayMs = i * (this.speed === 1 ? 120 : this.speed === 2 ? 70 : 40);
      setTimeout(() => {
        const jx = centerX + (Math.random() - 0.5) * 80;
        const jy = centerY + (Math.random() - 0.5) * 80;
        this.triggerCollisionNote(
          Math.max(0, Math.min(canvasWidth, jx)),
          Math.max(0, Math.min(canvasHeight, jy)),
          canvasWidth,
          canvasHeight
        );
      }, delayMs);
    }
  }

  setMasterVolume(vol: number): void {
    if (this.masterGain) {
      this.masterGain.gain.rampTo(vol, 0.2);
    }
  }

  dispose(): void {
    this.sustainTimeoutIds.forEach((id) => clearTimeout(id));
    this.sustainTimeoutIds.clear();
    this.sustainedNotes = [];
    if (this.polySynth) this.polySynth.dispose();
    if (this.padSynth) this.padSynth.dispose();
    if (this.reverb) this.reverb.dispose();
    if (this.delay) this.delay.dispose();
    if (this.masterGain) this.masterGain.dispose();
    this.initialized = false;
  }
}
