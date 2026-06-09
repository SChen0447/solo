import * as THREE from 'three';
import { gsap } from 'gsap';

export type EmotionType = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'fearful' | 'disgusted';

interface EmotionConfig {
  mouthCorners: number;
  eyeSquint: number;
  eyeScale: number;
  eyebrowAngle: number;
  mouthOpen: number;
  browLower: number;
  noseWrinkle: number;
  mouthAsymmetry: number;
  browRaise: number;
  mouthTremble: number;
}

const EMOTION_CONFIGS: Record<Exclude<EmotionType, 'neutral'>, EmotionConfig> = {
  happy: {
    mouthCorners: 0.3,
    eyeSquint: 0.6,
    eyeScale: 1.0,
    eyebrowAngle: 15,
    mouthOpen: 0.1,
    browLower: 0,
    noseWrinkle: 0,
    mouthAsymmetry: 0,
    browRaise: 0,
    mouthTremble: 0
  },
  sad: {
    mouthCorners: -0.3,
    eyeSquint: 0.3,
    eyeScale: 1.0,
    eyebrowAngle: -10,
    mouthOpen: 0.05,
    browLower: 0,
    noseWrinkle: 0,
    mouthAsymmetry: 0,
    browRaise: 0.3,
    mouthTremble: 0
  },
  surprised: {
    mouthCorners: 0,
    eyeSquint: 0,
    eyeScale: 1.5,
    eyebrowAngle: 10,
    mouthOpen: 0.4,
    browLower: 0,
    noseWrinkle: 0,
    mouthAsymmetry: 0,
    browRaise: 0.8,
    mouthTremble: 0
  },
  angry: {
    mouthCorners: -0.1,
    eyeSquint: 0.4,
    eyeScale: 0.5,
    eyebrowAngle: -20,
    mouthOpen: 0,
    browLower: 0.8,
    noseWrinkle: 0.2,
    mouthAsymmetry: 0,
    browRaise: 0,
    mouthTremble: 0
  },
  fearful: {
    mouthCorners: -0.1,
    eyeSquint: 0,
    eyeScale: 1.3,
    eyebrowAngle: 15,
    mouthOpen: 0.2,
    browLower: 0,
    noseWrinkle: 0.1,
    mouthAsymmetry: 0,
    browRaise: 0.6,
    mouthTremble: 0.5
  },
  disgusted: {
    mouthCorners: 0.1,
    eyeSquint: 0.5,
    eyeScale: 0.8,
    eyebrowAngle: -5,
    mouthOpen: 0.05,
    browLower: 0.3,
    noseWrinkle: 0.6,
    mouthAsymmetry: 0.4,
    browRaise: 0,
    mouthTremble: 0
  }
};

export class ClayCharacter {
  public group: THREE.Group;
  private head!: THREE.Mesh;
  private baseGeometry!: THREE.SphereGeometry;
  private morphAttributes: Map<string, Float32Array> = new Map();
  private leftEye!: THREE.Group;
  private rightEye!: THREE.Group;
  private leftPupil!: THREE.Mesh;
  private rightPupil!: THREE.Mesh;
  private leftEyebrow!: THREE.Mesh;
  private rightEyebrow!: THREE.Mesh;

  private currentWeights: Record<string, number> = {
    mouthCorners: 0,
    eyeSquint: 0,
    mouthOpen: 0,
    browLower: 0,
    noseWrinkle: 0,
    mouthAsymmetry: 0,
    browRaise: 0
  };

  private headBasePosition: THREE.Vector3 = new THREE.Vector3();
  private time: number = 0;
  private isAnimating: boolean = false;
  private trembleAmount: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.createHead();
    this.createEyes();
    this.createEyebrows();
    this.group.position.set(2, 0, 0);
  }

  private createHead(): void {
    this.baseGeometry = new THREE.SphereGeometry(2, 32, 32);
    const positionAttr = this.baseGeometry.attributes.position as THREE.BufferAttribute;
    const originalPositions = new Float32Array(positionAttr.array);

    for (let i = 0; i < positionAttr.count; i++) {
      const x = originalPositions[i * 3];
      const y = originalPositions[i * 3 + 1];
      const z = originalPositions[i * 3 + 2];
      const noise = (Math.random() - 0.5) * 0.05;
      const len = Math.sqrt(x * x + y * y + z * z);
      positionAttr.setXYZ(
        i,
        x + (x / len) * noise,
        y + (y / len) * noise,
        z + (z / len) * noise
      );
    }
    positionAttr.needsUpdate = true;
    this.baseGeometry.computeVertexNormals();

    this.createMorphTargets(originalPositions);

    const material = new THREE.MeshStandardMaterial({
      color: 0xf4c28a,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.98
    });

    this.head = new THREE.Mesh(this.baseGeometry, material);
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.group.add(this.head);
  }

  private createMorphTargets(originalPositions: Float32Array): void {
    const createMorph = (
      modifier: (x: number, y: number, z: number, i: number) => THREE.Vector3
    ): Float32Array => {
      const morph = new Float32Array(originalPositions.length);
      for (let i = 0; i < this.baseGeometry.attributes.position.count; i++) {
        const x = originalPositions[i * 3];
        const y = originalPositions[i * 3 + 1];
        const z = originalPositions[i * 3 + 2];
        const offset = modifier(x, y, z, i);
        morph[i * 3] = x + offset.x;
        morph[i * 3 + 1] = y + offset.y;
        morph[i * 3 + 2] = z + offset.z;
      }
      return morph;
    };

    this.morphAttributes.set(
      'mouthCorners',
      createMorph((x, y, z) => {
        const result = new THREE.Vector3(0, 0, 0);
        if (z < -1.2 && Math.abs(x) > 0.4 && Math.abs(x) < 1.2 && y < 0 && y > -1.2) {
          const factor = Math.max(0, 1 - Math.abs(y) / 1.2) * Math.max(0, 1 - (Math.abs(x) - 0.4) / 0.8);
          result.y = 0.3 * Math.sign(x) * factor * (x > 0 ? 1 : 1);
        }
        return result;
      })
    );

    this.morphAttributes.set(
      'eyeSquint',
      createMorph((x, y, z) => {
        const result = new THREE.Vector3(0, 0, 0);
        const eyeArea = Math.abs(x) > 0.4 && Math.abs(x) < 1.2 && y > 0.2 && y < 1.2 && z > 1;
        if (eyeArea) {
          const distFromCenter = Math.sqrt((x - Math.sign(x) * 0.8) ** 2 + (y - 0.7) ** 2);
          const factor = Math.max(0, 1 - distFromCenter / 0.5);
          result.y = -0.15 * factor;
          result.z = -0.1 * factor;
        }
        return result;
      })
    );

    this.morphAttributes.set(
      'mouthOpen',
      createMorph((x, y, z) => {
        const result = new THREE.Vector3(0, 0, 0);
        if (z < -1.5 && Math.abs(x) < 0.8 && y < -0.2 && y > -1.2) {
          const centerDist = Math.sqrt(x * x + (y + 0.7) ** 2);
          if (centerDist < 0.5) {
            const factor = Math.max(0, 1 - centerDist / 0.5);
            const radial = new THREE.Vector3(x, y + 0.7, 0).normalize();
            result.x = radial.x * 0.4 * factor;
            result.y = radial.y * 0.4 * factor;
            result.z = -0.2 * factor;
          }
        }
        return result;
      })
    );

    this.morphAttributes.set(
      'browLower',
      createMorph((x, y, z) => {
        const result = new THREE.Vector3(0, 0, 0);
        const browArea = Math.abs(x) > 0.3 && Math.abs(x) < 1.4 && y > 0.8 && y < 1.6 && z > 0.5;
        if (browArea) {
          const factor = Math.max(0, 1 - (y - 0.8) / 0.8) * Math.max(0, 1 - (Math.abs(x) - 0.3) / 1.1);
          result.y = -0.25 * factor;
          result.z = 0.15 * factor;
        }
        return result;
      })
    );

    this.morphAttributes.set(
      'noseWrinkle',
      createMorph((x, y, z) => {
        const result = new THREE.Vector3(0, 0, 0);
        if (z > 0.5 && z < 2 && Math.abs(x) < 0.6 && y > -0.5 && y < 0.5) {
          const factor = Math.max(0, 1 - Math.abs(y) / 0.5) * Math.max(0, 1 - Math.abs(x) / 0.6);
          result.z = 0.2 * factor;
          result.y = 0.08 * factor;
        }
        return result;
      })
    );

    this.morphAttributes.set(
      'mouthAsymmetry',
      createMorph((x, y, z) => {
        const result = new THREE.Vector3(0, 0, 0);
        if (z < -1.2 && x > 0 && x < 1.2 && y < 0 && y > -1.2) {
          const factor = Math.max(0, 1 - Math.abs(y) / 1.2) * Math.max(0, 1 - (x - 0.3) / 0.9);
          result.y = 0.25 * factor;
        }
        return result;
      })
    );

    this.morphAttributes.set(
      'browRaise',
      createMorph((x, y, z) => {
        const result = new THREE.Vector3(0, 0, 0);
        const browArea = Math.abs(x) > 0.3 && Math.abs(x) < 1.4 && y > 0.8 && y < 1.6 && z > 0.5;
        if (browArea) {
          const factor = Math.max(0, 1 - (y - 0.8) / 0.8) * Math.max(0, 1 - (Math.abs(x) - 0.3) / 1.1);
          result.y = 0.2 * factor;
        }
        return result;
      })
    );
  }

  private createEyes(): void {
    this.leftEye = new THREE.Group();
    this.rightEye = new THREE.Group();

    const eyeWhiteGeometry = new THREE.SphereGeometry(0.3, 24, 24);
    const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1
    });

    const pupilGeometry = new THREE.SphereGeometry(0.15, 24, 24);
    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.2,
      metalness: 0.3
    });

    const highlightGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0xffffff,
      emissiveIntensity: 0.2
    });

    const leftWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    this.leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    this.leftPupil.position.z = 0.18;
    const leftHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    leftHighlight.position.set(0.05, 0.05, 0.3);

    this.leftEye.add(leftWhite);
    this.leftEye.add(this.leftPupil);
    this.leftEye.add(leftHighlight);
    this.leftEye.position.set(-0.8, 0.7, 1.7);

    const rightWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
    this.rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    this.rightPupil.position.z = 0.18;
    const rightHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    rightHighlight.position.set(0.05, 0.05, 0.3);

    this.rightEye.add(rightWhite);
    this.rightEye.add(this.rightPupil);
    this.rightEye.add(rightHighlight);
    this.rightEye.position.set(0.8, 0.7, 1.7);

    this.group.add(this.leftEye);
    this.group.add(this.rightEye);
  }

  private createEyebrows(): void {
    const eyebrowShape = new THREE.Shape();
    eyebrowShape.moveTo(-0.5, 0);
    eyebrowShape.quadraticCurveTo(0, 0.08, 0.5, 0);
    eyebrowShape.lineTo(0.45, -0.08);
    eyebrowShape.quadraticCurveTo(0, -0.02, -0.45, -0.08);
    eyebrowShape.closePath();

    const extrudeSettings = {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3
    };

    const eyebrowGeometry = new THREE.ExtrudeGeometry(eyebrowShape, extrudeSettings);
    const eyebrowMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.8,
      metalness: 0.1
    });

    this.leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    this.leftEyebrow.position.set(-0.8, 1.25, 1.85);
    this.leftEyebrow.rotation.z = 0;

    this.rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    this.rightEyebrow.position.set(0.8, 1.25, 1.85);
    this.rightEyebrow.rotation.z = 0;

    this.group.add(this.leftEyebrow);
    this.group.add(this.rightEyebrow);
  }

  public animateToEmotion(emotion: EmotionType): void {
    if (this.isAnimating) {
      gsap.killTweensOf(this.currentWeights);
      gsap.killTweensOf(this.leftPupil.scale);
      gsap.killTweensOf(this.rightPupil.scale);
      gsap.killTweensOf(this.leftEyebrow.rotation);
      gsap.killTweensOf(this.rightEyebrow.rotation);
    }

    this.isAnimating = true;

    if (emotion === 'neutral') {
      const targetWeights: Record<string, number> = {
        mouthCorners: 0,
        eyeSquint: 0,
        mouthOpen: 0,
        browLower: 0,
        noseWrinkle: 0,
        mouthAsymmetry: 0,
        browRaise: 0
      };

      gsap.to(this.currentWeights, {
        ...targetWeights,
        duration: 0.8,
        ease: 'power1.inOut',
        onUpdate: () => this.updateGeometry(),
        onComplete: () => {
          this.isAnimating = false;
        }
      });

      gsap.to([this.leftPupil.scale, this.rightPupil.scale], {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.8,
        ease: 'power1.inOut'
      });

      gsap.to([this.leftEyebrow.rotation, this.rightEyebrow.rotation], {
        z: 0,
        duration: 0.8,
        ease: 'power1.inOut'
      });

      this.trembleAmount = 0;
      return;
    }

    const config = EMOTION_CONFIGS[emotion];

    const targetWeights: Record<string, number> = {
      mouthCorners: config.mouthCorners / 0.3,
      eyeSquint: config.eyeSquint,
      mouthOpen: config.mouthOpen / 0.4,
      browLower: config.browLower,
      noseWrinkle: config.noseWrinkle,
      mouthAsymmetry: config.mouthAsymmetry,
      browRaise: config.browRaise
    };

    gsap.to(this.currentWeights, {
      ...targetWeights,
      duration: 0.8,
      ease: 'power1.inOut',
      onUpdate: () => this.updateGeometry(),
      onComplete: () => {
        this.isAnimating = false;
      }
    });

    gsap.to([this.leftPupil.scale, this.rightPupil.scale], {
      x: config.eyeScale,
      y: config.eyeScale,
      z: config.eyeScale,
      duration: 0.8,
      ease: 'power1.inOut'
    });

    const angleRad = (config.eyebrowAngle * Math.PI) / 180;
    gsap.to(this.leftEyebrow.rotation, {
      z: -angleRad,
      duration: 0.8,
      ease: 'power1.inOut'
    });
    gsap.to(this.rightEyebrow.rotation, {
      z: angleRad,
      duration: 0.8,
      ease: 'power1.inOut'
    });

    this.trembleAmount = config.mouthTremble;
  }

  private updateGeometry(): void {
    const positionAttr = this.baseGeometry.attributes.position as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    const vertexCount = positionAttr.count;
    for (let i = 0; i < vertexCount; i++) {
      let px = 0;
      let py = 0;
      let pz = 0;

      this.morphAttributes.forEach((morph, name) => {
        const weight = this.currentWeights[name] || 0;
        if (weight !== 0) {
          px += (morph[i * 3] - this.getOriginalPosition(i).x) * weight;
          py += (morph[i * 3 + 1] - this.getOriginalPosition(i).y) * weight;
          pz += (morph[i * 3 + 2] - this.getOriginalPosition(i).z) * weight;
        }
      });

      const original = this.getOriginalPosition(i);
      positions[i * 3] = original.x + px;
      positions[i * 3 + 1] = original.y + py;
      positions[i * 3 + 2] = original.z + pz;
    }

    positionAttr.needsUpdate = true;
    this.baseGeometry.computeVertexNormals();
  }

  private originalPositionsCache: Float32Array | null = null;

  private getOriginalPosition(index: number): THREE.Vector3 {
    if (!this.originalPositionsCache) {
      this.originalPositionsCache = new Float32Array(this.baseGeometry.attributes.position.count * 3);
      const tempGeom = new THREE.SphereGeometry(2, 32, 32);
      const tempPos = tempGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < tempPos.length; i++) {
        this.originalPositionsCache[i] = tempPos[i];
      }
      tempGeom.dispose();
    }
    return new THREE.Vector3(
      this.originalPositionsCache[index * 3],
      this.originalPositionsCache[index * 3 + 1],
      this.originalPositionsCache[index * 3 + 2]
    );
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    const wobbleX = Math.sin(this.time / 1.2 * Math.PI * 2) * 0.035;
    const wobbleY = Math.cos(this.time / 1.2 * Math.PI * 2 * 0.7) * 0.02;
    this.group.rotation.y = wobbleX;
    this.group.rotation.x = wobbleY;

    if (this.trembleAmount > 0) {
      const tremble = Math.sin(this.time * 30) * 0.02 * this.trembleAmount;
      this.group.position.y = tremble;
    } else {
      this.group.position.y = 0;
    }
  }
}
