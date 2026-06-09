import * as THREE from 'three';
import { SimplexNoise } from 'simplex-noise';
import { GlacierManager } from './glacierManager';
import { CrackManager } from './crackManager';

export class SceneManager {
  private scene: THREE.Scene;
  private glacierManager: GlacierManager;
  private crackManager: CrackManager;
  private buildings: THREE.Mesh[] = [];
  private snowParticles: THREE.Points | null = null;
  private snowVelocities: Float32Array = new Float32Array();
  private snowOffsets: Float32Array = new Float32Array();
  private simplex = new SimplexNoise();
  private snowTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.glacierManager = new GlacierManager(scene);
    this.crackManager = new CrackManager(scene);
  }

  public buildScene(): void {
    this.createGround();
    this.createBuildings();
    this.createSkyDome();
    this.glacierManager.createIceLayer();
    this.crackManager.setBuildings(this.buildings);
    this.createSnowParticles();
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
    groundGeometry.rotateX(-Math.PI / 2);

    const positions = groundGeometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const noiseVal = this.simplex.noise2D(x * 0.05, z * 0.05) * 0.5 + 0.5;

      const r = 0.45 + noiseVal * 0.1;
      const g = 0.48 + noiseVal * 0.12;
      const b = 0.55 + noiseVal * 0.15;

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const groundMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private createBuildings(): void {
    const positions: Array<{ x: number; z: number }> = [];
    const minDistance = 12;

    for (let i = 0; i < 5; i++) {
      let x: number, z: number, valid: boolean;
      let attempts = 0;

      do {
        x = (Math.random() - 0.5) * 40;
        z = (Math.random() - 0.5) * 40;
        valid = true;

        for (const pos of positions) {
          const dist = Math.sqrt((x - pos.x) ** 2 + (z - pos.z) ** 2);
          if (dist < minDistance) {
            valid = false;
            break;
          }
        }
        attempts++;
      } while (!valid && attempts < 50);

      positions.push({ x, z });

      const height = 5 + Math.random() * 5;
      const width = 4 + Math.random() * 3;
      const depth = 4 + Math.random() * 3;

      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: 0x6b5b4b,
        roughness: 0.95,
        metalness: 0.02,
        flatShading: true,
      });

      const building = new THREE.Mesh(geometry, material);
      building.position.set(x, height / 2, z);
      building.rotation.y = Math.random() * Math.PI * 2;
      building.castShadow = true;
      building.receiveShadow = true;

      this.buildings.push(building);
      this.scene.add(building);
    }
  }

  private createSkyDome(): void {
    const skyGeometry = new THREE.SphereGeometry(300, 32, 32);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0xe0e0e0) },
        bottomColor: { value: new THREE.Color(0x4a4a5a) },
        offset: { value: 30 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);
  }

  private createSnowParticles(): void {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    this.snowVelocities = new Float32Array(particleCount);
    this.snowOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 20 + 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      this.snowVelocities[i] = -(0.5 + Math.random());
      this.snowOffsets[i] = Math.random() * 1000;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    this.snowParticles = new THREE.Points(geometry, material);
    this.scene.add(this.snowParticles);
  }

  private updateSnowParticles(deltaTime: number): void {
    if (!this.snowParticles) return;

    this.snowTime += deltaTime;
    const positions = this.snowParticles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3 + 1] += this.snowVelocities[i] * deltaTime;

      const driftX = this.simplex.noise2D(this.snowTime * 0.3 + this.snowOffsets[i], 0) * 0.2;
      const driftZ = this.simplex.noise2D(0, this.snowTime * 0.3 + this.snowOffsets[i]) * 0.2;
      positions[i * 3] += driftX * deltaTime;
      positions[i * 3 + 2] += driftZ * deltaTime;

      if (positions[i * 3 + 1] < 0) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = 25 + Math.random() * 5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
    }

    this.snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  public updateThemeColors(iceColor: THREE.Color, snowColor: THREE.Color): void {
    this.glacierManager.updateIceColor(iceColor);
    if (this.snowParticles) {
      (this.snowParticles.material as THREE.PointsMaterial).color.copy(snowColor);
    }
  }

  public update(deltaTime: number, temperature: number): void {
    this.glacierManager.simulate(temperature, deltaTime);
    this.crackManager.update(temperature, deltaTime);
    this.updateSnowParticles(deltaTime);
  }
}
