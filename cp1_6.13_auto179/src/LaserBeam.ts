import * as THREE from 'three';
import { LightColumn } from './LightColumn';

export class LaserBeam {
  public mesh: THREE.Mesh;
  public startColumn: LightColumn;
  public endColumn: LightColumn;
  public isActive: boolean = true;
  public isPulsing: boolean = false;

  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;
  private flowTime: number = 0;
  private pulseIntensity: number = 0;
  private bpm: number = 90;
  private beatPhase: number = 0;

  constructor(startColumn: LightColumn, endColumn: LightColumn) {
    this.startColumn = startColumn;
    this.endColumn = endColumn;

    this.material = this.createShaderMaterial();
    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 32);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = Math.PI / 2;

    this.updatePosition();
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorStart: { value: this.startColumn.topColor.clone() },
        colorEnd: { value: this.endColumn.topColor.clone() },
        flowOffset: { value: 0 },
        opacity: { value: 0.8 },
        pulseIntensity: { value: 0 },
        beamWidth: { value: 2 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorStart;
        uniform vec3 colorEnd;
        uniform float flowOffset;
        uniform float opacity;
        uniform float pulseIntensity;
        uniform float beamWidth;
        varying vec2 vUv;

        void main() {
          vec3 color = mix(colorStart, colorEnd, vUv.x);

          float flow = sin((vUv.x - flowOffset) * 20.0) * 0.3 + 0.7;
          float pulse = 1.0 + pulseIntensity * 0.5;

          float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
          edge = pow(edge, 0.5);

          float alpha = opacity * flow * edge * pulse;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  public updatePosition(): void {
    const startPos = this.startColumn.getTopPosition();
    const endPos = this.endColumn.getTopPosition();

    const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    this.mesh.position.copy(midPoint);

    const distance = startPos.distanceTo(endPos);
    const beamHeight = 2;

    this.mesh.scale.set(distance, beamHeight, 1);

    const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    const angle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = -angle;

    this.material.uniforms.colorStart.value.copy(this.startColumn.topColor);
    this.material.uniforms.colorEnd.value.copy(this.endColumn.topColor);
  }

  public update(delta: number, time: number): void {
    if (!this.isActive) return;

    this.flowTime += delta / 1.5;
    this.material.uniforms.flowOffset.value = this.flowTime % 1;

    if (this.isPulsing) {
      const beatInterval = 60 / this.bpm;
      this.beatPhase += delta / beatInterval;
      const beat = (Math.sin(this.beatPhase * Math.PI * 2) + 1) * 0.5;
      this.pulseIntensity = beat;
      this.material.uniforms.pulseIntensity.value = this.pulseIntensity;
    } else {
      this.material.uniforms.pulseIntensity.value = 0;
    }

    this.updatePosition();
  }

  public setPulsing(pulsing: boolean): void {
    this.isPulsing = pulsing;
  }

  public setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  public dispose(): void {
    this.isActive = false;
    this.geometry.dispose();
    this.material.dispose();
  }

  public matches(a: LightColumn, b: LightColumn): boolean {
    return (
      (this.startColumn === a && this.endColumn === b) ||
      (this.startColumn === b && this.endColumn === a)
    );
  }
}
