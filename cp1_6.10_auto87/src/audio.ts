let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let frequencyData: Uint8Array | null = null;
let audioSource: AudioNode | null = null;
let testOscillator: OscillatorNode | null = null;
let testGain: GainNode | null = null;
let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
let mediaElementSource: MediaElementAudioSourceNode | null = null;
let audioElement: HTMLAudioElement | null = null;

export type AudioSourceType = 'mic' | 'file' | 'test';

export function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
}

export async function startMicrophone(): Promise<void> {
  initAudio();
  stopCurrentSource();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamSource = audioContext!.createMediaStreamSource(stream);
    mediaStreamSource.connect(analyser!);
    audioSource = mediaStreamSource;
  } catch (err) {
    console.error('麦克风获取失败:', err);
    startTestTone();
  }
}

export async function startAudioFile(file: File): Promise<void> {
  initAudio();
  stopCurrentSource();
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    audioElement = new Audio(url);
    audioElement.crossOrigin = 'anonymous';
    audioElement.loop = true;
    audioElement.oncanplay = () => {
      mediaElementSource = audioContext!.createMediaElementSource(audioElement!);
      mediaElementSource.connect(analyser!);
      analyser!.connect(audioContext!.destination);
      void audioElement!.play();
      audioSource = mediaElementSource;
      resolve();
    };
    audioElement.onerror = () => {
      reject(new Error('音频文件加载失败'));
    };
  });
}

export function startTestTone(): void {
  initAudio();
  stopCurrentSource();
  const ctx = audioContext!;
  testOscillator = ctx.createOscillator();
  testGain = ctx.createGain();

  testOscillator.type = 'sine';
  testOscillator.frequency.setValueAtTime(220, ctx.currentTime);

  const now = ctx.currentTime;
  const duration = 8;
  const endTime = now + duration;

  for (let t = now; t < endTime; t += 0.5) {
    const freq = 110 + Math.random() * 880;
    testOscillator.frequency.setValueAtTime(freq, t);
  }

  testGain.gain.setValueAtTime(0, now);
  for (let t = now; t < endTime; t += 0.125) {
    const vol = 0.1 + Math.random() * 0.25;
    testGain.gain.setValueAtTime(vol, t);
    testGain.gain.setValueAtTime(vol * 0.3, t + 0.06);
  }
  testGain.gain.setValueAtTime(0, endTime);

  testOscillator.connect(testGain);
  testGain.connect(analyser!);
  analyser!.connect(ctx.destination);

  testOscillator.start(now);
  testOscillator.stop(endTime);

  testOscillator.onended = () => {
    setTimeout(() => {
      if (audioSource === testGain && testOscillator) {
        startTestTone();
      }
    }, 200);
  };

  audioSource = testGain;
}

function stopCurrentSource(): void {
  if (mediaStreamSource) {
    try {
      mediaStreamSource.mediaStream.getTracks().forEach(t => t.stop());
    } catch (_) { /* ignore */ }
    mediaStreamSource.disconnect();
    mediaStreamSource = null;
  }
  if (mediaElementSource) {
    mediaElementSource.disconnect();
    mediaElementSource = null;
  }
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement = null;
  }
  if (testOscillator) {
    try {
      testOscillator.stop();
    } catch (_) { /* ignore */ }
    testOscillator.disconnect();
    testOscillator = null;
  }
  if (testGain) {
    testGain.disconnect();
    testGain = null;
  }
  audioSource = null;
}

export function getFrequencyData(): Uint8Array {
  if (!analyser || !frequencyData) {
    return new Uint8Array(256);
  }
  analyser.getByteFrequencyData(frequencyData);
  return frequencyData;
}

export function isAudioReady(): boolean {
  return audioContext !== null && analyser !== null && audioSource !== null;
}
