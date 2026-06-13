import * as THREE from 'three';
import { Sculptor, SculptParams } from './sculptor';

const COLOR_TEMP_3000K = 0xffc48f;

class ClaySculptorApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clayMesh!: THREE.Mesh;
  private discMesh!: THREE.Mesh;
  private discGlow!: THREE.Mesh;
  private sculptor!: Sculptor;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isSculpting: boolean = false;
  private isRotating: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private lastSculptPoint: THREE.Vector3 | null = null;

  private cameraDistance: number = 5;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private targetTheta: number = Math.PI / 4;
  private targetPhi: number = Math.PI / 3;
  private targetDistance: number = 5;

  private sculptParams: SculptParams = {
    radius: 0.2,
    strength: 0.5,
    direction: 'dent'
  };

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private readonly RESET_DURATION: number = 500;

  private lastSculptHitPoint: THREE.Vector3 | null = null;

  private touchStartDist: number = 0;
  private touchStartDistance: number = 5;
  private isPinching: boolean = false;

  private brushCursor: HTMLElement;
  private loadingOverlay: HTMLElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.brushCursor = document.getElementById('brush-cursor')!;
    this.loadingOverlay = document.getElementById('loading-overlay')!;

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupLights();
    this.createDisc();
    this.createClaySphere();
    this.setupCamera();
    this.setupEventListeners();
    this.animate();

    setTimeout(() => {
      this.loadingOverlay.classList.add('hidden');
    }, 800);
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById('canvas-container');
    container?.appendChild(this.renderer.domElement);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404550, 0.4);
    this.scene.add(ambient);

    const warmLight = new THREE.PointLight(COLOR_TEMP_3000K, 1.2, 15);
    warmLight.position.set(3, 4, 3);
    warmLight.castShadow = true;
    warmLight.shadow.mapSize.width = 1024;
    warmLight.shadow.mapSize.height = 1024;
    this.scene.add(warmLight);

    const rimLight = new THREE.PointLight(0x6688cc, 0.6, 10);
    rimLight.position.set(-3, 2, -3);
    this.scene.add(rimLight);

    const ringLight = new THREE.PointLight(COLOR_TEMP_3000K, 0.8, 8);
    ringLight.position.set(0, -0.8, 0);
    this.scene.add(ringLight);
  }

  private createDisc(): void {
    const discGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.15, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a22,
      metalness: 0.8,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9
    });
    this.discMesh = new THREE.Mesh(discGeo, discMat);
    this.discMesh.position.y = -1.07;
    this.discMesh.receiveShadow = true;
    this.scene.add(this.discMesh);

    const glowGeo = new THREE.TorusGeometry(1.75, 0.03, 8, 128);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.6
    });
    this.discGlow = new THREE.Mesh(glowGeo, glowMat);
    this.discGlow.rotation.x = Math.PI / 2;
    this.discGlow.position.y = -0.99;
    this.scene.add(this.discGlow);
  }

  private createClaySphere(): void {
    const geometry = new THREE.SphereGeometry(1, 96, 96);
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const noise = (Math.sin(x * 10) * Math.cos(y * 10) * Math.sin(z * 10)) * 0.01;
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len > 0) {
        positions.setX(i, x + (x / len) * noise);
        positions.setY(i, y + (y / len) * noise);
        positions.setZ(i, z + (z / len) * noise);
      }
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0xd8d4cc,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false
    });

    this.clayMesh = new THREE.Mesh(geometry, material);
    this.clayMesh.castShadow = true;
    this.clayMesh.receiveShadow = true;
    this.scene.add(this.clayMesh);

    this.sculptor = new Sculptor(geometry);
  }

  private setupCamera(): void {
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    this.setupControlPanel();
  }

  private setupControlPanel(): void {
    const radiusSlider = document.getElementById('brush-radius') as HTMLInputElement;
    const radiusFill = document.getElementById('brush-radius-fill');
    const radiusValue = document.getElementById('brush-radius-value');

    radiusSlider.addEventListener('input', () => {
      this.sculptParams.radius = parseFloat(radiusSlider.value);
      const pct = ((this.sculptParams.radius - 0.1) / 0.4) * 100;
      if (radiusFill) radiusFill.style.width = pct + '%';
      if (radiusValue) radiusValue.textContent = this.sculptParams.radius.toFixed(2);
      this.updateBrushCursorSize();
    });

    const strengthSlider = document.getElementById('strength') as HTMLInputElement;
    const strengthFill = document.getElementById('strength-fill');
    const strengthValue = document.getElementById('strength-value');

    strengthSlider.addEventListener('input', () => {
      this.sculptParams.strength = parseFloat(strengthSlider.value);
      const pct = ((this.sculptParams.strength - 0.1) / 0.9) * 100;
      if (strengthFill) strengthFill.style.width = pct + '%';
      if (strengthValue) strengthValue.textContent = this.sculptParams.strength.toFixed(2);
    });

    const directionToggle = document.getElementById('direction-toggle');
    directionToggle?.addEventListener('click', () => {
      directionToggle.classList.toggle('flipped');
      this.sculptParams.direction = this.sculptParams.direction === 'dent' ? 'bulge' : 'dent';
      this.brushCursor.classList.toggle('bulge');
    });
  }

  private updateBrushCursorSize(): void {
    const radiusPx = this.sculptParams.radius * 120;
    this.brushCursor.style.width = radiusPx * 2 + 'px';
    this.brushCursor.style.height = radiusPx * 2 + 'px';
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.updateMousePosition(e);
      const hitPoint = this.raycastClay();
      
      if (hitPoint) {
        this.isSculpting = true;
        this.lastSculptPoint = hitPoint.clone();
        this.lastSculptHitPoint = hitPoint.clone();
        this.sculptor.sculpt(hitPoint, this.sculptParams);
      } else {
        this.isRotating = true;
      }
      
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e);
    this.brushCursor.style.left = e.clientX + 'px';
    this.brushCursor.style.top = e.clientY + 'px';

    if (this.isSculpting) {
      const hitPoint = this.raycastClay();
      if (hitPoint) {
        this.lastSculptHitPoint = hitPoint.clone();
        
        const dx = hitPoint.x - (this.lastSculptPoint?.x ?? 0);
        const dy = hitPoint.y - (this.lastSculptPoint?.y ?? 0);
        const dz = hitPoint.z - (this.lastSculptPoint?.z ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const steps = Math.max(1, Math.ceil(dist / (this.sculptParams.radius * 0.3)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const px = (this.lastSculptPoint?.x ?? 0) + dx * t;
          const py = (this.lastSculptPoint?.y ?? 0) + dy * t;
          const pz = (this.lastSculptPoint?.z ?? 0) + dz * t;
          this.sculptor.sculpt(new THREE.Vector3(px, py, pz), this.sculptParams);
        }
        
        this.lastSculptPoint = hitPoint.clone();
      }
    } else if (this.isRotating) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;

      this.targetTheta -= dx * 0.008;
      this.targetPhi -= dy * 0.008;
      this.targetPhi = Math.max(0.15, Math.min(Math.PI - 0.15, this.targetPhi));

      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
  }

  private onMouseUp(): void {
    if (this.isSculpting && this.lastSculptHitPoint) {
      this.sculptor.applyNoise(this.lastSculptHitPoint, this.sculptParams.radius, 0.015);
    }
    this.isSculpting = false;
    this.isRotating = false;
    this.lastSculptPoint = null;
    this.lastSculptHitPoint = null;
  }

  private onMouseEnter(e: MouseEvent): void {
    this.brushCursor.style.display = 'block';
    this.updateBrushCursorSize();
    this.brushCursor.style.left = e.clientX + 'px';
    this.brushCursor.style.top = e.clientY + 'px';
  }

  private onMouseLeave(): void {
    this.brushCursor.style.display = 'none';
    this.isSculpting = false;
    this.isRotating = false;
    this.lastSculptPoint = null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * 0.002;
    this.targetDistance += delta;
    this.targetDistance = Math.max(2.5, Math.min(12, this.targetDistance));
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.updateTouchPosition(touch);
      
      const hitPoint = this.raycastClay();
      if (hitPoint) {
        this.isSculpting = true;
        this.lastSculptPoint = hitPoint.clone();
        this.lastSculptHitPoint = hitPoint.clone();
        this.sculptor.sculpt(hitPoint, this.sculptParams);
      } else {
        this.isRotating = true;
      }
      
      this.lastMousePos = { x: touch.clientX, y: touch.clientY };
      
      this.brushCursor.style.display = 'block';
      this.updateBrushCursorSize();
      this.brushCursor.style.left = touch.clientX + 'px';
      this.brushCursor.style.top = touch.clientY + 'px';
      
    } else if (e.touches.length === 2) {
      this.isPinching = true;
      this.isSculpting = false;
      this.isRotating = false;
      
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      this.touchStartDistance = this.targetDistance;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    
    if (e.touches.length === 1 && !this.isPinching) {
      const touch = e.touches[0];
      this.updateTouchPosition(touch);
      
      this.brushCursor.style.left = touch.clientX + 'px';
      this.brushCursor.style.top = touch.clientY + 'px';
      
      if (this.isSculpting) {
        const hitPoint = this.raycastClay();
        if (hitPoint) {
          this.lastSculptHitPoint = hitPoint.clone();
          
          const dx = hitPoint.x - (this.lastSculptPoint?.x ?? 0);
          const dy = hitPoint.y - (this.lastSculptPoint?.y ?? 0);
          const dz = hitPoint.z - (this.lastSculptPoint?.z ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          const steps = Math.max(1, Math.ceil(dist / (this.sculptParams.radius * 0.3)));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const px = (this.lastSculptPoint?.x ?? 0) + dx * t;
            const py = (this.lastSculptPoint?.y ?? 0) + dy * t;
            const pz = (this.lastSculptPoint?.z ?? 0) + dz * t;
            this.sculptor.sculpt(new THREE.Vector3(px, py, pz), this.sculptParams);
          }
          
          this.lastSculptPoint = hitPoint.clone();
        }
      } else if (this.isRotating) {
        const dx = touch.clientX - this.lastMousePos.x;
        const dy = touch.clientY - this.lastMousePos.y;

        this.targetTheta -= dx * 0.008;
        this.targetPhi -= dy * 0.008;
        this.targetPhi = Math.max(0.15, Math.min(Math.PI - 0.15, this.targetPhi));

        this.lastMousePos = { x: touch.clientX, y: touch.clientY };
      }
      
    } else if (e.touches.length === 2 && this.isPinching) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      
      const scale = this.touchStartDist / currentDist;
      this.targetDistance = this.touchStartDistance * scale;
      this.targetDistance = Math.max(2.5, Math.min(12, this.targetDistance));
    }
  }

  private onTouchEnd(): void {
    if (this.isSculpting && this.lastSculptHitPoint) {
      this.sculptor.applyNoise(this.lastSculptHitPoint, this.sculptParams.radius, 0.015);
    }
    this.isSculpting = false;
    this.isRotating = false;
    this.isPinching = false;
    this.lastSculptPoint = null;
    this.lastSculptHitPoint = null;
    this.brushCursor.style.display = 'none';
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key.toLowerCase() === 'r') {
      this.startResetAnimation();
    }
  }

  private startResetAnimation(): void {
    if (this.isResetting) return;
    this.isResetting = true;
    this.resetStartTime = performance.now();
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateTouchPosition(touch: Touch): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastClay(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.clayMesh);
    
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const inertia = 0.08;
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * inertia;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * inertia;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * inertia;
    this.updateCameraPosition();

    this.discMesh.rotation.y += 0.003;
    this.discGlow.rotation.z += 0.005;

    if (this.isResetting) {
      const elapsed = performance.now() - this.resetStartTime;
      const progress = Math.min(1, elapsed / this.RESET_DURATION);
      
      if (progress >= 1) {
        this.isResetting = false;
        this.sculptor.reset();
      } else {
        this.sculptor.resetAnimated(progress);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new ClaySculptorApp();
