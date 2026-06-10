import * as THREE from 'three';

export interface GemSpot {
  mesh: THREE.Mesh;
  color: THREE.Color;
  colorHex: string;
  blinkPhase: number;
  blinkSpeed: number;
  position: THREE.Vector3;
  active: boolean;
  rockIndex: number;
}

export class MineScene {
  public scene: THREE.Scene;
  public gemSpots: GemSpot[] = [];
  public rockMeshes: THREE.Mesh[] = [];
  public shelfGroup: THREE.Group;
  private dustParticles: THREE.Points;
  private crystalColumns: THREE.Mesh[] = [];

  private readonly GEM_COLORS = [
    { hex: '#ff4466', name: '红' },
    { hex: '#4488ff', name: '蓝' },
    { hex: '#44ff88', name: '绿' },
    { hex: '#aa66ff', name: '紫' },
    { hex: '#ff8833', name: '橙' },
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.shelfGroup = new THREE.Group();
    this.dustParticles = new THREE.Points();
    this.createCaveWalls();
    this.createCrystalColumns();
    this.createRocksWithGems();
    this.createDisplayShelf();
    this.createDustParticles();
  }

  private createCaveWalls(): void {
    const caveGroup = new THREE.Group();

    const wallGeometry = new THREE.SphereGeometry(30, 64, 64);
    const wallPositions = wallGeometry.attributes.position;
    for (let i = 0; i < wallPositions.count; i++) {
      const x = wallPositions.getX(i);
      const y = wallPositions.getY(i);
      const z = wallPositions.getZ(i);
      const noise = Math.random() * 0.8 - 0.4;
      const len = Math.sqrt(x * x + y * y + z * z);
      wallPositions.setXYZ(i, x + (x / len) * noise, y + (y / len) * noise, z + (z / len) * noise);
    }
    wallGeometry.computeVertexNormals();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#3a2a1a');
    gradient.addColorStop(0.5, '#2f2f2f');
    gradient.addColorStop(1, '#2a3a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.3 + 0.1})`;
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(${60 + Math.random() * 40},${50 + Math.random() * 40},${40 + Math.random() * 40},${Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 40 + 10, 0, Math.PI * 2);
      ctx.fill();
    }
    const wallTexture = new THREE.CanvasTexture(canvas);
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(4, 4);

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      side: THREE.BackSide,
      roughness: 0.9,
      metalness: 0.1,
    });

    const cave = new THREE.Mesh(wallGeometry, wallMaterial);
    caveGroup.add(cave);

    const floorGeometry = new THREE.CircleGeometry(28, 64);
    const floorPositions = floorGeometry.attributes.position;
    for (let i = 0; i < floorPositions.count; i++) {
      const x = floorPositions.getX(i);
      const z = floorPositions.getY(i);
      const noise = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.3 + Math.random() * 0.2;
      floorPositions.setZ(i, noise);
    }
    floorGeometry.computeVertexNormals();
    floorGeometry.rotateX(-Math.PI / 2);

    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const floorCtx = floorCanvas.getContext('2d')!;
    floorCtx.fillStyle = '#3a2a1a';
    floorCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 150; i++) {
      floorCtx.fillStyle = `rgba(${50 + Math.random() * 30},${40 + Math.random() * 30},${30 + Math.random() * 30},${Math.random() * 0.5})`;
      floorCtx.beginPath();
      floorCtx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 30 + 5, 0, Math.PI * 2);
      floorCtx.fill();
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(3, 3);

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 1,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -4;
    caveGroup.add(floor);

    this.scene.add(caveGroup);
  }

  private createCrystalColumns(): void {
    for (let i = 0; i < 8; i++) {
      const height = 0.5 + Math.random() * 1;
      const geometry = new THREE.ConeGeometry(0.1 + Math.random() * 0.1, height, 6);
      const color1 = new THREE.Color('#88ccff');
      const color2 = new THREE.Color('#cc88ff');
      const t = Math.random();
      const crystalColor = color1.clone().lerp(color2, t);
      const material = new THREE.MeshStandardMaterial({
        color: crystalColor,
        transparent: true,
        opacity: 0.6,
        emissive: crystalColor,
        emissiveIntensity: 0.3,
        roughness: 0.1,
        metalness: 0.3,
      });
      const crystal = new THREE.Mesh(geometry, material);
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 15;
      crystal.position.set(
        Math.cos(angle) * radius,
        8 + Math.random() * 4,
        Math.sin(angle) * radius
      );
      crystal.rotation.x = Math.PI + (Math.random() - 0.5) * 0.3;
      crystal.rotation.z = (Math.random() - 0.5) * 0.3;
      this.crystalColumns.push(crystal);
      this.scene.add(crystal);

      const light = new THREE.PointLight(crystalColor, 0.3, 3);
      light.position.copy(crystal.position);
      this.scene.add(light);
    }
  }

  private createRocksWithGems(): void {
    const rockCount = 12;
    for (let i = 0; i < rockCount; i++) {
      const rockGeometry = new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 8, 6);
      const rockPositions = rockGeometry.attributes.position;
      for (let j = 0; j < rockPositions.count; j++) {
        const x = rockPositions.getX(j);
        const y = rockPositions.getY(j);
        const z = rockPositions.getZ(j);
        const noise = Math.random() * 0.3 - 0.15;
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        rockPositions.setXYZ(j, x + (x / len) * noise, y + (y / len) * noise, z + (z / len) * noise);
      }
      rockGeometry.computeVertexNormals();
      rockGeometry.scale(1, 0.6 + Math.random() * 0.3, 1);

      const rockMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#4a3a2a'),
        roughness: 0.9,
        metalness: 0.1,
      });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);

      const angle = (i / rockCount) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 5 + Math.random() * 10;
      rock.position.set(
        Math.cos(angle) * radius,
        -3.3 + Math.random() * 0.3,
        Math.sin(angle) * radius
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      this.rockMeshes.push(rock);
      this.scene.add(rock);

      const gemCount = 1 + Math.floor(Math.random() * 2);
      for (let g = 0; g < gemCount; g++) {
        this.createGemSpot(rock, i);
      }
    }
  }

  private createGemSpot(rock: THREE.Mesh, rockIndex: number): void {
    const colorData = this.GEM_COLORS[Math.floor(Math.random() * this.GEM_COLORS.length)];
    const color = new THREE.Color(colorData.hex);

    const geometry = new THREE.SphereGeometry(0.08, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const spot = new THREE.Mesh(geometry, material);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4;
    const r = 0.7 + Math.random() * 0.3;
    const localPos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      0.2 + Math.abs(r * Math.cos(phi)) * 0.5,
      r * Math.sin(phi) * Math.sin(theta)
    );

    const worldPos = localPos.clone().applyMatrix4(rock.matrixWorld);
    spot.position.copy(worldPos);
    spot.lookAt(new THREE.Vector3(0, 0, 0));

    const gemSpot: GemSpot = {
      mesh: spot,
      color: color,
      colorHex: colorData.hex,
      blinkPhase: Math.random() * Math.PI * 2,
      blinkSpeed: 1.5 + Math.random() * 1.5,
      position: worldPos,
      active: true,
      rockIndex: rockIndex,
    };

    this.gemSpots.push(gemSpot);
    this.scene.add(spot);
  }

  private createDisplayShelf(): void {
    const shelfWood = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6b4226'),
      roughness: 0.8,
      metalness: 0.1,
    });

    const shelfDepth = 0.8;
    const shelfWidth = 5;
    const shelfHeight = 0.15;
    const layerGap = 2;
    const startY = -2;

    for (let layer = 0; layer < 3; layer++) {
      const boardGeometry = new THREE.BoxGeometry(shelfWidth, shelfHeight, shelfDepth);
      const board = new THREE.Mesh(boardGeometry, shelfWood);
      board.position.set(15, startY + layer * layerGap, 0);
      this.shelfGroup.add(board);

      const backGeometry = new THREE.BoxGeometry(shelfWidth, layerGap * 0.8, 0.05);
      const back = new THREE.Mesh(backGeometry, shelfWood);
      back.position.set(15, startY + layer * layerGap + layerGap * 0.3, -shelfDepth / 2);
      this.shelfGroup.add(back);
    }

    const sideGeometry = new THREE.BoxGeometry(0.1, layerGap * 2 + shelfHeight, shelfDepth);
    const leftSide = new THREE.Mesh(sideGeometry, shelfWood);
    leftSide.position.set(15 - shelfWidth / 2, startY + layerGap, 0);
    this.shelfGroup.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeometry, shelfWood);
    rightSide.position.set(15 + shelfWidth / 2, startY + layerGap, 0);
    this.shelfGroup.add(rightSide);

    this.scene.add(this.shelfGroup);
  }

  private createDustParticles(): void {
    const count = 300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const dustColor = new THREE.Color('#88aacc');

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 20 - 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      colors[i * 3] = dustColor.r;
      colors[i * 3 + 1] = dustColor.g;
      colors[i * 3 + 2] = dustColor.b;

      sizes[i] = 0.5 + Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  public update(time: number, delta: number): void {
    for (const spot of this.gemSpots) {
      if (spot.active) {
        const intensity = 0.5 + 0.5 * Math.sin(time * spot.blinkSpeed + spot.blinkPhase);
        (spot.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + intensity * 0.6;
        spot.mesh.scale.setScalar(0.8 + intensity * 0.4);
      }
    }

    const positions = this.dustParticles.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    for (let i = 0; i < posArray.length; i += 3) {
      posArray[i] += Math.sin(time * 0.2 + i) * delta * 0.05;
      posArray[i + 1] += delta * 0.03;
      posArray[i + 2] += Math.cos(time * 0.15 + i) * delta * 0.05;
      if (posArray[i + 1] > 15) posArray[i + 1] = -5;
      if (Math.abs(posArray[i]) > 20) posArray[i] *= -0.9;
      if (Math.abs(posArray[i + 2]) > 20) posArray[i + 2] *= -0.9;
    }
    positions.needsUpdate = true;

    for (const crystal of this.crystalColumns) {
      const mat = crystal.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(time * 0.8 + crystal.position.x) * 0.1;
    }
  }

  public getShelfPosition(layer: number, index: number): THREE.Vector3 {
    const shelfWidth = 5;
    const layerGap = 2;
    const startY = -2;
    const gemsPerLayer = 5;
    const spacing = shelfWidth / (gemsPerLayer + 1);
    const x = 15 - shelfWidth / 2 + spacing * (index + 1);
    const y = startY + layer * layerGap + 0.5;
    const z = 0;
    return new THREE.Vector3(x, y, z);
  }

  public getShelfScreenPosition(camera: THREE.Camera, layer: number, index: number): THREE.Vector2 {
    const pos = this.getShelfPosition(layer, index);
    const screenPos = pos.clone().project(camera);
    return new THREE.Vector2(
      (screenPos.x + 1) / 2 * window.innerWidth,
      (-screenPos.y + 1) / 2 * window.innerHeight
    );
  }

  public deactivateGemSpot(spot: GemSpot): void {
    spot.active = false;
    this.scene.remove(spot.mesh);
    spot.mesh.geometry.dispose();
    (spot.mesh.material as THREE.Material).dispose();
  }

  public respawnGemSpot(): void {
    const inactiveRocks = this.rockMeshes.filter((_, idx) => {
      const spotsOnRock = this.gemSpots.filter(s => s.rockIndex === idx && s.active);
      return spotsOnRock.length < 2;
    });
    if (inactiveRocks.length === 0) return;

    const rock = inactiveRocks[Math.floor(Math.random() * inactiveRocks.length)];
    const rockIndex = this.rockMeshes.indexOf(rock);
    this.createGemSpot(rock, rockIndex);
  }
}
