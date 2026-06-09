import * as THREE from 'three';

export enum FishState {
  FREE = 'free',
  FOLLOW = 'follow',
  EVADE = 'evade',
  FEED = 'feed'
}

export interface FishOptions {
  color: number;
  size: number;
  position: THREE.Vector3;
  bounds: THREE.Box3;
}

const COLOR_PALETTE = [
  0xff6b35, 0x4ecdc4, 0xffe66d, 0xff69b4, 0x95e1d3,
  0xf38181, 0xaa96da, 0xfcbad3, 0xa8d8ea, 0xffaaa5,
  0xc7ceea, 0x85e3d5
];

export function getRandomFishColor(): number {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export class Fish {
  public mesh: THREE.Group;
  public state: FishState = FishState.FREE;
  public velocity: THREE.Vector3;
  public speed: number;
  public size: number;
  public color: number;
  public bounds: THREE.Box3;

  private targetPoint: THREE.Vector3 | null = null;
  private stateTimer: number = 0;
  private evadeDirection: THREE.Vector3 = new THREE.Vector3();
  private flashTimer: number = 0;
  private originalMaterials: THREE.Material[] = [];
  private tailMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private time: number = Math.random() * Math.PI * 2;

  constructor(options: FishOptions) {
    this.color = options.color;
    this.size = options.size;
    this.speed = 0.3 + Math.random() * 0.5;
    this.bounds = options.bounds;

    const angle = Math.random() * Math.PI * 2;
    const dirZ = (Math.random() - 0.5) * 2;
    const horizontal = Math.sqrt(1 - dirZ * dirZ);
    this.velocity = new THREE.Vector3(
      Math.cos(angle) * horizontal,
      Math.sin(angle) * horizontal,
      dirZ
    ).normalize();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(options.position);

    this.createBody();
    this.bodyMesh = this.mesh.children[0] as THREE.Mesh;
    this.tailMesh = this.mesh.children[1] as THREE.Mesh;
    this.createEye();
    this.createScales();

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => this.originalMaterials.push(m));
      }
    });
  }

  private createBody(): void {
    const bodyGeo = new THREE.SphereGeometry(this.size * 0.5, 16, 12);
    bodyGeo.scale(1.8, 0.8, 1.0);

    const bodyMat = new THREE.MeshPhongMaterial({
      color: this.color,
      shininess: 80,
      transparent: true,
      opacity: 0.9
    });

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    const tailGeo = new THREE.ConeGeometry(this.size * 0.4, this.size * 0.8, 4);
    tailGeo.rotateZ(Math.PI / 2);
    const tailMat = new THREE.MeshPhongMaterial({
      color: this.color,
      shininess: 60,
      transparent: true,
      opacity: 0.8
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.x = -this.size * 1.0;
    this.mesh.add(tail);

    const topFinGeo = new THREE.ConeGeometry(this.size * 0.15, this.size * 0.5, 3);
    topFinGeo.rotateX(Math.PI / 2);
    const topFin = new THREE.Mesh(topFinGeo, tailMat);
    topFin.position.set(0, this.size * 0.4, 0);
    this.mesh.add(topFin);
  }

  private createEye(): void {
    const eyeGeo = new THREE.SphereGeometry(this.size * 0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(this.size * 0.7, this.size * 0.1, this.size * 0.25);
    this.mesh.add(eye1);

    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye2.position.set(this.size * 0.7, this.size * 0.1, -this.size * 0.25);
    this.mesh.add(eye2);
  }

  private createScales(): void {
    const scaleGeo = new THREE.CircleGeometry(this.size * 0.12, 8);
    const scaleMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(this.color).multiplyScalar(1.3),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const scale = new THREE.Mesh(scaleGeo, scaleMat);
        scale.position.set(
          -this.size * 0.2 + i * this.size * 0.2,
          -this.size * 0.2 + j * this.size * 0.2,
          this.size * 0.48
        );
        scale.rotation.y = -Math.PI / 8;
        this.mesh.add(scale);

        const scale2 = scale.clone();
        scale2.position.z = -this.size * 0.48;
        scale2.rotation.y = Math.PI + Math.PI / 8;
        this.mesh.add(scale2);
      }
    }
  }

  public setFollowTarget(point: THREE.Vector3): void {
    this.targetPoint = point.clone();
    this.state = FishState.FOLLOW;
    this.stateTimer = 3.0;
  }

  public setEvade(obstaclePos: THREE.Vector3): void {
    this.evadeDirection.copy(this.mesh.position).sub(obstaclePos).normalize();
    const angleOffset = (Math.random() - 0.5) * (Math.PI / 3);
    this.evadeDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
    this.state = FishState.EVADE;
    this.stateTimer = 1.0;
  }

  public setFeed(target: THREE.Vector3): void {
    this.targetPoint = target.clone();
    this.state = FishState.FEED;
  }

  public flash(): void {
    this.flashTimer = 0.5;
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if ((m as THREE.MeshPhongMaterial).emissive !== undefined) {
            (m as THREE.MeshPhongMaterial).emissive.set(0xffffff);
            (m as THREE.MeshPhongMaterial).emissiveIntensity = 0.8;
          }
        });
      }
    });
  }

  public setHover(hovered: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if ((m as THREE.MeshPhongMaterial).emissive !== undefined) {
            if (hovered) {
              (m as THREE.MeshPhongMaterial).emissive.setHex(this.color);
              (m as THREE.MeshPhongMaterial).emissiveIntensity = 0.3;
            } else if (this.flashTimer <= 0) {
              (m as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
              (m as THREE.MeshPhongMaterial).emissiveIntensity = 0;
            }
          }
        });
      }
    });
  }

  public update(delta: number, foods: THREE.Vector3[]): THREE.Vector3 | null {
    this.time += delta * 3;
    this.stateTimer = Math.max(0, this.stateTimer - delta);
    this.flashTimer = Math.max(0, this.flashTimer - delta);

    if (this.flashTimer <= 0) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if ((m as THREE.MeshPhongMaterial).emissive !== undefined && this.state !== FishState.FOLLOW) {
              (m as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
              (m as THREE.MeshPhongMaterial).emissiveIntensity = 0;
            }
          });
        }
      });
    }

    let currentSpeed = this.speed;
    if (this.state === FishState.FOLLOW) {
      currentSpeed = this.speed * 1.5;
    }

    let desiredDirection: THREE.Vector3;

    switch (this.state) {
      case FishState.FOLLOW:
        if (this.targetPoint) {
          desiredDirection = new THREE.Vector3().subVectors(this.targetPoint, this.mesh.position).normalize();
        } else {
          desiredDirection = this.velocity.clone();
        }
        if (this.stateTimer <= 0) {
          this.state = FishState.FREE;
          this.targetPoint = null;
        }
        break;

      case FishState.EVADE:
        desiredDirection = this.evadeDirection.clone();
        if (this.stateTimer <= 0) {
          this.state = FishState.FREE;
        }
        break;

      case FishState.FEED:
        if (this.targetPoint) {
          desiredDirection = new THREE.Vector3().subVectors(this.targetPoint, this.mesh.position).normalize();
          const dist = this.mesh.position.distanceTo(this.targetPoint);
          if (dist < 0.3) {
            const eaten = this.targetPoint.clone();
            this.flash();
            this.state = FishState.FREE;
            this.targetPoint = null;
            return eaten;
          }
        } else {
          desiredDirection = this.velocity.clone();
          this.state = FishState.FREE;
        }
        break;

      case FishState.FREE:
      default:
        if (foods.length > 0) {
          let nearest: THREE.Vector3 | null = null;
          let nearestDist = Infinity;
          for (const food of foods) {
            const d = this.mesh.position.distanceTo(food);
            if (d < 1.5 && d < nearestDist) {
              nearestDist = d;
              nearest = food;
            }
          }
          if (nearest) {
            this.targetPoint = nearest;
            this.state = FishState.FEED;
            desiredDirection = new THREE.Vector3().subVectors(nearest, this.mesh.position).normalize();
            break;
          }
        }

        desiredDirection = this.velocity.clone();
        const margin = 0.5;
        const min = this.bounds.min;
        const max = this.bounds.max;

        if (this.mesh.position.x < min.x + margin) desiredDirection.x = Math.abs(desiredDirection.x);
        if (this.mesh.position.x > max.x - margin) desiredDirection.x = -Math.abs(desiredDirection.x);
        if (this.mesh.position.y < min.y + margin) desiredDirection.y = Math.abs(desiredDirection.y);
        if (this.mesh.position.y > max.y - margin) desiredDirection.y = -Math.abs(desiredDirection.y);
        if (this.mesh.position.z < min.z + margin) desiredDirection.z = Math.abs(desiredDirection.z);
        if (this.mesh.position.z > max.z - margin) desiredDirection.z = -Math.abs(desiredDirection.z);

        if (Math.random() < 0.01) {
          desiredDirection.x += (Math.random() - 0.5) * 0.5;
          desiredDirection.y += (Math.random() - 0.5) * 0.5;
          desiredDirection.z += (Math.random() - 0.5) * 0.5;
        }

        desiredDirection.normalize();
        break;
    }

    this.velocity.lerp(desiredDirection, 0.05).normalize();

    this.mesh.position.addScaledVector(this.velocity, currentSpeed * delta);

    const targetRotationY = Math.atan2(this.velocity.z, this.velocity.x);
    const targetRotationZ = -this.velocity.y * 0.3;

    this.mesh.rotation.y = this.lerpAngle(this.mesh.rotation.y, targetRotationY, 0.1);
    this.mesh.rotation.z = this.lerpAngle(this.mesh.rotation.z, targetRotationZ, 0.1);

    if (this.tailMesh) {
      this.tailMesh.rotation.y = Math.sin(this.time) * 0.6;
    }

    return null;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  public getBoundingSphere(): THREE.Sphere {
    return new THREE.Sphere(this.mesh.position.clone(), this.size * 0.8);
  }
}
