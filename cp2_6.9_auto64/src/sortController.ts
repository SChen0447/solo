import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import {
  BubbleData,
  createBubble,
  createParticles,
  addHighlight,
  removeHighlight,
  updateHighlightBlink,
  setBubbleTransparent,
  flashBubble,
  updateBubbleBreathing
} from './bubbleFactory';

export type SortAlgorithm = 'bubble' | 'selection' | 'insertion';

export interface SortStats {
  steps: number;
  compares: number;
  swaps: number;
}

type SortStepType = 'compare' | 'swap' | 'done';

interface SortStep {
  type: SortStepType;
  indices: number[];
}

function* bubbleSortGenerator(arr: number[]): Generator<SortStep> {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      yield { type: 'compare', indices: [j, j + 1] };
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        yield { type: 'swap', indices: [j, j + 1] };
      }
    }
  }
  yield { type: 'done', indices: [] };
}

function* selectionSortGenerator(arr: number[]): Generator<SortStep> {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      yield { type: 'compare', indices: [minIdx, j] };
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      yield { type: 'swap', indices: [i, minIdx] };
    }
  }
  yield { type: 'done', indices: [] };
}

function* insertionSortGenerator(arr: number[]): Generator<SortStep> {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      yield { type: 'compare', indices: [j - 1, j] };
      if (arr[j - 1] > arr[j]) {
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        yield { type: 'swap', indices: [j - 1, j] };
        j--;
      } else {
        break;
      }
    }
  }
  yield { type: 'done', indices: [] };
}

export class SortController {
  private bubbles: BubbleData[] = [];
  private dataValues: number[] = [];
  private scene: THREE.Scene;
  private generator: Generator<SortStep> | null = null;
  private isAnimating: boolean = false;
  private isCompleted: boolean = false;
  private currentCompareIndices: number[] = [];
  private stats: SortStats = { steps: 0, compares: 0, swaps: 0 };
  private celebrationTime: number = 0;
  private particleSystems: THREE.Points[] = [];
  private bubbleCount: number;

  constructor(scene: THREE.Scene, bubbleCount: number = 20) {
    this.scene = scene;
    this.bubbleCount = bubbleCount;
    this.initializeBubbles();
  }

  getStats(): SortStats {
    return { ...this.stats };
  }

  getIsCompleted(): boolean {
    return this.isCompleted;
  }

  getIsAnimating(): boolean {
    return this.isAnimating;
  }

  reset(bubbleCount?: number): void {
    this.clearAll();
    if (bubbleCount !== undefined) {
      this.bubbleCount = bubbleCount;
    }
    this.stats = { steps: 0, compares: 0, swaps: 0 };
    this.isAnimating = false;
    this.isCompleted = false;
    this.currentCompareIndices = [];
    this.celebrationTime = 0;
    this.generator = null;
    this.initializeBubbles();
  }

  private clearAll(): void {
    for (const bubble of this.bubbles) {
      this.scene.remove(bubble.group);
      bubble.sphere.geometry.dispose();
      (bubble.sphere.material as THREE.Material).dispose();
      bubble.glow.geometry.dispose();
      (bubble.glow.material as THREE.Material).dispose();
      if (bubble.highlightRing) {
        bubble.highlightRing.geometry.dispose();
        (bubble.highlightRing.material as THREE.Material).dispose();
      }
      if (bubble.particles) {
        bubble.particles.geometry.dispose();
        (bubble.particles.material as THREE.Material).dispose();
      }
    }
    for (const ps of this.particleSystems) {
      this.scene.remove(ps);
      ps.geometry.dispose();
      (ps.material as THREE.Material).dispose();
    }
    this.bubbles = [];
    this.particleSystems = [];
  }

  private initializeBubbles(): void {
    this.dataValues = [];
    for (let i = 0; i < this.bubbleCount; i++) {
      this.dataValues.push(Math.floor(Math.random() * 100) + 1);
    }
    const minVal = Math.min(...this.dataValues);
    const maxVal = Math.max(...this.dataValues);
    const radius = 8;
    for (let i = 0; i < this.bubbleCount; i++) {
      const bubble = createBubble(this.dataValues[i], minVal, maxVal);
      const angle = (i / this.bubbleCount) * Math.PI * 2;
      bubble.group.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      this.bubbles.push(bubble);
      this.scene.add(bubble.group);
    }
  }

  startSort(algorithm: SortAlgorithm): void {
    if (this.isAnimating) return;
    this.reset();
    this.isAnimating = true;
    const dataCopy = [...this.dataValues];
    switch (algorithm) {
      case 'bubble':
        this.generator = bubbleSortGenerator(dataCopy);
        break;
      case 'selection':
        this.generator = selectionSortGenerator(dataCopy);
        break;
      case 'insertion':
        this.generator = insertionSortGenerator(dataCopy);
        break;
    }
    this.processNextStep();
  }

  private processNextStep(): void {
    if (!this.generator) return;
    const result = this.generator.next();
    if (result.done) {
      this.finishSort();
      return;
    }
    const step = result.value;
    this.stats.steps++;
    if (step.type === 'compare') {
      this.handleCompare(step.indices);
    } else if (step.type === 'swap') {
      this.handleSwap(step.indices);
    } else if (step.type === 'done') {
      this.finishSort();
    }
  }

  private handleCompare(indices: number[]): void {
    this.stats.compares++;
    for (const idx of this.currentCompareIndices) {
      if (!indices.includes(idx)) {
        removeHighlight(this.bubbles[idx]);
        setBubbleTransparent(this.bubbles[idx], true);
      }
    }
    for (let i = 0; i < this.bubbles.length; i++) {
      if (!indices.includes(i)) {
        setBubbleTransparent(this.bubbles[i], true);
      }
    }
    for (const idx of indices) {
      addHighlight(this.bubbles[idx]);
      setBubbleTransparent(this.bubbles[idx], false);
    }
    this.currentCompareIndices = [...indices];
    setTimeout(() => this.processNextStep(), 120);
  }

  private handleSwap(indices: number[]): void {
    this.stats.swaps++;
    const [i, j] = indices;
    flashBubble(this.bubbles[i]);
    flashBubble(this.bubbles[j]);
    const posI = this.bubbles[i].group.position.clone();
    const posJ = this.bubbles[j].group.position.clone();
    new TWEEN.Tween(this.bubbles[i].group.position)
      .to({ x: posJ.x, y: posJ.y, z: posJ.z }, 500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();
    new TWEEN.Tween(this.bubbles[j].group.position)
      .to({ x: posI.x, y: posI.y, z: posI.z }, 500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onComplete(() => {
        [this.bubbles[i], this.bubbles[j]] = [this.bubbles[j], this.bubbles[i]];
        [this.dataValues[i], this.dataValues[j]] = [this.dataValues[j], this.dataValues[i]];
        setTimeout(() => this.processNextStep(), 80);
      })
      .start();
  }

  private finishSort(): void {
    this.isAnimating = false;
    this.isCompleted = true;
    this.celebrationTime = 0;
    for (const idx of this.currentCompareIndices) {
      removeHighlight(this.bubbles[idx]);
    }
    this.currentCompareIndices = [];
    for (let i = 0; i < this.bubbles.length; i++) {
      setBubbleTransparent(this.bubbles[i], false);
    }
    this.arrangeSpiral();
    this.spawnCelebrationParticles();
  }

  private arrangeSpiral(): void {
    const radius = 5;
    const height = 10;
    const anglePerStep = (20 * Math.PI) / 180;
    const heightStep = height / this.bubbles.length;
    for (let i = 0; i < this.bubbles.length; i++) {
      const angle = i * anglePerStep;
      const y = -height / 2 + i * heightStep;
      const targetPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      new TWEEN.Tween(this.bubbles[i].group.position)
        .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 800)
        .easing(TWEEN.Easing.Cubic.InOut)
        .delay(i * 30)
        .start();
    }
  }

  private spawnCelebrationParticles(): void {
    for (const bubble of this.bubbles) {
      const color = (bubble.sphere.material as THREE.MeshStandardMaterial).color;
      const bubbleRadius = bubble.sphere.geometry.boundingSphere?.radius || 0.5;
      const particles = createParticles(bubbleRadius, color);
      bubble.group.add(particles);
      bubble.particles = particles;
      this.particleSystems.push(particles);
    }
  }

  update(deltaTime: number, elapsedTime: number): void {
    for (const bubble of this.bubbles) {
      updateBubbleBreathing(bubble, elapsedTime);
      updateHighlightBlink(bubble, elapsedTime);
    }
    if (this.isCompleted) {
      this.celebrationTime += deltaTime;
      for (const bubble of this.bubbles) {
        if (bubble.particles) {
          bubble.particles.rotation.y += deltaTime * Math.PI * 0.5;
        }
      }
      if (this.celebrationTime >= 5) {
        this.isCompleted = false;
        for (const bubble of this.bubbles) {
          if (bubble.particles) {
            bubble.group.remove(bubble.particles);
            bubble.particles.geometry.dispose();
            (bubble.particles.material as THREE.Material).dispose();
            bubble.particles = null;
          }
        }
        this.particleSystems = [];
        this.resetToCircle();
      }
    }
  }

  private resetToCircle(): void {
    const radius = 8;
    for (let i = 0; i < this.bubbles.length; i++) {
      const angle = (i / this.bubbles.length) * Math.PI * 2;
      const targetPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      new TWEEN.Tween(this.bubbles[i].group.position)
        .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 800)
        .easing(TWEEN.Easing.Cubic.InOut)
        .delay(i * 20)
        .start();
    }
  }

  onCameraDistanceChange(distance: number): void {
    if (distance < 1) return;
  }
}
