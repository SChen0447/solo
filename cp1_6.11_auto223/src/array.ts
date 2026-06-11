import * as THREE from 'three';

export interface PointingParams {
  azimuth: number;
  elevation: number;
  ra: string;
  dec: string;
}

export interface SkySource {
  name: string;
  ra: number;
  dec: number;
  strength: number;
  type: 'pulsar' | 'nebula' | 'galaxy' | 'tech';
  frequency: number;
}

const SKY_SOURCES: SkySource[] = [
  { name: '蟹状星云脉冲星', ra: 5.575, dec: 22.01, strength: 0.9, type: 'pulsar', frequency: 1.4 },
  { name: '银河系中心', ra: 17.761, dec: -29.008, strength: 0.85, type: 'galaxy', frequency: 1.42 },
  { name: '猎户座大星云', ra: 5.583, dec: -5.383, strength: 0.6, type: 'nebula', frequency: 0.3 },
  { name: '船帆座脉冲星', ra: 8.05, dec: -45.18, strength: 0.75, type: 'pulsar', frequency: 0.8 },
  { name: '疑似智慧信号源', ra: 19.58, dec: 24.73, strength: 0.7, type: 'tech', frequency: 1.42 },
];

export class TelescopeArray {
  private scene: THREE.Scene;
  private dishGroup: THREE.Group;
  private stars!: THREE.Points;
  private galaxyGlow!: THREE.Sprite;
  private antennas: THREE.Mesh[] = [];
  private feedDots: THREE.Mesh[] = [];
  private beamLines: THREE.Line[] = [];

  private azimuth: number = 0;
  private elevation: number = 0;

  private starCount: number = 2000;

  private isMobile: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.dishGroup = new THREE.Group();
    this.scene.add(this.dishGroup);

    this.createStars();
    this.createGalaxyGlow();
    this.createAntennaArray();
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
    this.updateAntennaLayout();
  }

  private createStars(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;

      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = -radius * Math.cos(phi) - 20;

      const colorT = Math.random();
      if (colorT < 0.6) {
        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      } else {
        colors[i3] = 0.7 + Math.random() * 0.2;
        colors[i3 + 1] = 0.8 + Math.random() * 0.15;
        colors[i3 + 2] = 1;
      }

      sizes[i] = 0.5 + Math.random() * 2.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private createGalaxyGlow(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(138, 43, 226, 0.15)');
    gradient.addColorStop(0.3, 'rgba(75, 0, 130, 0.1)');
    gradient.addColorStop(0.6, 'rgba(30, 10, 60, 0.05)');
    gradient.addColorStop(1, 'rgba(10, 5, 30, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 500; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.5) * 200;
      const x = 256 + Math.cos(angle) * dist;
      const y = 256 + Math.sin(angle) * dist * 0.6;
      const size = Math.random() * 2;
      const alpha = Math.random() * 0.5;
      ctx.fillStyle = `rgba(200, 180, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.galaxyGlow = new THREE.Sprite(material);
    this.galaxyGlow.scale.set(80, 80, 1);
    this.galaxyGlow.position.set(20, 15, -40);
    this.scene.add(this.galaxyGlow);
  }

  private createAntennaDish(diameter: number, color: number): THREE.Group {
    const group = new THREE.Group();

    const dishGeometry = new THREE.CircleGeometry(diameter / 2, 32);
    const dishMaterial = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeometry, dishMaterial);
    group.add(dish);

    const innerGeometry = new THREE.CircleGeometry(diameter / 2 * 0.85, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x9ca3af,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    group.add(inner);

    const centerGeometry = new THREE.CircleGeometry(diameter * 0.08, 16);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.userData.isFeed = true;
    group.add(center);

    const rimGeometry = new THREE.RingGeometry(diameter / 2 - 0.5, diameter / 2, 32);
    const rimMaterial = new THREE.MeshBasicMaterial({
      color: 0xd1d5db,
      side: THREE.DoubleSide
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    group.add(rim);

    return group;
  }

  private createAntennaArray(): void {
    const numAntennas = 5;
    const baseY = -20;

    for (let i = 0; i < numAntennas; i++) {
      const t = i / (numAntennas - 1);
      const angle = -Math.PI * 0.7 + t * Math.PI * 0.7;
      const radius = 25;

      const x = Math.sin(angle) * radius;
      const y = baseY + Math.cos(angle) * radius * 0.3;
      const z = 0;

      const diameter = 3 + Math.random() * 2;

      const dishGroup = this.createAntennaDish(diameter, 0x6b7280);
      dishGroup.position.set(x, y, z);
      dishGroup.userData.baseAngle = angle;
      dishGroup.userData.baseX = x;
      dishGroup.userData.baseY = y;

      this.dishGroup.add(dishGroup);
      this.antennas.push(dishGroup as unknown as THREE.Mesh);
    }

    this.createBeamLines();
  }

  private createBeamLines(): void {
    this.beamLines.forEach(line => this.dishGroup.remove(line));
    this.beamLines = [];

    const targetPoint = new THREE.Vector3(0, 5, 0);

    this.antennas.forEach(antenna => {
      const startPoint = new THREE.Vector3();
      antenna.getWorldPosition(startPoint);

      const points = [startPoint.clone(), targetPoint.clone()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.3
      });

      const line = new THREE.Line(geometry, material);
      this.dishGroup.add(line);
      this.beamLines.push(line);
    });
  }

  private updateAntennaLayout(): void {
    const numAntennas = this.isMobile ? 3 : 5;

    while (this.antennas.length > numAntennas) {
      const antenna = this.antennas.pop()!;
      this.dishGroup.remove(antenna);
    }

    if (this.antennas.length < numAntennas) {
      for (let i = this.antennas.length; i < numAntennas; i++) {
        const diameter = 3 + Math.random() * 2;
        const dishGroup = this.createAntennaDish(diameter, 0x6b7280);
        this.dishGroup.add(dishGroup);
        this.antennas.push(dishGroup as unknown as THREE.Mesh);
      }
    }

    const baseY = -18;

    if (this.isMobile) {
      const spacing = 12;
      const startX = -spacing * (numAntennas - 1) / 2;

      this.antennas.forEach((antenna, i) => {
        const x = startX + i * spacing;
        antenna.position.set(x, baseY, 0);
        antenna.userData.baseX = x;
        antenna.userData.baseY = baseY;
      });
    } else {
      for (let i = 0; i < numAntennas; i++) {
        const t = i / (numAntennas - 1);
        const angle = -Math.PI * 0.7 + t * Math.PI * 0.7;
        const radius = 25;

        const x = Math.sin(angle) * radius;
        const y = baseY + Math.cos(angle) * radius * 0.3;

        const antenna = this.antennas[i];
        antenna.position.set(x, y, 0);
        antenna.userData.baseAngle = angle;
        antenna.userData.baseX = x;
        antenna.userData.baseY = y;
      }
    }

    this.createBeamLines();
  }

  setPointing(azimuth: number, elevation: number): void {
    this.azimuth = Math.max(-180, Math.min(180, azimuth));
    this.elevation = Math.max(-30, Math.min(30, elevation));

    const azRad = (this.azimuth * Math.PI) / 180;
    const elRad = (this.elevation * Math.PI) / 180;

    this.antennas.forEach((antenna, i) => {
      const baseX = antenna.userData.baseX;
      const baseY = antenna.userData.baseY;

      const swayAmount = 0.3;
      const tiltAmount = 0.5;

      antenna.rotation.y = azRad * swayAmount;
      antenna.rotation.x = -elRad * tiltAmount;

      const parallax = 0.1;
      antenna.position.x = baseX + azRad * parallax * 5;
    });

    this.beamLines.forEach((line, i) => {
      const antenna = this.antennas[i];
      const positions = line.geometry.attributes.position.array as Float32Array;

      const startPoint = new THREE.Vector3();
      antenna.getWorldPosition(startPoint);
      this.dishGroup.worldToLocal(startPoint);

      positions[0] = startPoint.x;
      positions[1] = startPoint.y;
      positions[2] = startPoint.z;

      line.geometry.attributes.position.needsUpdate = true;
    });
  }

  getPointing(): PointingParams {
    const raHours = 12 + (this.azimuth / 180) * 12;
    const decDegrees = this.elevation + 20;

    const ra = this.formatRA(raHours);
    const dec = this.formatDec(decDegrees);

    return {
      azimuth: this.azimuth,
      elevation: this.elevation,
      ra,
      dec
    };
  }

  private formatRA(hours: number): string {
    const h = Math.floor(hours);
    const minFloat = (hours - h) * 60;
    const m = Math.floor(minFloat);
    const s = Math.floor((minFloat - m) * 60);
    return `${h.toString().padStart(2, '0')}h${m.toString().padStart(2, '0')}m${s.toString().padStart(2, '0')}s`;
  }

  private formatDec(degrees: number): string {
    const sign = degrees >= 0 ? '+' : '-';
    const absDeg = Math.abs(degrees);
    const d = Math.floor(absDeg);
    const minFloat = (absDeg - d) * 60;
    const m = Math.floor(minFloat);
    const s = Math.floor((minFloat - m) * 60);
    return `${sign}${d.toString().padStart(2, '0')}°${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}"`;
  }

  computeSignalStrength(targetFreq: number): { strength: number; snr: number; sourceType: string } {
    let totalStrength = 0.1;
    let bestSource: SkySource | null = null as SkySource | null;
    let bestMatch = 0;

    const raHours = 12 + (this.azimuth / 180) * 12;
    const decDegrees = this.elevation + 20;

    SKY_SOURCES.forEach(source => {
      const raDiff = Math.abs(source.ra - raHours);
      const decDiff = Math.abs(source.dec - decDegrees);
      const angularDist = Math.sqrt(raDiff * raDiff * 15 * 15 + decDiff * decDiff);

      const beamWidth = 15;
      const beamPattern = Math.exp(-0.5 * Math.pow(angularDist / beamWidth, 2));

      const freqDiff = Math.abs(source.frequency - targetFreq);
      const freqMatch = Math.exp(-0.5 * Math.pow(freqDiff / 0.5, 2));

      const contribution = source.strength * beamPattern * freqMatch;
      totalStrength += contribution;

      if (contribution > bestMatch) {
        bestMatch = contribution;
        bestSource = source;
      }
    });

    const noiseFloor = 0.08;
    const signal = Math.max(0, totalStrength - noiseFloor);
    const snr = signal > 0 ? 10 * Math.log10(signal / noiseFloor) : 0;

    return {
      strength: Math.min(1, totalStrength),
      snr: Math.max(0, Math.min(40, snr)),
      sourceType: bestSource?.type || 'noise'
    };
  }

  update(time: number): void {
    if (this.stars) {
      this.stars.rotation.y = time * 0.005;
    }

    if (this.galaxyGlow) {
      const rotationSpeed = (Math.PI * 2) / 60;
      this.galaxyGlow.material.rotation = time * rotationSpeed;
    }

    this.antennas.forEach((antenna, i) => {
      const breathe = Math.sin(time * 0.5 + i * 0.7) * 0.02;
      antenna.scale.setScalar(1 + breathe);
    });
  }

  getDishGroup(): THREE.Group {
    return this.dishGroup;
  }

  getAntennaPositions(): THREE.Vector3[] {
    return this.antennas.map(a => {
      const pos = new THREE.Vector3();
      a.getWorldPosition(pos);
      return pos;
    });
  }
}
