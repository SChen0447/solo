import * as THREE from 'three';
import { gsap } from 'gsap';
import { Maze, Cube } from './maze';
import { ParticleSystem } from './particle';

const CORE_RADIUS = 1.5;
const PULSE_PERIOD = 2.0;
const ALIGNMENT_THRESHOLD = 0.5;
const ALIGNMENT_DOT_PRODUCT = 0.95;
const CONSECUTIVE_HIT_WINDOW = 3.0;
const CONSECUTIVE_HIT_THRESHOLD = 3;
const BEAM_DURATION = 0.2;

export interface Core {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  color: string;
  beamColor: string;
  isSplit: boolean;
  alignmentTime: number;
  isPulsing: boolean;
  pulsePhase: number;
  light: THREE.PointLight;
  material: THREE.MeshStandardMaterial;
}

export class CoreSystem {
  public cores: Core[] = [];
  public beams: THREE.Line[] = [];
  public hitCount = 0;
  public consecutiveHits = 0;
  public lastHitTime = 0;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private particleSystem: ParticleSystem;
  private maze: Maze | null = null;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.raycaster = new THREE.Raycaster();
  }

  public setMaze(maze: Maze): void {
    this.maze = maze;
  }

  public init(): void {
    this.createCore(new THREE.Vector3(0, 0, 0), false);
  }

  private createCore(position: THREE.Vector3, isSplit: boolean): Core {
    const geometry = new THREE.SphereGeometry(CORE_RADIUS, 32, 32);
    const color = isSplit ? '#48dbfb' : '#ffffff';
    const beamColor = isSplit ? '#48dbfb' : '#ffd700';

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color(color),
      emissiveIntensity: 3,
      metalness: 0.8,
      roughness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    const light = new THREE.PointLight(
      new THREE.Color(color),
      3,
      20,
      1
    );
    light.position.copy(position);

    const core: Core = {
      mesh,
      position: position.clone(),
      color,
      beamColor,
      isSplit,
      alignmentTime: 0,
      isPulsing: true,
      pulsePhase: Math.random() * Math.PI * 2,
      light,
      material
    };

    this.cores.push(core);
    this.scene.add(mesh);
    this.scene.add(light);

    return core;
  }

  public update(camera: THREE.Camera, delta: number): void {
    for (const core of this.cores) {
      this.pulseAnimation(core, delta);
      this.checkAlignment(core, camera, delta);
    }

    this.updateBeams(delta);

    const now = performance.now() / 1000;
    if (now - this.lastHitTime > CONSECUTIVE_HIT_WINDOW) {
      this.consecutiveHits = 0;
    }
  }

  private pulseAnimation(core: Core, delta: number): void {
    core.pulsePhase += delta * (Math.PI * 2 / PULSE_PERIOD);
    const pulseValue = (Math.sin(core.pulsePhase) + 1) / 2;

    const startColor = core.isSplit ? '#48dbfb' : '#ffffff';
    const endColor = core.isSplit ? '#00a8cc' : '#ff6b6b';

    const color = this.lerpColor(startColor, endColor, pulseValue);
    core.material.color.set(color);
    core.material.emissive.set(color);
    core.light.color.set(color);

    const scale = 1 + pulseValue * 0.1;
    core.mesh.scale.setScalar(scale);

    core.material.emissiveIntensity = 2 + pulseValue * 2;
    core.light.intensity = 2 + pulseValue * 2;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    const result = new THREE.Color().lerpColors(c1, c2, t);
    return `#${result.getHexString()}`;
  }

  public checkAlignment(core: Core, camera: THREE.Camera, delta: number): void {
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const coreDirection = core.position.clone().sub(camera.position).normalize();

    const dotProduct = cameraDirection.dot(coreDirection);

    if (dotProduct > ALIGNMENT_DOT_PRODUCT) {
      core.alignmentTime += delta;

      if (core.alignmentTime >= ALIGNMENT_THRESHOLD) {
        this.releaseBeam(core);
        core.alignmentTime = 0;
      }
    } else {
      core.alignmentTime = Math.max(0, core.alignmentTime - delta * 2);
    }
  }

  public releaseBeam(core: Core): void {
    if (!this.maze || this.maze.cubes.length === 0) return;

    const targetCube = this.maze.getNearestCube(core.position);
    if (!targetCube) return;

    this.createBeam(core, targetCube);
    this.triggerCoreExpandAnimation(core);
    this.processHit(targetCube, core);
  }

  private createBeam(core: Core, targetCube: Cube): void {
    const targetWorldPos = new THREE.Vector3();
    targetCube.mesh.getWorldPosition(targetWorldPos);

    const points = [
      core.position.clone(),
      targetWorldPos.clone()
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const gradientMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(core.beamColor),
      transparent: true,
      opacity: 1,
      linewidth: 3
    });

    const beam = new THREE.Line(geometry, gradientMaterial);
    this.beams.push(beam);
    this.scene.add(beam);

    gsap.to(gradientMaterial, {
      opacity: 0,
      duration: BEAM_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        const index = this.beams.indexOf(beam);
        if (index > -1) {
          this.beams.splice(index, 1);
          this.scene.remove(beam);
          beam.geometry.dispose();
          (beam.material as THREE.Material).dispose();
        }
      }
    });

    const positions = geometry.attributes.position.array as Float32Array;
    const updateAlpha = () => {
      if (gradientMaterial.opacity <= 0) return;
      positions[3] = targetWorldPos.x;
      positions[4] = targetWorldPos.y;
      positions[5] = targetWorldPos.z;
      geometry.attributes.position.needsUpdate = true;
      requestAnimationFrame(updateAlpha);
    };
    updateAlpha();
  }

  private triggerCoreExpandAnimation(core: Core): void {
    gsap.to(core.mesh.scale, {
      x: 1.1,
      y: 1.1,
      z: 1.1,
      duration: 0.05,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1
    });

    gsap.to(core.material, {
      emissiveIntensity: 5,
      duration: 0.05,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1
    });
  }

  private processHit(targetCube: Cube, core: Core): void {
    this.hitCount++;
    this.consecutiveHits++;
    this.lastHitTime = performance.now() / 1000;

    if (this.maze) {
      this.maze.increaseRotationSpeed();
      this.maze.randomizeOpacity();

      const explosionPosition = this.maze.explodeCube(targetCube);
      this.particleSystem.createExplosion(explosionPosition, '#ffd700');

      const delay = 50 + Math.random() * 50;
      setTimeout(() => {
        if (!this.maze) return;
        const adjacentCubes = this.maze.getAdjacentCubes(targetCube);
        for (const adj of adjacentCubes) {
          if (Math.random() < 0.3) {
            this.maze.moveCubeToCore(adj, core.position);
          }
        }
      }, delay);
    }

    if (this.consecutiveHits >= CONSECUTIVE_HIT_THRESHOLD) {
      this.triggerSplit();
      this.consecutiveHits = 0;
    }
  }

  public triggerSplit(): void {
    const existingCore = this.cores[0];
    if (!existingCore) return;

    const splitPositions = [
      new THREE.Vector3(-3, 1, 2),
      new THREE.Vector3(3, -1, -2)
    ];

    this.removeCore(existingCore);

    for (const pos of splitPositions) {
      this.createCore(pos, true);
    }
  }

  private removeCore(core: Core): void {
    const index = this.cores.indexOf(core);
    if (index > -1) {
      this.cores.splice(index, 1);
      this.scene.remove(core.mesh);
      this.scene.remove(core.light);
      core.mesh.geometry.dispose();
      const materials = Array.isArray(core.mesh.material)
        ? core.mesh.material
        : [core.mesh.material];
      materials.forEach(m => m.dispose());
      core.light.dispose();
    }
  }

  private updateBeams(delta: number): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const beam = this.beams[i];
      const mat = beam.material as THREE.LineBasicMaterial;
      if (mat.opacity <= 0) {
        this.scene.remove(beam);
        beam.geometry.dispose();
        mat.dispose();
        this.beams.splice(i, 1);
      }
    }
  }

  public isHoveringCore(event: MouseEvent, camera: THREE.Camera): Core | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);

    const coreMeshes = this.cores.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(coreMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      return this.cores.find(c => c.mesh === hitMesh) || null;
    }

    return null;
  }

  public setCoreHover(core: Core | null): void {
    for (const c of this.cores) {
      if (c === core) {
        c.material.emissiveIntensity = 4;
        c.light.intensity = 4;
      } else if (!c.isPulsing) {
        c.material.emissiveIntensity = 2;
        c.light.intensity = 2;
      }
    }
  }

  public onClickCore(core: Core): void {
    this.releaseBeam(core);
    core.alignmentTime = 0;
  }

  public recalculatePositions(scale: number): void {
    for (const core of this.cores) {
      const scaledPos = core.position.clone().multiplyScalar(scale);
      core.mesh.position.copy(scaledPos);
      core.light.position.copy(scaledPos);
    }
  }

  public dispose(): void {
    for (const core of this.cores) {
      this.scene.remove(core.mesh);
      this.scene.remove(core.light);
      core.mesh.geometry.dispose();
      core.material.dispose();
      core.light.dispose();
    }
    this.cores = [];

    for (const beam of this.beams) {
      this.scene.remove(beam);
      beam.geometry.dispose();
      (beam.material as THREE.Material).dispose();
    }
    this.beams = [];
  }
}
