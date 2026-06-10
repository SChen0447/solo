import * as THREE from 'three';
import type { Flower } from './flower';

export class Butterfly {
  public group: THREE.Group;
  public body: THREE.Mesh;
  public leftWing: THREE.Mesh;
  public rightWing: THREE.Mesh;
  public trail: THREE.Line;
  public position: THREE.Vector3;
  public isCollecting: boolean = false;
  public targetFlower: Flower | null = null;

  private basePosition: THREE.Vector3;
  private amplitude: THREE.Vector3;
  private frequency: THREE.Vector3;
  private phase: THREE.Vector3;
  private hue: number;
  private wingPhase: number;
  private trailPositions: Float32Array;
  private trailIndex: number = 0;
  private collectFlashTimer: number = 0;
  private normalWingSpeed: number = 8;
  private isGolden: boolean = false;
  private goldenTimer: number = 0;
  private wanderTarget: THREE.Vector3;
  private wanderTimer: number = 0;
  private helixAngle: number = 0;

  private static readonly TRAIL_LENGTH = 10;
  private static readonly WANDER_RADIUS = 10;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(
      (Math.random() - 0.5) * 16,
      3 + Math.random() * 6,
      (Math.random() - 0.5) * 16
    );
    this.basePosition = this.position.clone();

    this.amplitude = new THREE.Vector3(
      0.5 + Math.random(),
      0.5 + Math.random() * 0.8,
      0.5 + Math.random()
    ).multiplyScalar(0.5 + Math.random() * 1.0);

    this.frequency = new THREE.Vector3(
      0.2 + Math.random() * 0.3,
      0.2 + Math.random() * 0.3,
      0.2 + Math.random() * 0.3
    );

    this.phase = new THREE.Vector3(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    this.hue = Math.random() * 360;
    this.wingPhase = Math.random() * Math.PI * 2;

    this.wanderTarget = this.position.clone();
    this.wanderTarget.x += (Math.random() - 0.5) * 6;
    this.wanderTarget.y += (Math.random() - 0.5) * 3;
    this.wanderTarget.z += (Math.random() - 0.5) * 6;

    this.helixAngle = Math.random() * Math.PI * 2;

    this.createButterflyMesh();
    this.createTrail();
    scene.add(this.group);
  }

  private createButterflyMesh(): void {
    const bodyGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    this.body = new THREE.Mesh(bodyGeom, bodyMat);
    this.group.add(this.body);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.25, 0.15, 0.4, 0);
    wingShape.quadraticCurveTo(0.3, -0.25, 0, -0.1);
    wingShape.quadraticCurveTo(-0.1, 0, 0, 0);

    const wingGeom = new THREE.ShapeGeometry(wingShape);

    const wingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.leftWing = new THREE.Mesh(wingGeom, wingMat.clone() as THREE.MeshBasicMaterial);
    this.leftWing.position.x = -0.02;
    this.leftWing.rotation.y = 0.3;
    this.group.add(this.leftWing);

    this.rightWing = new THREE.Mesh(wingGeom, wingMat.clone() as THREE.MeshBasicMaterial);
    this.rightWing.position.x = 0.02;
    this.rightWing.rotation.y = -0.3;
    this.rightWing.rotation.z = Math.PI;
    this.group.add(this.rightWing);

    const glowGeom = new THREE.SphereGeometry(0.15, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    this.group.add(glow);
  }

  private createTrail(): void {
    this.trailPositions = new Float32Array(Butterfly.TRAIL_LENGTH * 3);
    const trailGeom = new THREE.BufferGeometry();
    trailGeom.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));

    const trailMat = new THREE.LineBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trail = new THREE.Line(trailGeom, trailMat);
  }

  public update(
    delta: number,
    elapsed: number,
    speedMultiplier: number,
    moonDirection: THREE.Vector3,
    flowers: Flower[],
    inHelixFormation: boolean,
    helixCenter: THREE.Vector3,
    helixRadius: number,
    helixHeight: number,
    butterflyIndex: number,
    totalButterflies: number
  ): void {
    this.hue = (this.hue + 10 * delta) % 360;

    const wingSpeed = this.isCollecting ? this.normalWingSpeed * 2 : this.normalWingSpeed;
    this.wingPhase += wingSpeed * delta;

    const wingAngle = Math.sin(this.wingPhase) * 0.6 + 0.4;
    this.leftWing.rotation.z = wingAngle;
    this.rightWing.rotation.z = Math.PI - wingAngle;

    if (this.collectFlashTimer > 0) {
      this.collectFlashTimer -= delta;
      const flash = Math.sin(this.collectFlashTimer * 30) * 0.5 + 0.5;
      (this.leftWing.material as THREE.MeshBasicMaterial).opacity = 0.5 + flash * 0.5;
      (this.rightWing.material as THREE.MeshBasicMaterial).opacity = 0.5 + flash * 0.5;
      if (this.collectFlashTimer <= 0) {
        this.isCollecting = false;
        (this.leftWing.material as THREE.MeshBasicMaterial).opacity = 0.7;
        (this.rightWing.material as THREE.MeshBasicMaterial).opacity = 0.7;
      }
    }

    if (this.goldenTimer > 0) {
      this.goldenTimer -= delta;
      if (this.goldenTimer <= 0) {
        this.isGolden = false;
      }
    }

    let targetPos: THREE.Vector3;

    if (inHelixFormation) {
      this.helixAngle += delta * 1.5;
      const angle = this.helixAngle + (butterflyIndex / totalButterflies) * Math.PI * 4;
      const r = helixRadius;
      targetPos = new THREE.Vector3(
        helixCenter.x + Math.cos(angle) * r,
        helixCenter.y + (butterflyIndex / totalButterflies) * helixHeight,
        helixCenter.z + Math.sin(angle) * r
      );
    } else if (this.targetFlower && this.targetFlower.isBloomed) {
      targetPos = this.targetFlower.position.clone();
      targetPos.y += 0.5;
    } else {
      this.wanderTimer -= delta;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 3;
        this.wanderTarget.set(
          (Math.random() - 0.5) * 12,
          3 + Math.random() * 5,
          (Math.random() - 0.5) * 12
        );
      }

      targetPos = this.wanderTarget.clone();
    }

    const dirToMoon = moonDirection.clone().normalize().multiplyScalar(0.2);
    targetPos.add(dirToMoon);

    const sineOffset = new THREE.Vector3(
      Math.sin(elapsed * this.frequency.x + this.phase.x) * this.amplitude.x,
      Math.sin(elapsed * this.frequency.y + this.phase.y) * this.amplitude.y,
      Math.sin(elapsed * this.frequency.z + this.phase.z) * this.amplitude.z
    );

    const lerpFactor = Math.min(1, delta * 2 * speedMultiplier);
    this.position.lerp(targetPos, lerpFactor * 0.3);
    this.position.add(sineOffset.multiplyScalar(delta * speedMultiplier));

    const distFromCenter = this.position.length();
    if (distFromCenter > Butterfly.WANDER_RADIUS) {
      const pushBack = this.position.clone().normalize().multiplyScalar(Butterfly.WANDER_RADIUS * 0.9);
      this.position.lerp(pushBack, delta * 0.5);
    }

    this.group.position.copy(this.position);

    const lookTarget = this.position.clone();
    lookTarget.x += Math.sin(elapsed * 0.5 + this.phase.x) * 0.5;
    lookTarget.y += Math.cos(elapsed * 0.3 + this.phase.y) * 0.3;
    lookTarget.z += Math.cos(elapsed * 0.7 + this.phase.z) * 0.5;

    if (this.targetFlower && this.targetFlower.isBloomed) {
      lookTarget.copy(this.targetFlower.position);
    }

    this.group.lookAt(lookTarget);
    this.group.rotateX(Math.sin(elapsed * 3 + this.phase.x) * 0.1);

    this.updateWingColor();
    this.updateTrail();
    this.checkFlowerProximity(flowers);
  }

  private updateWingColor(): void {
    let color: THREE.Color;

    if (this.isGolden || this.goldenTimer > 0) {
      color = new THREE.Color(0xffd700);
    } else {
      const hue = (170 + this.hue * 0.3) % 360;
      color = new THREE.Color().setHSL(hue / 360, 1, 0.6);
    }

    (this.leftWing.material as THREE.MeshBasicMaterial).color.copy(color);
    (this.rightWing.material as THREE.MeshBasicMaterial).color.copy(color);
    (this.body.material as THREE.MeshBasicMaterial).color.copy(color);
    (this.trail.material as THREE.LineBasicMaterial).color.copy(color);
  }

  private updateTrail(): void {
    for (let i = Butterfly.TRAIL_LENGTH - 1; i > 0; i--) {
      this.trailPositions[i * 3] = this.trailPositions[(i - 1) * 3];
      this.trailPositions[i * 3 + 1] = this.trailPositions[(i - 1) * 3 + 1];
      this.trailPositions[i * 3 + 2] = this.trailPositions[(i - 1) * 3 + 2];
    }

    this.trailPositions[0] = this.position.x;
    this.trailPositions[1] = this.position.y;
    this.trailPositions[2] = this.position.z;

    (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private checkFlowerProximity(flowers: Flower[]): void {
    if (this.targetFlower && this.targetFlower.isBloomed) {
      const dist = this.position.distanceTo(this.targetFlower.position);
      if (dist < 1.0 && !this.isCollecting) {
        this.startCollecting();
        this.targetFlower.onButterflyNearby();
      }
    }
  }

  public startCollecting(): void {
    this.isCollecting = true;
    this.collectFlashTimer = 0.3;
  }

  public setGolden(duration: number = 2): void {
    this.isGolden = true;
    this.goldenTimer = duration;
  }

  public dispose(): void {
    this.group.parent?.remove(this.group);
  }

  public static spawnButterflies(scene: THREE.Scene, count: number): Butterfly[] {
    const butterflies: Butterfly[] = [];
    for (let i = 0; i < count; i++) {
      butterflies.push(new Butterfly(scene));
    }
    return butterflies;
  }
}
