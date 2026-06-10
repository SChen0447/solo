import * as THREE from 'three';

export interface ArtificialLightConfig {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  intensity: number;
  temperature: number;
  enabled: boolean;
}

export interface NaturalLightConfig {
  azimuth: number;
  altitude: number;
  intensity: number;
}

export const DEFAULT_ARTIFICIAL_LIGHTS: ArtificialLightConfig[] = [
  {
    id: 'living',
    name: '客厅灯',
    position: { x: 0, y: 2.5, z: -1 },
    intensity: 3,
    temperature: 4000,
    enabled: true
  },
  {
    id: 'bedroom',
    name: '卧室灯',
    position: { x: -2, y: 2.5, z: 2 },
    intensity: 2,
    temperature: 3000,
    enabled: false
  },
  {
    id: 'kitchen',
    name: '厨房灯',
    position: { x: 3, y: 2.5, z: 1 },
    intensity: 4,
    temperature: 5000,
    enabled: false
  }
];

export const DEFAULT_NATURAL_LIGHT: NaturalLightConfig = {
  azimuth: 135,
  altitude: 45,
  intensity: 1.5
};

export function kelvinToRGB(kelvin: number): THREE.Color {
  const temp = kelvin / 100;
  let red: number, green: number, blue: number;

  if (temp <= 66) {
    red = 255;
    green = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    red = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    green = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    blue = 255;
  } else if (temp <= 19) {
    blue = 0;
  } else {
    blue = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return new THREE.Color(red / 255, green / 255, blue / 255);
}

export class LightController {
  private scene: THREE.Scene;
  private naturalLight: NaturalLightConfig;
  private artificialLights: Map<string, ArtificialLightConfig>;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private pointLights: Map<string, THREE.PointLight>;
  private lightSprites: Map<string, THREE.Sprite>;
  private lightMarkers: Map<string, THREE.Mesh>;
  private listeners: Set<() => void>;
  private sunDistance: number = 20;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.naturalLight = { ...DEFAULT_NATURAL_LIGHT };
    this.artificialLights = new Map();
    this.pointLights = new Map();
    this.lightSprites = new Map();
    this.lightMarkers = new Map();
    this.listeners = new Set();

    DEFAULT_ARTIFICIAL_LIGHTS.forEach((light) => {
      this.artificialLights.set(light.id, { ...light });
    });

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.naturalLight.intensity);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    this.createArtificialLights();
    this.updateSunPosition();
  }

  private createArtificialLights(): void {
    this.artificialLights.forEach((config) => {
      const color = kelvinToRGB(config.temperature);
      const pointLight = new THREE.PointLight(color, config.enabled ? config.intensity : 0, 15, 1.5);
      pointLight.position.set(config.position.x, config.position.y, config.position.z);
      pointLight.castShadow = true;
      pointLight.shadow.mapSize.width = 1024;
      pointLight.shadow.mapSize.height = 1024;
      pointLight.shadow.camera.near = 0.5;
      pointLight.shadow.camera.far = 10;
      pointLight.shadow.bias = -0.001;
      this.scene.add(pointLight);
      this.pointLights.set(config.id, pointLight);

      const markerGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: config.enabled ? 1 : 0.3
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(config.position.x, config.position.y, config.position.z);
      marker.name = `LightMarker_${config.id}`;
      marker.userData.lightId = config.id;
      this.scene.add(marker);
      this.lightMarkers.set(config.id, marker);

      const sprite = this.createGlowSprite(color);
      sprite.position.set(config.position.x, config.position.y, config.position.z);
      sprite.visible = false;
      sprite.scale.set(1.5, 1.5, 1.5);
      this.scene.add(sprite);
      this.lightSprites.set(config.id, sprite);
    });
  }

  private createGlowSprite(color: THREE.Color): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.9)`);
    gradient.addColorStop(0.3, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.5)`);
    gradient.addColorStop(0.6, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.15)`);
    gradient.addColorStop(1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Sprite(mat);
  }

  private updateSunPosition(): void {
    const { azimuth, altitude } = this.naturalLight;
    const azimuthRad = (azimuth * Math.PI) / 180;
    const altitudeRad = (altitude * Math.PI) / 180;

    const x = this.sunDistance * Math.cos(altitudeRad) * Math.sin(azimuthRad);
    const y = this.sunDistance * Math.sin(altitudeRad);
    const z = this.sunDistance * Math.cos(altitudeRad) * Math.cos(azimuthRad);

    this.directionalLight.position.set(x, y, z);
    this.directionalLight.target.position.set(0, 0, 0);

    const intensity = this.naturalLight.intensity * (altitude / 90);
    this.directionalLight.intensity = intensity;

    const warmColor = new THREE.Color(0xffd8b0);
    const coolColor = new THREE.Color(0xffffff);
    const sunColor = altitude < 30 ? warmColor : coolColor.lerp(warmColor, (30 - altitude) / 60);
    this.directionalLight.color = sunColor;

    this.notifyListeners();
  }

  public setNaturalLight(config: Partial<NaturalLightConfig>): void {
    this.naturalLight = { ...this.naturalLight, ...config };
    this.updateSunPosition();
  }

  public getNaturalLight(): NaturalLightConfig {
    return { ...this.naturalLight };
  }

  public setArtificialLight(id: string, config: Partial<ArtificialLightConfig>): void {
    const existing = this.artificialLights.get(id);
    if (!existing) return;

    const updated = { ...existing, ...config };
    this.artificialLights.set(id, updated);

    const pointLight = this.pointLights.get(id);
    const marker = this.lightMarkers.get(id);

    if (pointLight) {
      pointLight.intensity = updated.enabled ? updated.intensity : 0;
      pointLight.color = kelvinToRGB(updated.temperature);
    }

    if (marker) {
      const mat = marker.material as THREE.MeshBasicMaterial;
      mat.color = kelvinToRGB(updated.temperature);
      mat.opacity = updated.enabled ? 1 : 0.3;
    }

    this.notifyListeners();
  }

  public getArtificialLights(): ArtificialLightConfig[] {
    return Array.from(this.artificialLights.values());
  }

  public getArtificialLight(id: string): ArtificialLightConfig | undefined {
    const config = this.artificialLights.get(id);
    return config ? { ...config } : undefined;
  }

  public toggleArtificialLight(id: string): void {
    const config = this.artificialLights.get(id);
    if (!config) return;
    this.setArtificialLight(id, { enabled: !config.enabled });
  }

  public showGlow(id: string, show: boolean): void {
    const sprite = this.lightSprites.get(id);
    if (sprite) {
      sprite.visible = show;
    }
  }

  public getLightMarkerByMesh(mesh: THREE.Mesh): string | null {
    for (const [id, marker] of this.lightMarkers.entries()) {
      if (marker === mesh) return id;
    }
    return null;
  }

  public getLightMarker(id: string): THREE.Mesh | undefined {
    return this.lightMarkers.get(id);
  }

  public calculateIlluminance(x: number, z: number): number {
    let total = 0;
    const y = 0.05;

    const sunDir = new THREE.Vector3().subVectors(
      this.directionalLight.position,
      new THREE.Vector3(x, y, z)
    ).normalize();
    const cosAngle = Math.max(0, sunDir.y);
    total += this.directionalLight.intensity * cosAngle * 0.6;

    total += this.ambientLight.intensity * 0.3;

    this.artificialLights.forEach((config) => {
      if (!config.enabled) return;
      const dx = x - config.position.x;
      const dy = y - config.position.y;
      const dz = z - config.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);
      const attenuation = 1 / (1 + 0.3 * dist + 0.2 * distSq);
      total += config.intensity * attenuation * 0.8;
    });

    return total;
  }

  public addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  public update(deltaTime: number): void {}

  public dispose(): void {
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.directionalLight.target);
    this.scene.remove(this.ambientLight);

    this.pointLights.forEach((light) => this.scene.remove(light));
    this.lightMarkers.forEach((marker) => {
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
      this.scene.remove(marker);
    });
    this.lightSprites.forEach((sprite) => {
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      (sprite.material as THREE.Material).dispose();
      this.scene.remove(sprite);
    });

    this.pointLights.clear();
    this.lightMarkers.clear();
    this.lightSprites.clear();
    this.listeners.clear();
  }
}
