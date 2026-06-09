import * as THREE from 'three';

export interface PathData {
  curve: THREE.CatmullRomCurve3;
  points: THREE.Vector3[];
  speed: number;
}

export class CurrentPath {
  public readonly group: THREE.Group;
  public paths: PathData[] = [];
  private arrows: { mesh: THREE.Mesh; pathIndex: number; progress: number }[] = [];
  private trailParticles: THREE.Points;
  private trailPositions: Float32Array;
  private trailAlphas: Float32Array;
  private trailData: { position: THREE.Vector3; life: number; maxLife: number }[] = [];
  private readonly ARROW_SPEED = 0.5;
  private readonly TRAIL_COUNT = 250;

  constructor() {
    this.group = new THREE.Group();

    this.createCurrentPaths();
    this.createArrows();
    const trailResult = this.createTrailParticles();
    this.trailParticles = trailResult.points;
    this.trailPositions = trailResult.positions;
    this.trailAlphas = trailResult.alphas;
    this.group.add(this.trailParticles);
  }

  private createCurrentPaths(): void {
    const pathConfigs = [
      { start: new THREE.Vector3(-9, 5, -9), end: new THREE.Vector3(9, 3, 9), midBias: new THREE.Vector3(0, 2, 0) },
      { start: new THREE.Vector3(8, 6, -8), end: new THREE.Vector3(-8, 2, 8), midBias: new THREE.Vector3(-2, -1, 3) },
      { start: new THREE.Vector3(-6, 0, 7), end: new THREE.Vector3(7, -2, -7), midBias: new THREE.Vector3(2, 4, -2) },
      { start: new THREE.Vector3(5, -5, 6), end: new THREE.Vector3(-5, -3, -6), midBias: new THREE.Vector3(-3, 1, 2) },
      { start: new THREE.Vector3(-8, -6, -5), end: new THREE.Vector3(8, -7, 5), midBias: new THREE.Vector3(0, -3, 0) }
    ];

    for (let p = 0; p < 5; p++) {
      const config = pathConfigs[p];
      const controlPoints: THREE.Vector3[] = [];

      for (let i = 0; i < 40; i++) {
        const t = i / 39;
        const point = new THREE.Vector3().lerpVectors(config.start, config.end, t);
        const noiseX = Math.sin(t * Math.PI * 3 + p * 1.5) * 3;
        const noiseY = Math.sin(t * Math.PI * 2 + p * 2.1) * 2 + config.midBias.y * Math.sin(t * Math.PI);
        const noiseZ = Math.cos(t * Math.PI * 2.5 + p * 0.8) * 3;
        point.x += noiseX;
        point.y += noiseY;
        point.z += noiseZ;
        controlPoints.push(point);
      }

      const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);
      const points = curve.getPoints(200);

      const lineColors = new Float32Array(points.length * 3);
      const colorStart = new THREE.Color(0x1a6a9a);
      const colorEnd = new THREE.Color(0x3ababa);

      for (let i = 0; i < points.length; i++) {
        const t = i / (points.length - 1);
        const color = colorStart.clone().lerp(colorEnd, t);
        lineColors[i * 3] = color.r;
        lineColors[i * 3 + 1] = color.g;
        lineColors[i * 3 + 2] = color.b;
      }

      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        linewidth: 2
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.group.add(line);

      this.paths.push({
        curve,
        points,
        speed: 0.8 + Math.random() * 0.4
      });
    }
  }

  private createArrows(): void {
    for (let p = 0; p < this.paths.length; p++) {
      const path = this.paths[p];
      const curveLength = path.curve.getLength();
      const arrowCount = Math.floor(curveLength);

      for (let i = 0; i < arrowCount; i++) {
        const geometry = new THREE.ConeGeometry(0.1, 0.3, 6);
        const colorT = i / Math.max(1, arrowCount - 1);
        const color = new THREE.Color().lerpColors(
          new THREE.Color(0x1a6a9a),
          new THREE.Color(0x3ababa),
          colorT
        );

        const material = new THREE.MeshPhongMaterial({
          color,
          transparent: true,
          opacity: 0.85,
          shininess: 50
        });

        const arrow = new THREE.Mesh(geometry, material);
        this.group.add(arrow);
        this.arrows.push({
          mesh: arrow,
          pathIndex: p,
          progress: i / arrowCount
        });
      }
    }
  }

  private createTrailParticles(): {
    points: THREE.Points;
    positions: Float32Array;
    alphas: Float32Array;
  } {
    const positions = new Float32Array(this.TRAIL_COUNT * 3);
    const colors = new Float32Array(this.TRAIL_COUNT * 3);
    const alphas = new Float32Array(this.TRAIL_COUNT);

    for (let i = 0; i < this.TRAIL_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      alphas[i] = 0;
      this.trailData.push({
        position: new THREE.Vector3(),
        life: 0,
        maxLife: 2 + Math.random()
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    return { points, positions, alphas };
  }

  public getPathData(): PathData[] {
    return this.paths;
  }

  public getFlowDataAtPosition(position: THREE.Vector3): { speed: number; angle: number } | null {
    let closestDist = Infinity;
    let closestTangent: THREE.Vector3 | null = null;
    let closestSpeed = 0;

    for (const path of this.paths) {
      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        const dist = this.pointToSegmentDistance(position, p1, p2);
        if (dist < closestDist && dist < 3) {
          closestDist = dist;
          closestTangent = new THREE.Vector3().subVectors(p2, p1).normalize();
          closestSpeed = path.speed;
        }
      }
    }

    if (!closestTangent) return null;

    const angle = Math.atan2(closestTangent.x, closestTangent.z) * (180 / Math.PI);
    return { speed: closestSpeed * this.ARROW_SPEED * 2, angle };
  }

  private pointToSegmentDistance(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(p, a);
    const abSq = ab.dot(ab);
    if (abSq === 0) return p.distanceTo(a);
    let t = ap.dot(ab) / abSq;
    t = Math.max(0, Math.min(1, t));
    const projection = new THREE.Vector3().addVectors(a, ab.multiplyScalar(t));
    return p.distanceTo(projection);
  }

  public update(deltaTime: number, time: number): void {
    for (const arrow of this.arrows) {
      arrow.progress += (this.ARROW_SPEED / this.paths[arrow.pathIndex].curve.getLength()) * deltaTime;
      if (arrow.progress > 1) arrow.progress -= 1;
      if (arrow.progress < 0) arrow.progress += 1;

      const path = this.paths[arrow.pathIndex];
      const pos = path.curve.getPointAt(arrow.progress);
      const tangent = path.curve.getTangentAt(arrow.progress).normalize();

      arrow.mesh.position.copy(pos);

      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, tangent);
      arrow.mesh.quaternion.copy(quaternion);

      if (Math.random() < 0.1) {
        this.spawnTrailParticle(pos, tangent);
      }
    }

    this.updateTrailParticles(deltaTime);
  }

  private spawnTrailParticle(position: THREE.Vector3, direction: THREE.Vector3): void {
    for (let i = 0; i < this.TRAIL_COUNT; i++) {
      if (this.trailData[i].life <= 0) {
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );
        this.trailData[i].position.copy(position).add(jitter);
        this.trailData[i].life = this.trailData[i].maxLife;
        break;
      }
    }
  }

  private updateTrailParticles(deltaTime: number): void {
    for (let i = 0; i < this.TRAIL_COUNT; i++) {
      const data = this.trailData[i];
      if (data.life > 0) {
        data.life -= deltaTime;
        const alpha = Math.max(0, data.life / data.maxLife);
        this.trailPositions[i * 3] = data.position.x;
        this.trailPositions[i * 3 + 1] = data.position.y;
        this.trailPositions[i * 3 + 2] = data.position.z;
        this.trailAlphas[i] = alpha;
      } else {
        this.trailPositions[i * 3 + 1] = -100;
        this.trailAlphas[i] = 0;
      }
    }
    this.trailParticles.geometry.attributes.position.needsUpdate = true;
    (this.trailParticles.material as THREE.PointsMaterial).opacity = 0.6;
  }
}
