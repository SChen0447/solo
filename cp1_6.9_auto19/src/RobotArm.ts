import * as THREE from 'three';

export interface JointAngles {
  base: number;
  shoulder: number;
  elbow: number;
  wrist: number;
}

export interface JointLimits {
  min: number;
  max: number;
}

const JOINT_LIMITS: Record<keyof JointAngles, JointLimits> = {
  base: { min: -Math.PI, max: Math.PI },
  shoulder: { min: -Math.PI / 2, max: Math.PI / 2 },
  elbow: { min: -Math.PI / 2, max: Math.PI / 2 },
  wrist: { min: -Math.PI, max: Math.PI },
};

const SEGMENT_LENGTHS = {
  upperArm: 2.5,
  forearm: 2.2,
  wrist: 0.8,
};

const ROTATION_SPEED = 1.5;
const MOMENTUM_DAMPING = 0.92;
const SPRING_STRENGTH = 0.05;

export class RobotArm {
  public group: THREE.Group;
  public base: THREE.Group;
  public shoulder: THREE.Group;
  public elbow: THREE.Group;
  public wrist: THREE.Group;
  public endEffector: THREE.Group;
  public gripperLeft: THREE.Mesh;
  public gripperRight: THREE.Mesh;
  public gripperRange: THREE.Mesh;
  public laserLine: THREE.Line;

  private currentAngles: JointAngles = { base: 0, shoulder: 0, elbow: 0, wrist: 0 };
  private angularVelocities: JointAngles = { base: 0, shoulder: 0, elbow: 0, wrist: 0 };
  private inputAngles: JointAngles = { base: 0, shoulder: 0, elbow: 0, wrist: 0 };
  private keys: Record<string, boolean> = {};
  private isGripping: boolean = false;

  constructor() {
    this.group = new THREE.Group();
    this.base = new THREE.Group();
    this.shoulder = new THREE.Group();
    this.elbow = new THREE.Group();
    this.wrist = new THREE.Group();
    this.endEffector = new THREE.Group();

    this.group.add(this.base);
    this.base.add(this.shoulder);
    this.shoulder.add(this.elbow);
    this.elbow.add(this.wrist);
    this.wrist.add(this.endEffector);

    this.gripperLeft = this.createGripperFinger(-0.2);
    this.gripperRight = this.createGripperFinger(0.2);
    this.endEffector.add(this.gripperLeft);
    this.endEffector.add(this.gripperRight);

    this.gripperRange = this.createGripperRange();
    this.endEffector.add(this.gripperRange);

    this.laserLine = this.createLaserLine();
    this.endEffector.add(this.laserLine);

    this.buildArm();
    this.positionSegments();
  }

  private createArmMaterial(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.7,
      roughness: 0.3,
      emissive: new THREE.Color(color).multiplyScalar(0.05),
    });
  }

  private createEdgeLines(mesh: THREE.Mesh, color: number = 0x4a9eff): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    return new THREE.LineSegments(edges, lineMat);
  }

  private buildArm(): void {
    const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.5, 24);
    const baseMesh = new THREE.Mesh(baseGeo, this.createArmMaterial(0x3a4a5a));
    baseMesh.position.y = 0.25;
    this.base.add(baseMesh);
    this.base.add(this.createEdgeLines(baseMesh));

    const pedestalGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.6, 24);
    const pedestal = new THREE.Mesh(pedestalGeo, this.createArmMaterial(0x4a5a6a));
    pedestal.position.y = 0.8;
    this.base.add(pedestal);
    this.base.add(this.createEdgeLines(pedestal));

    const shoulderGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const shoulderMesh = new THREE.Mesh(shoulderGeo, this.createArmMaterial(0x5a7a9a));
    shoulderMesh.position.y = 1.1;
    this.shoulder.add(shoulderMesh);
    this.shoulder.add(this.createEdgeLines(shoulderMesh));
    this.shoulder.rotation.z = -Math.PI / 4;
    this.shoulder.position.y = 1.1;

    const upperArmGeo = new THREE.CylinderGeometry(0.18, 0.22, SEGMENT_LENGTHS.upperArm, 16);
    const upperArm = new THREE.Mesh(upperArmGeo, this.createArmMaterial(0x4a6a8a));
    upperArm.position.y = SEGMENT_LENGTHS.upperArm / 2;
    this.shoulder.add(upperArm);
    this.shoulder.add(this.createEdgeLines(upperArm));

    const elbowGeo = new THREE.SphereGeometry(0.28, 24, 24);
    const elbowMesh = new THREE.Mesh(elbowGeo, this.createArmMaterial(0x5a7a9a));
    elbowMesh.position.y = SEGMENT_LENGTHS.upperArm;
    this.shoulder.add(elbowMesh);
    this.shoulder.add(this.createEdgeLines(elbowMesh));
    this.elbow.position.y = SEGMENT_LENGTHS.upperArm;
    this.elbow.rotation.z = Math.PI / 4;

    const forearmGeo = new THREE.CylinderGeometry(0.15, 0.18, SEGMENT_LENGTHS.forearm, 16);
    const forearm = new THREE.Mesh(forearmGeo, this.createArmMaterial(0x5a8aaa));
    forearm.position.y = SEGMENT_LENGTHS.forearm / 2;
    this.elbow.add(forearm);
    this.elbow.add(this.createEdgeLines(forearm));

    const wristGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const wristMesh = new THREE.Mesh(wristGeo, this.createArmMaterial(0x6a8aaa));
    wristMesh.position.y = SEGMENT_LENGTHS.forearm;
    this.elbow.add(wristMesh);
    this.elbow.add(this.createEdgeLines(wristMesh));
    this.wrist.position.y = SEGMENT_LENGTHS.forearm;

    const wristSegGeo = new THREE.CylinderGeometry(0.12, 0.14, SEGMENT_LENGTHS.wrist, 16);
    const wristSeg = new THREE.Mesh(wristSegGeo, this.createArmMaterial(0x7aaaca));
    wristSeg.position.y = SEGMENT_LENGTHS.wrist / 2;
    this.wrist.add(wristSeg);
    this.wrist.add(this.createEdgeLines(wristSeg));

    this.endEffector.position.y = SEGMENT_LENGTHS.wrist;
  }

  private createGripperFinger(offsetX: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(0.08, 0.4, 0.12);
    const mat = this.createArmMaterial(0x88aacc);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(offsetX, 0.2, 0);
    const edges = this.createEdgeLines(mesh, 0x66ccff);
    mesh.add(edges);
    return mesh;
  }

  private createGripperRange(): THREE.Mesh {
    const geo = new THREE.RingGeometry(0.25, 0.3, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = 0.3;
    mesh.visible = false;
    return mesh;
  }

  private createLaserLine(): THREE.Line {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0, 5, 0),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xff3344,
      transparent: true,
      opacity: 0.7,
    });
    const line = new THREE.Line(geo, mat);
    return line;
  }

  private positionSegments(): void {
    this.shoulder.position.y = 1.1;
    this.elbow.position.y = SEGMENT_LENGTHS.upperArm;
    this.wrist.position.y = SEGMENT_LENGTHS.forearm;
    this.endEffector.position.y = SEGMENT_LENGTHS.wrist;
  }

  public setKeyState(key: string, pressed: boolean): void {
    this.keys[key.toLowerCase()] = pressed;
  }

  public setJointAngle(joint: keyof JointAngles, angleDeg: number): void {
    this.inputAngles[joint] = (angleDeg * Math.PI) / 180;
  }

  public toggleGripper(): boolean {
    this.isGripping = !this.isGripping;
    this.updateGripperVisual();
    return this.isGripping;
  }

  public setGripping(value: boolean): void {
    this.isGripping = value;
    this.updateGripperVisual();
  }

  public getGripping(): boolean {
    return this.isGripping;
  }

  private updateGripperVisual(): void {
    const targetOffset = this.isGripping ? 0.1 : 0.2;
    this.animateGripper(this.gripperLeft, -targetOffset);
    this.animateGripper(this.gripperRight, targetOffset);
    this.gripperRange.visible = this.isGripping;
  }

  private animateGripper(finger: THREE.Mesh, targetX: number): void {
    const startX = finger.position.x;
    const startTime = performance.now();
    const duration = 300;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      finger.position.x = startX + (targetX - startX) * eased;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }

  public getAngles(): JointAngles {
    return { ...this.currentAngles };
  }

  public getEndEffectorWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.endEffector.getWorldPosition(pos);
    return pos;
  }

  public getEndEffectorWorldQuaternion(): THREE.Quaternion {
    const quat = new THREE.Quaternion();
    this.endEffector.getWorldQuaternion(quat);
    return quat;
  }

  public updateLaser(targetPos: THREE.Vector3 | null): void {
    if (!targetPos) {
      this.laserLine.visible = false;
      return;
    }
    this.laserLine.visible = true;
    const localStart = new THREE.Vector3(0, 0.3, 0);
    const worldStart = new THREE.Vector3();
    this.endEffector.localToWorld(worldStart.copy(localStart));
    const localEnd = this.endEffector.worldToLocal(targetPos.clone());
    const positions = new Float32Array([
      localStart.x, localStart.y, localStart.z,
      localEnd.x, localEnd.y, localEnd.z,
    ]);
    this.laserLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  public update(deltaTime: number): void {
    this.processKeyboardInput(deltaTime);

    const joints: Array<keyof JointAngles> = ['base', 'shoulder', 'elbow', 'wrist'];
    for (const joint of joints) {
      const target = this.clampAngle(this.inputAngles[joint], JOINT_LIMITS[joint]);
      const current = this.currentAngles[joint];
      const springForce = (target - current) * SPRING_STRENGTH;
      this.angularVelocities[joint] += springForce;
      this.angularVelocities[joint] *= MOMENTUM_DAMPING;
      this.currentAngles[joint] += this.angularVelocities[joint];
      this.currentAngles[joint] = this.clampAngle(this.currentAngles[joint], JOINT_LIMITS[joint]);
    }

    this.base.rotation.y = this.currentAngles.base;
    this.shoulder.rotation.x = this.currentAngles.shoulder;
    this.elbow.rotation.x = this.currentAngles.elbow;
    this.wrist.rotation.y = this.currentAngles.wrist;
  }

  private processKeyboardInput(deltaTime: number): void {
    const rot = ROTATION_SPEED * deltaTime;
    if (this.keys['w']) this.inputAngles.base += rot;
    if (this.keys['s']) this.inputAngles.base -= rot;
    if (this.keys['a']) this.inputAngles.shoulder += rot;
    if (this.keys['d']) this.inputAngles.shoulder -= rot;
    if (this.keys['q']) this.inputAngles.elbow += rot;
    if (this.keys['e']) this.inputAngles.elbow -= rot;
    if (this.keys['r']) this.inputAngles.wrist += rot;
    if (this.keys['f']) this.inputAngles.wrist -= rot;

    for (const joint of Object.keys(this.inputAngles) as Array<keyof JointAngles>) {
      this.inputAngles[joint] = this.clampAngle(this.inputAngles[joint], JOINT_LIMITS[joint]);
    }
  }

  private clampAngle(angle: number, limits: JointLimits): number {
    return Math.max(limits.min, Math.min(limits.max, angle));
  }

  public getGripperWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3(0, 0.5, 0);
    this.endEffector.localToWorld(pos);
    return pos;
  }
}
