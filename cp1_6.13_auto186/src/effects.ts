import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface LightArc {
  mesh: THREE.Line;
  startTime: number;
  duration: number;
  active: boolean;
}

export class EffectsManager {
  group: THREE.Group;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private maxParticles: number = 540;
  private particleCount: number = 20;
  private arcs: LightArc[] = [];
  private arcPool: LightArc[] = [];

  baseRing!: THREE.Mesh;
  energyCore!: THREE.Mesh;
  coreGlow!: THREE.Sprite;

  private ringInnerRadius: number = 250;
  private ringOuterRadius: number = 258;
  private ringTime: number = 0;
  private mouseRingUv: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);

  private corePulseTime: number = 0;
  private corePulsePeriod: number = 2.0;
  private coreScaleBase: number = 1;
  private lastPulseEmit: number = 0;
  private brokenCount: number = 0;

  private ringShaderMaterial!: THREE.ShaderMaterial;
  private coreMaterial!: THREE.ShaderMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.initBaseRing();
    this.initEnergyCore();
    this.initParticlePool();
  }

  private initParticlePool(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < this.maxParticles; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.group.add(mesh);
      this.particlePool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      });
    }
  }

  private initBaseRing(): void {
    const ringSegments = 128;
    const geometry = new THREE.RingGeometry(
      this.ringInnerRadius,
      this.ringOuterRadius,
      ringSegments,
      8
    );

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouseUv: { value: new THREE.Vector2(0.5, 0.5) },
        uInnerRadius: { value: this.ringInnerRadius },
        uOuterRadius: { value: this.ringOuterRadius },
        uColor: { value: new THREE.Color('#1a0033') },
        uGlowIntensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        uniform vec2 uMouseUv;
        uniform float uInnerRadius;
        uniform float uOuterRadius;

        void main() {
          vUv = uv;
          vPosition = position;

          vec3 pos = position;
          float midRadius = (uInnerRadius + uOuterRadius) * 0.5;
          float dist = length(pos.xy);

          vec2 mouseWorld = (uMouseUv - 0.5) * 2.0 * (uOuterRadius + 50.0);
          float distToMouse = length(pos.xy - mouseWorld);
          float wave = sin(distToMouse * 0.08 - uTime * 4.0 * 3.14159) * exp(-distToMouse * 0.008) * 5.0;

          float ripple = sin(dist * 0.15 - uTime * 2.0 * 3.14159 * 2.0) * 2.0;

          pos.z += wave + ripple;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        uniform float uInnerRadius;
        uniform float uOuterRadius;
        uniform vec3 uColor;
        uniform float uGlowIntensity;

        void main() {
          float dist = length(vPosition.xy);
          float midRadius = (uInnerRadius + uOuterRadius) * 0.5;
          float width = uOuterRadius - uInnerRadius;
          float edgeFactor = 1.0 - abs(dist - midRadius) / (width * 0.5);
          edgeFactor = pow(max(edgeFactor, 0.0), 0.5);

          float pulse = 0.5 + 0.5 * sin(uTime * 2.0);

          vec3 baseColor = uColor * (0.6 + 0.4 * pulse * uGlowIntensity);
          vec3 edgeGlow = vec3(0.6, 0.3, 0.9) * edgeFactor * pulse * uGlowIntensity;

          vec3 finalColor = baseColor + edgeGlow * 0.5;
          float alpha = 0.85 + 0.15 * pulse * uGlowIntensity;

          gl_FragColor = vec4(finalColor, alpha * edgeFactor);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.ringShaderMaterial = shaderMaterial;
    this.baseRing = new THREE.Mesh(geometry, shaderMaterial);
    this.baseRing.rotation.x = -Math.PI / 2;
    this.baseRing.position.y = -(window.innerHeight * 0.7 / 2 + 40);
    this.group.add(this.baseRing);
  }

  private initEnergyCore(): void {
    const coreGeometry = new THREE.SphereGeometry(30, 32, 32);

    const coreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1.0 },
        uCenterColor: { value: new THREE.Color('#ffd700') },
        uEdgeColor: { value: new THREE.Color('#ff6b6b') },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        uniform float uTime;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          vec3 pos = position;
          float noise = 0.0;
          for (int i = 0; i < 3; i++) {
            float freq = 2.0 + float(i) * 1.5;
            float amp = 0.02 - float(i) * 0.005;
            noise += sin(pos.x * freq + uTime * 2.0) * sin(pos.y * freq * 1.3 + uTime * 1.7) * sin(pos.z * freq * 0.8 + uTime * 2.3) * amp;
          }
          pos += normal * noise * 30.0;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        uniform float uScale;
        uniform vec3 uCenterColor;
        uniform vec3 uEdgeColor;

        void main() {
          float distFromCenter = length(vPosition) / 30.0;
          float edgeFactor = distFromCenter;
          float centerFactor = 1.0 - distFromCenter;

          vec3 color = mix(uCenterColor, uEdgeColor, edgeFactor);
          float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
          color += fresnel * uEdgeColor * 0.5;

          float alpha = 0.8 + 0.2 * centerFactor;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreMaterial = coreMat;

    this.energyCore = new THREE.Mesh(coreGeometry, coreMat);
    this.energyCore.position.y = window.innerHeight * 0.7 / 2 + 50;
    this.group.add(this.energyCore);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const ctx = glowCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 107, 107, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 107, 107, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);

    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreGlow = new THREE.Sprite(glowMaterial);
    this.coreGlow.position.copy(this.energyCore.position);
    this.coreGlow.scale.set(200, 200, 1);
    this.group.add(this.coreGlow);
  }

  spawnParticles(position: THREE.Vector3, color: THREE.Color): void {
    const count = this.particleCount;
    let spawned = 0;
    for (let i = 0; i < this.particlePool.length && spawned < count; i++) {
      const p = this.particlePool[i];
      if (!p.active) {
        this.activateParticle(p, position, color);
        spawned++;
      }
    }
  }

  private activateParticle(particle: Particle, position: THREE.Vector3, color: THREE.Color): void {
    const size = 2 + Math.random() * 4;
    particle.mesh.scale.set(size, size, size);
    particle.mesh.position.copy(position);

    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 0.5 + 0.2;
    const speed = 60 + Math.random() * 100;
    const dx = Math.cos(angle1) * Math.sin(angle2) * speed;
    const dy = Math.cos(angle2) * speed;
    const dz = Math.sin(angle1) * Math.sin(angle2) * speed;
    particle.velocity.set(dx, dy, dz);

    const material = particle.mesh.material as THREE.MeshBasicMaterial;
    material.color.copy(color);
    material.opacity = 1.0;

    particle.life = 0;
    particle.maxLife = 0.6;
    particle.active = true;
    particle.mesh.visible = true;

    this.particles.push(particle);
  }

  emitLightArcs(corePos: THREE.Vector3): void {
    const arcCount = 6;
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2 + Math.random() * 0.3;
      this.createSingleArc(corePos, angle);
    }
  }

  private createSingleArc(origin: THREE.Vector3, baseAngle: number): void {
    const points: THREE.Vector3[] = [];
    const segments = 24;
    const startRadius = 50;
    const endRadius = 200;

    const tiltAngleX = (Math.random() - 0.5) * 0.4;
    const tiltAngleZ = (Math.random() - 0.5) * 0.4;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const radius = startRadius + (endRadius - startRadius) * t;
      const arcSweep = 0.8;
      const angle = baseAngle + (t - 0.5) * arcSweep;

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.3;
      const z = Math.sin(angle) * radius;

      let point = new THREE.Vector3(x, y, z);

      const rotX = new THREE.Matrix4().makeRotationX(tiltAngleX);
      const rotZ = new THREE.Matrix4().makeRotationZ(tiltAngleZ);
      point.applyMatrix4(rotX).applyMatrix4(rotZ);

      point.add(origin);
      points.push(point);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const densePoints = curve.getPoints(60);
    const geometry = new THREE.BufferGeometry().setFromPoints(densePoints);

    const colors: number[] = [];
    const colorStart = new THREE.Color('#ffd700');
    const colorEnd = new THREE.Color('#ff6b6b');
    for (let i = 0; i < densePoints.length; i++) {
      const t = i / (densePoints.length - 1);
      const c = colorStart.clone().lerp(colorEnd, t);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 2,
    });

    let arc: LightArc;
    const pooled = this.arcPool.pop();
    if (pooled) {
      pooled.mesh.geometry.dispose();
      (pooled.mesh.material as THREE.Material).dispose();
      this.group.remove(pooled.mesh);
      pooled.mesh.geometry = geometry;
      pooled.mesh.material = material;
      pooled.startTime = 0;
      pooled.duration = 0.3;
      pooled.active = true;
      arc = pooled;
    } else {
      const line = new THREE.Line(geometry, material);
      arc = {
        mesh: line,
        startTime: 0,
        duration: 0.3,
        active: true,
      };
    }

    this.group.add(arc.mesh);
    this.arcs.push(arc);
  }

  update(delta: number, totalBroken: number): void {
    this.ringTime += delta;
    this.ringShaderMaterial.uniforms.uTime.value = this.ringTime;
    this.ringShaderMaterial.uniforms.uMouseUv.value.copy(this.mouseRingUv);

    const pulseFactor = Math.min(totalBroken / 27, 1);
    this.corePulsePeriod = 2.0 - pulseFactor * 1.5;
    this.brokenCount = totalBroken;

    this.corePulseTime += delta;
    const pulseT = (this.corePulseTime % this.corePulsePeriod) / this.corePulsePeriod;
    const pulseScale = 1 + Math.sin(pulseT * Math.PI * 2) * 0.15;
    this.coreScaleBase = pulseScale;
    this.energyCore.scale.setScalar(pulseScale);
    this.coreGlow.scale.setScalar(1 + pulseFactor * 0.6 + Math.sin(pulseT * Math.PI * 2) * 0.2);

    this.coreMaterial.uniforms.uTime.value = this.ringTime;
    this.coreMaterial.uniforms.uScale.value = pulseScale;

    if (this.corePulseTime - this.lastPulseEmit >= this.corePulsePeriod) {
      this.lastPulseEmit = this.corePulseTime;
      this.emitLightArcs(this.energyCore.position);
    }

    this.updateParticles(delta);
    this.updateArcs(delta);
    this.baseRing.rotation.z += 0.01 * delta;
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        this.particles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;
      p.mesh.position.x += p.velocity.x * delta;
      p.mesh.position.y += p.velocity.y * delta;
      p.mesh.position.z += p.velocity.z * delta;

      p.velocity.y -= 200 * delta;
      p.velocity.multiplyScalar(0.98);

      const material = p.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1.0 - t;
    }
  }

  private updateArcs(delta: number): void {
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const arc = this.arcs[i];
      arc.startTime += delta;

      if (arc.startTime >= arc.duration) {
        arc.active = false;
        this.group.remove(arc.mesh);
        this.arcPool.push(arc);
        this.arcs.splice(i, 1);
        continue;
      }

      const t = arc.startTime / arc.duration;
      const material = arc.mesh.material as THREE.LineBasicMaterial;
      material.opacity = 1.0 - t;

      const geometry = arc.mesh.geometry;
      const positions = geometry.attributes.position as THREE.BufferAttribute;
      const startIdx = Math.floor(t * (positions.count - 1));
      const drawRange = positions.count - startIdx;
      geometry.setDrawRange(startIdx, drawRange);
    }
  }

  setMouseRingUv(x: number, y: number): void {
    this.mouseRingUv.set(x, y);
  }

  setPerformanceLevel(level: 'high' | 'low'): void {
    this.particleCount = level === 'high' ? 20 : 10;
  }

  dispose(): void {
    this.particlePool.forEach(p => {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.baseRing.geometry.dispose();
    this.ringShaderMaterial.dispose();
    this.energyCore.geometry.dispose();
    this.coreMaterial.dispose();
    (this.coreGlow.material as THREE.Material).dispose();
  }
}
