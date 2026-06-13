import * as THREE from 'three';

interface BandConfig {
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  lineCount: number;
  lineWidth: number;
  helixOffset: number;
  helixRadius: number;
}

export class Bridge {
  public group: THREE.Group;
  public totalLines: number = 0;
  public showGrid: boolean = false;

  private bands: {
    geometry: THREE.BufferGeometry;
    material: THREE.LineBasicMaterial;
    lines: THREE.LineSegments;
    config: BandConfig;
    originalPositions: Float32Array;
    baseColors: Float32Array;
  }[] = [];

  private gridGroup: THREE.Group | null = null;
  private bridgeLength: number = 8;
  private bridgeRadius: number = 1.5;
  private rotationSpeed: number = (Math.PI * 2) / 15;
  private baseRotationSpeed: number = (Math.PI * 2) / 15;
  private pulseBoostTime: number = 0;
  private time: number = 0;

  private mouseX: number = 0;
  private mouseY: number = 0;
  private targetMouseX: number = 0;
  private targetMouseY: number = 0;

  private isPulsing: boolean = false;
  private pulseProgress: number = 0;
  private pulseX: number = 0;
  private pulseY: number = 0;

  private segmentsPerLine: number = 80;

  private bandConfigs: BandConfig[] = [
    {
      colorStart: new THREE.Color(0xff00ff),
      colorEnd: new THREE.Color(0xffaa00),
      lineCount: 250,
      lineWidth: 1.5,
      helixOffset: 0,
      helixRadius: 0.6
    },
    {
      colorStart: new THREE.Color(0x00ffff),
      colorEnd: new THREE.Color(0x8800ff),
      lineCount: 250,
      lineWidth: 1.5,
      helixOffset: (Math.PI * 2) / 3,
      helixRadius: 0.6
    },
    {
      colorStart: new THREE.Color(0x00ff88),
      colorEnd: new THREE.Color(0x00ccff),
      lineCount: 250,
      lineWidth: 1.5,
      helixOffset: (Math.PI * 4) / 3,
      helixRadius: 0.6
    }
  ];

  constructor() {
    this.group = new THREE.Group();
    this.createBands();
    this.createGridHelper();
  }

  private createBands(): void {
    const segs = this.segmentsPerLine;

    for (let b = 0; b < this.bandConfigs.length; b++) {
      const config = this.bandConfigs[b];
      const lineCount = config.lineCount;
      const totalSegments = lineCount * segs;

      const positions = new Float32Array(totalSegments * 2 * 3);
      const colors = new Float32Array(totalSegments * 2 * 3);
      const originalPositions = new Float32Array(totalSegments * 2 * 3);
      const baseColors = new Float32Array(totalSegments * 2 * 3);

      for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
        const linePhase = (lineIdx / lineCount) * Math.PI * 2;
        const lineRadiusOffset = (lineIdx / lineCount - 0.5) * 0.15;

        const colorT = lineIdx / lineCount;
        const r = config.colorStart.r + (config.colorEnd.r - config.colorStart.r) * colorT;
        const g = config.colorStart.g + (config.colorEnd.g - config.colorStart.g) * colorT;
        const bl = config.colorStart.b + (config.colorEnd.b - config.colorStart.b) * colorT;

        for (let seg = 0; seg < segs; seg++) {
          const t1 = seg / segs;
          const t2 = (seg + 1) / segs;

          const angle1 = t1 * Math.PI * 4 + config.helixOffset + linePhase;
          const angle2 = t2 * Math.PI * 4 + config.helixOffset + linePhase;

          const y1 = (t1 - 0.5) * this.bridgeLength;
          const y2 = (t2 - 0.5) * this.bridgeLength;

          const helixR = (config.helixRadius + lineRadiusOffset) * this.bridgeRadius;
          const x1 = Math.cos(angle1) * helixR;
          const z1 = Math.sin(angle1) * helixR;
          const x2 = Math.cos(angle2) * helixR;
          const z2 = Math.sin(angle2) * helixR;

          const segIdx = (lineIdx * segs + seg) * 2;

          positions[segIdx * 3] = x1;
          positions[segIdx * 3 + 1] = y1;
          positions[segIdx * 3 + 2] = z1;
          positions[segIdx * 3 + 3] = x2;
          positions[segIdx * 3 + 4] = y2;
          positions[segIdx * 3 + 5] = z2;

          originalPositions[segIdx * 3] = x1;
          originalPositions[segIdx * 3 + 1] = y1;
          originalPositions[segIdx * 3 + 2] = z1;
          originalPositions[segIdx * 3 + 3] = x2;
          originalPositions[segIdx * 3 + 4] = y2;
          originalPositions[segIdx * 3 + 5] = z2;

          for (let v = 0; v < 2; v++) {
            const ci = (segIdx + v) * 3;
            baseColors[ci] = r;
            baseColors[ci + 1] = g;
            baseColors[ci + 2] = bl;
            colors[ci] = r;
            colors[ci + 1] = g;
            colors[ci + 2] = bl;
          }
        }
      }

      this.totalLines += lineCount;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        linewidth: config.lineWidth
      });

      const lines = new THREE.LineSegments(geometry, material);
      this.group.add(lines);

      this.bands.push({
        geometry,
        material,
        lines,
        config,
        originalPositions,
        baseColors
      });
    }
  }

  private createGridHelper(): void {
    this.gridGroup = new THREE.Group();
    this.gridGroup.visible = false;

    const ringCount = 16;
    const ringSegments = 24;
    const gridRadius = this.bridgeRadius * 0.9;

    for (let r = 0; r < ringCount; r++) {
      const y = (r / (ringCount - 1) - 0.5) * this.bridgeLength;
      const positions = new Float32Array(ringSegments * 2 * 3);

      for (let i = 0; i < ringSegments; i++) {
        const a1 = (i / ringSegments) * Math.PI * 2;
        const a2 = ((i + 1) / ringSegments) * Math.PI * 2;

        const idx = i * 2 * 3;
        positions[idx] = Math.cos(a1) * gridRadius;
        positions[idx + 1] = y;
        positions[idx + 2] = Math.sin(a1) * gridRadius;
        positions[idx + 3] = Math.cos(a2) * gridRadius;
        positions[idx + 4] = y;
        positions[idx + 5] = Math.sin(a2) * gridRadius;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.15
      });

      const ring = new THREE.LineSegments(geom, mat);
      this.gridGroup.add(ring);
    }

    const longLines = 16;
    const longSegs = 30;

    for (let l = 0; l < longLines; l++) {
      const angle = (l / longLines) * Math.PI * 2;
      const positions = new Float32Array(longSegs * 2 * 3);

      for (let i = 0; i < longSegs; i++) {
        const y1 = (i / longSegs - 0.5) * this.bridgeLength;
        const y2 = ((i + 1) / longSegs - 0.5) * this.bridgeLength;

        const idx = i * 2 * 3;
        positions[idx] = Math.cos(angle) * gridRadius;
        positions[idx + 1] = y1;
        positions[idx + 2] = Math.sin(angle) * gridRadius;
        positions[idx + 3] = Math.cos(angle) * gridRadius;
        positions[idx + 4] = y2;
        positions[idx + 5] = Math.sin(angle) * gridRadius;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.1
      });

      const line = new THREE.LineSegments(geom, mat);
      this.gridGroup.add(line);
    }

    this.group.add(this.gridGroup);
  }

  public setMousePosition(x: number, y: number): void {
    this.targetMouseX = x;
    this.targetMouseY = y;
  }

  public triggerPulse(x: number, y: number): void {
    this.isPulsing = true;
    this.pulseProgress = 0;
    this.pulseX = x;
    this.pulseY = y;
    this.pulseBoostTime = 1.0;
  }

  public toggleGrid(show: boolean): void {
    this.showGrid = show;
    if (this.gridGroup) {
      this.gridGroup.visible = show;
    }
  }

  public update(deltaTime: number, interactionStrength: number): void {
    this.time += deltaTime;

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.1;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.1;

    const targetSpeed = this.pulseBoostTime > 0
      ? this.baseRotationSpeed * 3
      : this.baseRotationSpeed;

    this.rotationSpeed += (targetSpeed - this.rotationSpeed) * 0.08;
    this.group.rotation.y += this.rotationSpeed * deltaTime;

    if (this.pulseBoostTime > 0) {
      this.pulseBoostTime -= deltaTime;
      if (this.pulseBoostTime < 0) this.pulseBoostTime = 0;
    }

    if (this.isPulsing) {
      this.pulseProgress += deltaTime / 0.3;
      if (this.pulseProgress >= 1) {
        this.isPulsing = false;
        this.pulseProgress = 0;
      }
    }

    this.updateLinePositions(interactionStrength);
  }

  private updateLinePositions(interactionStrength: number): void {
    const maxBend = Math.PI / 6;
    const segs = this.segmentsPerLine;
    const pulseRadius = this.pulseProgress * 2.5;
    const pulseWidth = 0.25;

    for (let b = 0; b < this.bands.length; b++) {
      const band = this.bands[b];
      const posAttr = band.geometry.attributes.position;
      const colAttr = band.geometry.attributes.color;
      const positions = posAttr.array as Float32Array;
      const colors = colAttr.array as Float32Array;
      const original = band.originalPositions;
      const baseCols = band.baseColors;
      const lineCount = band.config.lineCount;

      const intensityMult = 1 + interactionStrength * 0.4;

      for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
        const linePhase = lineIdx / lineCount;

        for (let seg = 0; seg < segs; seg++) {
          const segIdx = (lineIdx * segs + seg) * 2;

          for (let v = 0; v < 2; v++) {
            const vi = segIdx + v;
            const pi = vi * 3;
            const t = (seg + v) / segs;

            const bendFactor = Math.sin(t * Math.PI) * interactionStrength;

            const bendX = this.mouseX * maxBend * bendFactor * 2.5;
            const bendY = this.mouseY * maxBend * bendFactor * 1.8;

            const lineMod = 1 + linePhase * 0.4;

            positions[pi] = original[pi] + bendX * lineMod;
            positions[pi + 1] = original[pi + 1] + bendY * lineMod;
            positions[pi + 2] = original[pi + 2] + bendX * 0.4 * lineMod;

            const wave = Math.sin(t * Math.PI * 8 + this.time * 1.5 + lineIdx * 0.08)
              * 0.02 * interactionStrength;
            positions[pi] += wave;
            positions[pi + 2] += wave * 0.6;

            let intensity = 0.4 + 0.6 * Math.sin(t * Math.PI);
            intensity *= intensityMult;

            if (this.isPulsing) {
              const nx = positions[pi] / this.bridgeRadius;
              const ny = (positions[pi + 1] / this.bridgeLength) * 2;

              const dist = Math.sqrt(
                Math.pow(nx - this.pulseX, 2) +
                Math.pow(ny - this.pulseY, 2)
              );

              const pulseIntensity = Math.exp(
                -Math.pow((dist - pulseRadius) / pulseWidth, 2)
              ) * 2.5;

              intensity += pulseIntensity;

              if (pulseIntensity > 0.1) {
                const whiten = Math.min(1, pulseIntensity * 0.6);
                colors[pi] = baseCols[pi] * intensity + whiten;
                colors[pi + 1] = baseCols[pi + 1] * intensity + whiten;
                colors[pi + 2] = baseCols[pi + 2] * intensity + whiten;
              } else {
                colors[pi] = baseCols[pi] * intensity;
                colors[pi + 1] = baseCols[pi + 1] * intensity;
                colors[pi + 2] = baseCols[pi + 2] * intensity;
              }
            } else {
              colors[pi] = baseCols[pi] * intensity;
              colors[pi + 1] = baseCols[pi + 1] * intensity;
              colors[pi + 2] = baseCols[pi + 2] * intensity;
            }
          }
        }
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      band.material.opacity = 0.55 + interactionStrength * 0.25;
    }
  }

  public dispose(): void {
    for (const band of this.bands) {
      band.geometry.dispose();
      band.material.dispose();
    }
    this.bands = [];
  }
}
