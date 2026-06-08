import * as THREE from 'three';

export type BuildingStyle = 'modern' | 'classical' | 'futuristic';

export interface BuildingData {
  id: number;
  mesh: THREE.Group;
  position: THREE.Vector3;
  height: number;
  width: number;
  depth: number;
  style: BuildingStyle;
}

export interface BuildingStats {
  total: number;
  avgHeight: number;
  density: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const elasticOut = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export class BuildingManager extends EventTarget {
  private scene: THREE.Scene;
  private buildings: BuildingData[] = [];
  private buildingIdCounter = 0;
  private gridSize = 1;
  private gridBounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
  private minHeight = 2;
  private maxHeight = 8;
  private currentStyle: BuildingStyle = 'modern';
  private raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Mesh;
  private previewMesh: THREE.Mesh;
  private previewRing: THREE.Mesh;
  private canPlace = false;
  private animations: Array<{
    startTime: number;
    duration: number;
    onUpdate: (progress: number) => void;
    onComplete?: () => void;
  }> = [];
  private groundRings: Array<{ mesh: THREE.Mesh; startTime: number; duration: number }> = [];
  private particles: THREE.Points | null = null;
  private particleData: Array<{ velocity: THREE.Vector3; life: number; maxLife: number }> = [];
  private clock = new THREE.Clock();
  private buildingWidth = 1.5;
  private buildingDepth = 1.5;

  private sharedGeometries: {
    unitBox: THREE.BoxGeometry;
    ring: THREE.RingGeometry;
    spot: THREE.PlaneGeometry;
    sphere: THREE.SphereGeometry;
    torus: THREE.TorusGeometry;
    torusBig: THREE.TorusGeometry;
    band: THREE.BoxGeometry;
  } | null = null;

  private sharedMaterials: {
    modern: THREE.MeshStandardMaterial;
    classical: THREE.MeshStandardMaterial;
    futuristic: THREE.MeshStandardMaterial;
    reflectionSpot: THREE.MeshBasicMaterial;
    stoneGrid: THREE.LineBasicMaterial;
  } | null = null;

  constructor(scene: THREE.Scene, groundPlane: THREE.Mesh) {
    super();
    this.scene = scene;
    this.groundPlane = groundPlane;
    this.initSharedResources();
    this.previewMesh = this.createPreviewMesh();
    this.previewRing = this.createPreviewRing();
    this.scene.add(this.previewMesh);
    this.scene.add(this.previewRing);
    this.initParticles();
  }

  private initSharedResources(): void {
    this.sharedGeometries = {
      unitBox: new THREE.BoxGeometry(1, 1, 1),
      ring: new THREE.RingGeometry(0.7, 0.9, 32),
      spot: new THREE.PlaneGeometry(0.15, 0.25),
      sphere: new THREE.SphereGeometry(0.15, 8, 8),
      torus: new THREE.TorusGeometry(0.45, 0.05, 8, 20),
      torusBig: new THREE.TorusGeometry(0.6, 0.08, 8, 32),
      band: new THREE.BoxGeometry(1.02, 0.1, 1.02)
    };

    this.sharedMaterials = {
      modern: new THREE.MeshStandardMaterial({
        color: 0x4a90d9,
        metalness: 0.8,
        roughness: 0.2
      }),
      classical: new THREE.MeshStandardMaterial({
        color: 0xd4b896,
        metalness: 0.1,
        roughness: 0.8
      }),
      futuristic: new THREE.MeshStandardMaterial({
        color: 0x223344,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x003366,
        emissiveIntensity: 0.3
      }),
      reflectionSpot: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
      }),
      stoneGrid: new THREE.LineBasicMaterial({
        color: 0xb8956e,
        transparent: true,
        opacity: 0.5
      })
    };
  }

  private createPreviewMesh(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(this.buildingWidth, 5, this.buildingDepth);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    return mesh;
  }

  private createPreviewRing(): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.7, 0.9, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01;
    mesh.visible = false;
    return mesh;
  }

  private initParticles(): void {
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] = -100;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.1,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = false;
    this.scene.add(this.particles);

    for (let i = 0; i < particleCount; i++) {
      this.particleData.push({
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0
      });
    }
  }

  setHeightRange(min: number, max: number): void {
    this.minHeight = min;
    this.maxHeight = max;
  }

  getHeightRange(): { min: number; max: number } {
    return { min: this.minHeight, max: this.maxHeight };
  }

  setStyle(style: BuildingStyle): void {
    if (this.currentStyle === style) return;
    this.currentStyle = style;
    if (this.particles) {
      this.particles.visible = style === 'futuristic';
    }
    this.styleSwitchAnimation();
    this.dispatchEvent(new CustomEvent('styleChange', { detail: { style } }));
  }

  getStyle(): BuildingStyle {
    return this.currentStyle;
  }

  getStats(): BuildingStats {
    const total = this.buildings.length;
    const avgHeight = total > 0
      ? this.buildings.reduce((sum, b) => sum + b.height, 0) / total
      : 0;
    const area = (this.gridBounds.maxX - this.gridBounds.minX) * (this.gridBounds.maxZ - this.gridBounds.minZ);
    const density = total / area * 100;
    return { total, avgHeight: parseFloat(avgHeight.toFixed(2)), density: parseFloat(density.toFixed(2)) };
  }

  getBuildings(): BuildingData[] {
    return this.buildings;
  }

  updatePreview(mouse: THREE.Vector2, camera: THREE.Camera): void {
    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const snappedX = Math.round(point.x / this.gridSize) * this.gridSize;
      const snappedZ = Math.round(point.z / this.gridSize) * this.gridSize;

      this.canPlace = this.checkCanPlace(snappedX, snappedZ);
      const color = this.canPlace ? 0x00ff00 : 0xff0000;

      (this.previewMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      (this.previewRing.material as THREE.MeshBasicMaterial).color.setHex(color);

      const previewHeight = (this.minHeight + this.maxHeight) / 2;
      this.previewMesh.scale.set(1, previewHeight / 5, 1);
      this.previewMesh.position.set(snappedX, previewHeight / 2, snappedZ);
      this.previewRing.position.set(snappedX, 0.01, snappedZ);
      this.previewMesh.visible = true;
      this.previewRing.visible = true;
    } else {
      this.previewMesh.visible = false;
      this.previewRing.visible = false;
    }
  }

  hidePreview(): void {
    this.previewMesh.visible = false;
    this.previewRing.visible = false;
  }

  private checkCanPlace(x: number, z: number): boolean {
    const halfW = this.buildingWidth / 2;
    const halfD = this.buildingDepth / 2;

    if (x - halfW < this.gridBounds.minX || x + halfW > this.gridBounds.maxX ||
        z - halfD < this.gridBounds.minZ || z + halfD > this.gridBounds.maxZ) {
      return false;
    }

    for (const building of this.buildings) {
      const dx = Math.abs(x - building.position.x);
      const dz = Math.abs(z - building.position.z);
      if (dx < (this.buildingWidth + building.width) / 2 && dz < (this.buildingDepth + building.depth) / 2) {
        return false;
      }
    }

    return true;
  }

  placeBuilding(mouse: THREE.Vector2, camera: THREE.Camera): boolean {
    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const snappedX = Math.round(point.x / this.gridSize) * this.gridSize;
      const snappedZ = Math.round(point.z / this.gridSize) * this.gridSize;

      if (!this.checkCanPlace(snappedX, snappedZ)) return false;

      const height = this.minHeight + Math.random() * (this.maxHeight - this.minHeight);
      this.createBuilding(snappedX, height, snappedZ);
      this.createGroundRing(snappedX, snappedZ);
      this.emitStatsChange();
      return true;
    }
    return false;
  }

  private createBuilding(x: number, height: number, z: number): void {
    const group = new THREE.Group();

    const building = this.createBuildingMesh(this.buildingWidth, height, this.buildingDepth, this.currentStyle);
    building.position.y = height / 2;
    building.name = 'buildingMesh';
    group.add(building);

    const topLights = this.createTopLights(height, this.buildingWidth);
    group.add(topLights);

    group.position.set(x, 0, z);
    group.scale.y = 0.01;

    this.scene.add(group);

    const buildingData: BuildingData = {
      id: this.buildingIdCounter++,
      mesh: group,
      position: new THREE.Vector3(x, 0, z),
      height,
      width: this.buildingWidth,
      depth: this.buildingDepth,
      style: this.currentStyle
    };

    this.buildings.push(buildingData);

    const duration = 0.6;
    const startTime = this.clock.getElapsedTime();
    this.animations.push({
      startTime,
      duration,
      onUpdate: (progress) => {
        const eased = easeOutCubic(progress);
        group.scale.y = eased;
        building.position.y = (height / 2) * eased;
      },
      onComplete: () => {
        group.scale.y = 1;
        building.position.y = height / 2;
      }
    });
  }

  private createBuildingMesh(width: number, height: number, depth: number, style: BuildingStyle): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    let material: THREE.MeshStandardMaterial;

    switch (style) {
      case 'modern':
        material = new THREE.MeshStandardMaterial({
          color: 0x4a90d9,
          metalness: 0.8,
          roughness: 0.2
        });
        break;
      case 'classical':
        material = new THREE.MeshStandardMaterial({
          color: 0xd4b896,
          metalness: 0.1,
          roughness: 0.8
        });
        break;
      case 'futuristic':
      default:
        material = new THREE.MeshStandardMaterial({
          color: 0x223344,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0x003366,
          emissiveIntensity: 0.3
        });
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (style === 'modern') {
      this.addGlassReflections(mesh, width, height, depth);
    } else if (style === 'classical') {
      this.addStoneTexture(mesh, width, height, depth);
    } else if (style === 'futuristic') {
      this.addFuturisticGlow(mesh, width, height, depth);
    }

    return mesh;
  }

  private addGlassReflections(mesh: THREE.Mesh, width: number, height: number, depth: number): void {
    const spotCount = 5;
    const spotGeometry = new THREE.PlaneGeometry(0.15, 0.25);
    const spotMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });

    for (let side = 0; side < 2; side++) {
      const zOffset = side === 0 ? depth / 2 + 0.001 : -depth / 2 - 0.001;
      for (let i = 0; i < spotCount; i++) {
        const spot = new THREE.Mesh(spotGeometry, spotMaterial.clone());
        spot.position.set(
          (Math.random() - 0.5) * width * 0.7,
          (Math.random() - 0.5) * height * 0.7,
          0
        );
        spot.userData.speed = 0.3 + Math.random() * 0.5;
        spot.userData.offset = Math.random() * Math.PI * 2;
        spot.userData.radiusX = width * 0.3 + Math.random() * width * 0.1;
        spot.userData.radiusY = height * 0.25 + Math.random() * height * 0.1;
        spot.name = 'reflectionSpot';
        spot.position.z = zOffset;
        if (side === 1) spot.rotation.y = Math.PI;
        mesh.add(spot);
      }
    }
  }

  private addStoneTexture(mesh: THREE.Mesh, width: number, height: number, depth: number): void {
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xb8956e, transparent: true, opacity: 0.5 });

    const addGridFace = (faceZ: number) => {
      const points: THREE.Vector3[] = [];
      const linesV = Math.max(2, Math.floor(height / 1.2));
      const linesH = Math.max(2, Math.floor(width / 1.2));

      for (let i = 1; i <= linesV; i++) {
        const y = -height / 2 + i * (height / (linesV + 1));
        points.push(new THREE.Vector3(-width / 2, y, faceZ));
        points.push(new THREE.Vector3(width / 2, y, faceZ));
      }

      for (let i = 1; i <= linesH; i++) {
        const x = -width / 2 + i * (width / (linesH + 1));
        points.push(new THREE.Vector3(x, -height / 2, faceZ));
        points.push(new THREE.Vector3(x, height / 2, faceZ));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const lines = new THREE.LineSegments(geometry, lineMaterial.clone());
      lines.name = 'stoneGrid';
      mesh.add(lines);
    };

    addGridFace(depth / 2 + 0.001);
    addGridFace(-depth / 2 - 0.001);
  }

  private addFuturisticGlow(mesh: THREE.Mesh, width: number, height: number, depth: number): void {
    const bandCount = 5;
    const bandGeometry = new THREE.BoxGeometry(width * 1.02, 0.1, depth * 1.02);

    for (let i = 0; i < bandCount; i++) {
      const hue = (i / bandCount);
      const color = new THREE.Color().setHSL(hue, 1, 0.5);
      const bandMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7
      });
      const band = new THREE.Mesh(bandGeometry, bandMaterial);
      band.position.y = -height / 2 + (i + 0.5) * (height / bandCount);
      band.userData.speed = 0.4 + Math.random() * 0.4;
      band.userData.offset = Math.random() * Math.PI * 2;
      band.userData.baseY = band.position.y;
      band.userData.baseHue = hue;
      band.name = 'glowBand';
      mesh.add(band);
    }
  }

  private createTopLights(height: number, width: number): THREE.Group {
    const group = new THREE.Group();
    group.position.y = height;
    group.name = 'topLights';

    if (height < 4) {
      const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.y = 0.15;
      light.name = 'lightMesh';
      group.add(light);

      const pointLight = new THREE.PointLight(0xffcc66, 0.6, 6);
      pointLight.position.y = 0.3;
      group.add(pointLight);
    } else if (height < 6) {
      const tubeGeo = new THREE.TorusGeometry(width * 0.3, 0.05, 8, 20);
      const tubeMat = new THREE.MeshBasicMaterial({ color: 0xe0f0ff });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.y = 0.1;
      tube.name = 'lightMesh';
      group.add(tube);

      const pointLight = new THREE.PointLight(0xe0f0ff, 0.9, 10);
      pointLight.position.y = 0.3;
      group.add(pointLight);
    } else {
      const neonGeo = new THREE.TorusGeometry(width * 0.4, 0.08, 8, 32);
      const colors = [0xff0066, 0x00ffff, 0xffcc00, 0x66ff00, 0xff33ff];
      const neonMat = new THREE.MeshBasicMaterial({ color: colors[0] });
      const neon = new THREE.Mesh(neonGeo, neonMat);
      neon.rotation.x = Math.PI / 2;
      neon.position.y = 0.15;
      neon.userData.colors = colors;
      neon.userData.colorIndex = 0;
      neon.userData.flashTimer = 0;
      neon.name = 'neonLight';
      group.add(neon);

      const pointLight = new THREE.PointLight(0xff0066, 1.5, 15);
      pointLight.position.y = 0.4;
      group.add(pointLight);
    }

    return group;
  }

  private createGroundRing(x: number, z: number): void {
    const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.02, z);
    this.scene.add(ring);

    this.groundRings.push({
      mesh: ring,
      startTime: this.clock.getElapsedTime(),
      duration: 0.6
    });
  }

  private styleSwitchAnimation(): void {
    const duration = 0.3;
    const startTime = this.clock.getElapsedTime();

    for (const building of this.buildings) {
      const group = building.mesh;

      this.animations.push({
        startTime,
        duration: duration * 2,
        onUpdate: (progress) => {
          if (progress < 0.5) {
            const shrinkProgress = progress * 2;
            const eased = 1 - elasticOut(shrinkProgress);
            group.scale.set(eased, eased, eased);
          } else {
            const growProgress = (progress - 0.5) * 2;
            const eased = elasticOut(growProgress);
            group.scale.set(eased, eased, eased);
          }
        },
        onComplete: () => {
          group.scale.set(1, 1, 1);
          this.replaceBuildingStyle(building);
        }
      });
    }
  }

  private replaceBuildingStyle(building: BuildingData): void {
    const group = building.mesh;

    const buildingMesh = group.children.find(c => c.name === 'buildingMesh') as THREE.Mesh;
    const topLights = group.children.find(c => c.name === 'topLights');

    if (buildingMesh) {
      group.remove(buildingMesh);
      this.disposeObject(buildingMesh);
    }

    if (topLights) {
      group.remove(topLights);
      this.disposeObject(topLights);
    }

    const newBuilding = this.createBuildingMesh(building.width, building.height, building.depth, this.currentStyle);
    newBuilding.position.y = building.height / 2;
    newBuilding.name = 'buildingMesh';
    group.add(newBuilding);

    const newTopLights = this.createTopLights(building.height, building.width);
    group.add(newTopLights);

    building.style = this.currentStyle;
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }

  private emitStatsChange(): void {
    const stats = this.getStats();
    this.dispatchEvent(new CustomEvent('statsChange', { detail: stats }));
  }

  update(deltaTime: number, elapsedTime: number, camera: THREE.Camera): void {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i];
      const progress = Math.min((elapsedTime - anim.startTime) / anim.duration, 1);
      anim.onUpdate(progress);

      if (progress >= 1) {
        if (anim.onComplete) anim.onComplete();
        this.animations.splice(i, 1);
      }
    }

    for (let i = this.groundRings.length - 1; i >= 0; i--) {
      const ring = this.groundRings[i];
      const progress = Math.min((elapsedTime - ring.startTime) / ring.duration, 1);

      const scale = 1 + progress * 6;
      ring.mesh.scale.set(scale, scale, scale);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - progress);

      if (progress >= 1) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.groundRings.splice(i, 1);
      }
    }

    this.updateBuildingAnimations(deltaTime, elapsedTime);
    this.updateParticles(deltaTime);
  }

  private updateBuildingAnimations(deltaTime: number, time: number): void {
    for (const building of this.buildings) {
      const buildingMesh = building.mesh.children.find(c => c.name === 'buildingMesh') as THREE.Mesh;
      if (!buildingMesh) continue;

      if (building.style === 'modern') {
        buildingMesh.traverse(child => {
          if (child.name === 'reflectionSpot' && child instanceof THREE.Mesh) {
            const angle = time * child.userData.speed + child.userData.offset;
            child.position.x = Math.sin(angle) * child.userData.radiusX;
            child.position.y = Math.cos(angle * 0.8) * child.userData.radiusY;
          }
        });
      }

      if (building.style === 'futuristic') {
        buildingMesh.traverse(child => {
          if (child.name === 'glowBand' && child instanceof THREE.Mesh) {
            const angle = time * child.userData.speed + child.userData.offset;
            const offset = Math.sin(angle) * 0.4;
            child.position.y = child.userData.baseY + offset;

            const hue = ((child.userData.baseHue + time * 0.1) % 1);
            (child.material as THREE.MeshBasicMaterial).color.setHSL(hue, 1, 0.5);
          }
        });
      }

      const topLights = building.mesh.children.find(c => c.name === 'topLights');
      if (topLights && building.height >= 6) {
        topLights.traverse(child => {
          if (child.name === 'neonLight' && child instanceof THREE.Mesh) {
            child.userData.flashTimer += deltaTime;
            if (child.userData.flashTimer > 0.25) {
              child.userData.flashTimer = 0;
              const colors = child.userData.colors as number[];
              child.userData.colorIndex = (child.userData.colorIndex + 1) % colors.length;
              const color = colors[child.userData.colorIndex];
              (child.material as THREE.MeshBasicMaterial).color.setHex(color);

              topLights.traverse(l => {
                if (l instanceof THREE.PointLight) {
                  l.color.setHex(color);
                }
              });
            }
          }
        });
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    if (!this.particles || this.currentStyle !== 'futuristic') return;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;

    for (const building of this.buildings) {
      if (building.style !== 'futuristic') continue;

      if (Math.random() < 0.08) {
        let particleIndex = -1;
        for (let i = 0; i < this.particleData.length; i++) {
          if (this.particleData[i].life <= 0) {
            particleIndex = i;
            break;
          }
        }

        if (particleIndex >= 0) {
          const pd = this.particleData[particleIndex];
          pd.velocity.set(
            (Math.random() - 0.5) * 0.8,
            0.8 + Math.random() * 1.5,
            (Math.random() - 0.5) * 0.8
          );
          pd.life = 2 + Math.random() * 2;
          pd.maxLife = pd.life;

          positions[particleIndex * 3] = building.position.x + (Math.random() - 0.5) * building.width * 0.8;
          positions[particleIndex * 3 + 1] = building.height * 0.8 + Math.random() * building.height * 0.2;
          positions[particleIndex * 3 + 2] = building.position.z + (Math.random() - 0.5) * building.depth * 0.8;
        }
      }
    }

    for (let i = 0; i < this.particleData.length; i++) {
      const pd = this.particleData[i];
      if (pd.life > 0) {
        pd.life -= deltaTime;
        positions[i * 3] += pd.velocity.x * deltaTime;
        positions[i * 3 + 1] += pd.velocity.y * deltaTime;
        positions[i * 3 + 2] += pd.velocity.z * deltaTime;
        pd.velocity.y -= 0.15 * deltaTime;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  clearAll(): void {
    for (const building of this.buildings) {
      this.scene.remove(building.mesh);
      this.disposeObject(building.mesh);
    }
    this.buildings = [];
    this.emitStatsChange();
  }

  getGridBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    return this.gridBounds;
  }
}
