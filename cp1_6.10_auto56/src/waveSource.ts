import * as THREE from 'three';

export type WaveformType = 'sine' | 'square' | 'sawtooth';

export interface WaveSourceOptions {
  position: THREE.Vector3;
  color: THREE.ColorRepresentation;
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  label: string;
}

interface WaveFront {
  mesh: THREE.Mesh;
  startTime: number;
  radius: number;
}

export class WaveSource {
  public group: THREE.Group;
  public position: THREE.Vector3;
  public color: THREE.Color;
  public frequency: number;
  public amplitude: number;
  public waveform: WaveformType;
  public label: string;

  private scene: THREE.Scene;
  private waveFronts: WaveFront[] = [];
  private maxWaveFronts = 15;
  private maxRadius = 12;
  private lastEmitTime = 0;
  private emitInterval = 0.18;

  private controlSphere: THREE.Mesh;
  private labelSprite: THREE.Sprite;
  private axisHelper: THREE.Group;
  private distanceLine: THREE.Line | null = null;
  public isDragging = false;
  public showLabels = true;
  public showAxes = true;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private dragPlane: THREE.Plane;
  private dragOffset = new THREE.Vector3();
  private camera: THREE.PerspectiveCamera;
  private otherSource: WaveSource | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, options: WaveSourceOptions) {
    this.scene = scene;
    this.camera = camera;
    this.position = options.position.clone();
    this.color = new THREE.Color(options.color);
    this.frequency = options.frequency;
    this.amplitude = options.amplitude;
    this.waveform = options.waveform;
    this.label = options.label;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.createControlSphere();
    this.createLabel();
    this.createAxisHelper();

    this.scene.add(this.group);
  }

  public setOtherSource(source: WaveSource): void {
    this.otherSource = source;
    this.updateDistanceLine();
  }

  private createControlSphere(): void {
    const geometry = new THREE.SphereGeometry(0.35, 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.9
    });
    this.controlSphere = new THREE.Mesh(geometry, material);
    this.group.add(this.controlSphere);

    const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.group.add(ring);
  }

  private createLabel(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#' + this.color.getHexString();
    ctx.textAlign = 'center';
    ctx.fillText(this.label, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    this.labelSprite = new THREE.Sprite(material);
    this.labelSprite.position.set(0, 1.2, 0);
    this.labelSprite.scale.set(2, 0.5, 1);
    this.group.add(this.labelSprite);
  }

  private createAxisHelper(): void {
    this.axisHelper = new THREE.Group();
    const axisLength = 1.5;

    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xMat = new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 });
    this.axisHelper.add(new THREE.Line(xGeo, xMat));

    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yMat = new THREE.LineBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.8 });
    this.axisHelper.add(new THREE.Line(yGeo, yMat));

    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const zMat = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.8 });
    this.axisHelper.add(new THREE.Line(zGeo, zMat));

    this.axisHelper.visible = false;
    this.group.add(this.axisHelper);
  }

  private updateDistanceLine(): void {
    if (!this.otherSource) return;
    if (this.distanceLine) {
      this.group.remove(this.distanceLine);
    }
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3().subVectors(this.otherSource.position, this.position)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      dashSize: 0.3,
      gapSize: 0.15
    });
    this.distanceLine = new THREE.Line(geo, mat);
    this.distanceLine.computeLineDistances();
    this.group.add(this.distanceLine);
    this.distanceLine.visible = this.isDragging || (this.otherSource?.isDragging ?? false);
  }

  public getDistanceToPoint(point: THREE.Vector3): number {
    return this.position.distanceTo(point);
  }

  public getWaveValueAt(point: THREE.Vector3, time: number): number {
    const dist = this.getDistanceToPoint(point);
    const wavelength = this.getWavelength();
    if (wavelength <= 0) return 0;
    const phase = (2 * Math.PI * (time * this.getWaveSpeed() - dist)) / wavelength;
    return this.amplitude * this.applyWaveform(phase);
  }

  public getWavelength(): number {
    return this.getWaveSpeed() / this.frequency;
  }

  public getWaveSpeed(): number {
    return this.frequency * 0.015;
  }

  private applyWaveform(phase: number): number {
    const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    switch (this.waveform) {
      case 'sine':
        return Math.sin(p);
      case 'square':
        return p < Math.PI ? 1 : -1;
      case 'sawtooth':
        return (p / Math.PI) - 1;
      default:
        return Math.sin(p);
    }
  }

  public update(time: number, deltaTime: number): void {
    if (time - this.lastEmitTime > this.emitInterval && this.waveFronts.length < this.maxWaveFronts) {
      this.emitWaveFront(time);
      this.lastEmitTime = time;
    }

    for (let i = this.waveFronts.length - 1; i >= 0; i--) {
      const wf = this.waveFronts[i];
      const elapsed = time - wf.startTime;
      wf.radius = elapsed * this.getWaveSpeed();
      const scale = Math.max(0.01, wf.radius);
      wf.mesh.scale.setScalar(scale);
      const opacity = Math.max(0, 1 - wf.radius / this.maxRadius);
      (wf.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.6;

      if (wf.radius > this.maxRadius) {
        this.scene.remove(wf.mesh);
        wf.mesh.geometry.dispose();
        (wf.mesh.material as THREE.Material).dispose();
        this.waveFronts.splice(i, 1);
      }
    }

    if (this.distanceLine) {
      this.distanceLine.visible = this.isDragging || (this.otherSource?.isDragging ?? false);
    }
    this.labelSprite.visible = this.showLabels;
    this.axisHelper.visible = this.showAxes && this.isDragging;
  }

  private emitWaveFront(startTime: number): void {
    const geometry = new THREE.SphereGeometry(1, 20, 16);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      wireframe: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    this.scene.add(mesh);
    this.waveFronts.push({ mesh, startTime, radius: 0 });
  }

  public onPointerDown(event: PointerEvent, rect: DOMRect): boolean {
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.controlSphere, true);
    if (hits.length > 0) {
      this.isDragging = true;
      const hitPoint = hits[0].point.clone();
      this.dragPlane.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        this.position
      );
      const planeIntersect = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, planeIntersect);
      this.dragOffset.copy(planeIntersect).sub(this.position);
      return true;
    }
    return false;
  }

  public onPointerMove(event: PointerEvent, rect: DOMRect): void {
    if (!this.isDragging) return;
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersect);
    const newPos = intersect.sub(this.dragOffset);
    newPos.x = THREE.MathUtils.clamp(newPos.x, -10, 10);
    newPos.z = THREE.MathUtils.clamp(newPos.z, -10, 10);
    newPos.y = 0;
    this.position.copy(newPos);
    this.group.position.copy(this.position);
    if (this.otherSource) {
      this.otherSource.updateDistanceLine();
      this.updateDistanceLine();
    }
  }

  public onPointerUp(): void {
    this.isDragging = false;
  }

  public dispose(): void {
    this.waveFronts.forEach(wf => {
      this.scene.remove(wf.mesh);
      wf.mesh.geometry.dispose();
      (wf.mesh.material as THREE.Material).dispose();
    });
    this.scene.remove(this.group);
  }
}
