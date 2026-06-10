let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playCollectSound = (): void => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    oscillator.start(now);
    oscillator.stop(now + 0.4);
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

export const createAudioBuffer = (audioData: number[]): AudioBuffer => {
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(1, audioData.length, 44100);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < audioData.length; i++) {
    channelData[i] = audioData[i];
  }
  return buffer;
};

export const playMixSequence = (
  audioBuffers: AudioBuffer[],
  onComplete: () => void
): () => void => {
  const ctx = getAudioContext();
  const segmentDuration = 2;
  const crossfade = 0.3;
  let stopped = false;
  const sources: AudioBufferSourceNode[] = [];

  const playNext = (index: number, startTime: number) => {
    if (stopped || index >= audioBuffers.length) {
      if (!stopped) {
        const totalDuration = audioBuffers.length * segmentDuration * 1000;
        setTimeout(() => !stopped && onComplete(), totalDuration + 500);
      }
      return;
    }

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = audioBuffers[index];
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    sources.push(source);

    const segmentStart = startTime;
    const segmentEnd = segmentStart + segmentDuration;

    gainNode.gain.setValueAtTime(0, segmentStart);
    gainNode.gain.linearRampToValueAtTime(0.5, segmentStart + crossfade);
    gainNode.gain.setValueAtTime(0.5, segmentEnd - crossfade);
    gainNode.gain.linearRampToValueAtTime(0, segmentEnd);

    source.start(segmentStart);
    source.stop(segmentEnd);

    playNext(index + 1, segmentStart + segmentDuration - crossfade);
  };

  playNext(0, ctx.currentTime + 0.1);

  return () => {
    stopped = true;
    sources.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
  };
};
