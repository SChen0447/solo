import * as THREE from 'three';

export type MusicType = 'waltz' | 'march' | 'ballad' | null;

interface ParticleData {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  size: number;
  rotationSpeed: number;
  floatAmplitude: number;
  floatFrequency: number;
  floatOffset: number;
  theta: number;
  phi: number;
  spiralAngle: number;
  spiralRadius: number;
  mouseInfluence: number;
  musicOffset: THREE.Vector3;
}

interface MusicConfig {
  name: string;
  duration: number;
  colorShift: THREE.Color;
  tempo: 'fast' | 'medium' | 'slow';
  beatInterval: number;
}

const MUSIC_CONFIGS: Record<string, MusicConfig> = {
  waltz: {
    name: '星尘圆舞曲',
    duration: 30000,
    colorShift: new THREE.Color(0xff6b6b),
    tempo: 'medium',
    beatInterval: 600
  },
  march: {
    name: '光粒进行曲',
    duration: 35000,
    colorShift: new THREE.Color(0x48dbfb),
    tempo: 'fast',
    beatInterval: 400
  },
  ballad: {
    name: '银河叙事诗',
    duration: 40000,
    colorShift: new THREE.Color(0xa29bfe),
    tempo: 'slow',
    beatInterval: 1000
  }
};

const COLOR_PALETTE = [
  new THREE.Color(0xff6b6b),
  new THREE.Color(0xff9ff3),
  new THREE.Color(0x48dbfb),
  new THREE.Color(0xfeca57),
  new THREE.Color(0xa29bfe)
];

const MAX_CONNECTIONS = 800;
const CONNECTION_DISTANCE = 40;
const GRID_CELL_SIZE = 40;

export class StarNebula {
  private scene: THREE.Scene;
  private particleCount: number;
  private baseRadius: number;
  private particles!: THREE.Points;
  private particleData: ParticleData[] = [];
  private connections!: THREE.LineSegments;
  private connectionGeometry!: THREE.BufferGeometry;
  private connectionPositions: Float32Array = new Float32Array(MAX_CONNECTIONS * 6);
  private connectionColors: Float32Array = new Float32Array(MAX_CONNECTIONS * 6);
  private spatialGrid: Map<string, number[]> = new Map();
  
  private currentMusic: MusicType = null;
  private musicStartTime: number = 0;
  private lastBeatTime: number = 0;
  private burstPhase: number = 0;
  private burstActive: boolean = false;
  private spiralPhase: number = 0;
  
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private mouseWorldPosition: THREE.Vector3 = new THREE.Vector3();
  private isMouseOverParticles: boolean = false;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private camera: THREE.PerspectiveCamera;
  
  private rotationAngle: number = 0;
  private readonly rotationPeriod: number = 8000;
  
  private responsiveConfig: {
    radius: number;
    particleCount: number;
  };

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.responsiveConfig = this.getResponsiveConfig();
    this.baseRadius = this.responsiveConfig.radius;
    this.particleCount = this.responsiveConfig.particleCount;
    
    this.initParticles();
    this.initConnections();
    this.setupEventListeners();
  }

  private getResponsiveConfig() {
    const width = window.innerWidth;
    if (width >= 1200) {
      return { radius: 250, particleCount: 4000 };
    } else if (width >= 768) {
      return { radius: 200, particleCount: 3000 };
    } else {
      return { radius: 150, particleCount: 2000 };
    }
  }

  private initParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = this.baseRadius * Math.sin(phi) * Math.cos(theta);
      const y = this.baseRadius * Math.sin(phi) * Math.sin(theta);
      const z = this.baseRadius * Math.cos(phi);
      
      const basePosition = new THREE.Vector3(x, y, z);
      
      const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
      const nextColorIndex = (colorIndex + 1) % COLOR_PALETTE.length;
      const t = Math.random();
      const baseColor = COLOR_PALETTE[colorIndex].clone().lerp(COLOR_PALETTE[nextColorIndex], t);
      
      const size = 1 + Math.random() * 3;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
      
      sizes[i] = size;
      
      this.particleData.push({
        basePosition: basePosition.clone(),
        currentPosition: basePosition.clone(),
        velocity: new THREE.Vector3(),
        color: baseColor.clone(),
        baseColor: baseColor.clone(),
        size,
        rotationSpeed: (0.8 + Math.random() * 0.4) * (Math.PI * 2 / this.rotationPeriod),
        floatAmplitude: 1 + Math.random() * 2,
        floatFrequency: 1 + Math.random() * 2,
        floatOffset: Math.random() * Math.PI * 2,
        theta,
        phi,
        spiralAngle: Math.random() * Math.PI * 2,
        spiralRadius: 30 + Math.random() * 50,
        mouseInfluence: 0,
        musicOffset: new THREE.Vector3()
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const glowTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      map: glowTexture,
      alphaTest: 0.01
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private initConnections() {
    this.connectionGeometry = new THREE.BufferGeometry();
    
    for (let i = 0; i < MAX_CONNECTIONS * 6; i++) {
      this.connectionPositions[i] = 0;
      this.connectionColors[i] = 0;
    }
    
    this.connectionGeometry.setAttribute('position', new THREE.BufferAttribute(this.connectionPositions, 3));
    this.connectionGeometry.setAttribute('color', new THREE.BufferAttribute(this.connectionColors, 3));
    
    const connectionMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1
    });
    
    this.connections = new THREE.LineSegments(this.connectionGeometry, connectionMaterial);
    this.scene.add(this.connections);
  }

  private setupEventListeners() {
    const canvas = this.camera.userData.canvas;
    if (canvas) {
      canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
      canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    }
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseMove(event: MouseEvent) {
    const canvas = event.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    this.mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mousePosition, this.camera);
    const distance = this.camera.position.length();
    this.mouseWorldPosition.copy(this.raycaster.ray.direction).multiplyScalar(distance * 0.5);
    
    const intersects = this.raycaster.intersectObject(this.particles);
    this.isMouseOverParticles = intersects.length > 0;
  }

  private onMouseLeave() {
    this.isMouseOverParticles = false;
  }

  private onResize() {
    const newConfig = this.getResponsiveConfig();
    if (newConfig.particleCount !== this.particleCount || newConfig.radius !== this.baseRadius) {
      this.scene.remove(this.particles);
      this.scene.remove(this.connections);
      this.particleData = [];
      this.responsiveConfig = newConfig;
      this.baseRadius = newConfig.radius;
      this.particleCount = newConfig.particleCount;
      this.initParticles();
      this.initConnections();
    }
  }

  public playMusic(type: MusicType) {
    this.currentMusic = type;
    this.musicStartTime = performance.now();
    this.lastBeatTime = 0;
    this.burstPhase = 0;
    this.spiralPhase = 0;
    this.burstActive = false;
  }

  public getProgress(): number {
    if (!this.currentMusic) return 0;
    const config = MUSIC_CONFIGS[this.currentMusic];
    const elapsed = performance.now() - this.musicStartTime;
    return Math.min(elapsed / config.duration, 1);
  }

  public getCurrentMusic(): MusicType {
    return this.currentMusic;
  }

  public update(deltaTime: number, elapsedTime: number) {
    this.rotationAngle += deltaTime * (Math.PI * 2 / this.rotationPeriod);
    
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;
    
    let musicConfig: MusicConfig | null = null;
    let colorShiftAmount = 0;
    
    if (this.currentMusic) {
      musicConfig = MUSIC_CONFIGS[this.currentMusic];
      const musicElapsed = elapsedTime - this.musicStartTime;
      colorShiftAmount = Math.min(musicElapsed / 2000, 1);
      
      const beatProgress = (musicElapsed % musicConfig.beatInterval) / musicConfig.beatInterval;
      
      if (musicConfig.tempo === 'fast') {
        if (Math.floor(musicElapsed / musicConfig.beatInterval) > Math.floor(this.lastBeatTime / musicConfig.beatInterval)) {
          this.burstActive = true;
          this.burstPhase = 0;
        }
        if (this.burstActive) {
          this.burstPhase += deltaTime / 1200;
          if (this.burstPhase >= 1) {
            this.burstActive = false;
            this.burstPhase = 0;
          }
        }
      } else if (musicConfig.tempo === 'slow') {
        this.spiralPhase += deltaTime / 3000 * Math.PI * 2;
      }
      
      this.lastBeatTime = musicElapsed;
      
      if (musicElapsed >= musicConfig.duration) {
        this.currentMusic = null;
        colorShiftAmount = 0;
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];
      
      const rotatedTheta = data.theta + this.rotationAngle * data.rotationSpeed * 1000 * deltaTime;
      
      const floatOffset = Math.sin(elapsedTime * data.floatFrequency * 0.001 + data.floatOffset) * data.floatAmplitude;
      
      let radius = this.baseRadius + floatOffset;
      
      let offsetX = 0, offsetY = 0, offsetZ = 0;
      
      if (this.burstActive && musicConfig?.tempo === 'fast') {
        const burstEasing = this.burstPhase < 0.3 
          ? this.burstPhase / 0.3 
          : 1 - (this.burstPhase - 0.3) / 0.7;
        const burstAmount = 50 * burstEasing;
        const dir = data.basePosition.clone().normalize();
        if (this.burstPhase < 0.3) {
          offsetX = -dir.x * burstAmount;
          offsetY = -dir.y * burstAmount;
          offsetZ = -dir.z * burstAmount;
        } else {
          offsetX = dir.x * burstAmount * 1.5;
          offsetY = dir.y * burstAmount * 1.5;
          offsetZ = dir.z * burstAmount * 1.5;
        }
      }
      
      if (musicConfig?.tempo === 'slow' && this.currentMusic) {
        const spiralAngle = this.spiralPhase + data.spiralAngle;
        const spiralHeight = Math.sin(this.spiralPhase * 2) * 30;
        offsetX += Math.cos(spiralAngle) * data.spiralRadius * 0.3;
        offsetY += spiralHeight * 0.3;
        offsetZ += Math.sin(spiralAngle) * data.spiralRadius * 0.3;
      }
      
      if (this.isMouseOverParticles) {
        const toMouse = new THREE.Vector3().subVectors(this.mouseWorldPosition, data.currentPosition);
        const dist = toMouse.length();
        
        if (dist < 60) {
          const influence = 1 - dist / 60;
          data.mouseInfluence = Math.min(data.mouseInfluence + deltaTime * 2, influence * 3);
          
          const attractForce = toMouse.normalize().multiplyScalar(influence * 2);
          data.velocity.add(attractForce);
        }
      } else {
        data.mouseInfluence = Math.max(0, data.mouseInfluence - deltaTime * 0.5);
      }
      
      data.velocity.multiplyScalar(0.95);
      
      const baseX = radius * Math.sin(data.phi) * Math.cos(rotatedTheta);
      const baseY = radius * Math.sin(data.phi) * Math.sin(rotatedTheta);
      const baseZ = radius * Math.cos(data.phi);
      
      const speedMultiplier = 1 + data.mouseInfluence * 2;
      
      data.currentPosition.x = baseX + offsetX + data.velocity.x * speedMultiplier;
      data.currentPosition.y = baseY + offsetY + data.velocity.y * speedMultiplier;
      data.currentPosition.z = baseZ + offsetZ + data.velocity.z * speedMultiplier;
      
      data.currentPosition.lerp(new THREE.Vector3(baseX, baseY, baseZ), 0.02 * (1 - data.mouseInfluence));
      
      positions[i * 3] = data.currentPosition.x;
      positions[i * 3 + 1] = data.currentPosition.y;
      positions[i * 3 + 2] = data.currentPosition.z;
      
      if (musicConfig && colorShiftAmount > 0) {
        data.color.copy(data.baseColor).lerp(musicConfig.colorShift, colorShiftAmount * 0.6);
      } else {
        data.color.copy(data.baseColor);
      }
      
      const brightness = 0.8 + Math.sin(elapsedTime * 0.002 + data.floatOffset) * 0.2;
      colors[i * 3] = data.color.r * brightness;
      colors[i * 3 + 1] = data.color.g * brightness;
      colors[i * 3 + 2] = data.color.b * brightness;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    
    this.updateConnections();
  }

  private updateConnections() {
    let connectionIndex = 0;
    const posAttr = this.connectionGeometry.attributes.position;
    const colAttr = this.connectionGeometry.attributes.color;
    
    for (let i = 0; i < this.particleCount && connectionIndex < MAX_CONNECTIONS; i++) {
      for (let j = i + 1; j < this.particleCount && connectionIndex < MAX_CONNECTIONS; j++) {
        const dist = this.particleData[i].currentPosition.distanceTo(this.particleData[j].currentPosition);
        
        if (dist < CONNECTION_DISTANCE) {
          const alpha = 1 - dist / CONNECTION_DISTANCE;
          const alpha5 = alpha * 0.5;
          
          const p1 = this.particleData[i].currentPosition;
          const p2 = this.particleData[j].currentPosition;
          const c1 = this.particleData[i].color;
          const c2 = this.particleData[j].color;
          
          const baseIdx = connectionIndex * 6;
          this.connectionPositions[baseIdx] = p1.x;
          this.connectionPositions[baseIdx + 1] = p1.y;
          this.connectionPositions[baseIdx + 2] = p1.z;
          this.connectionPositions[baseIdx + 3] = p2.x;
          this.connectionPositions[baseIdx + 4] = p2.y;
          this.connectionPositions[baseIdx + 5] = p2.z;
          
          this.connectionColors[baseIdx] = c1.r * alpha5;
          this.connectionColors[baseIdx + 1] = c1.g * alpha5;
          this.connectionColors[baseIdx + 2] = c1.b * alpha5;
          this.connectionColors[baseIdx + 3] = c2.r * alpha5;
          this.connectionColors[baseIdx + 4] = c2.g * alpha5;
          this.connectionColors[baseIdx + 5] = c2.b * alpha5;
          
          connectionIndex++;
        }
      }
    }
    
    for (let i = connectionIndex * 6; i < MAX_CONNECTIONS * 6; i++) {
      this.connectionPositions[i] = 0;
      this.connectionColors[i] = 0;
    }
    
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.connectionGeometry.setDrawRange(0, connectionIndex * 2);
  }

  public dispose() {
    this.scene.remove(this.particles);
    this.scene.remove(this.connections);
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.connectionGeometry.dispose();
    (this.connections.material as THREE.Material).dispose();
  }
}
