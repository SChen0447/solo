import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sculpture } from './sculpture';
import { AudioReactor } from './audioReactor';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private sculpture: Sculpture;
  private audioReactor: AudioReactor;

  private particles: THREE.Points;
  private particlePositions: Float32Array;
  private particleBasePositions: Float32Array;
  private particleBursts: Float32Array;

  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;
  private sculpturePlane: THREE.Plane;

  private clock: THREE.Clock;
  private lastTime: number = 0;

  private isRightMouseDown: boolean = false;
  private isLeftMouseDown: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownPos: THREE.Vector2 = new THREE.Vector2();
  private lastClickTime: number = 0;

  private particleAngle: number = 0;

  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    const container = document.getElementById('app');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.mouseButtons = {
      LEFT: null as any,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };

    this.sculpture = new Sculpture({
      radius: 1.5,
      segments: 60,
      colorCenter: new THREE.Color(0x00d4ff),
      colorEdge: new THREE.Color(0x0055ff),
      opacity: 0.6
    });
    this.scene.add(this.sculpture.mesh);

    this.audioReactor = new AudioReactor();

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.sculpturePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const particleCount = 500;
    const particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(particleCount * 3);
    this.particleBasePositions = new Float32Array(particleCount * 3);
    this.particleBursts = new Float32Array(particleCount).fill(0);

    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = (Math.random() - 0.5) * 1.5;
      const z = radius * Math.sin(phi) * Math.sin(theta);

      this.particlePositions[i * 3] = x;
      this.particlePositions[i * 3 + 1] = y;
      this.particlePositions[i * 3 + 2] = z;

      this.particleBasePositions[i * 3] = x;
      this.particleBasePositions[i * 3 + 1] = y;
      this.particleBasePositions[i * 3 + 2] = z;

      sizes[i] = 1 + Math.random() * 2;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);

    this.clock = new THREE.Clock();

    this.setupEvents();
    this.animate();
  }

  private setupEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => this.onResize());
  }

  private getMouseWorldPosition(event: MouseEvent): THREE.Vector2 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.sculpturePlane, intersectPoint);

    if (intersectPoint) {
      return new THREE.Vector2(intersectPoint.x, intersectPoint.z);
    }
    return null;
  }

  private onMouseMove(event: MouseEvent): void {
    const worldPos = this.getMouseWorldPosition(event);

    if (worldPos) {
      this.sculpture.setMousePosition(worldPos.x, worldPos.y);

      if (this.isLeftMouseDown) {
        this.sculpture.onMouseMoveWhileDown(worldPos.x, worldPos.y);
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isLeftMouseDown = true;
      this.mouseDownTime = performance.now();
      this.mouseDownPos.set(event.clientX, event.clientY);

      const worldPos = this.getMouseWorldPosition(event);
      if (worldPos) {
        this.sculpture.onMouseDown(worldPos.x, worldPos.y);
      }

      this.audioReactor.init();
      this.audioReactor.resume();
    }

    if (event.button === 2) {
      this.isRightMouseDown = true;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      const now = performance.now();
      const dt = now - this.mouseDownTime;
      const dx = event.clientX - this.mouseDownPos.x;
      const dy = event.clientY - this.mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dt < 300 && dist < 5) {
        const timeSinceLastClick = now - this.lastClickTime;
        if (timeSinceLastClick < 300) {
          this.sculpture.toggleAutoMode();
        } else {
          const worldPos = this.getMouseWorldPosition(event);
          if (worldPos) {
            this.sculpture.onClick(worldPos.x, worldPos.y);
            this.audioReactor.playRippleTone(1.5);
            this.triggerParticleBurst(worldPos.x, worldPos.y);
          }
        }
        this.lastClickTime = now;
      }

      this.isLeftMouseDown = false;
      this.sculpture.onMouseUp();
    }

    if (event.button === 2) {
      this.isRightMouseDown = false;
    }
  }

  private onMouseLeave(): void {
    if (this.isLeftMouseDown) {
      this.isLeftMouseDown = false;
      this.sculpture.onMouseUp();
    }
    this.isRightMouseDown = false;
  }

  private triggerParticleBurst(x: number, y: number): void {
    const particleCount = this.particleBursts.length;
    for (let i = 0; i < particleCount; i++) {
      const px = this.particleBasePositions[i * 3];
      const pz = this.particleBasePositions[i * 3 + 2];
      const dist = Math.sqrt((px - x) ** 2 + (pz - y) ** 2);

      if (dist < 2) {
        this.particleBursts[i] = 1.0;
      }
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateParticles(deltaTime: number): void {
    const particleCount = this.particleBursts.length;
    const positions = this.particles.geometry.attributes.position.array as Float32Array;

    this.particleAngle += 0.01 * deltaTime;

    for (let i = 0; i < particleCount; i++) {
      const bx = this.particleBasePositions[i * 3];
      const by = this.particleBasePositions[i * 3 + 1];
      const bz = this.particleBasePositions[i * 3 + 2];

      const rotAngle = this.particleAngle + i * 0.001;
      const cosA = Math.cos(rotAngle);
      const sinA = Math.sin(rotAngle);

      const rx = bx * cosA - bz * sinA;
      const rz = bx * sinA + bz * cosA;

      const burst = this.particleBursts[i];
      const burstOffset = burst * 0.5;

      const dx = bx;
      const dy = by;
      const dz = bz;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      positions[i * 3] = rx + (dx / len) * burstOffset;
      positions[i * 3 + 1] = by + Math.sin(this.particleAngle * 2 + i * 0.1) * 0.05 + (dy / len) * burstOffset;
      positions[i * 3 + 2] = rz + (dz / len) * burstOffset;

      this.particleBursts[i] *= Math.pow(0.95, deltaTime * 60);
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.lastTime += deltaTime;

    this.controls.update();

    this.sculpture.update(deltaTime);

    this.audioReactor.setTwistSound(this.sculpture.getColorShift() * Math.PI * 2);
    this.audioReactor.update();

    this.updateParticles(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
