import * as THREE from 'three';
import { gsap } from 'gsap';
import { RainForest } from './RainForest';

interface RippleEffect {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  maxRadius: number;
}

interface HighlightEffect {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  target: THREE.Object3D;
}

interface ButterflyParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  duration: number;
  phase: number;
}

interface InfoLabel {
  element: HTMLDivElement;
  startTime: number;
  duration: number;
  screenPosition: { x: number; y: number };
}

export class BiomeInteraction {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private rainForest: RainForest;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private ripples: RippleEffect[] = [];
  private highlights: HighlightEffect[] = [];
  private butterflyParticles: ButterflyParticle[] = [];
  private infoLabels: InfoLabel[] = [];

  private hoveredObject: THREE.Object3D | null = null;
  private canvasRect: DOMRect | null = null;

  private monkeyAnimations: Map<THREE.Group, { startTime: number; duration: number; baseY: number; baseRot: number }> = new Map();
  private eagleAnimations: Map<THREE.Group, { startTime: number; duration: number; basePos: THREE.Vector3; phase: number }> = new Map();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    rainForest: RainForest
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.rainForest = rainForest;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.updateCanvasRect();
  }

  private updateCanvasRect(): void {
    this.canvasRect = this.renderer.domElement.getBoundingClientRect();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.updateCanvasRect());

    this.renderer.domElement.addEventListener('click', (e) => this.handleClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.handleHover(e));
  }

  private updateMouse(event: MouseEvent): void {
    if (!this.canvasRect) return;

    this.mouse.x = ((event.clientX - this.canvasRect.left) / this.canvasRect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - this.canvasRect.top) / this.canvasRect.height) * 2 + 1;
  }

  private handleClick(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.rainForest.getInteractiveObjects(), true);

    if (intersects.length > 0) {
      let targetObject = intersects[0].object;
      while (targetObject.parent && !targetObject.userData.type) {
        targetObject = targetObject.parent;
      }

      if (targetObject.userData.type) {
        const worldPos = new THREE.Vector3();
        targetObject.getWorldPosition(worldPos);

        this.createHighlight(targetObject);
        this.createRipple(worldPos);
        this.showInfoLabel(
          event.clientX,
          event.clientY,
          `${targetObject.userData.name}: ${targetObject.userData.info}`
        );
        this.triggerLayerEffect(targetObject.userData.layerIndex, worldPos, targetObject);
      }
    } else {
      const groundIntersect = this.raycaster.intersectObject(
        this.scene.children.find((c) => c instanceof THREE.Mesh && c.rotation.x === -Math.PI / 2) || new THREE.Mesh()
      );
      if (groundIntersect.length > 0) {
        this.createRipple(groundIntersect[0].point);
      }
    }
  }

  private handleHover(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.rainForest.getInteractiveObjects(), true);

    if (intersects.length > 0) {
      let targetObject = intersects[0].object;
      while (targetObject.parent && !targetObject.userData.type) {
        targetObject = targetObject.parent;
      }

      if (targetObject !== this.hoveredObject) {
        this.hoveredObject = targetObject;

        if (targetObject.userData.layerIndex === 1 && targetObject.userData.type === 'plant') {
          const worldPos = new THREE.Vector3();
          targetObject.getWorldPosition(worldPos);
          this.spawnButterflyParticles(worldPos);
        }
      }
    } else {
      this.hoveredObject = null;
    }

    document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
  }

  private createHighlight(target: THREE.Object3D): void {
    const highlightGeo = new THREE.RingGeometry(0.4, 0.5, 32);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: '#8fbc8f',
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });

    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    const worldPos = new THREE.Vector3();
    target.getWorldPosition(worldPos);
    highlight.position.copy(worldPos);
    highlight.position.y += 0.1;
    highlight.rotation.x = -Math.PI / 2;

    this.scene.add(highlight);

    this.highlights.push({
      mesh: highlight,
      startTime: performance.now(),
      duration: 300,
      target
    });

    gsap.to(highlight.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 0.3,
      ease: 'power1.out'
    });
  }

  private createRipple(position: THREE.Vector3): void {
    const rippleGeo = new THREE.RingGeometry(0.2, 0.3, 64);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: '#7cfc00',
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    const ripple = new THREE.Mesh(rippleGeo, rippleMat);
    ripple.position.copy(position);
    ripple.position.y += 0.05;
    ripple.rotation.x = -Math.PI / 2;

    this.scene.add(ripple);

    this.ripples.push({
      mesh: ripple,
      startTime: performance.now(),
      duration: 600,
      maxRadius: 2
    });
  }

  private showInfoLabel(screenX: number, screenY: number, text: string): void {
    const label = document.createElement('div');
    label.className = 'info-label';
    label.textContent = text;
    label.style.left = `${screenX}px`;
    label.style.top = `${screenY - 35}px`;
    document.body.appendChild(label);

    this.infoLabels.push({
      element: label,
      startTime: performance.now(),
      duration: 2000,
      screenPosition: { x: screenX, y: screenY - 35 }
    });
  }

  private spawnButterflyParticles(position: THREE.Vector3): void {
    const colors = ['#ff6b9d', '#6b9dff', '#ffd700', '#ff4444', '#44ff44'];

    for (let i = 0; i < 5; i++) {
      const butterflyGeo = new THREE.BoxGeometry(0.15, 0.02, 0.1);
      const butterflyMat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9
      });

      const butterfly = new THREE.Mesh(butterflyGeo, butterflyMat);
      butterfly.position.copy(position);
      butterfly.position.x += (Math.random() - 0.5) * 2;
      butterfly.position.z += (Math.random() - 0.5) * 2;
      butterfly.position.y += 1 + Math.random() * 2;

      this.scene.add(butterfly);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2;
      this.butterflyParticles.push({
        mesh: butterfly,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed),
        startTime: performance.now(),
        duration: 1000,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private triggerLayerEffect(layerIndex: number, position: THREE.Vector3, target: THREE.Object3D): void {
    switch (layerIndex) {
      case 0:
        this.showFungiNetwork(position);
        break;
      case 1:
        this.spawnButterflyParticles(position);
        break;
      case 2:
        if (target.userData.type === 'animal' && target.userData.name === '猴子') {
          this.triggerMonkeyJump(target as THREE.Group);
        }
        break;
      case 3:
        if (target.userData.type === 'animal' && target.userData.name === '雄鹰') {
          this.triggerEagleGlide(target as THREE.Group);
        }
        break;
    }
  }

  private showFungiNetwork(position: THREE.Vector3): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
    gradient.addColorStop(0.3, 'rgba(200, 255, 150, 0.5)');
    gradient.addColorStop(0.6, 'rgba(150, 200, 100, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 150, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(200, 255, 150, 0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const startR = 30 + Math.random() * 20;
      const endR = 100 + Math.random() * 30;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(angle) * startR, 128 + Math.sin(angle) * startR);
      for (let t = 0; t <= 1; t += 0.2) {
        const r = startR + (endR - startR) * t;
        const wobble = Math.sin(t * Math.PI * 4) * 10;
        ctx.lineTo(
          128 + Math.cos(angle + wobble * 0.05) * r,
          128 + Math.sin(angle + wobble * 0.05) * r
        );
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const planeGeo = new THREE.PlaneGeometry(6, 6);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0
    });

    const network = new THREE.Mesh(planeGeo, planeMat);
    network.position.copy(position);
    network.position.y = 0.02;
    network.rotation.x = -Math.PI / 2;

    this.scene.add(network);

    gsap.to(planeMat, {
      opacity: 0.8,
      duration: 0.3,
      ease: 'power1.out',
      onComplete: () => {
        gsap.to(planeMat, {
          opacity: 0,
          duration: 1,
          delay: 0.5,
          ease: 'power1.in',
          onComplete: () => {
            this.scene.remove(network);
            texture.dispose();
            planeGeo.dispose();
            planeMat.dispose();
          }
        });
      }
    });

    gsap.to(network.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 1.5,
      ease: 'power1.out'
    });
  }

  private triggerMonkeyJump(monkey: THREE.Group): void {
    const baseY = monkey.position.y;
    const baseRot = monkey.rotation.y;

    this.monkeyAnimations.set(monkey, {
      startTime: performance.now(),
      duration: 400,
      baseY,
      baseRot
    });
  }

  private triggerEagleGlide(eagle: THREE.Group): void {
    this.eagleAnimations.set(eagle, {
      startTime: performance.now(),
      duration: 800,
      basePos: eagle.position.clone(),
      phase: 0
    });
  }

  update(delta: number, time: number): void {
    const now = performance.now();

    this.ripples = this.ripples.filter((ripple) => {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;

      if (progress >= 1) {
        this.scene.remove(ripple.mesh);
        (ripple.mesh.geometry as THREE.BufferGeometry).dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        return false;
      }

      const currentRadius = 0.3 + (ripple.maxRadius - 0.3) * progress;
      const newGeo = new THREE.RingGeometry(currentRadius * 0.9, currentRadius, 64);
      ripple.mesh.geometry.dispose();
      ripple.mesh.geometry = newGeo;

      (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);

      return true;
    });

    this.highlights = this.highlights.filter((highlight) => {
      const elapsed = now - highlight.startTime;
      const progress = elapsed / highlight.duration;

      if (progress >= 1) {
        this.scene.remove(highlight.mesh);
        (highlight.mesh.geometry as THREE.BufferGeometry).dispose();
        (highlight.mesh.material as THREE.Material).dispose();
        return false;
      }

      const worldPos = new THREE.Vector3();
      highlight.target.getWorldPosition(worldPos);
      highlight.mesh.position.copy(worldPos);
      highlight.mesh.position.y += 0.1;

      (highlight.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;

      return true;
    });

    this.infoLabels = this.infoLabels.filter((label) => {
      const elapsed = now - label.startTime;

      if (elapsed > label.duration) {
        label.element.classList.add('fade-out');
        setTimeout(() => {
          label.element.remove();
        }, 500);
        return false;
      }

      if (elapsed > label.duration - 500) {
        label.element.style.opacity = String(1 - (elapsed - (label.duration - 500)) / 500);
      }

      return true;
    });

    this.butterflyParticles = this.butterflyParticles.filter((particle) => {
      const elapsed = now - particle.startTime;
      const progress = elapsed / particle.duration;

      if (progress >= 1) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        return false;
      }

      particle.mesh.position.x += particle.velocity.x * delta;
      particle.mesh.position.z += particle.velocity.z * delta;
      particle.mesh.position.y += Math.sin(time * 4 + particle.phase) * 0.05;
      particle.mesh.rotation.y = Math.sin(time * 10 + particle.phase) * 0.6;

      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - progress);

      return true;
    });

    this.monkeyAnimations.forEach((animData, monkey) => {
      const elapsed = now - animData.startTime;
      const progress = elapsed / animData.duration;

      if (progress >= 1) {
        monkey.position.y = animData.baseY;
        monkey.rotation.y = animData.baseRot;
        this.monkeyAnimations.delete(monkey);
        return;
      }

      const jumpHeight = Math.sin(progress * Math.PI) * 0.5;
      monkey.position.y = animData.baseY + jumpHeight;
      monkey.rotation.y = animData.baseRot + progress * Math.PI * 2;
    });

    this.eagleAnimations.forEach((animData, eagle) => {
      const elapsed = now - animData.startTime;
      const progress = elapsed / animData.duration;

      if (progress >= 1) {
        eagle.position.copy(animData.basePos);
        this.eagleAnimations.delete(eagle);
        return;
      }

      const glideX = progress * 10;
      const glideY = Math.sin(progress * Math.PI * 2) * 1;
      eagle.position.x = animData.basePos.x + glideX;
      eagle.position.y = animData.basePos.y + glideY;
      eagle.rotation.y = 0;
    });
  }
}
