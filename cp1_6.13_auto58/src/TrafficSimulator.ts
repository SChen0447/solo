import * as THREE from 'three';

interface Vehicle {
  id: number;
  mesh: THREE.Mesh;
  color: THREE.Color;
  axis: 'x' | 'z';
  linePos: number;
  position: number;
  speed: number;
  direction: 1 | -1;
  trail: THREE.Mesh[];
  trailLength: number;
  isExploding: boolean;
  explodeTimer: number;
  explodeParticles: THREE.Mesh[];
}

export class TrafficSimulator {
  public group: THREE.Group = new THREE.Group();
  public vehicles: Vehicle[] = [];
  public activeTrafficCount: number = 0;
  public trailMaxLength: number = 6;

  private readonly GRID_SIZE = 10;
  private readonly CELL_SIZE = 20;
  private readonly VEHICLE_COUNT = 200;
  private readonly VEHICLE_COLORS = [
    new THREE.Color(0xff3355),
    new THREE.Color(0xffd54f),
    new THREE.Color(0x33aaff),
    new THREE.Color(0x44ff77),
  ];

  public build(scene: THREE.Scene): void {
    const halfTotal = (this.GRID_SIZE * this.CELL_SIZE) / 2;
    const streetLines: { axis: 'x' | 'z'; pos: number }[] = [];

    for (let i = 0; i <= this.GRID_SIZE; i++) {
      const p = -halfTotal + i * this.CELL_SIZE;
      streetLines.push({ axis: 'x', pos: p });
      streetLines.push({ axis: 'z', pos: p });
    }

    for (let i = 0; i < this.VEHICLE_COUNT; i++) {
      const line = streetLines[Math.floor(Math.random() * streetLines.length)];
      const color = this.VEHICLE_COLORS[Math.floor(Math.random() * this.VEHICLE_COLORS.length)].clone();
      const direction = (Math.random() > 0.5 ? 1 : -1) as 1 | -1;
      const speed = 2 + Math.random() * 3;

      const radius = 0.45;
      const geo = new THREE.SphereGeometry(radius, 12, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const startPos = -halfTotal + Math.random() * halfTotal * 2;
      if (line.axis === 'x') {
        mesh.position.set(startPos, 0.8, line.pos);
      } else {
        mesh.position.set(line.pos, 0.8, startPos);
      }
      this.group.add(mesh);

      const trail: THREE.Mesh[] = [];
      for (let t = 0; t < this.trailMaxLength; t++) {
        const tGeo = new THREE.SphereGeometry(radius * 0.75, 8, 8);
        const alpha = 0.8 - (t / this.trailMaxLength) * 0.6;
        const tMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0,
        });
        const tMesh = new THREE.Mesh(tGeo, tMat);
        tMesh.position.copy(mesh.position);
        this.group.add(tMesh);
        trail.push(tMesh);
        void alpha;
      }

      this.vehicles.push({
        id: i,
        mesh,
        color,
        axis: line.axis,
        linePos: line.pos,
        position: startPos,
        speed,
        direction,
        trail,
        trailLength: this.trailMaxLength,
        isExploding: false,
        explodeTimer: 0,
        explodeParticles: [],
      });
    }

    scene.add(this.group);
  }

  public update(time: number, deltaTime: number): void {
    const halfTotal = (this.GRID_SIZE * this.CELL_SIZE) / 2;
    const totalLen = halfTotal * 2;
    const nightFactor = this.calcNightFactor(time);
    let activeCount = 0;

    for (const v of this.vehicles) {
      if (v.isExploding) {
        v.explodeTimer -= deltaTime;
        const t = Math.max(0, v.explodeTimer / 0.8);
        for (let i = 0; i < v.explodeParticles.length; i++) {
          const p = v.explodeParticles[i];
          const speed = 8 + i * 1.2;
          const angle = (i / v.explodeParticles.length) * Math.PI * 2;
          p.position.x += Math.cos(angle) * speed * deltaTime;
          p.position.y += Math.sin(angle * 2) * speed * deltaTime * 0.5;
          p.position.z += Math.sin(angle) * speed * deltaTime;
          (p.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
          const scale = 0.3 + (1 - t) * 1.5;
          p.scale.setScalar(scale);
        }
        if (v.explodeTimer <= 0) {
          v.isExploding = false;
          v.explodeParticles.forEach((p) => this.group.remove(p));
          v.explodeParticles = [];
          v.mesh.visible = true;
        }
        v.mesh.visible = false;
        continue;
      }

      v.position += v.speed * v.direction * deltaTime;
      if (v.position > halfTotal) {
        v.position = -halfTotal + (v.position - halfTotal);
      } else if (v.position < -halfTotal) {
        v.position = halfTotal + (v.position + halfTotal);
      }

      if (v.axis === 'x') {
        v.mesh.position.set(v.position, 0.8, v.linePos);
      } else {
        v.mesh.position.set(v.linePos, 0.8, v.position);
      }

      const visibleTrail = Math.min(v.trailLength, this.trailMaxLength);
      if (visibleTrail > 0) activeCount++;

      for (let t = 0; t < visibleTrail; t++) {
        const backDist = (t + 1) * 0.8;
        let backPos = v.position - v.direction * backDist;
        if (backPos > halfTotal) backPos -= totalLen;
        if (backPos < -halfTotal) backPos += totalLen;

        const trail = v.trail[t];
        if (v.axis === 'x') {
          trail.position.set(backPos, 0.8, v.linePos);
        } else {
          trail.position.set(v.linePos, 0.8, backPos);
        }
        const baseAlpha = 0.8 - (t / visibleTrail) * 0.6;
        (trail.material as THREE.MeshBasicMaterial).opacity = baseAlpha * Math.max(0.2, nightFactor);
      }

      for (let t = visibleTrail; t < this.trailMaxLength; t++) {
        (v.trail[t].material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    this.activeTrafficCount = activeCount;
  }

  private calcNightFactor(t: number): number {
    if (t < 0.2) return 0.15;
    if (t < 0.35) return 0.15 + ((t - 0.2) / 0.15) * 0.5;
    if (t < 0.45) return 0.65;
    if (t < 0.55) return 0.65 - ((t - 0.45) / 0.1) * 0.45;
    if (t < 0.7) return 0.15;
    if (t < 0.85) return 0.15 + ((t - 0.7) / 0.15) * 0.85;
    return 1;
  }

  public triggerVehicleExplosion(vehicleMesh: THREE.Mesh): Vehicle | null {
    const v = this.vehicles.find((x) => x.mesh === vehicleMesh);
    if (!v || v.isExploding) return v || null;

    v.isExploding = true;
    v.explodeTimer = 0.8;

    for (let i = 0; i < 16; i++) {
      const geo = new THREE.SphereGeometry(0.25, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: v.color.clone().multiplyScalar(1.3),
        transparent: true,
        opacity: 0.9,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(v.mesh.position);
      this.group.add(p);
      v.explodeParticles.push(p);
    }

    return v;
  }

  public getVehicleMeshes(): THREE.Mesh[] {
    return this.vehicles.map((v) => v.mesh);
  }

  public getVehicleByMesh(mesh: THREE.Mesh): Vehicle | undefined {
    return this.vehicles.find((v) => v.mesh === mesh);
  }

  public setPerformanceMode(enabled: boolean): void {
    this.trailMaxLength = enabled ? 2 : 6;
  }
}

export type { Vehicle };
