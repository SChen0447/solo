import * as THREE from 'three';
import { SandSystem } from './sandSystem';

interface Pyramid {
  mesh: THREE.Group;
  position: THREE.Vector3;
  tablet: THREE.Mesh | null;
  tabletRevealed: boolean;
}

interface FountainParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class RuinsSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private sandSystem: SandSystem;
  private pyramids: Pyramid[] = [];
  private tabletClickCallbacks: (() => void)[] = [];
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private fountainParticles: FountainParticle[] = [];
  private fountainGeometry!: THREE.BufferGeometry;
  private fountainMaterial!: THREE.PointsMaterial;
  private fountainMesh!: THREE.Points;
  private MAX_FOUNTAIN_PARTICLES = 500;
  private highlighted: boolean = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, sandSystem: SandSystem) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.sandSystem = sandSystem;
  }

  init(): void {
    this.createPyramids();
    this.createFountainParticles();
    this.bindEvents();
  }

  private createPyramids(): void {
    const pyramidCount = 5 + Math.floor(Math.random() * 4);
    const usedPositions: THREE.Vector3[] = [];

    for (let i = 0; i < pyramidCount; i++) {
      let position: THREE.Vector3;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 50) {
        position = new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          0,
          (Math.random() - 0.5) * 30
        );
        valid = usedPositions.every(p => p.distanceTo(position) > 6);
        attempts++;
      }

      if (!valid!) continue;
      usedPositions.push(position!);

      const pyramid = this.createPyramid(position!);
      this.pyramids.push({
        mesh: pyramid,
        position: position!,
        tablet: null,
        tabletRevealed: false
      });
      this.scene.add(pyramid);
    }
  }

  private createPyramid(position: THREE.Vector3): THREE.Group {
    const group = new THREE.Group();
    const radius = 2;
    const height = 4;

    const geometry = new THREE.ConeGeometry(radius, height, 4);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd2b48c,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });

    const pyramid = new THREE.Mesh(geometry, material);
    pyramid.castShadow = true;
    pyramid.receiveShadow = true;

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const baseColor = new THREE.Color(0xd2b48c);

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const noise = (Math.random() - 0.5) * 0.1;
      const color = baseColor.clone();
      const orangeTint = new THREE.Color(0xff8c00);
      color.lerp(orangeTint, 0.2 + (y / height) * 0.3 + noise);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    material.vertexColors = true;

    const groundY = this.sandSystem.getHeightAt(position.x, position.z);
    pyramid.position.y = groundY + height / 2;
    pyramid.rotation.y = Math.random() * Math.PI * 2;

    group.add(pyramid);
    group.position.copy(position);

    return group;
  }

  private createFountainParticles(): void {
    this.fountainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.MAX_FOUNTAIN_PARTICLES * 3);
    this.fountainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.fountainMaterial = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.1,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fountainMesh = new THREE.Points(this.fountainGeometry, this.fountainMaterial);
    this.scene.add(this.fountainMesh);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', (event) => this.onClick(event));
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const tablets: THREE.Mesh[] = [];
    this.pyramids.forEach(p => {
      if (p.tablet && p.tabletRevealed) {
        tablets.push(p.tablet);
      }
    });

    const intersects = this.raycaster.intersectObjects(tablets);
    if (intersects.length > 0) {
      const tablet = intersects[0].object as THREE.Mesh;
      this.onTabletClick(tablet);
    }
  }

  private onTabletClick(tablet: THREE.Mesh): void {
    this.sandSystem.triggerShake(0.2, 0.1);
    this.spawnFountain(tablet.position);
    this.tabletClickCallbacks.forEach(cb => cb());
  }

  revealRandomTablet(): void {
    const unrevealed = this.pyramids.filter(p => !p.tabletRevealed);
    if (unrevealed.length === 0) {
      this.pyramids.forEach(p => {
        if (p.tablet) {
          p.tabletRevealed = true;
          p.tablet.visible = true;
        }
      });
      return;
    }

    const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];

    if (!target.tablet) {
      const tabletGeometry = new THREE.PlaneGeometry(1.5, 1.5);
      const tabletMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff7f,
        emissive: 0x00ff7f,
        emissiveIntensity: 1.5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });

      const tablet = new THREE.Mesh(tabletGeometry, tabletMaterial);
      const pyramidMesh = target.mesh.children[0] as THREE.Mesh;
      const height = 4;
      tablet.position.set(
        target.position.x,
        pyramidMesh.position.y - height / 2 + 1.5,
        target.position.z + 1.5
      );
      tablet.lookAt(0, tablet.position.y, 0);
      tablet.visible = false;

      target.tablet = tablet;
      this.scene.add(tablet);
    }

    target.tabletRevealed = true;
    target.tablet.visible = true;

    if (this.highlighted) {
      this.applyHighlight(target.tablet, true);
    }
  }

  highlightTablets(active: boolean): void {
    this.highlighted = active;
    this.pyramids.forEach(p => {
      if (p.tablet && p.tabletRevealed) {
        this.applyHighlight(p.tablet, active);
      }
    });
  }

  private applyHighlight(tablet: THREE.Mesh, active: boolean): void {
    const mat = tablet.material as THREE.MeshStandardMaterial;
    if (active) {
      mat.emissiveIntensity = 3;
      mat.color.setHex(0x00ffff);
      mat.emissive.setHex(0x00ffff);
    } else {
      mat.emissiveIntensity = 1.5;
      mat.color.setHex(0x00ff7f);
      mat.emissive.setHex(0x00ff7f);
    }
  }

  onTabletClick(callback: () => void): void {
    this.tabletClickCallbacks.push(callback);
  }

  private spawnFountain(origin: THREE.Vector3): void {
    for (let i = 0; i < 50; i++) {
      if (this.fountainParticles.length >= this.MAX_FOUNTAIN_PARTICLES) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const verticalSpeed = 3 + Math.random() * 2;

      this.fountainParticles.push({
        position: origin.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * 0.5,
          verticalSpeed,
          Math.sin(angle) * speed * 0.5
        ),
        life: 0,
        maxLife: 2
      });
    }
  }

  update(delta: number): void {
    this.pyramids.forEach(p => {
      if (p.tablet && p.tabletRevealed) {
        const mat = p.tablet.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1.5 + Math.sin(Date.now() * 0.003) * 0.3;
      }
    });

    this.updateFountain(delta);
  }

  private updateFountain(delta: number): void {
    const positions = this.fountainGeometry.attributes.position.array as Float32Array;

    for (let i = this.fountainParticles.length - 1; i >= 0; i--) {
      const p = this.fountainParticles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.fountainParticles.splice(i, 1);
        continue;
      }

      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.y -= delta * 4;
    }

    const count = Math.min(this.fountainParticles.length, this.MAX_FOUNTAIN_PARTICLES);
    for (let i = 0; i < count; i++) {
      const p = this.fountainParticles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
    }

    this.fountainGeometry.attributes.position.needsUpdate = true;
    this.fountainGeometry.setDrawRange(0, count);

    this.fountainMaterial.opacity = count > 0 ? 0.9 : 0;
    this.fountainMaterial.size = 0.08 + Math.sin(Date.now() * 0.01) * 0.02;
  }
}
