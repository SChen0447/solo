import * as THREE from 'three';

export class LightSimulation {
  public group: THREE.Group;

  public bulbMesh: THREE.Mesh;
  public bulbGlow: THREE.Mesh;
  public pointLight: THREE.PointLight;
  public ambientLight: THREE.AmbientLight;

  private glowParticles: THREE.Points;
  private particleCount = 200;
  private particlePositions: Float32Array;
  private particleSpeeds: Float32Array;
  private particlePhases: Float32Array;

  public currentColor: THREE.Color = new THREE.Color(0xffd89b);
  private targetColor: THREE.Color = new THREE.Color(0xffd89b);

  private currentKelvin = 4500;
  private lightShowActive = false;
  private lightShowTime = 0;
  private lightShowDuration = 10;
  private colorCycle = [
    new THREE.Color(0xff4444),
    new THREE.Color(0x44ff44),
    new THREE.Color(0x4488ff)
  ];

  private glowPulse = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    this.ambientLight = new THREE.AmbientLight(0x405070, 0.35);
    scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xffd89b, 2.2, 12, 1.8);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 1024;
    this.pointLight.shadow.mapSize.height = 1024;
    this.pointLight.shadow.radius = 4;
    this.group.add(this.pointLight);

    const bulbGeo = new THREE.SphereGeometry(0.18, 32, 32);
    const bulbMat = new THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0.95
    });
    this.bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
    this.group.add(this.bulbMesh);

    const glowGeo = new THREE.SphereGeometry(0.55, 48, 48);
    const glowMat = this.createGlowMaterial();
    this.bulbGlow = new THREE.Mesh(glowGeo, glowMat);
    this.bulbGlow.renderOrder = 2;
    this.group.add(this.bulbGlow);

    const particleData = this.createGlowParticles();
    this.particlePositions = particleData.positions;
    this.particleSpeeds = particleData.speeds;
    this.particlePhases = particleData.phases;

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    const pColors = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      pColors[i * 3] = 1;
      pColors[i * 3 + 1] = 0.88;
      pColors[i * 3 + 2] = 0.68;
    }
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const pSizes = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) {
      pSizes[i] = 0.015 + Math.random() * 0.025;
    }
    pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    const pMat = new THREE.PointsMaterial({
      size: 0.03,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowParticles = new THREE.Points(pGeo, pMat);
    this.group.add(this.glowParticles);

    this.buildFilament();

    scene.add(this.group);
  }

  private createGlowMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffd89b) },
        uIntensity: { value: 1.0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float dist = length(vPosition) / 0.55;
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
          float pulse = 0.92 + 0.08 * sin(uTime * 2.5);
          float alpha = (1.0 - dist) * 0.75 * pulse * uIntensity;
          alpha += fresnel * 0.35 * uIntensity;
          alpha = clamp(alpha, 0.0, 0.95);
          vec3 col = uColor * (1.0 + fresnel * 0.5);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
  }

  private createGlowParticles(): { positions: Float32Array; speeds: Float32Array; phases: Float32Array } {
    const positions = new Float32Array(this.particleCount * 3);
    const speeds = new Float32Array(this.particleCount);
    const phases = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.2 + Math.random() * 0.9;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      speeds[i] = 0.3 + Math.random() * 0.8;
      phases[i] = Math.random() * Math.PI * 2;
    }

    return { positions, speeds, phases };
  }

  private buildFilament() {
    const filamentPts: THREE.Vector3[] = [];
    const segs = 20;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const y = -0.06 + t * 0.12;
      const x = Math.sin(t * Math.PI * 4) * 0.05;
      const z = Math.cos(t * Math.PI * 4) * 0.05;
      filamentPts.push(new THREE.Vector3(x, y, z));
    }
    const fGeo = new THREE.BufferGeometry().setFromPoints(filamentPts);
    const fMat = new THREE.LineBasicMaterial({
      color: 0xfff0a0,
      transparent: true,
      opacity: 0.85
    });
    const filament = new THREE.Line(fGeo, fMat);
    filament.renderOrder = 3;
    this.group.add(filament);
  }

  public kelvinToRGB(kelvin: number): THREE.Color {
    const temp = kelvin / 100;
    let r: number, g: number, b: number;

    if (temp <= 66) {
      r = 255;
      g = temp;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
      if (temp <= 19) {
        b = 0;
      } else {
        b = temp - 10;
        b = 138.5177312231 * Math.log(b) - 305.0447927307;
      }
    } else {
      r = temp - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      g = temp - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
      b = 255;
    }

    return new THREE.Color(
      THREE.MathUtils.clamp(r / 255, 0, 1),
      THREE.MathUtils.clamp(g / 255, 0, 1),
      THREE.MathUtils.clamp(b / 255, 0, 1)
    );
  }

  public setColorTemperature(kelvin: number) {
    if (this.lightShowActive) return;
    this.currentKelvin = kelvin;
    const color = this.kelvinToRGB(kelvin);
    this.targetColor.copy(color);
  }

  public startLightShow() {
    if (this.lightShowActive) return;
    this.lightShowActive = true;
    this.lightShowTime = 0;
  }

  public stopLightShow() {
    this.lightShowActive = false;
    const color = this.kelvinToRGB(this.currentKelvin);
    this.targetColor.copy(color);
  }

  public isLightShowActive(): boolean {
    return this.lightShowActive;
  }

  public getEmissiveColor(): THREE.Color {
    return this.currentColor.clone();
  }

  public update(delta: number, time: number) {
    if (this.lightShowActive) {
      this.lightShowTime += delta;

      const cycleDuration = 2;
      const totalCycleTime = this.colorCycle.length * cycleDuration;
      const t = (this.lightShowTime % totalCycleTime) / totalCycleTime * this.colorCycle.length;
      const idx = Math.floor(t);
      const frac = t - idx;
      const nextIdx = (idx + 1) % this.colorCycle.length;

      const c1 = this.colorCycle[idx];
      const c2 = this.colorCycle[nextIdx];
      this.targetColor.copy(c1).lerp(c2, this.smoothstep(frac));

      if (this.lightShowTime >= this.lightShowDuration) {
        this.stopLightShow();
      }
    }

    this.currentColor.lerp(this.targetColor, Math.min(1, delta * 4));

    const glowMat = this.bulbGlow.material as THREE.ShaderMaterial;
    glowMat.uniforms.uColor.value.copy(this.currentColor);
    glowMat.uniforms.uTime.value = time;

    this.glowPulse += delta * 3;
    const intensityPulse = 0.92 + 0.08 * Math.sin(this.glowPulse);
    const showBoost = this.lightShowActive ? 1.25 : 1;
    glowMat.uniforms.uIntensity.value = intensityPulse * showBoost;

    this.pointLight.color.copy(this.currentColor);
    const baseIntensity = this.lightShowActive ? 3.0 : 2.2;
    this.pointLight.intensity = baseIntensity * intensityPulse * showBoost;

    const bulbMat = this.bulbMesh.material as THREE.MeshBasicMaterial;
    const bulbCol = this.currentColor.clone().lerp(new THREE.Color(0xffffff), 0.4);
    bulbMat.color.copy(bulbCol);

    this.glowParticles.rotation.y += delta * 0.15;
    this.glowParticles.rotation.x += delta * 0.08;

    const posAttr = this.glowParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.particleCount; i++) {
      const phase = this.particlePhases[i] + time * this.particleSpeeds[i];
      const wobble = 0.015 * Math.sin(phase);
      const ix = i * 3;
      posAttr.array[ix] += Math.cos(phase * 0.7) * wobble * 0.3;
      posAttr.array[ix + 1] += Math.sin(phase * 0.9) * wobble * 0.3;
      posAttr.array[ix + 2] += Math.cos(phase * 1.1) * wobble * 0.3;
    }
    posAttr.needsUpdate = true;

    const colAttr = this.glowParticles.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < this.particleCount; i++) {
      const ix = i * 3;
      colAttr.array[ix] = this.currentColor.r * (0.85 + 0.15 * Math.sin(time * 2 + i));
      colAttr.array[ix + 1] = this.currentColor.g * (0.85 + 0.15 * Math.sin(time * 2 + i + 1));
      colAttr.array[ix + 2] = this.currentColor.b * (0.85 + 0.15 * Math.sin(time * 2 + i + 2));
    }
    colAttr.needsUpdate = true;

    const pMat = this.glowParticles.material as THREE.PointsMaterial;
    pMat.opacity = this.lightShowActive ? 0.85 : 0.7;

    this.bulbMesh.position.y = 0.01 * Math.sin(time * 2.3);
    this.group.position.y = 0.02 * Math.sin(time * 1.5);
  }

  private smoothstep(x: number): number {
    return x * x * (3 - 2 * x);
  }

  public dispose() {
    this.bulbMesh.geometry.dispose();
    (this.bulbMesh.material as THREE.Material).dispose();
    this.bulbGlow.geometry.dispose();
    (this.bulbGlow.material as THREE.Material).dispose();
    this.glowParticles.geometry.dispose();
    (this.glowParticles.material as THREE.Material).dispose();
  }
}
