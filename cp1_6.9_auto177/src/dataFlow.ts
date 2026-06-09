import * as THREE from 'three';

const GRID_SIZE = 30;
const GRID_HALF = GRID_SIZE / 2;
const PATH_COUNT = 50;
const PARTICLE_COUNT = 1000;
const BEACON_COUNT = 5;
const TRAIL_LENGTH = 8;
const BEACON_TRAIL_LENGTH = 20;

const COLOR_SLOW = new THREE.Color(0xffaa66);
const COLOR_FAST = new THREE.Color(0x66ccff);
const BEACON_GLOW_COLOR = new THREE.Color(0x88aaff);
const BEACON_TRAIL_START = new THREE.Color(0x88aaff);
const BEACON_TRAIL_END = new THREE.Color(0xff88aa);

export class PathSegment {
  points: THREE.Vector3[];
  segmentLengths: number[];
  totalLength: number;

  constructor(points: THREE.Vector3[]) {
    this.points = points;
    this.segmentLengths = [];
    this.totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const len = points[i].distanceTo(points[i + 1]);
      this.segmentLengths.push(len);
      this.totalLength += len;
    }
  }

  getPointAt(distance: number): { position: THREE.Vector3; direction: THREE.Vector3; segmentIndex: number } {
    let d = ((distance % this.totalLength) + this.totalLength) % this.totalLength;
    for (let i = 0; i < this.segmentLengths.length; i++) {
      if (d <= this.segmentLengths[i]) {
        const t = d / this.segmentLengths[i];
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const position = new THREE.Vector3().lerpVectors(p1, p2, t);
        const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
        return { position, direction, segmentIndex: i };
      }
      d -= this.segmentLengths[i];
    }
    const last = this.points[this.points.length - 1];
    return { position: last.clone(), direction: new THREE.Vector3(1, 0, 0), segmentIndex: this.segmentLengths.length - 1 };
  }
}

export function generatePaths(): PathSegment[] {
  const paths: PathSegment[] = [];
  for (let i = 0; i < PATH_COUNT; i++) {
    const pointCount = 5 + Math.floor(Math.random() * 4);
    const points: THREE.Vector3[] = [];
    for (let j = 0; j < pointCount; j++) {
      const x = (Math.random() - 0.5) * GRID_SIZE * 0.9;
      const z = (Math.random() - 0.5) * GRID_SIZE * 0.9;
      points.push(new THREE.Vector3(x, 0, z));
    }
    paths.push(new PathSegment(points));
  }
  return paths;
}

export class Particle {
  path: PathSegment;
  distance: number;
  baseSpeed: number;
  speed: number;
  mesh: THREE.Points;
  trailPositions: THREE.Vector3[];
  trailGeometry: THREE.BufferGeometry;
  trail: THREE.Line;
  orbitBeacon: Beacon | null;
  orbitAngle: number;
  orbitRadius: number;
  orbitTurns: number;
  orbitMaxTurns: number;
  spiralParticles: THREE.Points | null;

  constructor(path: PathSegment) {
    this.path = path;
    this.distance = Math.random() * path.totalLength;
    this.baseSpeed = 0.03 + Math.random() * 0.05;
    this.speed = this.baseSpeed;
    this.orbitBeacon = null;
    this.orbitAngle = 0;
    this.orbitRadius = 2;
    this.orbitTurns = 0;
    this.orbitMaxTurns = 1 + Math.random();

    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(3);
    const col = new Float32Array(3);
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mesh = new THREE.Points(geom, new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));

    this.trailPositions = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this.trailPositions.push(new THREE.Vector3());
    }
    this.trailGeometry = new THREE.BufferGeometry();
    const trailPos = new Float32Array(TRAIL_LENGTH * 3);
    const trailCol = new Float32Array(TRAIL_LENGTH * 3);
    const trailAlpha = new Float32Array(TRAIL_LENGTH);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    this.trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlpha, 1));
    this.trail = new THREE.Line(this.trailGeometry, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));

    this.spiralParticles = null;
  }

  getColorBySpeed(): THREE.Color {
    const t = Math.min(1, Math.max(0, (this.speed - 0.02) / 0.1));
    return new THREE.Color().lerpColors(COLOR_SLOW, COLOR_FAST, t);
  }

  addToScene(scene: THREE.Scene) {
    scene.add(this.mesh);
    scene.add(this.trail);
  }

  removeFromScene(scene: THREE.Scene) {
    scene.remove(this.mesh);
    scene.remove(this.trail);
    if (this.spiralParticles) scene.remove(this.spiralParticles);
    this.mesh.geometry.dispose();
    this.trailGeometry.dispose();
    if (this.spiralParticles) this.spiralParticles.geometry.dispose();
  }

  update(beacons: Beacon[], delta: number) {
    let pos: THREE.Vector3;
    let dir: THREE.Vector3;

    const orbitBc = this.orbitBeacon;
    if (orbitBc) {
      this.orbitAngle += this.speed * 4;
      this.orbitTurns += this.speed * 0.02;
      let finishedOrbit = false;
      if (this.orbitTurns >= this.orbitMaxTurns) {
        this.orbitBeacon = null;
        this.distance += 0.5;
        finishedOrbit = true;
      }
      if (!finishedOrbit) {
        const bp = orbitBc.position;
        const r = this.orbitRadius + this.orbitTurns * 0.5;
        pos = new THREE.Vector3(
          bp.x + Math.cos(this.orbitAngle) * r,
          bp.y + Math.sin(this.orbitAngle * 0.7) * 0.3,
          bp.z + Math.sin(this.orbitAngle) * r
        );
        dir = new THREE.Vector3(-Math.sin(this.orbitAngle), 0, Math.cos(this.orbitAngle));
      } else {
        this.distance += this.speed;
        const result = this.path.getPointAt(this.distance);
        pos = result.position;
        dir = result.direction;
      }
    } else {
      this.distance += this.speed;
      const result = this.path.getPointAt(this.distance);
      pos = result.position;
      dir = result.direction;
    }

    let influenceX = 0, influenceZ = 0, influenceY = 0;
    let anyAttract = false;
    let attractBeacon: Beacon | null = null;

    for (const beacon of beacons) {
      if (beacon.strength === 0) continue;
      const dx = beacon.position.x - pos.x;
      const dy = beacon.position.y - pos.y;
      const dz = beacon.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < beacon.radius && dist > 0.01) {
        const falloff = 1 - dist / beacon.radius;
        const force = beacon.strength * falloff * 0.015;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        influenceX += nx * force;
        influenceY += ny * force * 0.3;
        influenceZ += nz * force;

        if (beacon.strength > 0 && falloff > 0.6 && !this.orbitBeacon) {
          anyAttract = true;
          attractBeacon = beacon;
        }
      }
    }

    pos.x += influenceX;
    pos.y += influenceY;
    pos.z += influenceZ;

    if (anyAttract && attractBeacon && !this.orbitBeacon) {
      this.orbitBeacon = attractBeacon;
      this.orbitAngle = Math.random() * Math.PI * 2;
      this.orbitRadius = 1.5;
      this.orbitTurns = 0;
      this.orbitMaxTurns = 1 + Math.random();
      this.spawnSpiralTrail(attractBeacon);
    }

    this.speed = this.baseSpeed * (1 + Math.abs(influenceX) + Math.abs(influenceZ));
    this.speed = Math.max(0.02, Math.min(0.12, this.speed));

    const color = this.getColorBySpeed();

    const mPos = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const mCol = this.mesh.geometry.attributes.color as THREE.BufferAttribute;
    mPos.array[0] = pos.x;
    mPos.array[1] = pos.y;
    mPos.array[2] = pos.z;
    mCol.array[0] = color.r;
    mCol.array[1] = color.g;
    mCol.array[2] = color.b;
    mPos.needsUpdate = true;
    mCol.needsUpdate = true;

    for (let i = this.trailPositions.length - 1; i > 0; i--) {
      this.trailPositions[i].copy(this.trailPositions[i - 1]);
    }
    this.trailPositions[0].copy(pos);

    const tPos = this.trailGeometry.attributes.position as THREE.BufferAttribute;
    const tCol = this.trailGeometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      tPos.array[i * 3] = this.trailPositions[i].x;
      tPos.array[i * 3 + 1] = this.trailPositions[i].y;
      tPos.array[i * 3 + 2] = this.trailPositions[i].z;
      const alpha = 1 - i / TRAIL_LENGTH;
      tCol.array[i * 3] = color.r * alpha;
      tCol.array[i * 3 + 1] = color.g * alpha;
      tCol.array[i * 3 + 2] = color.b * alpha;
    }
    tPos.needsUpdate = true;
    tCol.needsUpdate = true;
  }

  spawnSpiralTrail(beacon: Beacon) {
    if (this.spiralParticles) return;
    const count = 20;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 4;
      const r = 1.5 + i * 0.08;
      pos[i * 3] = beacon.position.x + Math.cos(angle) * r;
      pos[i * 3 + 1] = beacon.position.y + (i / count) * 0.5;
      pos[i * 3 + 2] = beacon.position.z + Math.sin(angle) * r;
      const c = new THREE.Color().lerpColors(BEACON_GLOW_COLOR, COLOR_FAST, i / count);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    this.spiralParticles = new THREE.Points(geom, new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
  }
}

export class Beacon {
  position: THREE.Vector3;
  strength: number;
  radius: number;
  mesh: THREE.Group;
  sphereMesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  radiusMesh: THREE.Mesh;
  trailPositions: THREE.Vector3[];
  trailGeometry: THREE.BufferGeometry;
  trail: THREE.Line;
  selected: boolean;
  pulseTime: number;
  scaleTarget: number;
  currentScale: number;
  isDragging: boolean;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.strength = (Math.random() - 0.3) * 6;
    this.radius = 3 + Math.random() * 3;
    this.selected = false;
    this.pulseTime = Math.random() * Math.PI * 2;
    this.scaleTarget = 1;
    this.currentScale = 1;
    this.isDragging = false;

    this.mesh = new THREE.Group();

    const sphereGeom = new THREE.SphereGeometry(1.5, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: BEACON_GLOW_COLOR,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
    this.mesh.add(this.sphereMesh);

    const haloGeom = new THREE.SphereGeometry(1.8, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: BEACON_GLOW_COLOR,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    this.haloMesh = new THREE.Mesh(haloGeom, haloMat);
    this.mesh.add(this.haloMesh);

    const radiusGeom = new THREE.RingGeometry(0.98, 1.0, 64);
    const radiusMat = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.radiusMesh = new THREE.Mesh(radiusGeom, radiusMat);
    this.radiusMesh.rotation.x = -Math.PI / 2;
    this.mesh.add(this.radiusMesh);

    this.trailPositions = [];
    for (let i = 0; i < BEACON_TRAIL_LENGTH; i++) {
      this.trailPositions.push(position.clone());
    }
    this.trailGeometry = new THREE.BufferGeometry();
    const trailPos = new Float32Array(BEACON_TRAIL_LENGTH * 3);
    const trailCol = new Float32Array(BEACON_TRAIL_LENGTH * 3);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    this.trail = new THREE.Line(this.trailGeometry, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));

    this.mesh.position.copy(position);
    this.updateRadiusVisual();
  }

  addToScene(scene: THREE.Scene) {
    scene.add(this.mesh);
    scene.add(this.trail);
  }

  removeFromScene(scene: THREE.Scene) {
    scene.remove(this.mesh);
    scene.remove(this.trail);
    this.sphereMesh.geometry.dispose();
    this.haloMesh.geometry.dispose();
    this.radiusMesh.geometry.dispose();
    this.trailGeometry.dispose();
  }

  updateRadiusVisual() {
    this.radiusMesh.scale.set(this.radius, this.radius, this.radius);
    const mat = this.radiusMesh.material as THREE.MeshBasicMaterial;
    if (this.strength > 0) {
      mat.color.setHex(0x66ccff);
      mat.opacity = 0.3;
    } else if (this.strength < 0) {
      mat.color.setHex(0xff88aa);
      mat.opacity = 0.3;
    } else {
      mat.color.setHex(0x88aaff);
      mat.opacity = 0.15;
    }
  }

  triggerClickPulse() {
    this.scaleTarget = 1.1;
    setTimeout(() => {
      this.scaleTarget = 1;
    }, 200);
  }

  update(delta: number) {
    this.pulseTime += delta * Math.PI;
    const pulse = 1 + Math.sin(this.pulseTime) * 0.12;

    this.currentScale += (this.scaleTarget * pulse - this.currentScale) * 0.15;
    this.sphereMesh.scale.setScalar(this.currentScale);
    this.haloMesh.scale.setScalar(this.currentScale * 1.15);

    const haloMat = this.haloMesh.material as THREE.MeshBasicMaterial;
    haloMat.opacity = 0.1 + Math.sin(this.pulseTime) * 0.08;

    this.mesh.position.copy(this.position);

    if (this.isDragging) {
      for (let i = this.trailPositions.length - 1; i > 0; i--) {
        this.trailPositions[i].copy(this.trailPositions[i - 1]);
      }
      this.trailPositions[0].copy(this.position);
    } else {
      for (let i = this.trailPositions.length - 1; i > 0; i--) {
        this.trailPositions[i].lerp(this.trailPositions[i - 1], 0.2);
      }
      this.trailPositions[0].copy(this.position);
    }

    const tPos = this.trailGeometry.attributes.position as THREE.BufferAttribute;
    const tCol = this.trailGeometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < BEACON_TRAIL_LENGTH; i++) {
      tPos.array[i * 3] = this.trailPositions[i].x;
      tPos.array[i * 3 + 1] = this.trailPositions[i].y;
      tPos.array[i * 3 + 2] = this.trailPositions[i].z;
      const t = i / BEACON_TRAIL_LENGTH;
      const c = new THREE.Color().lerpColors(BEACON_TRAIL_START, BEACON_TRAIL_END, t);
      const alpha = 1 - t;
      tCol.array[i * 3] = c.r * alpha;
      tCol.array[i * 3 + 1] = c.g * alpha;
      tCol.array[i * 3 + 2] = c.b * alpha;
    }
    tPos.needsUpdate = true;
    tCol.needsUpdate = true;
  }
}

export class StarField {
  mesh: THREE.Points;
  twinkleTimes: number[];
  twinkleSpeeds: number[];

  constructor(count: number) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this.twinkleTimes = [];
    this.twinkleSpeeds = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 40;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.5 + 20;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      col[i * 3] = 1;
      col[i * 3 + 1] = 1;
      col[i * 3 + 2] = 1;
      sizes[i] = 0.5 + Math.random() * 2;
      this.twinkleTimes.push(Math.random() * Math.PI * 2);
      this.twinkleSpeeds.push(Math.PI * (1 + Math.random() * 3));
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.mesh = new THREE.Points(geom, new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }));
  }

  addToScene(scene: THREE.Scene) {
    scene.add(this.mesh);
  }

  update(delta: number) {
    const geom = this.mesh.geometry;
    const col = geom.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < this.twinkleTimes.length; i++) {
      this.twinkleTimes[i] += delta * this.twinkleSpeeds[i];
      const a = 0.4 + Math.sin(this.twinkleTimes[i]) * 0.3;
      col.array[i * 3] = a;
      col.array[i * 3 + 1] = a;
      col.array[i * 3 + 2] = a;
    }
    col.needsUpdate = true;
  }
}

export class CityGrid {
  grid: THREE.GridHelper;
  pathNodes: THREE.Points;
  pathLines: THREE.LineSegments;

  constructor(paths: PathSegment[]) {
    this.grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x334466, 0x334466);
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.15;
    this.grid.rotation.x = 0;

    const allPoints: THREE.Vector3[] = [];
    for (const path of paths) {
      for (const p of path.points) {
        allPoints.push(p);
      }
    }

    const nodeGeom = new THREE.BufferGeometry();
    const nodePos = new Float32Array(allPoints.length * 3);
    const nodeCol = new Float32Array(allPoints.length * 3);
    for (let i = 0; i < allPoints.length; i++) {
      nodePos[i * 3] = allPoints[i].x;
      nodePos[i * 3 + 1] = allPoints[i].y + 0.05;
      nodePos[i * 3 + 2] = allPoints[i].z;
      nodeCol[i * 3] = 0.4;
      nodeCol[i * 3 + 1] = 0.6;
      nodeCol[i * 3 + 2] = 1;
    }
    nodeGeom.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
    nodeGeom.setAttribute('color', new THREE.BufferAttribute(nodeCol, 3));
    this.pathNodes = new THREE.Points(nodeGeom, new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));

    let lineCount = 0;
    for (const path of paths) {
      lineCount += path.points.length - 1;
    }
    const lineGeom = new THREE.BufferGeometry();
    const linePos = new Float32Array(lineCount * 2 * 3);
    const lineCol = new Float32Array(lineCount * 2 * 3);
    let idx = 0;
    for (const path of paths) {
      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        linePos[idx * 6] = p1.x;
        linePos[idx * 6 + 1] = p1.y + 0.02;
        linePos[idx * 6 + 2] = p1.z;
        linePos[idx * 6 + 3] = p2.x;
        linePos[idx * 6 + 4] = p2.y + 0.02;
        linePos[idx * 6 + 5] = p2.z;
        lineCol[idx * 6] = 0.15;
        lineCol[idx * 6 + 1] = 0.25;
        lineCol[idx * 6 + 2] = 0.5;
        lineCol[idx * 6 + 3] = 0.15;
        lineCol[idx * 6 + 4] = 0.25;
        lineCol[idx * 6 + 5] = 0.5;
        idx++;
      }
    }
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    lineGeom.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
    this.pathLines = new THREE.LineSegments(lineGeom, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
  }

  addToScene(scene: THREE.Scene) {
    scene.add(this.grid);
    scene.add(this.pathLines);
    scene.add(this.pathNodes);
    this.grid.rotation.x = -0.05;
  }
}

export class DataFlowSystem {
  scene: THREE.Scene;
  paths: PathSegment[];
  particles: Particle[];
  beacons: Beacon[];
  starField: StarField;
  cityGrid: CityGrid;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.paths = generatePaths();
    this.particles = [];
    this.beacons = [];
    this.starField = new StarField(400);
    this.cityGrid = new CityGrid(this.paths);

    this.cityGrid.addToScene(scene);
    this.starField.addToScene(scene);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const path = this.paths[Math.floor(Math.random() * this.paths.length)];
      const p = new Particle(path);
      p.addToScene(scene);
      this.particles.push(p);
    }

    for (let i = 0; i < BEACON_COUNT; i++) {
      const angle = (i / BEACON_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const r = 6 + Math.random() * 6;
      const pos = new THREE.Vector3(
        Math.cos(angle) * r,
        2 + Math.random() * 4,
        Math.sin(angle) * r
      );
      const b = new Beacon(pos);
      b.addToScene(scene);
      this.beacons.push(b);
    }
  }

  getAverageSpeed(): number {
    let sum = 0;
    for (const p of this.particles) sum += p.speed;
    return sum / this.particles.length;
  }

  getActiveBeaconCount(): number {
    let c = 0;
    for (const b of this.beacons) if (Math.abs(b.strength) > 0.01) c++;
    return c;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  update(delta: number) {
    this.starField.update(delta);
    for (const b of this.beacons) b.update(delta);
    for (const p of this.particles) p.update(this.beacons, delta);
  }
}
