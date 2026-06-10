import * as THREE from 'three';

export class Star {
  public readonly group: THREE.Group;
  private readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly light: THREE.PointLight;
  private readonly glow: THREE.Sprite;
  private readonly baseEmissiveIntensity: number = 1.0;
  private readonly pulseAmplitude: number = 0.4;
  private readonly pulsePeriod: number = 2.0;

  constructor() {
    this.group = new THREE.Group();

    this.material = new THREE.MeshStandardMaterial({
      color: 0xffddaa,
      emissive: 0xffddaa,
      emissiveIntensity: this.baseEmissiveIntensity,
      roughness: 1.0,
      metalness: 0.0
    });

    const geometry = new THREE.SphereGeometry(1.2, 48, 36);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);

    this.light = new THREE.PointLight(0xffddaa, 2.5, 100, 1.5);
    this.light.position.set(0, 0, 0);
    this.group.add(this.light);

    const ambientLight = new THREE.AmbientLight(0x222233, 0.3);
    this.group.add(ambientLight);

    this.glow = this.createGlowSprite();
    this.group.add(this.glow);
  }

  private createGlowSprite(): THREE.Sprite {
    const size = 5.0;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0.0, 'rgba(255, 221, 170, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 200, 140, 0.35)');
    gradient.addColorStop(0.6, 'rgba(255, 180, 120, 0.1)');
    gradient.addColorStop(1.0, 'rgba(255, 170, 100, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1.0);
    return sprite;
  }

  public update(elapsedSeconds: number): void {
    const t = (elapsedSeconds / this.pulsePeriod) * Math.PI * 2;
    const intensity = this.baseEmissiveIntensity + this.pulseAmplitude * (0.5 + 0.5 * Math.sin(t));
    this.material.emissiveIntensity = intensity;
    this.light.intensity = 2.0 + 0.6 * (0.5 + 0.5 * Math.sin(t));
    const glowScale = 5.0 + 0.5 * (0.5 + 0.5 * Math.sin(t));
    this.glow.scale.set(glowScale, glowScale, 1.0);
  }

  public getLightPosition(): THREE.Vector3 {
    return this.light.position.clone();
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    (this.glow.material as THREE.SpriteMaterial).map?.dispose();
    (this.glow.material as THREE.SpriteMaterial).dispose();
  }
}
