import * as THREE from 'three'

export type JointName = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle'

export const JOINT_NAMES: JointName[] = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle']

export const JOINT_DISPLAY_NAMES: Record<JointName, string> = {
  shoulder: '肩关节',
  elbow: '肘关节',
  wrist: '腕关节',
  hip: '髋关节',
  knee: '膝关节',
  ankle: '踝关节'
}

interface TweenState {
  start: number
  end: number
  startTime: number
  duration: number
  active: boolean
}

export class Skeleton {
  public root: THREE.Group
  public joints: Record<JointName, THREE.Object3D>
  public jointPositions: Record<JointName, THREE.Vector3>

  private boneMaterial: THREE.MeshPhongMaterial
  private jointMaterial: THREE.MeshBasicMaterial
  private tweenStates: Record<JointName, TweenState>
  private currentAngles: Record<JointName, number>
  private previousAngles: Record<JointName, number>
  private lastMoveTime: Record<JointName, number>

  constructor() {
    this.root = new THREE.Group()
    this.joints = {} as Record<JointName, THREE.Object3D>
    this.jointPositions = {} as Record<JointName, THREE.Vector3>

    this.boneMaterial = new THREE.MeshPhongMaterial({
      color: 0xd0d0d0,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })

    this.jointMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3333
    })

    this.tweenStates = {} as Record<JointName, TweenState>
    this.currentAngles = {} as Record<JointName, number>
    this.previousAngles = {} as Record<JointName, number>
    this.lastMoveTime = {} as Record<JointName, number>

    JOINT_NAMES.forEach(name => {
      this.currentAngles[name] = 0
      this.previousAngles[name] = 0
      this.lastMoveTime[name] = 0
      this.tweenStates[name] = {
        start: 0,
        end: 0,
        startTime: 0,
        duration: 300,
        active: false
      }
    })

    this.buildSkeleton()
  }

  private createBone(length: number, radius: number = 0.08): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 16)
    geometry.translate(0, length / 2, 0)
    return new THREE.Mesh(geometry, this.boneMaterial)
  }

  private createJointMarker(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16)
    return new THREE.Mesh(geometry, this.jointMaterial)
  }

  private buildSkeleton(): void {
    const torso = this.createBone(2.0, 0.12)
    torso.position.set(0, 0, 0)
    this.root.add(torso)

    const head = this.createBone(0.5, 0.1)
    head.position.set(0, 2.0, 0)
    this.root.add(head)
    const headSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      this.boneMaterial
    )
    headSphere.position.set(0, 2.5, 0)
    this.root.add(headSphere)

    const leftShoulderJoint = new THREE.Object3D()
    leftShoulderJoint.position.set(-0.6, 1.7, 0)
    this.root.add(leftShoulderJoint)
    const leftShoulderMarker = this.createJointMarker()
    leftShoulderJoint.add(leftShoulderMarker)
    this.joints.shoulder = leftShoulderJoint
    this.jointPositions.shoulder = new THREE.Vector3(-0.6, 1.7, 0)

    const leftUpperArm = this.createBone(1.2, 0.07)
    leftUpperArm.rotation.z = Math.PI / 2
    leftUpperArm.position.x = 0
    leftShoulderJoint.add(leftUpperArm)

    const leftElbowJoint = new THREE.Object3D()
    leftElbowJoint.position.set(1.2, 0, 0)
    leftShoulderJoint.add(leftElbowJoint)
    const leftElbowMarker = this.createJointMarker()
    leftElbowJoint.add(leftElbowMarker)
    this.joints.elbow = leftElbowJoint
    this.jointPositions.elbow = new THREE.Vector3()

    const leftForearm = this.createBone(1.0, 0.06)
    leftForearm.rotation.z = Math.PI / 2
    leftElbowJoint.add(leftForearm)

    const leftWristJoint = new THREE.Object3D()
    leftWristJoint.position.set(1.0, 0, 0)
    leftElbowJoint.add(leftWristJoint)
    const leftWristMarker = this.createJointMarker()
    leftWristJoint.add(leftWristMarker)
    this.joints.wrist = leftWristJoint
    this.jointPositions.wrist = new THREE.Vector3()

    const leftHand = this.createBone(0.3, 0.05)
    leftHand.rotation.z = Math.PI / 2
    leftWristJoint.add(leftHand)

    const rightShoulderJoint = new THREE.Object3D()
    rightShoulderJoint.position.set(0.6, 1.7, 0)
    this.root.add(rightShoulderJoint)
    const rightShoulderMarker = this.createJointMarker()
    rightShoulderJoint.add(rightShoulderMarker)

    const rightUpperArm = this.createBone(1.2, 0.07)
    rightUpperArm.rotation.z = -Math.PI / 2
    rightShoulderJoint.add(rightUpperArm)

    const rightElbowJoint = new THREE.Object3D()
    rightElbowJoint.position.set(-1.2, 0, 0)
    rightShoulderJoint.add(rightElbowJoint)
    const rightElbowMarker = this.createJointMarker()
    rightElbowJoint.add(rightElbowMarker)

    const rightForearm = this.createBone(1.0, 0.06)
    rightForearm.rotation.z = -Math.PI / 2
    rightElbowJoint.add(rightForearm)

    const rightWristJoint = new THREE.Object3D()
    rightWristJoint.position.set(-1.0, 0, 0)
    rightElbowJoint.add(rightWristJoint)
    const rightWristMarker = this.createJointMarker()
    rightWristJoint.add(rightWristMarker)

    const rightHand = this.createBone(0.3, 0.05)
    rightHand.rotation.z = -Math.PI / 2
    rightWristJoint.add(rightHand)

    const leftHipJoint = new THREE.Object3D()
    leftHipJoint.position.set(-0.25, 0, 0)
    this.root.add(leftHipJoint)
    const leftHipMarker = this.createJointMarker()
    leftHipJoint.add(leftHipMarker)
    this.joints.hip = leftHipJoint
    this.jointPositions.hip = new THREE.Vector3(-0.25, 0, 0)

    const leftThigh = this.createBone(1.5, 0.09)
    leftThigh.position.y = 0
    leftThigh.rotation.x = Math.PI
    leftHipJoint.add(leftThigh)

    const leftKneeJoint = new THREE.Object3D()
    leftKneeJoint.position.set(0, -1.5, 0)
    leftHipJoint.add(leftKneeJoint)
    const leftKneeMarker = this.createJointMarker()
    leftKneeJoint.add(leftKneeMarker)
    this.joints.knee = leftKneeJoint
    this.jointPositions.knee = new THREE.Vector3()

    const leftShin = this.createBone(1.4, 0.08)
    leftShin.position.y = 0
    leftShin.rotation.x = Math.PI
    leftKneeJoint.add(leftShin)

    const leftAnkleJoint = new THREE.Object3D()
    leftAnkleJoint.position.set(0, -1.4, 0)
    leftKneeJoint.add(leftAnkleJoint)
    const leftAnkleMarker = this.createJointMarker()
    leftAnkleJoint.add(leftAnkleMarker)
    this.joints.ankle = leftAnkleJoint
    this.jointPositions.ankle = new THREE.Vector3()

    const leftFoot = this.createBone(0.4, 0.06)
    leftFoot.rotation.x = -Math.PI / 2
    leftAnkleJoint.add(leftFoot)

    const rightHipJoint = new THREE.Object3D()
    rightHipJoint.position.set(0.25, 0, 0)
    this.root.add(rightHipJoint)
    const rightHipMarker = this.createJointMarker()
    rightHipJoint.add(rightHipMarker)

    const rightThigh = this.createBone(1.5, 0.09)
    rightThigh.rotation.x = Math.PI
    rightHipJoint.add(rightThigh)

    const rightKneeJoint = new THREE.Object3D()
    rightKneeJoint.position.set(0, -1.5, 0)
    rightHipJoint.add(rightKneeJoint)
    const rightKneeMarker = this.createJointMarker()
    rightKneeJoint.add(rightKneeMarker)

    const rightShin = this.createBone(1.4, 0.08)
    rightShin.rotation.x = Math.PI
    rightKneeJoint.add(rightShin)

    const rightAnkleJoint = new THREE.Object3D()
    rightAnkleJoint.position.set(0, -1.4, 0)
    rightKneeJoint.add(rightAnkleJoint)
    const rightAnkleMarker = this.createJointMarker()
    rightAnkleJoint.add(rightAnkleMarker)

    const rightFoot = this.createBone(0.4, 0.06)
    rightFoot.rotation.x = -Math.PI / 2
    rightAnkleJoint.add(rightFoot)

    this.root.position.y = 1.5
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  public updateJoint(name: JointName, angleDeg: number, duration: number = 300): void {
    this.tweenStates[name] = {
      start: this.currentAngles[name],
      end: angleDeg,
      startTime: performance.now(),
      duration,
      active: true
    }
  }

  public getCurrentAngle(name: JointName): number {
    return this.currentAngles[name]
  }

  public getAllAngles(): Record<JointName, number> {
    return { ...this.currentAngles }
  }

  public getJointWorldPosition(name: JointName): THREE.Vector3 {
    const worldPos = new THREE.Vector3()
    this.joints[name].getWorldPosition(worldPos)
    return worldPos
  }

  public isJointMoving(name: JointName): boolean {
    const now = performance.now()
    return now - this.lastMoveTime[name] < 1000
  }

  public getJointSpeed(name: JointName): number {
    const diff = Math.abs(this.currentAngles[name] - this.previousAngles[name])
    return diff
  }

  public animate(): void {
    const now = performance.now()

    JOINT_NAMES.forEach(name => {
      this.previousAngles[name] = this.currentAngles[name]

      const tween = this.tweenStates[name]
      if (tween.active) {
        const elapsed = now - tween.startTime
        const progress = Math.min(elapsed / tween.duration, 1)
        const eased = this.easeOut(progress)
        const currentAngle = tween.start + (tween.end - tween.start) * eased
        this.currentAngles[name] = currentAngle

        if (progress >= 1) {
          tween.active = false
          this.currentAngles[name] = tween.end
        }

        this.lastMoveTime[name] = now
        this.applyJointRotation(name, currentAngle)
      }
    })
  }

  private applyJointRotation(name: JointName, angleDeg: number): void {
    const angleRad = THREE.MathUtils.degToRad(angleDeg)
    switch (name) {
      case 'shoulder':
        this.joints.shoulder.rotation.z = angleRad
        break
      case 'elbow':
        this.joints.elbow.rotation.y = -angleRad
        break
      case 'wrist':
        this.joints.wrist.rotation.y = angleRad
        break
      case 'hip':
        this.joints.hip.rotation.x = angleRad
        break
      case 'knee':
        this.joints.knee.rotation.x = -angleRad
        break
      case 'ankle':
        this.joints.ankle.rotation.x = angleRad
        break
    }
  }
}
