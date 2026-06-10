import type p5 from 'p5';

declare module 'p5' {
  interface p5InstanceExtensions {
    userStartAudio(): Promise<void>;
    getAudioContext(): AudioContext;
    Oscillator: typeof p5.Oscillator;
    Gain: typeof p5.Gain;
  }

  namespace p5 {
    class Oscillator {
      constructor(freq?: number, type?: string);
      amp(vol: number, rampTime?: number, timeFromNow?: number): void;
      freq(freq: number | p5.Gain, rampTime?: number, timeFromNow?: number): void;
      disconnect(): void;
      connect(unit?: p5.Gain | AudioNode): void;
      start(timeFromNow?: number): void;
      stop(timeFromNow?: number): void;
    }

    class Gain {
      constructor();
      amp(vol: number, rampTime?: number, timeFromNow?: number): void;
      disconnect(): void;
      connect(unit?: p5.Gain | AudioNode): void;
    }
  }
}
