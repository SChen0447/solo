import * as THREE from 'three';
import gsap from 'gsap';
import { ParticleCloud } from './particleCloud';

const PRESET_COLORS = [
  { name: '火焰红', hex: '#ff2200', value: new THREE.Color(0xff2200) },
  { name: '极光绿', hex: '#00ff88', value: new THREE.Color(0x00ff88) },
  { name: '深海蓝', hex: '#0066ff', value: new THREE.Color(0x0066ff) },
  { name: '星云紫', hex: '#aa00ff', value: new THREE.Color(0xaa00ff) },
  { name: '熔岩橙', hex: '#ff6600', value: new THREE.Color(0xff6600) },
  { name: '冰晶白', hex: '#ccddff', value: new THREE.Color(0xccddff) },
  { name: '日落粉', hex: '#ff66aa', value: new THREE.Color(0xff66aa) },
  { name: '暗黑银', hex: '#667788', value: new THREE.Color(0x667788) },
];

export class Interaction {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleCloud: ParticleCloud;

  private isDragging: boolean = false;
  private hasMoved: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private azimuth: number = 0;
  private elevation: number = 20;
  private targetAzimuth: number = 0;
  private targetElevation: number = 20;

  private cameraDistance: number = 300;
  private targetDistance: number = 300;

  private selectedColorIndex: number = 0;
  private paletteElement: HTMLElement | null = null;
  private swatchElements: HTMLElement[] = [];

  private velocityAzimuth: number = 0;
  private velocityElevation: number = 0;

  private raycaster: THREE.Raycaster;
  private clickPlane: THREE.Plane;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    particleCloud: ParticleCloud
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.particleCloud = particleCloud;

    this.raycaster = new THREE.Raycaster();
    this.clickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.setupPalette();
    this.bindEvents();
    this.updateCameraPosition();
  }

  private setupPalette(): void {
    this.paletteElement = document.getElementById('color-palette');
    if (!this.paletteElement) return;

    const containerSize = 60;
    const swatchRadius = 18;

    for (let i = 0; i < PRESET_COLORS.length; i++) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.background = PRESET_COLORS[i].hex;
      swatch.title = PRESET_COLORS[i].name;

      const angle = (i / PRESET_COLORS.length) * Math.PI * 2 - Math.PI / 2;
      const x = containerSize / 2 + Math.cos(angle) * swatchRadius - 6;
      const y = containerSize / 2 + Math.sin(angle) * swatchRadius - 6;
      swatch.style.left = `${x}px`;
      swatch.style.top = `${y}px`;

      if (i === 0) {
        swatch.classList.add('active');
      }

      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedColorIndex = i;
        this.swatchElements.forEach((s, idx) => {
          if (idx === i) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });

      this.paletteElement.appendChild(swatch);
      this.swatchElements.push(swatch);
    }

    this.paletteElement.addEventListener('mouseenter', () => {
      if (this.paletteElement) {
        this.paletteElement.style.width = '80px';
        this.paletteElement.style.height = '80px';
        this.paletteElement.style.background = 'rgba(40, 40, 40, 1)';
      }
    });

    this.paletteElement.addEventListener('mouseleave', () => {
      if (this.paletteElement) {
        this.paletteElement.style.width = '60px';
        this.paletteElement.style.height = '60px';
        this.paletteElement.style.background = 'rgba(40, 40, 40, 0.5)';
      }
    });
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('click', this.onClick.bind(this));

    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.hasMoved = false;
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
      this.velocityAzimuth = 0;
      this.velocityElevation = 0;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      this.hasMoved = true;
    }

    this.velocityAzimuth = deltaX * 0.3;
    this.velocityElevation = deltaY * 0.3;

    this.targetAzimuth += deltaX * 0.3;
    this.targetElevation -= deltaY * 0.3;

    this.targetElevation = Math.max(-60, Math.min(60, this.targetElevation));

    this.previousMouse.x = e.clientX;
    this.previousMouse.y = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetDistance += e.deltaY * 0.3;
    this.targetDistance = Math.max(50, Math.min(500, this.targetDistance));

    gsap.to(this, {
      cameraDistance: this.targetDistance,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => this.updateCameraPosition(),
    });
  }

  private onClick(e: MouseEvent): void {
    if (this.hasMoved) return;

    const paletteEl = document.getElementById('color-palette');
    if (paletteEl) {
      const rect = paletteEl.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        return;
      }
    }

    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.clickPlane.setFromNormalAndCoplanarPoint(
      direction.negate(),
      new THREE.Vector3(0, 0, 0)
    );

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.clickPlane, intersection);

    if (intersection) {
      this.particleCloud.triggerDyeWave(
        intersection,
        PRESET_COLORS[this.selectedColorIndex].value
      );
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'r' || e.key === 'R') {
      this.particleCloud.reset();
      this.azimuth = 0;
      this.elevation = 20;
      this.targetAzimuth = 0;
      this.targetElevation = 20;
      this.targetDistance = 300;
      gsap.to(this, {
        cameraDistance: 300,
        azimuth: 0,
        elevation: 20,
        duration: 1,
        ease: 'power2.inOut',
        onUpdate: () => this.updateCameraPosition(),
      });
    }

    if (e.key === ' ') {
      e.preventDefault();
      this.particleCloud.togglePause();
    }
  }

  update(): void {
    if (!this.isDragging) {
      this.velocityAzimuth *= 0.9;
      this.velocityElevation *= 0.9;
      this.targetAzimuth += this.velocityAzimuth;
      this.targetElevation += this.velocityElevation;
      this.targetElevation = Math.max(-60, Math.min(60, this.targetElevation));

      if (Math.abs(this.velocityAzimuth) < 0.01) this.velocityAzimuth = 0;
      if (Math.abs(this.velocityElevation) < 0.01) this.velocityElevation = 0;
    }

    const lerpFactor = 1 - Math.pow(0.001, 0.016);
    this.azimuth += (this.targetAzimuth - this.azimuth) * lerpFactor;
    this.elevation += (this.targetElevation - this.elevation) * lerpFactor;

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const elevRad = THREE.MathUtils.degToRad(this.elevation);
    const azimRad = THREE.MathUtils.degToRad(this.azimuth);

    const x = this.cameraDistance * Math.cos(elevRad) * Math.sin(azimRad);
    const y = this.cameraDistance * Math.sin(elevRad);
    const z = this.cameraDistance * Math.cos(elevRad) * Math.cos(azimRad);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  getCameraDistance(): number {
    return this.cameraDistance;
  }

  getSelectedColor(): THREE.Color {
    return PRESET_COLORS[this.selectedColorIndex].value;
  }
}
