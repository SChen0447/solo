import * as THREE from 'three';
import { SkillManager } from './SkillManager';
import { EffectRenderer } from './EffectRenderer';
import { UIComposer } from './UIComposer';
import type { ComboEffect } from './SkillManager';

class SkillShowcaseApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private skillManager: SkillManager;
  private effectRenderer: EffectRenderer;
  private uiComposer: UIComposer;
  
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private isPlaying: boolean = false;
  private currentEffectTimer: number | null = null;
  
  private targetCameraPosition: THREE.Vector3;
  private targetCameraLookAt: THREE.Vector3;
  private cameraLerpFactor: number = 0.05;

  constructor() {
    this.container = document.getElementById('scene-container')!;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1d2e);
    this.scene.fog = new THREE.Fog(0x1a1d2e, 5, 20);

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.skillManager = new SkillManager();
    this.effectRenderer = new EffectRenderer(this.scene, this.camera);
    this.uiComposer = new UIComposer(this.skillManager);

    this.clock = new THREE.Clock();
    
    this.targetCameraPosition = this.camera.position.clone();
    this.targetCameraLookAt = new THREE.Vector3(0, 0, 0);

    this.initialize();
  }

  private initialize(): void {
    this.setupLights();
    this.setupEnvironment();
    this.setupEventListeners();
    this.setupUICallbacks();
    this.startAnimationLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00c8ff, 1, 20);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.5, 15);
    pointLight2.position.set(-5, 3, -5);
    this.scene.add(pointLight2);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(0, 10, 5);
    this.scene.add(directionalLight);
  }

  private setupEnvironment(): void {
    const groundGeometry = new THREE.CircleGeometry(3, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2d3e,
      metalness: 0.3,
      roughness: 0.8,
      transparent: true,
      opacity: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    this.scene.add(ground);

    const ringGeometry = new THREE.RingGeometry(2.5, 2.7, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.99;
    this.scene.add(ring);

    const innerRingGeometry = new THREE.RingGeometry(1.2, 1.25, 64);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = -0.98;
    this.scene.add(innerRing);

    for (let i = 0; i < 3; i++) {
      const pillarGeometry = new THREE.CylinderGeometry(0.1, 0.15, 3, 16);
      const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a3d5e,
        metalness: 0.5,
        roughness: 0.5
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      const angle = (i / 3) * Math.PI * 2;
      pillar.position.set(
        Math.cos(angle) * 2.2,
        0.5,
        Math.sin(angle) * 2.2
      );
      this.scene.add(pillar);

      const topLightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const topLightMaterial = new THREE.MeshBasicMaterial({
        color: 0x00c8ff,
        transparent: true,
        opacity: 0.8
      });
      const topLight = new THREE.Mesh(topLightGeometry, topLightMaterial);
      topLight.position.copy(pillar.position);
      topLight.position.y += 1.6;
      this.scene.add(topLight);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = { theta: 0, phi: Math.PI / 4 };
    const cameraDistance = 5;

    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraAngle.theta -= deltaX * 0.01;
      cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi + deltaY * 0.01));

      previousMousePosition = { x: e.clientX, y: e.clientY };

      this.targetCameraPosition.x = Math.sin(cameraAngle.theta) * Math.cos(cameraAngle.phi) * cameraDistance;
      this.targetCameraPosition.y = Math.sin(cameraAngle.phi) * cameraDistance;
      this.targetCameraPosition.z = Math.cos(cameraAngle.theta) * Math.cos(cameraAngle.phi) * cameraDistance;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const currentDistance = this.camera.position.length();
      const newDistance = Math.max(3, Math.min(10, currentDistance + e.deltaY * zoomSpeed));
      
      const direction = this.camera.position.clone().normalize();
      this.targetCameraPosition.copy(direction.multiplyScalar(newDistance));
    }, { passive: false });

    let touchStartDistance = 0;
    let touchStartAngle = 0;
    let initialCameraDistance = 5;

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        touchStartDistance = this.getTouchDistance(e.touches);
        initialCameraDistance = this.targetCameraPosition.length();
        touchStartAngle = this.getTouchAngle(e.touches);
      }
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      
      if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;

        cameraAngle.theta -= deltaX * 0.01;
        cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.phi + deltaY * 0.01));

        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };

        const dist = this.targetCameraPosition.length();
        this.targetCameraPosition.x = Math.sin(cameraAngle.theta) * Math.cos(cameraAngle.phi) * dist;
        this.targetCameraPosition.y = Math.sin(cameraAngle.phi) * dist;
        this.targetCameraPosition.z = Math.cos(cameraAngle.theta) * Math.cos(cameraAngle.phi) * dist;
      } else if (e.touches.length === 2) {
        const currentDistance = this.getTouchDistance(e.touches);
        const scale = touchStartDistance / currentDistance;
        const newDistance = Math.max(3, Math.min(10, initialCameraDistance * scale));
        
        const direction = this.targetCameraPosition.clone().normalize();
        this.targetCameraPosition.copy(direction.multiplyScalar(newDistance));
      }
    }, { passive: false });

    this.container.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchAngle(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.atan2(dy, dx);
  }

  private setupUICallbacks(): void {
    this.uiComposer.setOnSkillSelect((skillId: string) => {
      this.playSingleSkill(skillId);
    });

    this.uiComposer.setOnComboChange((combo: ComboEffect | null) => {
      if (combo && combo.ids.length > 0) {
        this.playComboEffect(combo);
      }
    });

    this.uiComposer.setOnReset(() => {
      this.resetScene();
    });

    this.uiComposer.setOnSpeedChange((speed: number) => {
      this.effectRenderer.setSpeedMultiplier(speed);
    });

    this.effectRenderer.setStatusCallback((active: number, total: number) => {
      this.uiComposer.updateParticleCount(active);
    });
  }

  private playSingleSkill(skillId: string): void {
    const config = this.skillManager.getParticleConfig(skillId);
    const skill = this.skillManager.getSkill(skillId);
    
    if (skill) {
      this.effectRenderer.playSkillEffect(config, skill.duration);
      this.isPlaying = true;
      
      if (this.currentEffectTimer) {
        clearTimeout(this.currentEffectTimer);
      }
      
      this.currentEffectTimer = window.setTimeout(() => {
        this.isPlaying = false;
      }, skill.duration + 500);
    }
  }

  private playComboEffect(combo: ComboEffect): void {
    const configs = combo.ids.map(id => this.skillManager.getParticleConfig(id));
    
    this.effectRenderer.playComboEffect(combo, configs);
    this.isPlaying = true;

    if (this.currentEffectTimer) {
      clearTimeout(this.currentEffectTimer);
    }

    this.currentEffectTimer = window.setTimeout(() => {
      this.isPlaying = false;
    }, combo.duration + 500);
  }

  private resetScene(): void {
    this.effectRenderer.clearAllEffects();
    this.effectRenderer.resetView();
    
    this.targetCameraPosition.set(0, 2, 5);
    this.targetCameraLookAt.set(0, 0, 0);
    
    this.isPlaying = false;
    if (this.currentEffectTimer) {
      clearTimeout(this.currentEffectTimer);
      this.currentEffectTimer = null;
    }
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const delta = this.clock.getDelta();
      
      this.updateCamera(delta);
      this.effectRenderer.update(delta);
      this.updateEnvironment(delta);

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private updateCamera(delta: number): void {
    this.camera.position.lerp(this.targetCameraPosition, this.cameraLerpFactor);
    this.camera.lookAt(this.targetCameraLookAt);
  }

  private updateEnvironment(delta: number): void {
    const time = this.clock.getElapsedTime();
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry instanceof THREE.RingGeometry) {
        object.rotation.z = time * 0.2;
      }
    });
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.currentEffectTimer) {
      clearTimeout(this.currentEffectTimer);
    }

    this.effectRenderer.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SkillShowcaseApp();
  
  window.addEventListener('beforeunload', () => {
    app.dispose();
  });
});
