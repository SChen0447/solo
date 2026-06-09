import * as THREE from 'three';

export interface AuroraDataPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

export class Earth {
  public mesh: THREE.Mesh;
  public group: THREE.Group;
  public atmosphere: THREE.Mesh;
  private rotationSpeed: number = 0.1;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.group = new THREE.Group();
    this.textureLoader = new THREE.TextureLoader();
    
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x223355,
      emissive: 0x0a1128,
      emissiveIntensity: 0.3,
      shininess: 10,
      transparent: true,
      opacity: 0.95
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.group.add(this.mesh);

    this.atmosphere = this.createAtmosphere();
    this.group.add(this.atmosphere);

    this.loadTextures();
  }

  private createAtmosphere(): THREE.Mesh {
    const atmosphereGeometry = new THREE.SphereGeometry(1.02, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });

    return new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  }

  private loadTextures(): void {
    const earthTextureUrl = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg';
    
    this.textureLoader.load(
      earthTextureUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = this.mesh.material as THREE.MeshPhongMaterial;
        material.map = texture;
        material.color.set(0xffffff);
        material.emissive.set(0x112244);
        material.emissiveIntensity = 0.15;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        console.log('Texture load failed, using fallback colors');
      }
    );
  }

  public update(deltaTime: number): void {
    this.mesh.rotation.y += this.rotationSpeed * deltaTime;
  }

  public getRotation(): number {
    return this.mesh.rotation.y;
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public static latLongToVector3(latitude: number, longitude: number, radius: number = 1.01): THREE.Vector3 {
    const phi = (90 - latitude) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  }

  public static vector3ToLatLong(position: THREE.Vector3): { latitude: number; longitude: number } {
    const normalized = position.clone().normalize();
    const latitude = 90 - Math.acos(normalized.y) * (180 / Math.PI);
    const longitude = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;
    
    return {
      latitude: parseFloat(latitude.toFixed(2)),
      longitude: parseFloat(((longitude + 540) % 360 - 180).toFixed(2))
    };
  }
}
