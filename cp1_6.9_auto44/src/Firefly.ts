import * as THREE from 'three';

interface BezierPath {
  start: THREE.Vector3;
  cp1: THREE.Vector3;
  cp2: THREE.Vector3;
  end: THREE.Vector3;
  duration: number;
  elapsed: number;
}

export class Firefly {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public coreMesh: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  public baseFrequency: number;
  public currentFrequency: number;
  public baseColor: THREE.Color;
  public currentColor: THREE.Color;
  public targetFrequency: number;
  public frequencyTransitionTime: number;
  public colorTransitionTime: number;
  public isAffected: boolean;
  public affectedTimer: number;

  private path: BezierPath;
  private speed: number;
  private phase: number;
  private minBounds: THREE.Vector3;
  private maxBounds: THREE.Vector3;
  private coreMaterial: THREE.MeshBasicMaterial;
  private glowMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.position = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      1 + Math.random() * 2,
      (Math.random() - 0.5) * 5
    );
    this.minBounds = new THREE.Vector3(-3, 0.5, -3);
    this.maxBounds = new THREE.Vector3(3, 3.5, 3);

    this.baseFrequency = 0.5 + Math.random() * 1.5;
    this.currentFrequency = this.baseFrequency;
    this.targetFrequency = this.baseFrequency;
    this.frequencyTransitionTime = 0;
    this.colorTransitionTime = 0;
    this.isAffected = false;
    this.affectedTimer = 0;

    const colorT = Math.random();
    this.baseColor = new THREE.Color().lerpColors(
      new THREE.Color(0xaaffaa),
      new THREE.Color(0xffffcc),
      colorT
    );
    this.currentColor = this.baseColor.clone();

    this.speed = 0.1 + Math.random() * 0.2;
    this.phase = Math.random() * Math.PI * 2;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const coreGeom = new THREE.SphereGeometry(0.08, 8, 8);
    this.coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 1.0
    });
    this.coreMesh = new THREE.Mesh(coreGeom, this.coreMaterial);
    this.mesh.add(this.coreMesh);

    const glowGeom = new THREE.SphereGeometry(0.15, 12, 12);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowMesh = new THREE.Mesh(glowGeom, this.glowMaterial);
    this.mesh.add(this.glowMesh);

    scene.add(this.mesh);

    this.path = this.generatePath();
  }

  private generatePath(): BezierPath {
    const start = this.position.clone();
    const end = new THREE.Vector3(
      THREE.MathUtils.clamp(start.x + (Math.random() - 0.5) * 2, this.minBounds.x, this.maxBounds.x),
      THREE.MathUtils.clamp(start.y + (Math.random() - 0.5) * 1.5, this.minBounds.y, this.maxBounds.y),
      THREE.MathUtils.clamp(start.z + (Math.random() - 0.5) * 2, this.minBounds.z, this.maxBounds.z)
    );
    const cp1 = new THREE.Vector3(
      start.x + (Math.random() - 0.5) * 1.5,
      THREE.MathUtils.clamp(start.y + Math.random() * 1.2, this.minBounds.y, this.maxBounds.y),
      start.z + (Math.random() - 0.5) * 1.5
    );
    const cp2 = new THREE.Vector3(
      end.x + (Math.random() - 0.5) * 1.5,
      THREE.MathUtils.clamp(end.y + Math.random() * 1.2, this.minBounds.y, this.maxBounds.y),
      end.z + (Math.random() - 0.5) * 1.5
    );

    const dist = start.distanceTo(end);
    const duration = Math.max(2, dist / this.speed);

    return { start, cp1, cp2, end, duration, elapsed: 0 };
  }

  public affectWithFrequency(targetFreq: number): void {
    this.targetFrequency = targetFreq;
    this.frequencyTransitionTime = 0.5;
    this.isAffected = true;
    this.affectedTimer = 3;
    this.colorTransitionTime = 0.5;
  }

  public checkCollision(point: THREE.Vector3, threshold: number = 0.4): boolean {
    return this.position.distanceTo(point) < threshold;
  }

  public update(delta: number, time: number): void {
    this.path.elapsed += delta;
    const t = Math.min(1, this.path.elapsed / this.path.duration);
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    this.position.x = mt3 * this.path.start.x + 3 * mt2 * t * this.path.cp1.x +
      3 * mt * t2 * this.path.cp2.x + t3 * this.path.end.x;
    this.position.y = mt3 * this.path.start.y + 3 * mt2 * t * this.path.cp1.y +
      3 * mt * t2 * this.path.cp2.y + t3 * this.path.end.y;
    this.position.z = mt3 * this.path.start.z + 3 * mt2 * t * this.path.cp1.z +
      3 * mt * t2 * this.path.cp2.z + t3 * this.path.end.z;

    if (t >= 1) {
      this.path = this.generatePath();
    }

    this.mesh.position.copy(this.position);

    if (this.frequencyTransitionTime > 0) {
      this.frequencyTransitionTime -= delta;
      const progress = 1 - Math.max(0, this.frequencyTransitionTime) / 0.5;
      this.currentFrequency = THREE.MathUtils.lerp(
        this.currentFrequency,
        this.targetFrequency,
        progress * delta * 4
      );
    }

    if (this.isAffected) {
      this.affectedTimer -= delta;
      if (this.affectedTimer <= 0) {
        this.isAffected = false;
        this.targetFrequency = this.baseFrequency;
        this.frequencyTransitionTime = 1.5;
        this.colorTransitionTime = 1.5;
      }
    }

    if (this.colorTransitionTime > 0) {
      this.colorTransitionTime -= delta;
      const warmColor = new THREE.Color().lerpColors(
        new THREE.Color(0xffdd88),
        new THREE.Color(0xffaa33),
        Math.random()
      );
      const targetCol = this.isAffected ? warmColor : this.baseColor;
      this.currentColor.lerp(targetCol, delta * 3);
    }

    const brightness = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(time * this.currentFrequency * Math.PI * 2 + this.phase));
    this.coreMaterial.opacity = brightness;
    this.glowMaterial.opacity = 0.2 + brightness * 0.5;
    this.glowMaterial.color.copy(this.currentColor);
    this.coreMaterial.color.copy(this.currentColor).lerp(new THREE.Color(0xffffaa), 0.5);
  }

  public reset(): void {
    this.baseFrequency = 0.5 + Math.random() * 1.5;
    this.currentFrequency = this.baseFrequency;
    this.targetFrequency = this.baseFrequency;
    this.frequencyTransitionTime = 0;
    this.colorTransitionTime = 0;
    this.isAffected = false;
    this.affectedTimer = 0;
    this.phase = Math.random() * Math.PI * 2;

    const colorT = Math.random();
    this.baseColor = new THREE.Color().lerpColors(
      new THREE.Color(0xaaffaa),
      new THREE.Color(0xffffcc),
      colorT
    );
    this.currentColor = this.baseColor.clone();

    this.position.set(
      (Math.random() - 0.5) * 5,
      1 + Math.random() * 2,
      (Math.random() - 0.5) * 5
    );
    this.mesh.position.copy(this.position);
    this.path = this.generatePath();
  }
}
