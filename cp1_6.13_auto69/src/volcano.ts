import * as THREE from 'three';
import { clamp } from 'lodash';
import { VolcanoState, EruptionProgress } from './types';
import { PlumeSystem } from './plume';

export class Volcano {
  public group: THREE.Group;
  private coneMesh: THREE.Mesh;
  private craterGlow: THREE.Mesh;
  private ground: THREE.Mesh;
  private craterCracks: THREE.LineSegments;

  private state: VolcanoState = 'dormant';
  private stateTimer: number = 0;
  private eruptionDuration: number = 10;
  private coolingDuration: number = 8;

  private plumeSystem: PlumeSystem;
  private scene: THREE.Scene;

  private coneMaterial: THREE.MeshStandardMaterial;
  private craterMaterial: THREE.MeshBasicMaterial;

  private progressCallback?: (progress: EruptionProgress) => void;
  private stateChangeCallback?: (state: VolcanoState) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.coneMaterial = this.createVolcanoMaterial();
    this.craterMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6
    });

    this.coneMesh = this.createVolcanoCone();
    this.craterGlow = this.createCraterGlow();
    this.ground = this.createGround();
    this.craterCracks = this.createCrackLines();

    this.plumeSystem = new PlumeSystem(scene, this.getCraterPosition.bind(this));

    this.group.add(this.coneMesh);
    this.group.add(this.craterGlow);
    this.group.add(this.ground);
    this.group.add(this.craterCracks);

    scene.add(this.group);
  }

  public setProgressCallback(callback: (progress: EruptionProgress) => void): void {
    this.progressCallback = callback;
  }

  public setStateChangeCallback(callback: (state: VolcanoState) => void): void {
    this.stateChangeCallback = callback;
  }

  public getState(): VolcanoState {
    return this.state;
  }

  public setState(state: VolcanoState): void {
    this.state = state;
    this.stateTimer = 0;

    if (state === 'dormant') {
      this.craterMaterial.opacity = 0.4;
      this.craterCracks.visible = false;
      this.plumeSystem.clearAll();
    } else if (state === 'erupting') {
      this.craterMaterial.opacity = 1.0;
      this.craterCracks.visible = false;
      this.plumeSystem.resetFlowPaths();
    } else if (state === 'cooling') {
      this.craterMaterial.opacity = 0.3;
      this.craterCracks.visible = true;
    }

    if (this.stateChangeCallback) {
      this.stateChangeCallback(state);
    }
  }

  public setProgress(percentage: number): void {
    const p = clamp(percentage, 0, 100);
    let phase: EruptionProgress['phase'] = 'dormant';

    if (p === 0) {
      this.setState('dormant');
      phase = 'dormant';
    } else if (p > 0 && p <= 40) {
      this.setState('erupting');
      this.stateTimer = (p / 100) * this.eruptionDuration;
      phase = 'early';
    } else if (p > 40 && p <= 70) {
      this.setState('erupting');
      this.stateTimer = (p / 100) * this.eruptionDuration;
      phase = 'peak';
    } else if (p > 70 && p <= 100) {
      this.setState('cooling');
      this.stateTimer = ((p - 70) / 30) * this.coolingDuration;
      phase = 'cooling';
    }

    if (this.progressCallback) {
      this.progressCallback({ percentage: p, phase });
    }
  }

  public getCraterPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 3.5 - 0.15, 0);
  }

  public update(deltaTime: number): void {
    this.stateTimer += deltaTime;

    if (this.state === 'erupting') {
      this.updateErupting(deltaTime);
      if (this.stateTimer >= this.eruptionDuration) {
        this.setState('cooling');
      }
    } else if (this.state === 'cooling') {
      this.updateCooling(deltaTime);
      if (this.stateTimer >= this.coolingDuration) {
        this.setState('dormant');
      }
    } else {
      this.updateDormant(deltaTime);
    }

    this.plumeSystem.update(deltaTime, this.state, this.stateTimer);
  }

  private updateDormant(deltaTime: number): void {
    const glowPulse = 0.4 + Math.sin(Date.now() * 0.001) * 0.1;
    this.craterMaterial.opacity = glowPulse;
    this.craterMaterial.color.setHSL(0.05, 1, 0.3);
  }

  private updateErupting(deltaTime: number): void {
    const intensity = this.getEruptionIntensity();
    this.craterMaterial.opacity = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
    this.craterMaterial.color.setHSL(0.03, 1, 0.4 + intensity * 0.3);

    this.plumeSystem.emitSmoke(intensity);
    this.plumeSystem.emitLava(intensity);
  }

  private updateCooling(deltaTime: number): void {
    const coolProgress = Math.min(this.stateTimer / this.coolingDuration, 1);
    const crackOpacity = coolProgress * 0.8;
    
    this.craterCracks.material.opacity = crackOpacity;
    this.craterMaterial.opacity = Math.max(0.1, 0.6 - coolProgress * 0.5);
    this.craterMaterial.color.setHSL(0.05, 0.5 - coolProgress * 0.3, 0.2 + coolProgress * 0.1);

    this.plumeSystem.emitSteam(1 - coolProgress * 0.7);
  }

  private getEruptionIntensity(): number {
    if (this.state !== 'erupting') return 0;
    const progress = this.stateTimer / this.eruptionDuration;
    if (progress < 0.4) {
      return progress / 0.4;
    } else if (progress < 0.7) {
      return 1;
    } else {
      return (1 - (progress - 0.7) / 0.3) * 0.5;
    }
  }

  private createVolcanoMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const noise = Math.random();
        const baseColor = noise > 0.5 ? [80, 50, 40] : [60, 60, 70];
        const variation = (Math.random() - 0.5) * 30;
        const r = Math.floor(baseColor[0] + variation);
        const g = Math.floor(baseColor[1] + variation);
        const b = Math.floor(baseColor[2] + variation);
        ctx.fillStyle = `rgb(${clamp(r, 20, 100)}, ${clamp(g, 10, 80)}, ${clamp(b, 10, 90)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1
    });
  }

  private createVolcanoCone(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.8, 3, 3.5, 32, 16, true);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      if (y > 0) {
        const noise = (Math.random() - 0.5) * 0.15 * (y / 3.5 + 0.5);
        const normal = new THREE.Vector3(x, 0, z).normalize();
        positions.setX(i, x + normal.x * noise);
        positions.setZ(i, z + normal.z * noise);
      }
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.coneMaterial);
    mesh.position.y = 1.75;
    mesh.rotation.x = Math.PI;

    return mesh;
  }

  private createCraterGlow(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(1.2, 32);
    const mesh = new THREE.Mesh(geometry, this.craterMaterial);
    mesh.position.set(0, 3.5 - 0.3, 0);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private createGround(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const noise = Math.random();
        const base = noise > 0.7 ? 50 : noise > 0.4 ? 35 : 25;
        const variation = (Math.random() - 0.5) * 15;
        const c = Math.floor(clamp(base + variation, 10, 60));
        ctx.fillStyle = `rgb(${c}, ${Math.floor(c * 0.8)}, ${Math.floor(c * 0.7)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const geometry = new THREE.CircleGeometry(15, 64);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private createCrackLines(): THREE.LineSegments {
    const points: THREE.Vector3[] = [];
    const craterRadius = 1.2;

    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      const startR = craterRadius * 0.3 + Math.random() * 0.2;
      const endR = craterRadius * 0.9 + Math.random() * 0.3;
      
      const startX = Math.cos(angle) * startR;
      const startZ = Math.sin(angle) * startR;
      const endX = Math.cos(angle + (Math.random() - 0.5) * 0.5) * endR;
      const endZ = Math.sin(angle + (Math.random() - 0.5) * 0.5) * endR;

      const segments = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < segments; j++) {
        const t1 = j / segments;
        const t2 = (j + 1) / segments;
        
        const midOffset1 = (Math.random() - 0.5) * 0.2;
        const midOffset2 = (Math.random() - 0.5) * 0.2;

        points.push(new THREE.Vector3(
          startX + (endX - startX) * t1 + midOffset1,
          3.5 - 0.29,
          startZ + (endZ - startZ) * t1 + midOffset1
        ));
        points.push(new THREE.Vector3(
          startX + (endX - startX) * t2 + midOffset2,
          3.5 - 0.29,
          startZ + (endZ - startZ) * t2 + midOffset2
        ));
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0
    });

    const lines = new THREE.LineSegments(geometry, material);
    lines.visible = false;
    return lines;
  }

  public dispose(): void {
    this.plumeSystem.dispose();
    this.scene.remove(this.group);
    this.coneMaterial.dispose();
    this.craterMaterial.dispose();
    (this.ground.material as THREE.Material).dispose();
  }
}
