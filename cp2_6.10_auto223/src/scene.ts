/**
 * 场景层 - Three.js渲染与交互
 * 负责创建场景、相机、渲染器，渲染海洋剖面、粒子系统、声波脉冲
 * 接收来自 ui.ts 的深度参数，调用 dataLayer.ts 获取数据
 * 回调 ui.ts 更新数据显示
 */

import * as THREE from 'three';
import { DataLayer, ParticleData, SpeciesInfo } from './dataLayer';

export interface SceneCallbacks {
  onDepthChange: (depth: number) => void;
  onShowSpeciesTooltip: (info: SpeciesInfo, x: number, y: number) => void;
  onHideSpeciesTooltip: () => void;
}

interface SoundPulse {
  mesh: THREE.Mesh;
  startTime: number;
  originY: number;
}

interface ParticleMesh {
  mesh: THREE.Mesh;
  data: ParticleData;
  baseScale: number;
  isHovered: boolean;
  isClicked: boolean;
  clickStartTime: number;
}

export class OceanScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dataLayer: DataLayer;
  private callbacks: SceneCallbacks;
  private container: HTMLElement;

  private oceanMesh!: THREE.Mesh;
  private gridLines: THREE.Line[] = [];
  private particleMeshes: ParticleMesh[] = [];
  private soundPulses: SoundPulse[] = [];
  private hydrothermalParticles: ParticleMesh[] = [];

  private targetDepth: number = 0;
  private cameraAnimating: boolean = false;
  private cameraAnimStartTime: number = 0;
  private cameraAnimDuration: number = 1000;
  private cameraStartY: number = 0;
  private cameraTargetY: number = 0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private animationFrameId: number = 0;
  private tooltipHideTimeout: number | null = null;

  constructor(containerId: string, dataLayer: DataLayer, callbacks: SceneCallbacks) {
    this.dataLayer = dataLayer;
    this.callbacks = callbacks;
    this.container = document.getElementById(containerId)!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1628);
    this.scene.fog = new THREE.Fog(0x0a1628, 5, 15);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.createOceanColumn();
    this.createGridLines();
    this.createParticles();
    this.addLights();
    this.setupEventListeners();
    this.buildDepthScale();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createOceanColumn(): void {
    const geometry = new THREE.BoxGeometry(6, 12, 3);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4a90d9) },
        bottomColor: { value: new THREE.Color(0x0a0a2e) },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vPosition;
        void main() {
          float t = (6.0 - vPosition.y) / 12.0;
          vec3 color = mix(topColor, bottomColor, t);
          gl_FragColor = vec4(color, 0.6);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.oceanMesh = new THREE.Mesh(geometry, material);
    this.oceanMesh.position.set(0, 0, 0);
    this.scene.add(this.oceanMesh);
  }

  private createGridLines(): void {
    for (let depth = 0; depth <= 11000; depth += 1000) {
      const y = this.dataLayer.depthToY(depth);
      const points = [
        new THREE.Vector3(-3.05, y, -1.55),
        new THREE.Vector3(3.05, y, -1.55),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        linewidth: 1,
      });
      const line = new THREE.Line(geometry, material);
      this.gridLines.push(line);
      this.scene.add(line);
    }
  }

  private createParticles(): void {
    this.clearParticles();
    const particles = this.dataLayer.generateParticlesForDepthRange(5500, 12000);

    particles.forEach((data) => {
      const geometry = new THREE.SphereGeometry(data.size, 8, 8);
      const color = new THREE.Color(data.color);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: data.brightness * 0.9,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(data.x, data.y, data.z);

      const particleMesh: ParticleMesh = {
        mesh,
        data,
        baseScale: 1,
        isHovered: false,
        isClicked: false,
        clickStartTime: 0,
      };

      this.particleMeshes.push(particleMesh);
      this.scene.add(mesh);

      if (data.isHydrothermal) {
        this.hydrothermalParticles.push(particleMesh);
      }
    });
  }

  private clearParticles(): void {
    this.particleMeshes.forEach((pm) => {
      this.scene.remove(pm.mesh);
      pm.mesh.geometry.dispose();
      (pm.mesh.material as THREE.Material).dispose();
    });
    this.particleMeshes = [];
    this.hydrothermalParticles = [];
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const topLight = new THREE.PointLight(0x88ccff, 0.8, 20);
    topLight.position.set(0, 6, 3);
    this.scene.add(topLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.particleMeshes.map((pm) => pm.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    let hoveredAny = false;
    this.particleMeshes.forEach((pm) => {
      if (!pm.isClicked) {
        pm.isHovered = false;
      }
    });

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const particleMesh = this.particleMeshes.find((pm) => pm.mesh === hitMesh);
      if (particleMesh) {
        particleMesh.isHovered = true;
        hoveredAny = true;
        this.renderer.domElement.style.cursor = 'pointer';
      }
    }

    if (!hoveredAny) {
      const allGridLines = this.gridLines.map((l) => l as unknown as THREE.Object3D);
      const gridIntersects = this.raycaster.intersectObjects(allGridLines, false);
      if (gridIntersects.length > 0) {
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.particleMeshes.map((pm) => pm.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const particleMesh = this.particleMeshes.find((pm) => pm.mesh === hitMesh);
      if (particleMesh) {
        particleMesh.isClicked = true;
        particleMesh.clickStartTime = performance.now();
        setTimeout(() => {
          particleMesh.isClicked = false;
        }, 200);

        if (this.tooltipHideTimeout) {
          window.clearTimeout(this.tooltipHideTimeout);
        }
        this.callbacks.onShowSpeciesTooltip(
          particleMesh.data.species,
          event.clientX,
          event.clientY
        );
        this.tooltipHideTimeout = window.setTimeout(() => {
          this.callbacks.onHideSpeciesTooltip();
        }, 3000);
        return;
      }
    }

    this.createSoundPulse(event);
  }

  private createSoundPulse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    const clampedY = Math.max(-6, Math.min(6, intersectPoint.y));

    const geometry = new THREE.SphereGeometry(0.05, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const pulseMesh = new THREE.Mesh(geometry, material);
    pulseMesh.position.set(intersectPoint.x, clampedY, 0);

    this.scene.add(pulseMesh);
    this.soundPulses.push({
      mesh: pulseMesh,
      startTime: performance.now(),
      originY: clampedY,
    });
  }

  private updateSoundPulses(currentTime: number): void {
    const speed = 0.5;
    const maxDuration = 4000;
    const soundProfile = this.dataLayer.getSoundSpeedProfile();

    this.soundPulses = this.soundPulses.filter((pulse) => {
      const elapsed = currentTime - pulse.startTime;
      if (elapsed >= maxDuration) {
        this.scene.remove(pulse.mesh);
        pulse.mesh.geometry.dispose();
        (pulse.mesh.material as THREE.Material).dispose();
        return false;
      }

      const t = elapsed / maxDuration;
      const baseRadius = speed * (elapsed / 1000);
      const opacity = 0.6 * (1 - t);

      pulse.mesh.scale.setScalar(baseRadius / 0.05);
      (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      const depthAtPulse = this.dataLayer.yToDepth(pulse.originY);
      const soundSpeedRatio = this.getSoundSpeedAtDepth(depthAtPulse, soundProfile) / 1500;
      const deformation = 1 + (1 - soundSpeedRatio) * 0.3 * Math.sin(t * Math.PI * 4);
      pulse.mesh.scale.set(
        (baseRadius / 0.05) * deformation,
        (baseRadius / 0.05) * (2 - deformation),
        baseRadius / 0.05
      );

      return true;
    });
  }

  private getSoundSpeedAtDepth(depth: number, profile: number[]): number {
    const index = Math.min(
      Math.floor(Math.max(0, depth) / 200),
      profile.length - 1
    );
    return profile[index];
  }

  private updateParticles(currentTime: number): void {
    const time = currentTime / 1000;

    this.particleMeshes.forEach((pm) => {
      let targetScale = pm.baseScale;

      if (pm.isHovered) {
        targetScale *= 1.15;
      }

      if (pm.isClicked) {
        const clickElapsed = currentTime - pm.clickStartTime;
        const clickT = clickElapsed / 200;
        const pulse = 1 + 0.1 * Math.sin(clickT * Math.PI);
        targetScale *= pulse;
      }

      const currentScale = pm.mesh.scale.x;
      pm.mesh.scale.setScalar(currentScale + (targetScale - currentScale) * 0.2);

      if (pm.data.isHydrothermal) {
        const pulseIntensity = 0.8 + 0.4 * Math.sin(time * 3 + pm.data.id * 0.5);
        (pm.mesh.material as THREE.MeshBasicMaterial).opacity =
          0.7 * pulseIntensity;
        pm.mesh.position.y =
          pm.data.y + Math.sin(time * 2 + pm.data.id * 0.3) * 0.05;
      } else {
        pm.mesh.position.y = pm.data.y + Math.sin(time + pm.data.id * 0.2) * 0.02;
      }
    });
  }

  private updateCamera(currentTime: number): void {
    if (this.cameraAnimating) {
      const elapsed = currentTime - this.cameraAnimStartTime;
      const t = Math.min(elapsed / this.cameraAnimDuration, 1);
      const easedT = this.easeInOutCubic(t);

      const y = this.cameraStartY + (this.cameraTargetY - this.cameraStartY) * easedT;
      this.camera.position.y = y;
      this.camera.lookAt(0, y, 0);

      const currentDepth = this.dataLayer.yToDepth(y);
      this.callbacks.onDepthChange(currentDepth);

      if (t >= 1) {
        this.cameraAnimating = false;
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private buildDepthScale(): void {
    const container = document.getElementById('scale-container');
    if (!container) return;
    container.innerHTML = '';

    for (let depth = 0; depth <= 11000; depth += 1000) {
      const tick = document.createElement('div');
      const percent = (depth / 11000) * 100;
      tick.className = 'tick';
      tick.style.top = `${percent}%`;
      tick.innerHTML = `
        <div class="tick-line"></div>
        <div class="tick-label">${depth}m</div>
      `;
      container.appendChild(tick);
    }

    for (let depth = 500; depth < 11000; depth += 1000) {
      const tick = document.createElement('div');
      const percent = (depth / 11000) * 100;
      tick.className = 'tick minor-tick';
      tick.style.top = `${percent}%`;
      tick.innerHTML = `
        <div class="tick-line"></div>
        <div class="tick-label"></div>
      `;
      container.appendChild(tick);
    }
  }

  public setDepth(depth: number): void {
    this.targetDepth = Math.max(0, Math.min(11000, depth));
    this.cameraAnimating = true;
    this.cameraAnimStartTime = performance.now();
    this.cameraStartY = this.camera.position.y;
    this.cameraTargetY = this.dataLayer.depthToY(this.targetDepth);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const currentTime = performance.now();

    this.updateCamera(currentTime);
    this.updateParticles(currentTime);
    this.updateSoundPulses(currentTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    if (this.tooltipHideTimeout) {
      window.clearTimeout(this.tooltipHideTimeout);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.clearParticles();
    this.soundPulses.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.gridLines.forEach((l) => {
      this.scene.remove(l);
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
