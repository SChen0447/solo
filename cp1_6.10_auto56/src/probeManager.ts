import * as THREE from 'three';
import { WaveSource } from './waveSource';

interface Probe {
  id: number;
  mesh: THREE.Mesh;
  labelSprite: THREE.Sprite;
  position: THREE.Vector3;
  waveformHistory: number[];
  isDragging: boolean;
  confirmBubble: HTMLDivElement | null;
  dbValue: number;
}

export class ProbeManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sources: WaveSource[];
  private container: HTMLElement;

  private probes: Probe[] = [];
  private maxProbes = 3;
  private nextId = 1;
  public showMeasurementPoints = true;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private dragPlane: THREE.Plane;
  private dragOffset = new THREE.Vector3();
  private draggedProbe: Probe | null = null;

  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private waveformWindow: HTMLDivElement;
  private waveformWidth = 300;
  private waveformHeight = 150;
  private historyLength = 300;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, sources: WaveSource[], container: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.sources = sources;
    this.container = container;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.createWaveformWindow();
  }

  private createWaveformWindow(): void {
    this.waveformWindow = document.createElement('div');
    this.waveformWindow.style.cssText = `
      position: absolute;
      right: 16px;
      bottom: 16px;
      width: ${this.waveformWidth}px;
      height: ${this.waveformHeight}px;
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid rgba(80, 140, 255, 0.5);
      border-radius: 8px;
      box-shadow: 0 0 12px rgba(80, 140, 255, 0.3);
      overflow: hidden;
      pointer-events: none;
      display: none;
      z-index: 100;
    `;

    const title = document.createElement('div');
    title.textContent = '波形实时监测';
    title.style.cssText = `
      padding: 4px 8px;
      font-size: 11px;
      color: rgba(150, 190, 255, 0.9);
      background: rgba(20, 30, 60, 0.8);
      border-bottom: 1px solid rgba(80, 140, 255, 0.3);
      font-family: sans-serif;
    `;
    this.waveformWindow.appendChild(title);

    this.waveformCanvas = document.createElement('canvas');
    this.waveformCanvas.width = this.waveformWidth;
    this.waveformCanvas.height = this.waveformHeight - 24;
    this.waveformCanvas.style.cssText = `
      display: block;
      background: #000000;
    `;
    this.waveformWindow.appendChild(this.waveformCanvas);
    this.waveformCtx = this.waveformCanvas.getContext('2d')!;

    this.container.appendChild(this.waveformWindow);
  }

  public setSources(sources: WaveSource[]): void {
    this.sources = sources;
  }

  public canAddProbe(): boolean {
    return this.probes.length < this.maxProbes;
  }

  public addProbe(position: THREE.Vector3): void {
    if (!this.canAddProbe()) return;

    const id = this.nextId++;

    const geometry = new THREE.SphereGeometry(0.3, 20, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.probeId = id;
    this.scene.add(mesh);

    const labelSprite = this.createLabelSprite(id);
    labelSprite.position.set(0, 0.8, 0);
    mesh.add(labelSprite);

    const probe: Probe = {
      id,
      mesh,
      labelSprite,
      position: position.clone(),
      waveformHistory: new Array(this.historyLength).fill(0),
      isDragging: false,
      confirmBubble: null,
      dbValue: 0
    };
    this.probes.push(probe);
    this.updateWaveformWindowVisibility();
  }

  private createLabelSprite(id: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 200, 48);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffcc33';
    ctx.textAlign = 'center';
    ctx.fillText(`探针${id}: 0.00 dB`, 100, 30);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.5, 0.6, 1);
    (sprite as any).canvas = canvas;
    (sprite as any).ctx = ctx;
    (sprite as any).texture = texture;
    return sprite;
  }

  private updateProbeLabel(probe: Probe): void {
    const sprite = probe.labelSprite as any;
    const ctx: CanvasRenderingContext2D = sprite.ctx;
    const canvas: HTMLCanvasElement = sprite.canvas;
    const texture: THREE.CanvasTexture = sprite.texture;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffcc33';
    ctx.textAlign = 'center';
    ctx.fillText(`探针${probe.id}: ${probe.dbValue.toFixed(2)} dB`, canvas.width / 2, 30);
    texture.needsUpdate = true;
  }

  public onPointerDown(event: PointerEvent, rect: DOMRect): boolean {
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const probeMeshes = this.probes.map(p => p.mesh);
    const hits = this.raycaster.intersectObjects(probeMeshes, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const probe = this.probes.find(p => p.id === hitMesh.userData.probeId);
      if (probe) {
        if (event.detail === 2) {
          this.showDeleteConfirmation(probe, event);
          return true;
        }
        probe.isDragging = true;
        this.draggedProbe = probe;
        this.dragPlane.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          probe.position
        );
        const planeIntersect = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, planeIntersect);
        this.dragOffset.copy(planeIntersect).sub(probe.position);
        return true;
      }
    }
    return false;
  }

  public onPointerMove(event: PointerEvent, rect: DOMRect): void {
    if (!this.draggedProbe) return;

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersect);
    const newPos = intersect.sub(this.dragOffset);
    newPos.x = THREE.MathUtils.clamp(newPos.x, -10, 10);
    newPos.z = THREE.MathUtils.clamp(newPos.z, -10, 10);
    newPos.y = 0;
    this.draggedProbe.position.copy(newPos);
    this.draggedProbe.mesh.position.copy(newPos);
    this.hideDeleteConfirmation(this.draggedProbe);
  }

  public onPointerUp(): void {
    if (this.draggedProbe) {
      this.draggedProbe.isDragging = false;
      this.draggedProbe = null;
    }
  }

  private showDeleteConfirmation(probe: Probe, event: PointerEvent): void {
    if (probe.confirmBubble) return;

    const bubble = document.createElement('div');
    bubble.textContent = '删除探针?';
    bubble.style.cssText = `
      position: absolute;
      left: ${event.clientX + 10}px;
      top: ${event.clientY - 30}px;
      background: rgba(30, 20, 10, 0.95);
      border: 1px solid rgba(255, 100, 100, 0.6);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      color: #fff;
      cursor: pointer;
      z-index: 200;
      box-shadow: 0 0 8px rgba(255, 100, 100, 0.4);
      font-family: sans-serif;
      user-select: none;
    `;

    bubble.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeProbe(probe);
    });

    document.addEventListener('click', () => this.hideDeleteConfirmation(probe), { once: true });

    this.container.appendChild(bubble);
    probe.confirmBubble = bubble;
  }

  private hideDeleteConfirmation(probe: Probe): void {
    if (probe.confirmBubble) {
      probe.confirmBubble.remove();
      probe.confirmBubble = null;
    }
  }

  private removeProbe(probe: Probe): void {
    this.hideDeleteConfirmation(probe);
    this.scene.remove(probe.mesh);
    probe.mesh.geometry.dispose();
    (probe.mesh.material as THREE.Material).dispose();
    const mat = (probe.labelSprite.material as THREE.SpriteMaterial);
    if (mat.map) mat.map.dispose();
    mat.dispose();
    this.probes = this.probes.filter(p => p.id !== probe.id);
    this.updateWaveformWindowVisibility();
  }

  public setShowMeasurementPoints(show: boolean): void {
    this.showMeasurementPoints = show;
    this.probes.forEach(p => {
      p.mesh.visible = show;
      p.labelSprite.visible = show;
    });
    this.updateWaveformWindowVisibility();
  }

  private updateWaveformWindowVisibility(): void {
    this.waveformWindow.style.display =
      (this.probes.length > 0 && this.showMeasurementPoints) ? 'block' : 'none';
  }

  private calculateDB(amplitude: number): number {
    const ref = 0.00002;
    const amp = Math.max(Math.abs(amplitude), ref);
    return 20 * Math.log10(amp / ref);
  }

  public update(time: number, deltaTime: number): void {
    if (this.probes.length === 0) return;

    for (const probe of this.probes) {
      let totalAmp = 0;
      for (const source of this.sources) {
        totalAmp += source.getWaveValueAt(probe.position, time);
      }
      probe.waveformHistory.shift();
      probe.waveformHistory.push(totalAmp);
      probe.dbValue = this.calculateDB(totalAmp);
      if (this.showMeasurementPoints) {
        this.updateProbeLabel(probe);
      }
    }

    this.drawWaveforms();
  }

  private drawWaveforms(): void {
    const ctx = this.waveformCtx;
    const w = this.waveformCanvas.width;
    const h = this.waveformCanvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(80, 140, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const colors = [
      'rgba(255, 80, 80, 0.9)',
      'rgba(80, 150, 255, 0.9)',
      'rgba(100, 255, 150, 0.9)'
    ];

    this.probes.forEach((probe, idx) => {
      const color = colors[idx % colors.length];
      const history = probe.waveformHistory;
      const maxAmp = this.sources.length * (this.sources[0]?.amplitude || 1) || 1;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i < history.length; i++) {
        const x = (i / (history.length - 1)) * w;
        const normalized = THREE.MathUtils.clamp(history[i] / maxAmp, -1, 1);
        const y = h / 2 - (normalized * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = '10px sans-serif';
      ctx.fillText(`P${probe.id}: ${probe.dbValue.toFixed(1)}dB`, 6, 12 + idx * 12);
    });
  }

  public dispose(): void {
    this.probes.forEach(p => this.removeProbe(p));
    this.waveformWindow.remove();
  }
}
