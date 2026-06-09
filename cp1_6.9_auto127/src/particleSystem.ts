import * as THREE from 'three';

export interface QuantumParticle {
  id: number;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  colorTransitionTime: number;
  colorTransitionDuration: number;
  isColorTransitioning: boolean;
  velocity: THREE.Vector3;
  hovered: boolean;
  hoverTime: number;
  baseRadius: number;
  entangledWith: number | null;
  isDragging: boolean;
  lastPosition: THREE.Vector3;
  syncedPosition: THREE.Vector3;
  syncDelayQueue: { position: THREE.Vector3; time: number }[];
  glowIntensity: number;
  targetGlowIntensity: number;
}

export interface EntanglementPair {
  idA: number;
  idB: number;
  cable: THREE.Mesh;
  cableAlpha: number;
  cableFlashTime: number;
  isFlashing: boolean;
}

export interface BurstPoint {
  position: THREE.Vector3;
  particles: THREE.Points;
  particleVelocities: THREE.Vector3[];
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  private particles: Map<number, QuantumParticle> = new Map();
  private entanglementPairs: EntanglementPair[] = [];
  private burstPoints: BurstPoint[] = [];
  private nextParticleId = 0;

  private readonly quantumPalette = [
    new THREE.Color(0xff3366),
    new THREE.Color(0x33ff66),
    new THREE.Color(0x3366ff),
    new THREE.Color(0xffcc33),
    new THREE.Color(0xaa66ff),
  ];

  private readonly baseParticleRadius = 0.3;
  private readonly hoverParticleRadius = 0.4;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  private activeBurstCenters: Set<string> = new Set();

  public onEntanglementCountChange?: (count: number) => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  public getParticleCount(): number {
    return this.particles.size;
  }

  public getEntanglementPairCount(): number {
    return this.entanglementPairs.length;
  }

  public createParticle(worldPosition: THREE.Vector3): QuantumParticle {
    const color = this.quantumPalette[Math.floor(Math.random() * this.quantumPalette.length)].clone();

    const sphereGeom = new THREE.SphereGeometry(this.baseParticleRadius, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    sphere.position.copy(worldPosition);

    const glowGeom = new THREE.SphereGeometry(this.baseParticleRadius * 1.8, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: color.clone() },
        intensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        void main() {
          float intensityFactor = pow(0.7 - dot(vNormal, vPositionNormal), 2.0);
          gl_FragColor = vec4(glowColor, intensityFactor * intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    sphere.add(glow);

    const angle = Math.random() * Math.PI * 2;
    const zAngle = Math.random() * Math.PI - Math.PI / 2;
    const speed = 0.01 + Math.random() * 0.01;
    const velocity = new THREE.Vector3(
      Math.cos(angle) * Math.cos(zAngle) * speed,
      Math.sin(zAngle) * speed,
      Math.sin(angle) * Math.cos(zAngle) * speed
    );

    const particle: QuantumParticle = {
      id: this.nextParticleId++,
      mesh: sphere,
      glow: glow,
      baseColor: color.clone(),
      currentColor: color.clone(),
      targetColor: color.clone(),
      colorTransitionTime: 0,
      colorTransitionDuration: 0,
      isColorTransitioning: false,
      velocity: velocity,
      hovered: false,
      hoverTime: 0,
      baseRadius: this.baseParticleRadius,
      entangledWith: null,
      isDragging: false,
      lastPosition: worldPosition.clone(),
      syncedPosition: worldPosition.clone(),
      syncDelayQueue: [],
      glowIntensity: 1.0,
      targetGlowIntensity: 1.0,
    };

    this.particles.set(particle.id, particle);
    this.scene.add(sphere);

    return particle;
  }

  public getParticleAtScreenPoint(screenX: number, screenY: number, containerWidth: number, containerHeight: number): QuantumParticle | null {
    this.pointer.x = (screenX / containerWidth) * 2 - 1;
    this.pointer.y = -(screenY / containerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const meshes: THREE.Object3D[] = [];
    this.particles.forEach((p) => meshes.push(p.mesh));

    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      for (const [, particle] of this.particles) {
        if (particle.mesh === hit) {
          return particle;
        }
      }
    }
    return null;
  }

  public screenToWorld(screenX: number, screenY: number, containerWidth: number, containerHeight: number, z: number = 0): THREE.Vector3 {
    this.pointer.x = (screenX / containerWidth) * 2 - 1;
    this.pointer.y = -(screenY / containerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const target = new THREE.Vector3();
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePoint = new THREE.Vector3(0, 0, z);
    this.raycaster.ray.intersectPlane(new THREE.Plane(planeNormal, -planePoint.dot(planeNormal)), target);
    return target;
  }

  public setParticleHovered(particle: QuantumParticle | null): void {
    this.particles.forEach((p) => {
      if (p !== particle) {
        p.hovered = false;
      }
    });
    if (particle) {
      particle.hovered = true;
    }
  }

  public createEntanglement(particleA: QuantumParticle, particleB: QuantumParticle): void {
    if (particleA.id === particleB.id) return;
    if (particleA.entangledWith !== null) return;
    if (particleB.entangledWith !== null) return;

    const exists = this.entanglementPairs.some(
      (p) =>
        (p.idA === particleA.id && p.idB === particleB.id) ||
        (p.idA === particleB.id && p.idB === particleA.id)
    );
    if (exists) return;

    const cable = this.createEnergyCable(particleA, particleB);
    this.scene.add(cable);

    const pair: EntanglementPair = {
      idA: particleA.id,
      idB: particleB.id,
      cable: cable,
      cableAlpha: 0.6,
      cableFlashTime: 0,
      isFlashing: true,
    };
    this.entanglementPairs.push(pair);

    particleA.entangledWith = particleB.id;
    particleB.entangledWith = particleA.id;

    particleA.targetGlowIntensity = 1.3;
    particleB.targetGlowIntensity = 1.3;

    this.onEntanglementCountChange?.(this.entanglementPairs.length);

    if (this.entanglementPairs.length >= 3) {
      this.generateBurstPoints();
    }
  }

  private createEnergyCable(particleA: QuantumParticle, particleB: QuantumParticle): THREE.Mesh {
    const mixedColor = particleA.baseColor.clone().lerp(particleB.baseColor, 0.5);

    const geometry = new THREE.BufferGeometry();
    const segmentCount = 40;
    const positions = new Float32Array(segmentCount * 3);
    const colors = new Float32Array(segmentCount * 3);
    const sizes = new Float32Array(segmentCount);

    for (let i = 0; i < segmentCount; i++) {
      const t = i / (segmentCount - 1);
      const i3 = i * 3;
      const startPos = particleA.mesh.position;
      const endPos = particleB.mesh.position;

      const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
      const offsetDir = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      midPoint.add(offsetDir);

      const pos = this.quadraticBezier(startPos, midPoint, endPos, t);
      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;

      const col = particleA.baseColor.clone().lerp(particleB.baseColor, t);
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      const centerFactor = 1 - Math.abs(t - 0.5) * 2;
      sizes[i] = 1 + centerFactor * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        alpha: { value: 0.6 },
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float alpha;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          float fade = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, fade * alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Mesh(geometry, material);
  }

  private quadraticBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
    const mt = 1 - t;
    return new THREE.Vector3(
      mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z
    );
  }

  private updateEnergyCable(pair: EntanglementPair): void {
    const particleA = this.particles.get(pair.idA);
    const particleB = this.particles.get(pair.idB);
    if (!particleA || !particleB) return;

    const positions = pair.cable.geometry.attributes.position as THREE.BufferAttribute;
    const colors = pair.cable.geometry.attributes.color as THREE.BufferAttribute;
    const segmentCount = positions.count;

    const startPos = particleA.mesh.position;
    const endPos = particleB.mesh.position;
    const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    const cableVec = new THREE.Vector3().subVectors(endPos, startPos);
    const perpDir = new THREE.Vector3(
      -cableVec.y,
      cableVec.x,
      cableVec.z * 0.3
    ).normalize();
    midPoint.add(perpDir.multiplyScalar(cableVec.length() * 0.1));

    for (let i = 0; i < segmentCount; i++) {
      const t = i / (segmentCount - 1);
      const i3 = i * 3;
      const pos = this.quadraticBezier(startPos, midPoint, endPos, t);
      positions.array[i3] = pos.x;
      positions.array[i3 + 1] = pos.y;
      positions.array[i3 + 2] = pos.z;

      const col = particleA.currentColor.clone().lerp(particleB.currentColor, t);
      colors.array[i3] = col.r;
      colors.array[i3 + 1] = col.g;
      colors.array[i3 + 2] = col.b;
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;

    const material = pair.cable.material as THREE.ShaderMaterial;
    const intensityMultiplier = (particleA.glowIntensity + particleB.glowIntensity) / 2;
    material.uniforms.alpha.value = pair.cableAlpha * intensityMultiplier;
  }

  public startDrag(particle: QuantumParticle): void {
    particle.isDragging = true;
    particle.lastPosition.copy(particle.mesh.position);
    particle.velocity.set(0, 0, 0);
  }

  public dragParticle(particle: QuantumParticle, worldPosition: THREE.Vector3): void {
    if (!particle.isDragging) return;

    const displacement = new THREE.Vector3().subVectors(worldPosition, particle.mesh.position);
    particle.mesh.position.copy(worldPosition);
    particle.lastPosition.copy(worldPosition);

    if (particle.entangledWith !== null) {
      const partner = this.particles.get(particle.entangledWith);
      if (partner) {
        partner.syncDelayQueue.push({
          position: worldPosition.clone().add(displacement),
          time: performance.now() + 100,
        });
      }
    }
  }

  public endDrag(particle: QuantumParticle): void {
    particle.isDragging = false;
    const angle = Math.random() * Math.PI * 2;
    const zAngle = Math.random() * Math.PI - Math.PI / 2;
    const speed = 0.01 + Math.random() * 0.01;
    particle.velocity.set(
      Math.cos(angle) * Math.cos(zAngle) * speed,
      Math.sin(zAngle) * speed,
      Math.sin(angle) * Math.cos(zAngle) * speed
    );
  }

  public triggerColorSwap(particleA: QuantumParticle, particleB: QuantumParticle): void {
    const tempColor = particleA.baseColor.clone();
    particleA.targetColor = particleB.baseColor.clone();
    particleB.targetColor = tempColor.clone();

    particleA.isColorTransitioning = true;
    particleA.colorTransitionTime = 0;
    particleA.colorTransitionDuration = 1;

    particleB.isColorTransitioning = true;
    particleB.colorTransitionTime = 0;
    particleB.colorTransitionDuration = 1;
  }

  public generateBurstPoints(): void {
    const allPairs = this.entanglementPairs;
    if (allPairs.length < 3) return;

    const particleConnections: Map<number, number[]> = new Map();
    this.particles.forEach((_, id) => particleConnections.set(id, []));

    for (const pair of allPairs) {
      particleConnections.get(pair.idA)?.push(pair.idB);
      particleConnections.get(pair.idB)?.push(pair.idA);
    }

    const highlyConnected: number[] = [];
    particleConnections.forEach((connections, id) => {
      if (connections.length >= 2) {
        highlyConnected.push(id);
      }
    });

    const centers: THREE.Vector3[] = [];

    for (let i = 0; i < highlyConnected.length; i++) {
      const idA = highlyConnected[i];
      const connections = particleConnections.get(idA);
      if (!connections || connections.length < 2) continue;

      const particleA = this.particles.get(idA);
      if (!particleA) continue;

      for (let j = 0; j < connections.length; j++) {
        for (let k = j + 1; k < connections.length; k++) {
          const idB = connections[j];
          const idC = connections[k];
          const particleB = this.particles.get(idB);
          const particleC = this.particles.get(idC);
          if (!particleB || !particleC) continue;

          const center = new THREE.Vector3();
          center.add(particleA.mesh.position);
          center.add(particleB.mesh.position);
          center.add(particleC.mesh.position);
          center.divideScalar(3);

          const key = `${Math.min(idA, idB, idC)}_${Math.max(idA, idB, idC)}`;
          if (!this.activeBurstCenters.has(key)) {
            this.activeBurstCenters.add(key);
            centers.push(center);
          }
        }
      }
    }

    for (const center of centers) {
      this.createBurstPoint(center);
    }
  }

  private createBurstPoint(position: THREE.Vector3): void {
    const particleCount = 10 + Math.floor(Math.random() * 6);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;

      const color = this.quantumPalette[Math.floor(Math.random() * this.quantumPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.03 + Math.random() * 0.02;
      velocities.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        )
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        alpha: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 3.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float alpha;
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          float fade = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, fade * alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.burstPoints.push({
      position: position.clone(),
      particles: points,
      particleVelocities: velocities,
      life: 0.3,
      maxLife: 0.3,
    });
  }

  public reset(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      p.glow.geometry.dispose();
      (p.glow.material as THREE.Material).dispose();
    });
    this.particles.clear();

    this.entanglementPairs.forEach((p) => {
      this.scene.remove(p.cable);
      p.cable.geometry.dispose();
      (p.cable.material as THREE.Material).dispose();
    });
    this.entanglementPairs = [];

    this.burstPoints.forEach((b) => {
      this.scene.remove(b.particles);
      b.particles.geometry.dispose();
      (b.particles.material as THREE.Material).dispose();
    });
    this.burstPoints = [];

    this.activeBurstCenters.clear();
    this.nextParticleId = 0;

    this.onEntanglementCountChange?.(0);
  }

  public update(delta: number, time: number): void {
    this.particles.forEach((particle) => {
      if (!particle.isDragging) {
        particle.mesh.position.x += particle.velocity.x * delta * 60;
        particle.mesh.position.y += particle.velocity.y * delta * 60;
        particle.mesh.position.z += particle.velocity.z * delta * 60;

        const bounds = 12;
        if (Math.abs(particle.mesh.position.x) > bounds) particle.velocity.x *= -1;
        if (Math.abs(particle.mesh.position.y) > bounds) particle.velocity.y *= -1;
        if (Math.abs(particle.mesh.position.z) > bounds) particle.velocity.z *= -1;
      }

      if (particle.syncDelayQueue.length > 0) {
        const now = performance.now();
        while (particle.syncDelayQueue.length > 0 && particle.syncDelayQueue[0].time <= now) {
          const target = particle.syncDelayQueue.shift()!;
          particle.syncedPosition.copy(target.position);
        }
        if (!particle.isDragging) {
          particle.mesh.position.lerp(particle.syncedPosition, Math.min(1, delta * 10));
        }
      }

      if (particle.isColorTransitioning) {
        particle.colorTransitionTime += delta;
        const t = Math.min(particle.colorTransitionTime / particle.colorTransitionDuration, 1);
        const easedT = t * t * (3 - 2 * t);
        particle.currentColor.lerpColors(particle.baseColor, particle.targetColor, easedT);

        if (t >= 1) {
          particle.isColorTransitioning = false;
          particle.baseColor.copy(particle.targetColor);
          particle.currentColor.copy(particle.targetColor);
        }
      }

      const meshMat = particle.mesh.material as THREE.MeshBasicMaterial;
      const glowMat = particle.glow.material as THREE.ShaderMaterial;
      meshMat.color.copy(particle.currentColor);
      glowMat.uniforms.glowColor.value.copy(particle.currentColor);

      let targetScale = particle.hovered ? this.hoverParticleRadius / this.baseParticleRadius : 1;
      if (particle.hovered) {
        particle.hoverTime += delta;
        const pulse = 0.5 + 0.5 * Math.sin(particle.hoverTime * Math.PI * 2 * (1 / 0.8));
        targetScale += pulse * 0.1;
      }
      particle.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, delta * 8));
      particle.glow.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, delta * 8));

      particle.glowIntensity += (particle.targetGlowIntensity - particle.glowIntensity) * Math.min(1, delta * 5);
      glowMat.uniforms.intensity.value = particle.glowIntensity;
    });

    for (const pair of this.entanglementPairs) {
      if (pair.isFlashing) {
        pair.cableFlashTime += delta;
        const flashDuration = 0.5;
        const t = Math.min(pair.cableFlashTime / flashDuration, 1);
        const pulse = Math.sin(t * Math.PI);
        pair.cableAlpha = 0.3 + pulse * 0.7;
        if (t >= 1) {
          pair.isFlashing = false;
          pair.cableAlpha = 0.6;
        }
      }
      this.updateEnergyCable(pair);
    }

    for (let i = this.burstPoints.length - 1; i >= 0; i--) {
      const burst = this.burstPoints[i];
      burst.life -= delta;

      const positions = burst.particles.geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < burst.particleVelocities.length; j++) {
        const j3 = j * 3;
        positions.array[j3] += burst.particleVelocities[j].x * delta * 60;
        positions.array[j3 + 1] += burst.particleVelocities[j].y * delta * 60;
        positions.array[j3 + 2] += burst.particleVelocities[j].z * delta * 60;
      }
      positions.needsUpdate = true;

      const material = burst.particles.material as THREE.ShaderMaterial;
      material.uniforms.alpha.value = Math.max(0, burst.life / burst.maxLife);

      if (burst.life <= 0) {
        this.scene.remove(burst.particles);
        burst.particles.geometry.dispose();
        (burst.particles.material as THREE.Material).dispose();
        this.burstPoints.splice(i, 1);
      }
    }
  }

  public triggerPartnerColorSwap(draggedParticle: QuantumParticle): void {
    if (draggedParticle.entangledWith === null) return;
    const partner = this.particles.get(draggedParticle.entangledWith);
    if (!partner) return;
    this.triggerColorSwap(draggedParticle, partner);
  }
}
