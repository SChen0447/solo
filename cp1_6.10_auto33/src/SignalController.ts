import * as THREE from 'three';

export interface SignalPath {
  points: THREE.Vector3[];
  length: number;
  delay: number;
  isReflected: boolean;
  strength: number;
}

export class SignalController {
  public signalSource: THREE.Object3D;
  public receiver: THREE.Object3D;
  public obstacles: THREE.Mesh[] = [];

  public signalStrength: number = 1;
  public pathCount: number = 1;
  public paths: SignalPath[] = [];

  private initialSourcePos: THREE.Vector3;
  private initialReceiverPos: THREE.Vector3;
  private initialReceiverRotY: number;

  private keys: Set<string> = new Set();
  private isDraggingReceiver: boolean = false;
  private isDraggingObstacle: boolean = false;
  private draggedObstacle: THREE.Mesh | null = null;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private receiverRotationY: number = 0;

  private moveSpeed: number = 1;
  private rotationSpeed: number = 0.005;
  private maxDistance: number = 50;

  private pathLossExponent: number = 2.2;
  private referenceDistance: number = 1;
  private referenceStrength: number = 1;

  private onStrengthChange?: (strength: number, pathCount: number) => void;
  private onPositionChange?: () => void;

  constructor(
    sourcePos: THREE.Vector3 = new THREE.Vector3(-8, 2, 0),
    receiverPos: THREE.Vector3 = new THREE.Vector3(8, 2, 0)
  ) {
    this.initialSourcePos = sourcePos.clone();
    this.initialReceiverPos = receiverPos.clone();
    this.initialReceiverRotY = 0;

    this.signalSource = this.createSignalSource();
    this.signalSource.position.copy(sourcePos);

    this.receiver = this.createReceiver();
    this.receiver.position.copy(receiverPos);
  }

  private createSignalSource(): THREE.Object3D {
    const group = new THREE.Group();

    const sphereGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    const haloGeo = new THREE.SphereGeometry(1.3, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);

    const ringGeo = new THREE.RingGeometry(1.0, 1.1, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffff66,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const ring2 = ring.clone();
    ring2.rotation.x = 0;
    ring2.rotation.z = Math.PI / 2;
    group.add(ring2);

    return group;
  }

  private createReceiver(): THREE.Object3D {
    const group = new THREE.Group();

    const prismGeo = new THREE.ConeGeometry(0.7, 1.6, 6);
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      metalness: 0.9,
      roughness: 0.1,
      flatShading: false
    });
    const prism = new THREE.Mesh(prismGeo, prismMat);
    prism.rotation.x = Math.PI;
    prism.position.y = 0.8;
    group.add(prism);

    const baseGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.4, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.2;
    group.add(base);

    const haloGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 0.8;
    group.add(halo);

    return group;
  }

  public createObstacles(count: number = 4): THREE.Mesh[] {
    const obstacles: THREE.Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const w = 1 + Math.random() * 2.5;
      const h = 2 + Math.random() * 3;
      const d = 1 + Math.random() * 2.5;

      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x666677,
        transparent: true,
        opacity: 0.5,
        metalness: 0.3,
        roughness: 0.7
      });
      const box = new THREE.Mesh(geo, mat);

      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x88aacc });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      box.add(edges);

      let x: number, z: number;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * 20;
        z = (Math.random() - 0.5) * 20;
        attempts++;
      } while (
        attempts < 20 &&
        (Math.abs(x - this.signalSource.position.x) < 4 ||
          Math.abs(x - this.receiver.position.x) < 4 ||
          Math.abs(z - this.signalSource.position.z) < 4 ||
          Math.abs(z - this.receiver.position.z) < 4)
      );

      box.position.set(x, h / 2, z);
      box.userData.isObstacle = true;
      box.userData.baseColor = new THREE.Color(0x666677);
      obstacles.push(box);
    }
    this.obstacles = obstacles;
    return obstacles;
  }

  public calculateSignalStrength(): void {
    const directDist = this.signalSource.position.distanceTo(this.receiver.position);
    const freeSpaceLoss =
      this.referenceStrength /
      Math.pow(Math.max(directDist, this.referenceDistance) / this.referenceDistance, this.pathLossExponent);

    this.generatePaths();

    let totalStrength = freeSpaceLoss;
    for (let i = 1; i < this.paths.length; i++) {
      const path = this.paths[i];
      const pathLoss =
        1 /
        Math.pow(Math.max(path.length, this.referenceDistance) / this.referenceDistance, this.pathLossExponent);
      totalStrength += pathLoss * 0.3;
    }

    const normalizedStrength = Math.min(1, totalStrength / this.referenceStrength);
    const smoothStrength = THREE.MathUtils.lerp(this.signalStrength, normalizedStrength, 0.15);
    this.signalStrength = smoothStrength;
    this.pathCount = this.paths.length;

    if (this.onStrengthChange) {
      this.onStrengthChange(this.signalStrength, this.pathCount);
    }
  }

  public generatePaths(): void {
    const paths: SignalPath[] = [];
    const sourcePos = this.signalSource.position;
    const receiverPos = this.receiver.position;

    const directPath: SignalPath = {
      points: [sourcePos.clone(), receiverPos.clone()],
      length: sourcePos.distanceTo(receiverPos),
      delay: 0,
      isReflected: false,
      strength: 1
    };
    paths.push(directPath);

    const reflectionCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < reflectionCount; i++) {
      const reflectedPath = this.generateReflectedPath(sourcePos, receiverPos, i + 1);
      if (reflectedPath) {
        paths.push(reflectedPath);
      }
    }

    this.paths = paths;
  }

  private generateReflectedPath(
    source: THREE.Vector3,
    receiver: THREE.Vector3,
    index: number
  ): SignalPath | null {
    if (this.obstacles.length === 0) {
      const angle = (index * Math.PI * 2) / 5 + Math.random() * 0.5;
      const radius = 3 + Math.random() * 4;
      const midX = (source.x + receiver.x) / 2 + Math.cos(angle) * radius;
      const midZ = (source.z + receiver.z) / 2 + Math.sin(angle) * radius;
      const midY = 1 + Math.random() * 3;
      const midPoint = new THREE.Vector3(midX, midY, midZ);

      const d1 = source.distanceTo(midPoint);
      const d2 = midPoint.distanceTo(receiver);
      const totalLen = d1 + d2;

      return {
        points: [source.clone(), midPoint, receiver.clone()],
        length: totalLen,
        delay: index * 0.05,
        isReflected: true,
        strength: Math.max(0.2, 1 - totalLen / this.maxDistance)
      };
    }

    const obstacleIndex = Math.floor(Math.random() * this.obstacles.length);
    const obstacle = this.obstacles[obstacleIndex];
    const obPos = obstacle.position;
    const obSize = new THREE.Vector3();
    (obstacle.geometry as THREE.BoxGeometry).computeBoundingBox();
    obstacle.geometry.boundingBox?.getSize(obSize);

    const offsetDir = new THREE.Vector3(
      (Math.random() - 0.5),
      Math.random() * 0.5 + 0.2,
      (Math.random() - 0.5)
    ).normalize();

    const reflectPoint = obPos.clone().add(
      offsetDir.multiplyScalar(obSize.length() * 0.6 + 0.5)
    );
    reflectPoint.y = Math.max(0.5, Math.min(obPos.y + obSize.y / 2, reflectPoint.y));

    const d1 = source.distanceTo(reflectPoint);
    const d2 = reflectPoint.distanceTo(receiver);
    const totalLen = d1 + d2;

    return {
      points: [source.clone(), reflectPoint, receiver.clone()],
      length: totalLen,
      delay: index * 0.06,
      isReflected: true,
      strength: Math.max(0.15, 1 - totalLen / this.maxDistance)
    };
  }

  public getSignalColor(strength: number): THREE.Color {
    const color = new THREE.Color();
    color.setHSL(0.33 * strength, 1, 0.5);
    return color;
  }

  public getParticleColor(strength: number, isReflected: boolean = false): THREE.Color {
    if (isReflected) {
      const r = THREE.MathUtils.lerp(0.2, 0.6, strength);
      const g = THREE.MathUtils.lerp(0.1, 0.6, strength);
      const b = THREE.MathUtils.lerp(0.5, 1.0, strength);
      return new THREE.Color(r, g, b);
    }
    const r = THREE.MathUtils.lerp(0.6, 1.0, strength);
    const g = THREE.MathUtils.lerp(0.0, 1.0, strength);
    const b = THREE.MathUtils.lerp(0.0, 0.2, strength);
    return new THREE.Color(r, g, b);
  }

  public setupInputListeners(
    domElement: HTMLElement,
    camera: THREE.Camera,
    raycaster: THREE.Raycaster
  ): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    domElement.addEventListener('mousedown', (e) => {
      this.lastMousePos = { x: e.clientX, y: e.clientY };

      const mouse = new THREE.Vector2(
        (e.clientX / domElement.clientWidth) * 2 - 1,
        -(e.clientY / domElement.clientHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(this.obstacles, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object as THREE.Mesh;
        while (obj && !obj.userData.isObstacle && obj.parent) {
          obj = obj.parent as THREE.Mesh;
        }
        if (obj.userData.isObstacle) {
          this.isDraggingObstacle = true;
          this.draggedObstacle = obj;
          (obj.material as THREE.MeshStandardMaterial).color.set(0xff8800);
          return;
        }
      }

      this.isDraggingReceiver = true;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingReceiver && this.draggedObstacle === null) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;

        if (e.shiftKey) {
          this.receiver.position.z += deltaY * 0.05;
          this.receiver.position.z = THREE.MathUtils.clamp(this.receiver.position.z, -20, 20);
        } else {
          this.receiverRotationY += deltaX * this.rotationSpeed;
          this.receiver.rotation.y = this.receiverRotationY;
        }
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.notifyPositionChange();
      }

      if (this.isDraggingObstacle && this.draggedObstacle) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaZ = e.clientY - this.lastMousePos.y;

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        this.draggedObstacle.position.addScaledVector(right, deltaX * 0.05);
        this.draggedObstacle.position.addScaledVector(forward, deltaZ * 0.05);

        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.calculateSignalStrength();
        this.notifyPositionChange();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDraggingObstacle && this.draggedObstacle) {
        (this.draggedObstacle.material as THREE.MeshStandardMaterial).color.copy(
          this.draggedObstacle.userData.baseColor
        );
      }
      this.isDraggingReceiver = false;
      this.isDraggingObstacle = false;
      this.draggedObstacle = null;
    });
  }

  public update(deltaTime: number): void {
    const moveStep = this.moveSpeed * deltaTime * 5;
    let moved = false;

    if (this.keys.has('w')) {
      this.signalSource.position.z -= moveStep;
      moved = true;
    }
    if (this.keys.has('s')) {
      this.signalSource.position.z += moveStep;
      moved = true;
    }
    if (this.keys.has('a')) {
      this.signalSource.position.x -= moveStep;
      moved = true;
    }
    if (this.keys.has('d')) {
      this.signalSource.position.x += moveStep;
      moved = true;
    }

    this.signalSource.position.x = THREE.MathUtils.clamp(this.signalSource.position.x, -20, 20);
    this.signalSource.position.z = THREE.MathUtils.clamp(this.signalSource.position.z, -20, 20);

    if (moved) {
      this.calculateSignalStrength();
      this.notifyPositionChange();
    }

    const halo = this.signalSource.children[1] as THREE.Mesh;
    if (halo) {
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      halo.scale.setScalar(scale);
    }
    const rHalo = this.receiver.children[2] as THREE.Mesh;
    if (rHalo) {
      const scale = 1 + Math.sin(Date.now() * 0.003 + 1) * 0.1;
      rHalo.scale.setScalar(scale);
    }
  }

  public resetPositions(): void {
    this.signalSource.position.copy(this.initialSourcePos);
    this.receiver.position.copy(this.initialReceiverPos);
    this.receiverRotationY = this.initialReceiverRotY;
    this.receiver.rotation.y = this.receiverRotationY;
    this.calculateSignalStrength();
    this.notifyPositionChange();
  }

  public notifyPositionChange(): void {
    if (this.onPositionChange) {
      this.onPositionChange();
    }
  }

  public setOnStrengthChange(cb: (strength: number, pathCount: number) => void): void {
    this.onStrengthChange = cb;
  }

  public setOnPositionChange(cb: () => void): void {
    this.onPositionChange = cb;
  }
}
