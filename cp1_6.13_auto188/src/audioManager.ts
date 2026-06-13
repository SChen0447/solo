import * as Tone from 'tone';

export class AudioManager {
  private synth: Tone.PolySynth | null = null;
  private chordSynth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    this.reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.02,
        decay: 0.5,
        sustain: 0.2,
        release: 1.0,
      },
    }).connect(this.reverb);
    this.synth.maxPolyphony = 8;
    this.synth.volume.value = -12;

    this.chordSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.05,
        decay: 0.8,
        sustain: 0.1,
        release: 1.5,
      },
    }).connect(this.reverb);
    this.chordSynth.maxPolyphony = 6;
    this.chordSynth.volume.value = -8;

    this.initialized = true;
  }

  heightToNote(height: number, minHeight: number, maxHeight: number): string {
    const t = (height - minHeight) / (maxHeight - minHeight + 0.001);
    const minMidi = 60;
    const maxMidi = 84;
    const midi = Math.round(minMidi + t * (maxMidi - minMidi));
    return Tone.Frequency(midi, 'midi').toNote();
  }

  playNote(height: number, minHeight: number, maxHeight: number): void {
    if (!this.synth || !this.initialized) return;
    const note = this.heightToNote(height, minHeight, maxHeight);
    this.synth.triggerAttackRelease(note, '8n', Tone.now(), 0.6);
  }

  playChord(): void {
    if (!this.chordSynth || !this.initialized) return;
    const notes = ['C4', 'E4', 'G4', 'B4', 'D5'].map((n) =>
      Tone.Frequency(n).toNote()
    );
    this.chordSynth.triggerAttackRelease(notes, '2n', Tone.now(), 0.5);
  }

  dispose(): void {
    this.synth?.dispose();
    this.chordSynth?.dispose();
    this.reverb?.dispose();
  }
}
