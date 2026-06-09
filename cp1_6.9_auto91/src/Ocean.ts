import * as THREE from 'three';

export class Ocean {
  public readonly group: THREE.Group;
  private waterCube: THREE.Mesh;
  private seaBed: THREE.Mesh;
  private waveMesh: THREE.Mesh;
  private waveGeometry: THREE.PlaneGeometry;
  private originalWavePositions: Float32Array;

  constructor() {
    this.group = new THREE.Group();

    this.waterCube = this.createWaterCube();
    this.seaBed = this.createSeaBed();
    const waveResult = this.createWaveSurface();
    this.waveMesh = waveResult.mesh;
    this.waveGeometry = waveResult.geometry;
    this.originalWavePositions = waveResult.originalPositions;

    this.group.add(this.waterCube);
    this.group.add(this.seaBed);
    this.group.add(this.waveMesh);
  }

  private createWaterCube(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(20, 20, 20);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a4a7a,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      shininess: 30,
      reflectivity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0;
    return mesh;
  }

  private createSeaBed(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(20, 20, 40, 40);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      positions.setZ(i, z + (Math.random() - 0.5) * 0.3);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      side: THREE.DoubleSide,
      shininess: 10
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -10;
    return mesh;
  }

  private createWaveSurface(): {
    mesh: THREE.Mesh;
    geometry: THREE.PlaneGeometry;
    originalPositions: Float32Array;
  } {
    const geometry = new THREE.PlaneGeometry(20, 20, 29, 29);
    const positions = geometry.attributes.position;
    const originalPositions = new Float32Array(positions.array as Float32Array);

    const colors = new Float32Array(positions.count * 3);
    const colorStart = new THREE.Color(0x2a6a9a);
    const colorEnd = new THREE.Color(0x4a9aba);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const t = (x + 10) / 20;
      const color = colorStart.clone().lerp(colorEnd, t + (y + 10) / 40);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      shininess: 80,
      reflectivity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 10;

    return { mesh, geometry, originalPositions };
  }

  public update(time: number): void {
    const positions = this.waveGeometry.attributes.position;
    const frequency = 0.5;
    const amplitude = 0.3;

    for (let i = 0; i < positions.count; i++) {
      const x = this.originalWavePositions[i * 3];
      const y = this.originalWavePositions[i * 3 + 1];
      const waveZ = amplitude * Math.sin(x * frequency + time * 2) * Math.cos(y * frequency + time * 1.5);
      positions.setZ(i, waveZ);
    }
    positions.needsUpdate = true;
    this.waveGeometry.computeVertexNormals();
  }
}
