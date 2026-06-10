import * as Tone from 'tone';

const MARKER_NOTES = [
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5'
];

export class AudioEngine {
  private synth: Tone.PolySynth | null = null;
  private initialized = false;

  constructor() {
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.4,
        release: 1.5
      }
    }).toDestination();

    this.synth.volume.value = -6;
    this.initialized = true;
  }

  public playNote(markerIndex: number): void {
    if (!this.synth || !this.initialized) return;
    if (markerIndex < 0 || markerIndex >= MARKER_NOTES.length) return;

    const note = MARKER_NOTES[markerIndex];
    const now = Tone.now();

    this.synth.triggerAttackRelease(note, '2n', now, 0.8);

    this.applyGlissando(markerIndex, note, now);
  }

  private applyGlissando(markerIndex: number, note: string, startTime: number): void {
    if (!this.synth) return;

    const nextIndex = markerIndex + 1;
    if (nextIndex < MARKER_NOTES.length) {
      const nextNote = MARKER_NOTES[nextIndex];
      const baseFreq = Tone.Frequency(note).toFrequency();
      const targetFreq = Tone.Frequency(nextNote).toFrequency();
      const slideAmount = (targetFreq - baseFreq) * 0.08;

      this.synth.set({ detune: 0 });
      setTimeout(() => {
        if (this.synth) {
          const cents = 1200 * Math.log2((baseFreq + slideAmount) / baseFreq);
          this.synth.set({ detune: cents });
        }
      }, 80);

      setTimeout(() => {
        if (this.synth) {
          this.synth.set({ detune: 0 });
        }
      }, 300);
    }
  }

  public getNoteName(markerIndex: number): string {
    return MARKER_NOTES[markerIndex] || '';
  }
}
