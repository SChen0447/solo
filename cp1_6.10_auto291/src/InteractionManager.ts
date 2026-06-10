import * as THREE from 'three';
import { KnowledgeGraph } from './KnowledgeGraph';
import { KnowledgeNode } from './data';

export interface InteractionEvents {
  onHover?: (node: KnowledgeNode | null, screenX: number, screenY: number) => void;
  onClick?: (node: KnowledgeNode | null) => void;
}

const MIN_CAMERA_DISTANCE = 5;
const MAX_CAMERA_DISTANCE = 20;

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private graph: KnowledgeGraph;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private events: InteractionEvents;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private rotationVelocityX: number = 0;
  private rotationVelocityY: number = 0;

  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private cameraDistance: number = 12;
  private cameraTarget: THREE.Vector3;

  private hoveredNodeId: string | null = null;
  private hasMovedSinceMouseDown: boolean = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    graph: KnowledgeGraph,
    events: InteractionEvents = {}
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.graph = graph;
    this.events = events;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.cameraTarget = new THREE.Vector3(0, 0, 0);

    this.updateCameraPosition();
    this.bindEvents();
  }

  private bindEvents(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    domElement.addEventListener('pointerleave', this.onPointerLeave.bind(this));
    domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    domElement.style.touchAction = 'none';
  }

  private onPointerMove(event: PointerEvent): void {
    this.updateMouse(event);

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMouseX;
      const deltaY = event.clientY - this.previousMouseY;

      if (Math.abs(deltaX) + Math.abs(deltaY) > 3) {
        this.hasMovedSinceMouseDown = true;
      }

      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi -= deltaY * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.rotationVelocityX = -deltaX * 0.005;
      this.rotationVelocityY = -deltaY * 0.005;

      this.previousMouseX = event.clientX;
      this.previousMouseY = event.clientY;
      this.updateCameraPosition();
    } else {
      this.checkHover(event);
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.isDragging = true;
    this.hasMovedSinceMouseDown = false;
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
    this.rotationVelocityX = 0;
    this.rotationVelocityY = 0;
  }

  private onPointerUp(event: PointerEvent): void {
    this.isDragging = false;

    if (!this.hasMovedSinceMouseDown) {
      this.checkClick(event);
    }
  }

  private onPointerLeave(event: PointerEvent): void {
    this.isDragging = false;
    if (this.hoveredNodeId !== null) {
      this.hoveredNodeId = null;
      this.graph.setHoverState(null);
      this.events.onHover?.(null, 0, 0);
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.003;
    this.cameraDistance += event.deltaY * zoomSpeed * this.cameraDistance;
    this.cameraDistance = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, this.cameraDistance));
    this.updateCameraPosition();
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(event: PointerEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const nodeMeshes = this.graph.getAllNodeMeshes();
    const intersects = this.raycaster.intersectObjects(nodeMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const nodeId = mesh.userData.id as string;
      if (nodeId && nodeId !== this.hoveredNodeId) {
        this.hoveredNodeId = nodeId;
        this.graph.setHoverState(nodeId);
        const nodeData = this.graph.getNodeDataById(nodeId);
        if (nodeData) {
          this.events.onHover?.(nodeData, event.clientX, event.clientY);
        }
      } else if (nodeId) {
        this.events.onHover?.(this.graph.getNodeDataById(nodeId), event.clientX, event.clientY);
      }
    } else if (this.hoveredNodeId !== null) {
      this.hoveredNodeId = null;
      this.graph.setHoverState(null);
      this.events.onHover?.(null, 0, 0);
    }
  }

  private checkClick(event: PointerEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const nodeMeshes = this.graph.getAllNodeMeshes();
    const intersects = this.raycaster.intersectObjects(nodeMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const nodeId = mesh.userData.id as string;
      if (nodeId) {
        const nodeData = this.graph.getNodeDataById(nodeId);
        if (nodeData) {
          this.graph.setSelectedState(nodeId);
          this.events.onClick?.(nodeData);
        }
      }
    } else {
      this.graph.clearSelection();
      this.events.onClick?.(null);
    }
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    this.camera.position.set(
      x + this.cameraTarget.x,
      y + this.cameraTarget.y,
      z + this.cameraTarget.z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  public update(): void {
    if (!this.isDragging && (Math.abs(this.rotationVelocityX) > 0.0001 || Math.abs(this.rotationVelocityY) > 0.0001)) {
      this.cameraTheta += this.rotationVelocityX;
      this.cameraPhi += this.rotationVelocityY;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.rotationVelocityX *= 0.95;
      this.rotationVelocityY *= 0.95;

      this.updateCameraPosition();
    }
  }

  public selectNodeById(nodeId: string): void {
    const nodeData = this.graph.getNodeDataById(nodeId);
    if (nodeData) {
      this.graph.setSelectedState(nodeId);
      this.events.onClick?.(nodeData);
    }
  }

  public clearSelection(): void {
    this.graph.clearSelection();
  }
}
