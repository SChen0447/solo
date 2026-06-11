import * as THREE from 'three';
import type { CreaseLine } from './presets';
import { GRID_SIZE } from './presets';

interface FoldState {
  progress: number;
  angle: number;
  isAnimating: boolean;
  isFolded: boolean;
}

export class FoldEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private paperMesh: THREE.Mesh | null = null;
  private creaseLines: CreaseLine[] = [];
  private foldAngle: number = 90;
  private foldState: FoldState = {
    progress: 0,
    angle: 90,
    isAnimating: false,
    isFolded: false
  };
  private animationId: number | null = null;
  private animationStartTime: number = 0;
  private animationDuration: number = 2000;
  private onAnimationComplete: (() => void) | null = null;
  
  private rotationVelocity = { x: 0, y: 0 };
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private inertiaFactor = 0.4;
  private cameraDistance = 5;
  private cameraTheta = 0;
  private cameraPhi = Math.PI / 4;
  
  private baseVertices: THREE.Vector3[] = [];
  private paperSize = 2;
  private segments = 16;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.updateCameraPosition();
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.appendChild(this.renderer.domElement);
    
    this.setupLights();
    this.createPaper();
    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0xf5f0e1, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private createPaper(): void {
    const geometry = new THREE.PlaneGeometry(
      this.paperSize,
      this.paperSize,
      this.segments,
      this.segments
    );
    
    const positions = geometry.attributes.position;
    this.baseVertices = [];
    
    for (let i = 0; i < positions.count; i++) {
      this.baseVertices.push(new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      ));
    }
    
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#f5f0e1');
    gradient.addColorStop(1, '#e8dcc8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - size * 0.2, size);
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false
    });
    
    this.paperMesh = new THREE.Mesh(geometry, material);
    this.paperMesh.castShadow = true;
    this.paperMesh.receiveShadow = true;
    
    this.paperMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.paperMesh);
  }

  setCreases(creases: CreaseLine[]): void {
    this.creaseLines = [...creases];
  }

  setFoldAngle(angle: number): void {
    this.foldAngle = angle;
    if (this.foldState.isFolded) {
      this.foldState.angle = angle;
      this.updatePaperGeometry();
    }
  }

  getFoldAngle(): number {
    return this.foldAngle;
  }

  isFolded(): boolean {
    return this.foldState.isFolded;
  }

  isAnimating(): boolean {
    return this.foldState.isAnimating;
  }

  fold(onComplete?: () => void): void {
    if (this.foldState.isAnimating || this.foldState.isFolded) return;
    if (this.creaseLines.length === 0) return;
    
    this.onAnimationComplete = onComplete || null;
    this.foldState.isAnimating = true;
    this.foldState.progress = 0;
    this.foldState.angle = 0;
    this.animationStartTime = performance.now();
    this.animationDuration = 2000;
  }

  unfold(onComplete?: () => void): void {
    if (this.foldState.isAnimating || !this.foldState.isFolded) return;
    
    this.onAnimationComplete = onComplete || null;
    this.foldState.isAnimating = true;
    this.foldState.progress = 1;
    this.foldState.angle = this.foldAngle;
    this.animationStartTime = performance.now();
    this.animationDuration = 1500;
  }

  resetView(): void {
    this.cameraTheta = 0;
    this.cameraPhi = Math.PI / 4;
    this.cameraDistance = 5;
    this.rotationVelocity = { x: 0, y: 0 };
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.foldState.isFolded && !this.foldState.isAnimating) return;
    
    this.isDragging = true;
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.rotationVelocity = { x: 0, y: 0 };
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    
    const deltaX = e.clientX - this.lastMousePos.x;
    const deltaY = e.clientY - this.lastMousePos.y;
    
    this.cameraTheta += deltaX * 0.01;
    this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.01));
    
    this.rotationVelocity = {
      x: deltaY * 0.01 * this.inertiaFactor,
      y: deltaX * 0.01 * this.inertiaFactor
    };
    
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.updateCameraPosition();
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const zoomSpeed = 0.001;
    this.cameraDistance += e.deltaY * zoomSpeed * this.cameraDistance;
    this.cameraDistance = Math.max(2.5, Math.min(15, this.cameraDistance));
    this.updateCameraPosition();
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.foldState.isFolded && !this.foldState.isAnimating) return;
    if (e.touches.length !== 1) return;
    
    e.preventDefault();
    this.isDragging = true;
    this.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    this.rotationVelocity = { x: 0, y: 0 };
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    
    e.preventDefault();
    const deltaX = e.touches[0].clientX - this.lastMousePos.x;
    const deltaY = e.touches[0].clientY - this.lastMousePos.y;
    
    this.cameraTheta += deltaX * 0.01;
    this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.01));
    
    this.rotationVelocity = {
      x: deltaY * 0.01 * this.inertiaFactor,
      y: deltaX * 0.01 * this.inertiaFactor
    };
    
    this.lastMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    this.updateCameraPosition();
  }

  private handleTouchEnd(_e: TouchEvent): void {
    this.isDragging = false;
  }

  private easeInOut(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    if (this.foldState.isAnimating) {
      this.updateAnimation();
    }
    
    if (!this.isDragging) {
      this.applyInertia();
    }
    
    this.renderer.render(this.scene, this.camera);
  };

  private updateAnimation(): void {
    const now = performance.now();
    const elapsed = now - this.animationStartTime;
    let t = Math.min(1, elapsed / this.animationDuration);
    
    const isFolding = !this.foldState.isFolded;
    const easedT = this.easeInOut(isFolding ? t : 1 - t);
    
    this.foldState.progress = easedT;
    this.foldState.angle = this.foldAngle * easedT;
    
    this.updatePaperGeometry();
    
    if (t >= 1) {
      this.foldState.isAnimating = false;
      this.foldState.isFolded = isFolding;
      
      if (isFolding) {
        this.resetView();
      }
      
      if (this.onAnimationComplete) {
        const callback = this.onAnimationComplete;
        this.onAnimationComplete = null;
        callback();
      }
    }
  }

  private applyInertia(): void {
    if (Math.abs(this.rotationVelocity.x) < 0.001 && Math.abs(this.rotationVelocity.y) < 0.001) return;
    
    this.cameraTheta += this.rotationVelocity.y;
    this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + this.rotationVelocity.x));
    
    this.rotationVelocity.x *= 0.95;
    this.rotationVelocity.y *= 0.95;
    
    this.updateCameraPosition();
  }

  private updatePaperGeometry(): void {
    if (!this.paperMesh) return;
    
    const geometry = this.paperMesh.geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const baseVertex = this.baseVertices[i];
      const foldedVertex = this.calculateFoldedVertex(
        baseVertex.x,
        baseVertex.y
      );
      
      positions.setXYZ(i, foldedVertex.x, foldedVertex.y, foldedVertex.z);
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private calculateFoldedVertex(x: number, y: number): THREE.Vector3 {
    const result = new THREE.Vector3(x, 0, -y);
    
    if (this.creaseLines.length === 0 || this.foldState.progress <= 0) {
      return result;
    }
    
    const halfSize = this.paperSize / 2;
    const gridX = ((x + halfSize) / this.paperSize) * GRID_SIZE;
    const gridY = ((-y + halfSize) / this.paperSize) * GRID_SIZE;
    
    let totalZ = 0;
    let totalWeight = 0;
    
    for (const crease of this.creaseLines) {
      const distance = this.pointToLineDistanceGrid(
        gridX, gridY,
        crease.startX, crease.startY,
        crease.endX, crease.endY
      );
      
      const side = this.pointLineSide(
        gridX, gridY,
        crease.startX, crease.startY,
        crease.endX, crease.endY
      );
      
      const direction = crease.type === 'mountain' ? 1 : -1;
      const foldAmount = direction * side;
      
      const influence = Math.max(0, 1 - distance / 3);
      const weight = influence * influence;
      
      const angleRad = (this.foldState.angle * Math.PI / 180) * this.foldState.progress;
      const zOffset = Math.sin(angleRad) * foldAmount * 0.3 * weight;
      
      totalZ += zOffset;
      totalWeight += weight;
    }
    
    if (totalWeight > 0) {
      result.y = totalZ * 2;
    }
    
    return result;
  }

  private pointToLineDistanceGrid(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private pointLineSide(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const cross = (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
    return cross > 0 ? 1 : cross < 0 ? -1 : 0;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
    canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    
    this.renderer.dispose();
    this.scene.clear();
  }
}
