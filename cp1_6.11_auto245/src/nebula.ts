import * as THREE from 'three';

export interface NebulaConfig {
  density: number;
  collisionSpeed: number;
  pulseFrequency: number;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  baseOpacity: number;
  color: THREE.Color;
  originalColor: THREE.Color;
  nebulaId: number;
  isStellarWind: boolean;
  life: number;
  maxLife: number;
  twinkleOffset: number;
}

interface StarState {
  exists: boolean;
  position: THREE.Vector3;
  pulsePhase: number;
  coreDensity: number;
}

const NEBULA_COLORS = [
  new THREE.Color(0x1a237e),
  new THREE.Color(0xb71c1c),
];

const MIX_COLOR = new THREE.Color(0x7b1fa2);
const STAR_CORE_COLOR = new THREE.Color(0xffffff);
const STAR_OUTER_COLOR = new THREE.Color(0xff6f00);
const STELLAR_WIND_COLORS = [
  new THREE.Color(0x81d4fa),
  new THREE.Color(0xf48fb1),
];

const PARTICLES_PER_NEBULA = 500;
const BACKGROUND_STARS = 300;
const MAX_STELLAR_WIND = 200;
const NEBULA_RADIUS = 130;
const STAR_FORMATION_THRESHOLD = 0.6;
const PULSE_BASE_PERIOD = 5;

export class NebulaSystem {
  private scene: THREE.Scene;
  private config: NebulaConfig;

  private nebulaParticles: ParticleData[][] = [[], []];
  private nebulaCenters: THREE.Vector3[] = [];
  private nebulaPoints: THREE.Points[] = [];

  private starFieldParticles: ParticleData[] = [];
  private starFieldPoints: THREE.Points | null = null;

  private stellarWindParticles: ParticleData[] = [];
  private stellarWindPoints: THREE.Points | null = null;

  private star: StarState = {
    exists: false,
    position: new THREE.Vector3(),
    pulsePhase: 0,
    coreDensity: 0,
  };

  private starSprite: THREE.Sprite | null = null;
  private starGlowSprite: THREE.Sprite | null = null;

  private collisionCount = 0;
  private overlapAmount = 0;

  private frameCount = 0;

  private worldBounds: { width: number; height: number };

  constructor(scene: THREE.Scene, config: NebulaConfig, worldBounds: { width: number; height: number }) {
    this.scene = scene;
    this.config = config;
    this.worldBounds = worldBounds;

    this.initStarField();
    this.initNebulae();
    this.initStellarWind();
  }

  private initStarField() {
    const positions = new Float32Array(BACKGROUND_STARS * 3);
    const colors = new Float32Array(BACKGROUND_STARS * 3);
    const sizes = new Float32Array(BACKGROUND_STARS);

    for (let i = 0; i < BACKGROUND_STARS; i++) {
      const x = (Math.random() - 0.5) * this.worldBounds.width * 1.5;
      const y = (Math.random() - 0.5) * this.worldBounds.height * 1.5;
      const z = (Math.random() - 0.5) * 200 - 100;

      const particle: ParticleData = {
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(),
        size: 1 + Math.random() * 2,
        baseOpacity: 0.3 + Math.random() * 0.7,
        color: new THREE.Color(0xffffff),
        originalColor: new THREE.Color(0xffffff),
        nebulaId: -1,
        isStellarWind: false,
        life: 1,
        maxLife: 1,
        twinkleOffset: Math.random() * Math.PI * 2,
      };
      this.starFieldParticles.push(particle);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      sizes[i] = particle.size;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float time;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = sin(time * 2.0 + position.x * 0.01 + position.y * 0.01) * 0.5 + 0.5;
          vTwinkle = twinkle;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * (0.4 + vTwinkle * 0.6);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.starFieldPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starFieldPoints);
  }

  private initNebulae() {
    const startX = this.worldBounds.width * 0.35;

    this.nebulaCenters = [
      new THREE.Vector3(-startX, 0, 0),
      new THREE.Vector3(startX, 0, 0),
    ];

    for (let n = 0; n < 2; n++) {
      const particleCount = PARTICLES_PER_NEBULA;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const opacities = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const t = Math.random();
        const radius = Math.pow(t, 0.6) * NEBULA_RADIUS;
        const x = this.nebulaCenters[n].x + Math.cos(angle) * radius;
        const y = this.nebulaCenters[n].y + Math.sin(angle) * radius;
        const z = (Math.random() - 0.5) * 50;

        const speed = 1 + Math.random() * 2;
        const velAngle = Math.random() * Math.PI * 2;

        const centerFactor = 1 - radius / NEBULA_RADIUS;
        const size = 8 + centerFactor * 12 + Math.random() * 6;
        const opacity = 0.25 + centerFactor * 0.35 + Math.random() * 0.15;

        const particle: ParticleData = {
          position: new THREE.Vector3(x, y, z),
          velocity: new THREE.Vector3(
            Math.cos(velAngle) * speed,
            Math.sin(velAngle) * speed,
            0
          ),
          size,
          baseOpacity: opacity,
          color: NEBULA_COLORS[n].clone(),
          originalColor: NEBULA_COLORS[n].clone(),
          nebulaId: n,
          isStellarWind: false,
          life: 1,
          maxLife: 1,
          twinkleOffset: Math.random() * Math.PI * 2,
        };
        this.nebulaParticles[n].push(particle);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        colors[i * 3] = particle.color.r;
        colors[i * 3 + 1] = particle.color.g;
        colors[i * 3 + 2] = particle.color.b;
        sizes[i] = size;
        opacities[i] = opacity;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

      const material = new THREE.ShaderMaterial({
        uniforms: {
          pixelRatio: { value: window.devicePixelRatio || 1 },
        },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          varying vec3 vColor;
          varying float vOpacity;
          
          void main() {
            vColor = color;
            vOpacity = opacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vOpacity;
          
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vOpacity;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      });

      const points = new THREE.Points(geometry, material);
      this.nebulaPoints.push(points);
      this.scene.add(points);
    }
  }

  private initStellarWind() {
    const positions = new Float32Array(MAX_STELLAR_WIND * 3);
    const colors = new Float32Array(MAX_STELLAR_WIND * 3);
    const sizes = new Float32Array(MAX_STELLAR_WIND);
    const opacities = new Float32Array(MAX_STELLAR_WIND);

    for (let i = 0; i < MAX_STELLAR_WIND; i++) {
      const particle: ParticleData = {
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(),
        size: 2,
        baseOpacity: 0,
        color: new THREE.Color(),
        originalColor: new THREE.Color(),
        nebulaId: -1,
        isStellarWind: true,
        life: 0,
        maxLife: 3,
        twinkleOffset: 0,
      };
      this.stellarWindParticles.push(particle);

      sizes[i] = 0;
      opacities[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.stellarWindPoints = new THREE.Points(geometry, material);
    this.scene.add(this.stellarWindPoints);
  }

  private createStar() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 200, 100, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 111, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 111, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    this.starGlowSprite = new THREE.Sprite(material);
    this.starGlowSprite.scale.set(80, 80, 1);
    this.starGlowSprite.position.copy(this.star.position);
    this.scene.add(this.starGlowSprite);

    const coreCanvas = document.createElement('canvas');
    coreCanvas.width = 128;
    coreCanvas.height = 128;
    const coreCtx = coreCanvas.getContext('2d')!;
    
    const coreGradient = coreCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.95)');
    coreGradient.addColorStop(0.7, 'rgba(255, 180, 80, 0.5)');
    coreGradient.addColorStop(1, 'rgba(255, 111, 0, 0)');
    
    coreCtx.fillStyle = coreGradient;
    coreCtx.fillRect(0, 0, 128, 128);
    
    const coreTexture = new THREE.CanvasTexture(coreCanvas);
    const coreMaterial = new THREE.SpriteMaterial({
      map: coreTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    this.starSprite = new THREE.Sprite(coreMaterial);
    this.starSprite.scale.set(40, 40, 1);
    this.starSprite.position.copy(this.star.position);
    this.starSprite.position.z = 5;
    this.scene.add(this.starSprite);
  }

  setConfig(config: Partial<NebulaConfig>) {
    Object.assign(this.config, config);
  }

  getConfig(): NebulaConfig {
    return { ...this.config };
  }

  getNebulaCenter(id: number): THREE.Vector3 {
    return this.nebulaCenters[id].clone();
  }

  setNebulaPosition(id: number, position: THREE.Vector3) {
    const delta = position.clone().sub(this.nebulaCenters[id]);
    this.nebulaCenters[id].copy(position);

    for (const p of this.nebulaParticles[id]) {
      p.position.add(delta);
    }
  }

  getCollisionCount(): number {
    return this.collisionCount;
  }

  getStarExists(): boolean {
    return this.star.exists;
  }

  update(deltaTime: number) {
    this.frameCount++;
    const time = this.frameCount * deltaTime;

    this.updateStarField(deltaTime, time);
    this.updateNebulae(deltaTime);
    this.checkAndHandleCollision();
    this.updateStar(deltaTime);
    this.updateStellarWind(deltaTime);
  }

  private updateStarField(deltaTime: number, time: number) {
    if (!this.starFieldPoints) return;
    
    const material = this.starFieldPoints.material as THREE.ShaderMaterial;
    material.uniforms.time.value = time;
  }

  private updateNebulae(deltaTime: number) {
    for (let n = 0; n < 2; n++) {
      const particles = this.nebulaParticles[n];
      const center = this.nebulaCenters[n];
      const positions = this.nebulaPoints[n].geometry.attributes.position as THREE.BufferAttribute;
      const colors = this.nebulaPoints[n].geometry.attributes.color as THREE.BufferAttribute;
      const sizes = this.nebulaPoints[n].geometry.attributes.size as THREE.BufferAttribute;
      const opacities = this.nebulaPoints[n].geometry.attributes.opacity as THREE.BufferAttribute;

      const speedMultiplier = this.config.collisionSpeed;
      const densityMultiplier = this.config.density;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (this.frameCount % 2 === 0 || i < 200) {
          const toCenter = new THREE.Vector3().subVectors(center, p.position);
          const dist = toCenter.length();
          
          if (dist > NEBULA_RADIUS * 0.3) {
            toCenter.normalize();
            p.velocity.add(toCenter.multiplyScalar(0.5 * deltaTime * speedMultiplier));
          }

          p.velocity.x += (Math.random() - 0.5) * 2 * deltaTime * speedMultiplier;
          p.velocity.y += (Math.random() - 0.5) * 2 * deltaTime * speedMultiplier;

          const maxSpeed = 8 * speedMultiplier;
          const speed = p.velocity.length();
          if (speed > maxSpeed) {
            p.velocity.multiplyScalar(maxSpeed / speed);
          }

          p.position.x += p.velocity.x * deltaTime * 60 * 0.016;
          p.position.y += p.velocity.y * deltaTime * 60 * 0.016;

          const distFromCenter = p.position.distanceTo(center);
          if (distFromCenter > NEBULA_RADIUS * densityMultiplier) {
            const pushBack = new THREE.Vector3().subVectors(center, p.position).normalize();
            p.velocity.add(pushBack.multiplyScalar(1));
          }
        }

        positions.array[i * 3] = p.position.x;
        positions.array[i * 3 + 1] = p.position.y;
        positions.array[i * 3 + 2] = p.position.z;

        colors.array[i * 3] = p.color.r;
        colors.array[i * 3 + 1] = p.color.g;
        colors.array[i * 3 + 2] = p.color.b;

        sizes.array[i] = p.size * densityMultiplier * 0.7 + p.size * 0.3;
        opacities.array[i] = p.baseOpacity;
      }

      positions.needsUpdate = true;
      colors.needsUpdate = true;
      sizes.needsUpdate = true;
      opacities.needsUpdate = true;
    }
  }

  private checkAndHandleCollision() {
    const dist = this.nebulaCenters[0].distanceTo(this.nebulaCenters[1]);
    const overlapRadius = NEBULA_RADIUS * 1.5 * this.config.density;
    const newOverlap = Math.max(0, 1 - dist / overlapRadius);

    if (newOverlap > 0.1 && this.overlapAmount <= 0.1) {
      this.collisionCount++;
    }
    this.overlapAmount = newOverlap;

    if (newOverlap <= 0) {
      for (let n = 0; n < 2; n++) {
        for (const p of this.nebulaParticles[n]) {
          p.color.lerp(p.originalColor, 0.1);
        }
      }
      this.star.coreDensity *= 0.99;
      return;
    }

    const midPoint = new THREE.Vector3()
      .addVectors(this.nebulaCenters[0], this.nebulaCenters[1])
      .multiplyScalar(0.5);

    let coreParticleCount = 0;

    for (let n = 0; n < 2; n++) {
      for (const p of this.nebulaParticles[n]) {
        const distToMid = p.position.distanceTo(midPoint);
        if (distToMid < NEBULA_RADIUS * newOverlap) {
          p.color.lerp(MIX_COLOR, 0.05);
          
          const gravityPull = new THREE.Vector3().subVectors(midPoint, p.position).normalize();
          p.velocity.add(gravityPull.multiplyScalar(0.3 * newOverlap * this.config.collisionSpeed));
          
          if (distToMid < NEBULA_RADIUS * 0.3) {
            coreParticleCount++;
          }
        } else {
          p.color.lerp(p.originalColor, 0.02);
        }
      }
    }

    const densityRatio = coreParticleCount / (PARTICLES_PER_NEBULA * 0.3);
    this.star.coreDensity += (densityRatio - this.star.coreDensity) * 0.05;

    if (!this.star.exists && this.star.coreDensity > STAR_FORMATION_THRESHOLD) {
      this.star.exists = true;
      this.star.position.copy(midPoint);
      this.star.pulsePhase = 0;
      this.createStar();
    }

    if (this.star.exists) {
      this.star.position.lerp(midPoint, 0.05);
    }
  }

  private updateStar(deltaTime: number) {
    if (!this.star.exists || !this.starGlowSprite || !this.starSprite) return;

    const pulsePeriod = PULSE_BASE_PERIOD / this.config.pulseFrequency;
    this.star.pulsePhase += (deltaTime / pulsePeriod) * Math.PI * 2;

    const pulse = Math.sin(this.star.pulsePhase);
    const normalizedPulse = (pulse + 1) / 2;
    const glowSize = 40 + normalizedPulse * 40;
    const coreSize = 20 + normalizedPulse * 20;

    this.starGlowSprite.scale.set(glowSize * 2, glowSize * 2, 1);
    this.starSprite.scale.set(coreSize * 2, coreSize * 2, 1);

    const glowMaterial = this.starGlowSprite.material as THREE.SpriteMaterial;
    glowMaterial.opacity = 0.6 + normalizedPulse * 0.4;

    this.starGlowSprite.position.copy(this.star.position);
    this.starSprite.position.copy(this.star.position);
    this.starSprite.position.z = 10;

    if (pulse > 0.9 && Math.random() < 0.3) {
      this.emitStellarWindBurst();
    }
  }

  private emitStellarWindBurst() {
    const burstCount = 5 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < burstCount; i++) {
      const particle = this.findInactiveStellarWindParticle();
      if (!particle) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 20;
      const colorIndex = Math.random() < 0.5 ? 0 : 1;

      particle.position.copy(this.star.position);
      particle.position.z = (Math.random() - 0.5) * 10;
      particle.velocity.set(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 5
      );
      particle.size = 3 + Math.random() * 4;
      particle.baseOpacity = 0.7 + Math.random() * 0.3;
      particle.color.copy(STELLAR_WIND_COLORS[colorIndex]);
      particle.originalColor.copy(STELLAR_WIND_COLORS[colorIndex]);
      particle.isStellarWind = true;
      particle.life = 1;
      particle.maxLife = 3;
    }
  }

  private findInactiveStellarWindParticle(): ParticleData | null {
    for (const p of this.stellarWindParticles) {
      if (p.life <= 0) {
        return p;
      }
    }
    return null;
  }

  private updateStellarWind(deltaTime: number) {
    if (!this.stellarWindPoints) return;

    const positions = this.stellarWindPoints.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.stellarWindPoints.geometry.attributes.color as THREE.BufferAttribute;
    const sizes = this.stellarWindPoints.geometry.attributes.size as THREE.BufferAttribute;
    const opacities = this.stellarWindPoints.geometry.attributes.opacity as THREE.BufferAttribute;

    for (let i = 0; i < this.stellarWindParticles.length; i++) {
      const p = this.stellarWindParticles[i];

      if (p.life > 0) {
        p.life -= deltaTime / p.maxLife;
        
        p.position.x += p.velocity.x * deltaTime;
        p.position.y += p.velocity.y * deltaTime;
        p.position.z += p.velocity.z * deltaTime;

        p.velocity.multiplyScalar(0.98);

        const alpha = Math.max(0, p.life);
        p.baseOpacity = alpha * 0.7;

        positions.array[i * 3] = p.position.x;
        positions.array[i * 3 + 1] = p.position.y;
        positions.array[i * 3 + 2] = p.position.z;
        colors.array[i * 3] = p.color.r;
        colors.array[i * 3 + 1] = p.color.g;
        colors.array[i * 3 + 2] = p.color.b;
        sizes.array[i] = p.size * alpha;
        opacities.array[i] = p.baseOpacity;
      } else {
        sizes.array[i] = 0;
        opacities.array[i] = 0;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    opacities.needsUpdate = true;
  }

  getStarPosition(): THREE.Vector3 | null {
    return this.star.exists ? this.star.position.clone() : null;
  }

  resize(worldBounds: { width: number; height: number }) {
    this.worldBounds = worldBounds;
  }
}
