import * as THREE from 'three';

const PARTICLE_COUNT = 800;
const FFT_SIZE = 512;

export type PresetType = 'none' | 'sine' | 'whiteNoise' | 'music';

interface ParticleData {
  baseX: number;
  baseZ: number;
  velocity: THREE.Vector3;
  twinklePhase: number;
  twinkleSpeed: number;
}

export class AudioVisualizer {
  public particles: THREE.Points;
  public sensitivity: number = 1.0;

  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleData: ParticleData[] = [];

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private frequencyData: Uint8Array;
  private timeData: Uint8Array;

  private presetSource: AudioBufferSourceNode | OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private currentPreset: PresetType = 'none';
  private isActive: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BufferGeometry();
    this.frequencyData = new Uint8Array(FFT_SIZE / 2);
    this.timeData = new Uint8Array(FFT_SIZE / 2);

    this.initParticles();
  }

  private initParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const color = new THREE.Color();
      color.setHSL(0.65, 0.8, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.05 + Math.random() * 0.1;

      this.particleData.push({
        baseX: x,
        baseZ: z,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005
        ),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public async startMicrophone(): Promise<boolean> {
    try {
      this.stopAll();
      this.ensureAudioContext();

      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext!.createMediaStreamSource(this.microphoneStream);
      source.connect(this.analyser!);
      this.isActive = true;
      this.currentPreset = 'none';
      return true;
    } catch (error) {
      console.error('麦克风访问失败:', error);
      return false;
    }
  }

  public startPreset(preset: PresetType): void {
    this.stopAll();
    this.ensureAudioContext();

    this.currentPreset = preset;
    this.isActive = true;

    switch (preset) {
      case 'sine':
        this.startSineWave();
        break;
      case 'whiteNoise':
        this.startWhiteNoise();
        break;
      case 'music':
        this.startMusicClip();
        break;
    }
  }

  private startSineWave(): void {
    if (!this.audioContext || !this.analyser) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';

    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.frequency.value = 440;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(this.analyser);

    osc.start();
    lfo.start();
    this.presetSource = osc;
  }

  private startWhiteNoise(): void {
    if (!this.audioContext || !this.analyser) return;

    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    const filterLfo = this.audioContext.createOscillator();
    const filterLfoGain = this.audioContext.createGain();
    filterLfo.frequency.value = 0.3;
    filterLfoGain.gain.value = 1500;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);

    const gain = this.audioContext.createGain();
    gain.gain.value = 0.15;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    noise.start();
    filterLfo.start();
    this.noiseNode = noise;
    this.presetSource = filterLfo;
  }

  private startMusicClip(): void {
    if (!this.audioContext || !this.analyser) return;

    const now = this.audioContext.currentTime;
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    const gain = this.audioContext.createGain();
    gain.gain.value = 0.2;
    gain.connect(this.analyser);

    const playNote = (freq: number, startTime: number, duration: number) => {
      if (!this.audioContext) return;
      const osc = this.audioContext.createOscillator();
      const noteGain = this.audioContext.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    for (let loop = 0; loop < 50; loop++) {
      const loopStart = now + loop * 2.0;
      for (let i = 0; i < 8; i++) {
        playNote(notes[i], loopStart + i * 0.25, 0.22);
      }
      for (let i = 6; i >= 1; i--) {
        playNote(notes[i], loopStart + 2.0 + (7 - i) * 0.25, 0.22);
      }
    }
  }

  public stopAll(): void {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.presetSource) {
      try { (this.presetSource as any).stop && (this.presetSource as any).stop(); } catch (e) {}
      this.presetSource = null;
    }
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch (e) {}
      this.noiseNode = null;
    }
    this.isActive = false;
    this.currentPreset = 'none';
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getCurrentPreset(): PresetType {
    return this.currentPreset;
  }

  public update(time: number): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const colorArray = colors.array as Float32Array;
    const sizeArray = sizes.array as Float32Array;

    let hasAudioData = false;

    if (this.analyser && this.isActive) {
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeData);
      hasAudioData = this.frequencyData.some(v => v > 10);
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (hasAudioData && this.analyser) {
        const freqIndex = Math.floor((i / PARTICLE_COUNT) * this.frequencyData.length);
        const amplitude = this.frequencyData[freqIndex] / 255;
        const scaledAmp = amplitude * this.sensitivity;

        const zNorm = i / PARTICLE_COUNT;
        const z = (zNorm - 0.5) * 40;
        const angle = (i / PARTICLE_COUNT) * Math.PI * 8 + time * 0.2;
        const radius = 6 + scaledAmp * 8;
        const x = Math.cos(angle) * radius;
        const y = scaledAmp * 15 - 5;

        posArray[i * 3] = x;
        posArray[i * 3 + 1] = y;
        posArray[i * 3 + 2] = z;

        const hue = 0.65 - zNorm * 0.65;
        const saturation = 0.7 + amplitude * 0.3;
        const lightness = 0.3 + amplitude * 0.5;
        const color = new THREE.Color();
        color.setHSL(hue, saturation, lightness);
        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;

        sizeArray[i] = 0.08 + scaledAmp * 0.3;
      } else {
        const pd = this.particleData[i];
        let x = posArray[i * 3] + pd.velocity.x;
        let y = posArray[i * 3 + 1] + pd.velocity.y;
        let z = posArray[i * 3 + 2] + pd.velocity.z;

        const dist = Math.sqrt(x * x + z * z);
        if (dist > 22 || dist < 3) {
          pd.velocity.x *= -1;
          pd.velocity.z *= -1;
        }
        if (y > 8 || y < -8) {
          pd.velocity.y *= -1;
        }

        posArray[i * 3] = x;
        posArray[i * 3 + 1] = y;
        posArray[i * 3 + 2] = z;

        const twinkle = 0.5 + 0.5 * Math.sin(time * pd.twinkleSpeed + pd.twinklePhase);
        const zNorm = (z + 20) / 40;
        const hue = 0.65 - zNorm * 0.1;
        const color = new THREE.Color();
        color.setHSL(hue, 0.6, 0.35 + twinkle * 0.2);
        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;

        sizeArray[i] = 0.05 + twinkle * 0.08;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;

    if (hasAudioData) {
      this.particles.rotation.y += 0.002;
    } else {
      this.particles.rotation.y += 0.0005;
    }
  }

  public dispose(): void {
    this.stopAll();
    this.geometry.dispose();
    this.material.dispose();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
