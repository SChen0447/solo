import * as THREE from 'three';

export type MagnetType = 'bar' | 'horseshoe';
export type DisplayMode = 'static' | 'flow' | 'particles';

export interface MagnetConfig {
  type: MagnetType;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  length?: number;
  strength?: number;
}

export interface Pole {
  position: THREE.Vector3;
  polarity: 1 | -1;
}

export interface FieldLineData {
  curve: THREE.CatmullRomCurve3;
  points: THREE.Vector3[];
  startPole: Pole;
  endPole: Pole;
}

const N_COLOR = new THREE.Color(0xff4444);
const S_COLOR = new THREE.Color(0x4488ff);
const LINE_WIDTH = 0.03;
const POINTS_PER_LINE = 60;
const PARTICLES_PER_LINE = 3;

export class Magnet {
  public mesh: THREE.Group;
  public config: MagnetConfig;
  public poles: Pole[] = [];
  public highlightMesh?: THREE.Mesh;

  constructor(config: MagnetConfig) {
    this.config = {
      length: 4,
      strength: 1.0,
      rotation: new THREE.Euler(0, 0, 0),
      ...config
    };
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.config.position);
    if (this.config.rotation) {
      this.mesh.rotation.copy(this.config.rotation);
    }
    this.buildMesh();
    this.calculatePoles();
  }

  private buildMesh() {
    const length = this.config.length || 4;
    const width = 1;
    const height = 1;

    if (this.config.type === 'bar') {
      const nGeom = new THREE.BoxGeometry(length / 2, width, height);
      const sGeom = new THREE.BoxGeometry(length / 2, width, height);
      const nMat = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        metalness: 0.6,
        roughness: 0.3
      });
      const sMat = new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        metalness: 0.6,
        roughness: 0.3
      });
      const nMesh = new THREE.Mesh(nGeom, nMat);
      const sMesh = new THREE.Mesh(sGeom, sMat);
      nMesh.position.x = length / 4;
      sMesh.position.x = -length / 4;
      this.mesh.add(nMesh);
      this.mesh.add(sMesh);

      const edgeGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(length, width, height));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
      const edges = new THREE.LineSegments(edgeGeom, edgeMat);
      this.mesh.add(edges);
    } else {
      const thickness = 0.8;
      const armLength = length * 0.4;
      const gap = length * 0.3;
      const curveRadius = thickness;

      const armGeom = new THREE.BoxGeometry(thickness, thickness, armLength);
      const bottomGeom = new THREE.BoxGeometry(gap + thickness * 2, thickness, thickness);

      const nMat = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        metalness: 0.6,
        roughness: 0.3
      });
      const sMat = new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        metalness: 0.6,
        roughness: 0.3
      });
      const midMat = new THREE.MeshStandardMaterial({
        color: 0x555566,
        metalness: 0.6,
        roughness: 0.3
      });

      const leftArm = new THREE.Mesh(armGeom, sMat);
      leftArm.position.set(-(gap / 2 + thickness / 2), 0, -armLength / 2 + thickness / 2);
      const rightArm = new THREE.Mesh(armGeom, nMat);
      rightArm.position.set(gap / 2 + thickness / 2, 0, -armLength / 2 + thickness / 2);

      const bottom = new THREE.Mesh(bottomGeom, midMat);
      bottom.position.set(0, 0, -(armLength - thickness / 2));

      const curveGeom = new THREE.TorusGeometry(curveRadius, thickness / 2, 8, 16, Math.PI);
      const curve = new THREE.Mesh(curveGeom, midMat);
      curve.position.set(0, 0, -(armLength - thickness / 2));
      curve.rotation.x = Math.PI / 2;

      this.mesh.add(leftArm);
      this.mesh.add(rightArm);
      this.mesh.add(bottom);
      this.mesh.add(curve);
    }
  }

  private calculatePoles() {
    const length = this.config.length || 4;
    if (this.config.type === 'bar') {
      const nPos = new THREE.Vector3(length / 2, 0, 0);
      const sPos = new THREE.Vector3(-length / 2, 0, 0);
      this.mesh.localToWorld(nPos);
      this.mesh.localToWorld(sPos);
      this.poles = [
        { position: nPos, polarity: 1 },
        { position: sPos, polarity: -1 }
      ];
    } else {
      const gap = length * 0.3;
      const thickness = 0.8;
      const nPos = new THREE.Vector3(gap / 2 + thickness / 2, 0, 0);
      const sPos = new THREE.Vector3(-(gap / 2 + thickness / 2), 0, 0);
      this.mesh.localToWorld(nPos);
      this.mesh.localToWorld(sPos);
      this.poles = [
        { position: nPos, polarity: 1 },
        { position: sPos, polarity: -1 }
      ];
    }
  }

  public updatePoles() {
    this.mesh.updateMatrixWorld(true);
    this.calculatePoles();
  }

  public setHighlight(active: boolean) {
    if (active) {
      if (!this.highlightMesh) {
        const length = this.config.length || 4;
        const geom = this.config.type === 'bar'
          ? new THREE.BoxGeometry(length + 0.2, 1.2, 1.2)
          : new THREE.BoxGeometry(length + 0.4, 1.4, length * 0.5 + 0.4);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.15,
          side: THREE.BackSide
        });
        this.highlightMesh = new THREE.Mesh(geom, mat);
        this.mesh.add(this.highlightMesh);
      }
    } else if (this.highlightMesh) {
      this.mesh.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = undefined;
    }
  }
}

export class MagneticFieldSystem {
  public scene: THREE.Scene;
  public magnets: Magnet[] = [];
  public lineCount: number = 200;
  public fieldStrength: number = 1.0;
  public displayMode: DisplayMode = 'flow';

  private lineGroup: THREE.Group = new THREE.Group();
  private particleGroup: THREE.Group = new THREE.Group();
  private highlightGroup: THREE.Group = new THREE.Group();

  private fieldLines: FieldLineData[] = [];
  private flowMaterials: THREE.ShaderMaterial[] = [];
  private particleSystems: { mesh: THREE.Points; offsets: Float32Array; speeds: Float32Array }[] = [];
  private collisionParticles: THREE.Points[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lineGroup.name = 'fieldLines';
    this.particleGroup.name = 'particles';
    this.highlightGroup.name = 'highlights';
    this.scene.add(this.lineGroup);
    this.scene.add(this.particleGroup);
    this.scene.add(this.highlightGroup);
  }

  public addMagnet(config: MagnetConfig): Magnet {
    const magnet = new Magnet(config);
    this.magnets.push(magnet);
    this.scene.add(magnet.mesh);
    this.regenerateLines(true);
    this.checkPolarityInteraction();
    return magnet;
  }

  public removeMagnet(index: number) {
    if (index < 0 || index >= this.magnets.length) return;
    const magnet = this.magnets[index];
    this.scene.remove(magnet.mesh);
    magnet.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.magnets.splice(index, 1);
    this.regenerateLines(true);
  }

  public setLineCount(count: number) {
    this.lineCount = Math.max(50, Math.min(500, Math.round(count)));
    this.regenerateLines(false);
  }

  public setFieldStrength(strength: number) {
    this.fieldStrength = Math.max(0.5, Math.min(3.0, strength));
    this.regenerateLines(false);
  }

  public setDisplayMode(mode: DisplayMode) {
    this.displayMode = mode;
    this.updateVisibility();
  }

  private updateVisibility() {
    this.lineGroup.visible = this.displayMode !== 'particles';
    this.particleGroup.visible = this.displayMode === 'particles';
    this.highlightGroup.visible = this.displayMode === 'flow';
  }

  public getMagnets(): Magnet[] {
    return this.magnets;
  }

  public getLineCount(): number {
    return this.fieldLines.length;
  }

  private getAllPoles(): Pole[] {
    const poles: Pole[] = [];
    this.magnets.forEach(m => {
      m.updatePoles();
      poles.push(...m.poles);
    });
    return poles;
  }

  public calculateField(point: THREE.Vector3): THREE.Vector3 {
    const field = new THREE.Vector3();
    const poles = this.getAllPoles();
    const mu0 = this.fieldStrength * 2.0;

    poles.forEach(pole => {
      const diff = point.clone().sub(pole.position);
      const dist = diff.length();
      if (dist < 0.15) return;
      const dist3 = Math.pow(dist, 3);
      const contribution = diff.multiplyScalar((pole.polarity * mu0) / dist3);
      field.add(contribution);
    });

    return field;
  }

  private traceFieldLine(startPole: Pole, endPole: Pole): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const step = 0.08 / this.fieldStrength;
    const maxSteps = 300;

    const direction = endPole.position.clone().sub(startPole.position).normalize();
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8
    ).normalize().multiplyScalar(0.3);

    let pos = startPole.position.clone().add(direction.multiplyScalar(0.3)).add(jitter);

    points.push(startPole.position.clone());
    points.push(pos.clone());

    for (let i = 0; i < maxSteps; i++) {
      const field = this.calculateField(pos);
      const fieldLen = field.length();
      if (fieldLen < 0.001) break;

      field.normalize().multiplyScalar(step);
      pos = pos.add(field);
      points.push(pos.clone());

      const distToEnd = pos.distanceTo(endPole.position);
      if (distToEnd < 0.35) {
        points.push(endPole.position.clone());
        break;
      }

      if (pos.length() > 25) break;
    }

    if (points.length < 4) return [];

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    return curve.getPoints(POINTS_PER_LINE);
  }

  public regenerateLines(animate: boolean = true) {
    this.clearLines();

    if (this.magnets.length === 0) return;

    const poles = this.getAllPoles();
    const nPoles = poles.filter(p => p.polarity === 1);
    const sPoles = poles.filter(p => p.polarity === -1);

    if (nPoles.length === 0 || sPoles.length === 0) return;

    const totalLines = this.lineCount;
    const linesPerPair = Math.ceil(totalLines / (nPoles.length * sPoles.length));

    nPoles.forEach(nPole => {
      sPoles.forEach(sPole => {
        for (let i = 0; i < linesPerPair; i++) {
          if (this.fieldLines.length >= totalLines) break;
          const pts = this.traceFieldLine(nPole, sPole);
          if (pts.length > 3) {
            const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
            this.fieldLines.push({
              curve,
              points: pts,
              startPole: nPole,
              endPole: sPole
            });
          }
        }
      });
    });

    this.buildLineObjects();
    this.buildParticleObjects();

    if (animate) {
      this.animateFadeIn();
    }

    this.updateVisibility();
  }

  private buildLineObjects() {
    this.fieldLines.forEach((line, idx) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(line.points);

      const colors = new Float32Array(line.points.length * 3);
      for (let i = 0; i < line.points.length; i++) {
        const t = i / (line.points.length - 1);
        const color = N_COLOR.clone().lerp(S_COLOR, t);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      if (this.displayMode === 'flow') {
        const material = this.createFlowMaterial();
        this.flowMaterials.push(material);
        const lineMesh = new THREE.Line(geometry, material);
        lineMesh.userData.lineIndex = idx;
        this.lineGroup.add(lineMesh);

        const highlightGeom = new THREE.BufferGeometry();
        const highlightPos = new Float32Array(3);
        highlightGeom.setAttribute('position', new THREE.BufferAttribute(highlightPos, 3));
        const highlightMat = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.18,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const highlight = new THREE.Points(highlightGeom, highlightMat);
        highlight.userData.lineIndex = idx;
        highlight.userData.progress = Math.random();
        this.highlightGroup.add(highlight);
      } else {
        const material = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.65,
          linewidth: 1
        });
        const lineMesh = new THREE.Line(geometry, material);
        this.lineGroup.add(lineMesh);
      }
    });
  }

  private createFlowMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.2 }
      },
      vertexShader: `
        varying vec3 vColor;
        varying float vUv;
        void main() {
          vColor = color;
          vUv = uv.x;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSpeed;
        varying vec3 vColor;
        varying float vUv;
        void main() {
          float pulse = sin(vUv * 20.0 - uTime * uSpeed * 8.0) * 0.3 + 0.7;
          float glow = 0.6 + 0.4 * sin(vUv * 40.0 - uTime * uSpeed * 12.0);
          gl_FragColor = vec4(vColor * glow, pulse * 0.7);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private buildParticleObjects() {
    this.fieldLines.forEach((line, idx) => {
      const particleCount = PARTICLES_PER_LINE;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const offsets = new Float32Array(particleCount);
      const speeds = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        offsets[i] = (i / particleCount + Math.random() * 0.3) % 1.0;
        speeds[i] = 0.002 + Math.random() * 0.003;
        const pt = line.curve.getPoint(offsets[i]);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
        const color = N_COLOR.clone().lerp(S_COLOR, offsets[i]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const points = new THREE.Points(geom, mat);
      points.userData.lineIndex = idx;
      this.particleGroup.add(points);
      this.particleSystems.push({ mesh: points, offsets, speeds });
    });
  }

  private animateFadeIn() {
    const startTime = performance.now();
    const duration = 500;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.lineGroup.traverse(obj => {
        if (obj instanceof THREE.Line && obj.material) {
          (obj.material as THREE.LineBasicMaterial).opacity = 0.65 * eased;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  private clearLines() {
    const disposeGroup = (group: THREE.Group) => {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Line || child instanceof THREE.Points) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    };

    disposeGroup(this.lineGroup);
    disposeGroup(this.particleGroup);
    disposeGroup(this.highlightGroup);

    this.flowMaterials = [];
    this.particleSystems = [];
    this.fieldLines = [];
  }

  public checkPolarityInteraction() {
    this.clearCollisionParticles();
    if (this.magnets.length < 2) return;

    const poles = this.getAllPoles();
    for (let i = 0; i < poles.length; i++) {
      for (let j = i + 1; j < poles.length; j++) {
        const p1 = poles[i];
        const p2 = poles[j];
        const dist = p1.position.distanceTo(p2.position);
        if (dist < 4.0 && p1.polarity === p2.polarity) {
          this.spawnCollisionBurst(p1.position.clone().add(p2.position).multiplyScalar(0.5));
        }
      }
    }
  }

  private spawnCollisionBurst(position: THREE.Vector3) {
    const particleCount = 60;
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(0.05 + Math.random() * 0.1);
      velocities.push(vel);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff6b6b,
      size: 0.15,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const burst = new THREE.Points(geom, mat);
    burst.userData.velocities = velocities;
    burst.userData.life = 1.0;
    this.scene.add(burst);
    this.collisionParticles.push(burst);
  }

  private clearCollisionParticles() {
    this.collisionParticles.forEach(p => {
      this.scene.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });
    this.collisionParticles = [];
  }

  public updateAnimation(time: number, deltaTime: number) {
    this.flowMaterials.forEach(mat => {
      mat.uniforms.uTime.value = time;
    });

    this.highlightGroup.children.forEach(child => {
      if (child instanceof THREE.Points) {
        const lineIdx = child.userData.lineIndex;
        const line = this.fieldLines[lineIdx];
        if (!line) return;

        child.userData.progress += 0.2 * deltaTime;
        if (child.userData.progress > 1.0) child.userData.progress -= 1.0;

        const pt = line.curve.getPoint(child.userData.progress);
        const posAttr = child.geometry.getAttribute('position') as THREE.BufferAttribute;
        posAttr.setXYZ(0, pt.x, pt.y, pt.z);
        posAttr.needsUpdate = true;
      }
    });

    this.particleSystems.forEach(sys => {
      const lineIdx = sys.mesh.userData.lineIndex;
      const line = this.fieldLines[lineIdx];
      if (!line) return;

      const posAttr = sys.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = sys.mesh.geometry.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < sys.offsets.length; i++) {
        sys.offsets[i] += sys.speeds[i];
        if (sys.offsets[i] > 1.0) sys.offsets[i] -= 1.0;

        const pt = line.curve.getPoint(sys.offsets[i]);
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);

        const color = N_COLOR.clone().lerp(S_COLOR, sys.offsets[i]);
        colAttr.setXYZ(i, color.r, color.g, color.b);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    });

    for (let i = this.collisionParticles.length - 1; i >= 0; i--) {
      const burst = this.collisionParticles[i];
      const velocities = burst.userData.velocities as THREE.Vector3[];
      const posAttr = burst.geometry.getAttribute('position') as THREE.BufferAttribute;

      for (let j = 0; j < velocities.length; j++) {
        const x = posAttr.getX(j) + velocities[j].x;
        const y = posAttr.getY(j) + velocities[j].y;
        const z = posAttr.getZ(j) + velocities[j].z;
        posAttr.setXYZ(j, x, y, z);
        velocities[j].multiplyScalar(0.96);
      }
      posAttr.needsUpdate = true;

      burst.userData.life -= deltaTime * 1.5;
      (burst.material as THREE.PointsMaterial).opacity = Math.max(0, burst.userData.life);

      if (burst.userData.life <= 0) {
        this.scene.remove(burst);
        burst.geometry.dispose();
        (burst.material as THREE.Material).dispose();
        this.collisionParticles.splice(i, 1);
      }
    }
  }

  public dispose() {
    this.clearLines();
    this.clearCollisionParticles();
    this.magnets.forEach(m => {
      this.scene.remove(m.mesh);
    });
    this.scene.remove(this.lineGroup);
    this.scene.remove(this.particleGroup);
    this.scene.remove(this.highlightGroup);
  }
}
