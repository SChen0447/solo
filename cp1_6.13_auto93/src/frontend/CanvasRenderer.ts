import * as THREE from 'three';
import gsap from 'gsap';
import type { Track, TrackPoint, InstrumentType } from '../shared/types';

const COLOR_LOW = new THREE.Color(0x6366f1);
const COLOR_HIGH = new THREE.Color(0xf97316);
const MAX_PARTICLES_PER_TRACK = 500;
const TRACK_WIDTH = 0.06;

interface TrackObject {
  track: THREE.Mesh;
  particles: THREE.Points;
  particlePositions: Float32Array;
  instrumentSprite: THREE.Sprite | null;
  tubeGeometry: THREE.TubeGeometry | null;
  opacity: number;
  isPlaying: boolean;
  pulseTween: gsap.core.Tween | null;
}

export class CanvasRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private trackObjects: Map<string, TrackObject> = new Map();
  private animationId: number | null = null;
  private isPlaying = false;
  private currentPlayTime = 0;
  private playStartTime = 0;
  private totalDuration = 8000;
  private particles: THREE.Points | null = null;
  private starField: THREE.Points | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 2, 10);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 4);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createStarField();
    this.setupResizeHandler();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 1, 10);
    pointLight1.position.set(-2, 2, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xf97316, 0.8, 10);
    pointLight2.position.set(2, -1, 2);
    this.scene.add(pointLight2);
  }

  private createStarField(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.6
    });
    
    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starField);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  };

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  addTrack(track: Track): void {
    if (this.trackObjects.has(track.id)) return;

    const trackObj = this.createTrackObject(track);
    this.trackObjects.set(track.id, trackObj);
    
    if (track.locked && track.instrument) {
      this.addInstrumentIcon(track);
    }
  }

  updateTrack(track: Track): void {
    const trackObj = this.trackObjects.get(track.id);
    if (!trackObj) return;

    this.updateTrackGeometry(trackObj, track);
    
    if (track.locked && !trackObj.instrumentSprite && track.instrument) {
      this.addInstrumentIcon(track);
    }
  }

  removeTrack(trackId: string): void {
    const trackObj = this.trackObjects.get(trackId);
    if (!trackObj) return;

    if (trackObj.track.geometry) {
      trackObj.track.geometry.dispose();
    }
    if (trackObj.track.material) {
      (trackObj.track.material as THREE.Material).dispose();
    }
    if (trackObj.particles.geometry) {
      trackObj.particles.geometry.dispose();
    }
    if (trackObj.particles.material) {
      (trackObj.particles.material as THREE.Material).dispose();
    }
    if (trackObj.instrumentSprite) {
      this.scene.remove(trackObj.instrumentSprite);
      if (trackObj.instrumentSprite.material) {
        (trackObj.instrumentSprite.material as THREE.Material).dispose();
      }
    }
    if (trackObj.pulseTween) {
      trackObj.pulseTween.kill();
    }

    this.scene.remove(trackObj.track);
    this.scene.remove(trackObj.particles);
    this.trackObjects.delete(trackId);
  }

  clearAllTracks(): void {
    for (const trackId of this.trackObjects.keys()) {
      this.removeTrack(trackId);
    }
  }

  private createTrackObject(track: Track): TrackObject {
    const tubeGeometry = this.createTubeGeometry(track.points);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(track.color),
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(tubeGeometry, material);
    this.scene.add(mesh);

    const { points: particlePoints, positions } = this.createParticles(track.points, track.color);
    this.scene.add(particlePoints);

    return {
      track: mesh,
      particles: particlePoints,
      particlePositions: positions,
      instrumentSprite: null,
      tubeGeometry: tubeGeometry,
      opacity: 0.6,
      isPlaying: false,
      pulseTween: null
    };
  }

  private createTubeGeometry(points: TrackPoint[]): THREE.TubeGeometry {
    if (points.length < 2) {
      const curve = new THREE.LineCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.001, 0, 0)
      );
      return new THREE.TubeGeometry(curve, 1, TRACK_WIDTH, 8, false);
    }

    const threePoints = points.map(
      (p) => new THREE.Vector3(this.mapX(p.x), this.mapY(p.y), p.z || 0)
    );

    const curve = new THREE.CatmullRomCurve3(threePoints);
    const segments = Math.min(points.length * 2, 200);
    
    return new THREE.TubeGeometry(curve, segments, TRACK_WIDTH, 8, false);
  }

  private updateTrackGeometry(trackObj: TrackObject, track: Track): void {
    if (trackObj.tubeGeometry) {
      trackObj.tubeGeometry.dispose();
    }

    const newGeometry = this.createTubeGeometry(track.points);
    trackObj.track.geometry = newGeometry;
    trackObj.tubeGeometry = newGeometry;

    const material = trackObj.track.material as THREE.MeshBasicMaterial;
    material.color.set(track.color);

    this.updateParticles(trackObj, track.points);
  }

  private createParticles(
    points: TrackPoint[],
    color: string
  ): { points: THREE.Points; positions: Float32Array } {
    const particleCount = Math.min(
      Math.floor(points.reduce((sum, p) => sum + p.velocity * 10, 0)),
      MAX_PARTICLES_PER_TRACK
    );

    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount && points.length > 0; i++) {
      const idx = Math.floor(Math.random() * points.length);
      const point = points[idx];
      const spread = point.velocity * 0.1;
      
      positions[i * 3] = this.mapX(point.x) + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = this.mapY(point.y) + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (point.z || 0) + (Math.random() - 0.5) * spread;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    return { points: new THREE.Points(geometry, material), positions };
  }

  private updateParticles(trackObj: TrackObject, points: TrackPoint[]): void {
    const particleCount = Math.min(
      Math.floor(points.reduce((sum, p) => sum + p.velocity * 10, 0)),
      MAX_PARTICLES_PER_TRACK
    );

    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount && points.length > 0; i++) {
      const idx = Math.floor(Math.random() * points.length);
      const point = points[idx];
      const spread = point.velocity * 0.1;
      
      positions[i * 3] = this.mapX(point.x) + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = this.mapY(point.y) + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (point.z || 0) + (Math.random() - 0.5) * spread;
    }

    trackObj.particlePositions = positions;
    const positionAttribute = trackObj.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    
    if (positionAttribute.array.length !== positions.length) {
      trackObj.particles.geometry.dispose();
      const newGeometry = new THREE.BufferGeometry();
      newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      trackObj.particles.geometry = newGeometry;
    } else {
      positionAttribute.array.set(positions);
      positionAttribute.needsUpdate = true;
    }
  }

  private addInstrumentIcon(track: Track): void {
    const trackObj = this.trackObjects.get(track.id);
    if (!trackObj || track.points.length === 0) return;

    const lastPoint = track.points[track.points.length - 1];
    const sprite = this.createInstrumentSprite(track.instrument);
    
    sprite.position.set(
      this.mapX(lastPoint.x),
      this.mapY(lastPoint.y),
      lastPoint.z || 0
    );
    sprite.scale.set(0.4, 0.4, 0.4);
    
    this.scene.add(sprite);
    trackObj.instrumentSprite = sprite;

    gsap.to(sprite.scale, {
      x: 0.5,
      y: 0.5,
      z: 0.5,
      duration: 0.5,
      ease: 'elastic.out(1, 0.5)',
      delay: 0.2
    });

    gsap.to(sprite.material, {
      opacity: 1,
      duration: 0.5,
      delay: 0.1
    });
  }

  private createInstrumentSprite(instrument: InstrumentType): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const icons: Record<InstrumentType, string> = {
      piano: '🎹',
      violin: '🎻',
      flute: '🎵',
      harp: '✨'
    };
    
    ctx.font = '48px serif';
    ctx.fillText(icons[instrument], 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0
    });

    return new THREE.Sprite(material);
  }

  getColorFromY(y: number): string {
    const t = Math.max(0, Math.min(1, 1 - y));
    const color = COLOR_LOW.clone().lerp(COLOR_HIGH, t);
    return '#' + color.getHexString();
  }

  private mapX(x: number): number {
    return (x - 0.5) * 4;
  }

  private mapY(y: number): number {
    return (0.5 - y) * 3;
  }

  startPlayback(duration?: number): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.playStartTime = performance.now();
    this.currentPlayTime = 0;
    
    if (duration) {
      this.totalDuration = duration;
    }

    gsap.to(this.camera.position, {
      x: 0,
      y: 3.5,
      z: 2,
      duration: 1,
      ease: 'power2.out'
    });
    
    gsap.to(this.camera.rotation, {
      x: -Math.PI / 3,
      duration: 1,
      ease: 'power2.out'
    });

    this.trackObjects.forEach((trackObj, index) => {
      trackObj.isPlaying = true;
      
      const material = trackObj.track.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6;
      
      trackObj.pulseTween = gsap.to(trackObj.track.scale, {
        x: 1.02,
        y: 1.02,
        z: 1.02,
        duration: 0.25,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: (index * this.totalDuration) / (this.trackObjects.size * 1000)
      });
    });
  }

  pausePlayback(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;

    this.trackObjects.forEach((trackObj) => {
      trackObj.isPlaying = false;
      if (trackObj.pulseTween) {
        trackObj.pulseTween.kill();
        trackObj.pulseTween = null;
      }
    });
  }

  resumePlayback(): void {
    if (this.isPlaying) return;
    this.startPlayback();
  }

  stopPlayback(): void {
    this.isPlaying = false;
    this.currentPlayTime = 0;

    gsap.to(this.camera.position, {
      x: 0,
      y: 0,
      z: 4,
      duration: 1,
      ease: 'power2.out'
    });
    
    gsap.to(this.camera.rotation, {
      x: 0,
      duration: 1,
      ease: 'power2.out'
    });

    this.trackObjects.forEach((trackObj) => {
      trackObj.isPlaying = false;
      if (trackObj.pulseTween) {
        trackObj.pulseTween.kill();
        trackObj.pulseTween = null;
      }
      
      const material = trackObj.track.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6;
    });
  }

  highlightTrack(trackId: string, highlight: boolean): void {
    const trackObj = this.trackObjects.get(trackId);
    if (!trackObj) return;

    const material = trackObj.track.material as THREE.MeshBasicMaterial;
    
    gsap.to(material, {
      opacity: highlight ? 1.0 : 0.6,
      duration: 0.3,
      ease: 'power2.out'
    });
  }

  getAverageColor(): string {
    let r = 0, g = 0, b = 0;
    let count = 0;

    this.trackObjects.forEach((trackObj) => {
      const material = trackObj.track.material as THREE.MeshBasicMaterial;
      const color = material.color;
      r += color.r;
      g += color.g;
      b += color.b;
      count++;
    });

    if (count === 0) return '#4a6fa5';

    r = Math.floor(r / count * 255);
    g = Math.floor(g / count * 255);
    b = Math.floor(b / count * 255);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.starField) {
      this.starField.rotation.y += 0.0002;
      this.starField.rotation.x += 0.0001;
    }

    this.trackObjects.forEach((trackObj) => {
      if (trackObj.instrumentSprite) {
        trackObj.instrumentSprite.rotation.y += 0.02;
      }
      
      if (trackObj.isPlaying) {
        const positions = trackObj.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = positions.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.002;
        }
        positions.needsUpdate = true;
      }
    });

    this.renderer.render(this.scene, this.camera);
  };

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.clearAllTracks();

    if (this.starField) {
      this.starField.geometry.dispose();
      (this.starField.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
