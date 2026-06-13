export class SoundManager {
  private audioContext: AudioContext | null = null;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playHitSound(): void {
    try {
      const ctx = this.ensureContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 800 + Math.random() * 400;

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (e) {
      // Audio not available
    }
  }

  playGoldSound(): void {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const duration = 0.3;
      const stepCount = 8;

      for (let i = 0; i < stepCount; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        const freqStart = 440;
        const freqEnd = 880;
        const t = i / stepCount;
        oscillator.frequency.value = freqStart + (freqEnd - freqStart) * t;

        const startTime = now + (i * duration) / stepCount;
        const noteDuration = duration / stepCount;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + noteDuration * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + noteDuration);
      }
    } catch (e) {
      // Audio not available
    }
  }
}

export const soundManager = new SoundManager();
