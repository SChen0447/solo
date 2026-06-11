import * as THREE from 'three';

export interface ResonanceEvent {
  stringA: number;
  stringB: number;
  ratio: string;
  ratioValue: number;
  strength: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
  midpoint: THREE.Vector3;
  lineIndex: number;
}

export interface VibrationState {
  id: number;
  isVibrating: boolean;
  amplitude: number;
  currentAmplitude: number;
  frequency: number;
  effectiveFrequency: number;
  phase: number;
  clickPoint: number;
  decay: number;
  elapsed: number;
  duration: number;
}

const STRING_COUNT = 12;
const STRING_HEIGHT = 8;
const STRING_WIDTH = 0.05;
const SEGMENTS_Y = 48;
const HEXAGON_RADIUS = 1.2;

export class StringSystem {
  public strings: Array<{
    id: number;
    mesh: THREE.Mesh;
    baseColor: THREE.Color;
    frequency: number;
    basePosition: THREE.Vector3;
    normal: THREE.Vector3;
    state: VibrationState;
  }> = [];

  public couplingLines!: THREE.LineSegments;
  public couplingLineIndices: Map<string, number> = new Map();
  public couplingMaterial!: THREE.LineBasicMaterial;
  public couplingColors!: Float32Array;

  public scene: THREE.Scene;
  public stringGroup: THREE.Group;

  public onResonanceDetected: ((events: ResonanceEvent[]) => void) | null = null;
  public onStringPlucked: ((stringId: number, position: THREE.Vector3, color: THREE.Color, normal: THREE.Vector3) => void) | null = null;

  private baseGeometry!: THREE.BufferGeometry;
  private basePositions!: Float32Array;

  private detectedResonances: Set<string> = new Set();
  private activeResonances: Map<string, number> = new Map();

  private isMobile = window.innerWidth < 768;
  private spacingMultiplier = this.isMobile ? 0.7 : 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.stringGroup = new THREE.Group();
    this.scene.add(this.stringGroup);
    this.createBaseGeometry();
    this.createStrings();
    this.createCouplingGrid();
  }

  private createBaseGeometry(): void {
    const geo = new THREE.BoxGeometry(STRING_WIDTH, STRING_HEIGHT, STRING_WIDTH * 2, 1, SEGMENTS_Y, 1);
    this.baseGeometry = geo;
    this.basePositions = new Float32Array(geo.attributes.position.array);
  }

  private hslToRgb(h: number, s: number, l: number): THREE.Color {
    const color = new THREE.Color();
    color.setHSL(h, s, l);
    return color;
  }

  private createStrings(): void {
    const baseFrequencies = [65.41, 73.42, 82.41, 87.31, 98.00, 110.00, 123.47, 130.81, 146.83, 164.81, 174.61, 196.00];
    const arcRadius = 6.6 * this.spacingMultiplier;

    for (let i = 0; i < STRING_COUNT; i++) {
      const hue = (i / STRING_COUNT) * 0.78;
      const color = this.hslToRgb(hue, 0.85, 0.65);

      const angle = ((i - (STRING_COUNT - 1) / 2) / STRING_COUNT) * Math.PI * 0.55;
      const x = Math.sin(angle) * arcRadius;
      const z = Math.cos(angle) * arcRadius - arcRadius;
      const y = 0;

      const position = new THREE.Vector3(x, y, z);
      const lookCenter = new THREE.Vector3(0, 0, -arcRadius * 0.3);
      const normal = new THREE.Vector3().subVectors(position, lookCenter).normalize();

      const geo = this.baseGeometry.clone();
      const mat = new THREE.MeshPhysicalMaterial({
        color: color,
        transparent: true,
        opacity: 0.7,
        emissive: color,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.3,
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.lookAt(lookCenter);
      mesh.rotateZ(Math.PI / 2);
      mesh.userData.stringId = i;

      this.stringGroup.add(mesh);

      const freq = baseFrequencies[i % baseFrequencies.length] * (1 + i * 0.03);

      this.strings.push({
        id: i,
        mesh,
        baseColor: color.clone(),
        frequency: freq,
        basePosition: position.clone(),
        normal,
        state: {
          id: i,
          isVibrating: false,
          amplitude: 0.3,
          currentAmplitude: 0,
          frequency: freq,
          effectiveFrequency: freq,
          phase: 0,
          clickPoint: 0.5,
          decay: 0.98,
          elapsed: 0,
          duration: 2.0,
        },
      });
    }
  }

  private createCouplingGrid(): void {
    const vertices: number[] = [];
    const colors: number[] = [];
    const lineColor = new THREE.Color(0x6699ff);

    for (let i = 0; i < STRING_COUNT; i++) {
      const posA = this.strings[i].mesh.position;

      for (let step = 1; step <= 3; step++) {
        const j = (i + step) % STRING_COUNT;
        if (i < j) {
          const posB = this.strings[j].mesh.position;

          for (let yT = -0.3; yT <= 0.3; yT += 0.3) {
            const yOffset = yT * STRING_HEIGHT * 0.8;

            vertices.push(
              posA.x, posA.y + yOffset, posA.z,
              posB.x, posB.y + yOffset, posB.z
            );
            colors.push(
              lineColor.r, lineColor.g, lineColor.b, 0.2,
              lineColor.r, lineColor.g, lineColor.b, 0.2
            );

            const key = `${i}-${j}-${yT.toFixed(1)}`;
            this.couplingLineIndices.set(key, (vertices.length / 3) - 2);
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    this.couplingMaterial = new THREE.LineBasicMaterial({
      vertexColors: false,
      transparent: true,
      opacity: 0.2,
      color: 0x6699ff,
    });

    const colorAttr = new Float32BufferAttribute(colors, 4);
    geo.setAttribute('color', colorAttr);
    this.couplingColors = colors as unknown as Float32Array;

    this.couplingLines = new THREE.LineSegments(geo, this.couplingMaterial);
    this.stringGroup.add(this.couplingLines);
  }

  public handleClick(intersect: THREE.Intersection): void {
    const stringId = (intersect.object as THREE.Mesh).userData.stringId;
    if (stringId === undefined) return;

    const str = this.strings[stringId];
    const localPoint = intersect.point.clone();
    str.mesh.worldToLocal(localPoint);

    const heightRatio = 0.5 + localPoint.y / STRING_HEIGHT;
    const clampedRatio = Math.max(0.05, Math.min(0.95, heightRatio));

    str.state.isVibrating = true;
    str.state.elapsed = 0;
    str.state.clickPoint = clampedRatio;
    str.state.currentAmplitude = str.state.amplitude;
    str.state.phase = Math.random() * Math.PI * 2;

    if (this.onStringPlucked) {
      this.onStringPlucked(
        stringId,
        intersect.point.clone(),
        str.baseColor.clone(),
        str.normal.clone()
      );
    }
  }

  public update(time: number, delta: number, tension: number, damping: number, sensitivity: number): void {
    this.updateVibrations(time, delta, tension, damping);
    const resonanceEvents = this.checkResonance(sensitivity);

    if (resonanceEvents.length > 0 && this.onResonanceDetected) {
      this.onResonanceDetected(resonanceEvents);
    }
  }

  private updateVibrations(time: number, delta: number, tension: number, damping: number): void {
    const freqMultiplier = Math.sqrt(tension);

    for (const str of this.strings) {
      const state = str.state;
      state.effectiveFrequency = state.frequency * freqMultiplier;
      state.decay = damping;

      const geo = str.mesh.geometry;
      const posAttr = geo.attributes.position;
      const positions = posAttr.array as Float32Array;

      if (!state.isVibrating) {
        continue;
      }

      state.elapsed += delta;

      if (state.elapsed >= state.duration) {
        state.isVibrating = false;
        state.currentAmplitude = 0;

        for (let v = 0; v < posAttr.count; v++) {
          const baseIdx = v * 3;
          positions[baseIdx] = this.basePositions[baseIdx];
          positions[baseIdx + 2] = this.basePositions[baseIdx + 2];
        }
        posAttr.needsUpdate = true;
        continue;
      }

      const decayFactor = Math.pow(state.decay, state.elapsed * 60);
      const envelope = Math.sin(Math.PI * (state.elapsed / state.duration));
      state.currentAmplitude = state.amplitude * decayFactor * envelope;

      for (let v = 0; v < posAttr.count; v++) {
        const baseIdx = v * 3;
        const baseX = this.basePositions[baseIdx];
        const baseY = this.basePositions[baseIdx + 1];
        const baseZ = this.basePositions[baseIdx + 2];

        const yRatio = 0.5 + baseY / STRING_HEIGHT;
        const distFromClick = Math.abs(yRatio - state.clickPoint);
        const waveReach = Math.min(1, state.elapsed * 4 + distFromClick * 0.3);

        const distanceFactor = Math.max(0, 1 - distFromClick * 1.2);

        const wavelength = 0.3 + freqMultiplier * 0.1;
        const wavePhase = (yRatio / wavelength) * Math.PI * 2 + state.phase + state.elapsed * state.effectiveFrequency * 0.5;

        const wave = Math.sin(wavePhase) * Math.sin(wavePhase * 2.3 + 1.3) * 0.5
          + Math.sin(wavePhase * 3.7 + 0.7) * 0.25;

        const displacement = state.currentAmplitude * distanceFactor * waveReach * wave;

        positions[baseIdx] = baseX + displacement * 0.8;
        positions[baseIdx + 2] = baseZ + displacement * 1.2;
      }

      posAttr.needsUpdate = true;
      (geo as THREE.BufferGeometry).computeVertexNormals();
    }
  }

  private checkResonance(tolerance: number): ResonanceEvent[] {
    const events: ResonanceEvent[] = [];
    const vibratingStrings = this.strings.filter(s => s.state.isVibrating && s.state.currentAmplitude > 0.03);

    if (vibratingStrings.length < 2) {
      this.activeResonances.clear();
      this.detectedResonances.clear();
      return events;
    }

    const ratios: Array<{ a: number; b: number; name: string; value: number }> = [
      { a: 2, b: 1, name: '2:1', value: 2.0 },
      { a: 3, b: 2, name: '3:2', value: 1.5 },
      { a: 4, b: 3, name: '4:3', value: 1.3333 },
    ];

    const currentActive = new Set<string>();

    for (let i = 0; i < vibratingStrings.length; i++) {
      for (let j = i + 1; j < vibratingStrings.length; j++) {
        const s1 = vibratingStrings[i];
        const s2 = vibratingStrings[j];

        const f1 = s1.state.effectiveFrequency;
        const f2 = s2.state.effectiveFrequency;
        const ratio = Math.max(f1, f2) / Math.min(f1, f2);

        for (const r of ratios) {
          const diff = Math.abs(ratio - r.value);
          if (diff < tolerance) {
            const strength = 1 - (diff / tolerance);
            const key = `${s1.id}-${s2.id}-${r.name}`;
            currentActive.add(key);

            const isNew = !this.detectedResonances.has(key);
            this.detectedResonances.add(key);

            const ampAvg = (s1.state.currentAmplitude + s2.state.currentAmplitude) / 2;
            const eventStrength = strength * ampAvg * 3;

            const midpoint = new THREE.Vector3()
              .addVectors(s1.mesh.position, s2.mesh.position)
              .multiplyScalar(0.5);

            let lineIndex = -1;
            const lookupKey1 = `${Math.min(s1.id, s2.id)}-${Math.max(s1.id, s2.id)}-0.0`;
            const lookupKey2 = `${Math.min(s1.id, s2.id)}-${Math.max(s1.id, s2.id)}--0.0`;
            const idx = this.couplingLineIndices.get(lookupKey1) ?? this.couplingLineIndices.get(lookupKey2);
            if (idx !== undefined) lineIndex = idx;

            if (isNew || !this.activeResonances.has(key)) {
              this.activeResonances.set(key, eventStrength);
              events.push({
                stringA: s1.id,
                stringB: s2.id,
                ratio: r.name,
                ratioValue: r.value,
                strength: eventStrength,
                colorA: s1.baseColor.clone(),
                colorB: s2.baseColor.clone(),
                midpoint,
                lineIndex,
              });
            } else {
              this.activeResonances.set(key, eventStrength);
            }
          }
        }
      }
    }

    for (const key of Array.from(this.activeResonances.keys())) {
      if (!currentActive.has(key)) {
        this.activeResonances.delete(key);
      }
    }

    return events;
  }

  public getActiveResonanceStrength(): number {
    let total = 0;
    for (const strength of this.activeResonances.values()) {
      total += strength;
    }
    return Math.min(1, total);
  }

  public getVibratingStringsForRecording(): Array<{ id: number; amplitude: number; positions: number[] }> {
    const result: Array<{ id: number; amplitude: number; positions: number[] }> = [];

    for (const str of this.strings) {
      if (!str.state.isVibrating) continue;

      const positions: number[] = [];
      const posAttr = str.mesh.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let v = 0; v < posAttr.count; v++) {
        const i = v * 3;
        positions.push(arr[i], arr[i + 1], arr[i + 2]);
      }

      result.push({
        id: str.id,
        amplitude: str.state.currentAmplitude,
        positions,
      });
    }

    return result;
  }

  public getAllMeshes(): THREE.Mesh[] {
    return this.strings.map(s => s.mesh);
  }

  public resetAll(): void {
    for (const str of this.strings) {
      str.state.isVibrating = false;
      str.state.currentAmplitude = 0;
      str.state.elapsed = 0;

      const geo = str.mesh.geometry;
      const posAttr = geo.attributes.position;
      const positions = posAttr.array as Float32Array;
      for (let v = 0; v < posAttr.count; v++) {
        const baseIdx = v * 3;
        positions[baseIdx] = this.basePositions[baseIdx];
        positions[baseIdx + 1] = this.basePositions[baseIdx + 1];
        positions[baseIdx + 2] = this.basePositions[baseIdx + 2];
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }

    this.detectedResonances.clear();
    this.activeResonances.clear();
  }
}
