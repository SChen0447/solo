import * as THREE from 'three';
import { ElementData } from './elementData';
import { SceneManager } from './scene';

interface ElectronData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitTilt: number;
  phase: number;
  speed: number;
}

export class AtomVisualizer {
  private sceneMgr: SceneManager;
  private nucleusMesh: THREE.Mesh | null = null;
  private nucleusHalo: THREE.Mesh | null = null;
  private electrons: ElectronData[] = [];
  private orbits: THREE.Line[] = [];
  private elementColor: string = '#ffaa66';
  private elementGlowColor: string = '#ffddaa';

  constructor(sceneMgr: SceneManager) {
    this.sceneMgr = sceneMgr;
  }

  public build(element: ElementData): void {
    this.elementColor = element.color;
    this.elementGlowColor = element.glowColor;
    this.buildNucleus();
    this.buildElectronShells(element.electronShells);
    this.setupAnimation();
  }

  private buildNucleus(): void {
    const nucleusGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const nucleusMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(this.elementColor),
      emissive: new THREE.Color(this.elementGlowColor),
      emissiveIntensity: 0.6,
      shininess: 100
    });
    this.nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    this.sceneMgr.atomGroup.add(this.nucleusMesh);

    const haloGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.elementGlowColor),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    this.nucleusHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sceneMgr.atomGroup.add(this.nucleusHalo);
  }

  private buildElectronShells(shells: number[]): void {
    const shellMax = [2, 8, 18, 32, 32, 18, 8];
    const baseRadius = 0.6;
    const radiusStep = 0.35;

    shells.forEach((electronCount, shellIndex) => {
      const orbitRadius = baseRadius + shellIndex * radiusStep;
      const layerColor = this.getShellColor(shellIndex, shells.length);

      this.buildOrbitRing(orbitRadius, shellIndex, layerColor);

      const count = Math.min(electronCount, shellMax[shellIndex] || 8);
      for (let i = 0; i < count; i++) {
        this.buildElectron(orbitRadius, shellIndex, i, count, layerColor);
      }
    });
  }

  private getShellColor(shellIndex: number, totalShells: number): THREE.Color {
    const t = totalShells <= 1 ? 0 : shellIndex / (totalShells - 1);
    const r = Math.round(255 * (1 - t));
    const g = Math.round(80 + 80 * t);
    const b = Math.round(60 + 195 * t);
    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  private buildOrbitRing(radius: number, shellIndex: number, color: THREE.Color): void {
    const tilt = (Math.random() * 30 - 15) * Math.PI / 180;
    const segments = 64;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius * Math.sin(tilt);
      const z = Math.sin(theta) * radius * Math.cos(tilt);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.35
    });
    const ring = new THREE.Line(geometry, material);
    this.orbits.push(ring);
    this.sceneMgr.atomGroup.add(ring);
  }

  private buildElectron(
    orbitRadius: number,
    shellIndex: number,
    electronIndex: number,
    totalInShell: number,
    color: THREE.Color
  ): void {
    const electronGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const electronMat = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      shininess: 100
    });
    const mesh = new THREE.Mesh(electronGeo, electronMat);

    const orbitTilt = (Math.random() * 30) * Math.PI / 180;
    const phase = (electronIndex / totalInShell) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 1.2 + Math.random() * 0.6 - shellIndex * 0.08;

    this.electrons.push({
      mesh,
      orbitRadius,
      orbitTilt,
      phase,
      speed
    });

    this.sceneMgr.atomGroup.add(mesh);
  }

  private setupAnimation(): void {
    this.sceneMgr.onAnimate((delta, elapsed) => {
      const speedMultiplier = this.sceneMgr.settings.electronSpeed;

      this.electrons.forEach(e => {
        const angle = e.phase + elapsed * e.speed * speedMultiplier;
        const x = Math.cos(angle) * e.orbitRadius;
        const y = Math.sin(angle) * e.orbitRadius * Math.sin(e.orbitTilt);
        const z = Math.sin(angle) * e.orbitRadius * Math.cos(e.orbitTilt);
        e.mesh.position.set(x, y, z);
      });

      if (this.nucleusHalo) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * Math.PI);
        const scale = 0.8 + pulse * 0.4;
        this.nucleusHalo.scale.setScalar(scale);
        (this.nucleusHalo.material as THREE.MeshBasicMaterial).opacity = 0.1 + pulse * 0.15;
      }

      if (this.nucleusMesh) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * Math.PI);
        (this.nucleusMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.4 + pulse * 0.4;
      }
    });
  }

  public dispose(): void {
    this.electrons = [];
    this.orbits = [];
    this.nucleusMesh = null;
    this.nucleusHalo = null;
  }
}
