import * as THREE from 'three';
import { Wormhole, WormholeConfig } from './wormhole';

export interface GalaxyNode {
  id: number;
  position: THREE.Vector3;
  color: THREE.Color;
  baseRadius: number;
  sphere: THREE.Mesh;
  halo: THREE.Mesh;
  pulsePhase: number;
}

const GALAXY_COLORS = [
  0x9B59B6,
  0x3498DB,
  0x2ECC71,
  0xE67E22,
  0xE74C3C,
  0x1ABC9C
];

export class WormholeNetwork {
  public group: THREE.Group;
  public nodes: GalaxyNode[] = [];
  public wormholes: Map<string, Wormhole> = new Map();
  public distortionStrength: number = 1.5;
  public particleDensity: number = 1.0;
  public colorSaturation: number = 1.0;
  private pulseWaves: { position: THREE.Vector3; color: THREE.Color; time: number; maxTime: number }[] = [];
  private waveMeshes: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.initNodes();
    this.initWormholes();
  }

  private initNodes(): void {
    const usedColors = new Set<number>();
    const nodeCount = 6;
    const sphereRadius = 12;

    for (let i = 0; i < nodeCount; i++) {
      let colorIndex: number;
      do {
        colorIndex = Math.floor(Math.random() * GALAXY_COLORS.length);
      } while (usedColors.has(colorIndex) && usedColors.size < GALAXY_COLORS.length);
      usedColors.add(colorIndex);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * sphereRadius;

      const position = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const color = new THREE.Color(GALAXY_COLORS[colorIndex]);
      const baseRadius = 0.6 + Math.random() * 0.6;

      const sphereGeometry = new THREE.SphereGeometry(baseRadius, 32, 32);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.85
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(position);
      sphere.userData = { nodeId: i, isNode: true };

      const haloGeometry = new THREE.RingGeometry(1.8, 1.82, 64);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0x85C1E9,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(position);
      halo.visible = false;

      this.group.add(sphere);
      this.group.add(halo);

      this.nodes.push({
        id: i,
        position,
        color,
        baseRadius,
        sphere,
        halo,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private initWormholes(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const key = this.getWormholeKey(i, j);
        const config: WormholeConfig = {
          startNode: {
            position: this.nodes[i].position,
            color: this.nodes[i].color.clone()
          },
          endNode: {
            position: this.nodes[j].position,
            color: this.nodes[j].color.clone()
          },
          distortionStrength: this.distortionStrength,
          particleDensity: this.particleDensity,
          colorSaturation: this.colorSaturation
        };

        const wormhole = new Wormhole(config);
        this.wormholes.set(key, wormhole);
        this.group.add(wormhole.group);
      }
    }
  }

  private getWormholeKey(i: number, j: number): string {
    return `${Math.min(i, j)}-${Math.max(i, j)}`;
  }

  private applySaturation(color: THREE.Color): THREE.Color {
    const sat = this.colorSaturation;
    const gray = color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
    color.r = gray + (color.r - gray) * sat;
    color.g = gray + (color.g - gray) * sat;
    color.b = gray + (color.b - gray) * sat;
    color.r = Math.min(1, Math.max(0, color.r));
    color.g = Math.min(1, Math.max(0, color.g));
    color.b = Math.min(1, Math.max(0, color.b));
    return color;
  }

  public update(deltaTime: number, elapsedTime: number, cameraParallax: number = 0): void {
    for (const node of this.nodes) {
      const pulse = Math.sin(elapsedTime * (Math.PI * 2 / 1.5) + node.pulsePhase);
      const scale = 1 + pulse * 0.05;
      node.sphere.scale.setScalar(scale);

      const material = node.sphere.material as THREE.MeshBasicMaterial;
      const adjustedColor = node.color.clone();
      this.applySaturation(adjustedColor);
      material.color.copy(adjustedColor);
    }

    for (const wormhole of this.wormholes.values()) {
      wormhole.update(deltaTime, cameraParallax);
    }

    this.updatePulseWaves(deltaTime);
  }

  private updatePulseWaves(deltaTime: number): void {
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const wave = this.pulseWaves[i];
      wave.time += deltaTime;

      const t = wave.time / wave.maxTime;
      const radius = t * 15;
      const opacity = 1 - t;

      const mesh = this.waveMeshes[i];
      if (mesh) {
        mesh.scale.setScalar(radius);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, opacity * 0.8);
      }

      if (wave.time >= wave.maxTime) {
        this.pulseWaves.splice(i, 1);
        if (mesh) {
          this.group.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
        this.waveMeshes.splice(i, 1);
      }
    }
  }

  public highlightNode(nodeId: number | null): void {
    for (const node of this.nodes) {
      const isHighlighted = node.id === nodeId;
      node.sphere.scale.setScalar(isHighlighted ? 1.5 : 1);

      const haloMat = node.halo.material as THREE.MeshBasicMaterial;
      node.halo.visible = isHighlighted;
      haloMat.opacity = isHighlighted ? 0.6 : 0;

      if (isHighlighted) {
        const direction = new THREE.Vector3().subVectors(node.halo.position, new THREE.Vector3(0, 0, 0)).normalize();
        node.halo.lookAt(node.halo.position.clone().add(direction));
      }
    }

    for (const [key, wormhole] of this.wormholes) {
      const [a, b] = key.split('-').map(Number);
      wormhole.setHighlighted(nodeId !== null && (a === nodeId || b === nodeId));
    }
  }

  public triggerPulse(nodeId: number): void {
    const node = this.nodes[nodeId];
    if (!node) return;

    const waveColor = node.color.clone();
    waveColor.offsetHSL(0, 0, 0.3);

    this.pulseWaves.push({
      position: node.position.clone(),
      color: waveColor,
      time: 0,
      maxTime: 2
    });

    const geometry = new THREE.RingGeometry(0.98, 1.02, 64);
    const material = new THREE.MeshBasicMaterial({
      color: waveColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const waveMesh = new THREE.Mesh(geometry, material);
    waveMesh.position.copy(node.position);
    waveMesh.scale.setScalar(0.01);
    this.group.add(waveMesh);
    this.waveMeshes.push(waveMesh);
  }

  public updateGlobalConfig(
    distortionStrength: number,
    particleDensity: number,
    colorSaturation: number
  ): void {
    this.distortionStrength = distortionStrength;
    this.particleDensity = particleDensity;
    this.colorSaturation = colorSaturation;

    for (const wormhole of this.wormholes.values()) {
      wormhole.updateConfig(distortionStrength, particleDensity, colorSaturation);
    }
  }

  public getNodeMeshes(): THREE.Mesh[] {
    return this.nodes.map(n => n.sphere);
  }

  public dispose(): void {
    for (const node of this.nodes) {
      node.sphere.geometry.dispose();
      (node.sphere.material as THREE.Material).dispose();
      node.halo.geometry.dispose();
      (node.halo.material as THREE.Material).dispose();
    }
    for (const wormhole of this.wormholes.values()) {
      wormhole.dispose();
    }
    for (const mesh of this.waveMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.group.clear();
  }
}
