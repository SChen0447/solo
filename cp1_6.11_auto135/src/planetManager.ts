import * as THREE from 'three';
import gsap from 'gsap';
import atmosphereVert from './shaders/atmosphere.vert?raw';
import atmosphereFrag from './shaders/atmosphere.frag?raw';

export interface TerrainParams {
  tectonicStress: number;
  volcanicActivity: number;
  erosion: number;
}

export interface SurfacePoint {
  lat: number;
  lon: number;
  altitude: number;
  terrainType: string;
}

type NebulaUpdateCallback = () => void;

export class PlanetManager {
  private scene: THREE.Scene;
  private planetMesh: THREE.Mesh;
  private atmosphereMesh: THREE.Mesh;
  private geometry: THREE.SphereGeometry;
  private basePositions: Float32Array;
  private currentParams: TerrainParams;
  private targetParams: TerrainParams;
  private nebulaUpdateCallback: NebulaUpdateCallback | null = null;
  private seedVertices: number[];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentParams = { tectonicStress: 0, volcanicActivity: 0, erosion: 0 };
    this.targetParams = { tectonicStress: 0, volcanicActivity: 0, erosion: 0 };
    this.seedVertices = [];

    this.geometry = new THREE.SphereGeometry(1, 64, 64);
    this.basePositions = new Float32Array(this.geometry.attributes.position.array);

    const count = this.geometry.attributes.position.count;
    for (let i = 0; i < count; i++) {
      this.seedVertices.push(Math.random());
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8B7355'),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.FrontSide,
    });

    this.planetMesh = new THREE.Mesh(this.geometry, material);
    this.planetMesh.name = 'planet';
    scene.add(this.planetMesh);

    this.addBumpTexture();

    const atmosphereGeometry = new THREE.SphereGeometry(1.05, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Color('#87CEEB') },
        uIntensity: { value: 1.5 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.atmosphereMesh.name = 'atmosphere';
    scene.add(this.atmosphereMesh);
  }

  private addBumpTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.random() * 40 + 108;
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const mat = this.planetMesh.material as THREE.MeshStandardMaterial;
    mat.bumpMap = texture;
    mat.bumpScale = 0.02;
    mat.needsUpdate = true;
  }

  setNebulaUpdateCallback(cb: NebulaUpdateCallback): void {
    this.nebulaUpdateCallback = cb;
  }

  updateTectonicStress(value: number): void {
    this.targetParams.tectonicStress = value;
    this.animateTerrain();
  }

  updateVolcanicActivity(value: number): void {
    this.targetParams.volcanicActivity = value;
    this.animateTerrain();
  }

  updateErosion(value: number): void {
    this.targetParams.erosion = value;
    this.animateTerrain();
  }

  private animateTerrain(): void {
    const from = { ...this.currentParams };
    const to = { ...this.targetParams };

    gsap.to(from, {
      duration: 2,
      ease: 'power2.inOut',
      tectonicStress: to.tectonicStress,
      volcanicActivity: to.volcanicActivity,
      erosion: to.erosion,
      onUpdate: () => {
        this.currentParams.tectonicStress = from.tectonicStress;
        this.currentParams.volcanicActivity = from.volcanicActivity;
        this.currentParams.erosion = from.erosion;
        this.applyTerrainDeformation();
      },
      onComplete: () => {
        if (this.nebulaUpdateCallback) {
          this.nebulaUpdateCallback();
        }
      },
    });
  }

  private applyTerrainDeformation(): void {
    const positions = this.geometry.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];

      const r = Math.sqrt(bx * bx + by * by + bz * bz);
      const safeR = Math.max(r, 0.001);
      const nx = bx / safeR;
      const ny = by / safeR;
      const nz = bz / safeR;

      const lat = Math.asin(ny);
      const lon = Math.atan2(nz, nx);

      let displacement = 0;

      displacement += this.computeTectonicDisplacement(lat, lon, i);
      displacement += this.computeVolcanicDisplacement(lat, lon, i);
      displacement += this.computeErosionDisplacement(lat, lon, i);

      const newR = safeR + displacement;
      positions.setXYZ(i, nx * newR, ny * newR, nz * newR);
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private computeTectonicDisplacement(lat: number, lon: number, idx: number): number {
    const stress = this.currentParams.tectonicStress;
    if (stress < 0.001) return 0;

    let h = 0;
    const ridge1 = Math.exp(-Math.pow(lat - 0.3, 2) * 20) * 0.3;
    const ridge2 = Math.exp(-Math.pow(lat + 0.5, 2) * 15) * 0.25;
    const ridge3 = Math.exp(-Math.pow(lon - 1.0, 2) * 10) * Math.exp(-Math.pow(lat - 0.1, 2) * 8) * 0.2;

    const noise = Math.sin(lat * 12 + this.seedVertices[idx % this.seedVertices.length] * 6) * 0.03;
    const noise2 = Math.cos(lon * 8 + this.seedVertices[(idx + 17) % this.seedVertices.length] * 4) * 0.02;

    h = (ridge1 + ridge2 + ridge3 + noise + noise2) * stress;
    return h;
  }

  private computeVolcanicDisplacement(lat: number, lon: number, idx: number): number {
    const activity = this.currentParams.volcanicActivity;
    if (activity < 0.001) return 0;

    let h = 0;
    const seed = this.seedVertices[idx % this.seedVertices.length];
    const numVolcanoes = Math.floor(activity * 8) + 1;

    for (let v = 0; v < numVolcanoes; v++) {
      const vSeed = this.seedVertices[(idx + v * 13) % this.seedVertices.length];
      const vLat = (vSeed - 0.5) * Math.PI * 0.8;
      const vLon = (this.seedVertices[(idx + v * 7 + 3) % this.seedVertices.length] - 0.5) * Math.PI * 2;

      const dist = Math.sqrt(
        Math.pow(lat - vLat, 2) + Math.pow(lon - vLon, 2)
      );
      const volcano = Math.exp(-dist * dist * 50) * 0.15 * activity;
      h += volcano;
    }

    h *= (0.5 + seed * 0.5);
    return h;
  }

  private computeErosionDisplacement(lat: number, lon: number, idx: number): number {
    const erosion = this.currentParams.erosion;
    if (erosion < 0.001) return 0;

    const seed = this.seedVertices[idx % this.seedVertices.length];
    let h = 0;

    const canyon1 = Math.exp(-Math.pow(lat - 0.1, 2) * 40) * 0.1;
    const canyon2 = Math.exp(-Math.pow(lat + 0.3, 2) * 30) * 0.08;
    const canyon3 = Math.exp(-Math.pow(lon - 2.0, 2) * 25) * Math.exp(-Math.pow(lat + 0.2, 2) * 20) * 0.06;

    const micro = Math.sin(lat * 20 + seed * 10) * Math.cos(lon * 15 + seed * 8) * 0.02;

    h = -(canyon1 + canyon2 + canyon3 + micro) * erosion;
    return h;
  }

  getSurfacePoint(intersect: THREE.Intersection): SurfacePoint | null {
    if (!intersect.face) return null;

    const point = intersect.point;
    const r = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
    const safeR = Math.max(r, 0.001);

    const lat = Math.asin(point.y / safeR) * (180 / Math.PI);
    const lon = Math.atan2(point.z, point.x) * (180 / Math.PI);

    const baseR = 1.0;
    const altitude = (r - baseR) * 1000;

    let terrainType = '平原';
    if (altitude > 100) {
      terrainType = '山脉';
    } else if (altitude < -30) {
      terrainType = '峡谷';
    } else if (this.currentParams.volcanicActivity > 0.5 && altitude > 50) {
      terrainType = '火山';
    }

    return { lat, lon, altitude, terrainType };
  }

  getPlanetMesh(): THREE.Mesh {
    return this.planetMesh;
  }

  getAtmosphereMesh(): THREE.Mesh {
    return this.atmosphereMesh;
  }

  getCurrentParams(): TerrainParams {
    return { ...this.currentParams };
  }

  update(time: number): void {
    this.atmosphereMesh.rotation.y = time * 0.001;
  }
}
