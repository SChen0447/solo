import * as THREE from 'three';

export class EnergyVisualizer {
  private scene: THREE.Scene;
  private chartGroup: THREE.Group;
  private bars: THREE.Mesh[] = [];
  private barGeometry: THREE.BoxGeometry;
  private avgLine: THREE.Line;
  private background: THREE.Mesh;
  private position: THREE.Vector3;
  private width: number = 2;
  private height: number = 8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.position = new THREE.Vector3(7, 0, 0);
    this.chartGroup = new THREE.Group();
    this.chartGroup.position.copy(this.position);
    this.scene.add(this.chartGroup);
    this.barGeometry = new THREE.BoxGeometry(1, 1, 1);

    this.background = this.createBackground();
    this.chartGroup.add(this.background);

    this.avgLine = this.createAverageLine();
    this.chartGroup.add(this.avgLine);

    this.createAxesLabels();
  }

  private createBackground(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.width + 0.4, this.height + 0.8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -0.05);
    return mesh;
  }

  private createAverageLine(): THREE.Line {
    const points = [
      new THREE.Vector3(-this.width / 2, 0, 0.01),
      new THREE.Vector3(this.width / 2, 0, 0.01)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    return new THREE.Line(geometry, material);
  }

  private createAxesLabels(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Kinetic Energy Distribution', 64, 20);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, this.height / 2 + 0.5, 0);
    sprite.scale.set(3, 0.75, 1);
    this.chartGroup.add(sprite);
  }

  private getBarColor(normalizedHeight: number): THREE.Color {
    const t = Math.min(1, Math.max(0, normalizedHeight));
    if (t < 0.5) {
      const localT = t / 0.5;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x00FF00),
        new THREE.Color(0xFFFF00),
        localT
      );
    } else {
      const localT = (t - 0.5) / 0.5;
      return new THREE.Color().lerpColors(
        new THREE.Color(0xFFFF00),
        new THREE.Color(0xFF0000),
        localT
      );
    }
  }

  public update(kineticEnergies: number[], averageEnergy: number, maxEnergy: number): void {
    const barCount = kineticEnergies.length;
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    while (this.bars.length < barCount) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x00FF00,
        transparent: true,
        opacity: 0.85
      });
      const bar = new THREE.Mesh(this.barGeometry, material);
      this.chartGroup.add(bar);
      this.bars.push(bar);
    }

    while (this.bars.length > barCount) {
      const bar = this.bars.pop()!;
      this.chartGroup.remove(bar);
      (bar.material as THREE.Material).dispose();
    }

    if (barCount === 0) return;

    const padding = 0.05;
    const totalPadding = padding * (barCount + 1);
    const availableWidth = this.width - totalPadding;
    const barWidth = availableWidth / barCount;

    const effectiveMax = Math.max(maxEnergy * 1.1, 0.001);

    for (let i = 0; i < barCount; i++) {
      const bar = this.bars[i];
      const energy = kineticEnergies[i];
      const normalizedHeight = Math.min(1, energy / effectiveMax);
      const barHeight = Math.max(0.01, normalizedHeight * this.height);

      const x = -halfW + padding + barWidth / 2 + i * (barWidth + padding);
      const y = -halfH + barHeight / 2;

      bar.position.set(x, y, 0);
      bar.scale.set(barWidth, barHeight, 0.1);

      const material = bar.material as THREE.MeshBasicMaterial;
      material.color.copy(this.getBarColor(normalizedHeight));
      material.needsUpdate = true;
    }

    const avgNormalized = Math.min(1, averageEnergy / effectiveMax);
    const avgY = -halfH + avgNormalized * this.height;
    const positions = this.avgLine.geometry.attributes.position.array as Float32Array;
    positions[1] = avgY;
    positions[4] = avgY;
    this.avgLine.geometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    for (const bar of this.bars) {
      (bar.material as THREE.Material).dispose();
    }
    this.bars = [];
    this.barGeometry.dispose();
    this.avgLine.geometry.dispose();
    (this.avgLine.material as THREE.Material).dispose();
    this.background.geometry.dispose();
    (this.background.material as THREE.Material).dispose();
    this.scene.remove(this.chartGroup);
  }
}
