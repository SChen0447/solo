import * as THREE from 'three';

export interface WaterfallParams {
  width: number;
  speed: number;
  wind: number;
}

const MAX_PARTICLES = 3000;
const MAX_SPLASH = 5000;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  colorTarget: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
  collided: boolean;
}

interface SplashParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface WaterfallCollisionInfo {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
}

const COLOR_THEMES: THREE.Color[][] = [
  [new THREE.Color(0x88ccff), new THREE.Color(0xcc88ff), new THREE.Color(0xff88aa)],
  [new THREE.Color(0xffd28a), new THREE.Color(0xff6b9d), new THREE.Color(0x9f7bff)],
  [new THREE.Color(0x8affc8), new THREE.Color(0x8ad8ff), new THREE.Color(0xc08aff)],
  [new THREE.Color(0xffe28a), new THREE.Color(0xff8a8a), new THREE.Color(0xff8ad8)]
];

export class WaterfallSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private particles: Particle[] = [];
  private splashParticles: SplashParticle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particlePoints: THREE.Points;
  private splashGeometry: THREE.BufferGeometry;
  private splashMaterial: THREE.PointsMaterial;
  private splashPoints: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private splashPositions: Float32Array;
  private splashColors: Float32Array;
  private splashSizes: Float32Array;
  private activeParticleCount = 0;
  private isDragging = false;
  private mouseWorldX = 0;
  private emitTarget = new THREE.Vector3(0, 3, 0);
  private gravity = 0.5;
  private width = 1.5;
  private speed = 2;
  private windStrength = 0.3;
  private currentThemeIndex = 0;
  private colorTransitionProgress = 1;
  private colorTransitionDuration = 0.5;
  private targetThemeIndex = 0;
  private crosshairMesh!: THREE.Group;
  public onCollision?: (info: WaterfallCollisionInfo) => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        colorTarget: new THREE.Color(),
        size: 0,
        life: 0,
        maxLife: 0,
        active: false,
        collided: false
      });
    }
    for (let i = 0; i < MAX_SPLASH; i++) {
      this.splashParticles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 0,
        life: 0,
        maxLife: 0,
        active: false
      });
    }

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.splashPositions = new Float32Array(MAX_SPLASH * 3);
    this.splashColors = new Float32Array(MAX_SPLASH * 3);
    this.splashSizes = new Float32Array(MAX_SPLASH);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particlePoints);

    this.splashGeometry = new THREE.BufferGeometry();
    this.splashGeometry.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));
    this.splashGeometry.setAttribute('color', new THREE.BufferAttribute(this.splashColors, 3));
    this.splashGeometry.setAttribute('size', new THREE.BufferAttribute(this.splashSizes, 1));
    this.splashMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.splashPoints = new THREE.Points(this.splashGeometry, this.splashMaterial);
    this.scene.add(this.splashPoints);

    this.createCrosshair();
    this.setupInputHandlers();
  }

  private createCrosshair(): void {
    this.crosshairMesh = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.6,
      depthTest: false
    });
    const hGeo = new THREE.PlaneGeometry(0.2, 0.02);
    const vGeo = new THREE.PlaneGeometry(0.02, 0.2);
    const h = new THREE.Mesh(hGeo, mat);
    const v = new THREE.Mesh(vGeo, mat);
    h.renderOrder = 999;
    v.renderOrder = 999;
    this.crosshairMesh.add(h);
    this.crosshairMesh.add(v);
    this.crosshairMesh.position.copy(this.emitTarget);
    this.scene.add(this.crosshairMesh);
  }

  private setupInputHandlers(): void {
    const aspectContainer = document.getElementById('aspect-container');
    if (!aspectContainer) return;

    const updateMouseX = (clientX: number) => {
      const rect = aspectContainer.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const vec = new THREE.Vector3(nx, 0, 0.5).unproject(this.camera);
      const dir = vec.sub(this.camera.position).normalize();
      const distance = (8 - this.camera.position.y) / dir.y;
      const worldPos = this.camera.position.clone().add(dir.multiplyScalar(distance));
      this.mouseWorldX = THREE.MathUtils.clamp(worldPos.x, -4, 4);
    };

    aspectContainer.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        updateMouseX(e.clientX);
      }
    });
    aspectContainer.addEventListener('mousemove', (e) => {
      if (this.isDragging) updateMouseX(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    aspectContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        updateMouseX(e.touches[0].clientX);
      }
    }, { passive: true });
    aspectContainer.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        updateMouseX(e.touches[0].clientX);
      }
    }, { passive: true });
    aspectContainer.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('keydown', (e) => {
      const step = 0.5;
      if (e.key.toLowerCase() === 'w') {
        this.emitTarget.y = Math.min(6, this.emitTarget.y + step);
      } else if (e.key.toLowerCase() === 's') {
        this.emitTarget.y = Math.max(-2, this.emitTarget.y - step);
      } else if (e.key.toLowerCase() === 'a') {
        this.emitTarget.x = Math.max(-4, this.emitTarget.x - step);
      } else if (e.key.toLowerCase() === 'd') {
        this.emitTarget.x = Math.min(4, this.emitTarget.x + step);
      }
    });

    const sliderWidth = document.getElementById('slider-width') as HTMLInputElement;
    const sliderSpeed = document.getElementById('slider-speed') as HTMLInputElement;
    const sliderWind = document.getElementById('slider-wind') as HTMLInputElement;
    const btnReset = document.getElementById('btn-reset');
    const btnTheme = document.getElementById('btn-theme');

    if (sliderWidth) sliderWidth.addEventListener('input', (e) => {
      this.width = parseFloat((e.target as HTMLInputElement).value);
    });
    if (sliderSpeed) sliderSpeed.addEventListener('input', (e) => {
      this.speed = parseFloat((e.target as HTMLInputElement).value);
    });
    if (sliderWind) sliderWind.addEventListener('input', (e) => {
      this.windStrength = parseFloat((e.target as HTMLInputElement).value);
    });
    if (btnReset) btnReset.addEventListener('click', () => this.reset());
    if (btnTheme) btnTheme.addEventListener('click', () => this.switchTheme());
  }

  public reset(): void {
    for (const p of this.particles) {
      p.active = false;
    }
    for (const s of this.splashParticles) {
      s.active = false;
    }
    this.activeParticleCount = 0;
    this.emitTarget.set(0, 3, 0);
  }

  public switchTheme(): void {
    this.targetThemeIndex = (this.currentThemeIndex + 1) % COLOR_THEMES.length;
    this.colorTransitionProgress = 0;
  }

  public setParams(params: Partial<WaterfallParams>): void {
    if (params.width !== undefined) this.width = params.width;
    if (params.speed !== undefined) this.speed = params.speed;
    if (params.wind !== undefined) this.windStrength = params.wind;
  }

  public getActiveCount(): number {
    return this.activeParticleCount;
  }

  private pickColor(target: THREE.Color, target2: THREE.Color): void {
    const theme = COLOR_THEMES[this.currentThemeIndex];
    const nextTheme = COLOR_THEMES[this.targetThemeIndex];
    const idx = Math.floor(Math.random() * theme.length);
    const base = theme[idx];
    const next = nextTheme[idx];
    const t = this.colorTransitionProgress;
    target.copy(base).lerp(next, t);
    const jitter = 0.08;
    target.r += (Math.random() - 0.5) * jitter;
    target.g += (Math.random() - 0.5) * jitter;
    target.b += (Math.random() - 0.5) * jitter;
    target2.copy(target);
  }

  private emit(): void {
    if (!this.isDragging) return;

    const rate = 80;
    for (let r = 0; r < rate; r++) {
      let idx = -1;
      for (let i = 0; i < this.particles.length; i++) {
        if (!this.particles[i].active) {
          idx = i;
          break;
        }
      }
      if (idx < 0) break;
      const p = this.particles[idx];

      const targetX = this.mouseWorldX + (Math.random() - 0.5) * this.width;
      const targetY = this.emitTarget.y;
      const targetZ = this.emitTarget.z;
      p.position.set(targetX + (Math.random() - 0.5) * 0.3, 8, targetZ + (Math.random() - 0.5) * 0.3);

      const dx = targetX - p.position.x;
      const dy = targetY - p.position.y;
      const dz = targetZ - p.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const baseSpeed = this.speed * (1.5 + Math.random());
      p.velocity.set(
        (dx / dist) * baseSpeed + (Math.random() - 0.5) * 0.3,
        (dy / dist) * baseSpeed,
        (dz / dist) * baseSpeed + (Math.random() - 0.5) * 0.3
      );

      this.pickColor(p.color, p.colorTarget);
      p.size = 2 + Math.random() * 3;
      p.life = 0;
      p.maxLife = 8 + Math.random() * 4;
      p.active = true;
      p.collided = false;
      this.activeParticleCount++;
    }
  }

  public spawnSplash(position: THREE.Vector3, baseColor: THREE.Color): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      let idx = -1;
      for (let j = 0; j < this.splashParticles.length; j++) {
        if (!this.splashParticles[j].active) {
          idx = j;
          break;
        }
      }
      if (idx < 0) break;
      const s = this.splashParticles[idx];
      s.position.copy(position);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      s.velocity.set(
        radial.x * speed,
        0.3 + Math.random() * 1.2,
        radial.z * speed
      );
      s.color.copy(baseColor);
      s.size = 1 + Math.random();
      s.life = 0;
      s.maxLife = 0.4 + Math.random() * 0.2;
      s.active = true;
    }
  }

  private tmpColor = new THREE.Color();
  private tmpVec = new THREE.Vector3();

  public update(dt: number, platformCheck: (pos: THREE.Vector3, vel: THREE.Vector3) => boolean): void {
    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + dt / this.colorTransitionDuration);
      if (this.colorTransitionProgress >= 1) {
        this.currentThemeIndex = this.targetThemeIndex;
      }
    }

    this.emit();
    this.crosshairMesh.position.copy(this.emitTarget);

    let activeCount = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife || p.position.y < -6) {
        p.active = false;
        continue;
      }

      p.velocity.y -= this.gravity * dt;
      p.velocity.x += (Math.sin(p.life * 2 + i) * this.windStrength * 0.5) * dt;
      p.velocity.z += (Math.cos(p.life * 1.5 + i * 0.7) * this.windStrength * 0.3) * dt;

      p.position.addScaledVector(p.velocity, dt);

      if (!p.collided && platformCheck(p.position, p.velocity)) {
        p.collided = true;
        if (this.onCollision) {
          this.tmpVec.copy(p.position);
          this.tmpColor.copy(p.color);
          this.onCollision({
            position: this.tmpVec,
            velocity: p.velocity,
            color: this.tmpColor
          });
        }
        this.spawnSplash(p.position, p.color);
        p.active = false;
        continue;
      }

      const i3 = i * 3;
      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;
      this.colors[i3] = p.color.r;
      this.colors[i3 + 1] = p.color.g;
      this.colors[i3 + 2] = p.color.b;
      this.sizes[i] = p.size * 0.05;
      activeCount++;
    }
    this.activeParticleCount = activeCount;

    (this.particleGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    this.particleGeometry.setDrawRange(0, MAX_PARTICLES);

    for (let i = 0; i < this.splashParticles.length; i++) {
      const s = this.splashParticles[i];
      if (!s.active) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        continue;
      }
      s.velocity.y -= this.gravity * 0.3 * dt;
      s.velocity.multiplyScalar(1 - 0.8 * dt);
      s.position.addScaledVector(s.velocity, dt);

      const lifeT = s.life / s.maxLife;
      const whiteMix = Math.sin(lifeT * Math.PI);
      const i3 = i * 3;
      this.splashPositions[i3] = s.position.x;
      this.splashPositions[i3 + 1] = s.position.y;
      this.splashPositions[i3 + 2] = s.position.z;
      this.splashColors[i3] = s.color.r + (1 - s.color.r) * whiteMix;
      this.splashColors[i3 + 1] = s.color.g + (1 - s.color.g) * whiteMix;
      this.splashColors[i3 + 2] = s.color.b + (1 - s.color.b) * whiteMix;
      this.splashSizes[i] = s.size * 0.04 * (1 - lifeT * 0.5);
    }

    (this.splashGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.splashGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.splashGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    this.splashGeometry.setDrawRange(0, MAX_SPLASH);
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.splashGeometry.dispose();
    this.splashMaterial.dispose();
    this.scene.remove(this.particlePoints);
    this.scene.remove(this.splashPoints);
    this.scene.remove(this.crosshairMesh);
  }
}
