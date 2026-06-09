import * as THREE from 'three';

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export class Sandglass {
  public group: THREE.Group;
  public topHemisphere: THREE.Mesh;
  public bottomHemisphere: THREE.Mesh;
  public neck: THREE.Mesh;

  public rotationX: number = 0;
  public targetRotationX: number = 0;
  public gravity: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
  public gravityMagnitude: number = 0.01;
  public flowReversed: boolean = false;

  private isDragging: boolean = false;
  private lastMouseY: number = 0;
  private isReturning: boolean = false;
  private returnStartX: number = 0;
  private returnProgress: number = 0;
  private readonly returnDuration: number = 0.3;

  private pulseTime: number = 0;
  private readonly pulsePeriod: number = 3;

  constructor() {
    this.group = new THREE.Group();

    const topGeo = new THREE.SphereGeometry(2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const bottomGeo = new THREE.SphereGeometry(2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const neckGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 32);

    const glassMat = new THREE.MeshPhongMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      shininess: 100,
      emissive: 0x223344,
      emissiveIntensity: 0.2
    });

    const neckMat = new THREE.MeshPhongMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      shininess: 120,
      emissive: 0x4466aa,
      emissiveIntensity: 0.3
    });

    this.topHemisphere = new THREE.Mesh(topGeo, glassMat);
    this.topHemisphere.position.y = 0.5;

    this.bottomHemisphere = new THREE.Mesh(bottomGeo, glassMat);
    this.bottomHemisphere.position.y = -0.5;

    this.neck = new THREE.Mesh(neckGeo, neckMat);

    this.group.add(this.topHemisphere);
    this.group.add(this.bottomHemisphere);
    this.group.add(this.neck);
  }

  public attachMouseListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.isReturning = false;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const deltaY = e.clientY - this.lastMouseY;
    this.lastMouseY = e.clientY;

    const deltaRad = (deltaY / 180) * Math.PI;
    this.targetRotationX += deltaRad;
    this.targetRotationX = Math.max(-Math.PI, Math.min(Math.PI, this.targetRotationX));
    this.rotationX = this.targetRotationX;
  }

  private onMouseUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.isReturning = true;
    this.returnStartX = this.rotationX;
    this.returnProgress = 0;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.001 : -0.001;
    this.gravityMagnitude = Math.max(0.005, Math.min(0.05, this.gravityMagnitude + delta));
  }

  public update(dt: number): void {
    if (this.isReturning) {
      this.returnProgress += dt / this.returnDuration;
      if (this.returnProgress >= 1) {
        this.returnProgress = 1;
        this.isReturning = false;
        this.rotationX = 0;
        this.targetRotationX = 0;
      } else {
        const t = easeOutCubic(this.returnProgress);
        this.rotationX = this.returnStartX * (1 - t);
      }
    }

    this.group.rotation.x = this.rotationX;

    this.pulseTime += dt;
    const pulsePhase = (this.pulseTime % this.pulsePeriod) / this.pulsePeriod;
    const pulseValue = 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2));
    const topMat = this.topHemisphere.material as THREE.MeshPhongMaterial;
    const bottomMat = this.bottomHemisphere.material as THREE.MeshPhongMaterial;
    topMat.opacity = pulseValue;
    bottomMat.opacity = pulseValue;
    topMat.emissiveIntensity = pulseValue;
    bottomMat.emissiveIntensity = pulseValue;

    const absDeg = Math.abs(this.rotationX * 180 / Math.PI);
    this.flowReversed = absDeg > 45;

    const cos = Math.cos(this.rotationX);
    const sin = Math.sin(this.rotationX);
    this.gravity.set(-sin, -cos, 0).normalize();
  }

  public getRotationDegrees(): number {
    return Math.round(this.rotationX * 180 / Math.PI);
  }

  public getWorldGravity(): THREE.Vector3 {
    return this.gravity.clone().multiplyScalar(this.gravityMagnitude);
  }

  public pointInSandglass(localPoint: THREE.Vector3): boolean {
    const y = localPoint.y;
    const r2 = localPoint.x * localPoint.x + localPoint.z * localPoint.z;

    if (y > 0.5) {
      const dy = y - 0.5;
      return r2 + dy * dy <= 4.0;
    } else if (y < -0.5) {
      const dy = y + 0.5;
      return r2 + dy * dy <= 4.0;
    } else {
      return r2 <= 0.0225;
    }
  }

  public constrainToSandglass(
    localPoint: THREE.Vector3,
    velocity: THREE.Vector3
  ): { collided: boolean; normal?: THREE.Vector3 } {
    const y = localPoint.y;
    const r2 = localPoint.x * localPoint.x + localPoint.z * localPoint.z;
    const r = Math.sqrt(r2);

    let collided = false;
    let normal = new THREE.Vector3();

    if (y > 0.5) {
      const centerY = 0.5;
      const dy = y - centerY;
      const distSq = r2 + dy * dy;
      if (distSq > 3.96) {
        const dist = Math.sqrt(distSq);
        normal.set(localPoint.x, dy, localPoint.z).divideScalar(dist);
        localPoint.copy(normal.clone().multiplyScalar(Math.sqrt(3.96)));
        localPoint.y += centerY - normal.y * Math.sqrt(3.96);
        const vn = velocity.dot(normal);
        if (vn > 0) {
          velocity.sub(normal.clone().multiplyScalar(vn * 1.6));
        }
        collided = true;
      }
    } else if (y < -0.5) {
      const centerY = -0.5;
      const dy = y - centerY;
      const distSq = r2 + dy * dy;
      if (distSq > 3.96) {
        const dist = Math.sqrt(distSq);
        normal.set(localPoint.x, dy, localPoint.z).divideScalar(dist);
        localPoint.copy(normal.clone().multiplyScalar(Math.sqrt(3.96)));
        localPoint.y += centerY - normal.y * Math.sqrt(3.96);
        const vn = velocity.dot(normal);
        if (vn > 0) {
          velocity.sub(normal.clone().multiplyScalar(vn * 1.6));
        }
        collided = true;
      }
    } else {
      if (r2 > 0.021) {
        if (r > 0.001) {
          normal.set(localPoint.x / r, 0, localPoint.z / r);
        } else {
          normal.set(1, 0, 0);
        }
        localPoint.x = normal.x * Math.sqrt(0.021);
        localPoint.z = normal.z * Math.sqrt(0.021);
        const vn = velocity.dot(normal);
        if (vn > 0) {
          velocity.sub(normal.clone().multiplyScalar(vn * 1.5));
        }
        collided = true;
      }
    }

    return { collided, normal: collided ? normal : undefined };
  }

  public getDepositHeight(referenceY: number): number {
    return referenceY;
  }
}
