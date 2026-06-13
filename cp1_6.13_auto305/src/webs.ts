import * as THREE from 'three';
import { Node } from './node';

export class Web {
  public startNode: Node;
  public endNode: Node;
  public line: THREE.Line;
  public glowLine: THREE.Line;
  public flowParticles: THREE.Points;

  private normalFlowPeriod: number = 2000;
  private hoverFlowPeriod: number = 500;
  private flowStartTime: number;
  private isHighlighted: boolean = false;
  private particleCount: number = 5;

  constructor(startNode: Node, endNode: Node, mobileScale: number = 1) {
    this.startNode = startNode;
    this.endNode = endNode;
    this.flowStartTime = performance.now();

    const avgColor = startNode.color;

    const positions = new Float32Array([
      startNode.position.x, startNode.position.y, startNode.position.z,
      endNode.position.x, endNode.position.y, endNode.position.z
    ]);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: avgColor,
      transparent: true,
      opacity: 0.4
    });
    this.line = new THREE.Line(lineGeometry, lineMaterial);

    const glowMaterial = new THREE.LineBasicMaterial({
      color: avgColor,
      transparent: true,
      opacity: 0.15,
      linewidth: 2
    });
    this.glowLine = new THREE.Line(lineGeometry.clone(), glowMaterial);
    this.glowLine.scale.setScalar(1 + mobileScale * 0.02);

    const particlePositions = new Float32Array(this.particleCount * 3);
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3 * mobileScale,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.flowParticles = new THREE.Points(particleGeometry, particleMaterial);
  }

  public update(time: number, mobileScale: number = 1): void {
    const positions = this.line.geometry.attributes.position.array as Float32Array;
    positions[0] = this.startNode.position.x;
    positions[1] = this.startNode.position.y;
    positions[2] = this.startNode.position.z;
    positions[3] = this.endNode.position.x;
    positions[4] = this.endNode.position.y;
    positions[5] = this.endNode.position.z;
    this.line.geometry.attributes.position.needsUpdate = true;

    const glowPositions = this.glowLine.geometry.attributes.position.array as Float32Array;
    glowPositions.set(positions);
    this.glowLine.geometry.attributes.position.needsUpdate = true;

    const currentPeriod = this.isHighlighted ? this.hoverFlowPeriod : this.normalFlowPeriod;
    const progress = ((time - this.flowStartTime) % currentPeriod) / currentPeriod;

    const particlePositions = this.flowParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const t = (progress + (i / this.particleCount)) % 1;
      const idx = i * 3;
      particlePositions[idx] = this.lerp(this.startNode.position.x, this.endNode.position.x, t);
      particlePositions[idx + 1] = this.lerp(this.startNode.position.y, this.endNode.position.y, t);
      particlePositions[idx + 2] = this.lerp(this.startNode.position.z, this.endNode.position.z, t);
    }
    this.flowParticles.geometry.attributes.position.needsUpdate = true;

    const targetBrightness = this.isHighlighted ? 2 : 1;
    const normalOpacity = 0.4 * targetBrightness;
    const glowOpacity = 0.15 * targetBrightness;

    const lineMat = this.line.material as THREE.LineBasicMaterial;
    const glowMat = this.glowLine.material as THREE.LineBasicMaterial;
    const particleMat = this.flowParticles.material as THREE.PointsMaterial;

    lineMat.opacity += (normalOpacity - lineMat.opacity) * 0.12;
    glowMat.opacity += (glowOpacity - glowMat.opacity) * 0.12;
    particleMat.size += ((this.isHighlighted ? 4 : 3) * mobileScale - particleMat.size) * 0.12;
  }

  public setHighlighted(highlighted: boolean): void {
    this.isHighlighted = highlighted;
  }

  public isHighlightedStatus(): boolean {
    return this.isHighlighted;
  }

  public connectsTo(node: Node): boolean {
    return this.startNode === node || this.endNode === node;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public dispose(): void {
    this.line.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
    this.glowLine.geometry.dispose();
    (this.glowLine.material as THREE.Material).dispose();
    this.flowParticles.geometry.dispose();
    (this.flowParticles.material as THREE.Material).dispose();
  }
}
