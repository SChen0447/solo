import * as THREE from 'three';
import { GalaxyParticles } from './GalaxyParticles';
import { GalaxyUI } from './ui';

class GalaxyScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private galaxyParticles: GalaxyParticles;
  private ui: GalaxyUI;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: { theta: number; phi: number; radius: number } = {
    theta: Math.PI * 0.25,
    phi: Math.PI * 0.35,
    radius: 220
  };
  private targetSpherical: { theta: number; phi: number; radius: number } = {
    theta: Math.PI * 0.25,
    phi: Math.PI * 0.35,
    radius: 220
  };

  private isPinching: boolean = false;
  private initialPinchDistance: number = 0;
  private initialPinchRadius: number = 220;

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.galaxyParticles = new GalaxyParticles(this.scene);
    this.ui = new GalaxyUI(this.galaxyParticles);

    this.addBackgroundStars();
    this.bindEvents();
    this.animate();
  }

  private addBackgroundStars(): void {
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aSize;
        uniform float uTime;
        varying float vOpacity;
        void main() {
          float twinkle = sin(uTime * 1.5 + position.x * 0.01 + position.y * 0.01) * 0.3 + 0.7;
          vOpacity = twinkle;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vOpacity * 0.8;
          gl_FragColor = vec4(0.8, 0.85, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);

    const startTime = performance.now();
    const originalRender = this.renderer.render.bind(this.renderer);
    this.renderer.render = (scene, camera) => {
      material.uniforms.uTime.value = (performance.now() - startTime) / 1000;
      return originalRender(scene, camera);
    };
  }

  private updateCameraPosition(): void {
    this.camera.position.x =
      this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z =
      this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.lookAt(0, 0, 0);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetSpherical.theta -= deltaX * 0.005;
      this.targetSpherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.targetSpherical.phi + deltaY * 0.005)
      );

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.targetSpherical.radius = Math.max(
        80,
        Math.min(500, this.targetSpherical.radius * zoomFactor)
      );
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.isPinching = true;
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        this.initialPinchRadius = this.targetSpherical.radius;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

        this.targetSpherical.theta -= deltaX * 0.005;
        this.targetSpherical.phi = Math.max(
          0.1,
          Math.min(Math.PI - 0.1, this.targetSpherical.phi + deltaY * 0.005)
        );

        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (this.isPinching && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = this.initialPinchDistance / distance;
        this.targetSpherical.radius = Math.max(
          80,
          Math.min(500, this.initialPinchRadius * scale)
        );
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
      this.isPinching = false;
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const smoothing = 0.08;
    this.spherical.theta = this.lerp(this.spherical.theta, this.targetSpherical.theta, smoothing);
    this.spherical.phi = this.lerp(this.spherical.phi, this.targetSpherical.phi, smoothing);
    this.spherical.radius = this.lerp(this.spherical.radius, this.targetSpherical.radius, smoothing);
    this.updateCameraPosition();

    this.galaxyParticles.update();

    this.renderer.render(this.scene, this.camera);
    this.ui.updateFps(performance.now());
  };
}

new GalaxyScene();
