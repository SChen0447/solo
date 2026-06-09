import * as THREE from 'three';
import {
  particlePool,
  interpolateColors,
  type ComboEffect,
  type ParticleEffectType,
  type ParticleData
} from './magic';

export class MagicScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  particles: THREE.Points;
  particleGeometry: THREE.BufferGeometry;
  particleMaterial: THREE.PointsMaterial;
  magicCircleGroup: THREE.Group;
  magicCircleActive = false;
  magicCircleTime = 0;
  magicCircleDuration = 1.0;
  comboColors: string[] = ['#ffffff'];
  animationId: number | null = null;
  lastTime = 0;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const MAX_PARTICLES = 800;
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);

    this.magicCircleGroup = new THREE.Group();
    this.scene.add(this.magicCircleGroup);
    this.buildMagicCircle();

    window.addEventListener('resize', () => this.onResize());
  }

  buildMagicCircle() {
    while (this.magicCircleGroup.children.length > 0) {
      this.magicCircleGroup.remove(this.magicCircleGroup.children[0]);
    }

    const outerRingGeo = new THREE.RingGeometry(3.5, 3.7, 96);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.name = 'outerRing';
    this.magicCircleGroup.add(outerRing);

    const innerRingGeo = new THREE.RingGeometry(2.2, 2.35, 96);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.name = 'innerRing';
    this.magicCircleGroup.add(innerRing);

    const runeCount = 8;
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2;
      const r = 2.9;
      const runeGeo = new THREE.CircleGeometry(0.18, 16);
      const runeMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0
      });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      rune.name = `rune${i}`;
      this.magicCircleGroup.add(rune);
    }

    for (let i = 0; i < 6; i++) {
      const points: THREE.Vector3[] = [];
      const segments = 60;
      const startAngle = (i / 6) * Math.PI * 2;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle = startAngle + t * Math.PI * 4;
        const r = 0.5 + t * 3;
        points.push(new THREE.Vector3(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          0
        ));
      }
      const spiralGeo = new THREE.BufferGeometry().setFromPoints(points);
      const spiralMat = new THREE.LineBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0
      });
      const spiral = new THREE.Line(spiralGeo, spiralMat);
      spiral.name = `spiral${i}`;
      this.magicCircleGroup.add(spiral);
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  triggerMagicCircle(combo: ComboEffect) {
    this.magicCircleActive = true;
    this.magicCircleTime = 0;
    this.magicCircleDuration = 0.8 + Math.random() * 0.4;
    this.comboColors = combo.colors;

    const color = new THREE.Color(combo.colors[0]);
    this.magicCircleGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        const mat = obj.material as THREE.MeshBasicMaterial | THREE.LineBasicMaterial;
        if (mat && 'color' in mat) {
          mat.color.copy(color);
        }
      }
    });

    this.spawnParticles(combo);
  }

  spawnParticles(combo: ComboEffect) {
    const count = Math.min(combo.particleCount, 600);
    for (let i = 0; i < count; i++) {
      const p = particlePool.acquire();
      if (!p) break;
      this.initParticle(p, combo.effect, combo.colors, i, count);
    }
  }

  initParticle(p: ParticleData, effect: ParticleEffectType, colors: string[], i: number, total: number) {
    const colorT = Math.random();
    const color = interpolateColors(colors, colorT);
    p.color.copy(color);
    p.effectType = effect;
    p.size = 0.5 + Math.random() * 2.5;
    p.maxLife = 1.2 + Math.random() * 0.3;
    p.life = p.maxLife;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;

    switch (effect) {
      case 'fire':
        p.position.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        p.velocity.set(
          (Math.random() - 0.5) * 2,
          2 + Math.random() * 4,
          (Math.random() - 0.5) * 2
        );
        break;
      case 'ice':
        const r = Math.random() * 4;
        p.position.set(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          (Math.random() - 0.5) * 3
        );
        p.velocity.set(
          -Math.cos(angle) * speed * 0.5,
          -Math.sin(angle) * speed * 0.5,
          (Math.random() - 0.5) * 2
        );
        break;
      case 'lightning':
        p.position.set(0, 0, 0);
        p.velocity.set(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8
        );
        break;
      case 'heal':
        p.position.set(
          (Math.random() - 0.5) * 2,
          -2 + Math.random() * 2,
          (Math.random() - 0.5) * 2
        );
        p.velocity.set(0, 1 + Math.random() * 2, 0);
        break;
      case 'wind':
        p.position.set(0, 0, 0);
        p.velocity.set(0, 0.5 + Math.random(), 0);
        break;
      case 'star':
        const sr = 2 + Math.random() * 3;
        p.position.set(
          Math.cos(angle) * sr,
          Math.sin(angle) * sr,
          (Math.random() - 0.5) * 3
        );
        p.velocity.set(
          -Math.cos(angle) * speed,
          -Math.sin(angle) * speed,
          (Math.random() - 0.5) * 3
        );
        break;
      case 'steam':
        p.position.set(
          (Math.random() - 0.5) * 3,
          -1 + Math.random(),
          (Math.random() - 0.5) * 3
        );
        p.velocity.set(
          (Math.random() - 0.5) * 1,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 1
        );
        p.size = 1 + Math.random() * 3;
        break;
      case 'goldenRain':
        p.position.set(
          (Math.random() - 0.5) * 10,
          5 + Math.random() * 3,
          (Math.random() - 0.5) * 5
        );
        p.velocity.set(
          (Math.random() - 0.5) * 0.5,
          -(2 + Math.random() * 3),
          (Math.random() - 0.5) * 0.5
        );
        break;
      case 'storm':
        p.position.set(
          (Math.random() - 0.5) * 8,
          4 + Math.random() * 2,
          (Math.random() - 0.5) * 4
        );
        p.velocity.set(
          (Math.random() - 0.5) * 4,
          -(1 + Math.random() * 3),
          (Math.random() - 0.5) * 2
        );
        break;
      case 'elemental':
      case 'ultimate':
      default:
        const er = Math.random() * 2;
        p.position.set(
          Math.cos(angle) * er,
          Math.sin(angle) * er,
          (Math.random() - 0.5) * 2
        );
        p.velocity.set(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          (Math.random() - 0.5) * speed
        );
        break;
    }
  }

  start() {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  update(dt: number) {
    particlePool.update(dt);

    if (this.magicCircleActive) {
      this.magicCircleTime += dt;
      const t = Math.min(this.magicCircleTime / this.magicCircleDuration, 1);
      const eased = this.easeOutCubic(t);

      this.magicCircleGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          const mat = obj.material as THREE.Material;
          if (obj.name.startsWith('spiral')) {
            const idx = parseInt(obj.name.replace('spiral', '')) || 0;
            const spiralT = Math.max(0, (t - idx * 0.05) / 0.8);
            mat.opacity = Math.min(1, spiralT) * (1 - t) * 0.8;
          } else if (obj.name.startsWith('rune')) {
            const idx = parseInt(obj.name.replace('rune', '')) || 0;
            const runeT = Math.max(0, (t - 0.3 - idx * 0.03) / 0.5);
            mat.opacity = Math.min(1, runeT) * (1 - t * 0.8);
          } else {
            mat.opacity = eased * (1 - t) * 0.9;
          }
        }
      });

      this.magicCircleGroup.rotation.z += dt * (1 - t) * 2;
      this.magicCircleGroup.scale.setScalar(0.1 + eased * 0.9);

      if (t >= 1) {
        this.magicCircleActive = false;
      }
    }

    const activeParticles = particlePool.getActive();
    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute;

    let visibleCount = 0;
    for (let i = 0; i < 800; i++) {
      if (i < activeParticles.length) {
        const p = activeParticles[i];
        const lifeRatio = p.life / p.maxLife;
        const fade = lifeRatio;

        posAttr.array[i * 3] = p.position.x;
        posAttr.array[i * 3 + 1] = p.position.y;
        posAttr.array[i * 3 + 2] = p.position.z;

        colAttr.array[i * 3] = p.color.r * fade;
        colAttr.array[i * 3 + 1] = p.color.g * fade;
        colAttr.array[i * 3 + 2] = p.color.b * fade;

        sizeAttr.array[i] = p.size * (0.5 + lifeRatio * 0.5);
        visibleCount = i + 1;
      } else {
        sizeAttr.array[i] = 0;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, visibleCount);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
