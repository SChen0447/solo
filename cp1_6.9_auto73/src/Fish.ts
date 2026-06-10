import * as THREE from 'three';

export interface FishOptions {
  isPlayer?: boolean;
  length?: number;
  bodyColorStart?: THREE.Color;
  bodyColorEnd?: THREE.Color;
  glowColor?: THREE.Color;
  position?: THREE.Vector3;
}

export class Fish {
  public group: THREE.Group;
  public isPlayer: boolean;
  public length: number;

  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public targetPosition: THREE.Vector3;

  public rotation: THREE.Euler;
  public targetRotation: THREE.Euler;

  public bodySwingPhase: number;
  public tailSwingPhase: number;
  public swingAmplitude: number;
  public tailFrequency: number;

  public glowColor: THREE.Color;
  public glowBaseIntensity: number;
  public glowIntensity: number;
  public targetGlowIntensity: number;
  public glowPulsePhase: number;
  public glowPulseSpeed: number;
  public basePulseSpeed: number;

  public flashTimer: number;
  public flashDuration: number;
  public isFlashing: boolean;

  public speed: number;
  public targetSpeed: number;

  public attentionTimer: number;
  public isAttracted: boolean;

  public inertiaTimer: number;
  public isMoving: boolean;

  private bodyMesh: THREE.Mesh;
  private tailMesh: THREE.Mesh;
  private glowMesh: THREE.Mesh;
  private glowLight: THREE.SpotLight;
  private glowTarget: THREE.Object3D;

  constructor(options: FishOptions = {}) {
    this.isPlayer = options.isPlayer ?? false;
    this.length = options.length ?? (this.isPlayer ? 1.5 : 1.0);

    this.position = options.position?.clone() ?? new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.targetPosition = this.position.clone();

    this.rotation = new THREE.Euler(0, 0, 0);
    this.targetRotation = new THREE.Euler(0, 0, 0);

    this.bodySwingPhase = Math.random() * Math.PI * 2;
    this.tailSwingPhase = Math.random() * Math.PI * 2;
    this.swingAmplitude = 0.05;
    this.tailFrequency = 2.0;

    const glowColors = this.isPlayer
      ? [new THREE.Color(0xffdd44), new THREE.Color(0xff8844), new THREE.Color(0x44ff88)]
      : [new THREE.Color(0xff4433), new THREE.Color(0x4488ff), new THREE.Color(0x44cc88)];
    this.glowColor = options.glowColor ?? glowColors[Math.floor(Math.random() * glowColors.length)];

    this.glowBaseIntensity = 1.0;
    this.glowIntensity = 1.0;
    this.targetGlowIntensity = 1.0;
    this.glowPulsePhase = Math.random() * Math.PI * 2;
    this.basePulseSpeed = 1.5 + Math.random() * 1.5;
    this.glowPulseSpeed = this.basePulseSpeed;

    this.flashTimer = 0;
    this.flashDuration = 0;
    this.isFlashing = false;

    this.speed = this.isPlayer ? 1.5 : 0.45;
    this.targetSpeed = this.speed;

    this.attentionTimer = 0;
    this.isAttracted = false;

    this.inertiaTimer = 0;
    this.isMoving = false;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.bodyMesh = this.createBody(options.bodyColorStart, options.bodyColorEnd);
    this.tailMesh = this.createTail(options.bodyColorStart, options.bodyColorEnd);
    this.glowMesh = this.createGlowOrb();
    this.glowLight = this.createGlowLight();
    this.glowTarget = new THREE.Object3D();
    this.glowTarget.position.set(0, 0, -5);

    this.group.add(this.bodyMesh);
    this.group.add(this.tailMesh);
    this.group.add(this.glowMesh);
    this.group.add(this.glowLight);
    this.group.add(this.glowTarget);
    this.glowLight.target = this.glowTarget;

    this.group.rotation.copy(this.rotation);
  }

  private createBody(colorStart?: THREE.Color, colorEnd?: THREE.Color): THREE.Mesh {
    const bodyLength = this.length * 0.7;
    const bodyRadius = this.length * 0.25;

    const geometry = new THREE.SphereGeometry(1, 16, 12);
    geometry.scale(bodyLength / 2, bodyRadius, bodyRadius);

    const start = colorStart ?? new THREE.Color(this.isPlayer ? 0x1a2a4a : 0x1a2a4a);
    const end = colorEnd ?? new THREE.Color(this.isPlayer ? 0xaabbcc : 0x2a4a1a);

    const colors: number[] = [];
    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = (y + bodyRadius) / (2 * bodyRadius);
      const c = start.clone().lerp(end, THREE.MathUtils.clamp(1 - t, 0, 1));
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = -bodyLength * 0.15;
    return mesh;
  }

  private createTail(colorStart?: THREE.Color, colorEnd?: THREE.Color): THREE.Mesh {
    const tailLength = this.length * 0.45;
    const tailWidth = this.length * 0.35;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(tailLength * 0.5, tailWidth * 0.5, tailLength, 0);
    shape.quadraticCurveTo(tailLength * 0.5, -tailWidth * 0.5, 0, 0);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: this.length * 0.04,
      bevelEnabled: false,
      curveSegments: 8
    });
    geometry.center();

    const start = colorStart ?? new THREE.Color(this.isPlayer ? 0x1a2a4a : 0x1a2a4a);
    const end = colorEnd ?? new THREE.Color(this.isPlayer ? 0xaabbcc : 0x2a4a1a);
    const mid = start.clone().lerp(end, 0.5);

    const colors: number[] = [];
    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      const t = (z + this.length * 0.02) / (this.length * 0.04);
      const c = mid.clone().lerp(start, THREE.MathUtils.clamp(Math.abs(t - 0.5) * 2, 0, 1));
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = -this.length * 0.55;
    return mesh;
  }

  private createGlowOrb(): THREE.Mesh {
    const radius = this.isPlayer ? 0.3 : this.length * 0.18;
    const geometry = new THREE.SphereGeometry(radius, 16, 12);

    const material = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, this.length * 0.22, 0);
    return mesh;
  }

  private createGlowLight(): THREE.SpotLight {
    const light = new THREE.SpotLight(this.glowColor, 0.6, 6, Math.PI / 4, 0.5, 2);
    light.position.set(0, this.length * 0.22, 0);
    return light;
  }

  public triggerFlash(duration: number = 0.3, intensity: number = 2.0): void {
    this.isFlashing = true;
    this.flashTimer = duration;
    this.flashDuration = duration;
    this.glowIntensity = intensity;
    this.glowLight.intensity = intensity * 0.6;
    this.glowLight.distance = this.isPlayer ? 10 : 6;

    const mat = this.glowMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.min(1.0, intensity * 0.5);
  }

  public triggerAttention(duration: number): void {
    this.isAttracted = true;
    this.attentionTimer = duration;
    this.targetGlowIntensity = 1.5;
    this.glowPulseSpeed = this.basePulseSpeed * 2;
  }

  public update(dt: number, moveDirection?: THREE.Vector3): void {
    this.glowPulsePhase += this.glowPulseSpeed * dt;
    const pulse = 0.7 + 0.3 * Math.sin(this.glowPulsePhase);

    if (this.isFlashing) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
        this.flashTimer = 0;
        this.targetGlowIntensity = this.glowBaseIntensity;
        this.glowLight.distance = this.isPlayer ? 6 : 4;
      } else {
        const t = this.flashTimer / this.flashDuration;
        const decay = Math.pow(t, 2);
        const flashPeak = this.isPlayer ? 2.0 : 1.5;
        this.glowIntensity = this.glowBaseIntensity + (flashPeak - this.glowBaseIntensity) * decay;
        this.glowLight.intensity = 0.6 + (flashPeak * 0.6 - 0.6) * decay;
      }
    } else {
      const lerpT = 1 - Math.pow(0.001, dt);
      this.glowIntensity = THREE.MathUtils.lerp(this.glowIntensity, this.targetGlowIntensity * pulse, lerpT);
      this.glowLight.intensity = THREE.MathUtils.lerp(this.glowLight.intensity, 0.6 * this.glowIntensity, lerpT);
    }

    const mat = this.glowMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.7 + 0.2 * (this.glowIntensity / this.glowBaseIntensity - 1);
    const scale = 1.0 + 0.1 * (this.glowIntensity / this.glowBaseIntensity - 1);
    this.glowMesh.scale.setScalar(scale);

    if (this.attentionTimer > 0) {
      this.attentionTimer -= dt;
      if (this.attentionTimer <= 0) {
        this.isAttracted = false;
        this.targetGlowIntensity = this.glowBaseIntensity;
        this.glowPulseSpeed = this.basePulseSpeed;
      }
    }

    const speedLerp = 1 - Math.pow(0.0001, dt);
    this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, speedLerp);

    if (this.isPlayer) {
      if (moveDirection && moveDirection.lengthSq() > 0) {
        this.isMoving = true;
        this.inertiaTimer = 0;
        const dir = moveDirection.clone().normalize();
        this.velocity.lerp(dir.multiplyScalar(this.speed), 1 - Math.pow(0.001, dt));

        const targetYaw = Math.atan2(dir.x, dir.z);
        this.targetRotation.y = targetYaw;
      } else {
        if (this.isMoving) {
          this.inertiaTimer += dt;
          if (this.inertiaTimer >= 0.2) {
            this.isMoving = false;
            this.velocity.multiplyScalar(0);
          } else {
            const decel = 1 - (this.inertiaTimer / 0.2);
            this.velocity.multiplyScalar(decel);
          }
        }
      }
    }

    this.position.addScaledVector(this.velocity, dt);

    const posLerp = 1 - Math.pow(0.0001, dt);
    this.group.position.lerp(this.position, posLerp);

    if (!this.isPlayer || this.velocity.lengthSq() > 0.001) {
      if (!this.isPlayer) {
        const toTarget = this.targetPosition.clone().sub(this.position);
        if (toTarget.lengthSq() > 0.01) {
          toTarget.normalize();
          const targetYaw = Math.atan2(toTarget.x, toTarget.z);
          this.targetRotation.y = targetYaw;
        }
      }

      const rotLerp = 1 - Math.pow(0.01, dt);
      this.rotation.y = THREE.MathUtils.lerp(this.rotation.y, this.targetRotation.y, rotLerp);
      this.rotation.x = THREE.MathUtils.lerp(this.rotation.x, this.targetRotation.x, rotLerp);
      this.rotation.z = THREE.MathUtils.lerp(this.rotation.z, this.targetRotation.z, rotLerp);
      this.group.rotation.copy(this.rotation);
    }

    if (this.isMoving || (!this.isPlayer && this.speed > 0.1)) {
      this.bodySwingPhase += this.swingAmplitude * 10 * dt;
      this.tailSwingPhase += this.tailFrequency * Math.PI * 2 * dt;

      const bodySwing = Math.sin(this.bodySwingPhase) * this.swingAmplitude;
      this.bodyMesh.rotation.y = bodySwing;

      const tailSwing = Math.sin(this.tailSwingPhase) * 0.5;
      this.tailMesh.rotation.y = tailSwing;
      this.tailMesh.position.x = -this.length * 0.55;
    } else {
      const rotLerp = 1 - Math.pow(0.01, dt);
      this.bodyMesh.rotation.y = THREE.MathUtils.lerp(this.bodyMesh.rotation.y, 0, rotLerp);
      this.tailMesh.rotation.y = THREE.MathUtils.lerp(this.tailMesh.rotation.y, 0, rotLerp);
    }
  }

  public getRadius(): number {
    return this.length * 0.35;
  }

  public getGlowWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.glowMesh.getWorldPosition(pos);
    return pos;
  }
}
