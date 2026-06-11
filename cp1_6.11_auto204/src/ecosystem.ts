import * as THREE from 'three';

export interface EcosystemParams {
  temperature: number;
  acidity: number;
  density: number;
}

interface TubeWorm {
  group: THREE.Group;
  segments: THREE.Mesh[];
  tentacles: THREE.Mesh[];
  swingOffset: number;
  baseAngle: number;
}

interface WhiteCrab {
  group: THREE.Group;
  path: THREE.Vector3[];
  pathIndex: number;
  speed: number;
  claws: THREE.Group[];
  clawOpen: boolean;
  clawTimer: number;
  direction: number;
}

interface MicrobePatch {
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
}

interface DissolveParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Ecosystem {
  private scene: THREE.Scene;
  private params: EcosystemParams;
  private tubeWorms: TubeWorm[] = [];
  private crabs: WhiteCrab[] = [];
  private microbialPatches: MicrobePatch[] = [];
  private dissolveParticles: DissolveParticle[] = [];
  private ventPosition: THREE.Vector3;
  private time: number = 0;

  private tubeWormContainer: THREE.Group;
  private crabContainer: THREE.Group;
  private microbialMatContainer: THREE.Group;
  private dissolveContainer: THREE.Group;

  constructor(scene: THREE.Scene, ventPosition: THREE.Vector3) {
    this.scene = scene;
    this.ventPosition = ventPosition.clone();
    this.params = {
      temperature: 50,
      acidity: 30,
      density: 60
    };

    this.tubeWormContainer = new THREE.Group();
    this.crabContainer = new THREE.Group();
    this.microbialMatContainer = new THREE.Group();
    this.dissolveContainer = new THREE.Group();

    this.scene.add(this.tubeWormContainer);
    this.scene.add(this.crabContainer);
    this.scene.add(this.microbialMatContainer);
    this.scene.add(this.dissolveContainer);
  }

  setParams(params: Partial<EcosystemParams>): void {
    Object.assign(this.params, params);
    this.rebuildEcosystem();
  }

  getParams(): EcosystemParams {
    return { ...this.params };
  }

  rebuildEcosystem(): void {
    this.clearTubeWorms();
    this.clearCrabs();
    this.clearMicrobialMat();
    this.createTubeWorms();
    this.createCrabs();
    this.createMicrobialMat();
  }

  private clearTubeWorms(): void {
    while (this.tubeWormContainer.children.length > 0) {
      const child = this.tubeWormContainer.children[0];
      this.tubeWormContainer.remove(child);
    }
    this.tubeWorms = [];
  }

  private clearCrabs(): void {
    while (this.crabContainer.children.length > 0) {
      const child = this.crabContainer.children[0];
      this.crabContainer.remove(child);
    }
    this.crabs = [];
  }

  private clearMicrobialMat(): void {
    while (this.microbialMatContainer.children.length > 0) {
      const child = this.microbialMatContainer.children[0];
      this.microbialMatContainer.remove(child);
    }
    this.microbialPatches = [];
  }

  private createTubeWorms(): void {
    const densityFactor = this.params.density / 100;
    const count = Math.floor(15 + densityFactor * 10);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 2.0;
      const x = this.ventPosition.x + Math.cos(angle) * radius;
      const z = this.ventPosition.z + Math.sin(angle) * radius;

      const tubeWorm = this.createTubeWorm();
      tubeWorm.group.position.set(x, 0, z);
      tubeWorm.group.rotation.y = Math.random() * Math.PI * 2;
      tubeWorm.swingOffset = Math.random() * Math.PI * 2;

      this.tubeWormContainer.add(tubeWorm.group);
      this.tubeWorms.push(tubeWorm);
    }
  }

  private createTubeWorm(): TubeWorm {
    const group = new THREE.Group();
    const segments: THREE.Mesh[] = [];
    const tentacles: THREE.Mesh[] = [];

    const segmentCount = 5 + Math.floor(Math.random() * 4);
    const segmentHeight = 0.12 + Math.random() * 0.08;
    const baseRadius = 0.06 + Math.random() * 0.03;

    let currentY = 0;
    let currentAngle = 0;

    for (let i = 0; i < segmentCount; i++) {
      const t = i / segmentCount;
      const radius = baseRadius * (1 - t * 0.3);
      const geometry = new THREE.CylinderGeometry(radius * 0.9, radius, segmentHeight, 8);
      const material = new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        roughness: 0.9,
        metalness: 0.1,
        emissive: 0x1a1a1a,
        emissiveIntensity: 0.08
      });

      const segment = new THREE.Mesh(geometry, material);
      segment.position.y = currentY + segmentHeight / 2;
      segment.rotation.z = currentAngle;
      group.add(segment);
      segments.push(segment);

      currentY += segmentHeight;
      currentAngle += (Math.random() - 0.5) * 0.3;
    }

    const tentacleCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < tentacleCount; i++) {
      const tentacleAngle = (i / tentacleCount) * Math.PI * 2;
      const tentacleGeo = new THREE.ConeGeometry(0.015, 0.1, 6);
      const tentacleMat = new THREE.MeshStandardMaterial({
        color: 0xcc3333,
        transparent: true,
        opacity: 0.85,
        roughness: 0.5,
        emissive: 0x661111,
        emissiveIntensity: 0.12
      });

      const tentacle = new THREE.Mesh(tentacleGeo, tentacleMat);
      tentacle.position.set(
        Math.cos(tentacleAngle) * 0.03,
        currentY + 0.05,
        Math.sin(tentacleAngle) * 0.03
      );
      tentacle.rotation.z = Math.PI / 6 + Math.cos(tentacleAngle) * 0.2;
      tentacle.rotation.x = Math.sin(tentacleAngle) * 0.2;
      group.add(tentacle);
      tentacles.push(tentacle);
    }

    return { group, segments, tentacles, swingOffset: 0, baseAngle: 0 };
  }

  private createCrabs(): void {
    const densityFactor = this.params.density / 100;
    const count = Math.floor(6 + densityFactor * 4);

    for (let i = 0; i < count; i++) {
      const crab = this.createCrab();
      const path = this.generateCrabPath();

      crab.path = path;
      crab.pathIndex = Math.floor(Math.random() * path.length);
      crab.speed = 0.02 + Math.random() * 0.03;
      crab.direction = Math.random() > 0.5 ? 1 : -1;

      const startPos = path[crab.pathIndex];
      crab.group.position.copy(startPos);

      this.crabContainer.add(crab.group);
      this.crabs.push(crab);
    }
  }

  private generateCrabPath(): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    const centerRadius = 1.5 + Math.random() * 1.0;
    const points = Math.floor((Math.PI * 2 * centerRadius) / 0.1);

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusVariation = (Math.random() - 0.5) * 0.3;
      const r = centerRadius + radiusVariation;
      const x = this.ventPosition.x + Math.cos(angle) * r;
      const z = this.ventPosition.z + Math.sin(angle) * r;
      path.push(new THREE.Vector3(x, 0.05, z));
    }

    return path;
  }

  private createCrab(): WhiteCrab {
    const group = new THREE.Group();
    const claws: THREE.Group[] = [];

    const carapaceGeo = new THREE.SphereGeometry(0.08, 12, 8);
    carapaceGeo.scale(1, 0.5, 0.8);
    const carapaceMat = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.6,
      metalness: 0.2,
      emissive: 0x222222,
      emissiveIntensity: 0.08
    });
    const carapace = new THREE.Mesh(carapaceGeo, carapaceMat);
    carapace.position.y = 0.06;
    group.add(carapace);

    const legMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.7,
      emissive: 0x1a1a1a,
      emissiveIntensity: 0.08
    });

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const legGroup = new THREE.Group();
        const angle = (i - 1.5) * 0.3;

        const upperLegGeo = new THREE.CylinderGeometry(0.008, 0.01, 0.06, 4);
        const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
        upperLeg.position.y = -0.03;
        upperLeg.rotation.z = 0.3;
        legGroup.add(upperLeg);

        const lowerLegGeo = new THREE.CylinderGeometry(0.006, 0.008, 0.06, 4);
        const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
        lowerLeg.position.set(0.015, -0.06, 0);
        lowerLeg.rotation.z = -0.5;
        legGroup.add(lowerLeg);

        legGroup.position.set(side * 0.04, 0.04, Math.cos(angle) * 0.05);
        legGroup.rotation.y = angle;
        legGroup.rotation.z = side * 0.2;
        group.add(legGroup);
      }
    }

    for (let side = -1; side <= 1; side += 2) {
      const clawGroup = new THREE.Group();

      const clawBaseGeo = new THREE.BoxGeometry(0.02, 0.015, 0.03);
      const clawBase = new THREE.Mesh(clawBaseGeo, legMat);
      clawGroup.add(clawBase);

      const clawUpperGeo = new THREE.BoxGeometry(0.015, 0.008, 0.025);
      const clawUpper = new THREE.Mesh(clawUpperGeo, legMat);
      clawUpper.position.set(side * 0.01, 0.008, 0.02);
      clawUpper.rotation.x = -0.2;
      clawGroup.add(clawUpper);

      const clawLowerGeo = new THREE.BoxGeometry(0.015, 0.008, 0.025);
      const clawLower = new THREE.Mesh(clawLowerGeo, legMat);
      clawLower.position.set(side * 0.01, -0.008, 0.02);
      clawLower.rotation.x = 0.2;
      clawGroup.add(clawLower);

      clawGroup.position.set(side * 0.07, 0.05, 0.05);
      clawGroup.rotation.y = side * 0.3;
      group.add(clawGroup);
      claws.push(clawGroup);
    }

    return {
      group,
      path: [],
      pathIndex: 0,
      speed: 0.03,
      claws,
      clawOpen: false,
      clawTimer: 0,
      direction: 1
    };
  }

  private createMicrobialMat(): void {
    const count = 500;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3.0;
      const x = this.ventPosition.x + Math.cos(angle) * radius;
      const z = this.ventPosition.z + Math.sin(angle) * radius;

      const size = 0.05 + Math.random() * 0.1;
      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshStandardMaterial({
        color: 0x004400,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        emissive: 0x002200,
        emissiveIntensity: 0.08
      });

      const patch = new THREE.Mesh(geometry, material);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.01, z);
      patch.rotation.z = Math.random() * Math.PI;

      this.microbialMatContainer.add(patch);
      this.microbialPatches.push({
        mesh: patch,
        baseY: 0.01,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  spawnDissolveParticles(position: THREE.Vector3): void {
    for (let i = 0; i < 10; i++) {
      const geometry = new THREE.SphereGeometry(0.02, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.8
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.04
      );

      this.dissolveContainer.add(particle);
      this.dissolveParticles.push({
        mesh: particle,
        velocity,
        life: 1.5,
        maxLife: 1.5
      });
    }
  }

  update(deltaTime: number): void {
    if (deltaTime > 0.1) return;

    this.time += deltaTime;

    this.updateTubeWorms(deltaTime);
    this.updateCrabs(deltaTime);
    this.updateMicrobialMat(deltaTime);
    this.updateDissolveParticles(deltaTime);
  }

  private updateTubeWorms(deltaTime: number): void {
    const tempFactor = this.params.temperature / 100;
    const acidFactor = this.params.acidity / 100;
    const swingFrequency = 0.2 + tempFactor * 0.3;
    const swingAmplitude = (0.08 + acidFactor * 0.1) * (Math.PI / 180) * 10;
    const tentacleSpread = 20 + tempFactor * 70;

    for (const worm of this.tubeWorms) {
      const swing = Math.sin(this.time * swingFrequency * Math.PI * 2 + worm.swingOffset) * swingAmplitude;
      worm.group.rotation.z = swing;

      const tentacleAngleRad = (tentacleSpread / 2) * (Math.PI / 180);
      const tentacleCount = worm.tentacles.length;

      for (let i = 0; i < tentacleCount; i++) {
        const tentacle = worm.tentacles[i];
        const angle = (i / tentacleCount) * Math.PI * 2;
        const spreadAmount = tentacleAngleRad / (Math.PI / 6);

        tentacle.rotation.z = (Math.PI / 6) * spreadAmount + Math.cos(angle) * 0.1;
        tentacle.rotation.x = Math.sin(angle) * spreadAmount * 0.3;
      }
    }
  }

  private updateCrabs(deltaTime: number): void {
    for (const crab of this.crabs) {
      const moveAmount = crab.speed * deltaTime * 60;
      let currentIndex = crab.pathIndex;
      let accumulated = 0;

      while (accumulated < moveAmount && crab.path.length > 1) {
        const nextIndex = (currentIndex + crab.direction + crab.path.length) % crab.path.length;
        const dist = crab.path[currentIndex].distanceTo(crab.path[nextIndex]);

        if (accumulated + dist <= moveAmount) {
          accumulated += dist;
          currentIndex = nextIndex;
        } else {
          const remainder = moveAmount - accumulated;
          const t = remainder / dist;
          const current = crab.path[currentIndex];
          const next = crab.path[nextIndex];

          crab.group.position.lerpVectors(current, next, t);

          const dir = new THREE.Vector3().subVectors(next, current).normalize();
          crab.group.rotation.y = Math.atan2(dir.x, dir.z) + (crab.direction > 0 ? 0 : Math.PI);
          break;
        }
      }

      if (crab.path.length > 0) {
        crab.pathIndex = currentIndex;
        const nextIdx = (currentIndex + crab.direction + crab.path.length) % crab.path.length;
        const dir = new THREE.Vector3().subVectors(
          crab.path[nextIdx],
          crab.path[currentIndex]
        ).normalize();
        crab.group.rotation.y = Math.atan2(dir.x, dir.z) + (crab.direction > 0 ? 0 : Math.PI);
      }

      if (crab.clawTimer > 0) {
        crab.clawTimer -= deltaTime;
        const clawProgress = Math.sin((1 - crab.clawTimer / 0.3) * Math.PI);
        const clawAngle = clawProgress * 0.5;

        for (let i = 0; i < crab.claws.length; i++) {
          const side = i === 0 ? -1 : 1;
          crab.claws[i].rotation.y = side * (0.3 + clawAngle);
        }
      } else {
        for (let i = 0; i < crab.claws.length; i++) {
          const side = i === 0 ? -1 : 1;
          crab.claws[i].rotation.y = side * 0.3;
        }
      }

      this.checkCrabCollisions(crab);
    }
  }

  private checkCrabCollisions(crab: WhiteCrab): void {
    const distToVent = crab.group.position.distanceTo(this.ventPosition);
    if (distToVent < 0.6 && crab.clawTimer <= 0) {
      crab.clawTimer = 0.3;
    }

    for (const other of this.crabs) {
      if (other === crab) continue;
      const dist = crab.group.position.distanceTo(other.group.position);
      if (dist < 0.15 && crab.clawTimer <= 0) {
        crab.clawTimer = 0.3;
        break;
      }
    }
  }

  private updateMicrobialMat(deltaTime: number): void {
    const acidFactor = this.params.acidity / 100;
    const pulseFrequency = 0.8 + (this.params.temperature / 100) * 1.5;

    const greenColor = new THREE.Color(0x004400);
    const purpleColor = new THREE.Color(0x440044);

    for (const patch of this.microbialPatches) {
      const pulse = Math.sin(this.time * pulseFrequency * Math.PI * 2 + patch.phase) * 0.01;
      patch.mesh.position.y = patch.baseY + 0.01 + pulse;

      const color = greenColor.clone().lerp(purpleColor, acidFactor);
      (patch.mesh.material as THREE.MeshStandardMaterial).color.copy(color);
      (patch.mesh.material as THREE.MeshStandardMaterial).emissive.copy(color).multiplyScalar(0.4);
    }
  }

  private updateDissolveParticles(deltaTime: number): void {
    for (let i = this.dissolveParticles.length - 1; i >= 0; i--) {
      const particle = this.dissolveParticles[i];
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
      particle.life -= deltaTime;

      const opacity = (particle.life / particle.maxLife) * 0.8;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      if (particle.life <= 0) {
        this.dissolveContainer.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.dissolveParticles.splice(i, 1);
      }
    }
  }

  getVentPosition(): THREE.Vector3 {
    return this.ventPosition.clone();
  }
}
