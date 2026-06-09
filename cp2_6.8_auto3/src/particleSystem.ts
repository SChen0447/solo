import * as THREE from 'three';

export type ParticleMode = 'vortex' | 'explode' | 'wave';

export interface ParticleSystemOptions {
  particleCount: number;
  text: string;
  mode: ParticleMode;
  speed: number;
  intensity: number;
  particleSize: number;
}

const DEFAULT_OPTIONS: ParticleSystemOptions = {
  particleCount: 6000,
  text: 'FLOW',
  mode: 'vortex',
  speed: 1,
  intensity: 1,
  particleSize: 0.5
};

export class ParticleSystem {
  private options: ParticleSystemOptions;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private points!: THREE.Points;
  
  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private colors: Float32Array;
  private randomOffsets: Float32Array;
  
  private targetMode: ParticleMode;
  private modeTransition: number = 1;
  private transitionDuration: number = 1000;
  private transitionStart: number = 0;
  
  private speed: number;
  private intensity: number;
  private particleSize: number;
  private audioValue: number = 0;
  
  private text: string;
  
  private worker: Worker | null = null;
  private useWorker: boolean = true;

  constructor(options: Partial<ParticleSystemOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.targetMode = this.options.mode;
    this.speed = this.options.speed;
    this.intensity = this.options.intensity;
    this.particleSize = this.options.particleSize;
    this.text = this.options.text;
    
    const count = this.options.particleCount;
    this.basePositions = new Float32Array(count * 3);
    this.currentPositions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.randomOffsets = new Float32Array(count * 3);
    
    this.initRandomOffsets();
    this.createGeometry();
    this.createMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    
    this.setText(this.text);
    
    if (this.useWorker && typeof Worker !== 'undefined') {
      this.initWorker();
    }
  }

  private initRandomOffsets(): void {
    const count = this.options.particleCount;
    for (let i = 0; i < count; i++) {
      this.randomOffsets[i * 3] = Math.random() * 2 - 1;
      this.randomOffsets[i * 3 + 1] = Math.random() * 2 - 1;
      this.randomOffsets[i * 3 + 2] = Math.random() * 2 - 1;
    }
  }

  private createGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  private createMaterial(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    this.material = new THREE.PointsMaterial({
      size: this.particleSize,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }

  private initWorker(): void {
    try {
      const workerBlob = new Blob([this.getWorkerScript()], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (e: MessageEvent) => {
        const { positions, colors } = e.data;
        const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
        
        (posAttr.array as Float32Array).set(positions);
        (colAttr.array as Float32Array).set(colors);
        
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      };
    } catch (e) {
      console.warn('Web Worker initialization failed, falling back to main thread');
      this.useWorker = false;
    }
  }

  private getWorkerScript(): string {
    return `
      self.onmessage = function(e) {
        const { basePositions, randomOffsets, mode, speed, intensity, audioValue, time, particleCount } = e.data;
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const t = time * speed * 0.001;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          let x = basePositions[i3];
          let y = basePositions[i3 + 1];
          let z = basePositions[i3 + 2];
          
          const rx = randomOffsets[i3];
          const ry = randomOffsets[i3 + 1];
          const rz = randomOffsets[i3 + 2];
          
          if (mode === 'vortex') {
            const angle = t * 2 + rx * Math.PI * 2;
            const radius = 2 + ry * 3 + audioValue * 2;
            const heightOffset = Math.sin(t * 1.5 + rz * 3) * 1.5;
            x += Math.cos(angle) * radius;
            y += Math.sin(angle) * radius * 0.5 + heightOffset;
            z += Math.sin(angle) * radius;
          } else if (mode === 'explode') {
            const dist = (1 + audioValue * 2) * (2 + Math.abs(rx) * 4);
            const pulse = Math.sin(t * 3 + i * 0.01) * 0.3 + 1;
            x += rx * dist * pulse;
            y += ry * dist * pulse;
            z += rz * dist * pulse;
          } else if (mode === 'wave') {
            const waveY = Math.sin(t * 2 + x * 0.3 + rz * 2) * 2 * intensity;
            const waveZ = Math.cos(t * 1.5 + y * 0.2 + rx * 2) * 1.5;
            y += waveY;
            z += waveZ;
            x += Math.sin(t + rz * 3) * 0.5;
          }
          
          positions[i3] = x;
          positions[i3 + 1] = y;
          positions[i3 + 2] = z;
          
          const yNorm = (y + 8) / 16;
          const colorT = Math.max(0, Math.min(1, yNorm));
          
          let r, g, b;
          if (colorT < 0.33) {
            const t2 = colorT / 0.33;
            r = 0.1 + t2 * 0.2;
            g = 0.1 + t2 * 0.2;
            b = 0.5 + t2 * 0.3;
          } else if (colorT < 0.66) {
            const t2 = (colorT - 0.33) / 0.33;
            r = 0.3 + t2 * 0.3;
            g = 0.3 + t2 * 0.1;
            b = 0.8 - t2 * 0.1;
          } else {
            const t2 = (colorT - 0.66) / 0.34;
            r = 0.6 + t2 * 0.4;
            g = 0.4 - t2 * 0.2;
            b = 0.7 - t2 * 0.3;
          }
          
          const brightness = 0.8 + audioValue * 0.4 * intensity;
          colors[i3] = Math.min(1, r * brightness);
          colors[i3 + 1] = Math.min(1, g * brightness);
          colors[i3 + 2] = Math.min(1, b * brightness);
        }
        
        self.postMessage({ positions, colors });
      };
    `;
  }

  public setText(text: string): void {
    this.text = text;
    this.sampleTextToParticles(text);
  }

  private sampleTextToParticles(text: string): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const fontSize = 200;
    const padding = 40;
    
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padding, canvas.height / 2);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const pixelPositions: { x: number; y: number }[] = [];
    
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const index = (y * canvas.width + x) * 4;
        if (data[index + 3] > 128) {
          pixelPositions.push({ x, y });
        }
      }
    }
    
    const count = this.options.particleCount;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 0.05;
    
    if (pixelPositions.length > 0) {
      for (let i = 0; i < count; i++) {
        const pixelIndex = Math.floor(Math.random() * pixelPositions.length);
        const pixel = pixelPositions[pixelIndex];
        
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetY = (Math.random() - 0.5) * 2;
        const offsetZ = (Math.random() - 0.5) * 3;
        
        this.basePositions[i * 3] = (pixel.x - centerX + offsetX) * scale;
        this.basePositions[i * 3 + 1] = -(pixel.y - centerY + offsetY) * scale;
        this.basePositions[i * 3 + 2] = offsetZ;
        
        this.currentPositions[i * 3] = this.basePositions[i * 3];
        this.currentPositions[i * 3 + 1] = this.basePositions[i * 3 + 1];
        this.currentPositions[i * 3 + 2] = this.basePositions[i * 3 + 2];
        
        this.sizes[i] = this.particleSize * (0.5 + Math.random() * 0.5);
      }
    }
    
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  public setMode(mode: ParticleMode): void {
    if (this.targetMode === mode) return;
    this.targetMode = mode;
    this.modeTransition = 0;
    this.transitionStart = performance.now();
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public setIntensity(intensity: number): void {
    this.intensity = intensity;
  }

  public setParticleSize(size: number): void {
    this.particleSize = size;
    this.material.size = size;
  }

  public setAudioValue(value: number): void {
    this.audioValue = Math.max(0, Math.min(1, value));
  }

  public getMesh(): THREE.Points {
    return this.points;
  }

  public update(time: number): void {
    if (this.modeTransition < 1) {
      const elapsed = time - this.transitionStart;
      this.modeTransition = Math.min(1, elapsed / this.transitionDuration);
    }
    
    const audioSizeMod = 1 + this.audioValue * 0.8;
    this.material.size = this.particleSize * audioSizeMod;
    
    if (this.useWorker && this.worker) {
      this.worker.postMessage({
        basePositions: this.basePositions,
        randomOffsets: this.randomOffsets,
        mode: this.targetMode,
        speed: this.speed,
        intensity: this.intensity,
        audioValue: this.audioValue,
        time,
        particleCount: this.options.particleCount
      });
    } else {
      this.updateMainThread(time);
    }
    
    this.points.rotation.y = time * 0.0001 * this.speed;
  }

  private updateMainThread(time: number): void {
    const count = this.options.particleCount;
    const t = time * this.speed * 0.001;
    const mode = this.targetMode;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let x = this.basePositions[i3];
      let y = this.basePositions[i3 + 1];
      let z = this.basePositions[i3 + 2];
      
      const rx = this.randomOffsets[i3];
      const ry = this.randomOffsets[i3 + 1];
      const rz = this.randomOffsets[i3 + 2];
      
      if (mode === 'vortex') {
        const angle = t * 2 + rx * Math.PI * 2;
        const radius = 2 + ry * 3 + this.audioValue * 2;
        const heightOffset = Math.sin(t * 1.5 + rz * 3) * 1.5;
        x += Math.cos(angle) * radius;
        y += Math.sin(angle) * radius * 0.5 + heightOffset;
        z += Math.sin(angle) * radius;
      } else if (mode === 'explode') {
        const dist = (1 + this.audioValue * 2) * (2 + Math.abs(rx) * 4);
        const pulse = Math.sin(t * 3 + i * 0.01) * 0.3 + 1;
        x += rx * dist * pulse;
        y += ry * dist * pulse;
        z += rz * dist * pulse;
      } else if (mode === 'wave') {
        const waveY = Math.sin(t * 2 + x * 0.3 + rz * 2) * 2 * this.intensity;
        const waveZ = Math.cos(t * 1.5 + y * 0.2 + rx * 2) * 1.5;
        y += waveY;
        z += waveZ;
        x += Math.sin(t + rz * 3) * 0.5;
      }
      
      this.currentPositions[i3] = x;
      this.currentPositions[i3 + 1] = y;
      this.currentPositions[i3 + 2] = z;
      
      const yNorm = (y + 8) / 16;
      const colorT = Math.max(0, Math.min(1, yNorm));
      
      let r, g, b;
      if (colorT < 0.33) {
        const t2 = colorT / 0.33;
        r = 0.1 + t2 * 0.2;
        g = 0.1 + t2 * 0.2;
        b = 0.5 + t2 * 0.3;
      } else if (colorT < 0.66) {
        const t2 = (colorT - 0.33) / 0.33;
        r = 0.3 + t2 * 0.3;
        g = 0.3 + t2 * 0.1;
        b = 0.8 - t2 * 0.1;
      } else {
        const t2 = (colorT - 0.66) / 0.34;
        r = 0.6 + t2 * 0.4;
        g = 0.4 - t2 * 0.2;
        b = 0.7 - t2 * 0.3;
      }
      
      const brightness = 0.8 + this.audioValue * 0.4 * this.intensity;
      this.colors[i3] = Math.min(1, r * brightness);
      this.colors[i3 + 1] = Math.min(1, g * brightness);
      this.colors[i3 + 2] = Math.min(1, b * brightness);
    }
    
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}
