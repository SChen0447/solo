import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StarSystem } from './stars';

export interface CustomMarker {
  id: string;
  name: string;
  note: string;
  color: string;
  x: number;
  y: number;
  z: number;
}

export class ControlSystem {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private starSystem: StarSystem;
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private isAutoTour: boolean = false;
  private autoTourTime: number = 0;
  private tourPath: THREE.Vector3[] = [];
  private tourTargets: { constellationId: string; position: THREE.Vector3 }[] = [];
  private currentTourIndex: number = 0;
  private tourPhase: 'traveling' | 'pausing' = 'traveling';
  private pauseTimer: number = 0;
  private markersGroup: THREE.Group;
  private markers: CustomMarker[] = [];
  private markerMeshes: { [key: string]: THREE.Group } = {};
  private selectedMarkerId: string | null = null;
  private isAddingMarker: boolean = false;
  private pendingMarkerPosition: THREE.Vector3 | null = null;
  private time: number = 0;

  public onTourStatusChange: ((isTouring: boolean) => void) | null = null;
  public onMarkerClick: ((marker: CustomMarker) => void) | null = null;
  public onMarkersChange: ((markers: CustomMarker[]) => void) | null = null;
  public onAddMarkerRequest: ((position: { x: number; y: number; z: number }) => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    starSystem: StarSystem,
    scene: THREE.Scene
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.starSystem = starSystem;
    this.scene = scene;
    this.markersGroup = new THREE.Group();
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();
    this.loadMarkers();
    this.scene.add(this.markersGroup);
    this.generateTourPath();
  }

  private setupControls() {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 500;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.enableKeys = false;
  }

  private generateTourPath() {
    const constellations = this.starSystem.getConstellations();
    this.tourTargets = [];
    
    const importantConstellations = [
      'orion', 'ursa_major', 'ursa_minor', 'leo', 'scorpius',
      'taurus', 'gemini', 'andromeda', 'perseus', 'cygnus',
      'lyra', 'aquila', 'virgo', 'sagittarius', 'canis_major'
    ];

    importantConstellations.forEach(id => {
      if (constellations.find(c => c.id === id)) {
        const center = this.starSystem.getConstellationCenter(id);
        this.tourTargets.push({ constellationId: id, position: center });
      }
    });

    this.tourPath = [];
    for (let i = 0; i < 360; i += 5) {
      const angle = (i * Math.PI) / 180;
      const radius = 150;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle * 2) * 30;
      this.tourPath.push(new THREE.Vector3(x, y, z));
    }
  }

  public update(deltaTime: number) {
    this.time += deltaTime;

    if (this.isAutoTour) {
      this.updateAutoTour(deltaTime);
    } else {
      this.controls.update();
    }

    this.updateMarkerAnimations();
  }

  private updateAutoTour(deltaTime: number) {
    this.autoTourTime += deltaTime;

    if (this.tourPhase === 'traveling') {
      const target = this.tourTargets[this.currentTourIndex];
      if (!target) {
        this.stopAutoTour();
        return;
      }

      const targetPos = target.position.clone();
      const distance = 50;
      const offset = new THREE.Vector3(distance, distance * 0.3, distance);
      const desiredCameraPos = targetPos.clone().add(offset);

      const currentPos = this.camera.position.clone();
      const newPos = currentPos.lerp(desiredCameraPos, 0.01);
      this.camera.position.copy(newPos);
      this.controls.target.lerp(targetPos, 0.02);

      const distToTarget = this.camera.position.distanceTo(desiredCameraPos);
      if (distToTarget < 5) {
        this.tourPhase = 'pausing';
        this.pauseTimer = 2;
        this.starSystem.highlightConstellation(target.constellationId, 2000);
      }
    } else if (this.tourPhase === 'pausing') {
      this.pauseTimer -= deltaTime;
      this.controls.target.copy(this.tourTargets[this.currentTourIndex].position);
      
      const orbitAngle = this.time * 0.2;
      const target = this.tourTargets[this.currentTourIndex].position;
      const radius = 50;
      this.camera.position.x = target.x + Math.cos(orbitAngle) * radius;
      this.camera.position.z = target.z + Math.sin(orbitAngle) * radius;
      this.camera.position.y = target.y + 20;
      this.camera.lookAt(target);

      if (this.pauseTimer <= 0) {
        this.tourPhase = 'traveling';
        this.currentTourIndex = (this.currentTourIndex + 1) % this.tourTargets.length;
      }
    }
  }

  public startAutoTour() {
    if (this.isAutoTour) return;
    this.isAutoTour = true;
    this.currentTourIndex = 0;
    this.tourPhase = 'traveling';
    this.autoTourTime = 0;
    this.controls.enabled = false;
    
    if (this.onTourStatusChange) {
      this.onTourStatusChange(true);
    }
  }

  public stopAutoTour() {
    this.isAutoTour = false;
    this.controls.enabled = true;
    
    if (this.onTourStatusChange) {
      this.onTourStatusChange(false);
    }
  }

  public toggleAutoTour() {
    if (this.isAutoTour) {
      this.stopAutoTour();
    } else {
      this.startAutoTour();
    }
  }

  public resetView() {
    const startPos = new THREE.Vector3(0, 30, 120);
    const startTarget = new THREE.Vector3(0, 0, 0);
    
    this.animateCamera(startPos, startTarget, 1000);
  }

  public flyToConstellation(constellationId: string) {
    const center = this.starSystem.getConstellationCenter(constellationId);
    const distance = 40;
    const targetPos = new THREE.Vector3(
      center.x + distance,
      center.y + distance * 0.5,
      center.z + distance
    );

    this.starSystem.highlightConstellation(constellationId, 3000);
    this.animateCamera(targetPos, center, 1500);
  }

  private animateCamera(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration: number) {
    if (this.isAutoTour) {
      this.stopAutoTour();
    }

    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = this.easeInOutCubic(progress);

      this.camera.position.lerpVectors(startPos, targetPos, easeProgress);
      this.controls.target.lerpVectors(startTarget, targetLookAt, easeProgress);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public flyToMarker(markerId: string) {
    const marker = this.markers.find(m => m.id === markerId);
    if (!marker) return;

    const targetPos = new THREE.Vector3(marker.x, marker.y, marker.z);
    const distance = 30;
    const cameraPos = new THREE.Vector3(
      marker.x + distance,
      marker.y + distance * 0.5,
      marker.z + distance
    );

    this.selectedMarkerId = markerId;
    this.animateCamera(cameraPos, targetPos, 1500);
    this.updateMarkerHighlight();
  }

  private createMarkerMesh(marker: CustomMarker): THREE.Group {
    const group = new THREE.Group();

    const shape = new THREE.Shape();
    const outerRadius = 2;
    const innerRadius = 1;
    const points = 6;

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(marker.color),
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const glowGeometry = new THREE.ShapeGeometry(shape);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(marker.color),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.scale.set(1.8, 1.8, 1);
    group.add(glowMesh);

    group.position.set(marker.x, marker.y, marker.z);
    group.userData = { markerId: marker.id, type: 'marker' };

    return group;
  }

  private updateMarkerAnimations() {
    Object.entries(this.markerMeshes).forEach(([id, mesh]) => {
      const marker = this.markers.find(m => m.id === id);
      if (marker) {
        mesh.rotation.z += 0.01;
        mesh.position.y = marker.y + Math.sin(this.time * 2 + marker.x * 0.1) * 0.8;
        
        if (this.selectedMarkerId === id) {
          const scale = 1 + Math.sin(this.time * 5) * 0.2;
          mesh.scale.set(scale, scale, scale);
        } else {
          mesh.scale.set(1, 1, 1);
        }
      }
    });
  }

  private updateMarkerHighlight() {
    Object.entries(this.markerMeshes).forEach(([id, mesh]) => {
      const material = mesh.children[0].material as THREE.MeshBasicMaterial;
      if (this.selectedMarkerId === id) {
        material.opacity = 1;
      } else {
        material.opacity = 0.9;
      }
    });
  }

  public addMarker(marker: CustomMarker) {
    this.markers.push(marker);
    const mesh = this.createMarkerMesh(marker);
    this.markerMeshes[marker.id] = mesh;
    this.markersGroup.add(mesh);
    this.saveMarkers();
    
    if (this.onMarkersChange) {
      this.onMarkersChange([...this.markers]);
    }
  }

  public deleteMarker(markerId: string) {
    const index = this.markers.findIndex(m => m.id === markerId);
    if (index !== -1) {
      this.markers.splice(index, 1);
      const mesh = this.markerMeshes[markerId];
      if (mesh) {
        this.markersGroup.remove(mesh);
        delete this.markerMeshes[markerId];
      }
      this.saveMarkers();
      
      if (this.selectedMarkerId === markerId) {
        this.selectedMarkerId = null;
      }

      if (this.onMarkersChange) {
        this.onMarkersChange([...this.markers]);
      }
    }
  }

  private saveMarkers() {
    try {
      localStorage.setItem('constellation-markers', JSON.stringify(this.markers));
    } catch (e) {
      console.warn('Failed to save markers to localStorage');
    }
  }

  private loadMarkers() {
    try {
      const saved = localStorage.getItem('constellation-markers');
      if (saved) {
        this.markers = JSON.parse(saved);
        this.markers.forEach(marker => {
          const mesh = this.createMarkerMesh(marker);
          this.markerMeshes[marker.id] = mesh;
          this.markersGroup.add(mesh);
        });
      }
    } catch (e) {
      console.warn('Failed to load markers from localStorage');
    }
  }

  public getMarkers(): CustomMarker[] {
    return [...this.markers];
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public getIsAutoTour(): boolean {
    return this.isAutoTour;
  }

  public getIsAddingMarker(): boolean {
    return this.isAddingMarker;
  }

  public startAddingMarker() {
    this.isAddingMarker = true;
    document.body.style.cursor = 'crosshair';
  }

  public cancelAddingMarker() {
    this.isAddingMarker = false;
    this.pendingMarkerPosition = null;
    document.body.style.cursor = 'default';
  }

  public confirmAddingMarker(name: string, note: string, color: string) {
    if (!this.pendingMarkerPosition) return;

    const marker: CustomMarker = {
      id: 'marker-' + Date.now(),
      name,
      note,
      color,
      x: this.pendingMarkerPosition.x,
      y: this.pendingMarkerPosition.y,
      z: this.pendingMarkerPosition.z
    };

    this.addMarker(marker);
    this.isAddingMarker = false;
    this.pendingMarkerPosition = null;
    document.body.style.cursor = 'default';
  }

  public handleCanvasClick(event: MouseEvent, container: HTMLElement) {
    if (!this.isAddingMarker) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    const distance = intersectPoint.length();
    if (distance < 20 || distance > 300) {
      const direction = raycaster.ray.direction.clone();
      const targetDistance = 80;
      intersectPoint.copy(raycaster.ray.origin.clone().add(direction.multiplyScalar(targetDistance)));
    }

    this.pendingMarkerPosition = intersectPoint;

    if (this.onAddMarkerRequest) {
      this.onAddMarkerRequest({
        x: intersectPoint.x,
        y: intersectPoint.y,
        z: intersectPoint.z
      });
    }
  }

  public handleDoubleClick(event: MouseEvent, container: HTMLElement) {
    if (this.isAutoTour) return;
    
    this.startAddingMarker();
    this.handleCanvasClick(event, container);
  }

  public getMarkersGroup(): THREE.Group {
    return this.markersGroup;
  }
}
