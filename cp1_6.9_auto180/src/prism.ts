import * as THREE from 'three';
import { ParticleSystem, EmitterConfig } from './particles';

interface VertexData {
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  color: THREE.Color;
  sphere: THREE.Mesh;
  trail: THREE.Line;
  trailPoints: THREE.Vector3[];
}

interface SurfaceSpot {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
}

const VERTEX_COLORS = ['#ff3366', '#ff9933', '#ffcc33', '#33cc66', '#3399ff'];
const TOP_VERTEX_Y = 2.5;
const BOTTOM_VERTEX_Y = -2.5;
const PRISM_RADIUS = 2;
const ROTATION_SPEED = 0.02;
const BREATH_FREQUENCY = 1;
const BREATH_AMPLITUDE = 0.1;
const INTERPOLATION_TIME = 0.2;

export class Prism {
  private scene: THREE.Scene;
  private group!: THREE.Group;
  private mesh!: THREE.Mesh;
  private edges!: THREE.LineSegments;
  private vertices: VertexData[] = [];
  private geometry!: THREE.BufferGeometry;
  private positionsAttribute!: THREE.BufferAttribute;
  private particleSystem!: ParticleSystem;
  private surfaceSpots: SurfaceSpot[] = [];
  private spotGeometry!: THREE.BufferGeometry;
  private spotMaterial!: THREE.PointsMaterial;
  private spotPoints!: THREE.Points;
  private spotPositions!: Float32Array;
  private spotColors!: Float32Array;
  private spotSizes!: Float32Array;

  private baseRotation = 0;
  private breathTime = 0;
  private dragVertexIndex: number = -1;
  private camera: THREE.Camera;
  private raycaster!: THREE.Raycaster;
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragPoint: THREE.Vector3 = new THREE.Vector3();

  public rotationY = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.particleSystem = new ParticleSystem(scene);

    this.createPrism();
    this.createVertices();
    this.createSurfaceSpots();
    this.initParticleEmitters();
  }

  private createPrism(): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const topCenter = new THREE.Vector3(0, TOP_VERTEX_Y, 0);
    const bottomCenter = new THREE.Vector3(0, BOTTOM_VERTEX_Y, 0);

    const topVertices: THREE.Vector3[] = [];
    const bottomVertices: THREE.Vector3[] = [];

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * PRISM_RADIUS;
      const z = Math.sin(angle) * PRISM_RADIUS;
      topVertices.push(new THREE.Vector3(x, TOP_VERTEX_Y, z));
      bottomVertices.push(new THREE.Vector3(x, BOTTOM_VERTEX_Y, z));
    }

    let vertexIndex = 0;

    for (let i = 0; i < 5; i++) {
      positions.push(topCenter.x, topCenter.y, topCenter.z);
      const c1 = new THREE.Color(VERTEX_COLORS[i]);
      const c2 = new THREE.Color(VERTEX_COLORS[(i + 1) % 5]);
      const avg = c1.clone().lerp(c2, 0.5);
      colors.push(avg.r, avg.g, avg.b);
      normals.push(0, 1, 0);
      vertexIndex++;
      const topCenterIdx = vertexIndex - 1;

      positions.push(topVertices[i].x, topVertices[i].y, topVertices[i].z);
      colors.push(c1.r, c1.g, c1.b);
      normals.push(0, 1, 0);
      vertexIndex++;
      const v1 = vertexIndex - 1;

      positions.push(topVertices[(i + 1) % 5].x, topVertices[(i + 1) % 5].y, topVertices[(i + 1) % 5].z);
      colors.push(c2.r, c2.g, c2.b);
      normals.push(0, 1, 0);
      vertexIndex++;
      const v2 = vertexIndex - 1;

      indices.push(topCenterIdx, v1, v2);
    }

    for (let i = 0; i < 5; i++) {
      positions.push(bottomCenter.x, bottomCenter.y, bottomCenter.z);
      const c1 = new THREE.Color(VERTEX_COLORS[i]);
      const c2 = new THREE.Color(VERTEX_COLORS[(i + 1) % 5]);
      const avg = c1.clone().lerp(c2, 0.5);
      colors.push(avg.r, avg.g, avg.b);
      normals.push(0, -1, 0);
      vertexIndex++;
      const bottomCenterIdx = vertexIndex - 1;

      positions.push(bottomVertices[i].x, bottomVertices[i].y, bottomVertices[i].z);
      colors.push(c1.r, c1.g, c1.b);
      normals.push(0, -1, 0);
      vertexIndex++;
      const v1 = vertexIndex - 1;

      positions.push(bottomVertices[(i + 1) % 5].x, bottomVertices[(i + 1) % 5].y, bottomVertices[(i + 1) % 5].z);
      colors.push(c2.r, c2.g, c2.b);
      normals.push(0, -1, 0);
      vertexIndex++;
      const v2 = vertexIndex - 1;

      indices.push(bottomCenterIdx, v2, v1);
    }

    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      const c1 = new THREE.Color(VERTEX_COLORS[i]);
      const c2 = new THREE.Color(VERTEX_COLORS[next]);

      const sideNormal = new THREE.Vector3();
      const vA = topVertices[i];
      const vB = topVertices[next];
      const vC = bottomVertices[next];
      const vD = bottomVertices[i];

      const edge1 = new THREE.Vector3().subVectors(vB, vA);
      const edge2 = new THREE.Vector3().subVectors(vD, vA);
      sideNormal.copy(edge1).cross(edge2).normalize();

      positions.push(vA.x, vA.y, vA.z);
      colors.push(c1.r, c1.g, c1.b);
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      vertexIndex++;
      const a = vertexIndex - 1;

      positions.push(vB.x, vB.y, vB.z);
      colors.push(c2.r, c2.g, c2.b);
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      vertexIndex++;
      const b = vertexIndex - 1;

      positions.push(vC.x, vC.y, vC.z);
      colors.push(c2.r, c2.g, c2.b);
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      vertexIndex++;
      const c = vertexIndex - 1;

      positions.push(vD.x, vD.y, vD.z);
      colors.push(c1.r, c1.g, c1.b);
      normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      vertexIndex++;
      const d = vertexIndex - 1;

      indices.push(a, b, c);
      indices.push(a, c, d);
    }

    this.geometry = new THREE.BufferGeometry();
    this.positionsAttribute = new THREE.BufferAttribute(new Float32Array(positions), 3);
    this.geometry.setAttribute('position', this.positionsAttribute);
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    this.geometry.setIndex(indices);
    this.geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      shininess: 100,
      emissive: new THREE.Color(0x111133),
      emissiveIntensity: 0.3
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.group.add(this.mesh);

    const edgeGeom = new THREE.EdgesGeometry(this.geometry, 1);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x6688ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    this.edges = new THREE.LineSegments(edgeGeom, edgeMat);
    this.group.add(this.edges);
  }

  private createVertices(): void {
    const topVertices: THREE.Vector3[] = [];
    const bottomVertices: THREE.Vector3[] = [];

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * PRISM_RADIUS;
      const z = Math.sin(angle) * PRISM_RADIUS;
      topVertices.push(new THREE.Vector3(x, TOP_VERTEX_Y, z));
      bottomVertices.push(new THREE.Vector3(x, BOTTOM_VERTEX_Y, z));
    }

    for (let i = 0; i < 5; i++) {
      const color = new THREE.Color(VERTEX_COLORS[i]);

      const topPos = topVertices[i].clone();
      const topSphere = this.createVertexSphere(color);
      const topTrail = this.createTrailLine(color);
      topSphere.position.copy(topPos);

      this.vertices.push({
        basePosition: topPos.clone(),
        currentPosition: topPos.clone(),
        targetPosition: topPos.clone(),
        color: color.clone(),
        sphere: topSphere,
        trail: topTrail,
        trailPoints: [topPos.clone()]
      });

      const botPos = bottomVertices[i].clone();
      const botSphere = this.createVertexSphere(color);
      const botTrail = this.createTrailLine(color);
      botSphere.position.copy(botPos);

      this.vertices.push({
        basePosition: botPos.clone(),
        currentPosition: botPos.clone(),
        targetPosition: botPos.clone(),
        color: color.clone(),
        sphere: botSphere,
        trail: botTrail,
        trailPoints: [botPos.clone()]
      });

      this.group.add(topSphere, topTrail, botSphere, botTrail);
    }
  }

  private createVertexSphere(color: THREE.Color): THREE.Mesh {
    const geom = new THREE.SphereGeometry(0.15, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Mesh(geom, mat);
  }

  private createTrailLine(color: THREE.Color): THREE.Line {
    const geom = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      linewidth: 1
    });
    const line = new THREE.Line(geom, mat);
    line.frustumCulled = false;
    return line;
  }

  private createSurfaceSpots(): void {
    const MAX_SPOTS = 200;
    this.spotPositions = new Float32Array(MAX_SPOTS * 3);
    this.spotColors = new Float32Array(MAX_SPOTS * 3);
    this.spotSizes = new Float32Array(MAX_SPOTS);

    for (let i = 0; i < MAX_SPOTS; i++) {
      this.surfaceSpots.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 0,
        life: 0,
        maxLife: 0,
        active: false
      });
    }

    this.spotGeometry = new THREE.BufferGeometry();
    this.spotGeometry.setAttribute('position', new THREE.BufferAttribute(this.spotPositions, 3));
    this.spotGeometry.setAttribute('color', new THREE.BufferAttribute(this.spotColors, 3));
    this.spotGeometry.setAttribute('size', new THREE.BufferAttribute(this.spotSizes, 1));

    this.spotMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.spotPoints = new THREE.Points(this.spotGeometry, this.spotMaterial);
    this.group.add(this.spotPoints);
  }

  private initParticleEmitters(): void {
    const configs: EmitterConfig[] = [];
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      const normal = v.currentPosition.clone().normalize();
      configs.push({
        color: v.color,
        position: v.currentPosition,
        normal: normal
      });
    }
    this.particleSystem.setEmitters(configs);
  }

  public handlePointerDown(event: PointerEvent, rect: DOMRect): boolean {
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const spheres = this.vertices.map(v => v.sphere);
    const intersects = this.raycaster.intersectObjects(spheres, false);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      this.dragVertexIndex = spheres.indexOf(obj as THREE.Mesh);

      if (this.dragVertexIndex >= 0) {
        const v = this.vertices[this.dragVertexIndex];
        (v.sphere.material as THREE.MeshBasicMaterial).opacity = 1.0;
        (v.sphere.material as THREE.MeshBasicMaterial).color.set(v.color.clone().multiplyScalar(1.5));

        const worldPos = new THREE.Vector3();
        v.sphere.getWorldPosition(worldPos);
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        this.dragPlane.setFromNormalAndCoplanarPoint(camDir, worldPos);

        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        if (intersection) {
          this.dragPoint.copy(intersection);
        }

        v.trailPoints = [v.currentPosition.clone()];
        return true;
      }
    }
    return false;
  }

  public handlePointerMove(event: PointerEvent, rect: DOMRect): void {
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.dragVertexIndex >= 0) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const localPos = this.group.worldToLocal(intersection.clone());
        this.vertices[this.dragVertexIndex].targetPosition.copy(localPos);

        const v = this.vertices[this.dragVertexIndex];
        v.trailPoints.push(localPos.clone());
        if (v.trailPoints.length > 30) {
          v.trailPoints.shift();
        }
        this.updateTrailGeometry(v);
      }
    }
  }

  public handlePointerUp(): void {
    if (this.dragVertexIndex >= 0) {
      const v = this.vertices[this.dragVertexIndex];
      (v.sphere.material as THREE.MeshBasicMaterial).opacity = 0.9;
      (v.sphere.material as THREE.MeshBasicMaterial).color.copy(v.color);
      v.trailPoints = [v.currentPosition.clone()];
      this.updateTrailGeometry(v);
      this.dragVertexIndex = -1;
    }
  }

  private updateTrailGeometry(v: VertexData): void {
    const positions = new Float32Array(v.trailPoints.length * 3);
    for (let i = 0; i < v.trailPoints.length; i++) {
      positions[i * 3] = v.trailPoints[i].x;
      positions[i * 3 + 1] = v.trailPoints[i].y;
      positions[i * 3 + 2] = v.trailPoints[i].z;
    }
    v.trail.geometry.dispose();
    v.trail.geometry = new THREE.BufferGeometry();
    v.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  private updatePrismGeometry(): void {
    const posAttr = this.positionsAttribute;
    const positions = posAttr.array as Float32Array;
    const topCenterIdx = 0;
    const bottomCenterIdx = 15;

    let topSumX = 0, topSumY = 0, topSumZ = 0;
    let botSumX = 0, botSumY = 0, botSumZ = 0;

    for (let i = 0; i < 5; i++) {
      const topV = this.vertices[i * 2].currentPosition;
      const botV = this.vertices[i * 2 + 1].currentPosition;
      topSumX += topV.x; topSumY += topV.y; topSumZ += topV.z;
      botSumX += botV.x; botSumY += botV.y; botSumZ += botV.z;
    }

    const topCX = topSumX / 5, topCY = topSumY / 5, topCZ = topSumZ / 5;
    const botCX = botSumX / 5, botCY = botSumY / 5, botCZ = botSumZ / 5;

    for (let i = 0; i < 5; i++) {
      positions[topCenterIdx + i * 9] = topCX;
      positions[topCenterIdx + i * 9 + 1] = topCY;
      positions[topCenterIdx + i * 9 + 2] = topCZ;

      const v1 = this.vertices[i * 2].currentPosition;
      positions[topCenterIdx + i * 9 + 3] = v1.x;
      positions[topCenterIdx + i * 9 + 4] = v1.y;
      positions[topCenterIdx + i * 9 + 5] = v1.z;

      const v2 = this.vertices[((i + 1) % 5) * 2].currentPosition;
      positions[topCenterIdx + i * 9 + 6] = v2.x;
      positions[topCenterIdx + i * 9 + 7] = v2.y;
      positions[topCenterIdx + i * 9 + 8] = v2.z;
    }

    for (let i = 0; i < 5; i++) {
      positions[bottomCenterIdx + i * 9] = botCX;
      positions[bottomCenterIdx + i * 9 + 1] = botCY;
      positions[bottomCenterIdx + i * 9 + 2] = botCZ;

      const v1 = this.vertices[i * 2 + 1].currentPosition;
      positions[bottomCenterIdx + i * 9 + 3] = v1.x;
      positions[bottomCenterIdx + i * 9 + 4] = v1.y;
      positions[bottomCenterIdx + i * 9 + 5] = v1.z;

      const v2 = this.vertices[((i + 1) % 5) * 2 + 1].currentPosition;
      positions[bottomCenterIdx + i * 9 + 6] = v2.x;
      positions[bottomCenterIdx + i * 9 + 7] = v2.y;
      positions[bottomCenterIdx + i * 9 + 8] = v2.z;
    }

    const sideStartIdx = 30;
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      const a = this.vertices[i * 2].currentPosition;
      const b = this.vertices[next * 2].currentPosition;
      const c = this.vertices[next * 2 + 1].currentPosition;
      const d = this.vertices[i * 2 + 1].currentPosition;

      const idx = sideStartIdx + i * 12;
      positions[idx] = a.x; positions[idx + 1] = a.y; positions[idx + 2] = a.z;
      positions[idx + 3] = b.x; positions[idx + 4] = b.y; positions[idx + 5] = b.z;
      positions[idx + 6] = c.x; positions[idx + 7] = c.y; positions[idx + 8] = c.z;
      positions[idx + 9] = d.x; positions[idx + 10] = d.y; positions[idx + 11] = d.z;
    }

    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.edges.geometry.dispose();
    this.edges.geometry = new THREE.EdgesGeometry(this.geometry, 1);
  }

  private spawnSurfaceSpot(): void {
    for (const spot of this.surfaceSpots) {
      if (!spot.active) {
        const vertexIdx = Math.floor(Math.random() * 10);
        const v = this.vertices[vertexIdx];
        const colorIdx = Math.floor(vertexIdx / 2);

        spot.position.copy(v.currentPosition);
        spot.position.x += (Math.random() - 0.5) * 2;
        spot.position.y += (Math.random() - 0.5) * 2;
        spot.position.z += (Math.random() - 0.5) * 2;

        spot.velocity.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );

        const baseColor = new THREE.Color(VERTEX_COLORS[colorIdx]);
        const mixColor = new THREE.Color(VERTEX_COLORS[(colorIdx + Math.floor(Math.random() * 4) + 1) % 5]);
        spot.color.copy(baseColor).lerp(mixColor, Math.random() * 0.5);

        spot.size = 5 + Math.random() * 10;
        spot.maxLife = 2 + Math.random() * 3;
        spot.life = spot.maxLife;
        spot.active = true;
        return;
      }
    }
  }

  public update(delta: number, time: number): void {
    this.baseRotation += ROTATION_SPEED * delta;
    this.group.rotation.y = this.baseRotation;
    this.rotationY = this.baseRotation;

    this.breathTime += delta;
    const breath = Math.sin(this.breathTime * BREATH_FREQUENCY * Math.PI * 2) * BREATH_AMPLITUDE + 1;

    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];

      v.currentPosition.lerp(v.targetPosition, delta / INTERPOLATION_TIME);

      const breathOffset = v.basePosition.clone().normalize().multiplyScalar(breath - 1);
      const displayPos = v.currentPosition.clone().add(breathOffset);

      v.sphere.position.copy(displayPos);

      const emitterWorldPos = new THREE.Vector3();
      v.sphere.getWorldPosition(emitterWorldPos);
      const normal = displayPos.clone().normalize();
      this.particleSystem.updateEmitterPosition(i, emitterWorldPos, normal);
    }

    this.updatePrismGeometry();

    const spotBreath = 0.3 + (breath - 0.9) * 2;
    this.spotMaterial.opacity = 0.5 * spotBreath;

    if (Math.random() < 0.1) {
      this.spawnSurfaceSpot();
    }

    for (let i = 0; i < this.surfaceSpots.length; i++) {
      const spot = this.surfaceSpots[i];
      if (!spot.active) continue;

      spot.life -= delta;
      if (spot.life <= 0) {
        spot.active = false;
        continue;
      }

      spot.position.addScaledVector(spot.velocity, delta);
      spot.velocity.multiplyScalar(0.99);

      const lifeRatio = spot.life / spot.maxLife;
      this.spotPositions[i * 3] = spot.position.x;
      this.spotPositions[i * 3 + 1] = spot.position.y;
      this.spotPositions[i * 3 + 2] = spot.position.z;

      this.spotColors[i * 3] = spot.color.r * lifeRatio;
      this.spotColors[i * 3 + 1] = spot.color.g * lifeRatio;
      this.spotColors[i * 3 + 2] = spot.color.b * lifeRatio;

      this.spotSizes[i] = spot.size * lifeRatio;
    }

    (this.spotGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.spotGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.spotGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    const worldMin = new THREE.Vector3(-3, -3, -3);
    const worldMax = new THREE.Vector3(3, 3, 3);
    this.particleSystem.update(delta, time, { min: worldMin, max: worldMax });
  }

  public isDragging(): boolean {
    return this.dragVertexIndex >= 0;
  }

  public dispose(): void {
    this.scene.remove(this.group);
    this.geometry.dispose();
    this.spotGeometry.dispose();
    this.spotMaterial.dispose();
    this.particleSystem.dispose();
  }
}
