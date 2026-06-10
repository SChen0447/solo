import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import createNoise2D from 'simplex-noise';
import { VentInfo, SpeciesInfo, VentData, CreatureData, InfoData } from '../types';
import { ventDataList, speciesDataList } from '../data/species';

const PARTICLES_PER_VENT = 1500;
const TOTAL_PARTICLE_LIMIT = 8000;
const SHRIMP_PER_VENT = 300;

export class VentScene {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private vents: VentData[] = [];
  private creatures: CreatureData[] = [];
  private clickableTargets: THREE.Object3D[] = [];
  private onClickCallbacks: ((info: InfoData) => void)[] = [];
  private noise2D: (x: number, y: number) => number;
  private time: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.noise2D = createNoise2D();
    this.setupInteraction();
  }

  private setupInteraction(): void {
    const onPointerMove = (event: PointerEvent) => {
      const rect = this.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = (event: PointerEvent) => {
      const rect = this.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.handleClick();
    };

    this.domElement.addEventListener('pointermove', onPointerMove);
    this.domElement.addEventListener('click', onClick);
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableTargets, true);
    if (intersects.length > 0) {
      let target: THREE.Object3D | null = intersects[0].object;
      while (target) {
        if (target.userData.info) {
          const info = target.userData.info as InfoData;
          this.onClickCallbacks.forEach((cb) => cb(info));
          return;
        }
        target = target.parent;
      }
    }
  }

  public init(): void {
    const ventCount = 2 + Math.floor(Math.random() * 3);
    const usedPositions: THREE.Vector3[] = [];
    const actualVentCount = Math.min(ventCount, Math.floor(TOTAL_PARTICLE_LIMIT / PARTICLES_PER_VENT));

    for (let i = 0; i < actualVentCount; i++) {
      let position: THREE.Vector3;
      let attempts = 0;
      do {
        const angle = (i / actualVentCount) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 80 + Math.random() * 100;
        position = new THREE.Vector3(
          Math.cos(angle) * radius,
          2,
          Math.sin(angle) * radius
        );
        attempts++;
      } while (usedPositions.some((p) => p.distanceTo(position) < 60) && attempts < 20);

      usedPositions.push(position);
      const ventInfo = ventDataList[i % ventDataList.length];
      this.createVent(position, ventInfo);
    }
  }

  private createVent(position: THREE.Vector3, info: VentInfo): void {
    const ventGroup = new THREE.Group();
    ventGroup.position.copy(position);
    ventGroup.userData = { info, type: 'vent' };

    const chimneyHeight = 12 + Math.random() * 15;
    const chimneyGeo = new THREE.ConeGeometry(3, chimneyHeight, 8, 1, true);
    const chimneyMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.95,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.y = chimneyHeight / 2;
    chimney.rotation.x = (Math.random() - 0.5) * 0.2;
    chimney.rotation.z = (Math.random() - 0.5) * 0.2;
    ventGroup.add(chimney);

    const baseGeo = new THREE.CylinderGeometry(6, 8, 3, 12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.15
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 1.5;
    ventGroup.add(base);

    for (let j = 0; j < 5; j++) {
      const sGeo = new THREE.ConeGeometry(0.8 + Math.random(), 3 + Math.random() * 4, 5);
      const sChimney = new THREE.Mesh(sGeo, chimneyMat);
      const sAngle = Math.random() * Math.PI * 2;
      const sRadius = 2 + Math.random() * 3;
      sChimney.position.set(
        Math.cos(sAngle) * sRadius,
        3 + Math.random() * 2,
        Math.sin(sAngle) * sRadius
      );
      sChimney.rotation.x = (Math.random() - 0.5) * 0.4;
      sChimney.rotation.z = (Math.random() - 0.5) * 0.4;
      ventGroup.add(sChimney);
    }

    this.clickableTargets.push(ventGroup);
    this.scene.add(ventGroup);

    const ventLight = new THREE.PointLight(0xff6633, 1.5, 40, 2);
    ventLight.position.set(0, chimneyHeight, 0);
    this.scene.add(ventLight);

    const particleSystem = this.createParticleSystem(
      position.clone().add(new THREE.Vector3(0, chimneyHeight, 0))
    );
    this.scene.add(particleSystem.mesh);

    this.vents.push({
      position,
      info,
      mesh: ventGroup,
      light: ventLight,
      particleSystem: particleSystem.mesh,
      particleVelocities: particleSystem.velocities,
      particleLifetimes: particleSystem.lifetimes
    });

    this.createCreaturesAroundVent(position, info.id);
  }

  private createParticleSystem(origin: THREE.Vector3): {
    mesh: THREE.Points;
    velocities: Float32Array;
    lifetimes: Float32Array;
  } {
    const particleCount = PARTICLES_PER_VENT;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = origin.x + (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = origin.y + Math.random() * 2;
      positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 2;

      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = 0.5 + Math.random() * 1.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      lifetimes[i] = Math.random() * 3;

      colors[i * 3] = 0.1;
      colors[i * 3 + 1] = 0.1;
      colors[i * 3 + 2] = 0.1;

      sizes[i] = 1 + Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { origin };

    return { mesh: points, velocities, lifetimes };
  }

  private createCreaturesAroundVent(ventPos: THREE.Vector3, ventId: string): void {
    const tubeWormSpecies = speciesDataList.find((s) => s.type === 'tubeWorm')!;
    const tubeWormCount = 8 + Math.floor(Math.random() * 8);

    for (let i = 0; i < tubeWormCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 10;
      const pos = new THREE.Vector3(
        ventPos.x + Math.cos(angle) * radius,
        2,
        ventPos.z + Math.sin(angle) * radius
      );
      const wormGroup = this.createTubeWorm(tubeWormSpecies);
      wormGroup.position.copy(pos);
      wormGroup.rotation.y = Math.random() * Math.PI * 2;
      this.creatures.push({
        id: uuidv4(),
        info: tubeWormSpecies,
        mesh: wormGroup,
        position: pos,
        ventId
      });
      this.clickableTargets.push(wormGroup);
      this.scene.add(wormGroup);
    }

    const shrimpSpecies = speciesDataList.find((s) => s.type === 'blindShrimp')!;
    this.createShrimpSwarm(ventPos, shrimpSpecies, ventId);

    const clamSpecies = speciesDataList.find((s) => s.type === 'giantClam')!;
    const clamCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < clamCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 8;
      const pos = new THREE.Vector3(
        ventPos.x + Math.cos(angle) * radius,
        1,
        ventPos.z + Math.sin(angle) * radius
      );
      const clam = this.createGiantClam(clamSpecies);
      clam.position.copy(pos);
      clam.rotation.y = Math.random() * Math.PI * 2;
      this.creatures.push({
        id: uuidv4(),
        info: clamSpecies,
        mesh: clam,
        position: pos,
        ventId
      });
      this.clickableTargets.push(clam);
      this.scene.add(clam);
    }
  }

  private createTubeWorm(species: SpeciesInfo): THREE.Group {
    const group = new THREE.Group();
    group.userData = { info: species, type: 'creature' };

    const tubeCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < tubeCount; i++) {
      const height = 6 + Math.random() * 8;
      const tubeGeo = new THREE.CylinderGeometry(0.25, 0.35, height, 8);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f0,
        roughness: 0.7,
        metalness: 0.1
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.y = height / 2;
      tube.rotation.x = (Math.random() - 0.5) * 0.3;
      tube.rotation.z = (Math.random() - 0.5) * 0.3;
      tube.position.x += (Math.random() - 0.5) * 1.5;
      tube.position.z += (Math.random() - 0.5) * 1.5;
      tube.userData = { baseHeight: height, swayPhase: Math.random() * Math.PI * 2 };
      group.add(tube);

      const plumeGeo = new THREE.SphereGeometry(0.4, 8, 6);
      const plumeMat = new THREE.MeshStandardMaterial({
        color: 0xdd3333,
        roughness: 0.6,
        emissive: 0x551111,
        emissiveIntensity: 0.3
      });
      const plume = new THREE.Mesh(plumeGeo, plumeMat);
      plume.position.copy(tube.position);
      plume.position.y = height + 0.2;
      plume.userData = { tubeIndex: i };
      group.add(plume);
    }

    return group;
  }

  private createGiantClam(species: SpeciesInfo): THREE.Group {
    const group = new THREE.Group();
    group.userData = { info: species, type: 'creature' };

    const shellGeo = new THREE.SphereGeometry(1.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.2
    });

    const shellBottom = new THREE.Mesh(shellGeo, shellMat);
    shellBottom.rotation.x = Math.PI;
    shellBottom.position.y = 0.5;
    group.add(shellBottom);

    const shellTop = new THREE.Mesh(shellGeo, shellMat);
    shellTop.position.y = 0.8;
    shellTop.rotation.x = Math.PI * 0.8;
    shellTop.userData = { isTopShell: true, openAmount: 0.2 };
    group.add(shellTop);

    const mantleGeo = new THREE.SphereGeometry(0.6, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const mantleMat = new THREE.MeshStandardMaterial({
      color: 0x66aaff,
      roughness: 0.3,
      emissive: 0x224488,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });
    const mantle = new THREE.Mesh(mantleGeo, mantleMat);
    mantle.position.y = 1;
    mantle.scale.y = 0.4;
    group.add(mantle);

    return group;
  }

  private createShrimpSwarm(ventPos: THREE.Vector3, species: SpeciesInfo, ventId: string): void {
    const count = SHRIMP_PER_VENT;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 16;
      positions[i * 3] = ventPos.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = 2 + Math.random() * 10;
      positions[i * 3 + 2] = ventPos.z + Math.sin(angle) * radius;

      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.4 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.1 + Math.random() * 0.1;

      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    const swarm = new THREE.Points(geo, mat);
    swarm.userData = {
      info: species,
      type: 'creature',
      velocities,
      ventPos: ventPos.clone(),
      isSwarm: true
    };

    this.creatures.push({
      id: uuidv4(),
      info: species,
      mesh: swarm,
      position: ventPos.clone(),
      ventId
    });
    this.clickableTargets.push(swarm);
    this.scene.add(swarm);
  }

  public update(delta: number): void {
    this.time += delta;

    this.vents.forEach((vent) => {
      this.updateParticleSystem(vent, delta);
      vent.light.intensity = 1.3 + Math.sin(this.time * 3) * 0.2;
    });

    this.creatures.forEach((creature) => {
      if (creature.mesh.userData.isSwarm) {
        this.updateShrimpSwarm(creature.mesh as THREE.Points, delta);
      } else if (creature.info.type === 'tubeWorm') {
        this.updateTubeWorm(creature.mesh as THREE.Group);
      } else if (creature.info.type === 'giantClam') {
        this.updateGiantClam(creature.mesh as THREE.Group);
      }
    });
  }

  private updateParticleSystem(vent: VentData, delta: number): void {
    const positions = vent.particleSystem.geometry.attributes.position.array as Float32Array;
    const colors = vent.particleSystem.geometry.attributes.color.array as Float32Array;
    const sizes = vent.particleSystem.geometry.attributes.size.array as Float32Array;
    const origin = vent.particleSystem.userData.origin as THREE.Vector3;
    const lifetimes = vent.particleLifetimes;
    const velocities = vent.particleVelocities;

    for (let i = 0; i < PARTICLES_PER_VENT; i++) {
      lifetimes[i] -= delta;

      if (lifetimes[i] <= 0) {
        positions[i * 3] = origin.x + (Math.random() - 0.5) * 1.5;
        positions[i * 3 + 1] = origin.y + Math.random() * 0.5;
        positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 1.5;

        velocities[i * 3] = (Math.random() - 0.5) * 0.2;
        velocities[i * 3 + 1] = 0.5 + Math.random() * 1.2;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

        lifetimes[i] = 2 + Math.random() * 2;

        colors[i * 3] = 0.08;
        colors[i * 3 + 1] = 0.08;
        colors[i * 3 + 2] = 0.08;
        sizes[i] = 0.6;
      } else {
        positions[i * 3] += velocities[i * 3] * delta * 2;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 2;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 2;

        const noiseX = this.noise2D(positions[i * 3] * 0.3, this.time * 0.5);
        const noiseZ = this.noise2D(positions[i * 3 + 2] * 0.3, this.time * 0.5 + 100);
        velocities[i * 3] += noiseX * delta * 0.5;
        velocities[i * 3 + 2] += noiseZ * delta * 0.5;

        const life = 1 - lifetimes[i] / 4;
        const gray = 0.08 + life * 0.4;
        colors[i * 3] = gray;
        colors[i * 3 + 1] = gray;
        colors[i * 3 + 2] = gray + life * 0.1;
        sizes[i] = 0.6 + life * 1.2;

        (vent.particleSystem.material as THREE.PointsMaterial).opacity = Math.max(
          0.1,
          0.8 - life * 0.7
        );
      }
    }

    vent.particleSystem.geometry.attributes.position.needsUpdate = true;
    vent.particleSystem.geometry.attributes.color.needsUpdate = true;
    vent.particleSystem.geometry.attributes.size.needsUpdate = true;
  }

  private updateShrimpSwarm(swarm: THREE.Points, delta: number): void {
    const positions = swarm.geometry.attributes.position.array as Float32Array;
    const velocities = swarm.userData.velocities as Float32Array;
    const ventPos = swarm.userData.ventPos as THREE.Vector3;

    for (let i = 0; i < SHRIMP_PER_VENT; i++) {
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      const dx = positions[i * 3] - ventPos.x;
      const dy = positions[i * 3 + 1] - 5;
      const dz = positions[i * 3 + 2] - ventPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 18) {
        velocities[i * 3] -= (dx / dist) * delta * 2;
        velocities[i * 3 + 1] -= (dy / dist) * delta * 2;
        velocities[i * 3 + 2] -= (dz / dist) * delta * 2;
      }

      velocities[i * 3] += (Math.random() - 0.5) * delta * 3;
      velocities[i * 3 + 1] += (Math.random() - 0.5) * delta * 2;
      velocities[i * 3 + 2] += (Math.random() - 0.5) * delta * 3;

      const speed = Math.sqrt(
        velocities[i * 3] ** 2 + velocities[i * 3 + 1] ** 2 + velocities[i * 3 + 2] ** 2
      );
      if (speed > 3) {
        velocities[i * 3] = (velocities[i * 3] / speed) * 3;
        velocities[i * 3 + 1] = (velocities[i * 3 + 1] / speed) * 3;
        velocities[i * 3 + 2] = (velocities[i * 3 + 2] / speed) * 3;
      }
    }

    swarm.geometry.attributes.position.needsUpdate = true;
  }

  private updateTubeWorm(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.swayPhase !== undefined) {
        const phase = child.userData.swayPhase as number;
        child.rotation.z = Math.sin(this.time * 0.8 + phase) * 0.08;
        child.rotation.x = Math.cos(this.time * 0.6 + phase) * 0.06;
      }
    });
  }

  private updateGiantClam(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.isTopShell) {
        const baseOpen = child.userData.openAmount as number;
        const openAngle = Math.PI * (0.7 + baseOpen + Math.sin(this.time * 0.3) * 0.05);
        child.rotation.x = openAngle;
      }
    });
  }

  public handleZoom(_scale: number): void {
  }

  public handleRotate(_deltaX: number, _deltaY: number): void {
  }

  public onClick(callback: (info: InfoData) => void): void {
    this.onClickCallbacks.push(callback);
  }

  public getVentPositions(): THREE.Vector3[] {
    return this.vents.map((v) => v.position.clone().add(new THREE.Vector3(0, 15, 0)));
  }
}
