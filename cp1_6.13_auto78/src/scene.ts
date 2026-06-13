import * as THREE from 'three';
import { TimeState, TimeManager } from './time';

interface ParticleData {
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  phase: number;
  speed: number;
}

interface TrainData {
  progress: number;
  speed: number;
  trail: THREE.Vector3[];
}

export class CityScene {
  public scene: THREE.Scene;
  private cityGroup: THREE.Group;
  private buildings: THREE.Mesh[] = [];
  private roads: THREE.Mesh[] = [];
  private metroLines: THREE.Group;
  private trains: THREE.Mesh[] = [];
  private trainData: Map<THREE.Mesh, TrainData> = new Map();
  private particleSystem!: THREE.Points;
  private particleData: ParticleData[] = [];
  private maxParticles: number = 5000;
  private indicatorSphere!: THREE.Mesh;
  private indicatorGlow!: THREE.Mesh;
  private ringLight!: THREE.Line;
  private dome!: THREE.Mesh;
  private stars!: THREE.Points;
  private starData: { phase: number; speed: number }[] = [];
  private timeManager: TimeManager;
  private metroCurves: THREE.CatmullRomCurve3[] = [];
  private gridSize: number = 10;
  private blockSize: number = 1.5;
  private roadWidth: number = 0.3;

  constructor(timeManager: TimeManager) {
    this.timeManager = timeManager;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0f0f1a, 0.02);

    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);

    this.metroLines = new THREE.Group();
    this.cityGroup.add(this.metroLines);

    this.gridSize = window.innerWidth < 768 ? 8 : 10;

    this.createGround();
    this.createBuildings();
    this.createMetroLines();
    this.createParticleSystem();
    this.createIndicator();
    this.createRingLight();
    this.createDomeAndStars();
    this.setupLighting();
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(30, 30, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.cityGroup.add(ground);
  }

  private createBuildings(): void {
    const totalSize = this.gridSize * this.blockSize;
    const offset = -totalSize / 2 + this.blockSize / 2;

    for (let x = 0; x < this.gridSize; x++) {
      for (let z = 0; z < this.gridSize; z++) {
        const height = 1 + Math.random() * 4;
        const colorValue = 0x2a2a3a + Math.floor(Math.random() * 0x101010);

        const buildingGeometry = new THREE.BoxGeometry(
          this.blockSize * 0.85,
          height,
          this.blockSize * 0.85
        );

        const buildingMaterial = new THREE.MeshStandardMaterial({
          color: colorValue,
          roughness: 0.7,
          metalness: 0.3
        });

        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(
          offset + x * this.blockSize,
          height / 2,
          offset + z * this.blockSize
        );
        building.castShadow = true;
        building.receiveShadow = true;
        this.cityGroup.add(building);
        this.buildings.push(building);
      }
    }

    this.createRoads();
  }

  private createRoads(): void {
    const totalSize = this.gridSize * this.blockSize;
    const offset = -totalSize / 2;
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e1e2e,
      roughness: 0.8,
      metalness: 0.2
    });

    for (let i = 0; i <= this.gridSize; i++) {
      const hRoadGeometry = new THREE.BoxGeometry(
        totalSize + this.roadWidth,
        0.02,
        this.roadWidth
      );
      const hRoad = new THREE.Mesh(hRoadGeometry, roadMaterial);
      hRoad.position.set(
        0,
        0.01,
        offset + i * this.blockSize - this.blockSize / 2
      );
      hRoad.receiveShadow = true;
      this.cityGroup.add(hRoad);
      this.roads.push(hRoad);

      const vRoadGeometry = new THREE.BoxGeometry(
        this.roadWidth,
        0.02,
        totalSize + this.roadWidth
      );
      const vRoad = new THREE.Mesh(vRoadGeometry, roadMaterial);
      vRoad.position.set(
        offset + i * this.blockSize - this.blockSize / 2,
        0.01,
        0
      );
      vRoad.receiveShadow = true;
      this.cityGroup.add(vRoad);
      this.roads.push(vRoad);
    }
  }

  private createMetroLines(): void {
    const totalSize = this.gridSize * this.blockSize;
    const halfSize = totalSize / 2;

    const lineColors = [0xff4444, 0x4488ff, 0x44ff88];
    const lineY = 0.5;

    const line1Points = [
      new THREE.Vector3(-halfSize, lineY, -halfSize * 0.6),
      new THREE.Vector3(-halfSize * 0.5, lineY, -halfSize * 0.8),
      new THREE.Vector3(0, lineY, -halfSize * 0.3),
      new THREE.Vector3(halfSize * 0.5, lineY, halfSize * 0.2),
      new THREE.Vector3(halfSize, lineY, halfSize * 0.6)
    ];

    const line2Points = [
      new THREE.Vector3(-halfSize * 0.8, lineY, halfSize),
      new THREE.Vector3(-halfSize * 0.3, lineY, halfSize * 0.4),
      new THREE.Vector3(0.2, lineY, 0),
      new THREE.Vector3(halfSize * 0.4, lineY, -halfSize * 0.5),
      new THREE.Vector3(halfSize * 0.9, lineY, -halfSize)
    ];

    const line3Points = [
      new THREE.Vector3(-halfSize, lineY, halfSize * 0.8),
      new THREE.Vector3(-halfSize * 0.4, lineY, halfSize * 0.3),
      new THREE.Vector3(0, lineY, 0.1),
      new THREE.Vector3(halfSize * 0.3, lineY, -halfSize * 0.4),
      new THREE.Vector3(halfSize, lineY, -halfSize * 0.7)
    ];

    const allPoints = [line1Points, line2Points, line3Points];

    allPoints.forEach((points, index) => {
      const curve = new THREE.CatmullRomCurve3(points);
      this.metroCurves.push(curve);

      const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.08, 8, false);
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: lineColors[index],
        transparent: true,
        opacity: 0.6,
        emissive: lineColors[index],
        emissiveIntensity: 0.3
      });
      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      this.metroLines.add(tube);

      this.createTrains(curve, lineColors[index], index);
    });
  }

  private createTrains(curve: THREE.CatmullRomCurve3, color: number, lineIndex: number): void {
    const baseTrainCount = 6;
    const spacing = 1 / baseTrainCount;

    for (let i = 0; i < baseTrainCount * 2; i++) {
      const trainGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const trainMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9
      });
      const train = new THREE.Mesh(trainGeometry, trainMaterial);
      train.visible = i < baseTrainCount;

      const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      train.add(glow);

      const initialProgress = (i * spacing) % 1;
      const position = curve.getPoint(initialProgress);
      train.position.copy(position);

      this.metroLines.add(train);
      this.trains.push(train);

      this.trainData.set(train, {
        progress: initialProgress,
        speed: 0.03 + lineIndex * 0.005,
        trail: []
      });
    }
  }

  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      const pos = this.getRandomRoadPosition();
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      colors[i * 3] = 0;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      sizes[i] = 0.08;

      this.particleData.push({
        velocity: this.getRandomRoadDirection(),
        targetPosition: pos.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.05 + Math.random() * 0.15
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.cityGroup.add(this.particleSystem);
  }

  private getRandomRoadPosition(): THREE.Vector3 {
    const totalSize = this.gridSize * this.blockSize;
    const offset = -totalSize / 2;

    const isHorizontal = Math.random() > 0.5;
    const roadIndex = Math.floor(Math.random() * (this.gridSize + 1));
    const alongRoad = Math.random() * totalSize - totalSize / 2;

    if (isHorizontal) {
      return new THREE.Vector3(
        alongRoad,
        0.15,
        offset + roadIndex * this.blockSize - this.blockSize / 2 + (Math.random() - 0.5) * 0.1
      );
    } else {
      return new THREE.Vector3(
        offset + roadIndex * this.blockSize - this.blockSize / 2 + (Math.random() - 0.5) * 0.1,
        0.15,
        alongRoad
      );
    }
  }

  private getRandomRoadDirection(): THREE.Vector3 {
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1)
    ];
    return directions[Math.floor(Math.random() * directions.length)].normalize();
  }

  private createIndicator(): void {
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.7
    });
    this.indicatorSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.indicatorSphere.position.set(0, 2, 0);
    this.cityGroup.add(this.indicatorSphere);

    const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.2
    });
    this.indicatorGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.indicatorSphere.add(this.indicatorGlow);
  }

  private createRingLight(): void {
    const ringRadius = 12;
    const segments = 128;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * ringRadius,
        0.02,
        Math.sin(angle) * ringRadius
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = new Float32Array((segments + 1) * 3);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const color1 = new THREE.Color(0x00ffff);
      const color2 = new THREE.Color(0xff00ff);
      const color = new THREE.Color().lerpColors(color1, color2, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 0.03
    });

    this.ringLight = new THREE.Line(geometry, material);
    this.scene.add(this.ringLight);
  }

  private createDomeAndStars(): void {
    const domeGeometry = new THREE.SphereGeometry(15, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000011,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide
    });
    this.dome = new THREE.Mesh(domeGeometry, domeMaterial);
    this.dome.position.y = 0;
    this.scene.add(this.dome);

    const starCount = 48;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI / 2;
      const radius = 14.5 + Math.random() * 0.5;

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      starSizes[i] = 0.02;

      this.starData.push({
        phase: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 3
      });
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x00d2ff, 0.3);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6b35, 0.2);
    rimLight.position.set(0, 15, -15);
    this.scene.add(rimLight);
  }

  public update(deltaTime: number, _timeState: TimeState): void {
    this.timeManager.update(deltaTime);
    const interpolatedState = this.timeManager.getInterpolatedState();

    this.updateParticles(deltaTime, interpolatedState);
    this.updateTrains(deltaTime, interpolatedState);
    this.updateIndicator(deltaTime, interpolatedState);
    this.updateRingLight(deltaTime);
    this.updateStars(deltaTime);
  }

  private updateParticles(deltaTime: number, state: TimeState): void {
    const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
    const colors = this.particleSystem.geometry.attributes.color.array as Float32Array;
    const targetCount = state.particleCount;

    for (let i = 0; i < this.maxParticles; i++) {
      const isActive = i < targetCount;

      if (isActive) {
        const data = this.particleData[i];
        const sineOffset = Math.sin(data.phase + performance.now() * 0.001 * data.speed) * 0.01;

        positions[i * 3] += data.velocity.x * data.speed * deltaTime * 60 + sineOffset * data.velocity.z;
        positions[i * 3 + 2] += data.velocity.z * data.speed * deltaTime * 60 + sineOffset * data.velocity.x;

        const totalSize = this.gridSize * this.blockSize;
        const halfSize = totalSize / 2;

        if (positions[i * 3] < -halfSize || positions[i * 3] > halfSize ||
            positions[i * 3 + 2] < -halfSize || positions[i * 3 + 2] > halfSize) {
          const newPos = this.getRandomRoadPosition();
          positions[i * 3] = newPos.x;
          positions[i * 3 + 1] = newPos.y;
          positions[i * 3 + 2] = newPos.z;
          data.velocity = this.getRandomRoadDirection();
        }

        const colorT = Math.sin(data.phase + performance.now() * 0.002) * 0.5 + 0.5;
        const color = new THREE.Color().lerpColors(state.particleColorStart, state.particleColorEnd, colorT);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      } else {
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    }

    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.geometry.attributes.color.needsUpdate = true;
  }

  private updateTrains(deltaTime: number, state: TimeState): void {
    const baseTrainCount = 6;
    const targetVisibleCount = Math.floor(baseTrainCount * state.trainDensityMultiplier);

    this.trains.forEach((train, index) => {
      train.visible = index < targetVisibleCount;

      if (train.visible) {
        const data = this.trainData.get(train);
        if (data) {
          const lineIndex = Math.floor(index / (baseTrainCount * 2));
          const curve = this.metroCurves[lineIndex % this.metroCurves.length];

          data.progress += data.speed * state.trainSpeedMultiplier * deltaTime * 60;
          if (data.progress > 1) data.progress -= 1;

          const position = curve.getPoint(data.progress);
          train.position.copy(position);

          const material = train.material as THREE.MeshBasicMaterial;
          material.opacity = 0.7 + Math.sin(performance.now() * 0.005 + data.progress * 10) * 0.3;
        }
      }
    });
  }

  private updateIndicator(_deltaTime: number, state: TimeState): void {
    const pulseScale = 1 + Math.sin(performance.now() * 0.003) * 0.2;
    this.indicatorSphere.scale.setScalar(pulseScale);

    const sphereMaterial = this.indicatorSphere.material as THREE.MeshBasicMaterial;
    sphereMaterial.color.copy(state.indicatorColor);

    const glowMaterial = this.indicatorGlow.material as THREE.MeshBasicMaterial;
    glowMaterial.color.copy(state.indicatorColor);
    glowMaterial.opacity = 0.15 + Math.sin(performance.now() * 0.002) * 0.1;
  }

  private updateRingLight(deltaTime: number): void {
    this.ringLight.rotation.y += 0.5 * deltaTime;
  }

  private updateStars(_deltaTime: number): void {
    const sizes = this.stars.geometry.attributes.size.array as Float32Array;

    this.starData.forEach((data, i) => {
      const brightness = 0.5 + Math.sin(data.phase + performance.now() * 0.001 * data.speed) * 0.5;
      sizes[i] = 0.015 + brightness * 0.015;
    });

    this.stars.geometry.attributes.size.needsUpdate = true;
  }

  public resize(): void {
    const newGridSize = window.innerWidth < 768 ? 8 : 10;
    if (newGridSize !== this.gridSize) {
      this.gridSize = newGridSize;
      this.rebuildCity();
    }
  }

  private rebuildCity(): void {
    this.buildings.forEach(b => this.cityGroup.remove(b));
    this.roads.forEach(r => this.cityGroup.remove(r));
    this.buildings = [];
    this.roads = [];

    this.createBuildings();
  }

  public dispose(): void {
    this.buildings.forEach(b => {
      b.geometry.dispose();
      (b.material as THREE.Material).dispose();
    });

    this.trains.forEach(t => {
      t.geometry.dispose();
      (t.material as THREE.Material).dispose();
    });

    this.particleSystem.geometry.dispose();
    (this.particleSystem.material as THREE.Material).dispose();

    this.indicatorSphere.geometry.dispose();
    (this.indicatorSphere.material as THREE.Material).dispose();

    this.ringLight.geometry.dispose();
    (this.ringLight.material as THREE.Material).dispose();

    this.dome.geometry.dispose();
    (this.dome.material as THREE.Material).dispose();

    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
  }
}
