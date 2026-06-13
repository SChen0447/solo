import * as THREE from 'three';
import gsap from 'gsap';
import SimpleNoise from 'simplex-noise';
import { SceneManager, MouseState } from './sceneManager';
import { AudioManager } from './audioManager';

type ColorTheme = 'rainbow' | 'aurora' | 'flame';

interface PrismData {
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  originalHeight: number;
  width: number;
  rotationSpeed: number;
  originalHue: number;
  currentHue: number;
  targetHue: number;
  baseOpacity: number;
  isAnimating: boolean;
  radialDir: THREE.Vector3;
  beam: THREE.Mesh | null;
  beamTimer: number;
  noiseOffset: number;
}

const PRISM_COUNT = 600;
const INTERACTION_RADIUS = 100;
const BEAM_LENGTH = 200;
const BEAM_LIFETIME = 2.0;

export class LightSculpture {
  private group: THREE.Group;
  private prisms: PrismData[] = [];
  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private noise: SimpleNoise;

  private rotationSpeed = 0.005;
  private flickerEnabled = false;
  private flickerFreq = { min: 1, max: 3 };
  private colorTheme: ColorTheme = 'rainbow';
  private time = 0;
  private lastMouseNdc = new THREE.Vector2(9999, 9999);

  private isExpanding = false;
  private minHeight = 30;
  private maxHeight = 80;

  constructor(sceneManager: SceneManager, audioManager: AudioManager) {
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;
    this.noise = new SimpleNoise();
    this.group = new THREE.Group();
    this.sceneManager.scene.add(this.group);

    this.createPrisms();
    this.bindEvents();
    this.createControlPanel();
  }

  private createPrisms(): void {
    const geometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
    geometry.translate(0, 0.5, 0);

    for (let i = 0; i < PRISM_COUNT; i++) {
      const height = 30 + Math.random() * 50;
      const width = 4 + Math.random() * 4;
      const hue = Math.random() * 360;

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(hue / 360, 0.8, 0.6),
        emissive: new THREE.Color().setHSL(hue / 360, 0.8, 0.3),
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 1,
        shininess: 80,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(width, height, width);

      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 200 + Math.random() * 200;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      mesh.position.set(x, y, z);

      const radialDir = new THREE.Vector3(x, y, z).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, radialDir);
      mesh.quaternion.copy(quat);

      this.group.add(mesh);

      this.prisms.push({
        mesh,
        basePosition: new THREE.Vector3(x, y, z),
        originalHeight: height,
        width,
        rotationSpeed: 0.01 + Math.random() * 0.02,
        originalHue: hue,
        currentHue: hue,
        targetHue: hue,
        baseOpacity: 1,
        isAnimating: false,
        radialDir,
        beam: null,
        beamTimer: 0,
        noiseOffset: Math.random() * 100,
      });
    }
  }

  private bindEvents(): void {
    this.sceneManager.onMouseMove((mouse: MouseState) => {
      this.lastMouseNdc.set(mouse.ndcX, mouse.ndcY);
      this.handleMouseMove(mouse);
    });

    this.sceneManager.onMouseClick((mouse: MouseState) => {
      this.lastMouseNdc.set(mouse.ndcX, mouse.ndcY);
      this.handleMouseClick(mouse);
    });

    this.sceneManager.onKeyPress((key: string) => {
      if (key === ' ') {
        this.handleSpacePress();
      }
    });
  }

  private handleMouseMove(mouse: MouseState): void {
    const ray = this.sceneManager.getRayFromMouse();
    const rayOrigin = ray.origin;
    const rayDir = ray.direction;

    for (const prism of this.prisms) {
      const worldPos = new THREE.Vector3();
      prism.mesh.getWorldPosition(worldPos);
      const toPrism = worldPos.clone().sub(rayOrigin);
      const projLen = toPrism.dot(rayDir);
      if (projLen < 0) continue;

      const closest = rayOrigin.clone().add(rayDir.clone().multiplyScalar(projLen));
      const dist = closest.distanceTo(worldPos);

      if (dist < INTERACTION_RADIUS) {
        setTimeout(() => this.activatePrism(prism), 300);
      }
    }
  }

  private activatePrism(prism: PrismData): void {
    if (prism.isAnimating) return;
    prism.isAnimating = true;

    const targetScaleY = prism.originalHeight * (1 + (Math.random() > 0.5 ? 0.5 : -0.5));

    gsap.to(prism.mesh.scale, {
      y: Math.max(5, targetScaleY),
      duration: 1.5,
      ease: 'elastic.out(1, 0.5)',
      onComplete: () => {
        gsap.to(prism.mesh.scale, {
          y: prism.originalHeight,
          duration: 1.0,
          ease: 'power2.out',
          onComplete: () => {
            prism.isAnimating = false;
          },
        });
      },
    });

    const hueShift = (Math.random() > 0.5 ? 1 : -1) * 180;
    prism.targetHue = (prism.currentHue + hueShift + 360) % 360;
    this.animatePrismColor(prism, prism.targetHue, 0.8);
  }

  private animatePrismColor(prism: PrismData, targetHue: number, duration: number): void {
    const startHue = prism.currentHue;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const hue = startHue + (targetHue - startHue) * eased;
      prism.currentHue = hue;

      const mat = prism.mesh.material as THREE.MeshPhongMaterial;
      mat.color.setHSL(hue / 360, 0.8, 0.6);
      mat.emissive.setHSL(hue / 360, 0.8, 0.3);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  private handleMouseClick(mouse: MouseState): void {
    const ray = this.sceneManager.getRayFromMouse();
    const rayOrigin = ray.origin;
    const rayDir = ray.direction;

    let closestPrism: PrismData | null = null;
    let closestDist = Infinity;

    for (const prism of this.prisms) {
      const worldPos = new THREE.Vector3();
      prism.mesh.getWorldPosition(worldPos);
      const toPrism = worldPos.clone().sub(rayOrigin);
      const projLen = toPrism.dot(rayDir);
      if (projLen < 0) continue;

      const closest = rayOrigin.clone().add(rayDir.clone().multiplyScalar(projLen));
      const dist = closest.distanceTo(worldPos);

      if (dist < INTERACTION_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestPrism = prism;
      }
    }

    if (closestPrism) {
      this.createBeam(closestPrism);
      this.audioManager.playNote(
        closestPrism.originalHeight,
        this.minHeight,
        this.maxHeight
      );
    }
  }

  private createBeam(prism: PrismData): void {
    if (prism.beam) {
      this.group.remove(prism.beam);
      prism.beam.geometry.dispose();
      (prism.beam.material as THREE.Material).dispose();
    }

    const beamGeo = new THREE.CylinderGeometry(1.5, 0.5, BEAM_LENGTH, 6, 1);
    beamGeo.translate(0, BEAM_LENGTH / 2, 0);

    const beamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(prism.currentHue / 360, 0.9, 0.8),
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(prism.mesh.position);

    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, prism.radialDir);
    beam.quaternion.copy(quat);

    this.group.add(beam);
    prism.beam = beam;
    prism.beamTimer = BEAM_LIFETIME;

    gsap.to(beamMat, {
      opacity: 0,
      duration: BEAM_LIFETIME,
      ease: 'power2.out',
      onComplete: () => {
        if (prism.beam === beam) {
          this.group.remove(beam);
          beam.geometry.dispose();
          beamMat.dispose();
          prism.beam = null;
        }
      },
    });
  }

  private handleSpacePress(): void {
    if (this.isExpanding) return;
    this.isExpanding = true;

    for (const prism of this.prisms) {
      const expanded = prism.basePosition.clone().add(
        prism.radialDir.clone().multiplyScalar(prism.basePosition.length() * 0.5)
      );

      gsap.to(prism.mesh.position, {
        x: expanded.x,
        y: expanded.y,
        z: expanded.z,
        duration: 0.5,
        ease: 'power2.out',
      });

      gsap.to(prism.mesh.position, {
        x: prism.basePosition.x,
        y: prism.basePosition.y,
        z: prism.basePosition.z,
        duration: 1.0,
        ease: 'elastic.out(1, 0.4)',
        delay: 0.5,
        onComplete: () => {
          this.isExpanding = false;
        },
      });
    }

    this.audioManager.playChord();
  }

  private createControlPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
      <style>
        #control-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #00000066;
          border-radius: 12px;
          padding: 16px 20px;
          color: #fff;
          font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
          font-size: 13px;
          z-index: 100;
          backdrop-filter: blur(8px);
          min-width: 200px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        #control-panel .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        #control-panel input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          outline: none;
        }
        #control-panel input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          cursor: pointer;
        }
        #control-panel select {
          background: rgba(255,255,255,0.15);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          outline: none;
          font-family: inherit;
        }
        #control-panel select option {
          background: #222;
          color: #fff;
        }
        #control-panel button {
          background: rgba(255,255,255,0.15);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 12px;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
        }
        #control-panel button:hover {
          background: #ffffff33;
        }
      </style>
      <div class="row"><span>自转速度</span><span id="speed-val">0.005</span></div>
      <input type="range" id="rotation-speed" min="0" max="0.02" step="0.001" value="0.005" />
      <div class="row">
        <span>随机闪烁</span>
        <button id="flicker-btn">关闭</button>
      </div>
      <div class="row">
        <span>色彩主题</span>
        <select id="color-theme">
          <option value="rainbow">彩虹</option>
          <option value="aurora">极光</option>
          <option value="flame">火焰</option>
        </select>
      </div>
    `;
    document.body.appendChild(panel);

    const speedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    const speedVal = document.getElementById('speed-val') as HTMLSpanElement;
    speedSlider.addEventListener('input', () => {
      this.rotationSpeed = parseFloat(speedSlider.value);
      speedVal.textContent = this.rotationSpeed.toFixed(3);
    });

    const flickerBtn = document.getElementById('flicker-btn') as HTMLButtonElement;
    flickerBtn.addEventListener('click', () => {
      this.flickerEnabled = !this.flickerEnabled;
      flickerBtn.textContent = this.flickerEnabled ? '开启' : '关闭';
      if (!this.flickerEnabled) {
        for (const prism of this.prisms) {
          const mat = prism.mesh.material as THREE.MeshPhongMaterial;
          mat.opacity = 1;
        }
      }
    });

    const themeSelect = document.getElementById('color-theme') as HTMLSelectElement;
    themeSelect.addEventListener('change', () => {
      this.colorTheme = themeSelect.value as ColorTheme;
      this.applyTheme(this.colorTheme);
    });
  }

  private applyTheme(theme: ColorTheme): void {
    const startTime = performance.now();
    const duration = 2000;

    const getTargetHue = (prism: PrismData): number => {
      switch (theme) {
        case 'rainbow':
          return prism.originalHue;
        case 'aurora': {
          const t = Math.random();
          if (t < 0.33) return 180 + Math.random() * 40;
          if (t < 0.66) return 140 + Math.random() * 40;
          return 270 + Math.random() * 40;
        }
        case 'flame': {
          return Math.random() * 60;
        }
      }
    };

    const startHues = this.prisms.map((p) => p.currentHue);
    const targetHues = this.prisms.map((p) => getTargetHue(p));

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      for (let i = 0; i < this.prisms.length; i++) {
        const prism = this.prisms[i];
        const hue = startHues[i] + (targetHues[i] - startHues[i]) * eased;
        prism.currentHue = hue;
        prism.targetHue = hue;

        const mat = prism.mesh.material as THREE.MeshPhongMaterial;
        mat.color.setHSL(hue / 360, 0.8, 0.6);
        mat.emissive.setHSL(hue / 360, 0.8, 0.3);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  update(delta: number): void {
    this.time += delta;

    this.group.rotation.y += this.rotationSpeed * delta * 60;

    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      prism.mesh.rotation.y += prism.rotationSpeed * delta * 60;

      if (!prism.isAnimating) {
        const breathScale = 1 + 0.05 * this.noise.noise3D(
          prism.noiseOffset + this.time * 0.3,
          prism.noiseOffset * 2 + this.time * 0.2,
          this.time * 0.1
        );
        prism.mesh.scale.y = prism.originalHeight * breathScale;
      }

      if (this.flickerEnabled) {
        const freq = this.flickerFreq.min + (i % 20) / 20 * (this.flickerFreq.max - this.flickerFreq.min);
        const flickerVal = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(this.time * freq * Math.PI * 2 + i * 0.5));
        const mat = prism.mesh.material as THREE.MeshPhongMaterial;
        mat.opacity = flickerVal;
      }
    }
  }

  dispose(): void {
    for (const prism of this.prisms) {
      prism.mesh.geometry.dispose();
      (prism.mesh.material as THREE.Material).dispose();
      if (prism.beam) {
        prism.beam.geometry.dispose();
        (prism.beam.material as THREE.Material).dispose();
      }
    }
    this.sceneManager.scene.remove(this.group);
  }
}
