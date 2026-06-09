import * as THREE from 'three';
import type { ParticleSystemState } from './particleSystem';

export class SceneRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private shellMesh: THREE.LineSegments;
  private glowMeshes: THREE.Mesh[] = [];
  private container: HTMLElement;

  private static readonly SPHERE_RADIUS = 10;
  private static readonly MAX_PARTICLES = 10000;

  constructor(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 22);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight, false);
    this.renderer.setClearColor(0x000000, 1);

    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(SceneRenderer.MAX_PARTICLES * 3);
    const colors = new Float32Array(SceneRenderer.MAX_PARTICLES * 3);
    const sizes = new Float32Array(SceneRenderer.MAX_PARTICLES);
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setDrawRange(0, SceneRenderer.MAX_PARTICLES);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);

    this.shellMesh = this.createShell();
    this.scene.add(this.shellMesh);

    this.glowMeshes = [this.createGlow(), this.createGlow()];
    for (const glow of this.glowMeshes) {
      glow.visible = false;
      this.scene.add(glow);
    }

    window.addEventListener('resize', this.handleResize);
  }

  private createShell(): THREE.LineSegments {
    const geometry = new THREE.SphereGeometry(SceneRenderer.SPHERE_RADIUS, 32, 24);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.15
    });
    geometry.dispose();
    return new THREE.LineSegments(edges, material);
  }

  private createGlow(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 64;
    gradientCanvas.height = 64;
    const ctx = gradientCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(150, 200, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(100, 170, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(80, 140, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(gradientCanvas);
    material.map = texture;
    material.color.set(0xffffff);
    return mesh;
  }

  private handleResize = (): void => {
    const width = Math.max(800, this.container.clientWidth);
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  render(state: ParticleSystemState): void {
    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute;

    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;
    const sizeArr = sizeAttr.array as Float32Array;

    const count = state.activeCount * 3;
    for (let i = 0; i < count; i++) {
      posArr[i] = state.positionArray[i];
      colArr[i] = state.colorArray[i];
    }
    for (let i = 0; i < state.activeCount; i++) {
      sizeArr[i] = state.sizeArray[i];
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, state.activeCount);
    this.particleGeometry.computeBoundingSphere();

    for (let i = 0; i < 2; i++) {
      const glowState = state.glowPositions[i];
      const mesh = this.glowMeshes[i];
      if (glowState && glowState.active) {
        mesh.visible = true;
        mesh.position.set(glowState.x, glowState.y, glowState.z);
        mesh.lookAt(this.camera.position);
        const scale = 2 + Math.sin(performance.now() * 0.003) * 0.3;
        mesh.scale.set(scale, scale, scale);
      } else {
        mesh.visible = false;
      }
    }

    this.camera.position.x = Math.sin(state.rotationY * 0.3) * 2;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    (this.shellMesh.geometry as THREE.BufferGeometry).dispose();
    (this.shellMesh.material as THREE.Material).dispose();
    for (const glow of this.glowMeshes) {
      (glow.geometry as THREE.BufferGeometry).dispose();
      (glow.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }
}
