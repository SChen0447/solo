import * as THREE from 'three';
import {
  createBronzeDing,
  createBlueWhiteVase,
  createJadeCong,
  createPedestal,
  type ArtifactData
} from './modelLoader';
import { InteractionManager } from './interaction';
import { UIManager } from './uiManager';
import type { HotspotInfo } from './modelLoader';

class MuseumShowcase {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private artifacts: ArtifactData[] = [];
  private currentArtifactIndex = 0;
  private currentArtifactGroup: THREE.Group | null = null;
  
  private pedestal: THREE.Mesh;
  private interactionManager: InteractionManager | null = null;
  private uiManager: UIManager | null = null;
  
  private isAnimating = false;
  private animationStartTime = 0;
  private ANIMATION_DURATION = 600;
  private outgoingGroup: THREE.Group | null = null;
  private incomingGroup: THREE.Group | null = null;
  
  private initialRiseComplete = false;
  private riseStartTime = 0;
  private RISE_DURATION = 500;
  
  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a3b4c);
    
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1, 7);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    
    this.pedestal = createPedestal();
    this.scene.add(this.pedestal);
    
    this.setupLights();
    this.createArtifacts();
    this.setupUI();
    this.setupInteraction();
    this.setupResizeHandler();
    
    this.riseStartTime = performance.now();
    
    this.animate();
  }
  
  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x405060, 0.6);
    this.scene.add(ambientLight);
    
    const spotLight = new THREE.SpotLight(0xfff4e0, 1.2, 20, Math.PI / 6, 0.4, 1);
    spotLight.position.set(0, 6, 0);
    spotLight.target.position.set(0, 0, 0);
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);
    
    const keyLight = new THREE.DirectionalLight(0xfff0e0, 0.8);
    keyLight.position.set(3, 4, 3);
    this.scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0x8090a0, 0.4);
    fillLight.position.set(-3, 2, -2);
    this.scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xc8a96e, 0.3);
    rimLight.position.set(0, 2, -4);
    this.scene.add(rimLight);
  }
  
  private createArtifacts(): void {
    const ding = createBronzeDing();
    const vase = createBlueWhiteVase();
    const cong = createJadeCong();
    
    this.artifacts = [ding, vase, cong];
    
    this.currentArtifactGroup = ding.group;
    this.currentArtifactGroup.position.y = -3;
    this.scene.add(this.currentArtifactGroup);
  }
  
  private setupUI(): void {
    this.uiManager = new UIManager({
      artifacts: this.artifacts,
      onArtifactChange: (index: number) => {
        this.switchArtifact(index);
      },
      onAudioPlay: () => {
        console.log('播放语音导览...');
      }
    });
  }
  
  private setupInteraction(): void {
    if (!this.currentArtifactGroup) return;
    
    this.interactionManager = new InteractionManager({
      container: this.container,
      camera: this.camera,
      targetGroup: this.currentArtifactGroup,
      artifactData: this.artifacts[this.currentArtifactIndex],
      onHotspotHover: (hotspotInfo: HotspotInfo | null) => {
        if (hotspotInfo) {
          this.uiManager?.showInfoCard(hotspotInfo);
        } else {
          this.uiManager?.hideInfoCard();
        }
      },
      onZoomChange: (_scale: number) => {
      }
    });
  }
  
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  public switchArtifact(index: number): void {
    if (this.isAnimating || index === this.currentArtifactIndex) return;
    if (index < 0 || index >= this.artifacts.length) return;
    
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    
    this.outgoingGroup = this.currentArtifactGroup;
    this.incomingGroup = this.artifacts[index].group;
    
    this.incomingGroup.position.y = 3;
    this.incomingGroup.rotation.x = this.artifacts[this.currentArtifactIndex].group.rotation.x;
    this.incomingGroup.rotation.y = this.artifacts[this.currentArtifactIndex].group.rotation.y;
    this.incomingGroup.scale.copy(this.artifacts[this.currentArtifactIndex].group.scale);
    
    this.scene.add(this.incomingGroup);
    
    this.currentArtifactIndex = index;
    
    this.interactionManager?.setArtifactData(this.artifacts[index]);
  }
  
  private updateSwitchAnimation(): void {
    if (!this.isAnimating || !this.outgoingGroup || !this.incomingGroup) return;
    
    const elapsed = performance.now() - this.animationStartTime;
    const t = Math.min(elapsed / this.ANIMATION_DURATION, 1);
    
    const eased = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    
    this.outgoingGroup.position.y = -3 * eased;
    this.incomingGroup.position.y = 3 * (1 - eased);
    
    if (t >= 1) {
      this.scene.remove(this.outgoingGroup);
      this.currentArtifactGroup = this.incomingGroup;
      
      if (this.interactionManager && this.currentArtifactGroup) {
        this.interactionManager.setTargetGroup(this.currentArtifactGroup);
      }
      
      this.outgoingGroup = null;
      this.incomingGroup = null;
      this.isAnimating = false;
    }
  }
  
  private updateInitialRise(): void {
    if (this.initialRiseComplete || !this.currentArtifactGroup) return;
    
    const elapsed = performance.now() - this.riseStartTime;
    const t = Math.min(elapsed / this.RISE_DURATION, 1);
    
    const eased = 1 - Math.pow(1 - t, 3);
    
    this.currentArtifactGroup.position.y = -2 + 2 * eased;
    
    if (t >= 1) {
      this.initialRiseComplete = true;
      this.currentArtifactGroup.position.y = 0;
    }
  }
  
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    this.updateInitialRise();
    this.updateSwitchAnimation();
    
    if (this.interactionManager && this.initialRiseComplete && !this.isAnimating) {
      this.interactionManager.update();
    }
    
    this.renderer.render(this.scene, this.camera);
  };
  
  public dispose(): void {
    this.interactionManager?.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MuseumShowcase();
});
