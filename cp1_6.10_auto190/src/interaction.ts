import * as THREE from 'three';
import type { FossilGroup } from './fossilModel';

export interface InteractionState {
  selectedFossil: FossilGroup | null;
  xrayMode: boolean;
  clickMarkers: THREE.Mesh[];
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private fossils: FossilGroup[];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement;
  private state: InteractionState;
  private clickMarkerGroup: THREE.Group;
  private hoveredHotspot: THREE.Mesh | null = null;

  private cardEl: HTMLElement | null;
  private cardTitle: HTMLElement | null;
  private cardEra: HTMLElement | null;
  private cardSize: HTMLElement | null;
  private cardDescription: HTMLElement | null;
  private hotspotTooltip: HTMLElement | null;
  private tooltipText: HTMLElement | null;
  private xrayIndicator: HTMLElement | null;

  private onFossilSelectCallback: ((fossil: FossilGroup | null) => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    fossils: FossilGroup[],
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.scene = scene;
    this.fossils = fossils;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.state = {
      selectedFossil: null,
      xrayMode: false,
      clickMarkers: []
    };

    this.clickMarkerGroup = new THREE.Group();
    this.scene.add(this.clickMarkerGroup);

    this.cardEl = document.getElementById('info-card');
    this.cardTitle = document.getElementById('card-title');
    this.cardEra = document.getElementById('card-era');
    this.cardSize = document.getElementById('card-size');
    this.cardDescription = document.getElementById('card-description');
    this.hotspotTooltip = document.getElementById('hotspot-tooltip');
    this.tooltipText = document.getElementById('tooltip-thumb-text');
    this.xrayIndicator = document.getElementById('xray-indicator');

    this.bindEvents();
  }

  public setOnFossilSelectCallback(callback: (fossil: FossilGroup | null) => void): void {
    this.onFossilSelectCallback = callback;
  }

  private bindEvents(): void {
    this.domElement.addEventListener('click', this.handleClick.bind(this));
    this.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  public dispose(): void {
    this.domElement.removeEventListener('click', this.handleClick.bind(this));
    this.domElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes: THREE.Object3D[] = [];
    this.fossils.forEach(f => {
      allMeshes.push(...f.meshes);
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const hitPoint = intersects[0].point;

      const fossil = this.findFossilByMesh(hitMesh);
      if (fossil) {
        this.highlightAndShowInfo(fossil, hitPoint, hitMesh);
      }
    } else {
      this.hideInfoCard();
      this.clearSelection();
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allHotspots: THREE.Object3D[] = [];
    this.fossils.forEach(f => {
      allHotspots.push(...f.hotspots);
    });

    const intersects = this.raycaster.intersectObjects(allHotspots, false);

    if (intersects.length > 0) {
      const hotspot = intersects[0].object as THREE.Mesh;
      if (hotspot !== this.hoveredHotspot) {
        this.hoveredHotspot = hotspot;
        const fossil = this.findFossilByHotspot(hotspot);
        if (fossil && this.hotspotTooltip && this.tooltipText) {
          this.hotspotTooltip.classList.add('visible');
          this.tooltipText.textContent = fossil.info.detail;
        }
      }

      if (this.hotspotTooltip) {
        this.hotspotTooltip.style.left = `${event.clientX}px`;
        this.hotspotTooltip.style.top = `${event.clientY}px`;
      }
    } else {
      if (this.hoveredHotspot !== null) {
        this.hoveredHotspot = null;
        if (this.hotspotTooltip) {
          this.hotspotTooltip.classList.remove('visible');
        }
      }
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'x') {
      this.toggleXRayMode();
    }
  }

  private findFossilByMesh(mesh: THREE.Mesh): FossilGroup | null {
    for (const fossil of this.fossils) {
      if (fossil.meshes.includes(mesh)) {
        return fossil;
      }
    }
    return null;
  }

  private findFossilByHotspot(hotspot: THREE.Mesh): FossilGroup | null {
    for (const fossil of this.fossils) {
      if (fossil.hotspots.includes(hotspot)) {
        return fossil;
      }
    }
    return null;
  }

  private highlightAndShowInfo(
    fossil: FossilGroup,
    point: THREE.Vector3,
    _hitMesh: THREE.Mesh
  ): void {
    this.state.selectedFossil = fossil;

    if (this.onFossilSelectCallback) {
      this.onFossilSelectCallback(fossil);
    }

    this.addClickMarker(point);
    this.showInfoCard(fossil);
    this.highlightMeshesTemporarily(fossil);
  }

  private addClickMarker(point: THREE.Vector3): void {
    const geo = new THREE.CircleGeometry(0.08, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.copy(point);
    marker.lookAt(this.camera.position);

    this.clickMarkerGroup.add(marker);
    this.state.clickMarkers.push(marker);

    setTimeout(() => {
      this.clickMarkerGroup.remove(marker);
      geo.dispose();
      mat.dispose();
      const idx = this.state.clickMarkers.indexOf(marker);
      if (idx !== -1) {
        this.state.clickMarkers.splice(idx, 1);
      }
    }, 3000);
  }

  private showInfoCard(fossil: FossilGroup): void {
    if (!this.cardEl || !this.cardTitle || !this.cardEra || !this.cardSize || !this.cardDescription) {
      return;
    }

    this.cardTitle.textContent = fossil.info.name;
    this.cardEra.textContent = fossil.info.era;
    this.cardSize.textContent = fossil.info.size;
    this.cardDescription.textContent = fossil.info.description;

    this.cardEl.classList.add('visible');
  }

  private hideInfoCard(): void {
    if (this.cardEl) {
      this.cardEl.classList.remove('visible');
    }
  }

  private clearSelection(): void {
    this.state.selectedFossil = null;
    if (this.onFossilSelectCallback) {
      this.onFossilSelectCallback(null);
    }
  }

  private highlightMeshesTemporarily(fossil: FossilGroup): void {
    const originalEmissives: Map<THREE.MeshStandardMaterial, THREE.Color> = new Map();

    fossil.meshes.forEach(mesh => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        originalEmissives.set(mat, mat.emissive.clone());
        mat.emissive = new THREE.Color(0x554422);
      }
    });

    setTimeout(() => {
      originalEmissives.forEach((color, mat) => {
        mat.emissive.copy(color);
      });
    }, 300);
  }

  public toggleXRayMode(): void {
    this.state.xrayMode = !this.state.xrayMode;

    const target = this.state.selectedFossil;

    this.fossils.forEach(fossil => {
      const isTarget = (fossil === target) || target === null;

      fossil.meshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (this.state.xrayMode && isTarget) {
          mat.transparent = true;
          mat.opacity = 0.5;
        } else {
          mat.transparent = false;
          mat.opacity = 1;
        }
      });

      if (fossil.innerSkeleton) {
        const skeletonMat = fossil.innerSkeleton.material as THREE.LineBasicMaterial;
        if (this.state.xrayMode && isTarget) {
          fossil.innerSkeleton.visible = true;
          skeletonMat.opacity = 0.7;
        } else {
          fossil.innerSkeleton.visible = false;
          skeletonMat.opacity = 0;
        }
      }
    });

    if (this.xrayIndicator) {
      if (this.state.xrayMode) {
        this.xrayIndicator.classList.add('visible');
      } else {
        this.xrayIndicator.classList.remove('visible');
      }
    }
  }

  public getState(): InteractionState {
    return this.state;
  }

  public update(deltaTime: number): void {
    this.state.clickMarkers.forEach(marker => {
      marker.lookAt(this.camera.position);
    });

    this.fossils.forEach(fossil => {
      fossil.hotspots.forEach(hotspot => {
        const pulse = 1 + 0.1 * Math.sin(deltaTime * Math.PI * 2);
        hotspot.scale.set(pulse, pulse, pulse);
      });
    });
  }
}
