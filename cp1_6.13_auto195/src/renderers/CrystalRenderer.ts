import * as THREE from 'three';
import { gsap } from 'gsap';
import { CrystalCaveData, CrystalData } from '../data/CrystalCaveData';

interface CrystalMeshGroup {
  group: THREE.Group;
  crystal: THREE.Mesh;
  baseGlow: THREE.Mesh;
  data: CrystalData;
}

interface ShatterFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  duration: number;
}

export class CrystalRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private data: CrystalCaveData;

  private wallMesh: THREE.Mesh | null = null;
  private crystalGroups: CrystalMeshGroup[] = [];
  private shatterFragments: ShatterFragment[] = [];
  private fireflyMeshes: THREE.Points | null = null;
  private particleMeshes: THREE.Points | null = null;
  private mouseIndicator: THREE.Mesh | null = null;

  private ambientLight: THREE.AmbientLight | null = null;
  private pointLight: THREE.PointLight | null = null;

  private hexGeometryCache: {
    hexagonal: THREE.CylinderGeometry;
    octahedron: THREE.OctahedronGeometry;
  } | null = null;

  private maxShatterGeometries: THREE.BufferGeometry[] = [];

  private fireflyPositions: Float32Array;
  private fireflyColors: Float32Array;
  private fireflySizes: Float32Array;

  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    data: CrystalCaveData
  ) {
    this.scene = scene;
    this.camera = camera;
    this.data = data;

    this.fireflyPositions = new Float32Array(this.data.fireflyCount * 3);
    this.fireflyColors = new Float32Array(this.data.fireflyCount * 3);
    this.fireflySizes = new Float32Array(this.data.fireflyCount);

    this.particlePositions = new Float32Array(this.data.maxParticles * 3);
    this.particleColors = new Float32Array(this.data.maxParticles * 3);
    this.particleSizes = new Float32Array(this.data.maxParticles);
  }

  public initScene(): void {
    this.setupLights();
    this.createWall();
    this.createGeometriesCache();
    this.createCrystals();
    this.createFireflies();
    this.createParticles();
    this.createMouseIndicator();
    this.setupFog();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x4488aa, 0.3);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xffffff, 1, 20, 1.5);
    this.pointLight.position.set(0, 2, 0);
    this.scene.add(this.pointLight);

    const fillLight = new THREE.PointLight(0x00bfff, 0.4, 15, 2);
    fillLight.position.set(0, -2, 0);
    this.scene.add(fillLight);
  }

  private setupFog(): void {
    this.scene.fog = new THREE.FogExp2(0x05050a, 0.06);
  }

  private createWall(): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.data.wallVertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(this.data.wallNormals, 3));
    geometry.setIndex(new THREE.BufferAttribute(this.data.wallIndices, 1));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      transparent: true,
      opacity: 0.7,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.BackSide,
      emissive: 0x0a1520,
      emissiveIntensity: 0.1
    });

    this.wallMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.wallMesh);

    this.createWallTextureNoise();
  }

  private createWallTextureNoise(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(512, 512);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random();
      const gray = 40 + Math.floor(noise * 30);
      imageData.data[i] = gray;
      imageData.data[i + 1] = gray + 10;
      imageData.data[i + 2] = gray + 20;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    if (this.wallMesh) {
      const mat = this.wallMesh.material as THREE.MeshStandardMaterial;
      mat.map = texture;
      mat.needsUpdate = true;
    }
  }

  private createGeometriesCache(): void {
    this.hexGeometryCache = {
      hexagonal: new THREE.CylinderGeometry(1, 0.6, 2, 6, 1),
      octahedron: new THREE.OctahedronGeometry(1, 0)
    };

    for (let i = 0; i < 20; i++) {
      const fragGeo = new THREE.TetrahedronGeometry(0.2 + Math.random() * 0.3);
      this.maxShatterGeometries.push(fragGeo);
    }
  }

  private createCrystals(): void {
    for (const crystalData of this.data.crystals) {
      const group = new THREE.Group();

      const crystalMesh = this.createCrystalMesh(crystalData);
      group.add(crystalMesh);

      const baseGlow = this.createCrystalBase(crystalData);
      group.add(baseGlow);

      group.position.copy(crystalData.position);
      group.rotation.copy(crystalData.rotation);
      const s = crystalData.growthProgress;
      group.scale.set(
        crystalData.scale.x * s,
        crystalData.scale.y * s,
        crystalData.scale.z * s
      );

      this.scene.add(group);

      this.crystalGroups.push({
        group,
        crystal: crystalMesh,
        baseGlow,
        data: crystalData
      });
    }
  }

  private createCrystalMesh(crystalData: CrystalData): THREE.Mesh {
    let geometry: THREE.BufferGeometry;

    if (crystalData.crystalType === 'hexagonal') {
      geometry = this.hexGeometryCache!.hexagonal;
    } else {
      geometry = this.hexGeometryCache!.octahedron;
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: crystalData.currentColor,
      metalness: 0.2,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: crystalData.currentColor,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private createCrystalBase(crystalData: CrystalData): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: crystalData.currentColor,
      transparent: true,
      opacity: 0.8
    });
    return new THREE.Mesh(geometry, material);
  }

  private createFireflies(): void {
    const geometry = new THREE.BufferGeometry();

    for (let i = 0; i < this.data.fireflyCount; i++) {
      this.fireflyPositions[i * 3] = this.data.fireflies[i].position.x;
      this.fireflyPositions[i * 3 + 1] = this.data.fireflies[i].position.y;
      this.fireflyPositions[i * 3 + 2] = this.data.fireflies[i].position.z;

      this.fireflyColors[i * 3] = this.data.fireflies[i].color.r;
      this.fireflyColors[i * 3 + 1] = this.data.fireflies[i].color.g;
      this.fireflyColors[i * 3 + 2] = this.data.fireflies[i].color.b;

      this.fireflySizes[i] = this.data.fireflies[i].scale;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.fireflyPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.fireflyColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.fireflyMeshes = new THREE.Points(geometry, material);
    this.scene.add(this.fireflyMeshes);
  }

  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particleMeshes = new THREE.Points(geometry, material);
    this.scene.add(this.particleMeshes);
  }

  private createMouseIndicator(): void {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5
    });
    this.mouseIndicator = new THREE.Mesh(geometry, material);
    this.mouseIndicator.visible = false;
    this.scene.add(this.mouseIndicator);
  }

  public getWallMesh(): THREE.Mesh | null {
    return this.wallMesh;
  }

  public updateCrystals(data: CrystalCaveData): void {
    for (const group of this.crystalGroups) {
      const crystalData = group.data;

      if (crystalData.affectedByMouse && !crystalData.isShattered) {
        const bendDir = data.calculateBendDirection(crystalData);
        if (bendDir) {
          this.applyBendAnimation(group, bendDir);
          this.applyGrowthAnimation(group);
          this.applyColorShiftAnimation(group);
        }
      } else if (!crystalData.affectedByMouse && !crystalData.isShattered) {
        this.resetCrystalRotation(group);
      }

      if (crystalData.isShattered) {
        this.shatterCrystal(group);
      }

      if (!crystalData.isShattered) {
        const growthS = crystalData.growthProgress;
        gsap.to(group.group.scale, {
          x: crystalData.scale.x * growthS,
          y: crystalData.scale.y * growthS,
          z: crystalData.scale.z * growthS,
          duration: 0.1,
          ease: 'power1.out'
        });

        const mat = group.crystal.material as THREE.MeshPhysicalMaterial;
        mat.color.copy(crystalData.currentColor);
        mat.emissive.copy(crystalData.currentColor);
        (group.baseGlow.material as THREE.MeshBasicMaterial).color.copy(crystalData.currentColor);

        group.group.visible = true;
      }
    }

    this.updateShatterFragments();
  }

  private applyBendAnimation(group: CrystalMeshGroup, bendDir: THREE.Vector3): void {
    const maxAngle = 15 * Math.PI / 180;

    const targetRotX = group.data.baseRotation.x + bendDir.y * maxAngle;
    const targetRotZ = group.data.baseRotation.z - bendDir.x * maxAngle * 0.5;

    gsap.to(group.group.rotation, {
      x: targetRotX,
      z: targetRotZ,
      duration: 0.3,
      ease: 'back.out(2)',
      overwrite: true
    });
  }

  private applyGrowthAnimation(group: CrystalMeshGroup): void {
    group.data.targetGrowthProgress = 1.0;
  }

  private applyColorShiftAnimation(group: CrystalMeshGroup): void {
    const targetColor = this.data.getHueShiftedColor(group.data.baseColor, 1.0);

    gsap.to(group.data.currentColor, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        const mat = group.crystal.material as THREE.MeshPhysicalMaterial;
        mat.color.copy(group.data.currentColor);
        mat.emissive.copy(group.data.currentColor);
        (group.baseGlow.material as THREE.MeshBasicMaterial).color.copy(group.data.currentColor);
      }
    });
  }

  private resetCrystalRotation(group: CrystalMeshGroup): void {
    gsap.to(group.group.rotation, {
      x: group.data.baseRotation.x,
      z: group.data.baseRotation.z,
      duration: 0.3,
      ease: 'power2.out'
    });

    gsap.to(group.data.currentColor, {
      r: group.data.baseColor.r,
      g: group.data.baseColor.g,
      b: group.data.baseColor.b,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        const mat = group.crystal.material as THREE.MeshPhysicalMaterial;
        mat.color.copy(group.data.currentColor);
        mat.emissive.copy(group.data.currentColor);
        (group.baseGlow.material as THREE.MeshBasicMaterial).color.copy(group.data.currentColor);
      }
    });
  }

  private shatterCrystal(group: CrystalMeshGroup): void {
    if (!group.group.visible) return;

    const fragmentCount = 8 + Math.floor(Math.random() * 5);
    const color = group.data.currentColor;
    const basePos = group.data.position;

    for (let i = 0; i < fragmentCount; i++) {
      const geoIdx = Math.floor(Math.random() * this.maxShatterGeometries.length);
      const fragGeo = this.maxShatterGeometries[geoIdx];
      const fragMat = new THREE.MeshPhysicalMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(fragGeo, fragMat);
      mesh.position.copy(basePos);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      const scale = 0.1 + Math.random() * 0.15;
      mesh.scale.set(scale, scale, scale);

      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.0 + Math.random() * 2.0;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(angle) * speed,
        Math.cos(phi) * speed + 0.5,
        Math.sin(phi) * Math.sin(angle) * speed
      );

      this.scene.add(mesh);

      this.shatterFragments.push({
        mesh,
        velocity,
        startTime: performance.now(),
        duration: 2000
      });

      gsap.to(mesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 2.0,
        ease: 'power2.out'
      });

      gsap.to(mesh.rotation, {
        x: mesh.rotation.x + Math.PI * 3,
        y: mesh.rotation.y + Math.PI * 2,
        z: mesh.rotation.z + Math.PI,
        duration: 2.0,
        ease: 'power1.out'
      });

      gsap.to(fragMat, {
        opacity: 0,
        duration: 2.0,
        ease: 'power2.in'
      });
    }

    group.group.visible = false;
  }

  private updateShatterFragments(): void {
    const now = performance.now();
    const gravity = -2.0;

    for (let i = this.shatterFragments.length - 1; i >= 0; i--) {
      const frag = this.shatterFragments[i];
      const elapsed = now - frag.startTime;
      const dt = 1 / 60;

      if (elapsed >= frag.duration) {
        this.scene.remove(frag.mesh);
        frag.mesh.geometry.dispose();
        (frag.mesh.material as THREE.Material).dispose();
        this.shatterFragments.splice(i, 1);
        continue;
      }

      frag.velocity.y += gravity * dt;
      frag.mesh.position.x += frag.velocity.x * dt;
      frag.mesh.position.y += frag.velocity.y * dt;
      frag.mesh.position.z += frag.velocity.z * dt;
    }
  }

  public updateWall(data: CrystalCaveData): void {
    if (this.mouseIndicator) {
      if (data.mouseIntersection) {
        this.mouseIndicator.position.copy(data.mouseIntersection);
        this.mouseIndicator.visible = true;
        const scale = 1 + Math.sin(performance.now() * 0.005) * 0.2;
        this.mouseIndicator.scale.set(scale, scale, scale);
      } else {
        this.mouseIndicator.visible = false;
      }
    }
  }

  public emitParticles(position: THREE.Vector3, color: THREE.Color): void {
    const count = 20;
    for (let i = 0; i < count && this.data.particles.length < this.data.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.5 + Math.random() * 1.0;

      this.data.particles.push({
        id: Math.random(),
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(angle) * speed,
          Math.cos(phi) * speed,
          Math.sin(phi) * Math.sin(angle) * speed
        ),
        color: color.clone(),
        life: 1.5,
        maxLife: 1.5,
        scale: 0.04 + Math.random() * 0.04
      });
    }
  }

  public updateFirefliesRender(): void {
    if (!this.fireflyMeshes) return;

    const positions = this.fireflyMeshes.geometry.attributes.position.array as Float32Array;
    const colors = this.fireflyMeshes.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < this.data.fireflies.length; i++) {
      const firefly = this.data.fireflies[i];
      positions[i * 3] = firefly.position.x;
      positions[i * 3 + 1] = firefly.position.y;
      positions[i * 3 + 2] = firefly.position.z;

      const flicker = 0.7 + Math.sin(performance.now() * 0.003 + i) * 0.3;
      colors[i * 3] = firefly.color.r * flicker;
      colors[i * 3 + 1] = firefly.color.g * flicker;
      colors[i * 3 + 2] = firefly.color.b * flicker;
    }

    this.fireflyMeshes.geometry.attributes.position.needsUpdate = true;
    this.fireflyMeshes.geometry.attributes.color.needsUpdate = true;
  }

  public updateParticlesRender(): void {
    if (!this.particleMeshes) return;

    const positions = this.particleMeshes.geometry.attributes.position.array as Float32Array;
    const colors = this.particleMeshes.geometry.attributes.color.array as Float32Array;

    const maxParticles = this.data.maxParticles;

    for (let i = 0; i < maxParticles; i++) {
      if (i < this.data.particles.length) {
        const particle = this.data.particles[i];
        const alpha = particle.life / particle.maxLife;
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        colors[i * 3] = particle.color.r * alpha;
        colors[i * 3 + 1] = particle.color.g * alpha;
        colors[i * 3 + 2] = particle.color.b * alpha;
      } else {
        positions[i * 3] = 9999;
        positions[i * 3 + 1] = 9999;
        positions[i * 3 + 2] = 9999;
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    }

    this.particleMeshes.geometry.attributes.position.needsUpdate = true;
    this.particleMeshes.geometry.attributes.color.needsUpdate = true;
  }

  public dispose(): void {
    if (this.hexGeometryCache) {
      this.hexGeometryCache.hexagonal.dispose();
      this.hexGeometryCache.octahedron.dispose();
    }
  }
}
