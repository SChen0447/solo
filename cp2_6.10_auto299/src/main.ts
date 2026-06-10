import * as THREE from 'three';
import { ParticleEmitter, ParticleData } from './ParticleEmitter';
import { ForceField, ForceFieldType } from './ForceField';
import { InteractionManager } from './InteractionManager';
import './style.css';

class ParticleSandbox {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock!: THREE.Clock;

  private emitter!: ParticleEmitter;
  private forceFields: ForceField[] = [];
  private interaction!: InteractionManager;

  private connectionLines: THREE.LineSegments | null = null;
  private connectionGeom: THREE.BufferGeometry | null = null;
  private trailLines: Map<ParticleData, THREE.Line> = new Map();
  private boundaryMesh!: THREE.Mesh;

  private gravityStrength: number = 1;
  private connectionThreshold: number = 2;
  private showForceFields: boolean = true;

  private fpsCounter: HTMLElement;
  private frames: number = 0;
  private fpsTime: number = 0;

  private cameraAngle: number = 0;
  private cameraHeight: number = 12;
  private cameraDistance: number = 25;

  constructor() {
    this.fpsCounter = document.getElementById('fps-counter')!;

    this.initScene();
    this.initBoundary();
    this.initLighting();

    this.emitter = new ParticleEmitter(
      this.scene,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      Math.PI * 2,
      2,
      8
    );
    this.emitter.emit(500);

    this.interaction = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.emitter,
      this.forceFields,
      {
        onAddForceField: (pos, type) => this.addForceField(pos, type),
        onUpdateGravityStrength: (v) => { this.gravityStrength = v; },
        onRemoveForceField: (ff) => this.removeForceField(ff),
      }
    );

    this.initConnectionLines();
    this.setupControls();

    this.clock = new THREE.Clock();
    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 12, 25);
    this.camera.lookAt(0, 0, 0);

    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
  }

  private initBoundary(): void {
    const geo = new THREE.SphereGeometry(15, 64, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
      wireframe: false,
    });
    this.boundaryMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.boundaryMesh);

    const wireGeo = new THREE.SphereGeometry(15, 32, 32);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.scene.add(wireMesh);
  }

  private initLighting(): void {
    const ambient = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 1, 50);
    pointLight1.position.set(10, 5, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff0066, 0.8, 50);
    pointLight2.position.set(-10, -3, -8);
    this.scene.add(pointLight2);
  }

  private initConnectionLines(): void {
    this.connectionGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(2000 * 6);
    const colors = new Float32Array(2000 * 6);
    this.connectionGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.connectionGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.connectionLines = new THREE.LineSegments(this.connectionGeom, mat);
    this.connectionLines.visible = false;
    this.scene.add(this.connectionLines);
  }

  private addForceField(position: THREE.Vector3, type: ForceFieldType): void {
    const strength = type === 'attract' ? 5 : -5;
    const ff = new ForceField(this.scene, position, type, strength, 5);
    ff.setVisible(this.showForceFields);
    this.forceFields.push(ff);
  }

  private removeForceField(ff: ForceField): void {
    const idx = this.forceFields.indexOf(ff);
    if (idx > -1) {
      this.forceFields.splice(idx, 1);
      ff.dispose();
    }
  }

  private setupControls(): void {
    const countSlider = document.getElementById('particle-count') as HTMLInputElement;
    const countValue = document.getElementById('particle-count-value') as HTMLElement;
    countSlider.addEventListener('input', () => {
      const val = parseInt(countSlider.value);
      countValue.textContent = val.toString();
      this.emitter.resizeToCount(val);
    });

    const rateSlider = document.getElementById('emit-rate') as HTMLInputElement;
    const rateValue = document.getElementById('emit-rate-value') as HTMLElement;
    rateSlider.addEventListener('input', () => {
      const val = parseInt(rateSlider.value);
      rateValue.textContent = val.toString();
      this.emitter.setEmitRate(val);
    });

    const gravitySlider = document.getElementById('gravity') as HTMLInputElement;
    const gravityValue = document.getElementById('gravity-value') as HTMLElement;
    gravitySlider.addEventListener('input', () => {
      const val = parseFloat(gravitySlider.value);
      gravityValue.textContent = val.toFixed(1);
      this.gravityStrength = val;
    });

    const scaleSlider = document.getElementById('particle-scale') as HTMLInputElement;
    const scaleValue = document.getElementById('particle-scale-value') as HTMLElement;
    scaleSlider.addEventListener('input', () => {
      const val = parseFloat(scaleSlider.value);
      scaleValue.textContent = val.toFixed(1);
      this.emitter.setParticleScale(val);
    });

    const connSlider = document.getElementById('connection-threshold') as HTMLInputElement;
    const connValue = document.getElementById('connection-threshold-value') as HTMLElement;
    connSlider.addEventListener('input', () => {
      const val = parseFloat(connSlider.value);
      connValue.textContent = val.toFixed(1);
      this.connectionThreshold = val;
    });

    const showFF = document.getElementById('show-forcefields') as HTMLInputElement;
    showFF.addEventListener('change', () => {
      this.showForceFields = showFF.checked;
      this.forceFields.forEach((ff) => ff.setVisible(this.showForceFields));
    });

    const showTrails = document.getElementById('show-trails') as HTMLInputElement;
    showTrails.addEventListener('change', () => {
      this.interaction.setTrailMode(showTrails.checked);
    });

    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.resetScene();
    });
  }

  private resetScene(): void {
    for (const ff of this.forceFields) {
      ff.dispose();
    }
    this.forceFields.length = 0;

    this.trailLines.forEach((line) => {
      this.scene.remove(line);
      (line.geometry as THREE.BufferGeometry).dispose();
      (line.material as THREE.Material).dispose();
    });
    this.trailLines.clear();

    this.emitter.reset();
    this.emitter.emit(500);

    (document.getElementById('particle-count') as HTMLInputElement).value = '500';
    (document.getElementById('particle-count-value') as HTMLElement).textContent = '500';
  }

  private computeConnections(): void {
    const particles = this.emitter.getParticles();
    if (particles.length < 2 || !this.connectionGeom || !this.connectionLines) {
      if (this.connectionLines) this.connectionLines.visible = false;
      return;
    }

    const cellSize = this.connectionThreshold;
    const grid: Map<string, ParticleData[]> = new Map();

    for (const p of particles) {
      const cx = Math.floor(p.mesh.position.x / cellSize);
      const cy = Math.floor(p.mesh.position.y / cellSize);
      const cz = Math.floor(p.mesh.position.z / cellSize);
      const key = `${cx},${cy},${cz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(p);
    }

    const posAttr = this.connectionGeom.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.connectionGeom.getAttribute('color') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    let lineIdx = 0;
    const maxLines = Math.floor(posArr.length / 6);
    const thresholdSq = this.connectionThreshold * this.connectionThreshold;
    const checked = new Set<string>();

    for (const p of particles) {
      const cx = Math.floor(p.mesh.position.x / cellSize);
      const cy = Math.floor(p.mesh.position.y / cellSize);
      const cz = Math.floor(p.mesh.position.z / cellSize);

      for (let dx = -1; dx <= 1 && lineIdx < maxLines; dx++) {
        for (let dy = -1; dy <= 1 && lineIdx < maxLines; dy++) {
          for (let dz = -1; dz <= 1 && lineIdx < maxLines; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const cell = grid.get(key);
            if (!cell) continue;

            for (const q of cell) {
              if (p === q) continue;
              const pairKey = p.mesh.id < q.mesh.id ? `${p.mesh.id}-${q.mesh.id}` : `${q.mesh.id}-${p.mesh.id}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              const distSq = p.mesh.position.distanceToSquared(q.mesh.position);
              if (distSq < thresholdSq) {
                const dist = Math.sqrt(distSq);
                const alpha = 1 - dist / this.connectionThreshold;

                const oi = lineIdx * 6;
                posArr[oi] = p.mesh.position.x;
                posArr[oi + 1] = p.mesh.position.y;
                posArr[oi + 2] = p.mesh.position.z;
                posArr[oi + 3] = q.mesh.position.x;
                posArr[oi + 4] = q.mesh.position.y;
                posArr[oi + 5] = q.mesh.position.z;

                const mixR = (p.color.r + q.color.r) * 0.5 * alpha;
                const mixG = (p.color.g + q.color.g) * 0.5 * alpha;
                const mixB = (p.color.b + q.color.b) * 0.5 * alpha;
                colArr[oi] = mixR;
                colArr[oi + 1] = mixG;
                colArr[oi + 2] = mixB;
                colArr[oi + 3] = mixR * 0.9;
                colArr[oi + 4] = mixG * 0.9;
                colArr[oi + 5] = mixB * 0.9;

                lineIdx++;
              }
            }
          }
        }
      }
    }

    for (let i = lineIdx * 6; i < posArr.length; i++) {
      posArr[i] = 0;
      colArr[i] = 0;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.connectionGeom!.setDrawRange(0, lineIdx * 2);
    this.connectionLines!.visible = lineIdx > 0;
  }

  private updateTrails(): void {
    const particles = this.emitter.getParticles();
    const record = this.interaction.isTrailMode();

    if (!record) {
      for (const line of this.trailLines.values()) {
        line.visible = false;
      }
      return;
    }

    for (const p of particles) {
      if (p.trail.length < 2) {
        const line = this.trailLines.get(p);
        if (line) line.visible = false;
        continue;
      }

      let line = this.trailLines.get(p);
      if (!line) {
        const trailGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(150);
        const colors = new Float32Array(150);
        trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const trailMat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        line = new THREE.Line(trailGeo, trailMat);
        this.trailLines.set(p, line);
        this.scene.add(line);
      }

      line.visible = true;
      const trailGeo = line.geometry as THREE.BufferGeometry;
      const posAttr = trailGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = trailGeo.getAttribute('color') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const colArr = colAttr.array as Float32Array;

      const n = p.trail.length;
      for (let i = 0; i < n && i < 50; i++) {
        const t = p.trail[i];
        const idx = i * 3;
        posArr[idx] = t.x;
        posArr[idx + 1] = t.y;
        posArr[idx + 2] = t.z;

        const alpha = i / Math.max(1, n - 1);
        colArr[idx] = p.color.r * (0.2 + alpha * 0.8);
        colArr[idx + 1] = p.color.g * (0.2 + alpha * 0.8);
        colArr[idx + 2] = p.color.b * (0.2 + alpha * 0.8);
      }

      trailGeo.setDrawRange(0, n);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  }

  private updateCamera(delta: number): void {
    this.cameraAngle += delta * 0.05;
    const x = Math.sin(this.cameraAngle) * this.cameraDistance;
    const z = Math.cos(this.cameraAngle) * this.cameraDistance;
    this.camera.position.set(x, this.cameraHeight, z);
    this.camera.lookAt(0, 0, 0);
  }

  private updateFPS(delta: number): void {
    this.frames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.frames / this.fpsTime);
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frames = 0;
      this.fpsTime = 0;
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.updateCamera(delta);

    const ffData = this.forceFields.map((ff) => ({
      position: ff.position,
      strength: ff.strength,
      radius: ff.radius,
      type: ff.type,
    }));

    this.emitter.update(delta, ffData, this.gravityStrength, this.interaction.isTrailMode());

    for (const ff of this.forceFields) {
      ff.update(delta);
    }

    if (this.interaction.isConnectionsMode()) {
      this.computeConnections();
    } else if (this.connectionLines) {
      this.connectionLines.visible = false;
    }

    this.updateTrails();
    this.updateFPS(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ParticleSandbox();
});
