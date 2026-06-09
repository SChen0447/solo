import * as THREE from 'three';
import { SolarSystem } from './SolarSystem';

export class EffectController {
  private scene: THREE.Scene;
  private solarSystem: SolarSystem;
  private ambientLight: THREE.AmbientLight;
  private sunLight: THREE.PointLight;

  private starField!: THREE.Points;
  private starOpacities: Float32Array;
  private starBaseSizes: Float32Array;
  private starCount: number = 4000;

  private umbraCone!: THREE.Mesh;
  private penumbraCone!: THREE.Mesh;

  public isEclipseActive: boolean = false;
  private eclipseTimer: number = 0;
  private eclipseDuration: number = 5;
  private eclipseTransition: number = 0.5;
  private wasEclipse: boolean = false;

  private defaultAmbientIntensity: number = 0.6;
  private defaultSunIntensity: number = 2;
  private defaultSunColor: THREE.Color = new THREE.Color(0xffffff);

  private vignetteElement: HTMLElement | null;

  constructor(scene: THREE.Scene, solarSystem: SolarSystem) {
    this.scene = scene;
    this.solarSystem = solarSystem;
    this.starOpacities = new Float32Array(this.starCount);
    this.starBaseSizes = new Float32Array(this.starCount);

    this.ambientLight = new THREE.AmbientLight(0xffffff, this.defaultAmbientIntensity);
    this.scene.add(this.ambientLight);

    this.sunLight = this.solarSystem.getSunLight();

    this.vignetteElement = document.getElementById('eclipse-vignette');

    this.init();
  }

  private init(): void {
    this.createStarField();
    this.createShadowCones();
  }

  private createStarField(): void {
    const positions = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    const colors = new Float32Array(this.starCount * 3);

    for (let i = 0; i < this.starCount; i++) {
      const radius = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const size = 1 + Math.random() * 2;
      sizes[i] = size;
      this.starBaseSizes[i] = size;
      this.starOpacities[i] = 0.5 + Math.random() * 0.5;

      const brightness = 0.8 + Math.random() * 0.2;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.3,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starField = new THREE.Points(geo, mat);
    this.scene.add(this.starField);
  }

  private createShadowCones(): void {
    const moonRadius = 0.2;
    const sunRadius = 2;
    const sunMoonDist = 15;

    const umbraAngle = Math.atan((sunRadius - moonRadius) / sunMoonDist);
    const umbraHeight = moonRadius / Math.tan(umbraAngle);
    const umbraGeo = new THREE.ConeGeometry(moonRadius * 0.3, umbraHeight, 32, 1, true);
    const umbraMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.umbraCone = new THREE.Mesh(umbraGeo, umbraMat);
    this.umbraCone.rotation.x = Math.PI;
    this.scene.add(this.umbraCone);

    const penumbraAngle = Math.atan((sunRadius + moonRadius) / sunMoonDist);
    const penumbraHeight = moonRadius / Math.tan(penumbraAngle) * 4;
    const penumbraGeo = new THREE.ConeGeometry(moonRadius * 2.5, penumbraHeight, 32, 1, true);
    const penumbraMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.penumbraCone = new THREE.Mesh(penumbraGeo, penumbraMat);
    this.penumbraCone.rotation.x = Math.PI;
    this.scene.add(this.penumbraCone);
  }

  public update(delta: number): void {
    this.updateStars(delta);
    this.checkEclipse(delta);
    this.updateShadowCones();
  }

  private updateStars(delta: number): void {
    const sizesAttr = this.starField.geometry.getAttribute('size') as THREE.BufferAttribute;
    const sizes = sizesAttr.array as Float32Array;

    for (let i = 0; i < this.starCount; i++) {
      const flicker = Math.sin(Date.now() * 0.001 * (0.5 + (i % 5) * 0.3) + i) * 0.3 + 0.7;
      sizes[i] = this.starBaseSizes[i] * flicker;
    }
    sizesAttr.needsUpdate = true;
    this.starField.rotation.y += delta * 0.005;
  }

  private checkEclipse(delta: number): void {
    const angle = this.solarSystem.getSunMoonEarthAngle();
    const isAligned = angle < 5;

    if (isAligned && !this.wasEclipse && !this.isEclipseActive) {
      this.triggerEclipse();
    }
    this.wasEclipse = isAligned;

    if (this.isEclipseActive) {
      this.eclipseTimer -= delta;

      let t: number;
      if (this.eclipseTimer > this.eclipseDuration - this.eclipseTransition) {
        t = (this.eclipseDuration - this.eclipseTimer) / this.eclipseTransition;
      } else if (this.eclipseTimer < this.eclipseTransition) {
        t = this.eclipseTimer / this.eclipseTransition;
      } else {
        t = 1;
      }
      t = THREE.MathUtils.clamp(t, 0, 1);

      this.applyEclipseEffect(t);

      if (this.eclipseTimer <= 0) {
        this.isEclipseActive = false;
        this.applyEclipseEffect(0);
      }
    }
  }

  private applyEclipseEffect(t: number): void {
    this.ambientLight.intensity = THREE.MathUtils.lerp(this.defaultAmbientIntensity, 0.3, t);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.defaultSunIntensity, this.defaultSunIntensity * 0.3, t);

    const eclipseColor = new THREE.Color(0xffaa55);
    const currentColor = this.defaultSunColor.clone().lerp(eclipseColor, t * 0.3);
    this.sunLight.color.copy(currentColor);

    const haloMat = this.solarSystem.moonHalo.material as THREE.MeshBasicMaterial;
    haloMat.opacity = t * 0.6;

    const umbraMat = this.umbraCone.material as THREE.MeshBasicMaterial;
    umbraMat.opacity = t * 0.5;
    const penumbraMat = this.penumbraCone.material as THREE.MeshBasicMaterial;
    penumbraMat.opacity = t * 0.25;

    if (this.vignetteElement) {
      this.vignetteElement.style.opacity = String(t * 0.9);
    }
  }

  private updateShadowCones(): void {
    const moonPos = this.solarSystem.getMoonWorldPosition();
    const sunPos = this.solarSystem.getSunWorldPosition();

    this.umbraCone.position.copy(moonPos);
    this.umbraCone.lookAt(sunPos);
    this.umbraCone.rotateX(-Math.PI / 2);

    this.penumbraCone.position.copy(moonPos);
    this.penumbraCone.lookAt(sunPos);
    this.penumbraCone.rotateX(-Math.PI / 2);
  }

  public triggerEclipse(): void {
    this.solarSystem.forceEclipsePosition();
    this.isEclipseActive = true;
    this.eclipseTimer = this.eclipseDuration;
    this.wasEclipse = true;
  }
}
