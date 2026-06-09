import * as THREE from 'three';
import { Coral } from './coral';

interface Seed {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  targetColor: number;
  startTime: number;
  spawned: boolean;
}

interface WarmParticle {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

interface Ripple {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  startRadius: number;
  endRadius: number;
}

interface SoundWave {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  position: THREE.Vector3;
}

interface Bubble {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  duration: number;
}

export class InteractionManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  corals: Coral[];
  seabedMesh: THREE.Mesh;
  oceanHeight: number;

  seeds: Seed[] = [];
  warmParticles: WarmParticle[] = [];
  ripples: Ripple[] = [];
  soundWaves: SoundWave[] = [];
  bubbles: Bubble[] = [];

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private lastWarmSpawn: number = 0;
  private seedGeometry: THREE.SphereGeometry;
  private warmParticleGeometry: THREE.SphereGeometry;
  private bubbleGeometry: THREE.SphereGeometry;
  private onCoralAdded: (coral: Coral) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    corals: Coral[],
    seabedMesh: THREE.Mesh,
    oceanHeight: number,
    onCoralAdded: (coral: Coral) => void
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.corals = corals;
    this.seabedMesh = seabedMesh;
    this.oceanHeight = oceanHeight;
    this.onCoralAdded = onCoralAdded;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.seedGeometry = new THREE.SphereGeometry(0.05, 12, 12);
    this.warmParticleGeometry = new THREE.SphereGeometry(0.025, 8, 8);
    this.bubbleGeometry = new THREE.SphereGeometry(0.01, 6, 6);

    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.updateMouse(e);
      this.isDragging = true;
      this.handleClick();
    });

    canvas.addEventListener('pointermove', (e) => {
      this.updateMouse(e);
      if (this.isDragging) {
        this.handleDrag();
      }
    });

    canvas.addEventListener('pointerup', () => {
      this.isDragging = false;
      this.handleDragEnd();
    });

    canvas.addEventListener('pointerleave', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.handleDragEnd();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.triggerSoundWave();
      }
    });
  }

  private updateMouse(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectSeabed(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.seabedMesh);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  private handleClick(): void {
    const point = this.intersectSeabed();
    if (!point) return;

    const seedMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      emissive: 0xffffff,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(this.seedGeometry, seedMaterial);
    mesh.position.copy(point);
    mesh.position.y += 0.05;
    this.scene.add(mesh);

    const nearbyColor = this.getNearbyCoralColor(point);

    this.seeds.push({
      mesh,
      position: point.clone(),
      targetColor: nearbyColor,
      startTime: performance.now(),
      spawned: false
    });

    this.createRipple(point);
  }

  private getNearbyCoralColor(point: THREE.Vector3): number {
    const searchRadius = 2.0;
    let nearestColor: number | null = null;
    let nearestDist = Infinity;

    for (const coral of this.corals) {
      const dist = coral.position.distanceTo(point);
      if (dist < searchRadius && dist < nearestDist) {
        nearestDist = dist;
        nearestColor = coral.baseColor;
      }
    }

    if (nearestColor !== null) {
      const color = new THREE.Color(nearestColor);
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      const hueShift = (Math.random() - 0.5) * (15 / 360);
      color.setHSL(hsl.h + hueShift, hsl.s, hsl.l);
      return color.getHex();
    }

    const hue = 0.5 + Math.random() * 0.25;
    return new THREE.Color().setHSL(hue, 1.0, 0.6).getHex();
  }

  private createRipple(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.01, 0.05, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y += 0.02;
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);

    this.ripples.push({
      mesh,
      startTime: performance.now(),
      duration: 300,
      startRadius: 0.05,
      endRadius: 0.5
    });
  }

  private handleDrag(): void {
    const now = performance.now();
    if (now - this.lastWarmSpawn < 100) return;
    this.lastWarmSpawn = now;

    const point = this.intersectSeabed();
    if (!point) return;

    const warmPos = point.clone();
    warmPos.y = this.oceanHeight * 0.3 + Math.random() * this.oceanHeight * 0.4;

    const material = new THREE.MeshBasicMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.6
    });
    const mesh = new THREE.Mesh(this.warmParticleGeometry, material);
    mesh.position.copy(warmPos);
    this.scene.add(mesh);

    this.warmParticles.push({
      mesh,
      startTime: now,
      duration: 3000
    });

    this.affectCoralsWithWarm(warmPos);
    this.spawnBubbles(point);
  }

  private affectCoralsWithWarm(center: THREE.Vector3): void {
    const radius = 1.0;
    for (const coral of this.corals) {
      const dist = coral.position.distanceTo(center);
      if (dist < radius) {
        const intensity = 1 - dist / radius;
        coral.setWarmColor(intensity * 60);
      }
    }
  }

  private spawnBubbles(seabedPos: THREE.Vector3): void {
    for (let i = 0; i < 2; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.4
      });
      const mesh = new THREE.Mesh(this.bubbleGeometry, material);
      mesh.position.copy(seabedPos);
      mesh.position.x += (Math.random() - 0.5) * 0.5;
      mesh.position.z += (Math.random() - 0.5) * 0.5;
      mesh.position.y += 0.05 + Math.random() * 0.1;
      this.scene.add(mesh);

      this.bubbles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          0.2,
          (Math.random() - 0.5) * 0.05
        ),
        startTime: performance.now(),
        duration: 2000
      });
    }
  }

  private handleDragEnd(): void {
    setTimeout(() => {
      for (const coral of this.corals) {
        coral.resetColor();
      }
    }, 500);
  }

  private triggerSoundWave(): void {
    const center = new THREE.Vector3(0, this.oceanHeight * 0.5, 0);

    const geometry = new THREE.RingGeometry(0.4, 0.5, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    this.scene.add(mesh);

    this.soundWaves.push({
      mesh,
      startTime: performance.now(),
      duration: 300,
      position: center
    });

    setTimeout(() => {
      for (const coral of this.corals) {
        coral.triggerPulse();
      }
    }, 150);
  }

  update(time: number): void {
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      const seed = this.seeds[i];
      const elapsed = time - seed.startTime;

      if (elapsed >= 500 && !seed.spawned) {
        seed.spawned = true;
        const coral = new Coral(seed.position.clone(), seed.targetColor, false);
        this.corals.push(coral);
        this.scene.add(coral.group);
        this.onCoralAdded(coral);
      }

      if (elapsed >= 500) {
        const fade = 1 - Math.min(1, (elapsed - 500) / 200);
        (seed.mesh.material as THREE.MeshStandardMaterial).opacity = fade * 0.8;
        if (fade <= 0) {
          this.scene.remove(seed.mesh);
          (seed.mesh.material as THREE.Material).dispose();
          this.seeds.splice(i, 1);
          continue;
        }
      }

      seed.mesh.position.y = seed.position.y + 0.05 + Math.sin(elapsed * 0.005) * 0.01;
    }

    for (let i = this.warmParticles.length - 1; i >= 0; i--) {
      const wp = this.warmParticles[i];
      const elapsed = time - wp.startTime;
      const t = elapsed / wp.duration;

      if (t >= 1) {
        this.scene.remove(wp.mesh);
        (wp.mesh.material as THREE.Material).dispose();
        this.warmParticles.splice(i, 1);
        continue;
      }

      (wp.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
      wp.mesh.position.y += 0.005;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const elapsed = time - ripple.startTime;
      const t = elapsed / ripple.duration;

      if (t >= 1) {
        this.scene.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }

      const scale = ripple.startRadius + (ripple.endRadius - ripple.startRadius) * t;
      ripple.mesh.scale.setScalar(scale / ripple.startRadius);
      (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    }

    for (let i = this.soundWaves.length - 1; i >= 0; i--) {
      const sw = this.soundWaves[i];
      const elapsed = time - sw.startTime;
      const t = elapsed / sw.duration;

      if (t >= 1) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
        this.soundWaves.splice(i, 1);
        continue;
      }

      const startR = 0.5;
      const endR = 3.0;
      const currentR = startR + (endR - startR) * t;
      const ringWidth = 0.1;
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);

      sw.mesh.scale.setScalar(currentR / startR);
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      const elapsed = time - bubble.startTime;
      const t = elapsed / bubble.duration;

      if (t >= 1) {
        this.scene.remove(bubble.mesh);
        (bubble.mesh.material as THREE.Material).dispose();
        this.bubbles.splice(i, 1);
        continue;
      }

      bubble.mesh.position.add(bubble.velocity.clone().multiplyScalar(0.016));
      (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
    }
  }

  dispose(): void {
    this.seedGeometry.dispose();
    this.warmParticleGeometry.dispose();
    this.bubbleGeometry.dispose();
  }
}
