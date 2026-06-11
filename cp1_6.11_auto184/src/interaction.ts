import * as THREE from 'three';
import { SceneBuilder, ChimeTube } from './scene';
import { ParticleSystem } from './particles';
import { AudioManager } from './audio';

export interface ControlValues {
  wind: number;
  particleCount: number;
  reverb: number;
  ambient: number;
}

export class InteractionManager {
  private sceneBuilder: SceneBuilder;
  private particleSystem: ParticleSystem;
  private audioManager: AudioManager;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private isDragging: boolean = false;
  private lastMouseWorld: THREE.Vector3 = new THREE.Vector3();
  private mouseVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastFrameTime: number = 0;
  private lastResonanceTime: Map<number, number> = new Map();

  public controls: ControlValues = {
    wind: 5.0,
    particleCount: 80,
    reverb: 1.0,
    ambient: 0.5
  };

  private onTubeTriggered?: (tube: ChimeTube, velocity: number) => void;
  private onControlChanged?: (key: keyof ControlValues, value: number) => void;

  constructor(
    sceneBuilder: SceneBuilder,
    particleSystem: ParticleSystem,
    audioManager: AudioManager,
    domElement: HTMLElement,
    onTubeTriggered?: (tube: ChimeTube, velocity: number) => void,
    onControlChanged?: (key: keyof ControlValues, value: number) => void
  ) {
    this.sceneBuilder = sceneBuilder;
    this.particleSystem = particleSystem;
    this.audioManager = audioManager;
    this.camera = sceneBuilder.camera;
    this.domElement = domElement;
    this.onTubeTriggered = onTubeTriggered;
    this.onControlChanged = onControlChanged;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 30;
    this.pointer = new THREE.Vector2(-10, -10);

    this.setupEventListeners();
    this.setupControlPanel();
  }

  private setupEventListeners(): void {
    const canvas = this.domElement.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));
  }

  private setupControlPanel(): void {
    const windSlider = document.getElementById('wind-slider') as HTMLInputElement | null;
    const windValue = document.getElementById('wind-value') as HTMLElement | null;
    const particleSlider = document.getElementById('particle-slider') as HTMLInputElement | null;
    const particleValue = document.getElementById('particle-value') as HTMLElement | null;
    const reverbSlider = document.getElementById('reverb-slider') as HTMLInputElement | null;
    const reverbValue = document.getElementById('reverb-value') as HTMLElement | null;
    const ambientSlider = document.getElementById('ambient-slider') as HTMLInputElement | null;
    const ambientValue = document.getElementById('ambient-value') as HTMLElement | null;

    if (windSlider && windValue) {
      windSlider.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        this.controls.wind = v;
        windValue.textContent = v.toFixed(1);
        this.sceneBuilder.setWindStrength(v);
        this.onControlChanged?.('wind', v);
      });
    }

    if (particleSlider && particleValue) {
      particleSlider.addEventListener('input', (e) => {
        const v = parseInt((e.target as HTMLInputElement).value);
        this.controls.particleCount = v;
        particleValue.textContent = String(v);
        this.onControlChanged?.('particleCount', v);
      });
    }

    if (reverbSlider && reverbValue) {
      reverbSlider.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        this.controls.reverb = v;
        reverbValue.textContent = v.toFixed(2) + 's';
        this.audioManager.setReverbTime(v);
        this.onControlChanged?.('reverb', v);
      });
    }

    if (ambientSlider && ambientValue) {
      ambientSlider.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        this.controls.ambient = v;
        ambientValue.textContent = v.toFixed(2);
        this.sceneBuilder.setAmbientIntensity(v);
        this.onControlChanged?.('ambient', v);
      });
    }
  }

  private updatePointer(event: PointerEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedTube(): ChimeTube | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const tubeMeshes = this.sceneBuilder.chimeTubes.map(t => t.tubeMesh);
    const intersects = this.raycaster.intersectObjects(tubeMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      return this.sceneBuilder.chimeTubes.find(t => t.tubeMesh === hitMesh) || null;
    }
    return null;
  }

  private getMouseWorldPosition(y: number = 0.5): THREE.Vector3 {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.pointer, this.camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion), 0);
    plane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, y, 0)
    );

    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return target || new THREE.Vector3();
  }

  private onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.updatePointer(event);
    this.isDragging = true;

    const tube = this.getIntersectedTube();
    if (tube) {
      const velocity = 0.7 + Math.random() * 0.6;
      this.triggerTube(tube, velocity);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    this.updatePointer(event);
    const currentTime = performance.now() / 1000;

    const mouseWorld = this.getMouseWorldPosition(0.8);
    
    if (this.isDragging) {
      if (this.lastFrameTime > 0) {
        this.mouseVelocity.copy(mouseWorld).sub(this.lastMouseWorld);
        const velMag = this.mouseVelocity.length();
        
        const trailCount = Math.min(3, Math.ceil(velMag * 8));
        for (let i = 0; i < trailCount; i++) {
          const t = i / trailCount;
          const trailPos = this.lastMouseWorld.clone().lerp(mouseWorld, t);
          this.particleSystem.emitTrailParticle(trailPos);
        }

        this.particleSystem.attractNearbyParticles(mouseWorld, 2.0, 0.6);

        for (const tube of this.sceneBuilder.chimeTubes) {
          const tubeWorld = new THREE.Vector3();
          tube.mesh.getWorldPosition(tubeWorld);
          tubeWorld.y -= tube.length / 2;

          const dist = mouseWorld.distanceTo(tubeWorld);
          if (dist < 0.8) {
            const lastTime = this.lastResonanceTime.get(tube.id) || 0;
            if (currentTime - lastTime > 0.12) {
              const resonanceAmount = (1 - dist / 0.8) * Math.min(1, velMag * 4);
              const resonatedTube = this.sceneBuilder.addResonance(tube.id, resonanceAmount);
              if (resonatedTube) {
                this.audioManager.playResonance(tube.material, tube.length);
                this.lastResonanceTime.set(tube.id, currentTime);

                if (dist < 0.5) {
                  const midPoint = tubeWorld.clone();
                  this.particleSystem.emitSparkParticles(midPoint, tube.material, 4);
                }
              }
            }
          }
        }
      }
    }

    this.lastMouseWorld.copy(mouseWorld);
    this.lastFrameTime = currentTime;
  }

  private onPointerUp(event: PointerEvent): void {
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch (e) {}
    this.isDragging = false;
  }

  private onPointerLeave(event: PointerEvent): void {
    this.isDragging = false;
    this.pointer.set(-10, -10);
  }

  private triggerTube(tube: ChimeTube, velocity: number): void {
    const triggered = this.sceneBuilder.triggerTube(tube.id, velocity);
    if (!triggered) return;

    this.audioManager.playChime(tube.material, tube.length, velocity);

    const tubeWorld = new THREE.Vector3();
    tube.mesh.getWorldPosition(tubeWorld);
    tubeWorld.y -= tube.length / 2;

    const count = Math.floor(
      this.controls.particleCount * (0.7 + velocity * 0.6)
    );
    this.particleSystem.emitWaveParticles(tubeWorld, tube.material, count);
    this.particleSystem.emitSparkParticles(tubeWorld, tube.material, Math.floor(12 + velocity * 10));

    this.onTubeTriggered?.(tube, velocity);
  }

  public update(_delta: number, _time: number): void {}

  public dispose(): void {
    const canvas = this.domElement.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
      canvas.removeEventListener('pointermove', this.onPointerMove.bind(this));
      canvas.removeEventListener('pointerup', this.onPointerUp.bind(this));
      canvas.removeEventListener('pointerleave', this.onPointerLeave.bind(this));
    }
  }
}
