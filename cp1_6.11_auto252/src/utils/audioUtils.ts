const NOISE_WORKLET_CODE = `
class WhiteNoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'frequency',
        defaultValue: 250,
        minValue: 100,
        maxValue: 400,
        automationRate: 'a-rate'
      },
      {
        name: 'gain',
        defaultValue: 0.3,
        minValue: 0,
        maxValue: 1,
        automationRate: 'a-rate'
      }
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.noiseBuffer = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      this.noiseBuffer[i] = Math.random() * 2 - 1;
    }
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];
    if (!channel) return true;

    const frequencyParams = parameters.frequency;
    const gainParams = parameters.gain;
    const isFrequencyConstant = frequencyParams.length === 1;
    const isGainConstant = gainParams.length === 1;

    for (let i = 0; i < channel.length; i++) {
      const freq = isFrequencyConstant ? frequencyParams[0] : frequencyParams[i];
      const gain = isGainConstant ? gainParams[0] : gainParams[i];
      
      this.phase += freq / sampleRate;
      if (this.phase > 1) this.phase -= 1;
      
      const lfo = Math.sin(this.phase * Math.PI * 2);
      const filteredFreq = 100 + (lfo + 1) * 150;
      
      this.bufferIndex = (this.bufferIndex + 1) % 1024;
      const noise = this.noiseBuffer[this.bufferIndex];
      
      const filter = Math.sin(this.phase * filteredFreq * 0.1 * Math.PI * 2);
      channel[i] = noise * filter * gain * 0.5;
    }

    return true;
  }
}

registerProcessor('white-noise-processor', WhiteNoiseProcessor);
`;

let audioContext: AudioContext | null = null;
let noiseNode: AudioWorkletNode | null = null;
let gainNode: GainNode | null = null;
let workletUrl: string | null = null;

async function initAudioContext(): Promise<AudioContext> {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  return audioContext;
}

async function ensureWorklet(): Promise<void> {
  if (!workletUrl) {
    const blob = new Blob([NOISE_WORKLET_CODE], { type: 'application/javascript' });
    workletUrl = URL.createObjectURL(blob);
  }
  
  const ctx = await initAudioContext();
  if (!ctx.audioWorklet) {
    throw new Error('AudioWorklet is not supported in this browser');
  }
  
  try {
    await ctx.audioWorklet.addModule(workletUrl);
  } catch (e) {
    console.warn('Worklet already loaded or failed:', e);
  }
}

export async function playWindSound(duration: number = 800): Promise<void> {
  try {
    const ctx = await initAudioContext();
    await ensureWorklet();
    
    if (noiseNode) {
      noiseNode.disconnect();
      noiseNode = null;
    }
    
    noiseNode = new AudioWorkletNode(ctx, 'white-noise-processor');
    gainNode = ctx.createGain();
    
    const frequencyParam = noiseNode.parameters.get('frequency');
    const gainParam = noiseNode.parameters.get('gain');
    
    const now = ctx.currentTime;
    frequencyParam?.setValueAtTime(100, now);
    frequencyParam?.linearRampToValueAtTime(400, now + 0.1);
    frequencyParam?.linearRampToValueAtTime(150, now + duration / 1000);
    
    gainParam?.setValueAtTime(0, now);
    gainParam?.linearRampToValueAtTime(0.4, now + 0.05);
    gainParam?.linearRampToValueAtTime(0, now + duration / 1000);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);
    
    noiseNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    setTimeout(() => {
      stopWindSound();
    }, duration + 100);
    
  } catch (e) {
    console.warn('AudioWorklet not available, falling back to legacy method');
    await playWindSoundLegacy(duration);
  }
}

async function playWindSoundLegacy(duration: number): Promise<void> {
  const ctx = await initAudioContext();
  
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * Math.sin(i / ctx.sampleRate * Math.PI * 2 * 200) * 0.5;
  }
  
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(100, ctx.currentTime);
  filter.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.1);
  filter.frequency.linearRampToValueAtTime(150, ctx.currentTime + duration / 1000);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);
  
  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noiseSource.start();
  noiseSource.stop(ctx.currentTime + duration / 1000);
}

export function stopWindSound(): void {
  if (noiseNode) {
    try {
      noiseNode.disconnect();
    } catch (e) {}
    noiseNode = null;
  }
  if (gainNode) {
    try {
      gainNode.disconnect();
    } catch (e) {}
    gainNode = null;
  }
}

export function cleanupAudio(): void {
  stopWindSound();
  if (workletUrl) {
    URL.revokeObjectURL(workletUrl);
    workletUrl = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
