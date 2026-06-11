import * as THREE from 'three';
import { gsap } from 'gsap';
import { SceneBuilder, ChimeTube } from './scene';
import { ParticleSystem } from './particles';
import { AudioManager } from './audio';
import { InteractionManager } from './interaction';

class App {
  private sceneBuilder!: SceneBuilder;
  private particleSystem!: ParticleSystem;
  private audioManager!: AudioManager;
  private interactionManager!: InteractionManager;

  private clock: THREE.Clock;
  private container!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private animationFrameId: number = 0;
  private time: number = 0;

  constructor() {
    this.clock = new THREE.Clock();
    this.init();
  }

  private init(): void {
    this.container = document.getElementById('app')!;
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);

    this.sceneBuilder = new SceneBuilder(this.canvas);
    this.particleSystem = new ParticleSystem(this.sceneBuilder.scene);
    this.audioManager = new AudioManager();

    this.interactionManager = new InteractionManager(
      this.sceneBuilder,
      this.particleSystem,
      this.audioManager,
      this.container
    );

    this.setupResizeHandler();
    this.setupInitialState();
    this.animate();
  }

  private setupInitialState(): void {
    this.sceneBuilder.setWindStrength(5.0);
    this.sceneBuilder.setAmbientIntensity(0.5);
    this.audioManager.setReverbTime(1.0);

    gsap.from(this.sceneBuilder.camera.position, {
      y: 3.2,
      z: 6.0,
      duration: 2.5,
      ease: 'power3.out'
    });

    staggerChimes(this.sceneBuilder.chimeTubes);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.sceneBuilder.resize(width, height);
    });
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(0.05, this.clock.getDelta());
    this.time += delta;

    this.sceneBuilder.update(delta, this.time);
    this.particleSystem.update(delta, this.time);
    this.interactionManager.update(delta, this.time);

    this.sceneBuilder.render();
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.particleSystem.dispose();
    this.interactionManager.dispose();
    this.sceneBuilder.renderer.dispose();
  }
}

function staggerChimes(tubes: ChimeTube[]): void {
  tubes.forEach((tube, i) => {
    gsap.delayedCall(i * 0.35, () => {
      const euler = new THREE.Euler(
        (Math.random() - 0.5) * 0.06,
        0,
        (Math.random() - 0.5) * 0.06
      );
      gsap.to(tube.mesh.rotation, {
        x: euler.x,
        z: euler.z,
        duration: 1.8,
        ease: 'elastic.out(1, 0.5)',
        yoyo: true,
        repeat: 1
      });
    });
  });
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  app?.dispose();
});
