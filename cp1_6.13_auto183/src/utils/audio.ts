let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playChime = (frequency: number = 523.25, duration: number = 0.5) => {
  try {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, ctx.currentTime);
    
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration * 0.8);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    
    oscillator.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
    
  } catch (e) {
  }
};

export const playCreateSound = () => {
  playChime(523.25, 0.6);
};

export const playSaveSound = () => {
  playChime(659.25, 0.4);
  setTimeout(() => playChime(783.99, 0.3), 100);
};

export const playDeleteSound = () => {
  try {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
    
  } catch (e) {
  }
};

export const playClickSound = () => {
  playChime(440, 0.15);
};
