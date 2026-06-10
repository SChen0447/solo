import * as THREE from 'three';

interface AuroraCurveData {
  basePoints: THREE.Vector3[];
  phases: number[];
  frequencies: number[];
  amplitudes: number[];
  line: THREE.Line;
  reflectionLine: THREE.Line;
}

export class AuroraManager {
  private scene: THREE.Scene;
  private curves: AuroraCurveData[] = [];
  private curveCount: number = 120;
  private controlPointsPerCurve: number = 30;
  private time: number = 0;
  private globalOpacity: number = 0.8;
  private speedMultiplier: number = 1.0;
  private group: THREE.Group = new THREE.Group();
  private reflectionGroup: THREE.Group = new THREE.Group();

  private readonly COLOR_BOTTOM = new THREE.Color('#00ff88');
  private readonly COLOR_TOP = new THREE.Color('#8800ff');
  private readonly Y_MIN = 5;
  private readonly Y_MAX = 15;
  private readonly X_MIN = -20;
  private readonly X_MAX = 20;
  private readonly Z_MIN = -10;
  private readonly Z_MAX = 10;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  init(): void {
    this.scene.add(this.group);
    this.scene.add(this.reflectionGroup);
    this.reflectionGroup.position.y = -24;
    this.reflectionGroup.scale.y = -1;

    for (let i = 0; i < this.curveCount; i++) {
      this.createAuroraCurve(i);
    }
  }

  private createAuroraCurve(index: number): void {
    const basePoints: THREE.Vector3[] = [];
    const phases: number[] = [];
    const frequencies: number[] = [];
    const amplitudes: number[] = [];

    const xBase = this.X_MIN + (this.X_MAX - this.X_MIN) * (index / (this.curveCount - 1));
    const zOffset = (Math.random() - 0.5) * (this.Z_MAX - this.Z_MIN);

    for (let j = 0; j < this.controlPointsPerCurve; j++) {
      const t = j / (this.controlPointsPerCurve - 1);
      const y = this.Y_MIN + t * (this.Y_MAX - this.Y_MIN);
      const xNoise = (Math.random() - 0.5) * 2;
      const zNoise = (Math.random() - 0.5) * 2;

      basePoints.push(new THREE.Vector3(
        xBase + xNoise,
        y,
        zOffset + zNoise
      ));

      phases.push(Math.random() * Math.PI * 2);
      frequencies.push(1 / (3 + Math.random() * 2));
      amplitudes.push(0.3 + Math.random() * 0.4);
    }

    const positions: number[] = [];
    const colors: number[] = [];
    const opacities: number[] = [];
    const sizes: number[] = [];

    const tempColor = new THREE.Color();
    for (let j = 0; j < this.controlPointsPerCurve; j++) {
      const t = j / (this.controlPointsPerCurve - 1);
      positions.push(basePoints[j].x, basePoints[j].y, basePoints[j].z);
      
      tempColor.copy(this.COLOR_BOTTOM).lerp(this.COLOR_TOP, t);
      colors.push(tempColor.r, tempColor.g, tempColor.b);
      
      const opacity = 0.8 - t * 0.5;
      opacities.push(opacity);
      
      const size = 0.5 - t * 0.4;
      sizes.push(size);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aOpacity', new THREE.Float32BufferAttribute(opacities, 1));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uGlobalOpacity: { value: this.globalOpacity }
      },
      vertexShader: `
        attribute float aOpacity;
        attribute float aSize;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 10.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uGlobalOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vOpacity * uGlobalOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    this.group.add(line);

    const reflectionGeometry = geometry.clone();
    const reflectionMaterial = material.clone();
    reflectionMaterial.uniforms = { uGlobalOpacity: { value: this.globalOpacity * 0.4 } };
    const reflectionLine = new THREE.Line(reflectionGeometry, reflectionMaterial);
    this.reflectionGroup.add(reflectionLine);

    this.curves.push({
      basePoints,
      phases,
      frequencies,
      amplitudes,
      line,
      reflectionLine
    });
  }

  update(delta: number, solarWindIntensity: number): void {
    this.time += delta * this.speedMultiplier;

    const frequencyFactor = 1 + (solarWindIntensity / 100) * 2;
    const amplitudeFactor = 1 + (solarWindIntensity / 100);

    const tempColor = new THREE.Color();

    for (const curve of this.curves) {
      const positionAttr = curve.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = curve.line.geometry.getAttribute('color') as THREE.BufferAttribute;
      const positionArray = positionAttr.array as Float32Array;
      const colorArray = colorAttr.array as Float32Array;

      const reflectionPositionAttr = curve.reflectionLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      const reflectionColorAttr = curve.reflectionLine.geometry.getAttribute('color') as THREE.BufferAttribute;
      const reflectionPositionArray = reflectionPositionAttr.array as Float32Array;
      const reflectionColorArray = reflectionColorAttr.array as Float32Array;

      for (let j = 0; j < this.controlPointsPerCurve; j++) {
        const idx = j * 3;
        const basePoint = curve.basePoints[j];
        
        const wave = Math.sin(this.time * curve.frequencies[j] * frequencyFactor * Math.PI * 2 + curve.phases[j]);
        const yOffset = wave * curve.amplitudes[j] * amplitudeFactor * 0.5;
        
        const xWave = Math.sin(this.time * curve.frequencies[j] * frequencyFactor * Math.PI * 2 + curve.phases[j] * 1.3) * 0.3 * amplitudeFactor;
        const zWave = Math.cos(this.time * curve.frequencies[j] * frequencyFactor * Math.PI * 1.5 + curve.phases[j] * 0.7) * 0.2 * amplitudeFactor;

        const newY = basePoint.y + yOffset;
        const newX = basePoint.x + xWave;
        const newZ = basePoint.z + zWave;

        positionArray[idx] = newX;
        positionArray[idx + 1] = newY;
        positionArray[idx + 2] = newZ;

        reflectionPositionArray[idx] = newX;
        reflectionPositionArray[idx + 1] = newY;
        reflectionPositionArray[idx + 2] = newZ;

        const t = j / (this.controlPointsPerCurve - 1);
        const heightT = THREE.MathUtils.clamp((newY - this.Y_MIN) / (this.Y_MAX - this.Y_MIN), 0, 1);
        const finalT = (t + heightT) * 0.5;
        
        tempColor.copy(this.COLOR_BOTTOM).lerp(this.COLOR_TOP, finalT);
        
        const intensityBoost = 0.8 + Math.abs(wave) * 0.4 * (solarWindIntensity / 100);
        tempColor.multiplyScalar(intensityBoost);
        
        colorArray[idx] = Math.min(tempColor.r, 1);
        colorArray[idx + 1] = Math.min(tempColor.g, 1);
        colorArray[idx + 2] = Math.min(tempColor.b, 1);

        reflectionColorArray[idx] = colorArray[idx];
        reflectionColorArray[idx + 1] = colorArray[idx + 1];
        reflectionColorArray[idx + 2] = colorArray[idx + 2];
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      reflectionPositionAttr.needsUpdate = true;
      reflectionColorAttr.needsUpdate = true;
    }
  }

  setGlobalOpacity(opacity: number): void {
    this.globalOpacity = opacity;
    for (const curve of this.curves) {
      const material = curve.line.material as THREE.ShaderMaterial;
      material.uniforms.uGlobalOpacity.value = opacity;
      
      const reflectionMaterial = curve.reflectionLine.material as THREE.ShaderMaterial;
      reflectionMaterial.uniforms.uGlobalOpacity.value = opacity * 0.4;
    }
  }

  setSpeedMultiplier(speed: number): void {
    this.speedMultiplier = speed;
  }

  dispose(): void {
    for (const curve of this.curves) {
      curve.line.geometry.dispose();
      (curve.line.material as THREE.Material).dispose();
      curve.reflectionLine.geometry.dispose();
      (curve.reflectionLine.material as THREE.Material).dispose();
    }
    this.curves = [];
    this.scene.remove(this.group);
    this.scene.remove(this.reflectionGroup);
  }
}
