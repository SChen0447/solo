import * as THREE from 'three';
import { StarSystem, IStarData } from './starData';

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    float breathe = 0.85 + 0.15 * sin(uTime * 1.5 + aPhase);
    vAlpha = breathe;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float scale = aSize * uPixelRatio * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(scale, 1.0, 64.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    vec3 color = vColor * glow + vec3(1.0) * core * 0.4;
    float alpha = glow * vAlpha;

    gl_FragColor = vec4(color, alpha);
  }
`;

export class SceneRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  starSystem: StarSystem;
  particles!: THREE.Points;
  starGeometry!: THREE.BufferGeometry;
  positionAttribute!: THREE.BufferAttribute;
  sizeAttribute!: THREE.BufferAttribute;
  colorAttribute!: THREE.BufferAttribute;
  phaseAttribute!: THREE.BufferAttribute;
  material!: THREE.ShaderMaterial;
  clock: THREE.Clock;
  currentYearOffset: number = 0;
  currentParallaxAngle: number = 0;
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private rotationX: number = 0;
  private rotationY: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private cameraDistance: number = 0.1;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  onStarClick: ((star: IStarData) => void) | null = null;
  private animationId: number = 0;
  container: HTMLElement;

  constructor(container: HTMLElement, starSystem: StarSystem) {
    this.container = container;
    this.starSystem = starSystem;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 1.5 };
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, this.cameraDistance);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.createStarField();
    this.addBackgroundStars();
    this.setupMouseControls();
    this.setupResizeHandler();
  }

  private createStarField(): void {
    const stars = this.starSystem.stars;
    const count = stars.length;

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const star = stars[i];
      const pos = this.starSystem.getAdjustedPosition(star, 0);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      sizes[i] = this.starSystem.getStarSize(star.magnitude);

      const color = this.starSystem.getStarColor(star.spectralType);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      phases[i] = Math.random() * Math.PI * 2;
    }

    this.starGeometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.phaseAttribute = new THREE.BufferAttribute(phases, 1);

    this.starGeometry.setAttribute('position', this.positionAttribute);
    this.starGeometry.setAttribute('aSize', this.sizeAttribute);
    this.starGeometry.setAttribute('aColor', this.colorAttribute);
    this.starGeometry.setAttribute('aPhase', this.phaseAttribute);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(this.starGeometry, this.material);
    this.scene.add(this.particles);
  }

  private addBackgroundStars(): void {
    const bgCount = 2000;
    const positions = new Float32Array(bgCount * 3);
    const bgColors = new Float32Array(bgCount * 3);
    const bgSizes = new Float32Array(bgCount);
    const bgPhases = new Float32Array(bgCount);

    for (let i = 0; i < bgCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 98 + Math.random() * 4;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.4;
      bgColors[i * 3] = brightness;
      bgColors[i * 3 + 1] = brightness;
      bgColors[i * 3 + 2] = brightness + Math.random() * 0.1;

      bgSizes[i] = 0.05 + Math.random() * 0.15;
      bgPhases[i] = Math.random() * Math.PI * 2;
    }

    const bgGeometry = new THREE.BufferGeometry();
    bgGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bgGeometry.setAttribute('aSize', new THREE.BufferAttribute(bgSizes, 1));
    bgGeometry.setAttribute('aColor', new THREE.BufferAttribute(bgColors, 3));
    bgGeometry.setAttribute('aPhase', new THREE.BufferAttribute(bgPhases, 1));

    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const bgParticles = new THREE.Points(bgGeometry, bgMaterial);
    bgParticles.name = 'backgroundStars';
    this.scene.add(bgParticles);
  }

  private setupMouseControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.targetRotationY += deltaX * 0.005;
        this.targetRotationX += deltaY * 0.005;
        this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.001;
      this.cameraDistance = Math.max(0.05, Math.min(5.0, this.cameraDistance));
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.particles);

      if (intersects.length > 0) {
        const idx = intersects[0].index;
        if (idx !== undefined && idx < this.starSystem.stars.length) {
          const star = this.starSystem.stars[idx];
          if (this.onStarClick) {
            this.onStarClick(star);
          }
        }
      }
    });

    let touchStartPos = { x: 0, y: 0 };
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.previousMousePosition = { ...touchStartPos };
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
        this.targetRotationY += deltaX * 0.005;
        this.targetRotationX += deltaY * 0.005;
        this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  updateYearOffset(yearOffset: number): void {
    this.currentYearOffset = yearOffset;
    const stars = this.starSystem.stars;
    const positions = this.positionAttribute.array as Float32Array;

    for (let i = 0; i < stars.length; i++) {
      const pos = this.starSystem.getAdjustedPosition(stars[i], yearOffset);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const adjustedMag = this.starSystem.getAdjustedMagnitude(stars[i], yearOffset);
      (this.sizeAttribute.array as Float32Array)[i] = this.starSystem.getStarSize(adjustedMag);
    }

    this.positionAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }

  updateParallaxAngle(angle: number): void {
    this.currentParallaxAngle = angle;
  }

  setBackgroundBlend(blend: number): void {
    const deepBlue = new THREE.Color(0x0a0a2a);
    const darkPurple = new THREE.Color(0x1a0a2a);
    const bgColor = deepBlue.clone().lerp(darkPurple, blend);
    this.scene.background = bgColor;
  }

  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();
    this.material.uniforms.uTime.value = elapsed;

    this.scene.traverse((child) => {
      if (child instanceof THREE.Points && child.name === 'backgroundStars') {
        (child.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      }
    });

    this.rotationX += (this.targetRotationX - this.rotationX) * 0.08;
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.08;

    const parallaxRad = (this.currentParallaxAngle * Math.PI) / 180;
    const parallaxX = Math.sin(parallaxRad) * 5;

    this.camera.position.set(parallaxX, 0, this.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    this.scene.rotation.x = this.rotationX;
    this.scene.rotation.y = this.rotationY;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.starGeometry.dispose();
    this.material.dispose();
  }
}
