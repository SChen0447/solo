import * as THREE from 'three';

export type PolarizationMode = 'linear' | 'circular' | 'elliptical';

export interface WaveParams {
  frequency: number;
  amplitude: number;
  phaseDiff: number;
  polarization: PolarizationMode;
}

interface TweenState {
  active: boolean;
  startTime: number;
  duration: number;
  startPhase: number;
  endPhase: number;
  startAmp: number;
  endAmp: number;
}

export class ElectromagneticWave {
  public group: THREE.Group;

  private wavelength: number = 2;
  private amplitude: number = 1;
  private frequency: number = 1;
  private phaseDiff: number = 0;
  private polarization: PolarizationMode = 'linear';

  private wavefront!: THREE.Mesh;
  private wavefrontGeometry!: THREE.PlaneGeometry;
  private eFieldArrows: THREE.ArrowHelper[] = [];
  private hFieldArrows: THREE.ArrowHelper[] = [];
  private trajectoryLine!: THREE.Line;
  private trajectoryGeometry!: THREE.BufferGeometry;

  private gridSize: number = 50;
  private waveExtent: number = 8;

  private tween: TweenState = {
    active: false,
    startTime: 0,
    duration: 800,
    startPhase: 0,
    endPhase: 0,
    startAmp: 1,
    endAmp: 1
  };

  private eFieldAmp: number = 1;
  private hFieldAmp: number = 1;

  private time: number = 0;
  private trajectoryPoints: THREE.Vector3[] = [];
  private maxTrajectoryPoints: number = 200;

  constructor() {
    this.group = new THREE.Group();
    this.initWavefront();
    this.initFieldArrows();
    this.initTrajectory();
  }

  private initWavefront(): void {
    this.wavefrontGeometry = new THREE.PlaneGeometry(
      this.waveExtent,
      this.waveExtent,
      this.gridSize - 1,
      this.gridSize - 1
    );

    const positions = this.wavefrontGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setZ(i, 0);
    }
    positions.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      color: 0x7c7cff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    this.wavefront = new THREE.Mesh(this.wavefrontGeometry, material);
    this.wavefront.rotation.x = Math.PI / 2;
    this.group.add(this.wavefront);
  }

  private initFieldArrows(): void {
    const numArrows = 12;
    const spacing = this.wavelength / 2;
    const startZ = -spacing * (numArrows / 2);

    for (let i = 0; i < numArrows; i++) {
      const z = startZ + i * spacing;

      const eDir = new THREE.Vector3(0, 1, 0);
      const eArrow = new THREE.ArrowHelper(
        eDir,
        new THREE.Vector3(0, 0, z),
        this.amplitude,
        0xff4444,
        0.2,
        0.1
      );
      this.eFieldArrows.push(eArrow);
      this.group.add(eArrow);

      const hDir = new THREE.Vector3(1, 0, 0);
      const hArrow = new THREE.ArrowHelper(
        hDir,
        new THREE.Vector3(0, 0, z),
        this.amplitude,
        0x4444ff,
        0.2,
        0.1
      );
      this.hFieldArrows.push(hArrow);
      this.group.add(hArrow);
    }
  }

  private initTrajectory(): void {
    this.trajectoryGeometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.9
    });
    this.trajectoryLine = new THREE.Line(this.trajectoryGeometry, material);
    this.trajectoryLine.position.set(0, 0, -this.waveExtent / 2 - 0.5);
    this.group.add(this.trajectoryLine);
  }

  public setFrequency(freq: number): void {
    this.frequency = freq;
  }

  public setAmplitude(amp: number): void {
    this.amplitude = amp;
  }

  public setPhaseDiff(phaseDeg: number): void {
    this.phaseDiff = (phaseDeg * Math.PI) / 180;
  }

  public setPolarization(mode: PolarizationMode): void {
    if (this.polarization === mode) return;

    this.tween.active = true;
    this.tween.startTime = performance.now();
    this.tween.startPhase = this.phaseDiff;
    this.tween.startAmp = this.hFieldAmp;

    switch (mode) {
      case 'linear':
        this.tween.endPhase = 0;
        this.tween.endAmp = 1;
        (this.trajectoryLine.material as THREE.LineBasicMaterial).color.setHex(0xffd700);
        break;
      case 'circular':
        this.tween.endPhase = Math.PI / 2;
        this.tween.endAmp = 1;
        (this.trajectoryLine.material as THREE.LineBasicMaterial).color.setHex(0xffd700);
        break;
      case 'elliptical':
        this.tween.endPhase = Math.PI / 4;
        this.tween.endAmp = 0.6;
        (this.trajectoryLine.material as THREE.LineBasicMaterial).color.setHex(0x00ff88);
        break;
    }

    this.polarization = mode;
    this.trajectoryPoints = [];
  }

  public getParams(): WaveParams {
    return {
      frequency: this.frequency,
      amplitude: this.amplitude,
      phaseDiff: (this.phaseDiff * 180) / Math.PI,
      polarization: this.polarization
    };
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.frequency;

    if (this.tween.active) {
      const elapsed = performance.now() - this.tween.startTime;
      const t = Math.min(elapsed / this.tween.duration, 1);
      const eased = this.easeInOut(t);

      this.phaseDiff = this.tween.startPhase + (this.tween.endPhase - this.tween.startPhase) * eased;
      this.hFieldAmp = this.tween.startAmp + (this.tween.endAmp - this.tween.startAmp) * eased;

      if (t >= 1) {
        this.tween.active = false;
      }
    }

    this.updateWavefront();
    this.updateFieldArrows();
    this.updateTrajectory();
  }

  private updateWavefront(): void {
    const positions = this.wavefrontGeometry.attributes.position;
    const k = (2 * Math.PI) / this.wavelength;
    const omega = 2 * Math.PI * this.frequency;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const phase = k * y - omega * this.time;
      const zOffset = Math.sin(phase) * this.amplitude * 0.3;
      positions.setZ(i, zOffset);
    }
    positions.needsUpdate = true;
    this.wavefrontGeometry.computeVertexNormals();
  }

  private updateFieldArrows(): void {
    const k = (2 * Math.PI) / this.wavelength;
    const omega = 2 * Math.PI * this.frequency;
    const numArrows = this.eFieldArrows.length;
    const spacing = this.wavelength / 2;
    const startZ = -spacing * (numArrows / 2);

    for (let i = 0; i < numArrows; i++) {
      const z = startZ + i * spacing;
      const phase = k * z - omega * this.time;

      const eY = Math.sin(phase) * this.amplitude * this.eFieldAmp;
      const hX = Math.sin(phase + this.phaseDiff) * this.amplitude * this.hFieldAmp;

      const eArrow = this.eFieldArrows[i];
      const eLength = Math.max(Math.abs(eY), 0.01);
      const eDir = new THREE.Vector3(0, eY > 0 ? 1 : -1, 0);
      eArrow.setDirection(eDir);
      eArrow.setLength(eLength, 0.2, 0.1);

      const hArrow = this.hFieldArrows[i];
      const hLength = Math.max(Math.abs(hX), 0.01);
      const hDir = new THREE.Vector3(hX > 0 ? 1 : -1, 0, 0);
      hArrow.setDirection(hLength, 0.2, 0.1);
      hArrow.setDirection(hDir);
      hArrow.setLength(hLength, 0.2, 0.1);
    }
  }

  private updateTrajectory(): void {
    const omega = 2 * Math.PI * this.frequency;
    const phase = -omega * this.time;

    const eY = Math.sin(phase) * this.amplitude * this.eFieldAmp;
    const hX = Math.sin(phase + this.phaseDiff) * this.amplitude * this.hFieldAmp;

    this.trajectoryPoints.push(new THREE.Vector3(hX, eY, 0));

    if (this.trajectoryPoints.length > this.maxTrajectoryPoints) {
      this.trajectoryPoints.shift();
    }

    this.trajectoryGeometry.setFromPoints(this.trajectoryPoints);
    this.trajectoryGeometry.attributes.position.needsUpdate = true;
  }

  public getTrajectoryPoint(t: number): { x: number; y: number } {
    const omega = 2 * Math.PI * this.frequency;
    const phase = -omega * t;
    const eY = Math.sin(phase) * this.eFieldAmp;
    const hX = Math.sin(phase + this.phaseDiff) * this.hFieldAmp;
    return { x: hX, y: eY };
  }

  public getPolarization(): PolarizationMode {
    return this.polarization;
  }

  public dispose(): void {
    this.wavefrontGeometry.dispose();
    (this.wavefront.material as THREE.Material).dispose();
    this.trajectoryGeometry.dispose();
    (this.trajectoryLine.material as THREE.Material).dispose();
  }
}
