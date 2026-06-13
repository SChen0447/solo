import * as THREE from 'three';
import type { RingData } from './TreeManager';

export class SectionManager {
  private scene: THREE.Scene;
  private sectionPlane: THREE.Mesh | null = null;
  private sectionMaterial: THREE.MeshBasicMaterial | null = null;
  private ringCanvas: HTMLCanvasElement;
  private ringCtx: CanvasRenderingContext2D;
  private ringTexture: THREE.CanvasTexture | null = null;

  private histogramCanvas: HTMLCanvasElement;
  private histogramCtx: CanvasRenderingContext2D;

  private currentRingData: RingData | null = null;
  private animationProgress: number = 0;
  private isAnimating: boolean = false;
  private animStartTime: number = 0;
  private animDuration: number = 1000;
  private targetRotation: THREE.Euler = new THREE.Euler(-Math.PI / 2, 0, 0);
  private startRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private planePosition: THREE.Vector3 = new THREE.Vector3();

  private isVisible: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ringCanvas = document.createElement('canvas');
    this.ringCanvas.width = 1024;
    this.ringCanvas.height = 1024;
    this.ringCtx = this.ringCanvas.getContext('2d')!;

    const histEl = document.getElementById('histogram-canvas') as HTMLCanvasElement;
    if (histEl) {
      this.histogramCanvas = histEl;
      const dpr = window.devicePixelRatio || 1;
      const rect = histEl.getBoundingClientRect();
      histEl.width = rect.width * dpr;
      histEl.height = rect.height * dpr;
      this.histogramCtx = histEl.getContext('2d')!;
      this.histogramCtx.scale(dpr, dpr);
    } else {
      this.histogramCanvas = document.createElement('canvas');
      this.histogramCanvas.width = 400;
      this.histogramCanvas.height = 200;
      this.histogramCtx = this.histogramCanvas.getContext('2d')!;
    }
  }

  updateRings(data: RingData) {
    this.currentRingData = data;
    this.drawRingTexture(data);
    if (this.ringTexture) {
      this.ringTexture.needsUpdate = true;
    }
    this.drawHistogram(data);
    this.updateStatsText(data);
  }

  private drawRingTexture(data: RingData) {
    const ctx = this.ringCtx;
    const size = 1024;
    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(60, 35, 15, 1.0)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    const maxRadius = size / 2 - 4;
    let currentRadius = 8;
    const totalWidth = data.widths.reduce((s, w) => s + w, 0);
    const scale = maxRadius / totalWidth;
    const moistureFactor = (data.moisture - 50) / 50;

    for (let i = 0; i < data.widths.length; i++) {
      const ringWidth = data.widths[i] * scale;
      const nextRadius = currentRadius + ringWidth;

      if (nextRadius > maxRadius) break;

      const t = i / Math.max(1, data.widths.length - 1);
      const r = Math.floor(210 - t * 150 + moistureFactor * 20);
      const g = Math.floor(180 - t * 130 + moistureFactor * 15);
      const b = Math.floor(80 - t * 50);

      const lateA = 0.7 + t * 0.25;

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lateA})`;
      ctx.lineWidth = Math.max(2, ringWidth);
      ctx.beginPath();
      ctx.arc(cx, cy, (currentRadius + nextRadius) / 2, 0, Math.PI * 2);
      ctx.stroke();

      const borderR = Math.floor(180 - t * 120);
      const borderG = Math.floor(150 - t * 100);
      const borderB = Math.floor(60 - t * 30);
      ctx.strokeStyle = `rgba(${borderR}, ${borderG}, ${borderB}, 0.3)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      currentRadius = nextRadius;
    }

    for (let i = 0; i < 5000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * currentRadius;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const gray = Math.floor(40 + Math.random() * 60);
      ctx.fillStyle = `rgba(${gray}, ${gray - 10}, ${gray - 20}, ${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
    }

    const pithGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
    pithGrad.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
    pithGrad.addColorStop(1, 'rgba(200, 170, 100, 0.0)');
    ctx.fillStyle = pithGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  showSection(position: THREE.Vector3, trunkRadius: number, cameraPosition: THREE.Vector3) {
    this.planePosition.copy(position);

    if (!this.sectionPlane) {
      const geo = new THREE.CircleGeometry(trunkRadius, 32);

      this.ringTexture = new THREE.CanvasTexture(this.ringCanvas);
      this.ringTexture.needsUpdate = true;

      this.sectionMaterial = new THREE.MeshBasicMaterial({
        map: this.ringTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      this.sectionPlane = new THREE.Mesh(geo, this.sectionMaterial);
      this.sectionPlane.renderOrder = 1;
      this.scene.add(this.sectionPlane);
    } else {
      this.sectionPlane.geometry.dispose();
      this.sectionPlane.geometry = new THREE.CircleGeometry(trunkRadius, 32);
      if (this.ringTexture) {
        this.ringTexture.needsUpdate = true;
      }
    }

    this.sectionPlane.position.copy(position);

    const toCamera = cameraPosition.clone().sub(position).normalize();
    this.targetRotation = new THREE.Euler(-Math.PI / 2, 0, 0);

    this.startRotation = new THREE.Euler(0, 0, 0);
    this.sectionPlane.rotation.copy(this.startRotation);

    const lookDir = new THREE.Vector3(0, 0, 1);
    lookDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(toCamera.x, toCamera.z));
    this.startRotation.y = lookDir.y !== 0 ? Math.atan2(toCamera.x, toCamera.z) : 0;

    this.animationProgress = 0;
    this.isAnimating = true;
    this.animStartTime = performance.now();
    this.isVisible = true;

    if (this.currentRingData) {
      this.drawRingTexture(this.currentRingData);
      if (this.ringTexture) this.ringTexture.needsUpdate = true;
      this.drawHistogram(this.currentRingData);
      this.updateStatsText(this.currentRingData);
    }
  }

  hideSection() {
    if (this.sectionPlane) {
      this.scene.remove(this.sectionPlane);
      this.sectionPlane.geometry.dispose();
      if (this.sectionMaterial) {
        this.sectionMaterial.dispose();
      }
      this.sectionPlane = null;
      this.sectionMaterial = null;
    }
    if (this.ringTexture) {
      this.ringTexture.dispose();
      this.ringTexture = null;
    }
    this.isVisible = false;
    this.isAnimating = false;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  update() {
    if (!this.isAnimating || !this.sectionPlane) return;

    const elapsed = performance.now() - this.animStartTime;
    const rawProgress = Math.min(1, elapsed / this.animDuration);
    this.animationProgress = this.easeOut(rawProgress);

    this.sectionPlane.rotation.x = this.startRotation.x + (this.targetRotation.x - this.startRotation.x) * this.animationProgress;
    this.sectionPlane.rotation.y = this.startRotation.y + (this.targetRotation.y - this.startRotation.y) * this.animationProgress;
    this.sectionPlane.rotation.z = this.startRotation.z + (this.targetRotation.z - this.startRotation.z) * this.animationProgress;

    if (rawProgress >= 1) {
      this.isAnimating = false;
    }
  }

  private drawHistogram(data: RingData) {
    const ctx = this.histogramCtx;
    const canvas = this.histogramCanvas;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    if (data.widths.length === 0) return;

    const padding = { top: 10, right: 10, bottom: 25, left: 35 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxVal = Math.max(...data.widths);
    const minVal = Math.min(...data.widths);
    const binCount = Math.min(10, data.widths.length);
    const binWidth = (maxVal - minVal) / binCount || 0.001;
    const bins: number[] = new Array(binCount).fill(0);

    data.widths.forEach((v) => {
      const idx = Math.min(binCount - 1, Math.floor((v - minVal) / binWidth));
      bins[idx]++;
    });

    const maxBin = Math.max(...bins, 1);

    ctx.fillStyle = '#f5e6c8';
    ctx.font = '10px serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + chartH - (chartH * i) / 4;
      const val = ((maxBin * i) / 4).toFixed(0);
      ctx.fillText(val, padding.left - 5, y);
      ctx.strokeStyle = 'rgba(245, 230, 200, 0.1)';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
    }

    const barW = chartW / binCount - 2;

    bins.forEach((count, i) => {
      const barH = (count / maxBin) * chartH;
      const x = padding.left + (chartW / binCount) * i + 1;
      const y = padding.top + chartH - barH;

      const t = i / (binCount - 1 || 1);
      const r = Math.floor(200 - t * 140);
      const g = Math.floor(170 - t * 120);
      const b = Math.floor(80 - t * 50);

      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, `rgba(${r + 30}, ${g + 30}, ${b + 20}, 0.9)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.7)`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(1, barW), barH, 2);
      ctx.fill();
    });

    ctx.fillStyle = '#f5e6c8';
    ctx.font = '9px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const step = Math.max(1, Math.floor(binCount / 5));
    for (let i = 0; i < binCount; i += step) {
      const x = padding.left + (chartW / binCount) * i + barW / 2;
      const label = (minVal + binWidth * i).toFixed(3);
      ctx.fillText(label, x, padding.top + chartH + 5);
    }

    ctx.save();
    ctx.translate(8, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '9px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245, 230, 200, 0.6)';
    ctx.fillText('频次', 0, 0);
    ctx.restore();
  }

  private updateStatsText(data: RingData) {
    const statsEl = document.getElementById('ring-stats');
    if (!statsEl) return;

    const avg = data.widths.reduce((s, w) => s + w, 0) / data.widths.length;
    statsEl.textContent = `共 ${data.widths.length} 层年轮，平均宽度 ${avg.toFixed(3)}`;
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  getSectionPlane(): THREE.Mesh | null {
    return this.sectionPlane;
  }

  refreshHistogram() {
    if (this.currentRingData) {
      this.drawHistogram(this.currentRingData);
      this.updateStatsText(this.currentRingData);
    }
  }
}
