import * as Tone from 'tone';

const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];

const colorToMidi = (hexColor: string): number => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const hue = (Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) / (2 * Math.PI) + 1) % 1;
  const baseOctave = 3;
  const semitone = SCALE[Math.floor(hue * 12)];
  const octaveShift = Math.floor((brightness / 255) * 2);
  return 48 + baseOctave * 12 + semitone + octaveShift * 12;
};

const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private padSynth: Tone.PolySynth | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private reverb: Tone.Reverb | null = null;
  private gain: Tone.Gain | null = null;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;
  private bpm: number = 100;
  private lastNoteIndex: number = -1;
  private activeNotes: Map<number, { midi: number; time: number }> = new Map();
  private sequence: Tone.Sequence | null = null;
  private transportStarted: boolean = false;

  constructor() {}

  async init(): Promise<void> {
    if (this.isInitialized) return;

    await Tone.start();
    await Tone.loaded();

    this.gain = new Tone.Gain(0.18).toDestination();

    this.reverb = new Tone.Reverb({
      decay: 2.5,
      wet: 0.35,
    });

    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.3,
      wet: 0.25,
    });

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.08,
        decay: 0.3,
        sustain: 0.2,
        release: 1.2,
      },
    });

    this.padSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.8,
        decay: 0.5,
        sustain: 0.4,
        release: 2.5,
      },
    });

    this.synth.chain(this.delay, this.reverb, this.gain);
    this.padSynth.chain(this.reverb, this.gain);

    this.isInitialized = true;
  }

  playNote(colorHex: string, intensity: number = 1): void {
    if (!this.isInitialized || !this.synth) return;

    const midi = colorToMidi(colorHex);
    const freq = midiToFreq(midi);
    const velocity = 0.3 + intensity * 0.5;

    this.synth.triggerAttackRelease(freq, '8n', Tone.now(), velocity);

    const harmonics = [12, 19];
    harmonics.forEach((interval, i) => {
      const harmFreq = midiToFreq(midi + interval);
      this.synth?.triggerAttackRelease(
        harmFreq,
        '4n',
        Tone.now() + 0.02 * (i + 1),
        velocity * 0.25
      );
    });
  }

  playChord(colorHex: string, duration: string = '2m'): void {
    if (!this.isInitialized || !this.padSynth) return;

    const midi = colorToMidi(colorHex);
    const chord = [0, 4, 7, 12].map((interval) => midiToFreq(midi + interval));

    this.padSynth.triggerAttackRelease(chord, duration, Tone.now(), 0.2);
  }

  stopNote(): void {
    if (!this.isInitialized || !this.synth) return;
    this.synth.releaseAll(Tone.now());
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  getBpm(): number {
    return this.bpm;
  }

  startAmbientLoop(colors: string[]): void {
    if (!this.isInitialized || this.isPlaying || !this.synth) return;

    if (!this.transportStarted) {
      Tone.Transport.start();
      this.transportStarted = true;
    }

    const events = colors.map((color, i) => ({ color, index: i }));

    this.sequence = new Tone.Sequence(
      (time, { color, index }) => {
        if (!this.synth) return;
        if (index % 4 === 0) {
          this.playChord(color, '1m');
        } else {
          const midi = colorToMidi(color);
          const variation = (Math.random() - 0.5) * 4;
          const freq = midiToFreq(midi + Math.round(variation));
          this.synth.triggerAttackRelease(freq, '16n', time, 0.15);
        }
      },
      events,
      '8n'
    );

    this.sequence.start(0);
    this.isPlaying = true;
  }

  stopAmbientLoop(): void {
    if (this.sequence) {
      this.sequence.stop();
      this.sequence.dispose();
      this.sequence = null;
    }
    this.isPlaying = false;
  }

  updateLoopColors(colors: string[]): void {
    if (!this.isPlaying) return;
    this.stopAmbientLoop();
    this.startAmbientLoop(colors);
  }

  playThemeTransition(fromColor: string, toColor: string): void {
    if (!this.isInitialized || !this.synth) return;

    const fromMidi = colorToMidi(fromColor);
    const toMidi = colorToMidi(toColor);
    const steps = 6;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const midi = Math.round(fromMidi + (toMidi - fromMidi) * t);
      const freq = midiToFreq(midi);
      const time = Tone.now() + i * 0.12;
      const velocity = 0.2 + Math.sin(t * Math.PI) * 0.3;
      this.synth.triggerAttackRelease(freq, '16n', time, velocity);
    }

    this.playChord(toColor, '2m');
  }

  playSectorHighlight(colorHex: string): void {
    if (!this.isInitialized || !this.synth) return;

    const midi = colorToMidi(colorHex);
    const freq = midiToFreq(midi);

    if (this.activeNotes.has(midi)) return;

    const time = Tone.now();
    this.synth.triggerAttack(freq, time, 0.18);
    this.activeNotes.set(midi, { midi, time });
  }

  releaseSectorNotes(): void {
    if (!this.isInitialized || !this.synth) return;
    this.activeNotes.forEach(({ midi }) => {
      this.synth?.triggerRelease(midiToFreq(midi));
    });
    this.activeNotes.clear();
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
