export interface PlayState {
  frequency: number;
  volume: number;
  startTime: number;
}

interface ActiveVoice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  startTime: number;
}

const MAX_VOICES = 16;
const NOTE_DURATION = 0.3;
const DECAY_FACTOR = 0.01;

export class AudioEngine {
  private ctx: AudioContext;
  private activeVoices: ActiveVoice[] = [];

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
  }

  private centsToFrequencyRatio(cents: number): number {
    return Math.pow(2, cents / 1200);
  }

  private removeOldestVoice(): void {
    if (this.activeVoices.length === 0) return;
    const oldest = this.activeVoices.shift()!;
    try {
      oldest.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      oldest.oscillator.stop();
      oldest.oscillator.disconnect();
      oldest.gainNode.disconnect();
    } catch (e) {
      // ignore disposal errors
    }
  }

  playNote(frequency: number, volume: number = 0.3, centsOffset: number = 0): PlayState | null {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    while (this.activeVoices.length >= MAX_VOICES) {
      this.removeOldestVoice();
    }

    this.activeVoices = this.activeVoices.filter((voice) => {
      const elapsed = this.ctx.currentTime - voice.startTime;
      if (elapsed > NOTE_DURATION + 1.0) {
        try {
          voice.oscillator.disconnect();
          voice.gainNode.disconnect();
        } catch (e) {
          // ignore
        }
        return false;
      }
      return true;
    });

    try {
      const actualFrequency = frequency * this.centsToFrequencyRatio(centsOffset);
      const oscillator = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = actualFrequency;

      const now = this.ctx.currentTime;
      const clampedVolume = Math.max(0, Math.min(1, volume));
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(clampedVolume, now + 0.01);
      gainNode.gain.setTargetAtTime(0, now + NOTE_DURATION, DECAY_FACTOR);

      oscillator.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + NOTE_DURATION + 2.0);

      this.activeVoices.push({
        oscillator,
        gainNode,
        startTime: now,
      });

      return {
        frequency: actualFrequency,
        volume: clampedVolume,
        startTime: now,
      };
    } catch (e) {
      return null;
    }
  }
}
