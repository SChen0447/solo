import * as THREE from 'three';
import type { ArtifactData, HotspotInfo } from './modelLoader';

export interface InteractionOptions {
  container: HTMLElement;
  camera: THREE.PerspectiveCamera;
  targetGroup: THREE.Group;
  artifactData: ArtifactData;
  onHotspotHover?: (hotspotInfo: HotspotInfo | null) => void;
  onZoomChange?: (scale: number) => void;
}

const INITIAL_ROTATION = { x: 0.3, y: 0.5 };
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const INERTIA_FACTOR = 0.95;
const ROTATION_SPEED = 0.005;
const ZOOM_SPEED = 0.001;
const RESET_DURATION = 300;

export class InteractionManager {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private targetGroup: THREE.Group;
  private artifactData: ArtifactData;
  private onHotspotHover?: (hotspotInfo: HotspotInfo | null) => void;
  private onZoomChange?: (scale: number) => void;
  
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;
  private rotationVelocityX = 0;
  private rotationVelocityY = 0;
  
  private targetScale = 1.0;
  private currentScale = 1.0;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private targetRotationX = INITIAL_ROTATION.x;
  private targetRotationY = INITIAL_ROTATION.y;
  private currentRotationX = INITIAL_ROTATION.x;
  private currentRotationY = INITIAL_ROTATION.y;
  
  private isResetting = false;
  private resetStartTime = 0;
  private resetStartRotationX = 0;
  private resetStartRotationY = 0;
  private resetStartScale = 1;
  
  private hoveredHotspot: THREE.Mesh | null = null;
  
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnMouseLeave: (e: MouseEvent) => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnContextMenu: (e: MouseEvent) => void;
  
  constructor(options: InteractionOptions) {
    this.container = options.container;
    this.camera = options.camera;
    this.targetGroup = options.targetGroup;
    this.artifactData = options.artifactData;
    this.onHotspotHover = options.onHotspotHover;
    this.onZoomChange = options.onZoomChange;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnContextMenu = this.onContextMenu.bind(this);
    
    this.setupEventListeners();
  }
  
  public setTargetGroup(group: THREE.Group): void {
    group.rotation.x = this.targetGroup.rotation.x;
    group.rotation.y = this.targetGroup.rotation.y;
    group.scale.copy(this.targetGroup.scale);
    this.targetGroup = group;
  }
  
  public setArtifactData(artifactData: ArtifactData): void {
    this.artifactData = artifactData;
    this.hoveredHotspot = null;
    if (this.onHotspotHover) {
      this.onHotspotHover(null);
    }
  }
  
  private setupEventListeners(): void {
    this.container.addEventListener('mousedown', this.boundOnMouseDown);
    this.container.addEventListener('mousemove', this.boundOnMouseMove);
    this.container.addEventListener('mouseup', this.boundOnMouseUp);
    this.container.addEventListener('mouseleave', this.boundOnMouseLeave);
    this.container.addEventListener('wheel', this.boundOnWheel, { passive: false });
    this.container.addEventListener('contextmenu', this.boundOnContextMenu);
  }
  
  public dispose(): void {
    this.container.removeEventListener('mousedown', this.boundOnMouseDown);
    this.container.removeEventListener('mousemove', this.boundOnMouseMove);
    this.container.removeEventListener('mouseup', this.boundOnMouseUp);
    this.container.removeEventListener('mouseleave', this.boundOnMouseLeave);
    this.container.removeEventListener('wheel', this.boundOnWheel);
    this.container.removeEventListener('contextmenu', this.boundOnContextMenu);
  }
  
  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      this.rotationVelocityX = 0;
      this.rotationVelocityY = 0;
      this.isResetting = false;
    }
  }
  
  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;
      
      this.rotationVelocityY = deltaX * ROTATION_SPEED;
      this.rotationVelocityX = deltaY * ROTATION_SPEED;
      
      this.targetRotationY += this.rotationVelocityY;
      this.targetRotationX += this.rotationVelocityX;
      
      this.targetRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.targetRotationX));
      
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    }
    
    this.checkHotspotHover(e);
  }
  
  private onMouseUp(): void {
    this.isDragging = false;
  }
  
  private onMouseLeave(): void {
    this.isDragging = false;
  }
  
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const zoomDelta = -e.deltaY * ZOOM_SPEED;
    this.targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.targetScale + zoomDelta));
    
    if (this.onZoomChange) {
      this.onZoomChange(this.targetScale);
    }
  }
  
  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    this.resetView();
  }
  
  public resetView(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetStartRotationX = this.currentRotationX;
    this.resetStartRotationY = this.currentRotationY;
    this.resetStartScale = this.currentScale;
    this.targetScale = 1.0;
    this.targetRotationX = INITIAL_ROTATION.x;
    this.targetRotationY = INITIAL_ROTATION.y;
    this.rotationVelocityX = 0;
    this.rotationVelocityY = 0;
  }
  
  private checkHotspotHover(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const hotspotMeshes = this.artifactData.hotspots.map(h => h.mesh);
    const intersects = this.raycaster.intersectObjects(hotspotMeshes, false);
    
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      
      if (this.hoveredHotspot !== hitMesh) {
        if (this.hoveredHotspot) {
          this.setHotspotGlow(this.hoveredHotspot, 0);
        }
        
        this.hoveredHotspot = hitMesh;
        this.setHotspotGlow(hitMesh, 0.4);
        
        const hotspot = this.artifactData.hotspots.find(h => h.mesh === hitMesh);
        if (hotspot && this.onHotspotHover) {
          this.onHotspotHover(hotspot.info);
        }
      }
      
      this.container.style.cursor = 'pointer';
    } else {
      if (this.hoveredHotspot) {
        this.setHotspotGlow(this.hoveredHotspot, 0);
        this.hoveredHotspot = null;
        
        if (this.onHotspotHover) {
          this.onHotspotHover(null);
        }
      }
      
      this.container.style.cursor = this.isDragging ? 'grabbing' : 'grab';
    }
  }
  
  private setHotspotGlow(mesh: THREE.Mesh, opacity: number): void {
    const hotspot = this.artifactData.hotspots.find(h => h.mesh === mesh);
    if (hotspot && hotspot.glowMesh) {
      const material = hotspot.glowMesh.material as THREE.MeshBasicMaterial;
      material.opacity = opacity;
      material.transparent = true;
    }
  }
  
  public update(): void {
    const now = performance.now();
    
    if (this.isResetting) {
      const elapsed = now - this.resetStartTime;
      const t = Math.min(elapsed / RESET_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      
      this.currentRotationX = this.resetStartRotationX + (INITIAL_ROTATION.x - this.resetStartRotationX) * eased;
      this.currentRotationY = this.resetStartRotationY + (INITIAL_ROTATION.y - this.resetStartRotationY) * eased;
      this.currentScale = this.resetStartScale + (1.0 - this.resetStartScale) * eased;
      
      if (t >= 1) {
        this.isResetting = false;
      }
    } else {
      if (!this.isDragging) {
        this.targetRotationX += this.rotationVelocityX;
        this.targetRotationY += this.rotationVelocityY;
        
        this.targetRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.targetRotationX));
        
        this.rotationVelocityX *= INERTIA_FACTOR;
        this.rotationVelocityY *= INERTIA_FACTOR;
        
        if (Math.abs(this.rotationVelocityX) < 0.0001) this.rotationVelocityX = 0;
        if (Math.abs(this.rotationVelocityY) < 0.0001) this.rotationVelocityY = 0;
      }
      
      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.15;
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.15;
      
      this.currentScale += (this.targetScale - this.currentScale) * 0.1;
    }
    
    this.targetGroup.rotation.x = this.currentRotationX;
    this.targetGroup.rotation.y = this.currentRotationY;
    this.targetGroup.scale.setScalar(this.currentScale);
    
    this.updateGridLines();
  }
  
  private updateGridLines(): void {
    const gridLines = this.artifactData.gridLines;
    if (gridLines && gridLines.material) {
      const material = gridLines.material as THREE.LineBasicMaterial;
      if (this.currentScale >= 1.5) {
        const targetOpacity = 0.3;
        material.opacity += (targetOpacity - material.opacity) * 0.1;
      } else {
        material.opacity *= 0.9;
        if (material.opacity < 0.001) material.opacity = 0;
      }
      material.transparent = true;
    }
  }
  
  public getCurrentScale(): number {
    return this.currentScale;
  }
  
  public setInitialScale(scale: number): void {
    this.currentScale = scale;
    this.targetScale = scale;
  }
}
