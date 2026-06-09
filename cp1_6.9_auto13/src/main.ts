import * as THREE from 'three';
import { gsap } from 'gsap';
import { ClayCharacter, EmotionType } from './clayCharacter';
import { EmotionWheel } from './emotionWheel';

gsap.ticker.fps(30);

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private character!: ClayCharacter;
  private emotionWheel!: EmotionWheel;
  private clock: THREE.Clock = new THREE.Clock();
  private replayBtn!: HTMLButtonElement;
  private isReplaying: boolean = false;
  private replayTimeline: gsap.core.Timeline | null = null;
  private animationFrameId: number = 0;
  private container: HTMLElement | null = null;

  constructor() {
    this.init();
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container');
    if (!this.container) {
      throw new Error('Canvas container not found');
    }

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1, 8);
    this.camera.lookAt(2, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupGround();

    this.character = new ClayCharacter();
    this.scene.add(this.character.group);

    this.emotionWheel = new EmotionWheel('wheel-container', (emotion) => {
      this.character.animateToEmotion(emotion);
    });

    this.setupReplayButton();
    window.addEventListener('resize', () => this.onResize());
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffd700, 0.4);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffa500, 0.3);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);

    const pointLight = new THREE.PointLight(0xfff5e6, 0.5, 20);
    pointLight.position.set(2, 2, 4);
    this.scene.add(pointLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(12, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5deb3,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const shadowGeometry = new THREE.CircleGeometry(2.5, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(2, -2.49, 0);
    this.scene.add(shadow);
  }

  private setupReplayButton(): void {
    this.replayBtn = document.getElementById('replay-btn') as HTMLButtonElement;
    if (!this.replayBtn) {
      throw new Error('Replay button not found');
    }

    this.replayBtn.addEventListener('click', () => {
      if (this.isReplaying) {
        this.stopReplay();
      } else {
        this.startReplay();
      }
    });
  }

  private startReplay(): void {
    this.isReplaying = true;
    this.replayBtn.classList.add('playing');
    this.replayBtn.textContent = '⏹';

    const emotions = EmotionWheel.getEmotions();
    this.replayTimeline = gsap.timeline({
      onComplete: () => {
        this.stopReplay();
      }
    });

    emotions.forEach((emotion, index) => {
      this.replayTimeline!.to(
        {},
        {
          duration: 0.01,
          onStart: () => {
            this.emotionWheel.highlightEmotion(emotion);
            this.character.animateToEmotion(emotion);
          }
        },
        index * 2.3
      );
    });

    this.replayTimeline.to(
      {},
      {
        duration: 0.01,
        onStart: () => {
          this.emotionWheel.highlightEmotion(null);
          this.character.animateToEmotion('neutral');
        }
      },
      emotions.length * 2.3
    );
  }

  private stopReplay(): void {
    this.isReplaying = false;
    this.replayBtn.classList.remove('playing');
    this.replayBtn.textContent = '▶';

    if (this.replayTimeline) {
      this.replayTimeline.kill();
      this.replayTimeline = null;
    }

    this.emotionWheel.highlightEmotion(null);
  }

  private onResize(): void {
    if (!this.container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;

    if (width < 600) {
      this.camera.position.set(0, 1, 11);
      this.character.group.scale.setScalar(0.7);
    } else {
      this.camera.position.set(0, 1, 8);
      this.character.group.scale.setScalar(1.0);
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    this.character.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    if (this.replayTimeline) {
      this.replayTimeline.kill();
    }
    window.removeEventListener('resize', () => this.onResize());
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
