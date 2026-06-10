import * as THREE from 'three';

const OCEAN_HEIGHT = 400;
const LAYER_CONFIGS = [
  { name: 'epipelagic', depthRange: [0, 100], color: new THREE.Color(0x0066aa), baseOpacity: 0.15 },
  { name: 'mesopelagic', depthRange: [100, 200], color: new THREE.Color(0x003d7a), baseOpacity: 0.2 },
  { name: 'bathypelagic', depthRange: [200, 300], color: new THREE.Color(0x001a4d), baseOpacity: 0.25 },
  { name: 'abyssopelagic', depthRange: [300, 400], color: new THREE.Color(0x000814), baseOpacity: 0.3 }
];

export class OceanScene {
  private scene: THREE.Scene;
  private waterLayers: THREE.Mesh[] = [];
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sunLight = new THREE.DirectionalLight(0x88ccff, 0.6);
    this.ambientLight = new THREE.AmbientLight(0x0a1a3a, 0.4);
  }

  public init(): void {
    this.createWaterLayers();
    this.createSeabed();
    this.setupLighting();
    this.setupFog();
  }

  private createWaterLayers(): void {
    const planeGeo = new THREE.PlaneGeometry(800, 800, 1, 1);

    LAYER_CONFIGS.forEach((config) => {
      const y = OCEAN_HEIGHT - config.depthRange[0];
      const material = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: config.baseOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(planeGeo, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      mesh.userData.layerConfig = config;
      this.waterLayers.push(mesh);
      this.scene.add(mesh);
    });

    const seaSurfaceGeo = new THREE.PlaneGeometry(800, 800, 1, 1);
    const seaSurfaceMat = new THREE.MeshBasicMaterial({
      color: 0x0088cc,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const seaSurface = new THREE.Mesh(seaSurfaceGeo, seaSurfaceMat);
    seaSurface.rotation.x = -Math.PI / 2;
    seaSurface.position.y = OCEAN_HEIGHT;
    this.scene.add(seaSurface);
  }

  private createSeabed(): void {
    const seabedGeo = new THREE.PlaneGeometry(800, 800, 60, 60);
    const positions = seabedGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 3
        + Math.sin(x * 0.02 + 1) * Math.cos(y * 0.018) * 2;
      positions.setZ(i, noise);
    }
    seabedGeo.computeVertexNormals();

    const seabedMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const seabed = new THREE.Mesh(seabedGeo, seabedMat);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = 0;
    seabed.receiveShadow = true;
    this.scene.add(seabed);

    const rocksMat = new THREE.MeshStandardMaterial({
      color: 0x2d2d44,
      roughness: 0.95,
      metalness: 0.05
    });
    for (let i = 0; i < 50; i++) {
      const size = 1 + Math.random() * 4;
      const rockGeo = new THREE.DodecahedronGeometry(size, 0);
      const rock = new THREE.Mesh(rockGeo, rocksMat);
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 300;
      rock.position.set(
        Math.cos(angle) * radius,
        size * 0.5 + Math.random() * 0.5,
        Math.sin(angle) * radius
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      this.scene.add(rock);
    }
  }

  private setupLighting(): void {
    this.sunLight.position.set(0, OCEAN_HEIGHT + 100, 0);
    this.sunLight.castShadow = false;
    this.scene.add(this.sunLight);
    this.scene.add(this.ambientLight);
  }

  private setupFog(): void {
    this.scene.fog = new THREE.FogExp2(0x000814, 0.012);
  }

  public update(cameraY: number, time: number): void {
    const depth = OCEAN_HEIGHT - cameraY;
    this.waterLayers.forEach((layer) => {
      const config = layer.userData.layerConfig as typeof LAYER_CONFIGS[0];
      const layerMid = (config.depthRange[0] + config.depthRange[1]) / 2;
      const layerRange = (config.depthRange[1] - config.depthRange[0]) / 2;
      const dist = Math.abs(depth - layerMid) / layerRange;
      const opacity = config.baseOpacity * Math.max(0, 1 - dist * 0.5);
      (layer.material as THREE.MeshBasicMaterial).opacity = opacity;
    });

    this.setSunAngle(time);
    const sunIntensity = Math.max(0.1, 0.6 - depth / OCEAN_HEIGHT * 0.5);
    this.sunLight.intensity = sunIntensity;
    this.ambientLight.intensity = Math.max(0.15, 0.4 - depth / OCEAN_HEIGHT * 0.3);
  }

  public setSunAngle(time: number): void {
    const angle = time * 0.05;
    const radius = 200;
    this.sunLight.position.set(
      Math.sin(angle) * radius,
      OCEAN_HEIGHT + 50,
      Math.cos(angle) * radius
    );
  }

  public static get OCEAN_HEIGHT(): number {
    return OCEAN_HEIGHT;
  }
}
