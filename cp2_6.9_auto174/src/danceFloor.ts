import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uLowFreq;
  uniform float uBeatSpeed;

  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float freqScale = 3.0 + uBeatSpeed * 4.0;
    float wave1 = sin(pos.x * freqScale + uTime * uBeatSpeed * 2.0) * 0.5 + 0.5;
    float wave2 = sin(pos.y * freqScale * 1.3 + uTime * uBeatSpeed * 1.7) * 0.5 + 0.5;
    float wave3 = sin((pos.x + pos.y) * freqScale * 0.7 + uTime * uBeatSpeed) * 0.5 + 0.5;

    float elevation = (wave1 * 0.4 + wave2 * 0.3 + wave3 * 0.3) * uLowFreq * 2.0;
    pos.z += elevation;
    vElevation = elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uLowFreq;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uColorSpeed;
  uniform vec3 uStripeColorA;
  uniform vec3 uStripeColorB;

  varying vec2 vUv;
  varying float vElevation;

  void main() {
    float colorMix = sin(uTime * uColorSpeed * 0.5) * 0.5 + 0.5;
    colorMix = mix(colorMix, uLowFreq, 0.5);
    vec3 baseColor = mix(uColorA, uColorB, colorMix);

    float elevationBoost = smoothstep(0.0, 2.0, vElevation);
    baseColor += vec3(elevationBoost) * 0.3;

    float angle = radians(30.0);
    float cosA = cos(angle);
    float sinA = sin(angle);
    vec2 rotated = vec2(
      vUv.x * cosA - vUv.y * sinA,
      vUv.x * sinA + vUv.y * cosA
    );

    float stripeSpeed = 1.0 + uLowFreq * 3.0;
    float stripe = sin((rotated.x + uTime * stripeSpeed * 0.1) * 40.0);
    stripe = step(0.0, stripe);
    vec3 stripeColor = mix(uStripeColorB, uStripeColorA, stripe);

    vec3 finalColor = mix(baseColor, stripeColor, 0.3);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export interface DanceFloorUpdateParams {
  lowFreq: number;
  delta: number;
}

export class DanceFloor {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private time: number = 0;

  constructor() {
    const geometry = new THREE.PlaneGeometry(12, 12, 64, 64);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uLowFreq: { value: 0 },
        uBeatSpeed: { value: 0 },
        uColorSpeed: { value: 0 },
        uColorA: { value: new THREE.Color('#4A148C') },
        uColorB: { value: new THREE.Color('#00E5FF') },
        uStripeColorA: { value: new THREE.Color('#00BFA5') },
        uStripeColorB: { value: new THREE.Color('#1A237E') },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
  }

  update(params: DanceFloorUpdateParams): void {
    this.time += params.delta;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uLowFreq.value = params.lowFreq;
    this.material.uniforms.uBeatSpeed.value = 0.5 + params.lowFreq * 2.0;
    this.material.uniforms.uColorSpeed.value = 0.5 + params.lowFreq * 2.0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
