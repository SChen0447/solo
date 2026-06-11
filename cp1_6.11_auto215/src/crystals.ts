import * as THREE from 'three';
import { gsap } from 'gsap';
import { rand, randInt, pick, clamp, lerp, hexToRgb, rgbToHex } from './utils';
import { LightSystem } from './lights';

export type CrystalType = 'fluorite' | 'calcite' | 'amethyst';

export interface CrystalInfo {
  name: string;
  nameEn: string;
  crystalSystem: string;
  hardness: string;
  fluorescence: string;
  fluorescenceName: string;
  baseColor: string;
  highlightColor: string;
  positions: { x: number; y: number; z: number };
}

export const CRYSTAL_INFO: Record<CrystalType, CrystalInfo> = {
  fluorite: {
    name: '萤石',
    nameEn: 'Fluorite',
    crystalSystem: '等轴晶系',
    hardness: '4',
    fluorescence: '#8e44ad',
    fluorescenceName: '蓝紫',
    baseColor: '#7dcea0',
    highlightColor: '#abebc6',
    positions: { x: -7, y: 0, z: -2 }
  },
  calcite: {
    name: '方解石',
    nameEn: 'Calcite',
    crystalSystem: '三方晶系',
    hardness: '3',
    fluorescence: '#f4d03f',
    fluorescenceName: '金黄',
    baseColor: '#fdebd0',
    highlightColor: '#fef9e7',
    positions: { x: 0, y: -0.5, z: -3 }
  },
  amethyst: {
    name: '紫晶',
    nameEn: 'Amethyst',
    crystalSystem: '三方晶系',
    hardness: '7',
    fluorescence: '#af7ac5',
    fluorescenceName: '淡紫',
    baseColor: '#bb8fce',
    highlightColor: '#d2b4de',
    positions: { x: 7, y: 0.3, z: -2 }
  }
};

export interface CrystalMeshData {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  growthRings: THREE.Mesh[];
  inclusionsCanvas?: HTMLCanvasElement;
  inclusionsTexture?: THREE.CanvasTexture;
  inclusionPoints: { x: number; y: number; opacity: number; phase: number }[];
  size: number;
}

export class CrystalCluster {
  public type: CrystalType;
  public info: CrystalInfo;
  public group: THREE.Group;
  public crystals: CrystalMeshData[] = [];
  public isHovered: boolean = false;
  public isRotating: boolean = false;
  public isFocused: boolean = false;
  public scanCanvas?: HTMLCanvasElement;
  public scanTexture?: THREE.CanvasTexture;
  public scanMesh?: THREE.Mesh;
  public highlightStainColor: string | null = null;

  private scene: THREE.Scene;
  private lightSystem: LightSystem;
  private hoverTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private scanAnimationId: number | null = null;
  private currentScanY: number = 0;

  constructor(type: CrystalType, scene: THREE.Scene, lightSystem: LightSystem) {
    this.type = type;
    this.info = CRYSTAL_INFO[type];
    this.scene = scene;
    this.lightSystem = lightSystem;
    this.group = new THREE.Group();
    this.group.position.set(this.info.positions.x, this.info.positions.y, this.info.positions.z);
    this.createCluster();
    this.createScanLineOverlay();
    this.scene.add(this.group);
  }

  private createCrystalGeometry(type: CrystalType, size: number): THREE.BufferGeometry {
    switch (type) {
      case 'fluorite':
        return new THREE.OctahedronGeometry(size, 0);
      case 'calcite': {
        const geo = new THREE.ConeGeometry(size * 0.7, size * 1.8, 6, 1);
        const matrix = new THREE.Matrix4().makeTranslation(0, size * 0.4, 0);
        geo.applyMatrix4(matrix);
        return geo;
      }
      case 'amethyst': {
        const geo = new THREE.CylinderGeometry(size * 0.4, size * 0.55, size * 1.6, 6, 1);
        const topGeo = new THREE.ConeGeometry(size * 0.55, size * 0.6, 6, 1);
        const matrix = new THREE.Matrix4().makeTranslation(0, size * 1.1, 0);
        topGeo.applyMatrix4(matrix);
        const merged = THREE.BufferGeometryUtils
          ? (THREE as any).BufferGeometryUtils.mergeGeometries([geo, topGeo])
          : this.mergeGeometries(geo, topGeo);
        return merged;
      }
      default:
        return new THREE.OctahedronGeometry(size, 0);
    }
  }

  private mergeGeometries(g1: THREE.BufferGeometry, g2: THREE.BufferGeometry): THREE.BufferGeometry {
    const attributes1 = g1.attributes;
    const attributes2 = g2.attributes;
    const mergedPosition: number[] = [];
    const mergedNormal: number[] = [];
    const mergedUv: number[] = [];
    const mergedIndex: number[] = [];

    const pushAttr = (src: THREE.BufferGeometry, offset: number) => {
      const pos = src.attributes.position.array as Float32Array;
      const nor = src.attributes.normal.array as Float32Array;
      const uv = src.attributes.uv ? (src.attributes.uv.array as Float32Array) : null;
      const idx = src.index ? (src.index.array as Uint32Array) : null;

      for (let i = 0; i < pos.length; i++) mergedPosition.push(pos[i]);
      for (let i = 0; i < nor.length; i++) mergedNormal.push(nor[i]);
      if (uv) { for (let i = 0; i < uv.length; i++) mergedUv.push(uv[i]); }
      else {
        const vertCount = pos.length / 3;
        for (let i = 0; i < vertCount; i++) { mergedUv.push(0, 0); }
      }
      if (idx) {
        for (let i = 0; i < idx.length; i++) mergedIndex.push(idx[i] + offset);
      } else {
        const vertCount = pos.length / 3;
        for (let i = 0; i < vertCount; i++) mergedIndex.push(i + offset);
      }
    };

    const offset1 = (attributes1.position.array as Float32Array).length / 3;
    pushAttr(g1, 0);
    pushAttr(g2, offset1);

    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(mergedPosition, 3));
    result.setAttribute('normal', new THREE.Float32BufferAttribute(mergedNormal, 3));
    result.setAttribute('uv', new THREE.Float32BufferAttribute(mergedUv, 2));
    result.setIndex(mergedIndex);
    return result;
  }

  private createInclusionsTexture(size: number): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; points: { x: number; y: number; opacity: number; phase: number }[] } {
    const canvas = document.createElement('canvas');
    const texSize = 256;
    canvas.width = texSize;
    canvas.height = texSize;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, texSize, texSize);

    const points: { x: number; y: number; opacity: number; phase: number }[] = [];
    const numInclusions = randInt(10, 15);

    for (let i = 0; i < numInclusions; i++) {
      const startX = rand(20, texSize - 20);
      const startY = rand(20, texSize - 20);
      const endX = startX + rand(-60, 60);
      const endY = startY + rand(-60, 60);
      const opacity = rand(0.3, 0.6);
      const phase = rand(0, Math.PI * 2);
      points.push({ x: (startX + endX) / 2 / texSize, y: (startY + endY) / 2 / texSize, opacity, phase });

      const cp1x = startX + rand(-30, 30);
      const cp1y = startY + rand(-20, 20);
      const cp2x = endX + rand(-30, 30);
      const cp2y = endY + rand(-20, 20);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = rand(0.5, 1.5);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return { canvas, texture, points };
  }

  private createGrowthRings(size: number, position: THREE.Vector3, rotation: THREE.Euler): THREE.Mesh[] {
    const rings: THREE.Mesh[] = [];
    const numRings = randInt(4, 7);
    const ringColors = ['#c39bd3', '#aed6f1'];

    for (let i = 0; i < numRings; i++) {
      const ringScale = 1 - (i + 1) * 0.12;
      const ringSize = size * ringScale;
      let ringGeo: THREE.BufferGeometry;

      if (this.type === 'fluorite') {
        ringGeo = new THREE.OctahedronGeometry(ringSize, 0);
      } else if (this.type === 'calcite') {
        ringGeo = new THREE.ConeGeometry(ringSize * 0.7, ringSize * 1.8, 6, 1);
        const matrix = new THREE.Matrix4().makeTranslation(0, ringSize * 0.4, 0);
        ringGeo.applyMatrix4(matrix);
      } else {
        ringGeo = new THREE.CylinderGeometry(ringSize * 0.4, ringSize * 0.55, ringSize * 1.6, 6, 1);
      }

      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColors[i % 2],
        transparent: true,
        opacity: 0,
        wireframe: true,
        side: THREE.DoubleSide
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(position);
      ringMesh.rotation.copy(rotation);
      ringMesh.visible = false;
      rings.push(ringMesh);
      this.group.add(ringMesh);
    }
    return rings;
  }

  private createCluster(): void {
    const crystalCount = randInt(6, 10);
    const baseRgb = hexToRgb(this.info.baseColor);
    const highlightRgb = hexToRgb(this.info.highlightColor);

    for (let i = 0; i < crystalCount; i++) {
      const size = rand(0.8, 3.5);
      const t = i / crystalCount;

      const angle = t * Math.PI * 2 + rand(-0.4, 0.4);
      const radius = rand(0.5, 1.8);
      const posX = Math.cos(angle) * radius;
      const posY = rand(-1.5, 1.5) + size * 0.2;
      const posZ = Math.sin(angle) * radius;

      const rotX = rand(-0.3, 0.3);
      const rotY = rand(0, Math.PI * 2);
      const rotZ = rand(-0.2, 0.2);

      const geometry = this.createCrystalGeometry(this.type, size);

      const colorMix = rand(0, 1);
      const crystalColor = rgbToHex(
        lerp(baseRgb.r, highlightRgb.r, colorMix),
        lerp(baseRgb.g, highlightRgb.g, colorMix),
        lerp(baseRgb.b, highlightRgb.b, colorMix)
      );

      const { canvas: incCanvas, texture: incTexture, points: incPoints } = this.createInclusionsTexture(size);

      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(crystalColor),
        metalness: 0.05,
        roughness: 0.15,
        transmission: 0.75,
        thickness: 1.2,
        transparent: true,
        opacity: 0.78,
        ior: 1.45,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.2,
        alphaMap: incTexture,
        alphaTest: 0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(posX, posY, posZ);
      mesh.rotation.set(rotX, rotY, rotZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      (mesh as any).userData = { cluster: this, crystalIndex: i, baseColor: crystalColor };

      const glowGeometry = geometry.clone();
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(this.info.fluorescence) },
          viewVector: { value: new THREE.Vector3(0, 0, 1) },
          glowIntensity: { value: 0.0 }
        },
        vertexShader: `
          uniform vec3 viewVector;
          varying float intensity;
          void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vNormel = normalize(normalMatrix * viewVector);
            intensity = pow(0.6 - dot(vNormal, vNormel), 2.5);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float glowIntensity;
          varying float intensity;
          void main() {
            vec3 glow = glowColor * intensity * glowIntensity;
            float alpha = intensity * glowIntensity * 0.8;
            gl_FragColor = vec4(glow, alpha);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      });

      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(mesh.position);
      glowMesh.rotation.copy(mesh.rotation);
      glowMesh.scale.multiplyScalar(1.12);
      (glowMesh as any).userData = { isGlow: true };

      const growthRings = this.createGrowthRings(
        size,
        new THREE.Vector3(posX, posY, posZ),
        new THREE.Euler(rotX, rotY, rotZ)
      );

      this.crystals.push({
        mesh,
        glowMesh,
        growthRings,
        inclusionsCanvas: incCanvas,
        inclusionsTexture: incTexture,
        inclusionPoints: incPoints,
        size
      });

      this.group.add(mesh);
      this.group.add(glowMesh);
    }
  }

  private createScanLineOverlay(): void {
    this.scanCanvas = document.createElement('canvas');
    this.scanCanvas.width = 512;
    this.scanCanvas.height = 512;
    this.scanTexture = new THREE.CanvasTexture(this.scanCanvas);

    const planeGeo = new THREE.PlaneGeometry(6, 6, 1, 1);
    const planeMat = new THREE.MeshBasicMaterial({
      map: this.scanTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.scanMesh = new THREE.Mesh(planeGeo, planeMat);
    this.scanMesh.position.z = 0.5;
    this.scanMesh.visible = false;
    this.group.add(this.scanMesh);
  }

  private drawScanLine(progress: number): void {
    if (!this.scanCanvas || !this.scanTexture) return;
    const ctx = this.scanCanvas.getContext('2d')!;
    const w = this.scanCanvas.width;
    const h = this.scanCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const y = progress * h;
    const scanWidth = 3 * (w / 100);

    const gradient = ctx.createLinearGradient(0, y - 80, 0, y + 80);
    gradient.addColorStop(0, 'rgba(93, 173, 226, 0)');
    gradient.addColorStop(0.4, 'rgba(93, 173, 226, 0.15)');
    gradient.addColorStop(0.48, 'rgba(174, 214, 241, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.52, 'rgba(174, 214, 241, 0.8)');
    gradient.addColorStop(0.6, 'rgba(93, 173, 226, 0.15)');
    gradient.addColorStop(1, 'rgba(93, 173, 226, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 80, w, 160);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - scanWidth / 2, y - 60, scanWidth, 120);

    ctx.strokeStyle = 'rgba(244, 208, 63, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();

    this.scanTexture.needsUpdate = true;
  }

  public startScanAnimation(): void {
    if (!this.scanMesh) return;
    this.stopScanAnimation();
    this.scanMesh.visible = true;

    const startTime = Date.now();
    const duration = 1500;
    const scanCycles = 1;
    (this.scanMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    gsap.to((this.scanMesh.material as THREE.MeshBasicMaterial), { opacity: 0.85, duration: 0.2 });

    const animate = () => {
      const elapsed = Date.now() - startTime;
      let t = (elapsed % duration) / duration;
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.drawScanLine(easeT);

      const totalProgress = elapsed / (duration * scanCycles);
      if (totalProgress < 1) {
        this.scanAnimationId = requestAnimationFrame(animate);
      } else {
        this.stopScanAnimation();
      }
    };
    animate();
  }

  public stopScanAnimation(): void {
    if (this.scanAnimationId !== null) {
      cancelAnimationFrame(this.scanAnimationId);
      this.scanAnimationId = null;
    }
    if (this.scanMesh) {
      gsap.to((this.scanMesh.material as THREE.MeshBasicMaterial), {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          if (this.scanMesh) this.scanMesh.visible = false;
        }
      });
    }
    if (this.scanCanvas) {
      const ctx = this.scanCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, this.scanCanvas.width, this.scanCanvas.height);
    }
  }

  public onHover(enter: boolean): void {
    if (enter) {
      if (this.hoverTimeoutId) clearTimeout(this.hoverTimeoutId);
      this.hoverTimeoutId = setTimeout(() => {
        this.isHovered = true;
        this.startScanAnimation();
        this.setGlowIntensity(0.6, 0.3);
      }, 300);
    } else {
      if (this.hoverTimeoutId) {
        clearTimeout(this.hoverTimeoutId);
        this.hoverTimeoutId = null;
      }
      this.isHovered = false;
      this.stopScanAnimation();
      this.setGlowIntensity(this.isFocused ? 0.35 : 0.15, 0.4);
    }
  }

  public setGlowIntensity(target: number, duration: number = 0.5): void {
    this.crystals.forEach((c, idx) => {
      const mat = c.glowMesh.material as THREE.ShaderMaterial;
      const delay = idx * 0.03;
      gsap.to(mat.uniforms.glowIntensity, {
        value: target,
        duration: duration,
        delay: delay,
        ease: 'power2.out'
      });
    });
  }

  public startRotation(): void {
    if (this.isRotating) return;
    this.isRotating = true;

    this.crystals.forEach(c => {
      c.growthRings.forEach((ring, idx) => {
        ring.visible = true;
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        gsap.to(ringMat, {
          opacity: 0.15 + idx * 0.03,
          duration: 0.4,
          delay: idx * 0.05
        });
      });
    });

    gsap.to(this.group.rotation, {
      y: this.group.rotation.y + Math.PI * 2,
      duration: 3,
      ease: 'power2.inOut',
      onComplete: () => {
        this.isRotating = false;
        this.crystals.forEach(c => {
          c.growthRings.forEach((ring, idx) => {
            const ringMat = ring.material as THREE.MeshBasicMaterial;
            gsap.to(ringMat, {
              opacity: 0,
              duration: 0.5,
              delay: idx * 0.03,
              onComplete: () => { ring.visible = false; }
            });
          });
        });
      }
    });

    this.lightSystem.pulseSpectrum(2500);
  }

  public setFocused(focused: boolean, onComplete?: () => void): void {
    this.isFocused = focused;
    if (focused) {
      this.setGlowIntensity(0.45, 0.6);
      this.crystals.forEach(c => {
        gsap.to(c.mesh.material as THREE.MeshPhysicalMaterial, {
          transmission: 0.85,
          opacity: 0.85,
          duration: 0.8,
          ease: 'power2.inOut'
        });
      });
    } else {
      this.setGlowIntensity(0.15, 0.6);
      this.crystals.forEach(c => {
        gsap.to(c.mesh.material as THREE.MeshPhysicalMaterial, {
          transmission: 0.75,
          opacity: 0.78,
          duration: 0.8,
          ease: 'power2.inOut',
          onComplete: () => { onComplete?.(); }
        });
      });
    }
  }

  public setStainColor(colorHex: string | null): void {
    this.highlightStainColor = colorHex;
    this.crystals.forEach(c => {
      const mat = c.mesh.material as THREE.MeshPhysicalMaterial;
      if (colorHex) {
        gsap.to(mat.color, {
          r: new THREE.Color(colorHex).r,
          g: new THREE.Color(colorHex).g,
          b: new THREE.Color(colorHex).b,
          duration: 0.4,
          ease: 'power2.out'
        });
      } else {
        const originalColor = (c.mesh as any).userData.baseColor || this.info.baseColor;
        const col = new THREE.Color(originalColor);
        gsap.to(mat.color, {
          r: col.r, g: col.g, b: col.b,
          duration: 0.6,
          ease: 'power2.out'
        });
      }
    });
  }

  public updateInclusions(time: number): void {
    this.crystals.forEach(c => {
      if (!c.inclusionsCanvas || !c.inclusionsTexture || !this.isFocused) return;
      const ctx = c.inclusionsCanvas.getContext('2d')!;
      const w = c.inclusionsCanvas.width;
      const h = c.inclusionsCanvas.height;
      ctx.clearRect(0, 0, w, h);

      c.inclusionPoints.forEach(point => {
        const flickerOpacity = point.opacity * (0.6 + 0.4 * Math.sin(time * 2 + point.phase));
        const px = point.x * w;
        const py = point.y * h;

        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flickerOpacity})`;
        ctx.fill();
      });

      c.inclusionsTexture.needsUpdate = true;
    });
  }

  public update(delta: number, time: number, camera: THREE.Camera): void {
    this.crystals.forEach(c => {
      const mat = c.glowMesh.material as THREE.ShaderMaterial;
      const viewVec = new THREE.Vector3().subVectors(
        camera.position,
        c.glowMesh.getWorldPosition(new THREE.Vector3())
      ).normalize();
      mat.uniforms.viewVector.value.copy(viewVec);
    });
    this.updateInclusions(time);
  }

  public getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.crystals.forEach(c => meshes.push(c.mesh));
    return meshes;
  }

  public dispose(): void {
    this.stopScanAnimation();
    if (this.hoverTimeoutId) clearTimeout(this.hoverTimeoutId);
    this.crystals.forEach(c => {
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.Material).dispose();
      c.glowMesh.geometry.dispose();
      (c.glowMesh.material as THREE.Material).dispose();
      c.growthRings.forEach(r => {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      });
      c.inclusionsTexture?.dispose();
    });
    this.scanTexture?.dispose();
    this.scene.remove(this.group);
  }
}

export class CrystalManager {
  private scene: THREE.Scene;
  private lightSystem: LightSystem;
  public clusters: Map<CrystalType, CrystalCluster> = new Map();
  private currentFocused: CrystalType | null = null;

  constructor(scene: THREE.Scene, lightSystem: LightSystem) {
    this.scene = scene;
    this.lightSystem = lightSystem;
    this.init();
  }

  private init(): void {
    const types: CrystalType[] = ['fluorite', 'calcite', 'amethyst'];
    types.forEach(type => {
      this.clusters.set(type, new CrystalCluster(type, this.scene, this.lightSystem));
    });
  }

  public getCluster(type: CrystalType): CrystalCluster | undefined {
    return this.clusters.get(type);
  }

  public getClusterByMesh(mesh: THREE.Mesh): CrystalCluster | undefined {
    for (const cluster of this.clusters.values()) {
      if (cluster.getAllMeshes().includes(mesh)) {
        return cluster;
      }
    }
    return undefined;
  }

  public getClusterByType(type: CrystalType): CrystalCluster | undefined {
    return this.clusters.get(type);
  }

  public focusCamera(type: CrystalType, camera: THREE.PerspectiveCamera, onComplete?: () => void): void {
    if (this.currentFocused) {
      const prevCluster = this.clusters.get(this.currentFocused);
      prevCluster?.setFocused(false);
    }
    this.currentFocused = type;
    const cluster = this.clusters.get(type);
    if (!cluster) return;

    const targetPos = cluster.group.position.clone();
    const camTarget = new THREE.Vector3(
      targetPos.x,
      targetPos.y + 0.5,
      targetPos.z + 5
    );

    gsap.to(camera.position, {
      x: camTarget.x, y: camTarget.y, z: camTarget.z,
      duration: 0.8,
      ease: 'power2.inOut'
    });

    gsap.to({ dummy: 0 }, {
      dummy: 1,
      duration: 0.4,
      delay: 0.3,
      onComplete: () => {
        cluster.setFocused(true, onComplete);
        this.lightSystem.pulseSpectrum(1500);
      }
    });
  }

  public resetCamera(camera: THREE.PerspectiveCamera, originalPos: THREE.Vector3): void {
    if (this.currentFocused) {
      const cluster = this.clusters.get(this.currentFocused);
      cluster?.setFocused(false);
      this.currentFocused = null;
    }
    gsap.to(camera.position, {
      x: originalPos.x, y: originalPos.y, z: originalPos.z,
      duration: 0.8,
      ease: 'power2.inOut'
    });
  }

  public getCurrentFocused(): CrystalType | null {
    return this.currentFocused;
  }

  public getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.clusters.forEach(c => meshes.push(...c.getAllMeshes()));
    return meshes;
  }

  public update(delta: number, time: number, camera: THREE.Camera): void {
    this.clusters.forEach(c => c.update(delta, time, camera));
  }

  public dispose(): void {
    this.clusters.forEach(c => c.dispose());
    this.clusters.clear();
  }
}
