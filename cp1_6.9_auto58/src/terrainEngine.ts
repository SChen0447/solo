import * as THREE from 'three';

interface MountainData {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
}

interface MagmaColumn {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  cooledRock: THREE.Mesh | null;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  duration: number;
}

interface OceanData {
  mesh: THREE.Mesh;
}

export class TerrainEngine {
  private scene: THREE.Scene;
  private terrainGroup: THREE.Group;
  private mountains: MountainData[] = [];
  private collisionMountains: MountainData[] = [];
  private magmaColumns: MagmaColumn[] = [];
  private particles: Particle[] = [];
  private oceans: OceanData[] = [];
  private generatedTerrainMarkers: Set<string> = new Set();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);
  }

  public generateTerrainAroundPlate(
    platePosition: THREE.Vector3,
    timeInMillionsYears: number
  ): void {
    const marker = `${platePosition.x.toFixed(0)}_${platePosition.z.toFixed(0)}_${Math.floor(timeInMillionsYears / 20)}`;
    if (this.generatedTerrainMarkers.has(marker)) return;
    this.generatedTerrainMarkers.add(marker);

    const terrainType = this.getTerrainTypeForTime(timeInMillionsYears);

    if (terrainType === 'mountains') {
      this.generateMountainRange(platePosition, 5, 50, 200);
    } else if (terrainType === 'ocean') {
      this.generateOcean(platePosition);
    } else if (terrainType === 'both') {
      this.generateMountainRange(platePosition, 3, 50, 150);
      this.generateOcean(platePosition.clone().add(new THREE.Vector3(60, 0, 60)));
    }
  }

  private getTerrainTypeForTime(time: number): 'mountains' | 'ocean' | 'both' | null {
    const phase = Math.floor(time / 40) % 4;
    if (phase === 0) return null;
    if (phase === 1) return 'mountains';
    if (phase === 2) return 'ocean';
    return 'both';
  }

  private generateMountainRange(
    center: THREE.Vector3,
    count: number,
    minHeight: number,
    maxHeight: number
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50;
      const x = center.x + Math.cos(angle) * distance;
      const z = center.z + Math.sin(angle) * distance;
      const height = minHeight + Math.random() * (maxHeight - minHeight);
      this.createMountain(new THREE.Vector3(x, 0, z), height, false);
    }
  }

  public createCollisionMountains(
    collisionPoint: THREE.Vector3,
    count: number = 15
  ): void {
    const density = 3 + Math.random() * 2;
    const actualCount = Math.floor(count * (density / 4));

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 40;
      const x = collisionPoint.x + Math.cos(angle) * distance;
      const z = collisionPoint.z + Math.sin(angle) * distance;
      const height = 100 + Math.random() * 200;
      this.createMountain(new THREE.Vector3(x, 0, z), height, true);
    }
  }

  private createMountain(
    position: THREE.Vector3,
    height: number,
    isCollision: boolean
  ): void {
    const baseRadius = height * 0.3;
    const geometry = new THREE.ConeGeometry(baseRadius, height, 8);
    geometry.translate(0, height / 2, 0);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      positions.setX(i, x + (Math.random() - 0.5) * baseRadius * 0.15);
      positions.setZ(i, z + (Math.random() - 0.5) * baseRadius * 0.15);
    }
    geometry.computeVertexNormals();

    const startColor = isCollision ? new THREE.Color(0x8B2500) : new THREE.Color(0x6B4423);
    const endColor = new THREE.Color(0xE8E8E8);

    const material = new THREE.MeshPhongMaterial({
      color: startColor.clone(),
      flatShading: true,
      shininess: 2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const mountainData: MountainData = {
      mesh,
      startTime: performance.now(),
      duration: isCollision ? 5000 : 2000,
      startColor: startColor.clone(),
      endColor: endColor.clone()
    };

    if (isCollision) {
      this.collisionMountains.push(mountainData);
    } else {
      this.mountains.push(mountainData);
    }

    this.terrainGroup.add(mesh);

    mesh.scale.set(0.01, 0.01, 0.01);
    this.animateScale(mesh, 1.0, isCollision ? 800 : 500);
  }

  private animateScale(mesh: THREE.Mesh, targetScale: number, duration: number): void {
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const currentScale = eased * targetScale;
      mesh.scale.setScalar(currentScale);
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  private generateOcean(center: THREE.Vector3): void {
    const size = 100 + Math.random() * 50;
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshPhongMaterial({
      color: 0x1a6eb5,
      transparent: true,
      opacity: 0.6,
      shininess: 100,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.position.y = -1;

    this.oceans.push({ mesh });
    this.terrainGroup.add(mesh);
  }

  public triggerMagmaEruption(position: THREE.Vector3): void {
    const columnGeometry = new THREE.CylinderGeometry(2.5, 2.5, 80, 16);
    columnGeometry.translate(0, 40, 0);

    const columnMaterial = new THREE.MeshPhongMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.8,
      emissive: 0xff2200,
      emissiveIntensity: 0.5
    });

    const column = new THREE.Mesh(columnGeometry, columnMaterial);
    column.position.copy(position);
    column.position.y = -80;

    this.terrainGroup.add(column);

    const magmaData: MagmaColumn = {
      mesh: column,
      startTime: performance.now(),
      duration: 3000,
      cooledRock: null
    };
    this.magmaColumns.push(magmaData);

    this.createEruptionParticles(position);
  }

  private createEruptionParticles(position: THREE.Vector3): void {
    const particleCount = 500;
    const colors = [0xff3300, 0xff6600, 0xff9900, 0xffcc00];

    for (let i = 0; i < particleCount; i++) {
      const size = 0.5 + Math.random() * 1.0;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.position.y = 5;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        10 + Math.random() * 25,
        (Math.random() - 0.5) * 15
      );

      this.particles.push({
        mesh,
        velocity,
        startTime: performance.now(),
        duration: 2000
      });

      this.terrainGroup.add(mesh);
    }
  }

  public createCollisionParticles(position: THREE.Vector3): void {
    const particleCount = 500;
    const colors = [0xff3300, 0xff6600];

    for (let i = 0; i < particleCount; i++) {
      const size = 0.5 + Math.random() * 1.0;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.position.y = 5;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        5 + Math.random() * 20,
        (Math.random() - 0.5) * 20
      );

      this.particles.push({
        mesh,
        velocity,
        startTime: performance.now(),
        duration: 2000
      });

      this.terrainGroup.add(mesh);
    }
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    this.collisionMountains.forEach((m, index) => {
      const elapsed = now - m.startTime;
      const t = Math.min(elapsed / m.duration, 1);
      const color = m.startColor.clone().lerp(m.endColor, t);
      (m.mesh.material as THREE.MeshPhongMaterial).color.copy(color);
      if (t >= 1) {
        this.collisionMountains.splice(index, 1);
        this.mountains.push(m);
      }
    });

    for (let i = this.magmaColumns.length - 1; i >= 0; i--) {
      const magma = this.magmaColumns[i];
      const elapsed = now - magma.startTime;
      const t = elapsed / magma.duration;

      if (t < 1) {
        const riseT = Math.min(t * 2, 1);
        const riseEased = 1 - Math.pow(1 - riseT, 3);
        magma.mesh.position.y = -80 + riseEased * 83;

        const fadeStart = 0.3;
        if (t > fadeStart) {
          const fadeT = (t - fadeStart) / (1 - fadeStart);
          (magma.mesh.material as THREE.MeshPhongMaterial).opacity = 0.8 - fadeT * 0.6;
        }
      } else if (!magma.cooledRock) {
        magma.cooledRock = this.createCooledRock(magma.mesh.position.clone());
        this.terrainGroup.remove(magma.mesh);
        magma.mesh.geometry.dispose();
        (magma.mesh.material as THREE.Material).dispose();
      } else if (t > 1.5) {
        this.magmaColumns.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const elapsed = now - p.startTime;
      const t = elapsed / p.duration;

      if (t >= 1) {
        this.terrainGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 20 * deltaTime;
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      const scale = 1 - t * 0.5;
      p.mesh.scale.setScalar(scale);
    }

    this.oceans.forEach(ocean => {
      const material = ocean.mesh.material as THREE.MeshPhongMaterial;
      material.opacity = 0.5 + Math.sin(now * 0.001) * 0.1;
    });
  }

  private createCooledRock(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(4, 6, 10, 12);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      positions.setX(i, x + (Math.random() - 0.5) * 1.5);
      positions.setY(i, y + (Math.random() - 0.5) * 1);
      positions.setZ(i, z + (Math.random() - 0.5) * 1.5);
    }
    geometry.computeVertexNormals();

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 300; i++) {
      const gray = Math.floor(Math.random() * 60);
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * 256,
        Math.random() * 256,
        Math.random() * 8 + 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      color: 0x222222,
      flatShading: true,
      shininess: 5
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = 5;
    mesh.castShadow = true;

    mesh.scale.set(0.01, 0.01, 0.01);
    this.animateScale(mesh, 1.0, 500);

    this.terrainGroup.add(mesh);
    return mesh;
  }

  public getTerrainMeshes(): THREE.Object3D[] {
    return this.terrainGroup.children;
  }

  public clearAll(): void {
    while (this.terrainGroup.children.length > 0) {
      const child = this.terrainGroup.children[0];
      this.terrainGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.mountains = [];
    this.collisionMountains = [];
    this.magmaColumns = [];
    this.particles = [];
    this.oceans = [];
    this.generatedTerrainMarkers.clear();
  }
}
