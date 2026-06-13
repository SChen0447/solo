import * as Tone from 'tone';

const NOTE_FREQUENCIES: number[] = [];
for (let octave = 4; octave <= 6; octave++) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (const note of notes) {
    if (octave === 6 && note !== 'C') break;
    NOTE_FREQUENCIES.push(Tone.Frequency(note + octave).toFrequency());
  }
}

export class AudioManager {
  private synth: Tone.Synth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private chordSynth: Tone.PolySynth | null = null;
  private arpSynth: Tone.Synth | null = null;
  private initialized = false;
  private consecutiveBreaks = 0;

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    this.synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.1,
        release: 0.1
      }
    }).toDestination();
    this.synth.volume.value = -8;

    this.noiseSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.05
      }
    }).toDestination();
    this.noiseSynth.volume.value = -18;

    this.chordSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.3,
        release: 0.4
      }
    }).toDestination();
    this.chordSynth.volume.value = -10;

    this.arpSynth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.2,
        release: 0.3
      }
    }).toDestination();
    this.arpSynth.volume.value = -12;

    this.initialized = true;
  }

  playBreakSound(depth: number): void {
    if (!this.synth || !this.noiseSynth) return;

    const normalizedDepth = Math.min(Math.max(depth, 0), 1);
    const freqIndex = Math.floor(normalizedDepth * (NOTE_FREQUENCIES.length - 1));
    const freq = NOTE_FREQUENCIES[freqIndex];

    const now = Tone.now();
    this.synth.triggerAttackRelease(freq, '8n', now, 0.6);
    this.noiseSynth.triggerAttackRelease('16n', now, 0.4);

    this.consecutiveBreaks++;
    if (this.consecutiveBreaks >= 3) {
      this.consecutiveBreaks = 0;
      this.playRisingChord();
    }
  }

  private playRisingChord(): void {
    if (!this.chordSynth) return;

    const now = Tone.now();
    const Cmajor = ['C4', 'E4', 'G4'];
    const Dminor = ['D4', 'F4', 'A4'];
    const Emajor = ['E4', 'G#4', 'B4'];

    this.chordSynth.triggerAttackRelease(Cmajor, '8n', now, 0.5);
    this.chordSynth.triggerAttackRelease(Dminor, '8n', now + 0.15, 0.5);
    this.chordSynth.triggerAttackRelease(Emajor, '4n', now + 0.3, 0.6);
  }

  playBounceSound(): void {
    if (!this.synth) return;
    const now = Tone.now();
    this.synth.triggerAttackRelease(Tone.Frequency('G3').toFrequency(), '16n', now, 0.3);
  }

  playBurstArpeggio(): void {
    if (!this.arpSynth) return;

    const arpNotes = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    const now = Tone.now();

    arpNotes.forEach((note, i) => {
      const freq = Tone.Frequency(note).toFrequency();
      this.arpSynth!.triggerAttackRelease(freq, '32n', now + i * 0.12, 0.8);
    });
  }

  resetConsecutive(): void {
    this.consecutiveBreaks = 0;
  }
}

export const audioManager = new AudioManager();
