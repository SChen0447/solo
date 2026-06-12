export type AudioState = 'idle' | 'speaking' | 'paused';

export interface AudioConfig {
  speechRate: number;
  speechPitch: number;
  vibrationLevel: number;
  vibrationDuration: number;
  voiceName?: string;
  lang: string;
}

const DEFAULT_CONFIG: AudioConfig = {
  speechRate: 0.8,
  speechPitch: 1.2,
  vibrationLevel: 50,
  vibrationDuration: 100,
  lang: 'zh-CN'
};

export class AudioManager {
  private config: AudioConfig;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentVoice: SpeechSynthesisVoice | null = null;
  private audioContext: AudioContext | null = null;
  private state: AudioState = 'idle';
  private lastSpokenText: string = '';
  private lastSpeakTime: number = 0;
  private readonly MIN_SPEAK_INTERVAL: number = 80;
  private audioQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private onStateChangeHandlers: Set<(state: AudioState) => void> = new Set();

  constructor(config?: Partial<AudioConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initSpeechSynthesis();
  }

  private initSpeechSynthesis(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;

    const voices = this.synth.getVoices();
    const zhVoices = voices.filter(
      (v) => v.lang.toLowerCase().startsWith('zh')
    );

    const femaleZhVoices = zhVoices.filter(
      (v) =>
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('女') ||
        v.name.toLowerCase().includes('xiaoxiao') ||
        v.name.toLowerCase().includes('xiaoyi') ||
        v.name.toLowerCase().includes('yunxi') ||
        v.name.toLowerCase().includes('yaoyao')
    );

    this.currentVoice =
      femaleZhVoices[0] || zhVoices[0] || voices[0] || null;

    if (this.config.voiceName) {
      const named = voices.find((v) => v.name === this.config!.voiceName);
      if (named) this.currentVoice = named;
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioContext) {
      const CtxClass =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (CtxClass) {
        try {
          this.audioContext = new CtxClass();
        } catch (e) {
          console.warn('AudioContext creation failed:', e);
        }
      }
    }

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  speak(text: string): void {
    if (!text || !this.synth) return;

    const now = performance.now();
    if (
      text === this.lastSpokenText &&
      now - this.lastSpeakTime < this.MIN_SPEAK_INTERVAL
    ) {
      return;
    }
    this.lastSpokenText = text;
    this.lastSpeakTime = now;

    this.cancelSpeak();

    this.speakInternal(text);
  }

  speakQueue(text: string): void {
    if (!text) return;
    this.audioQueue.push(text);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isProcessingQueue || this.audioQueue.length === 0) return;
    this.isProcessingQueue = true;

    const speakNext = () => {
      if (this.audioQueue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }
      const text = this.audioQueue.shift()!;
      if (text) {
        this.speakInternal(text, () => {
          setTimeout(speakNext, 100);
        });
      } else {
        speakNext();
      }
    };

    speakNext();
  }

  private speakInternal(text: string, onEnd?: () => void): void {
    if (!this.synth) {
      onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.rate = this.config.speechRate;
      utterance.pitch = this.config.speechPitch;
      utterance.volume = 1.0;

      if (this.currentVoice) {
        utterance.voice = this.currentVoice;
      }
      utterance.lang = this.config.lang;

      utterance.onstart = () => {
        this.setState('speaking');
      };

      utterance.onend = () => {
        this.setState('idle');
        onEnd?.();
      };

      utterance.onerror = () => {
        this.setState('idle');
        onEnd?.();
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      this.setState('idle');
      onEnd?.();
    }
  }

  cancelSpeak(): void {
    if (this.synth?.speaking) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
    this.audioQueue = [];
    this.isProcessingQueue = false;
  }

  pause(): void {
    if (this.synth?.speaking && !this.synth.paused) {
      this.synth.pause();
      this.setState('paused');
    }
  }

  resume(): void {
    if (this.synth?.paused) {
      this.synth.resume();
      this.setState('speaking');
    }
  }

  vibrate(duration?: number): void {
    const actualDuration = duration ?? this.config.vibrationDuration;
    const effectiveDuration = Math.max(
      10,
      Math.round(actualDuration * (this.config.vibrationLevel / 100)
    );

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(effectiveDuration);
      } catch (e) {
        console.warn('Vibration API not available:', e);
      }
    }

    if (this.config.vibrationLevel > 0) {
      this.playTone(effectiveDuration);
    }
  }

  private playTone(duration: number): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = 180 + (this.config.vibrationLevel / 100) * 80;

      const volume = (this.config.vibrationLevel / 100) * 0.08;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000 + 0.02);
    } catch (e) {
      console.warn('Tone playback error:', e);
    }
  }

  pulse(): void {
    this.vibrate();
  }

  setSpeechRate(rate: number): void {
    this.config.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  setSpeechPitch(pitch: number): void {
    this.config.speechPitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  setVibrationLevel(level: number): void {
    this.config.vibrationLevel = Math.max(0, Math.min(100, level));
  }

  setVibrationDuration(duration: number): void {
    this.config.vibrationDuration = Math.max(10, Math.min(1000, duration));
  }

  setConfig(config: Partial<AudioConfig>): void {
    if (config.speechRate !== undefined) this.setSpeechRate(config.speechRate);
    if (config.speechPitch !== undefined) this.setSpeechPitch(config.speechPitch);
    if (config.vibrationLevel !== undefined) this.setVibrationLevel(config.vibrationLevel);
    if (config.vibrationDuration !== undefined) this.setVibrationDuration(config.vibrationDuration);
  }

  getState(): AudioState {
    return this.state;
  }

  private setState(state: AudioState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChangeHandlers.forEach((h) => {
      try {
        h(state);
      } catch (e) {
          console.error('State change handler error:', e);
        }
    });
  }

  onStateChange(handler: (state: AudioState) => void): () => void {
    this.onStateChangeHandlers.add(handler);
    return () => this.onStateChangeHandlers.delete(handler);
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  isSupported(): { speech: boolean; vibration: boolean } {
    return {
      speech: typeof window !== 'undefined' && 'speechSynthesis' in window,
      vibration: typeof navigator !== 'undefined' && 'vibrate' in navigator
    };
  }

  destroy(): void {
    this.cancelSpeak();
    this.onStateChangeHandlers.clear();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
