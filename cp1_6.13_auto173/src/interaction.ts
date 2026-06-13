import * as THREE from 'three';
import { FiberSystem } from './fiberSystem';

interface DragState {
  isDragging: boolean;
  fiberIndex: number;
  nodeIndex: number;
  startPosition: THREE.Vector3;
  lastPosition: THREE.Vector3;
  dragOffset: THREE.Vector3;
}

interface ZoomState {
  currentZoom: number;
  lastZoomTime: number;
  lastWheelDelta: number;
}

export class InteractionController {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private fiberSystem: FiberSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dragState: DragState;
  private zoomState: ZoomState;
  private baseCameraPosition: THREE.Vector3;
  private onDragStartCallback?: (fiberIndex: number, nodeIndex: number) => void;
  private onDragEndCallback?: () => void;
  private onLightClickCallback?: () => void;

  constructor(
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    _scene: THREE.Scene,
    fiberSystem: FiberSystem
  ) {
    this.container = container;
    this.camera = camera;
    this.fiberSystem = fiberSystem;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.baseCameraPosition = new THREE.Vector3(0, 0, 400);

    this.dragState = {
      isDragging: false,
      fiberIndex: -1,
      nodeIndex: -1,
      startPosition: new THREE.Vector3(),
      lastPosition: new THREE.Vector3(),
      dragOffset: new THREE.Vector3()
    };

    this.zoomState = {
      currentZoom: 1,
      lastZoomTime: 0,
      lastWheelDelta: 0
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const orbitingLights = this.fiberSystem.getOrbitingLights();
    const lightMeshes = orbitingLights.map(light => light.mesh);
    
    const lightIntersects = this.raycaster.intersectObjects(lightMeshes);
    if (lightIntersects.length > 0) {
      const clickedLight = lightIntersects[0].object;
      const worldPos = new THREE.Vector3();
      clickedLight.getWorldPosition(worldPos);
      
      const currentTime = performance.now() / 1000;
      const handled = this.fiberSystem.handleLightClick(worldPos, currentTime);
      if (handled && this.onLightClickCallback) {
        this.onLightClickCallback();
        return;
      }
    }

    const nodeMeshes = this.fiberSystem.getNodeMeshes();
    const intersects = this.raycaster.intersectObject(nodeMeshes);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        const nodesPerFiber = this.fiberSystem.getNodesPerFiber();

        this.dragState.fiberIndex = Math.floor(instanceId / nodesPerFiber);
        this.dragState.nodeIndex = instanceId % nodesPerFiber;

        const node = this.fiberSystem.getNode(
          this.dragState.fiberIndex,
          this.dragState.nodeIndex
        );

        if (node) {
          this.dragState.isDragging = true;
          this.dragState.startPosition.copy(node.currentPosition);
          this.dragState.lastPosition.copy(node.currentPosition);

          const intersectPoint = intersects[0].point;
          this.dragState.dragOffset.copy(node.currentPosition).sub(intersectPoint);

          if (this.onDragStartCallback) {
            this.onDragStartCallback(this.dragState.fiberIndex, this.dragState.nodeIndex);
          }
        }
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    if (!this.dragState.isDragging) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const node = this.fiberSystem.getNode(
      this.dragState.fiberIndex,
      this.dragState.nodeIndex
    );

    if (!node) return;

    const plane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -this.camera.position.z
    );

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    const worldPosition = intersectPoint.add(this.dragState.dragOffset);
    const dragDelta = worldPosition.clone().sub(this.dragState.lastPosition);

    this.fiberSystem.applyDrag(
      this.dragState.fiberIndex,
      this.dragState.nodeIndex,
      worldPosition,
      dragDelta
    );

    this.dragState.lastPosition.copy(worldPosition);
  }

  private onMouseUp(): void {
    if (this.dragState.isDragging) {
      this.fiberSystem.releaseDrag(
        this.dragState.fiberIndex,
        this.dragState.nodeIndex
      );

      this.dragState.isDragging = false;
      this.dragState.fiberIndex = -1;
      this.dragState.nodeIndex = -1;

      if (this.onDragEndCallback) {
        this.onDragEndCallback();
      }
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const currentTime = performance.now();
    const delta = event.deltaY;

    const timeDiff = currentTime - this.zoomState.lastZoomTime;
    let zoomSpeed = Math.abs(delta) / Math.max(timeDiff, 1);
    
    if (timeDiff > 100) {
      zoomSpeed = 0;
    }

    const zoomDirection = delta > 0 ? -1 : 1;
    const zoomIncrement = zoomDirection * 0.05 * (1 + Math.min(zoomSpeed * 0.01, 0.5));

    this.zoomState.currentZoom = THREE.MathUtils.clamp(
      this.zoomState.currentZoom + zoomIncrement,
      0.5,
      3
    );

    const cameraDistance = this.baseCameraPosition.z / this.zoomState.currentZoom;
    this.camera.position.z = cameraDistance;

    this.fiberSystem.setZoom(this.zoomState.currentZoom, delta * 0.01);

    this.zoomState.lastZoomTime = currentTime;
    this.zoomState.lastWheelDelta = delta;
  }

  public getMousePosition(): THREE.Vector2 {
    return this.mouse.clone();
  }

  public getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  public isDragging(): boolean {
    return this.dragState.isDragging;
  }

  public getCurrentZoom(): number {
    return this.zoomState.currentZoom;
  }

  public setOnDragStart(callback: (fiberIndex: number, nodeIndex: number) => void): void {
    this.onDragStartCallback = callback;
  }

  public setOnDragEnd(callback: () => void): void {
    this.onDragEndCallback = callback;
  }

  public setOnLightClick(callback: () => void): void {
    this.onLightClickCallback = callback;
  }

  public resize(): void {
    const cameraDistance = this.baseCameraPosition.z / this.zoomState.currentZoom;
    this.camera.position.z = cameraDistance;
  }

  public dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    this.container.removeEventListener('wheel', this.onWheel.bind(this));
  }
}
