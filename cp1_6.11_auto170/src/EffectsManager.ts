import * as THREE from 'three';
import gsap from 'gsap';
import { ResonanceEvent } from './StringSystem';

export class EffectsManager {
  public scene: THREE.Scene;

  private nebulaBaseColor = new THREE.Color('#0f1b3d');
  private nebulaTargetColor = new THREE.Color('#0f1b3d');
  private nebulaColorShiftAmount = 0;
  private nebulaShiftSpeed = 0.3;

  private currentRotationBoost = 1.0;
  private targetRotationBoost = 1.0;
  private rotationBoostLerpSpeed = 2.0;

  private activeLineAnimations: Map<number, gsap.core.Tween> = new Map();
  private lineBaseColors: Map<number, THREE.Color> = new Map();
  private lineTargetColors: Map<number, THREE.Color> = new Map();

  private couplingLines: THREE.LineSegments | null = null;
  private lineColorAttribute: THREE.BufferAttribute | null = null;
  private lineOpacityAttribute: THREE.BufferAttribute | null = null;

  private stringGroup: THREE.Group | null = null;

  private backgroundMesh!: THREE.Mesh;
  private bgColors!: { top: THREE.Color; mid: THREE.Color; bot: THREE.Color };
  private bgTargetColors!: { top: THREE.Color; mid: THREE.Color; bot: THREE.Color };

  private activeResonanceEvents: Map<string, ResonanceEvent> = new Map();
  private resonanceTimestamps: Map<string, number> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createBackground();
  }

  private createBackground(): void {
    const geo = new THREE.SphereGeometry(100, 32, 32);
    const vertShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const fragShader = `
      uniform vec3 colorTop;
      uniform vec3 colorMid;
      uniform vec3 colorBot;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 color;
        if (h > 0.0) {
          color = mix(colorMid, colorTop, h);
        } else {
          color = mix(colorMid, colorBot, -h);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    this.bgColors = {
      top: new THREE.Color('#1a2a4a'),
      mid: new THREE.Color('#0f1b3d'),
      bot: new THREE.Color('#050a1a'),
    };
    this.bgTargetColors = {
      top: new THREE.Color('#1a2a4a'),
      mid: new THREE.Color('#0f1b3d'),
      bot: new THREE.Color('#050a1a'),
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: this.bgColors.top },
        colorMid: { value: this.bgColors.mid },
        colorBot: { value: this.bgColors.bot },
      },
      vertexShader: vertShader,
      fragmentShader: fragShader,
      side: THREE.BackSide,
    });

    this.backgroundMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.backgroundMesh);
  }

  public setCouplingLines(lines: THREE.LineSegments): void {
    this.couplingLines = lines;

    if (!lines.geometry.hasAttribute('lineColor')) {
      const posCount = lines.geometry.attributes.position.count;
      const colorArr = new Float32Array(posCount * 4);
      for (let i = 0; i < posCount; i++) {
        colorArr[i * 4] = 0.4;
        colorArr[i * 4 + 1] = 0.6;
        colorArr[i * 4 + 2] = 1.0;
        colorArr[i * 4 + 3] = 0.2;
      }
      lines.geometry.setAttribute('lineColor', new THREE.BufferAttribute(colorArr, 4));
    }
    this.lineColorAttribute = lines.geometry.getAttribute('lineColor') as THREE.BufferAttribute;
  }

  public setStringGroup(group: THREE.Group): void {
    this.stringGroup = group;
  }

  public handleResonanceEvents(events: ResonanceEvent[]): void {
    for (const event of events) {
      const key = `${event.stringA}-${event.stringB}-${event.ratio}`;

      if (!this.activeResonanceEvents.has(key)) {
        this.activeResonanceEvents.set(key, event);
        this.resonanceTimestamps.set(key, performance.now());

        if (event.lineIndex >= 0) {
          this.animateCouplingLine(event.lineIndex, event);
        }

        this.triggerNebulaShift(event);
        this.addSceneRotationBoost(event);
      }
    }

    const now = performance.now();
    for (const [key, timestamp] of this.resonanceTimestamps.entries()) {
      if (now - timestamp > 5000) {
        this.activeResonanceEvents.delete(key);
        this.resonanceTimestamps.delete(key);
      }
    }
  }

  private animateCouplingLine(lineVertexIndex: number, event: ResonanceEvent): void {
    if (!this.lineColorAttribute || !this.couplingLines) return;

    const goldColor = new THREE.Color('#ffd700');
    const midColor = event.colorA.clone().lerp(event.colorB, 0.5);
    const targetColor = midColor.clone().lerp(goldColor, 0.6);

    const animId = lineVertexIndex;
    const existingTween = this.activeLineAnimations.get(animId);
    if (existingTween) {
      existingTween.kill();
    }

    const arr = this.lineColorAttribute.array as Float32Array;

    const animState = {
      progress: 0,
      opacity: 0.2,
    };

    for (let offset = 0; offset < 6; offset += 3) {
      const idx = (lineVertexIndex + offset) * 4;
      if (idx + 3 < arr.length) {
        this.lineBaseColors.set(idx, new THREE.Color(arr[idx], arr[idx + 1], arr[idx + 2]));
        this.lineTargetColors.set(idx, targetColor.clone());
      }
    }

    const tween = gsap.to(animState, {
      progress: 1,
      opacity: 0.9,
      duration: 1,
      ease: 'power2.out',
      yoyo: true,
      repeat: 3,
      onUpdate: () => {
        const p = animState.progress;
        const op = animState.opacity;

        for (let offset = 0; offset < 6; offset += 3) {
          const idx = (lineVertexIndex + offset) * 4;
          if (idx + 3 >= arr.length) continue;

          const base = this.lineBaseColors.get(idx);
          const target = this.lineTargetColors.get(idx);
          if (!base || !target) continue;

          const r = base.r + (target.r - base.r) * p;
          const g = base.g + (target.g - base.g) * p;
          const b = base.b + (target.b - base.b) * p;

          arr[idx] = r;
          arr[idx + 1] = g;
          arr[idx + 2] = b;
          arr[idx + 3] = op;
        }
        this.lineColorAttribute!.needsUpdate = true;

        if (this.couplingLines) {
          const mat = this.couplingLines.material as THREE.LineBasicMaterial;
          mat.opacity = 0.2 + (op - 0.2) * 0.5;
        }
      },
      onComplete: () => {
        for (let offset = 0; offset < 6; offset += 3) {
          const idx = (lineVertexIndex + offset) * 4;
          if (idx + 3 >= arr.length) continue;
          const base = this.lineBaseColors.get(idx);
          if (base) {
            arr[idx] = base.r;
            arr[idx + 1] = base.g;
            arr[idx + 2] = base.b;
          }
          arr[idx + 3] = 0.2;
        }
        this.lineColorAttribute!.needsUpdate = true;
        if (this.couplingLines) {
          const mat = this.couplingLines.material as THREE.LineBasicMaterial;
          mat.opacity = 0.2;
        }
        this.activeLineAnimations.delete(animId);
      },
    });

    this.activeLineAnimations.set(animId, tween);
  }

  private triggerNebulaShift(event: ResonanceEvent): void {
    const midColor = event.colorA.clone().lerp(event.colorB, 0.5);

    const hslA = { h: 0, s: 0, l: 0 };
    const hslB = { h: 0, s: 0, l: 0 };
    event.colorA.getHSL(hslA);
    event.colorB.getHSL(hslB);

    const avgHue = ((hslA.h + hslB.h) / 2 + 0.5) % 1;
    const nebulaColor = new THREE.Color().setHSL(avgHue, 0.3, 0.15);

    this.bgTargetColors.mid.lerp(nebulaColor, 0.3 * event.strength);
    this.bgTargetColors.top.lerp(midColor.clone().multiplyScalar(0.15), 0.2 * event.strength);
    this.bgTargetColors.bot.lerp(nebulaColor.clone().multiplyScalar(0.5), 0.25 * event.strength);

    this.nebulaTargetColor.lerp(midColor, 0.3 * event.strength);
    this.nebulaColorShiftAmount = Math.min(0.5, this.nebulaColorShiftAmount + 0.2 * event.strength);
  }

  private addSceneRotationBoost(event: ResonanceEvent): void {
    const boostAmount = 0.5 * event.strength;
    this.targetRotationBoost = Math.min(2.5, this.targetRotationBoost + boostAmount);

    setTimeout(() => {
      this.targetRotationBoost = Math.max(1.0, this.targetRotationBoost - boostAmount);
    }, 3000);
  }

  public update(delta: number, time: number): {
    rotationBoost: number;
    nebulaColorShift: THREE.Color;
    nebulaShiftAmount: number;
  } {
    this.currentRotationBoost += (this.targetRotationBoost - this.currentRotationBoost)
      * this.rotationBoostLerpSpeed * delta;

    this.updateBackgroundColors(delta);

    this.nebulaColorShiftAmount = Math.max(0, this.nebulaColorShiftAmount - this.nebulaShiftSpeed * delta * 0.1);

    if (this.stringGroup) {
      this.stringGroup.rotation.y = Math.sin(time * 0.05) * 0.08
        + time * 0.02 * (this.currentRotationBoost - 1);
    }

    return {
      rotationBoost: this.currentRotationBoost,
      nebulaColorShift: this.nebulaTargetColor,
      nebulaShiftAmount: this.nebulaColorShiftAmount,
    };
  }

  private updateBackgroundColors(delta: number): void {
    const speed = 0.5;

    this.bgColors.top.lerp(this.bgTargetColors.top, speed * delta);
    this.bgColors.mid.lerp(this.bgTargetColors.mid, speed * delta);
    this.bgColors.bot.lerp(this.bgTargetColors.bot, speed * delta);

    const decay = 0.15 * delta;
    const defaultTop = new THREE.Color('#1a2a4a');
    const defaultMid = new THREE.Color('#0f1b3d');
    const defaultBot = new THREE.Color('#050a1a');

    this.bgTargetColors.top.lerp(defaultTop, decay);
    this.bgTargetColors.mid.lerp(defaultMid, decay);
    this.bgTargetColors.bot.lerp(defaultBot, decay);

    this.nebulaTargetColor.lerp(this.nebulaBaseColor, decay);

    const mat = this.backgroundMesh.material as THREE.ShaderMaterial;
    mat.uniforms.colorTop.value.copy(this.bgColors.top);
    mat.uniforms.colorMid.value.copy(this.bgColors.mid);
    mat.uniforms.colorBot.value.copy(this.bgColors.bot);
  }

  public reset(): void {
    for (const tween of this.activeLineAnimations.values()) {
      tween.kill();
    }
    this.activeLineAnimations.clear();

    if (this.lineColorAttribute) {
      const arr = this.lineColorAttribute.array as Float32Array;
      for (let i = 0; i < arr.length; i += 4) {
        arr[i] = 0.4;
        arr[i + 1] = 0.6;
        arr[i + 2] = 1.0;
        arr[i + 3] = 0.2;
      }
      this.lineColorAttribute.needsUpdate = true;
    }

    if (this.couplingLines) {
      const mat = this.couplingLines.material as THREE.LineBasicMaterial;
      mat.opacity = 0.2;
      mat.color.setHex(0x6699ff);
    }

    this.targetRotationBoost = 1.0;
    this.currentRotationBoost = 1.0;

    this.bgTargetColors.top.set('#1a2a4a');
    this.bgTargetColors.mid.set('#0f1b3d');
    this.bgTargetColors.bot.set('#050a1a');
    this.nebulaTargetColor.copy(this.nebulaBaseColor);

    this.activeResonanceEvents.clear();
    this.resonanceTimestamps.clear();
  }
}
