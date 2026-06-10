import * as THREE from 'three';

export interface SunParams {
  angle: number;
  elevation: number;
}

const SUNRISE_TOP = new THREE.Color(0xff7f50);
const SUNRISE_BOTTOM = new THREE.Color(0x1a1a2e);
const NOON_TOP = new THREE.Color(0x4facfe);
const NOON_BOTTOM = new THREE.Color(0x00f2fe);

export class SkySystem {
  private scene: THREE.Scene;
  public hemisphereLight: THREE.HemisphereLight;
  public directionalLight: THREE.DirectionalLight;
  public sunHelper: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x404060, 0.5);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -60;
    this.directionalLight.shadow.camera.right = 60;
    this.directionalLight.shadow.camera.top = 60;
    this.directionalLight.shadow.camera.bottom = -60;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);
    this.scene.add(this.directionalLight.target);

    const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    this.sunHelper = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunHelper);

    this.updateSkyColors(45);
  }

  public update(params: SunParams): void {
    const angleRad = (params.angle * Math.PI) / 180;
    const elevationRad = (params.elevation * Math.PI) / 180;

    const sunDistance = 80;
    const x = Math.cos(angleRad) * Math.cos(elevationRad) * sunDistance;
    const y = Math.sin(elevationRad) * sunDistance;
    const z = Math.sin(angleRad) * Math.cos(elevationRad) * sunDistance;

    this.directionalLight.position.set(x, y, z);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();

    this.sunHelper.position.set(x * 0.5, y * 0.5, z * 0.5);

    const intensity = 0.4 + (params.elevation / 80) * 1.0;
    this.directionalLight.intensity = Math.max(0.3, intensity);

    const warmColor = new THREE.Color(0xffaa66);
    const coolColor = new THREE.Color(0xffffff);
    const t = THREE.MathUtils.clamp((params.elevation - 10) / 50, 0, 1);
    this.directionalLight.color.copy(warmColor).lerp(coolColor, t);

    this.hemisphereLight.intensity = 0.3 + (params.elevation / 80) * 0.4;

    this.updateSkyColors(params.elevation);
  }

  private updateSkyColors(elevation: number): void {
    const t = THREE.MathUtils.clamp((elevation - 10) / 60, 0, 1);

    const topColor = new THREE.Color().copy(SUNRISE_TOP).lerp(NOON_TOP, t);
    const bottomColor = new THREE.Color().copy(SUNRISE_BOTTOM).lerp(NOON_BOTTOM, t);

    this.createGradientBackground(topColor, bottomColor);

    this.hemisphereLight.color.copy(topColor).lerp(new THREE.Color(0xffffff), 0.5);
    this.hemisphereLight.groundColor.copy(bottomColor);
  }

  private createGradientBackground(topColor: THREE.Color, bottomColor: THREE.Color): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, `#${topColor.getHexString()}`);
    gradient.addColorStop(1, `#${bottomColor.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    if (this.scene.background) {
      const oldBg = this.scene.background as THREE.Texture;
      if (oldBg.dispose) oldBg.dispose();
    }
    this.scene.background = texture;
  }
}
