import * as THREE from 'three';
import { InsectBase, FlowerData, InsectParams } from './InsectBase';

export class ButterflyInsect extends InsectBase {
  private wingAngle: number = 0;
  private leftWing: THREE.Mesh | null = null;
  private rightWing: THREE.Mesh | null = null;
  private wanderTimer: number = 0;

  constructor(
    startPosition: THREE.Vector3,
    params: InsectParams,
    scene: THREE.Scene
  ) {
    super('butterfly', startPosition, '#FF69B4', params, scene);
    this.baseSpeed = 1.2;
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const leftWingGeo = new THREE.PlaneGeometry(0.25, 0.2);
    const leftCanvas = document.createElement('canvas');
    leftCanvas.width = 128;
    leftCanvas.height = 128;
    const leftCtx = leftCanvas.getContext('2d')!;
    const grad1 = leftCtx.createRadialGradient(64, 64, 5, 64, 64, 60);
    grad1.addColorStop(0, '#FF69B4');
    grad1.addColorStop(0.5, '#FF1493');
    grad1.addColorStop(1, '#C71585');
    leftCtx.fillStyle = grad1;
    leftCtx.fillRect(0, 0, 128, 128);
    leftCtx.fillStyle = '#FFD700';
    leftCtx.beginPath();
    leftCtx.arc(40, 50, 8, 0, Math.PI * 2);
    leftCtx.fill();
    leftCtx.beginPath();
    leftCtx.arc(80, 70, 6, 0, Math.PI * 2);
    leftCtx.fill();
    leftCtx.fillStyle = '#000000';
    leftCtx.beginPath();
    leftCtx.arc(60, 90, 4, 0, Math.PI * 2);
    leftCtx.fill();

    const leftTex = new THREE.CanvasTexture(leftCanvas);
    const wingMat1 = new THREE.MeshStandardMaterial({
      map: leftTex,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.4
    });
    this.leftWing = new THREE.Mesh(leftWingGeo, wingMat1);
    this.leftWing.position.set(-0.12, 0, 0);
    group.add(this.leftWing);

    const rightCanvas = document.createElement('canvas');
    rightCanvas.width = 128;
    rightCanvas.height = 128;
    const rightCtx = rightCanvas.getContext('2d')!;
    const grad2 = rightCtx.createRadialGradient(64, 64, 5, 64, 64, 60);
    grad2.addColorStop(0, '#FF69B4');
    grad2.addColorStop(0.5, '#FF1493');
    grad2.addColorStop(1, '#C71585');
    rightCtx.fillStyle = grad2;
    rightCtx.fillRect(0, 0, 128, 128);
    rightCtx.fillStyle = '#FFD700';
    rightCtx.beginPath();
    rightCtx.arc(88, 50, 8, 0, Math.PI * 2);
    rightCtx.fill();
    rightCtx.beginPath();
    rightCtx.arc(48, 70, 6, 0, Math.PI * 2);
    rightCtx.fill();
    rightCtx.fillStyle = '#000000';
    rightCtx.beginPath();
    rightCtx.arc(68, 90, 4, 0, Math.PI * 2);
    rightCtx.fill();

    const rightTex = new THREE.CanvasTexture(rightCanvas);
    const wingMat2 = new THREE.MeshStandardMaterial({
      map: rightTex,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.4
    });
    this.rightWing = new THREE.Mesh(leftWingGeo, wingMat2);
    this.rightWing.position.set(0.12, 0, 0);
    group.add(this.rightWing);

    const antennaGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 4);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const ant1 = new THREE.Mesh(antennaGeo, antennaMat);
    ant1.position.set(-0.03, 0.02, 0.1);
    ant1.rotation.x = -0.5;
    group.add(ant1);
    const ant2 = new THREE.Mesh(antennaGeo, antennaMat);
    ant2.position.set(0.03, 0.02, 0.1);
    ant2.rotation.x = -0.5;
    group.add(ant2);

    return group;
  }

  private getColorContrast(color: THREE.Color): number {
    const bgR = 0x0d / 255, bgG = 0x1b / 255, bgB = 0x2a / 255;
    return Math.abs(color.r - bgR) + Math.abs(color.g - bgG) + Math.abs(color.b - bgB);
  }

  public randomWander(dt: number, windDirection: THREE.Vector3, windStrength: number) {
    this.wanderAngle += (Math.random() - 0.5) * this.params.turnSensitivity * 4 * dt;
    const direction = new THREE.Vector3(
      Math.cos(this.wanderAngle),
      (Math.random() - 0.5) * 0.3,
      Math.sin(this.wanderAngle)
    ).normalize();
    const speed = this.baseSpeed * this.params.speed * 0.6;
    this.velocity.lerp(direction.multiplyScalar(speed), this.params.turnSensitivity);
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.applyWind(windStrength, windDirection, dt);
    this.position.y = Math.max(0.3, Math.min(3, this.position.y));
    this.mesh.position.copy(this.position);
  }

  public step(
    dt: number,
    flowers: FlowerData[],
    windStrength: number,
    windDirection: THREE.Vector3
  ): void {
    if (!this.alive) return;

    this.wingAngle += dt * 12;
    const wingFlap = Math.abs(Math.sin(this.wingAngle)) * 0.8 + 0.1;
    if (this.leftWing) this.leftWing.rotation.y = -wingFlap;
    if (this.rightWing) this.rightWing.rotation.y = wingFlap;

    const now = performance.now();
    if (this.isOnFlower && this.currentTarget) {
      if (now > this.onFlowerUntil) {
        this.isOnFlower = false;
        this.currentTarget = null;
      } else {
        this.position.copy(this.currentTarget.center);
        this.mesh.position.copy(this.position);
        return;
      }
    }

    this.wanderTimer -= dt;

    if (!this.currentTarget || this.wanderTimer <= 0) {
      this.wanderTimer = 1 + Math.random() * 2;
      const valid = flowers.filter(f => f.attractionLevel !== 'low');
      if (valid.length > 0) {
        const goStraight = Math.random() * 100 < this.params.straightProbability;
        if (goStraight) {
          valid.sort((a, b) => {
            if (a.attractionLevel === 'high' && b.attractionLevel !== 'high') return -1;
            if (b.attractionLevel === 'high' && a.attractionLevel !== 'high') return 1;
            const contrastA = this.getColorContrast(a.petalColor);
            const contrastB = this.getColorContrast(b.petalColor);
            const distA = this.position.distanceTo(a.center);
            const distB = this.position.distanceTo(b.center);
            return (contrastB / (distB + 1)) - (contrastA / (distA + 1));
          });
        } else {
          valid.sort(() => Math.random() - 0.5);
        }
        this.currentTarget = valid[0];
      }
    }

    if (this.currentTarget && Math.random() > 0.3) {
      this.moveTowards(this.currentTarget.center, dt, 0.7);
      this.applyWind(windStrength, windDirection, dt);
      if (this.checkArrival(this.currentTarget)) {
        this.recordVisit(this.currentTarget);
        this.isOnFlower = true;
        this.onFlowerUntil = now + 2500;
      }
    } else {
      this.randomWander(dt, windDirection, windStrength);
    }

    this.mesh.lookAt(this.position.clone().add(this.velocity));
    this.addTrailPoint();
  }
}
