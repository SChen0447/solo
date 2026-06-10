import * as THREE from 'three';
import { Fish } from './Fish';
import { ParticleSystem } from './ParticleSystem';

export interface ControllerState {
  playerFish: Fish;
  aiFishes: Fish[];
  flashCount: number;
}

export class FishController {
  public playerFish: Fish;
  public aiFishes: Fish[];
  public group: THREE.Group;
  public particleSystem: ParticleSystem;
  public flashCount: number;

  private maxAiCount: number = 12;
  private minAiCount: number = 6;
  private attractDistance: number = 2.0;
  private bounds: THREE.Box3;

  private aiScanTimers: number[];
  private aiGatherTimers: number[];
  private aiWanderTargets: THREE.Vector3[];
  private aiWanderTimers: number[];
  private aiBezierStart: (THREE.Vector3 | null)[];
  private aiBezierEnd: (THREE.Vector3 | null)[];
  private aiBezierControl: (THREE.Vector3 | null)[];
  private aiBezierT: number[];
  private aiBezierActive: boolean[];

  private audioContext: AudioContext | null = null;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.aiFishes = [];
    this.flashCount = 0;
    this.bounds = new THREE.Box3(
      new THREE.Vector3(-15, -8, -15),
      new THREE.Vector3(15, 8, 15)
    );

    this.aiScanTimers = [];
    this.aiGatherTimers = [];
    this.aiWanderTargets = [];
    this.aiWanderTimers = [];
    this.aiBezierStart = [];
    this.aiBezierEnd = [];
    this.aiBezierControl = [];
    this.aiBezierT = [];
    this.aiBezierActive = [];

    this.playerFish = new Fish({
      isPlayer: true,
      length: 1.5,
      position: new THREE.Vector3(0, 0, 0)
    });
    this.group.add(this.playerFish.group);

    this.particleSystem = new ParticleSystem(400);
    this.group.add(this.particleSystem.group);

    const aiCount = this.minAiCount + Math.floor(Math.random() * (this.maxAiCount - this.minAiCount + 1));
    for (let i = 0; i < aiCount; i++) {
      this.spawnAiFish();
    }

    scene.add(this.group);
  }

  private spawnAiFish(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 6;
    const position = new THREE.Vector3(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 4,
      Math.sin(angle) * radius
    );

    const bodyStart = new THREE.Color().setHSL(0.6, 0.4, 0.15 + Math.random() * 0.1);
    const bodyEnd = new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.3, 0.25 + Math.random() * 0.1);

    const fish = new Fish({
      isPlayer: false,
      length: 0.8 + Math.random() * 0.4,
      bodyColorStart: bodyStart,
      bodyColorEnd: bodyEnd,
      position: position
    });
    fish.targetSpeed = 0.3 + Math.random() * 0.3;

    this.group.add(fish.group);
    this.aiFishes.push(fish);

    this.aiScanTimers.push(2 + Math.random() * 2);
    this.aiGatherTimers.push(0);
    this.aiWanderTargets.push(this.getRandomWanderTarget());
    this.aiWanderTimers.push(2 + Math.random() * 3);
    this.aiBezierStart.push(null);
    this.aiBezierEnd.push(null);
    this.aiBezierControl.push(null);
    this.aiBezierT.push(0);
    this.aiBezierActive.push(false);
  }

  private getRandomWanderTarget(): THREE.Vector3 {
    const size = this.bounds.getSize(new THREE.Vector3());
    return new THREE.Vector3(
      this.bounds.min.x + Math.random() * size.x,
      this.bounds.min.y + Math.random() * size.y,
      this.bounds.min.z + Math.random() * size.z
    );
  }

  public triggerPlayerFlash(): void {
    this.playerFish.triggerFlash(0.3, 2.0);
    this.flashCount++;

    const glowPos = this.playerFish.getGlowWorldPosition();
    this.particleSystem.spawnWave(glowPos, new THREE.Color(0xffdd44), 0.3, 3.0, 0.5);

    this.playBeep();

    for (let i = 0; i < this.aiFishes.length; i++) {
      const ai = this.aiFishes[i];
      const dist = ai.position.distanceTo(this.playerFish.position);

      ai.triggerFlash(0.5, 1.5);

      if (dist < 8) {
        this.aiGatherTimers[i] = 2.0;
        ai.targetSpeed = 1.0;

        this.aiBezierStart[i] = ai.position.clone();
        const toPlayer = this.playerFish.position.clone().sub(ai.position).normalize();
        const gatherPoint = this.playerFish.position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 3
          )
        );
        this.aiBezierEnd[i] = gatherPoint;

        const mid = ai.position.clone().add(gatherPoint).multiplyScalar(0.5);
        const perp = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 4
        );
        this.aiBezierControl[i] = mid.add(perp);
        this.aiBezierT[i] = 0;
        this.aiBezierActive[i] = true;
      }
    }
  }

  private playBeep(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 500;

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
    }
  }

  public update(dt: number, playerMoveDir?: THREE.Vector3, cameraPosition?: THREE.Vector3): void {
    this.playerFish.update(dt, playerMoveDir);

    this.clampToBounds(this.playerFish);

    for (let i = 0; i < this.aiFishes.length; i++) {
      const ai = this.aiFishes[i];
      const distToPlayer = ai.position.distanceTo(this.playerFish.position);

      this.aiScanTimers[i] -= dt;
      if (this.aiScanTimers[i] <= 0) {
        this.aiScanTimers[i] = 2 + Math.random() * 2;
        if (distToPlayer < 6 && !ai.isAttracted && this.aiGatherTimers[i] <= 0) {
          const lookDir = this.playerFish.position.clone().sub(ai.position).normalize();
          const angle = Math.random() * 0.5;
          ai.targetRotation.y = Math.atan2(lookDir.x, lookDir.z) + (Math.random() - 0.5) * angle;
        }
      }

      if (distToPlayer < this.attractDistance && !ai.isAttracted && this.aiGatherTimers[i] <= 0) {
        ai.triggerAttention(1 + Math.random());
      }

      if (this.aiGatherTimers[i] > 0) {
        this.aiGatherTimers[i] -= dt;
        if (this.aiGatherTimers[i] <= 0) {
          ai.targetSpeed = 0.3 + Math.random() * 0.3;
          this.aiBezierActive[i] = false;
        }
      }

      if (this.aiBezierActive[i] && this.aiBezierStart[i] && this.aiBezierEnd[i] && this.aiBezierControl[i]) {
        this.aiBezierT[i] += dt * 0.6;
        const t = Math.min(this.aiBezierT[i], 1.0);
        const bezier = this.cubicBezier(
          this.aiBezierStart[i]!,
          this.aiBezierControl[i]!,
          this.aiBezierEnd[i]!,
          t
        );
        ai.targetPosition.copy(bezier);

        const toTarget = bezier.clone().sub(ai.position).normalize();
        ai.velocity.lerp(toTarget.multiplyScalar(ai.targetSpeed), 1 - Math.pow(0.001, dt));

        if (t >= 1.0) {
          this.aiBezierActive[i] = false;
        }
      } else {
        this.aiWanderTimers[i] -= dt;
        if (this.aiWanderTimers[i] <= 0 || ai.position.distanceTo(this.aiWanderTargets[i]) < 1) {
          this.aiWanderTimers[i] = 2 + Math.random() * 3;
          this.aiWanderTargets[i] = this.getRandomWanderTarget();
        }

        const wanderDir = this.aiWanderTargets[i].clone().sub(ai.position).normalize();
        if (ai.isAttracted) {
          const attractDir = this.playerFish.position.clone().sub(ai.position).normalize();
          wanderDir.lerp(attractDir, 0.7).normalize();
        }
        ai.targetPosition.copy(ai.position.clone().add(wanderDir));
        ai.velocity.lerp(wanderDir.multiplyScalar(ai.targetSpeed), 1 - Math.pow(0.01, dt));
      }

      ai.update(dt);
      this.clampToBounds(ai);
    }

    this.resolveCollisions(dt);
    this.particleSystem.update(dt, cameraPosition);
  }

  private cubicBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
    const t2 = t * t;
    const mt = 1 - t;
    const mt2 = mt * mt;

    return new THREE.Vector3(
      mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
      mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y,
      mt2 * p0.z + 2 * mt * t * p1.z + t2 * p2.z
    );
  }

  private clampToBounds(fish: Fish): void {
    const margin = 1;
    fish.position.x = THREE.MathUtils.clamp(fish.position.x, this.bounds.min.x + margin, this.bounds.max.x - margin);
    fish.position.y = THREE.MathUtils.clamp(fish.position.y, this.bounds.min.y + margin, this.bounds.max.y - margin);
    fish.position.z = THREE.MathUtils.clamp(fish.position.z, this.bounds.min.z + margin, this.bounds.max.z - margin);
  }

  private resolveCollisions(dt: number): void {
    const elasticity = 0.8;
    const allFishes = [this.playerFish, ...this.aiFishes];

    for (let i = 0; i < allFishes.length; i++) {
      for (let j = i + 1; j < allFishes.length; j++) {
        const a = allFishes[i];
        const b = allFishes[j];
        const minDist = a.getRadius() + b.getRadius();
        const diff = b.position.clone().sub(a.position);
        const dist = diff.length();

        if (dist < minDist && dist > 0.001) {
          const normal = diff.normalize();
          const overlap = minDist - dist;

          const pushA = normal.clone().multiplyScalar(-overlap * 0.5);
          const pushB = normal.clone().multiplyScalar(overlap * 0.5);

          a.position.add(pushA);
          b.position.add(pushB);

          const relVel = b.velocity.clone().sub(a.velocity);
          const velAlongNormal = relVel.dot(normal);

          if (velAlongNormal < 0) {
            const impulse = -(1 + elasticity) * velAlongNormal / 2;
            const impulseVec = normal.clone().multiplyScalar(impulse);

            a.velocity.sub(impulseVec);
            b.velocity.add(impulseVec);
          }
        }
      }
    }
  }

  public getState(): ControllerState {
    return {
      playerFish: this.playerFish,
      aiFishes: this.aiFishes,
      flashCount: this.flashCount
    };
  }

  public dispose(): void {
    this.particleSystem.dispose();
  }
}
