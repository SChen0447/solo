import * as THREE from 'three';
import { StalactiteSystem, StalactiteData } from './stalactites';

export interface CameraRotation {
  x: number;
  y: number;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private stalactiteSystem: StalactiteSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };

  public cameraRotation: CameraRotation = { x: 0, y: 0 };
  private minPolarAngle: number = -Math.PI / 4;
  private maxPolarAngle: number = Math.PI / 4;
  private cameraDistance: number = 3;

  private hoveredStalactite: StalactiteData | null = null;
  private audioContext: AudioContext | null = null;
  private activeSounds: Map<number, { osc: OscillatorNode; gain: GainNode }> = new Map();

  private onStalactiteHover: ((data: StalactiteData | null) => void) | null = null;

  constructor(
    _scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    stalactiteSystem: StalactiteSystem
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.stalactiteSystem = stalactiteSystem;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.initAudio();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
    this.rotationVelocity = { x: 0, y: 0 };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event.clientX, event.clientY);

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.rotationVelocity.y = deltaX * 0.005;
      this.rotationVelocity.x = deltaY * 0.005;

      this.cameraRotation.y += deltaX * 0.005;
      this.cameraRotation.x += deltaY * 0.005;

      this.cameraRotation.x = Math.max(
        this.minPolarAngle,
        Math.min(this.maxPolarAngle, this.cameraRotation.x)
      );

      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    this.checkHover();
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      this.rotationVelocity = { x: 0, y: 0 };

      this.updateMousePosition(event.touches[0].clientX, event.touches[0].clientY);
      this.checkHover();
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
    if (this.hoveredStalactite) {
      this.stalactiteSystem.deactivateStalactite(this.hoveredStalactite);
      this.stopTone(this.hoveredStalactite.index);
      this.hoveredStalactite = null;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isDragging) {
      event.preventDefault();
      const touch = event.touches[0];

      const deltaX = touch.clientX - this.previousMousePosition.x;
      const deltaY = touch.clientY - this.previousMousePosition.y;

      this.rotationVelocity.y = deltaX * 0.005;
      this.rotationVelocity.x = deltaY * 0.005;

      this.cameraRotation.y += deltaX * 0.005;
      this.cameraRotation.x += deltaY * 0.005;

      this.cameraRotation.x = Math.max(
        this.minPolarAngle,
        Math.min(this.maxPolarAngle, this.cameraRotation.x)
      );

      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
    }
  }

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const stalactites = this.stalactiteSystem.getStalactites();
    const meshes = stalactites.map((s) => s.mesh);

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const data = (hitMesh as any).userData.stalactite as StalactiteData;

      if (data && data !== this.hoveredStalactite) {
        if (this.hoveredStalactite) {
          this.stalactiteSystem.deactivateStalactite(this.hoveredStalactite);
          this.stopTone(this.hoveredStalactite.index);
        }

        this.hoveredStalactite = data;
        this.stalactiteSystem.activateStalactite(data);
        this.playTone(data);

        if (this.onStalactiteHover) {
          this.onStalactiteHover(data);
        }
      }
    } else {
      if (this.hoveredStalactite) {
        this.stalactiteSystem.deactivateStalactite(this.hoveredStalactite);
        this.stopTone(this.hoveredStalactite.index);
        this.hoveredStalactite = null;

        if (this.onStalactiteHover) {
          this.onStalactiteHover(null);
        }
      }
    }
  }

  private playTone(data: StalactiteData): void {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ratio = data.height / 2.0;

    const minFreq = this.midiToFreq(48);
    const maxFreq = this.midiToFreq(72);
    const freq = minFreq + (maxFreq - minFreq) * (1 - ratio);

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.08, this.audioContext.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    this.activeSounds.set(data.index, { osc: oscillator, gain: gainNode });
  }

  private stopTone(index: number): void {
    const sound = this.activeSounds.get(index);
    if (sound && this.audioContext) {
      const { osc, gain } = sound;
      gain.gain.cancelScheduledValues(this.audioContext.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
      osc.stop(this.audioContext.currentTime + 0.5);

      osc.onended = () => {
        this.activeSounds.delete(index);
      };
    }
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public update(_delta: number): void {
    if (!this.isDragging) {
      this.cameraRotation.y += this.rotationVelocity.y;
      this.cameraRotation.x += this.rotationVelocity.x;

      this.rotationVelocity.y *= 0.95;
      this.rotationVelocity.x *= 0.95;

      this.cameraRotation.x = Math.max(
        this.minPolarAngle,
        Math.min(this.maxPolarAngle, this.cameraRotation.x)
      );
    }

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x =
      this.cameraDistance *
      Math.cos(this.cameraRotation.x) *
      Math.sin(this.cameraRotation.y);
    const y = this.cameraDistance * Math.sin(this.cameraRotation.x);
    const z =
      this.cameraDistance *
      Math.cos(this.cameraRotation.x) *
      Math.cos(this.cameraRotation.y);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, -0.5, 0);
  }

  public setOnStalactiteHover(callback: (data: StalactiteData | null) => void): void {
    this.onStalactiteHover = callback;
  }

  public getHoveredStalactite(): StalactiteData | null {
    return this.hoveredStalactite;
  }

  public getCameraRotation(): CameraRotation {
    return { ...this.cameraRotation };
  }

  public resize(): void {
    const container = this.renderer.domElement.parentElement;
    if (container) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  public dispose(): void {
    this.activeSounds.forEach((sound) => {
      try {
        sound.osc.stop();
      } catch (e) {}
    });
    this.activeSounds.clear();

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
