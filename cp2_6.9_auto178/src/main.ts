import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createMolecule, MoleculeGroup, ElementInfo } from './molecules';
import { InteractionManager } from './interaction';
import { UIManager } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private molecule: MoleculeGroup;
  private interaction: InteractionManager;
  private ui: UIManager;
  private particles: THREE.Points;
  private particleVelocities: Float32Array;
  private autoRotate: boolean = true;
  private autoRotateSpeed: number = 0.01;
  private autoRotateBlend: number = 1;
  private clock: THREE.Clock;
  private initialCameraPosition: THREE.Vector3;
  private initialTarget: THREE.Vector3;

  constructor() {
    this.clock = new THREE.Clock();

    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) throw new Error('Canvas container not found');

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.initialCameraPosition = new THREE.Vector3(5, 3, 6);
    this.camera.position.copy(this.initialCameraPosition);
    this.initialTarget = new THREE.Vector3(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    canvasContainer.appendChild(this.renderer.domElement);

    this.setupLights();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.copy(this.initialTarget);
    this.controls.update();

    this.molecule = createMolecule('caffeine');
    this.scene.add(this.molecule.group);

    this.particles = this.createParticles();
    this.scene.add(this.particles);
    this.particleVelocities = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.003;
      this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
    }

    this.interaction = new InteractionManager(this.camera, this.renderer.domElement, this.scene);
    this.interaction.setMolecule(this.molecule);

    this.ui = new UIManager('ui-container');
    this.ui.setOnMoleculeSelect((key: string) => this.loadMolecule(key));
    this.ui.setOnResetView(() => this.resetView());
    this.interaction.setOnAtomSelect((info: ElementInfo | null) => {
      this.ui.updateElementInfo(info);
    });

    this.bindControlEvents();
    window.addEventListener('resize', () => this.onResize());

    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0A0E27');
    gradient.addColorStop(1, '#1B1F3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 5, 5);
    this.scene.add(directional);
  }

  private createParticles(): THREE.Points {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const baseColor = new THREE.Color('#88CCFF');

    for (let i = 0; i < count; i++) {
      const radius = 8 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;

      sizes[i] = 1 + Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        varying vec3 vPosition;
        void main() {
          vColor = color;
          vSize = size;
          vPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vColor;
        varying vec3 vPosition;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor, alpha * (0.15 + 0.2 * (sin(uTime * 2.0 + vPosition.x) * 0.5 + 0.5)));
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    return points;
  }

  private bindControlEvents(): void {
    this.controls.addEventListener('start', () => {
      this.autoRotate = false;
    });
    this.controls.addEventListener('end', () => {
      this.autoRotate = true;
    });
  }

  private loadMolecule(key: string): void {
    this.scene.remove(this.molecule.group);
    this.disposeMolecule(this.molecule);
    this.molecule = createMolecule(key);
    this.scene.add(this.molecule.group);
    this.interaction.setMolecule(this.molecule);
    this.ui.updateElementInfo(null);
  }

  private disposeMolecule(mol: MoleculeGroup): void {
    mol.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  private resetView(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialTarget);
    this.controls.update();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (this.autoRotate) {
      this.autoRotateBlend = Math.min(1, this.autoRotateBlend + delta * 2);
    } else {
      this.autoRotateBlend = Math.max(0, this.autoRotateBlend - delta * 3);
    }
    this.molecule.group.rotation.y += this.autoRotateSpeed * this.autoRotateBlend;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 200; i++) {
      positions[i * 3] += this.particleVelocities[i * 3];
      positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1];
      positions[i * 3 + 2] += this.particleVelocities[i * 3 + 2];

      const dx = positions[i * 3];
      const dy = positions[i * 3 + 1];
      const dz = positions[i * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 22) {
        positions[i * 3] *= 20 / dist;
        positions[i * 3 + 1] *= 20 / dist;
        positions[i * 3 + 2] *= 20 / dist;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    (this.particles.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;

    this.interaction.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
