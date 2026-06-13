import * as THREE from 'three';
import gsap from 'gsap';

const LENS_COLORS = [
  '#f72585', '#7209b7', '#3a0ca3', '#4361ee',
  '#4cc9f0', '#e63946', '#f77f00', '#7209b7',
];

const SPHERE_POSITIONS = [
  [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
  [1, 1, -1], [1, -1, 1], [-1, 1, 1], [-1, -1, -1],
].map(p => {
  const len = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
  return new THREE.Vector3(p[0] / len, p[1] / len, p[2] / len);
});

interface LensData {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  beam: THREE.Mesh;
  color: THREE.Color;
  originalScale: THREE.Vector3;
}

export class LensArray {
  group: THREE.Group;
  lenses: LensData[] = [];
  centerGlow: THREE.Mesh;
  private sphereRadius: number;
  private rotX = 0;
  private rotY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private currentScale = 1;
  private targetScale = 1;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private isIdle = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private selfRotSpeed = 0;
  private pulseTime = 0;

  constructor(viewportHeight: number) {
    this.group = new THREE.Group();
    this.sphereRadius = Math.max(350, viewportHeight * 0.55) * 0.5;

    this.centerGlow = this.createCenterGlow();
    this.group.add(this.centerGlow);

    for (let i = 0; i < 8; i++) {
      const lens = this.createLens(i);
      this.lenses.push(lens);
      this.group.add(lens.mesh);
      this.group.add(lens.edges);
      this.group.add(lens.beam);
    }

    this.setupInteraction();
  }

  private createLensGeometry(): THREE.BufferGeometry {
    const h = 0.7;
    const w = 0.5;
    const d = 0.5;

    const top = [0, h, 0];
    const bottom = [0, -h, 0];
    const front = [0, 0, d];
    const back = [0, 0, -d];
    const left = [-w, 0, 0];
    const right = [w, 0, 0];

    const vertices = new Float32Array([
      ...top, ...front, ...right,
      ...top, ...right, ...back,
      ...top, ...back, ...left,
      ...top, ...left, ...front,
      ...bottom, ...right, ...front,
      ...bottom, ...back, ...right,
      ...bottom, ...left, ...back,
      ...bottom, ...front, ...left,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private createLens(index: number): LensData {
    const size = 30 + Math.random() * 15;
    const geometry = this.createLensGeometry();
    const color = new THREE.Color(LENS_COLORS[index]);

    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      emissive: color.clone().multiplyScalar(0.3),
      shininess: 100,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const pos = SPHERE_POSITIONS[index].clone().multiplyScalar(this.sphereRadius * 0.5);
    mesh.position.copy(pos);
    mesh.scale.setScalar(size / 35);
    mesh.lookAt(0, 0, 0);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: color.clone().multiplyScalar(1.5),
      transparent: true,
      opacity: 0.8,
      linewidth: 1,
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.position.copy(pos);
    edges.scale.copy(mesh.scale);
    edges.rotation.copy(mesh.rotation);
    edges.lookAt(0, 0, 0);

    const beamGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 4);
    beamGeometry.rotateX(Math.PI / 2);
    beamGeometry.translate(0, 0, 0.5);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: color.clone().multiplyScalar(2),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.copy(pos);
    beam.lookAt(0, 0, 0);

    const dist = pos.length();
    beam.scale.set(1, 1, dist);

    return {
      mesh,
      edges,
      beam,
      color,
      originalScale: mesh.scale.clone(),
    };
  }

  private createCenterGlow(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(16, 32, 32);
    const mixedColor = new THREE.Color(0, 0, 0);
    LENS_COLORS.forEach(c => {
      mixedColor.add(new THREE.Color(c));
    });
    mixedColor.multiplyScalar(1 / LENS_COLORS.length);

    const material = new THREE.MeshBasicMaterial({
      color: mixedColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Mesh(geometry, material);
  }

  private setupInteraction(): void {
    const canvas = document.getElementById('scene') as HTMLCanvasElement;
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.isIdle = false;
      this.selfRotSpeed = 0;
      if (this.idleTimer) clearTimeout(this.idleTimer);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.targetRotY += dx * 0.005;
      this.targetRotX += dy * 0.005;
      this.targetRotX = Math.max(-75 * Math.PI / 180, Math.min(75 * Math.PI / 180, this.targetRotX));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.startIdleTimer();
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetScale += e.deltaY * -0.001;
      this.targetScale = Math.max(0.5, Math.min(3, this.targetScale));
    }, { passive: false });
  }

  private startIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.isIdle = true;
    }, 2000);
  }

  updateRotation(delta: number): void {
    if (this.isIdle) {
      this.selfRotSpeed = Math.min(this.selfRotSpeed + delta * 0.1, 0.3);
      this.targetRotY += this.selfRotSpeed * delta;
    }

    this.rotX += (this.targetRotX - this.rotX) * Math.min(1, delta * 10);
    this.rotY += (this.targetRotY - this.rotY) * Math.min(1, delta * 10);
    this.currentScale += (this.targetScale - this.currentScale) * Math.min(1, delta * 8);

    this.group.rotation.x = this.rotX;
    this.group.rotation.y = this.rotY;
    this.group.scale.setScalar(this.currentScale);

    this.pulseTime += delta;
    const pulse = Math.sin(this.pulseTime * (2 * Math.PI / 1.5));
    const glowScale = 12 + pulse * 4;
    this.centerGlow.scale.setScalar(glowScale / 16);
    this.centerGlow.material.opacity = 0.3 + pulse * 0.05;

    const camera = (this.group as any)._cameraRef as THREE.PerspectiveCamera | undefined;

    for (let i = 0; i < this.lenses.length; i++) {
      const lens = this.lenses[i];

      const beamOpacity = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(this.pulseTime * 2 + i * 0.8));
      (lens.beam.material as THREE.MeshBasicMaterial).opacity = beamOpacity;

      const beamLength = this.sphereRadius * 0.5 * this.currentScale;
      lens.beam.scale.set(1, 1, beamLength);

      const flickerAmount = Math.abs(this.currentScale - this.targetScale) > 0.01 ? 0.15 : 0;
      const edgeOpacity = 0.8 + flickerAmount * Math.sin(this.pulseTime * 20 + i);
      (lens.edges.material as THREE.LineBasicMaterial).opacity = Math.max(0.4, Math.min(1, edgeOpacity));

      if (camera) {
        const worldPos = new THREE.Vector3();
        lens.mesh.getWorldPosition(worldPos);
        const viewDir = camera.position.clone().sub(worldPos).normalize();
        const lensNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(lens.mesh.quaternion);
        const angle = Math.abs(viewDir.dot(lensNormal));
        (lens.mesh.material as THREE.MeshPhongMaterial).opacity = 0.25 + angle * 0.35;
      }
    }
  }

  triggerExplosion(index: number, onSpawn: (pos: THREE.Vector3, color: THREE.Color) => void): void {
    if (index < 0 || index >= this.lenses.length) return;
    const lens = this.lenses[index];

    gsap.to(lens.mesh.scale, {
      x: lens.originalScale.x * 1.5,
      y: lens.originalScale.y * 1.5,
      z: lens.originalScale.z * 1.5,
      duration: 0.2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });

    gsap.to(lens.edges.scale, {
      x: lens.originalScale.x * 1.5,
      y: lens.originalScale.y * 1.5,
      z: lens.originalScale.z * 1.5,
      duration: 0.2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });

    const worldPos = new THREE.Vector3();
    lens.mesh.getWorldPosition(worldPos);
    onSpawn(worldPos, lens.color.clone());
  }

  getLensAtMouse(mouse: THREE.Vector2, camera: THREE.PerspectiveCamera): number {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    for (let i = 0; i < this.lenses.length; i++) {
      const intersects = raycaster.intersectObject(this.lenses[i].mesh);
      if (intersects.length > 0) return i;
    }
    return -1;
  }

  setCameraRef(camera: THREE.PerspectiveCamera): void {
    (this.group as any)._cameraRef = camera;
  }

  dispose(): void {
    this.lenses.forEach(lens => {
      lens.mesh.geometry.dispose();
      (lens.mesh.material as THREE.Material).dispose();
      lens.edges.geometry.dispose();
      (lens.edges.material as THREE.Material).dispose();
      lens.beam.geometry.dispose();
      (lens.beam.material as THREE.Material).dispose();
    });
    this.centerGlow.geometry.dispose();
    (this.centerGlow.material as THREE.Material).dispose();
  }
}
