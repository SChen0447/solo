import * as THREE from 'three';

export class TimeManager {
  public time: number = 0;
  public isAutoPlaying: boolean = true;

  public ambientLight: THREE.AmbientLight;
  public directionalLight: THREE.DirectionalLight;
  public hemisphereLight: THREE.HemisphereLight;
  public pointLight1: THREE.PointLight;
  public pointLight2: THREE.PointLight;

  public readonly sunRiseColor = new THREE.Color(0xff7043);
  public readonly noonColor = new THREE.Color(0xffffff);
  public readonly duskColor = new THREE.Color(0x3949ab);
  public readonly midnightColor = new THREE.Color(0x2a0845);

  public readonly sunRiseAmbient = new THREE.Color(0xff8a65);
  public readonly noonAmbient = new THREE.Color(0xe0e0ff);
  public readonly duskAmbient = new THREE.Color(0x5c6bc0);
  public readonly midnightAmbient = new THREE.Color(0x1a0033);

  public onTimeChange?: (t: number) => void;

  constructor(scene: THREE.Scene) {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 30);
    this.directionalLight.castShadow = false;
    scene.add(this.directionalLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x4a148c, 0x1a1a2e, 0.4);
    scene.add(this.hemisphereLight);

    this.pointLight1 = new THREE.PointLight(0xc77dff, 0.6, 200);
    this.pointLight1.position.set(-60, 50, -60);
    scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0x3366ff, 0.5, 200);
    this.pointLight2.position.set(60, 50, 60);
    scene.add(this.pointLight2);

    this.applyTime(0);
  }

  public update(deltaTime: number): void {
    if (this.isAutoPlaying) {
      this.time += deltaTime * 0.05;
      if (this.time >= 1) this.time -= 1;
      if (this.time < 0) this.time += 1;
      this.applyTime(this.time);
      if (this.onTimeChange) this.onTimeChange(this.time);
    }
  }

  public setTime(t: number): void {
    this.time = Math.max(0, Math.min(1, t));
    this.applyTime(this.time);
    if (this.onTimeChange) this.onTimeChange(this.time);
  }

  public toggleAutoPlay(): boolean {
    this.isAutoPlaying = !this.isAutoPlaying;
    return this.isAutoPlaying;
  }

  public applyTime(t: number): void {
    const { dirColor, ambColor, hemiSky, hemiGround, dirIntensity, ambIntensity } =
      this.interpolateColors(t);

    this.directionalLight.color.copy(dirColor);
    this.directionalLight.intensity = dirIntensity;

    const sunAngle = t * Math.PI * 2 - Math.PI / 2;
    this.directionalLight.position.set(
      Math.cos(sunAngle) * 120,
      Math.sin(sunAngle) * 120 + 20,
      40
    );

    this.ambientLight.color.copy(ambColor);
    this.ambientLight.intensity = ambIntensity;

    this.hemisphereLight.color.copy(hemiSky);
    this.hemisphereLight.groundColor.copy(hemiGround);

    const nightBoost = this.getNightFactor(t);
    this.pointLight1.intensity = 0.5 + nightBoost * 1.2;
    this.pointLight2.intensity = 0.4 + nightBoost * 1.0;
  }

  private interpolateColors(t: number): {
    dirColor: THREE.Color;
    ambColor: THREE.Color;
    hemiSky: THREE.Color;
    hemiGround: THREE.Color;
    dirIntensity: number;
    ambIntensity: number;
  } {
    let dirColor: THREE.Color;
    let ambColor: THREE.Color;
    let dirIntensity: number;
    let ambIntensity: number;

    if (t < 0.25) {
      const p = t / 0.25;
      dirColor = this.lerpColor(this.sunRiseColor, this.noonColor, p);
      ambColor = this.lerpColor(this.sunRiseAmbient, this.noonAmbient, p);
      dirIntensity = 0.5 + p * 0.6;
      ambIntensity = 0.3 + p * 0.3;
    } else if (t < 0.5) {
      const p = (t - 0.25) / 0.25;
      dirColor = this.lerpColor(this.noonColor, this.duskColor, p);
      ambColor = this.lerpColor(this.noonAmbient, this.duskAmbient, p);
      dirIntensity = 1.1 - p * 0.5;
      ambIntensity = 0.6 - p * 0.2;
    } else if (t < 0.75) {
      const p = (t - 0.5) / 0.25;
      dirColor = this.lerpColor(this.duskColor, this.midnightColor, p);
      ambColor = this.lerpColor(this.duskAmbient, this.midnightAmbient, p);
      dirIntensity = 0.6 - p * 0.4;
      ambIntensity = 0.4 - p * 0.2;
    } else {
      const p = (t - 0.75) / 0.25;
      dirColor = this.lerpColor(this.midnightColor, this.sunRiseColor, p);
      ambColor = this.lerpColor(this.midnightAmbient, this.sunRiseAmbient, p);
      dirIntensity = 0.2 + p * 0.3;
      ambIntensity = 0.2 + p * 0.1;
    }

    const hemiSky = ambColor.clone().multiplyScalar(1.1);
    const hemiGround = ambColor.clone().multiplyScalar(0.3).lerp(new THREE.Color(0x1a1a2e), 0.6);

    return { dirColor, ambColor, hemiSky, hemiGround, dirIntensity, ambIntensity };
  }

  private lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
    return a.clone().lerp(b, this.smoothstep(t));
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  public getNightFactor(t: number): number {
    if (t < 0.2) return 0;
    if (t < 0.35) return (t - 0.2) / 0.15;
    if (t < 0.45) return 1;
    if (t < 0.55) return 1 - (t - 0.45) / 0.1;
    if (t < 0.7) return 0;
    if (t < 0.85) return (t - 0.7) / 0.15;
    return 1;
  }

  public getBackgroundGradient(t: number): { top: string; bottom: string } {
    const { ambColor } = this.interpolateColors(t);
    const topDark = ambColor.clone().multiplyScalar(0.15).lerp(new THREE.Color(0x0a0015), 0.7);
    const botDark = ambColor.clone().multiplyScalar(0.08).lerp(new THREE.Color(0x1a0030), 0.6);
    return {
      top: `#${topDark.getHexString()}`,
      bottom: `#${botDark.getHexString()}`,
    };
  }

  public getClockTime(t: number): string {
    const hours = (t * 24 + 6) % 24;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  public getPeriodLabel(t: number): { label: string; clock: string } {
    const clock = this.getClockTime(t);
    let label: string;
    if (t < 0.25) label = '日出';
    else if (t < 0.5) label = '正午';
    else if (t < 0.75) label = '黄昏';
    else label = '午夜';
    return { label, clock };
  }
}
