import * as THREE from 'three';
import { EffectsManager } from './effects';

interface CurrentTrajectory {
  line: THREE.Line;
  arrows: THREE.Mesh[];
  positions: THREE.Vector3[];
  life: number;
  maxLife: number;
  arrowOffset: number;
}

export class Ocean {
  private scene: THREE.Scene;
  private effects: EffectsManager;
  private mesh!: THREE.Mesh;
  private material!: THREE.ShaderMaterial;
  private waterLevel = 0;
  private trajectories: CurrentTrajectory[] = [];

  private readonly OCEAN_SIZE = 60;
  private readonly SEGMENTS = 70;

  constructor(scene: THREE.Scene, effects: EffectsManager) {
    this.scene = scene;
    this.effects = effects;
    this.createOcean();
  }

  private createOcean(): void {
    const geometry = new THREE.PlaneGeometry(this.OCEAN_SIZE, this.OCEAN_SIZE, this.SEGMENTS, this.SEGMENTS);
    geometry.rotateX(-Math.PI / 2);

    const vertexShader = `
      uniform float uTime;
      varying vec2 vUv;
      varying float vElevation;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vec3 pos = position;
        
        float wave1 = sin(pos.x * 0.4 + uTime * 0.8) * 0.08;
        float wave2 = sin(pos.z * 0.6 + uTime * 1.1) * 0.06;
        float wave3 = sin((pos.x + pos.z) * 0.3 + uTime * 0.5) * 0.05;
        float wave4 = sin((pos.x - pos.z) * 0.5 + uTime * 1.3) * 0.04;
        
        float elevation = wave1 + wave2 + wave3 + wave4;
        pos.y += elevation;
        vElevation = elevation;

        float dx = 0.1;
        float dz = 0.1;
        float h1 = sin((pos.x + dx) * 0.4 + uTime * 0.8) * 0.08 +
                   sin(pos.z * 0.6 + uTime * 1.1) * 0.06 +
                   sin((pos.x + dx + pos.z) * 0.3 + uTime * 0.5) * 0.05 +
                   sin((pos.x + dx - pos.z) * 0.5 + uTime * 1.3) * 0.04;
        float h2 = sin(pos.x * 0.4 + uTime * 0.8) * 0.08 +
                   sin((pos.z + dz) * 0.6 + uTime * 1.1) * 0.06 +
                   sin((pos.x + pos.z + dz) * 0.3 + uTime * 0.5) * 0.05 +
                   sin((pos.x - pos.z - dz) * 0.5 + uTime * 1.3) * 0.04;
        
        vec3 tangentX = normalize(vec3(dx, h1 - elevation, 0.0));
        vec3 tangentZ = normalize(vec3(0.0, h2 - elevation, dz));
        vNormal = normalize(cross(tangentZ, tangentX));

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vElevation;
      varying vec3 vNormal;

      void main() {
        float mixFactor = smoothstep(-0.1, 0.15, vElevation);
        vec3 baseColor = mix(uDeepColor, uShallowColor, mixFactor);
        
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
        float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.4 + 0.6;
        
        vec3 viewDir = normalize(vec3(0.0, 1.0, 0.5));
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0) * 0.5;
        
        vec3 finalColor = baseColor * diffuse + vec3(1.0) * spec;
        
        gl_FragColor = vec4(finalColor, uOpacity);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x001a33) },
        uShallowColor: { value: new THREE.Color(0x66ccff) },
        uOpacity: { value: 0.75 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  public intersectRay(raycaster: THREE.Raycaster): THREE.Vector3 | null {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.waterLevel);
    const point = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, point);
    if (hit && point.x > -this.OCEAN_SIZE / 2 && point.x < this.OCEAN_SIZE / 2 &&
        point.z > -this.OCEAN_SIZE / 2 && point.z < this.OCEAN_SIZE / 2) {
      return point;
    }
    return null;
  }

  public getWaterLevel(): number {
    return this.waterLevel;
  }

  public getWaveHeight(x: number, z: number, time: number): number {
    const wave1 = Math.sin(x * 0.4 + time * 0.8) * 0.08;
    const wave2 = Math.sin(z * 0.6 + time * 1.1) * 0.06;
    const wave3 = Math.sin((x + z) * 0.3 + time * 0.5) * 0.05;
    const wave4 = Math.sin((x - z) * 0.5 + time * 1.3) * 0.04;
    return wave1 + wave2 + wave3 + wave4;
  }

  public addCurrentTrajectory(positions: THREE.Vector3[]): void {
    if (positions.length < 2) return;

    const linePoints = positions.map(p => p.clone());
    const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const material = new THREE.LineBasicMaterial({
      color: 0x3399ff,
      transparent: true,
      opacity: 0.7
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    const arrows: THREE.Mesh[] = [];
    const arrowCount = Math.min(3, positions.length - 1);
    for (let i = 0; i < arrowCount; i++) {
      const arrowGeom = new THREE.ConeGeometry(0.08, 0.2, 3);
      arrowGeom.rotateX(Math.PI / 2);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: 0x3399ff,
        transparent: true,
        opacity: 0.8
      });
      const arrow = new THREE.Mesh(arrowGeom, arrowMat);
      this.scene.add(arrow);
      arrows.push(arrow);
    }

    this.trajectories.push({
      line,
      arrows,
      positions: linePoints,
      life: 3.0,
      maxLife: 3.0,
      arrowOffset: 0
    });
  }

  public getTrajectories(): CurrentTrajectory[] {
    return this.trajectories;
  }

  public update(dt: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    for (let i = this.trajectories.length - 1; i >= 0; i--) {
      const traj = this.trajectories[i];
      traj.life -= dt;
      traj.arrowOffset += dt * 0.5;

      const alpha = Math.max(0, traj.life / traj.maxLife);
      (traj.line.material as THREE.LineBasicMaterial).opacity = alpha * 0.7;

      for (let a = 0; a < traj.arrows.length; a++) {
        const arrow = traj.arrows[a];
        const progress = ((traj.arrowOffset + a * 0.3) % 1);
        const pos = this.getPointAlongPath(traj.positions, progress);
        arrow.position.copy(pos);
        arrow.position.y += 0.05;
        const dir = this.getDirectionAlongPath(traj.positions, progress);
        if (dir.lengthSq() > 0.001) {
          arrow.lookAt(pos.clone().add(dir));
          arrow.rotateY(Math.PI);
        }
        (arrow.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
      }

      if (traj.life <= 0) {
        this.scene.remove(traj.line);
        traj.line.geometry.dispose();
        (traj.line.material as THREE.Material).dispose();
        for (const arrow of traj.arrows) {
          this.scene.remove(arrow);
          arrow.geometry.dispose();
          (arrow.material as THREE.Material).dispose();
        }
        this.trajectories.splice(i, 1);
      }
    }
  }

  private getPointAlongPath(points: THREE.Vector3[], t: number): THREE.Vector3 {
    const totalSegments = points.length - 1;
    const scaledT = t * totalSegments;
    const idx = Math.min(Math.floor(scaledT), totalSegments - 1);
    const localT = scaledT - idx;
    const p1 = points[idx];
    const p2 = points[Math.min(idx + 1, points.length - 1)];
    return p1.clone().lerp(p2, localT);
  }

  private getDirectionAlongPath(points: THREE.Vector3[], t: number): THREE.Vector3 {
    const totalSegments = points.length - 1;
    const scaledT = t * totalSegments;
    const idx = Math.min(Math.floor(scaledT), totalSegments - 1);
    const p1 = points[idx];
    const p2 = points[Math.min(idx + 1, points.length - 1)];
    return p2.clone().sub(p1).normalize();
  }
}
