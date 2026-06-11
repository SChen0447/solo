import * as THREE from 'three';

interface Firefly {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  glow: THREE.Mesh;
  center: THREE.Vector3;
  baseCenter: THREE.Vector3;
  ellipseA: number;
  ellipseB: number;
  angle: number;
  speed: number;
  yOffset: number;
  ySpeed: number;
  yBase: number;
  phase: number;
  flashPhase: number;
  flashSpeed: number;
}

export class Fireflies {
  private fireflies: Firefly[] = [];
  private scene: THREE.Scene;
  private attractTarget: THREE.Vector3 | null = null;
  private attractStrength: number = 0;
  private count: number;

  private readonly FLASH_DURATION = 1.5;
  private readonly MIN_PERIOD = 8;
  private readonly MAX_PERIOD = 12;

  constructor(scene: THREE.Scene, count: number = 8) {
    this.scene = scene;
    this.count = count;
    this.createFireflies();
  }

  private createFireflies(): void {
    const bodyGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);

    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa
    });

    for (let i = 0; i < this.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1.5;
      
      const baseCenter = new THREE.Vector3(
        Math.cos(angle) * radius,
        1.5 + Math.random() * 3,
        Math.sin(angle) * radius
      );

      const body = new THREE.Mesh(bodyGeometry, bodyMaterial.clone());
      body.position.copy(baseCenter);
      body.castShadow = false;
      body.receiveShadow = false;

      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff88,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      body.add(glow);

      const light = new THREE.PointLight(0xffff88, 0, 3, 2);
      body.add(light);

      const period = this.MIN_PERIOD + Math.random() * (this.MAX_PERIOD - this.MIN_PERIOD);
      
      this.fireflies.push({
        mesh: body,
        light,
        glow,
        center: baseCenter.clone(),
        baseCenter: baseCenter.clone(),
        ellipseA: 0.8 + Math.random() * 0.8,
        ellipseB: 0.5 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.PI * 2) / period,
        yOffset: 0,
        ySpeed: 0.5 + Math.random() * 0.5,
        yBase: 0,
        phase: Math.random() * Math.PI * 2,
        flashPhase: Math.random() * Math.PI * 2,
        flashSpeed: (Math.PI * 2) / this.FLASH_DURATION
      });

      this.scene.add(body);
    }
  }

  public setAttractTarget(target: THREE.Vector3 | null): void {
    this.attractTarget = target;
    if (target) {
      this.attractStrength = 0;
    }
  }

  public update(deltaTime: number): void {
    if (this.attractTarget) {
      this.attractStrength = Math.min(1, this.attractStrength + deltaTime * 0.5);
    } else {
      this.attractStrength = Math.max(0, this.attractStrength - deltaTime * 0.3);
    }

    const time = performance.now() * 0.001;

    for (let i = 0; i < this.fireflies.length; i++) {
      const ff = this.fireflies[i];

      ff.angle += ff.speed * deltaTime;
      ff.phase += ff.ySpeed * deltaTime;
      ff.flashPhase += ff.flashSpeed * deltaTime;

      const x = ff.center.x + Math.cos(ff.angle) * ff.ellipseA;
      const z = ff.center.z + Math.sin(ff.angle) * ff.ellipseB;
      const y = ff.center.y + Math.sin(ff.phase) * 0.3;

      ff.mesh.position.set(x, y, z);

      if (this.attractStrength > 0 && this.attractTarget) {
        const offsetAngle = (i / this.fireflies.length) * Math.PI * 2;
        const offsetRadius = 0.5 + Math.sin(time + i) * 0.2;
        const targetPos = new THREE.Vector3(
          this.attractTarget.x + Math.cos(offsetAngle) * offsetRadius,
          this.attractTarget.y + 0.3 + Math.sin(offsetAngle * 2) * 0.2,
          this.attractTarget.z + Math.sin(offsetAngle) * offsetRadius
        );

        ff.center.lerp(targetPos, this.attractStrength * deltaTime * 2);
        ff.ellipseA = THREE.MathUtils.lerp(ff.ellipseA, 0.2, this.attractStrength * deltaTime);
        ff.ellipseB = THREE.MathUtils.lerp(ff.ellipseB, 0.15, this.attractStrength * deltaTime);
      } else {
        ff.center.lerp(ff.baseCenter, deltaTime * 0.5);
        ff.ellipseA = THREE.MathUtils.lerp(ff.ellipseA, 0.8 + Math.random() * 0.8, deltaTime * 0.3);
        ff.ellipseB = THREE.MathUtils.lerp(ff.ellipseB, 0.5 + Math.random() * 0.5, deltaTime * 0.3);
      }

      const flashIntensity = (Math.sin(ff.flashPhase) + 1) / 2;
      const glowMaterial = ff.glow.material as THREE.MeshBasicMaterial;
      
      const flashCurve = Math.pow(flashIntensity, 2);
      glowMaterial.opacity = flashCurve * 0.6;
      ff.light.intensity = flashCurve * 1.5;
      
      const hueShift = this.attractStrength * 0.1;
      const color = new THREE.Color(0xffff88);
      color.offsetHSL(hueShift, 0, 0);
      glowMaterial.color.copy(color);
      ff.light.color.copy(color);
      
      const bodyMaterial = ff.mesh.material as THREE.MeshBasicMaterial;
      bodyMaterial.color.setRGB(
        1,
        1,
        0.7 + flashCurve * 0.3
      );

      const bodyScale = 1 + flashCurve * 0.3;
      ff.mesh.scale.setScalar(bodyScale);
    }
  }

  public dispose(): void {
    for (const ff of this.fireflies) {
      this.scene.remove(ff.mesh);
      ff.mesh.geometry.dispose();
      (ff.mesh.material as THREE.Material).dispose();
      ff.glow.geometry.dispose();
      (ff.glow.material as THREE.Material).dispose();
      ff.light.dispose();
    }
    this.fireflies = [];
  }
}
