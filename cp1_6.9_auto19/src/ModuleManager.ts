import * as THREE from 'three';
import { ModuleData, ModuleShape, GameState } from './GameState';
import { RobotArm } from './RobotArm';

interface FloatingModule {
  data: ModuleData;
  mesh: THREE.Mesh;
  originalMaterial: THREE.Material;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  basePosition: THREE.Vector3;
  wobbleOffset: THREE.Vector3;
  wobblePhase: THREE.Vector3;
  isGrabbed: boolean;
  isInstalled: boolean;
}

interface InstallPort {
  moduleId: number;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  position: THREE.Vector3;
  isHighlighted: boolean;
}

const GRAB_DISTANCE = 1.2;
const INSTALL_DISTANCE = 1.0;
const MODULE_SIZE = 0.6;

export class ModuleManager {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private modules: FloatingModule[] = [];
  private installPorts: InstallPort[] = [];
  private grabbedModule: FloatingModule | null = null;
  private robotArm: RobotArm | null = null;
  private particles: THREE.Points | null = null;
  private particleCount: number = 60;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.init();
  }

  private init(): void {
    this.createModules();
    this.createInstallPorts();
    this.createParticles();
  }

  private createModuleMaterial(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.4,
      roughness: 0.6,
      emissive: new THREE.Color(color).multiplyScalar(0.08),
    });
  }

  private createGeometry(shape: ModuleShape): THREE.BufferGeometry {
    switch (shape) {
      case 'cube':
        return new THREE.BoxGeometry(MODULE_SIZE, MODULE_SIZE, MODULE_SIZE);
      case 'sphere':
        return new THREE.SphereGeometry(MODULE_SIZE * 0.55, 24, 24);
      case 'octahedron':
        return new THREE.OctahedronGeometry(MODULE_SIZE * 0.55);
    }
  }

  private createModules(): void {
    const state = GameState.getInstance();
    const positions = [
      new THREE.Vector3(4, 2, 2),
      new THREE.Vector3(-3, 3, 3),
      new THREE.Vector3(2, 1.5, -4),
      new THREE.Vector3(-4, 2.5, -2),
      new THREE.Vector3(0, 4, 0),
    ];

    this.modules = state.modules.map((data, i) => {
      const geo = this.createGeometry(data.shape);
      const mat = this.createModuleMaterial(data.color);
      const mesh = new THREE.Mesh(geo, mat);

      const edges = new THREE.EdgesGeometry(geo);
      const edgeLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.7,
        })
      );
      mesh.add(edgeLine);

      mesh.position.copy(positions[i]);

      this.group.add(mesh);

      return {
        data,
        mesh,
        originalMaterial: mat,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        basePosition: positions[i].clone(),
        wobbleOffset: new THREE.Vector3(
          Math.random() * 0.5,
          Math.random() * 0.5,
          Math.random() * 0.5
        ),
        wobblePhase: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        isGrabbed: false,
        isInstalled: false,
      };
    });
  }

  private createInstallPorts(): void {
    const positions = [
      new THREE.Vector3(3, 0.5, -3),
      new THREE.Vector3(-3, 0.5, -3),
      new THREE.Vector3(3, 0.5, 3),
      new THREE.Vector3(-3, 0.5, 3),
      new THREE.Vector3(0, 0.5, -4),
    ];

    const state = GameState.getInstance();

    this.installPorts = state.modules.map((data, i) => {
      const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x2a3a4a,
        metalness: 0.8,
        roughness: 0.3,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.copy(positions[i]);

      const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(positions[i]);
      ring.position.y += 0.1;
      ring.rotation.x = Math.PI / 2;

      const markerColor = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 32),
        new THREE.MeshBasicMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        })
      );
      markerColor.position.copy(positions[i]);
      markerColor.position.y += 0.09;
      markerColor.rotation.x = -Math.PI / 2;

      this.group.add(base);
      this.group.add(ring);
      this.group.add(markerColor);

      return {
        moduleId: data.id,
        mesh: base,
        ring,
        position: positions[i].clone(),
        isHighlighted: false,
      };
    });
  }

  private createParticles(): void {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x88aaff,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
    });

    this.particles = new THREE.Points(geo, mat);
    this.group.add(this.particles);
  }

  public setRobotArm(arm: RobotArm): void {
    this.robotArm = arm;
  }

  public getGrabbedModule(): FloatingModule | null {
    return this.grabbedModule;
  }

  public getNearestModule(gripperPos: THREE.Vector3): FloatingModule | null {
    let nearest: FloatingModule | null = null;
    let minDist = Infinity;

    for (const mod of this.modules) {
      if (mod.isGrabbed || mod.isInstalled) continue;
      const dist = mod.mesh.position.distanceTo(gripperPos);
      if (dist < minDist && dist < GRAB_DISTANCE * 3) {
        minDist = dist;
        nearest = mod;
      }
    }
    return nearest;
  }

  public tryGrab(gripperPos: THREE.Vector3): boolean {
    if (this.grabbedModule) return false;

    for (const mod of this.modules) {
      if (mod.isGrabbed || mod.isInstalled) continue;
      const dist = mod.mesh.position.distanceTo(gripperPos);
      if (dist < GRAB_DISTANCE) {
        mod.isGrabbed = true;
        this.grabbedModule = mod;
        this.setModuleGrabbedVisual(mod, true);
        return true;
      }
    }
    return false;
  }

  public release(): void {
    if (!this.grabbedModule) return;
    this.grabbedModule.isGrabbed = false;
    this.setModuleGrabbedVisual(this.grabbedModule, false);
    this.grabbedModule = null;
  }

  private setModuleGrabbedVisual(mod: FloatingModule, grabbed: boolean): void {
    const mat = mod.mesh.material as THREE.MeshStandardMaterial;
    const opacity = grabbed ? 0.6 : 1;
    const target = {
      transparent: grabbed,
      opacity,
    };

    const startOpacity = mat.opacity;
    const startTime = performance.now();
    const duration = 300;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      mat.transparent = target.transparent;
      mat.opacity = startOpacity + (target.opacity - startOpacity) * eased;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  public tryInstall(gripperPos: THREE.Vector3): boolean {
    if (!this.grabbedModule) return false;

    const targetPort = this.installPorts.find(
      p => p.moduleId === this.grabbedModule!.data.id
    );
    if (!targetPort) return false;

    const dist = gripperPos.distanceTo(targetPort.position);
    if (dist < INSTALL_DISTANCE) {
      this.installModule(this.grabbedModule, targetPort);
      return true;
    }
    return false;
  }

  private installModule(mod: FloatingModule, port: InstallPort): void {
    mod.isInstalled = true;
    mod.isGrabbed = false;
    this.grabbedModule = null;

    this.setModuleGrabbedVisual(mod, false);

    const startPos = mod.mesh.position.clone();
    const startQuat = mod.mesh.quaternion.clone();
    const targetPos = port.position.clone();
    targetPos.y += 0.4;
    const targetQuat = new THREE.Quaternion();
    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      mod.mesh.position.lerpVectors(startPos, targetPos, eased);
      mod.mesh.quaternion.slerpQuaternions(startQuat, targetQuat, eased);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        mod.mesh.position.copy(targetPos);
        mod.mesh.quaternion.identity();
        port.ring.material = new THREE.MeshBasicMaterial({
          color: 0x44ff66,
          transparent: true,
          opacity: 0.9,
        });
      }
    };
    animate();

    GameState.getInstance().completeInstall(mod.data.id);
  }

  public checkCollisions(armSegments: THREE.Object3D[]): number {
    let collisions = 0;
    for (const seg of armSegments) {
      const segPos = new THREE.Vector3();
      seg.getWorldPosition(segPos);
      for (const mod of this.modules) {
        if (mod.isGrabbed || mod.isInstalled) continue;
        const dist = mod.mesh.position.distanceTo(segPos);
        if (dist < 0.8) {
          collisions++;
        }
      }
    }
    return collisions;
  }

  public getCurrentTargetPort(): InstallPort | null {
    const state = GameState.getInstance();
    const target = state.getCurrentTarget();
    if (!target) return null;
    return this.installPorts.find(p => p.moduleId === target.id) || null;
  }

  public getUninstalledModules(): FloatingModule[] {
    return this.modules.filter(m => !m.isInstalled);
  }

  public update(
    deltaTime: number,
    time: number,
    gripperPos: THREE.Vector3 | null,
    disturbanceActive: boolean
  ): void {
    const speedMul = disturbanceActive ? 2.5 : 1;

    for (const mod of this.modules) {
      if (mod.isInstalled) continue;

      if (mod.isGrabbed && gripperPos && this.robotArm) {
        const targetPos = gripperPos.clone();
        mod.mesh.position.lerp(targetPos, 0.15);
        mod.mesh.quaternion.slerp(this.robotArm.getEndEffectorWorldQuaternion(), 0.1);
        continue;
      }

      mod.wobblePhase.x += deltaTime * 0.8 * speedMul;
      mod.wobblePhase.y += deltaTime * 0.6 * speedMul;
      mod.wobblePhase.z += deltaTime * 0.7 * speedMul;

      const wobbleAmp = disturbanceActive ? 0.15 : 0.06;
      const driftAmp = disturbanceActive ? 0.015 : 0.004;

      const targetX =
        mod.basePosition.x +
        Math.sin(mod.wobblePhase.x) * wobbleAmp +
        mod.velocity.x * 100;
      const targetY =
        mod.basePosition.y +
        Math.sin(mod.wobblePhase.y) * wobbleAmp +
        mod.velocity.y * 100;
      const targetZ =
        mod.basePosition.z +
        Math.sin(mod.wobblePhase.z) * wobbleAmp +
        mod.velocity.z * 100;

      mod.mesh.position.x += (targetX - mod.mesh.position.x) * driftAmp;
      mod.mesh.position.y += (targetY - mod.mesh.position.y) * driftAmp;
      mod.mesh.position.z += (targetZ - mod.mesh.position.z) * driftAmp;

      mod.mesh.rotation.x += mod.angularVelocity.x * speedMul;
      mod.mesh.rotation.y += mod.angularVelocity.y * speedMul;
      mod.mesh.rotation.z += mod.angularVelocity.z * speedMul;
    }

    for (const port of this.installPorts) {
      const opacity = 0.5 + Math.sin(time * 4) * 0.3;
      const ringMat = port.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = opacity;

      if (this.grabbedModule && this.grabbedModule.data.id === port.moduleId) {
        const dist = this.grabbedModule.mesh.position.distanceTo(port.position);
        const shouldHighlight = dist < 2.5;
        if (shouldHighlight !== port.isHighlighted) {
          port.isHighlighted = shouldHighlight;
          ringMat.color.setHex(shouldHighlight ? 0x44ff66 : 0xffffff);
        }
      } else if (!this.grabbedModule) {
        const state = GameState.getInstance();
        const target = state.getCurrentTarget();
        if (target && port.moduleId === target.id) {
          ringMat.color.setHex(0xffaa44);
        }
      }
    }

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3 + 1] += 0.002 * speedMul;
        if (positions[i * 3 + 1] > 6) {
          positions[i * 3 + 1] = 0;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public reset(): void {
    for (const mod of this.modules) {
      this.group.remove(mod.mesh);
    }
    for (const port of this.installPorts) {
      this.group.remove(port.mesh);
      this.group.remove(port.ring);
    }
    if (this.particles) {
      this.group.remove(this.particles);
    }
    this.modules = [];
    this.installPorts = [];
    this.grabbedModule = null;
    this.init();
  }
}
