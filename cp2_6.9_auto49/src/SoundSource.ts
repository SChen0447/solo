import * as THREE from 'three';

export class SoundSource {
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly velocity: THREE.Vector3;
  public speed: number;

  private readonly sphere: THREE.Mesh;
  private readonly halo: THREE.Sprite;
  private readonly sphereMaterial: THREE.MeshStandardMaterial;
  private readonly haloMaterial: THREE.SpriteMaterial;
  private readonly pointLight: THREE.PointLight;

  private time: number = 0;
  private previousPosition: THREE.Vector3;

  private static readonly COLOR_LOW = new THREE.Color(0x00BFFF);
  private static readonly COLOR_HIGH = new THREE.Color(0xFF4500);
  private static readonly MAX_SPEED = 10;

  constructor() {
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 2, 0);
    this.velocity = new THREE.Vector3();
    this.previousPosition = this.position.clone();
    this.speed = 0;

    this.sphereMaterial = new THREE.MeshStandardMaterial({
      color: SoundSource.COLOR_LOW.clone(),
      emissive: SoundSource.COLOR_LOW.clone(),
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2
    });

    const sphereGeometry = new THREE.SphereGeometry(1, 48, 48);
    this.sphere = new THREE.Mesh(sphereGeometry, this.sphereMaterial);
    this.mesh.add(this.sphere);

    this.haloMaterial = new THREE.SpriteMaterial({
      map: this.createHaloTexture(),
      color: SoundSource.COLOR_LOW.clone(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.7
    });
    this.halo = new THREE.Sprite(this.haloMaterial);
    this.halo.scale.set(4, 4, 4);
    this.mesh.add(this.halo);

    this.pointLight = new THREE.PointLight(0x00BFFF, 2, 30, 1.5);
    this.mesh.add(this.pointLight);

    this.mesh.position.copy(this.position);
  }

  private createHaloTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public update(delta: number): void {
    this.time += delta;

    const t = this.time * 0.6;
    const newX = Math.sin(t * 1.3) * 6;
    const newY = Math.sin(t * 0.7) * 2.5 + 2;
    const newZ = Math.cos(t * 1.1) * 6;

    this.previousPosition.copy(this.position);
    this.position.set(newX, newY, newZ);
    this.mesh.position.copy(this.position);

    this.velocity.subVectors(this.position, this.previousPosition).divideScalar(Math.max(delta, 0.0001));
    this.speed = this.velocity.length();

    const speedFactor = Math.min(this.speed / SoundSource.MAX_SPEED, 1);
    const color = SoundSource.COLOR_LOW.clone().lerp(SoundSource.COLOR_HIGH, speedFactor);

    this.sphereMaterial.color.copy(color);
    this.sphereMaterial.emissive.copy(color);
    this.sphereMaterial.emissiveIntensity = 0.6 + speedFactor * 0.6;

    this.haloMaterial.color.copy(color);

    this.pointLight.color.copy(color);
    this.pointLight.intensity = 1.5 + speedFactor * 2.5;

    const pulse = 1.0 + 0.25 * Math.sin(this.time * 4);
    this.halo.scale.setScalar(3.5 * pulse);
    this.haloMaterial.opacity = 0.5 + 0.25 * Math.sin(this.time * 4 + 0.5);

    this.sphere.scale.setScalar(1 + 0.05 * Math.sin(this.time * 4));
  }
}
