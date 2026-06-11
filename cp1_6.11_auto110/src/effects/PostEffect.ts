import * as THREE from 'three';

interface StarParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  baseAlpha: number;
  alphaOffset: number;
  alphaSpeed: number;
  size: number;
  color: THREE.Color;
}

export class PostEffect {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private starField: THREE.Points | null = null;
  private starParticles: StarParticle[] = [];
  private starGeometry: THREE.BufferGeometry | null = null;
  private rotationSpeed: number = 0.01 * Math.PI / 180;
  private starCount: number = 1000;
  private time: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    this.createStarField();
  }

  private createStarField(): void {
    this.starGeometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    const alphas = new Float32Array(this.starCount);

    const colorStart = new THREE.Color('#4a0e4e');
    const colorEnd = new THREE.Color('#1a1a5e');

    for (let i = 0; i < this.starCount; i++) {
      const radius = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      const z = radius * Math.cos(phi);

      const color = colorStart.clone().lerp(colorEnd, Math.random());
      const size = 0.02 + Math.random() * 0.06;
      const baseAlpha = 0.3 + Math.random() * 0.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const colorArr = color.toArray();
      colors[i * 3] = colorArr[0];
      colors[i * 3 + 1] = colorArr[1];
      colors[i * 3 + 2] = colorArr[2];

      sizes[i] = size;
      alphas[i] = baseAlpha;

      this.starParticles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.001,
          (Math.random() - 0.5) * 0.001,
          (Math.random() - 0.5) * 0.001
        ),
        baseAlpha,
        alphaOffset: Math.random() * Math.PI * 2,
        alphaSpeed: 0.5 + Math.random() * 1,
        size,
        color
      });
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.starGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (500.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float glow = 1.0 - dist * 2.0;
          glow = pow(glow, 0.8);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    });

    this.starField = new THREE.Points(this.starGeometry, starMaterial);
    this.scene.add(this.starField);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    if (this.starField && this.starGeometry) {
      this.starField.rotation.y += this.rotationSpeed;

      const positions = this.starGeometry.attributes.position.array as Float32Array;
      const alphas = this.starGeometry.attributes.alpha.array as Float32Array;

      for (let i = 0; i < this.starParticles.length; i++) {
        const particle = this.starParticles[i];
        
        const alpha = particle.baseAlpha * 0.5 + 
          Math.sin(this.time * particle.alphaSpeed + particle.alphaOffset) * particle.baseAlpha * 0.5;
        alphas[i] = Math.max(0.1, Math.min(0.9, alpha));
      }

      this.starGeometry.attributes.alpha.needsUpdate = true;
    }
  }

  setStarCount(count: number): void {
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starGeometry?.dispose();
      (this.starField.material as THREE.Material).dispose();
    }
    this.starCount = count;
    this.starParticles = [];
    this.createStarField();
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  dispose(): void {
    if (this.starField) {
      this.starGeometry?.dispose();
      (this.starField.material as THREE.Material).dispose();
      this.scene.remove(this.starField);
    }
  }
}
