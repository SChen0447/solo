let audioContext: AudioContext | null = null;

export function initAudioContext(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
}

export function playStampSound(): void {
  if (!audioContext) {
    initAudioContext();
  }
  
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

export function playSealSound(): void {
  if (!audioContext) {
    initAudioContext();
  }
  
  if (!audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.15);
  
  gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
}

export function playLetterSentSound(): void {
  if (!audioContext) {
    initAudioContext();
  }
  
  if (!audioContext) return;
  
  const notes = [523.25, 659.25, 783.99];
  
  notes.forEach((freq, i) => {
    const oscillator = audioContext!.createOscillator();
    const gainNode = audioContext!.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext!.destination);
    
    oscillator.frequency.setValueAtTime(freq, audioContext!.currentTime + i * 0.1);
    gainNode.gain.setValueAtTime(0.2, audioContext!.currentTime + i * 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext!.currentTime + i * 0.1 + 0.15);
    
    oscillator.start(audioContext!.currentTime + i * 0.1);
    oscillator.stop(audioContext!.currentTime + i * 0.1 + 0.15);
  });
}
