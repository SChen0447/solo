import * as THREE from 'three';
import { EffectsManager } from './effects';
import { FloeManager } from './floe';

interface ActiveCrack {
  lines: THREE.LineSegments;
  life: number;
  maxLife: number;
  position: THREE.Vector3;
}

interface CalvingChunk {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
  isFlying: boolean;
  flipped: boolean;
}

export class Iceberg {
  private scene: THREE.Scene;
  private effects: EffectsManager;
  private floeManager!: FloeManager;
  private mainGroup: THREE.Group;
  private iceMeshes: THREE.Mesh[] = [];
  private cracks: ActiveCrack[] = [];
  private calvingChunks: CalvingChunk[] = [];
  private iceMaterial!: THREE.MeshPhysicalMaterial;

  private readonly ICEBERG_HEIGHT = 3;
  private readonly BASE_RADIUS = 2.5;
  private readonly MAX_FLOES = 100;

  constructor(scene: THREE.Scene, effects: EffectsManager) {
    this.scene = scene;
    this.effects = effects;
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);
    this.createIceMaterial();
    this.createIceberg();
  }

  public setFloeManager(floeManager: FloeManager): void {
    this.floeManager = floeManager;
  }

  private createIceMaterial(): void {
    this.iceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xccddee,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.1,
      thickness: 0.5,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
      emissive: 0xccddee,
      emissiveIntensity: 0.2
    });
  }

  private createIceberg(): void {
    const layers = [
      { radius: this.BASE_RADIUS, height: 0.8, y: -1.2, segments: 8 },
      { radius: this.BASE_RADIUS * 0.85, height: 0.9, y: -0.3, segments: 7 },
      { radius: this.BASE_RADIUS * 0.65, height: 0.8, y: 0.5, segments: 6 },
      { radius: this.BASE_RADIUS * 0.4, height: 0.7, y: 1.2, segments: 5 },
      { radius: this.BASE_RADIUS * 0.18, height: 0.5, y: 1.8, segments: 4 }
    ];

    for (const layer of layers) {
      const geometry = this.createIrregularCylinder(layer.radius, layer.height, layer.segments, layer.y);
      const mesh = new THREE.Mesh(geometry, this.iceMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.y = layer.y;
      mesh.userData.isIceberg = true;
      this.mainGroup.add(mesh);
      this.iceMeshes.push(mesh);
    }

    const tipGeom = new THREE.ConeGeometry(0.15, 0.5, 4);
    const tip = new THREE.Mesh(tipGeom, this.iceMaterial);
    tip.position.y = 2.3;
    tip.rotation.y = Math.random() * Math.PI;
    tip.castShadow = true;
    tip.userData.isIceberg = true;
    this.mainGroup.add(tip);
    this.iceMeshes.push(tip);
  }

  private createIrregularCylinder(radius: number, height: number, segments: number, baseY: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const topY = height / 2;
    const bottomY = -height / 2;
    const topRadii: number[] = [];
    const bottomRadii: number[] = [];

    for (let i = 0; i < segments; i++) {
      topRadii.push(radius * (0.7 + Math.random() * 0.5));
      bottomRadii.push(radius * (0.8 + Math.random() * 0.4));
    }

    const topCenterIdx = 0;
    positions.push(0, topY, 0);
    normals.push(0, 1, 0);

    const bottomCenterIdx = 1;
    positions.push(0, bottomY, 0);
    normals.push(0, -1, 0);

    const topVertexStart = 2;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = topRadii[i];
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      positions.push(x, topY + (Math.random() - 0.5) * 0.15, z);
      normals.push(0, 1, 0);
    }

    const bottomVertexStart = topVertexStart + segments;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = bottomRadii[i];
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      positions.push(x, bottomY + (Math.random() - 0.5) * 0.15, z);
      normals.push(0, -1, 0);
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      indices.push(topCenterIdx, topVertexStart + i, topVertexStart + next);
      indices.push(bottomCenterIdx, bottomVertexStart + next, bottomVertexStart + i);
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const ti = topVertexStart + i;
      const tni = topVertexStart + next;
      const bi = bottomVertexStart + i;
      const bni = bottomVertexStart + next;
      indices.push(ti, bi, bni);
      indices.push(ti, bni, tni);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  public getClickableObjects(): THREE.Object3D[] {
    return this.iceMeshes;
  }

  public handleClick(point: THREE.Vector3, normal: THREE.Vector3): void {
    this.createCracks(point);
    this.calveIce(point, normal);
  }

  private createCracks(center: THREE.Vector3): void {
    const crackCount = 5 + Math.floor(Math.random() * 4);
    const positions: number[] = [];

    for (let c = 0; c < crackCount; c++) {
      const angle = Math.random() * Math.PI * 2;
      const length = 0.3 + Math.random() * 0.5;
      let currentPos = center.clone();
      positions.push(currentPos.x, currentPos.y, currentPos.z);

      const segments = 3 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segments; s++) {
        const segmentAngle = angle + (Math.random() - 0.5) * 0.8;
        const segmentLength = length / segments;
        const dir = new THREE.Vector3(
          Math.cos(segmentAngle),
          (Math.random() - 0.5) * 0.5,
          Math.sin(segmentAngle)
        ).normalize();
        currentPos = currentPos.clone().add(dir.multiplyScalar(segmentLength));
        positions.push(currentPos.x, currentPos.y, currentPos.z);
        positions.push(currentPos.x, currentPos.y, currentPos.z);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x6699bb,
      transparent: true,
      opacity: 0.9
    });
    const lines = new THREE.LineSegments(geometry, material);
    this.mainGroup.add(lines);

    this.cracks.push({
      lines,
      life: 0.3,
      maxLife: 0.3,
      position: center.clone()
    });
  }

  private calveIce(center: THREE.Vector3, normal: THREE.Vector3): void {
    const chunkCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < chunkCount; i++) {
      const size = 0.3 + Math.random() * 0.5;
      const geometry = this.createRandomConvexGeometry(size);
      const material = this.iceMaterial.clone();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.position.copy(center);
      mesh.position.x += (Math.random() - 0.5) * 0.3;
      mesh.position.y += (Math.random() - 0.5) * 0.3;
      mesh.position.z += (Math.random() - 0.5) * 0.3;
      mesh.userData.isFloe = true;
      mesh.userData.radius = size * 0.6;
      this.scene.add(mesh);

      const dir = normal.clone()
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          0.3 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.8
        ))
        .normalize();
      const speed = 1.5 + Math.random() * 1.5;

      this.calvingChunks.push({
        mesh,
        velocity: dir.multiplyScalar(speed),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
        life: 0.5,
        isFlying: true,
        flipped: false
      });
    }
  }

  private createRandomConvexGeometry(size: number): THREE.BufferGeometry {
    const type = Math.floor(Math.random() * 3);
    if (type === 0) {
      const geom = new THREE.DodecahedronGeometry(size * 0.6, 0);
      const pos = geom.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) * (0.7 + Math.random() * 0.5));
        pos.setY(i, pos.getY(i) * (0.7 + Math.random() * 0.5));
        pos.setZ(i, pos.getZ(i) * (0.7 + Math.random() * 0.5));
      }
      geom.computeVertexNormals();
      return geom;
    } else if (type === 1) {
      const geom = new THREE.BoxGeometry(size, size * 0.7, size);
      const pos = geom.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) * (0.8 + Math.random() * 0.4));
        pos.setY(i, pos.getY(i) * (0.8 + Math.random() * 0.4));
        pos.setZ(i, pos.getZ(i) * (0.8 + Math.random() * 0.4));
      }
      geom.computeVertexNormals();
      return geom;
    } else {
      const geom = new THREE.IcosahedronGeometry(size * 0.55, 0);
      const pos = geom.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) * (0.75 + Math.random() * 0.5));
        pos.setY(i, pos.getY(i) * (0.75 + Math.random() * 0.5));
        pos.setZ(i, pos.getZ(i) * (0.75 + Math.random() * 0.5));
      }
      geom.computeVertexNormals();
      return geom;
    }
  }

  public update(dt: number, elapsed: number): void {
    this.mainGroup.position.y = Math.sin(elapsed * 0.5) * 0.03;
    this.mainGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.01;

    for (let i = this.cracks.length - 1; i >= 0; i--) {
      const crack = this.cracks[i];
      crack.life -= dt;
      const alpha = Math.max(0, crack.life / crack.maxLife);
      (crack.lines.material as THREE.LineBasicMaterial).opacity = alpha * 0.9;

      if (crack.life <= 0) {
        this.mainGroup.remove(crack.lines);
        crack.lines.geometry.dispose();
        (crack.lines.material as THREE.Material).dispose();
        this.cracks.splice(i, 1);
      }
    }

    for (let i = this.calvingChunks.length - 1; i >= 0; i--) {
      const chunk = this.calvingChunks[i];

      if (chunk.isFlying) {
        chunk.velocity.y -= 9.8 * dt;
        chunk.mesh.position.addScaledVector(chunk.velocity, dt);
        chunk.mesh.rotation.x += chunk.angularVelocity.x * dt;
        chunk.mesh.rotation.y += chunk.angularVelocity.y * dt;
        chunk.mesh.rotation.z += chunk.angularVelocity.z * dt;

        chunk.life -= dt;

        if (chunk.mesh.position.y <= 0.1 || chunk.life <= 0) {
          chunk.isFlying = false;
          this.effects.spawnSplash(chunk.mesh.position.clone());

          if (this.floeManager.getFloeCount() < this.MAX_FLOES) {
            const baseSpeed = 0.05 + Math.random() * 0.15;
            const angle = Math.random() * Math.PI * 2;
            this.floeManager.addFloe(
              chunk.mesh,
              new THREE.Vector3(Math.cos(angle) * baseSpeed, 0, Math.sin(angle) * baseSpeed),
              chunk.angularVelocity.clone()
            );
          } else {
            this.scene.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            (chunk.mesh.material as THREE.Material).dispose();
          }
          this.calvingChunks.splice(i, 1);
        }
      }
    }
  }
}
