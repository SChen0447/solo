import * as THREE from 'three';

export class Star {
  public mesh: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  public group: THREE.Group;
  private material: THREE.MeshStandardMaterial;
  private baseEmissiveIntensity: number = 1.0;
  private pulseTime: number = 0;
  private pulseSpeed: number = 2.0;
  private pulseAmplitude: number = 0.3;

  constructor(radius: number = 0.8, color: string = '#f39c12') {
    this.group = new THREE.Group();

    const starGeometry = new THREE.SphereGeometry(radius, 64, 64);
    this.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: this.baseEmissiveIntensity,
      roughness: 0.2,
      metalness: 0.1
    });
    this.mesh = new THREE.Mesh(starGeometry, this.material);
    this.group.add(this.mesh);

    const glowGeometry = new THREE.SphereGeometry(radius * 2.5, 64, 64);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.4 },
        p: { value: 4.5 },
        glowColor: { value: new THREE.Color('#fff3a0') },
        viewVector: { value: new THREE.Vector3(0, 0, 1) }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.6);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.group.add(this.glowMesh);
  }

  public update(deltaTime: number): void {
    this.pulseTime += deltaTime * this.pulseSpeed;
    const pulseFactor = 1.0 + Math.sin(this.pulseTime) * this.pulseAmplitude;
    this.material.emissiveIntensity = this.baseEmissiveIntensity * pulseFactor;

    const scale = 1.0 + Math.sin(this.pulseTime) * 0.05;
    this.mesh.scale.setScalar(scale);
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }
}
