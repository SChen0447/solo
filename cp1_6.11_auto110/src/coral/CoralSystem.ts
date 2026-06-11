import * as THREE from 'three';
import { gsap } from 'gsap';
import { GenotypeParams, BranchNode, DEFAULT_PARAMS, DEFAULT_GRADIENT } from '../types/genotype';
import { randomRange, degToRad, randomColorVariation, getRadiusForLevel, generateId, lerp } from '../utils/math';

interface TransitionState {
  progress: number;
  oldPositions: Float32Array | null;
  oldColors: Float32Array | null;
  targetPositions: Float32Array | null;
  targetColors: Float32Array | null;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class CoralSystem {
  private scene: THREE.Scene;
  private params: GenotypeParams;
  private gradient: { bottom: string; top: string };
  private group: THREE.Group;
  private coralMesh: THREE.Mesh | null = null;
  private tipParticles: THREE.Points | null = null;
  private branchNodes: BranchNode[] = [];
  private transition: TransitionState;
  private isTransitioning: boolean = false;
  private particlePool: ParticleData[] = [];
  private particleGeometry: THREE.BufferGeometry | null = null;
  private maxParticles: number = 200;

  constructor(scene: THREE.Scene, params?: Partial<GenotypeParams>, gradient?: { bottom: string; top: string }) {
    this.scene = scene;
    this.params = { ...DEFAULT_PARAMS, ...params };
    this.gradient = gradient || { ...DEFAULT_GRADIENT };
    this.group = new THREE.Group();
    this.transition = {
      progress: 1,
      oldPositions: null,
      oldColors: null,
      targetPositions: null,
      targetColors: null
    };

    this.scene.add(this.group);
    this.generateStructure();
    this.buildMesh();
    this.initTipParticles();
  }

  private generateStructure(): void {
    this.branchNodes = [];
    const maxDepth = Math.floor(this.params.recursionDepth);
    const bottomColor = new THREE.Color(this.gradient.bottom);
    const topColor = new THREE.Color(this.gradient.top);

    const stemHeight = 8;
    const stemRadius = 0.15;

    const stemColor = bottomColor.clone().lerp(topColor, 0.5);
    
    const stemNode: BranchNode = {
      id: generateId(),
      level: 0,
      position: new THREE.Vector3(0, 0, 0),
      endPosition: new THREE.Vector3(0, stemHeight, 0),
      direction: new THREE.Vector3(0, 1, 0),
      length: stemHeight,
      radius: stemRadius,
      color: stemColor,
      children: [],
      isTip: false
    };

    this.branchNodes.push(stemNode);

    const branchesPerUnit = this.params.branchDensity * 2;
    const numSideBranches = Math.floor(stemHeight * branchesPerUnit);
    const branchSpacing = stemHeight / numSideBranches;

    let cumulativeTwist = 0;

    for (let i = 1; i <= numSideBranches; i++) {
      const t = i / numSideBranches;
      const height = t * stemHeight;
      const branchAngle = cumulativeTwist + t * degToRad(this.params.spiralAngle);
      
      const radiusAtHeight = stemRadius * (1 - t * 0.3);
      
      const sideCount = 1 + Math.floor(Math.random() * 2);
      
      for (let j = 0; j < sideCount; j++) {
        const angleOffset = (j / sideCount) * Math.PI * 2 + branchAngle;
        const startPos = new THREE.Vector3(
          Math.cos(angleOffset) * radiusAtHeight * 0.5,
          height,
          Math.sin(angleOffset) * radiusAtHeight * 0.5
        );

        this.generateSideBranch(
          stemNode,
          startPos,
          1,
          maxDepth,
          angleOffset,
          t,
          bottomColor,
          topColor
        );
      }

      cumulativeTwist += degToRad(this.params.stemTwist) * branchSpacing;
    }

    const tipPositions = this.findTipNodes(stemNode);
    for (const tip of tipPositions) {
      tip.isTip = true;
    }
  }

  private findTipNodes(node: BranchNode): BranchNode[] {
    if (node.children.length === 0) {
      return [node];
    }
    
    const tips: BranchNode[] = [];
    for (const child of node.children) {
      tips.push(...this.findTipNodes(child));
    }
    return tips;
  }

  private generateSideBranch(
    parentNode: BranchNode,
    startPos: THREE.Vector3,
    level: number,
    maxDepth: number,
    angleAround: number,
    heightT: number,
    bottomColor: THREE.Color,
    topColor: THREE.Color
  ): void {
    if (level > maxDepth) return;

    const angleFromAxis = randomRange(30, 60) * Math.PI / 180;
    const baseLength = randomRange(2, 4) * this.params.branchLength * (1 - level * 0.15);
    const length = Math.max(0.5, baseLength);
    const radius = getRadiusForLevel(level, maxDepth, 0.1);

    const direction = new THREE.Vector3();
    
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3(Math.cos(angleAround), 0, Math.sin(angleAround)).normalize();
    
    const quatAroundY = new THREE.Quaternion().setFromAxisAngle(up, angleAround);
    const quatAroundX = new THREE.Quaternion().setFromAxisAngle(tangent, angleFromAxis);
    
    direction.copy(up);
    direction.applyQuaternion(quatAroundY);
    direction.applyQuaternion(quatAroundX);
    direction.normalize();

    const endPos = startPos.clone().add(direction.clone().multiplyScalar(length));

    const endHeightT = Math.max(0, Math.min(1, endPos.y / 8));
    const avgT = (heightT + endHeightT) / 2;
    const nodeColor = bottomColor.clone().lerp(topColor, avgT);
    const variedColor = randomColorVariation(nodeColor, this.params.colorVariation);

    const node: BranchNode = {
      id: generateId(),
      level,
      position: startPos.clone(),
      endPosition: endPos.clone(),
      direction: direction.clone(),
      length,
      radius,
      color: variedColor,
      children: [],
      isTip: false
    };

    this.branchNodes.push(node);
    parentNode.children.push(node);

    if (level < maxDepth) {
      const childCount = 2 + Math.floor(Math.random() * 2);
      const spiralOffset = Math.random() * Math.PI * 2;
      
      for (let i = 0; i < childCount; i++) {
        const childAngle = (i / childCount) * Math.PI * 2 + spiralOffset + angleAround * 0.5;
        this.generateSideBranch(
          node,
          endPos.clone(),
          level + 1,
          maxDepth,
          childAngle,
          endHeightT,
          bottomColor,
          topColor
        );
      }
    }
  }

  private buildMesh(): void {
    if (this.coralMesh) {
      this.group.remove(this.coralMesh);
      this.coralMesh.geometry.dispose();
      (this.coralMesh.material as THREE.Material).dispose();
    }

    const geometries: THREE.BufferGeometry[] = [];

    for (const node of this.branchNodes) {
      const cylGeo = this.createCylinderGeometry(node);
      geometries.push(cylGeo);

      if (node.isTip) {
        const sphereGeo = this.createTipSphere(node);
        geometries.push(sphereGeo);
      }
    }

    const mergedGeo = this.mergeGeometries(geometries);
    mergedGeo.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.2,
      roughness: 0.7,
      side: THREE.DoubleSide
    });

    this.coralMesh = new THREE.Mesh(mergedGeo, material);
    this.coralMesh.castShadow = true;
    this.coralMesh.receiveShadow = true;
    this.group.add(this.coralMesh);

    for (const geo of geometries) {
      geo.dispose();
    }
  }

  private createCylinderGeometry(node: BranchNode): THREE.BufferGeometry {
    const radiusTop = node.radius * 0.7;
    const radiusBottom = node.radius;
    const height = node.length;
    const radialSegments = 8;
    const heightSegments = 1;

    const geometry = new THREE.CylinderGeometry(
      radiusTop, radiusBottom, height,
      radialSegments, heightSegments, false
    );

    const mid = new THREE.Vector3().addVectors(node.position, node.endPosition).multiplyScalar(0.5);
    geometry.translate(0, height / 2, 0);

    const direction = node.direction.clone();
    const up = new THREE.Vector3(0, 1, 0);
    
    if (!direction.equals(up) && !direction.clone().negate().equals(up)) {
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      geometry.applyQuaternion(quaternion);
    } else if (direction.y < 0) {
      geometry.rotateX(Math.PI);
    }

    geometry.translate(mid.x, mid.y, mid.z);

    const vertexCount = geometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    const colorArray = node.color.toArray();
    
    for (let i = 0; i < vertexCount; i++) {
      const yRatio = i / vertexCount;
      const darkened = node.color.clone().multiplyScalar(0.8 + yRatio * 0.4);
      const c = darkened.toArray();
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
  }

  private createTipSphere(node: BranchNode): THREE.BufferGeometry {
    const radius = 0.12 * this.params.tipBulge;
    const geometry = new THREE.SphereGeometry(radius, 8, 6);
    
    geometry.translate(node.endPosition.x, node.endPosition.y, node.endPosition.z);

    const vertexCount = geometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    const tipColor = node.color.clone().offsetHSL(0, 0.1, 0.15);
    const colorArray = tipColor.toArray();
    
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = colorArray[0];
      colors[i * 3 + 1] = colorArray[1];
      colors[i * 3 + 2] = colorArray[2];
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
  }

  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    let totalVertices = 0;
    let totalIndices = 0;

    for (const geo of geometries) {
      totalVertices += geo.attributes.position.count;
      totalIndices += geo.index ? geo.index.count : 0;
    }

    const positions = new Float32Array(totalVertices * 3);
    const colors = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const indices = totalIndices > 0 ? new Uint32Array(totalIndices) : null;

    let vertexOffset = 0;
    let indexOffset = 0;

    for (const geo of geometries) {
      const posAttr = geo.attributes.position;
      const colAttr = geo.attributes.color;
      const normAttr = geo.attributes.normal;
      const idxAttr = geo.index;

      for (let i = 0; i < posAttr.count; i++) {
        const vi = (vertexOffset + i) * 3;
        positions[vi] = posAttr.getX(i);
        positions[vi + 1] = posAttr.getY(i);
        positions[vi + 2] = posAttr.getZ(i);

        if (colAttr) {
          colors[vi] = colAttr.getX(i);
          colors[vi + 1] = colAttr.getY(i);
          colors[vi + 2] = colAttr.getZ(i);
        }

        if (normAttr) {
          normals[vi] = normAttr.getX(i);
          normals[vi + 1] = normAttr.getY(i);
          normals[vi + 2] = normAttr.getZ(i);
        }
      }

      if (idxAttr && indices) {
        for (let i = 0; i < idxAttr.count; i++) {
          indices[indexOffset + i] = idxAttr.getX(i) + vertexOffset;
        }
        indexOffset += idxAttr.count;
      }

      vertexOffset += posAttr.count;
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    result.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    result.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    
    if (indices) {
      result.setIndex(new THREE.BufferAttribute(indices, 1));
    }

    return result;
  }

  private initTipParticles(): void {
    if (this.tipParticles) {
      this.group.remove(this.tipParticles);
      this.tipParticles.geometry.dispose();
      (this.tipParticles.material as THREE.Material).dispose();
    }

    this.particleGeometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    const alphas = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 0.2;
      sizes[i] = 0;
      alphas[i] = 0;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float glow = 1.0 - dist * 2.0;
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.tipParticles = new THREE.Points(this.particleGeometry, material);
    this.group.add(this.tipParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        color: new THREE.Color()
      });
    }
  }

  spawnTransitionParticles(): void {
    const tipNodes = this.branchNodes.filter(n => n.isTip);
    const count = Math.min(150, Math.max(50, tipNodes.length * 3));
    
    let spawned = 0;
    for (let i = 0; i < this.particlePool.length && spawned < count; i++) {
      const poolParticle = this.particlePool[i];
      if (poolParticle.life > 0) continue;

      const tipNode = tipNodes[Math.floor(Math.random() * tipNodes.length)];
      
      poolParticle.position.copy(tipNode.endPosition);
      poolParticle.velocity.set(
        (Math.random() - 0.5) * 0.8,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 0.8
      );
      poolParticle.life = 0.5 + Math.random() * 0.3;
      poolParticle.maxLife = poolParticle.life;
      poolParticle.color.copy(tipNode.color).offsetHSL(0, 0, 0.2);
      
      spawned++;
    }
  }

  setParams(newParams: Partial<GenotypeParams>): void {
    this.params = { ...this.params, ...newParams };
    
    const needsRebuild = 
      newParams.branchDensity !== undefined ||
      newParams.spiralAngle !== undefined ||
      newParams.branchLength !== undefined ||
      newParams.recursionDepth !== undefined ||
      newParams.stemTwist !== undefined ||
      newParams.colorVariation !== undefined ||
      newParams.tipBulge !== undefined;

    if (needsRebuild) {
      this.animateTransition();
    }
  }

  setGradient(gradient: { bottom: string; top: string }): void {
    this.gradient = { ...gradient };
    this.animateTransition();
  }

  getParams(): GenotypeParams {
    return { ...this.params };
  }

  getGradient(): { bottom: string; top: string } {
    return { ...this.gradient };
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  private animateTransition(): void {
    if (!this.coralMesh) return;
    if (this.isTransitioning) return;

    const oldPositions = new Float32Array(this.coralMesh.geometry.attributes.position.array as Float32Array);
    const oldColors = new Float32Array(this.coralMesh.geometry.attributes.color.array as Float32Array);

    this.transition.oldPositions = oldPositions;
    this.transition.oldColors = oldColors;
    this.transition.progress = 0;

    this.generateStructure();
    this.buildMesh();

    this.transition.targetPositions = new Float32Array(this.coralMesh.geometry.attributes.position.array as Float32Array);
    this.transition.targetColors = new Float32Array(this.coralMesh.geometry.attributes.color.array as Float32Array);

    const minLen = Math.min(oldPositions.length, this.transition.targetPositions.length);
    (this.coralMesh.geometry.attributes.position.array as Float32Array).set(oldPositions.subarray(0, minLen));
    
    const minColorLen = Math.min(oldColors.length, this.transition.targetColors.length);
    (this.coralMesh.geometry.attributes.color.array as Float32Array).set(oldColors.subarray(0, minColorLen));
    
    this.coralMesh.geometry.attributes.position.needsUpdate = true;
    this.coralMesh.geometry.attributes.color.needsUpdate = true;

    this.isTransitioning = true;
    this.spawnTransitionParticles();

    const duration = 0.8;
    gsap.to(this.transition, {
      progress: 1,
      duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        this.updateTransitionGeometry();
      },
      onComplete: () => {
        this.isTransitioning = false;
        this.transition.oldPositions = null;
        this.transition.oldColors = null;
        this.transition.targetPositions = null;
        this.transition.targetColors = null;
      }
    });
  }

  private updateTransitionGeometry(): void {
    if (!this.coralMesh || !this.transition.oldPositions || !this.transition.targetPositions) return;

    const positions = this.coralMesh.geometry.attributes.position.array as Float32Array;
    const colors = this.coralMesh.geometry.attributes.color.array as Float32Array;
    const t = this.transition.progress;

    const posMinLen = Math.min(this.transition.oldPositions.length, this.transition.targetPositions.length, positions.length);

    for (let i = 0; i < posMinLen; i++) {
      positions[i] = lerp(this.transition.oldPositions[i], this.transition.targetPositions[i], t);
    }

    if (this.transition.oldColors && this.transition.targetColors) {
      const colorMinLen = Math.min(this.transition.oldColors.length, this.transition.targetColors.length, colors.length);
      for (let i = 0; i < colorMinLen; i++) {
        colors[i] = lerp(this.transition.oldColors[i], this.transition.targetColors[i], t);
      }
    }

    this.coralMesh.geometry.attributes.position.needsUpdate = true;
    this.coralMesh.geometry.attributes.color.needsUpdate = true;
  }

  update(deltaTime: number): void {
    this.updateParticles(deltaTime);
  }

  private updateParticles(deltaTime: number): void {
    if (!this.particleGeometry || !this.tipParticles) return;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const sizes = this.particleGeometry.attributes.size.array as Float32Array;
    const alphas = this.particleGeometry.attributes.alpha.array as Float32Array;

    for (let i = 0; i < this.particlePool.length; i++) {
      const particle = this.particlePool[i];
      
      if (particle.life > 0) {
        particle.life -= deltaTime;
        particle.position.addScaledVector(particle.velocity, deltaTime);
        particle.velocity.y -= deltaTime * 0.5;

        const lifeRatio = Math.max(0, particle.life / particle.maxLife);
        const size = (0.03 + lifeRatio * 0.05) * 2;
        const alpha = lifeRatio * lifeRatio;

        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        const colorArr = particle.color.toArray();
        colors[i * 3] = colorArr[0];
        colors[i * 3 + 1] = colorArr[1];
        colors[i * 3 + 2] = colorArr[2];

        sizes[i] = size;
        alphas[i] = alpha;
      } else {
        positions[i * 3 + 1] = -100;
        sizes[i] = 0;
        alphas[i] = 0;
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
    this.particleGeometry.attributes.alpha.needsUpdate = true;
  }

  dispose(): void {
    if (this.coralMesh) {
      this.coralMesh.geometry.dispose();
      (this.coralMesh.material as THREE.Material).dispose();
    }
    if (this.tipParticles) {
      this.tipParticles.geometry.dispose();
      (this.tipParticles.material as THREE.Material).dispose();
    }
    this.scene.remove(this.group);
  }
}
