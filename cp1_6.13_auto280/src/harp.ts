import * as THREE from 'three';
import { getRainbowColor, boostBrightness, randomRange, mapColorIndexToFrequency } from './utils';

export interface HarpString {
  line: THREE.Line;
  baseColor: number;
  index: number;
  length: number;
  isHighlighted: boolean;
  highlightTime: number;
  basePosition: THREE.Vector3;
}

export interface HarpConfig {
  stringCount: number;
  minLength: number;
  maxLength: number;
  stringWidth: number;
  clickThreshold: number;
  rotationSpeed: number;
}

export class Harp {
  public group: THREE.Group;
  public strings: HarpString[] = [];
  private config: HarpConfig;
  private breathTime: number = 0;
  private audioContext: AudioContext | null = null;

  constructor(config?: Partial<HarpConfig>) {
    this.config = {
      stringCount: 60,
      minLength: 3,
      maxLength: 5,
      stringWidth: 1.5,
      clickThreshold: 0.3,
      rotationSpeed: 0.1 * (Math.PI / 180),
      ...config,
    };

    this.group = new THREE.Group();
    this.createStrings();
  }

  private createStrings(): void {
    const { stringCount, minLength, maxLength } = this.config;
    const spacing = 0.12;
    const totalWidth = spacing * (stringCount - 1);

    for (let i = 0; i < stringCount; i++) {
      const t = i / (stringCount - 1);
      const length = minLength + (maxLength - minLength) * t;
      const color = getRainbowColor(t);
      const x = -totalWidth / 2 + i * spacing;

      const points: THREE.Vector3[] = [];
      points.push(new THREE.Vector3(x, -length / 2, 0));
      points.push(new THREE.Vector3(x, length / 2, 0));

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        linewidth: 1,
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { stringIndex: i };

      const basePosition = new THREE.Vector3(x, 0, 0);
      this.group.add(line);

      this.strings.push({
        line,
        baseColor: color,
        index: i,
        length,
        isHighlighted: false,
        highlightTime: 0,
        basePosition,
      });
    }
  }

  playTone(index: number, duration: number = 0.8): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Audio not supported:', e);
        return;
      }
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = mapColorIndexToFrequency(index, this.config.stringCount);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  triggerString(index: number): boolean {
    if (index < 0 || index >= this.strings.length) return false;

    const str = this.strings[index];
    str.isHighlighted = true;
    str.highlightTime = 0;
    this.playTone(index);

    return true;
  }

  findClosestString(worldPoint: THREE.Vector3): number {
    let closestIndex = -1;
    let minDist = this.config.clickThreshold;

    for (let i = 0; i < this.strings.length; i++) {
      const str = this.strings[i];
      const stringWorldPos = new THREE.Vector3();
      str.line.getWorldPosition(stringWorldPos);
      stringWorldPos.copy(str.basePosition).applyMatrix4(this.group.matrixWorld);

      const dist = Math.abs(worldPoint.x - stringWorldPos.x);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  getStringWorldPosition(index: number): THREE.Vector3 {
    const pos = new THREE.Vector3();
    if (index >= 0 && index < this.strings.length) {
      pos.copy(this.strings[index].basePosition).applyMatrix4(this.group.matrixWorld);
    }
    return pos;
  }

  getStringColor(index: number): number {
    if (index >= 0 && index < this.strings.length) {
      return this.strings[index].baseColor;
    }
    return 0xffffff;
  }

  update(deltaTime: number): void {
    this.breathTime += deltaTime;
    this.group.rotation.y += this.config.rotationSpeed * deltaTime;

    for (const str of this.strings) {
      const breathPhase = (this.breathTime / 3 + str.index * 0.02) % (Math.PI * 2);
      const breathIntensity = 0.7 + 0.3 * Math.sin(breathPhase);

      let color = str.baseColor;
      let opacity = 0.85 * breathIntensity;

      if (str.isHighlighted) {
        str.highlightTime += deltaTime;
        const highlightDuration = 0.3;
        const highlightProgress = str.highlightTime / highlightDuration;

        if (highlightProgress >= 1) {
          str.isHighlighted = false;
        } else {
          const highlightFactor = 1.3 * (1 - highlightProgress);
          color = boostBrightness(str.baseColor, 1 + highlightFactor);
          opacity = 1 * (1 - highlightProgress * 0.3);

          const shakeAmount = 2 * (1 - highlightProgress);
          const geometry = str.line.geometry as THREE.BufferGeometry;
          const positions = geometry.attributes.position;
          for (let j = 0; j < positions.count; j++) {
            const y = positions.getY(j);
            const shakeX = randomRange(-shakeAmount, shakeAmount) * 0.02;
            const shakeZ = randomRange(-shakeAmount, shakeAmount) * 0.02;
            positions.setX(j, str.basePosition.x + shakeX);
            positions.setZ(j, shakeZ);
          }
          positions.needsUpdate = true;
        }
      }

      (str.line.material as THREE.LineBasicMaterial).color.setHex(color);
      (str.line.material as THREE.LineBasicMaterial).opacity = opacity;
    }
  }

  dispose(): void {
    for (const str of this.strings) {
      str.line.geometry.dispose();
      (str.line.material as THREE.Material).dispose();
    }
    this.strings = [];
  }
}
