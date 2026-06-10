import * as THREE from 'three';
import type { FaceData } from './faceTracking';

const easeOutQuad = (t: number): number => t * (2 - t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

interface TweenState {
  from: number;
  to: number;
  duration: number;
  elapsed: number;
}

export class Avatar {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private headGroup: THREE.Group;
  private leftEyeGroup: THREE.Group;
  private rightEyeGroup: THREE.Group;
  private leftEyelidTop: THREE.Mesh;
  private rightEyelidTop: THREE.Mesh;
  private leftEyelidBottom: THREE.Mesh;
  private rightEyelidBottom: THREE.Mesh;
  private mouthGroup: THREE.Group;
  private jawGroup: THREE.Group;
  private leftBrowGroup: THREE.Group;
  private rightBrowGroup: THREE.Group;

  private targetLeftEyeOpen = 1;
  private targetRightEyeOpen = 1;
  private targetMouthOpen = 0;
  private targetBrowFrown = 0;
  private targetYaw = 0;
  private targetPitch = 0;

  private currentLeftEyeOpen = 1;
  private currentRightEyeOpen = 1;
  private currentMouthOpen = 0;
  private currentBrowFrown = 0;
  private currentYaw = 0;
  private currentPitch = 0;

  private blinkTweenLeft: TweenState | null = null;
  private blinkTweenRight: TweenState | null = null;

  private isFrozen = false;
  private freezeEndTime = 0;

  private isIdle = false;
  private idleBlinkTimer = 0;
  private idleNextBlinkDelay = 4000;
  private idleBreathPhase = 0;

  private baseMouthY: number;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 4.2);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.headGroup = new THREE.Group();
    this.leftEyeGroup = new THREE.Group();
    this.rightEyeGroup = new THREE.Group();
    this.mouthGroup = new THREE.Group();
    this.jawGroup = new THREE.Group();
    this.leftBrowGroup = new THREE.Group();
    this.rightBrowGroup = new THREE.Group();
    this.baseMouthY = 0;

    this.setupLights();
    this.buildHead();

    this.scene.add(this.headGroup);

    window.addEventListener('resize', () => this.onResize());
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x3a3a5a, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    keyLight.position.set(2, 3, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.5);
    fillLight.position.set(-3, 1, 2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.8);
    rimLight.position.set(0, 2, -4);
    this.scene.add(rimLight);
  }

  private buildHead(): void {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe8b898,
      roughness: 0.55,
      metalness: 0.08,
      flatShading: true,
    });

    const headGeo = new THREE.SphereGeometry(1, 32, 24);
    const head = new THREE.Mesh(headGeo, skinMat);
    this.headGroup.add(head);

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.0,
    });
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x3a5a8a,
      roughness: 0.2,
      metalness: 0.1,
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.0,
    });

    const eyeWhiteGeo = new THREE.SphereGeometry(0.16, 16, 12);
    const irisGeo = new THREE.SphereGeometry(0.09, 16, 12);
    const pupilGeo = new THREE.SphereGeometry(0.045, 16, 12);

    const eyeOffsetX = 0.32;
    const eyeOffsetY = 0.1;
    const eyeOffsetZ = 0.88;

    this.leftEyeGroup.position.set(-eyeOffsetX, eyeOffsetY, eyeOffsetZ);
    this.rightEyeGroup.position.set(eyeOffsetX, eyeOffsetY, eyeOffsetZ);

    const leftWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftWhite.position.set(0, 0, 0.02);
    this.leftEyeGroup.add(leftWhite);

    const leftIris = new THREE.Mesh(irisGeo, irisMat);
    leftIris.position.set(0, 0, 0.13);
    this.leftEyeGroup.add(leftIris);

    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.19);
    this.leftEyeGroup.add(leftPupil);

    const rightWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    rightWhite.position.set(0, 0, 0.02);
    this.rightEyeGroup.add(rightWhite);

    const rightIris = new THREE.Mesh(irisGeo, irisMat);
    rightIris.position.set(0, 0, 0.13);
    this.rightEyeGroup.add(rightIris);

    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.19);
    this.rightEyeGroup.add(rightPupil);

    const eyelidMat = skinMat.clone();

    const eyelidTopGeo = new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    this.leftEyelidTop = new THREE.Mesh(eyelidTopGeo, eyelidMat);
    this.leftEyelidTop.position.set(0, 0.02, 0);
    this.leftEyeGroup.add(this.leftEyelidTop);

    this.rightEyelidTop = new THREE.Mesh(eyelidTopGeo, eyelidMat);
    this.rightEyelidTop.position.set(0, 0.02, 0);
    this.rightEyeGroup.add(this.rightEyelidTop);

    const eyelidBottomGeo = new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    this.leftEyelidBottom = new THREE.Mesh(eyelidBottomGeo, eyelidMat);
    this.leftEyelidBottom.position.set(0, -0.02, 0);
    this.leftEyeGroup.add(this.leftEyelidBottom);

    this.rightEyelidBottom = new THREE.Mesh(eyelidBottomGeo, eyelidMat);
    this.rightEyelidBottom.position.set(0, -0.02, 0);
    this.rightEyeGroup.add(this.rightEyelidBottom);

    this.headGroup.add(this.leftEyeGroup);
    this.headGroup.add(this.rightEyeGroup);

    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xcc6666,
      roughness: 0.5,
      metalness: 0.0,
      flatShading: true,
    });

    const upperLipGeo = new THREE.SphereGeometry(0.18, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    upperLipGeo.scale(1, 0.35, 0.35);
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.position.set(0, -0.28, 0.86);
    this.mouthGroup.add(upperLip);

    const lowerLipGeo = new THREE.SphereGeometry(0.18, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    lowerLipGeo.scale(1, 0.4, 0.4);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.position.set(0, -0.36, 0.85);
    this.jawGroup.add(lowerLip);

    const mouthInnerMat = new THREE.MeshStandardMaterial({
      color: 0x331111,
      roughness: 0.8,
    });
    const mouthInnerGeo = new THREE.SphereGeometry(0.13, 12, 8);
    mouthInnerGeo.scale(1, 0.5, 0.3);
    const mouthInner = new THREE.Mesh(mouthInnerGeo, mouthInnerMat);
    mouthInner.position.set(0, -0.32, 0.82);
    this.jawGroup.add(mouthInner);

    this.jawGroup.position.set(0, -0.08, 0);
    this.jawGroup.rotation.x = 0;
    this.baseMouthY = this.jawGroup.position.y;

    this.mouthGroup.add(this.jawGroup);
    this.headGroup.add(this.mouthGroup);

    const browMat = skinMat.clone();

    const browGeo = new THREE.BoxGeometry(0.2, 0.05, 0.08);
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(0, 0, 0);
    this.leftBrowGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0, 0, 0);
    this.rightBrowGroup.add(rightBrow);

    this.leftBrowGroup.position.set(-0.32, 0.25, 0.85);
    this.rightBrowGroup.position.set(0.32, 0.25, 0.85);

    this.headGroup.add(this.leftBrowGroup);
    this.headGroup.add(this.rightBrowGroup);

    const noseGeo = new THREE.ConeGeometry(0.07, 0.2, 8);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, -0.05, 0.98);
    nose.rotation.x = -Math.PI / 2.5;
    this.headGroup.add(nose);
  }

  update(faceData: FaceData, mirrored: boolean): void {
    const now = performance.now();

    if (this.isFrozen) {
      if (now >= this.freezeEndTime) {
        this.isFrozen = false;
      }
      this.applyEyelids();
      this.renderFrame();
      return;
    }

    if (faceData.isDetected && !this.isIdle) {
      this.targetLeftEyeOpen = faceData.leftEyeOpen;
      this.targetRightEyeOpen = faceData.rightEyeOpen;
      this.targetMouthOpen = faceData.mouthOpen;
      this.targetBrowFrown = faceData.browFrown;

      const sign = mirrored ? -1 : 1;
      this.targetYaw = faceData.headYaw * sign;
      this.targetPitch = faceData.headPitch;
    }

    this.currentLeftEyeOpen = lerp(this.currentLeftEyeOpen, this.targetLeftEyeOpen, 0.25);
    this.currentRightEyeOpen = lerp(this.currentRightEyeOpen, this.targetRightEyeOpen, 0.25);
    this.currentMouthOpen = lerp(this.currentMouthOpen, this.targetMouthOpen, 0.2);
    this.currentBrowFrown = lerp(this.currentBrowFrown, this.targetBrowFrown, 0.2);
    this.currentYaw = lerp(this.currentYaw, this.targetYaw, 0.15);
    this.currentPitch = lerp(this.currentPitch, this.targetPitch, 0.15);

    this.applyEyelids();
    this.applyMouth();
    this.applyBrows();
    this.applyHeadRotation();

    this.renderFrame();
  }

  private applyEyelids(): void {
    const lidTopScaleL = 1.0 - this.currentLeftEyeOpen * 0.9;
    const lidBotScaleL = 1.0 - this.currentLeftEyeOpen * 0.9;
    this.leftEyelidTop.scale.set(1, Math.max(0.1, lidTopScaleL), 1);
    this.leftEyelidBottom.scale.set(1, Math.max(0.1, lidBotScaleL), 1);

    const lidTopScaleR = 1.0 - this.currentRightEyeOpen * 0.9;
    const lidBotScaleR = 1.0 - this.currentRightEyeOpen * 0.9;
    this.rightEyelidTop.scale.set(1, Math.max(0.1, lidTopScaleR), 1);
    this.rightEyelidBottom.scale.set(1, Math.max(0.1, lidBotScaleR), 1);
  }

  private applyMouth(): void {
    const jawAngle = this.currentMouthOpen * 0.5;
    this.jawGroup.rotation.x = -jawAngle;
    this.jawGroup.position.y = this.baseMouthY - this.currentMouthOpen * 0.08;
  }

  private applyBrows(): void {
    const frown = this.currentBrowFrown;
    const rotZ = frown * 0.3;
    const downY = -frown * 0.04;

    this.leftBrowGroup.rotation.z = rotZ;
    this.leftBrowGroup.position.y = 0.25 + downY;

    this.rightBrowGroup.rotation.z = -rotZ;
    this.rightBrowGroup.position.y = 0.25 + downY;
  }

  private applyHeadRotation(): void {
    this.headGroup.rotation.y = this.currentYaw * Math.PI * 0.5;
    this.headGroup.rotation.x = this.currentPitch * Math.PI * 0.3;
  }

  private renderFrame(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resetPose(): void {
    this.targetLeftEyeOpen = 1;
    this.targetRightEyeOpen = 1;
    this.targetMouthOpen = 0;
    this.targetBrowFrown = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.isFrozen = false;
  }

  freezeExpression(durationMs: number): void {
    this.isFrozen = true;
    this.freezeEndTime = performance.now() + durationMs;
  }

  enterIdleMode(): void {
    if (this.isIdle) return;
    this.isIdle = true;
    this.idleBlinkTimer = 0;
    this.idleNextBlinkDelay = 3000 + Math.random() * 2000;
    this.targetMouthOpen = 0;
    this.targetBrowFrown = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
  }

  exitIdleMode(): void {
    if (!this.isIdle) return;
    this.isIdle = false;
    this.targetLeftEyeOpen = 1;
    this.targetRightEyeOpen = 1;
    this.blinkTweenLeft = null;
    this.blinkTweenRight = null;
  }

  tickIdleAnimation(dtMs: number): void {
    if (!this.isIdle) return;

    this.idleBlinkTimer += dtMs;
    if (this.idleBlinkTimer >= this.idleNextBlinkDelay) {
      this.idleBlinkTimer = 0;
      this.idleNextBlinkDelay = 3000 + Math.random() * 2000;
      this.blinkTweenLeft = { from: 1, to: 0, duration: 300, elapsed: 0 };
      this.blinkTweenRight = { from: 1, to: 0, duration: 300, elapsed: 0 };
    }

    this.stepBlinkTween(dtMs);

    this.idleBreathPhase += dtMs * 0.002;
    const breath = Math.sin(this.idleBreathPhase) * 0.5 + 0.5;
    this.targetMouthOpen = breath * 0.08;
    this.currentMouthOpen = lerp(this.currentMouthOpen, this.targetMouthOpen, 0.08);
    this.applyMouth();

    this.currentLeftEyeOpen = lerp(this.currentLeftEyeOpen, this.targetLeftEyeOpen, 0.25);
    this.currentRightEyeOpen = lerp(this.currentRightEyeOpen, this.targetRightEyeOpen, 0.25);
    this.applyEyelids();

    this.currentYaw = lerp(this.currentYaw, 0, 0.05);
    this.currentPitch = lerp(this.currentPitch, 0, 0.05);
    this.applyHeadRotation();

    this.currentBrowFrown = lerp(this.currentBrowFrown, 0, 0.1);
    this.applyBrows();
  }

  private stepBlinkTween(dtMs: number): void {
    if (this.blinkTweenLeft) {
      const t = this.blinkTweenLeft;
      t.elapsed += dtMs;
      const progress = clamp(t.elapsed / t.duration, 0, 1);
      if (t.to === 0) {
        this.targetLeftEyeOpen = lerp(1, 0, easeOutQuad(progress));
      } else {
        this.targetLeftEyeOpen = lerp(0, 1, easeOutQuad(progress));
      }
      if (progress >= 1) {
        if (t.to === 0) {
          this.blinkTweenLeft = { from: 0, to: 1, duration: 200, elapsed: 0 };
        } else {
          this.blinkTweenLeft = null;
          this.targetLeftEyeOpen = 1;
        }
      }
    }

    if (this.blinkTweenRight) {
      const t = this.blinkTweenRight;
      t.elapsed += dtMs;
      const progress = clamp(t.elapsed / t.duration, 0, 1);
      if (t.to === 0) {
        this.targetRightEyeOpen = lerp(1, 0, easeOutQuad(progress));
      } else {
        this.targetRightEyeOpen = lerp(0, 1, easeOutQuad(progress));
      }
      if (progress >= 1) {
        if (t.to === 0) {
          this.blinkTweenRight = { from: 0, to: 1, duration: 200, elapsed: 0 };
        } else {
          this.blinkTweenRight = null;
          this.targetRightEyeOpen = 1;
        }
      }
    }
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;

    const isMobilePortrait = w < 768 && h > w;
    const avatarHeightRatio = isMobilePortrait ? 0.6 : 0.7;
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = (1.2 / 2) / Math.tan(fov / 2) / avatarHeightRatio;
    this.camera.position.z = Math.max(3, distance);

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  render(): void {
    this.renderFrame();
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
