import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { WaveSystem, ParticleSystem } from './wave';
import { MediumSystem } from './medium';

interface AppParams {
  frequency: number;
  amplitude: number;
  wavelength: number;
  incidentAngle: number;
  showReflection: boolean;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private waveSystem: WaveSystem;
  private reflectionWaveSystem: WaveSystem | null;
  private particleSystem: ParticleSystem;
  private mediumSystem: MediumSystem;
  private clock: THREE.Clock;
  private gui!: GUI;
  private params: AppParams;
  private container: HTMLElement;
  private animationId: number;
  private particleTimer: number;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.particleTimer = 0;

    this.params = {
      frequency: 2,
      amplitude: 1.5,
      wavelength: 2,
      incidentAngle: 0,
      showReflection: false
    };

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.setupLights();
    this.setupGridHelper();

    this.mediumSystem = new MediumSystem(this.scene);
    this.waveSystem = new WaveSystem(
      this.scene,
      {
        frequency: this.params.frequency,
        amplitude: this.params.amplitude,
        wavelength: this.params.wavelength,
        incidentAngle: this.params.incidentAngle
      },
      false,
      new THREE.Color(0x2196F3)
    );
    this.reflectionWaveSystem = null;
    this.particleSystem = new ParticleSystem(this.scene, 500);

    this.setupGUI();
    this.setupMobileToggle();
    this.setupResizeHandler();

    this.animationId = 0;
    this.animate = this.animate.bind(this);
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0A2E);
    scene.fog = new THREE.Fog(0x1A237E, 10, 35);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 40;
    controls.target.set(0, 0, 0);
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x2196F3, 0.5, 20);
    pointLight1.position.set(-5, 3, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xF44336, 0.3, 15);
    pointLight2.position.set(5, 3, 0);
    this.scene.add(pointLight2);
  }

  private setupGridHelper(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x334466, 0x223355);
    gridHelper.position.y = -3;
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.position.set(-8, -2.9, -5);
    this.scene.add(axesHelper);
  }

  private setupGUI(): void {
    this.gui = new GUI({
      autoPlace: false,
      width: 280
    });

    const guiContainer = document.getElementById('gui-container')!;
    guiContainer.appendChild(this.gui.domElement);

    const waveFolder = this.gui.addFolder('波形参数');
    waveFolder.open();

    waveFolder
      .add(this.params, 'frequency', 1, 5, 0.1)
      .name('频率 (Hz)')
      .onChange((v: number) => {
        this.waveSystem.updateParams({ frequency: v });
        if (this.reflectionWaveSystem) {
          this.reflectionWaveSystem.updateParams({ frequency: v });
        }
      });

    waveFolder
      .add(this.params, 'amplitude', 0.5, 3, 0.1)
      .name('振幅 (单位)')
      .onChange((v: number) => {
        this.waveSystem.updateParams({ amplitude: v });
        if (this.reflectionWaveSystem) {
          this.reflectionWaveSystem.updateParams({ amplitude: v });
        }
      });

    waveFolder
      .add(this.params, 'incidentAngle', 0, 75, 1)
      .name('入射角 (度)')
      .onChange((v: number) => {
        this.waveSystem.updateParams({ incidentAngle: v });
        if (this.reflectionWaveSystem) {
          this.reflectionWaveSystem.updateParams({ incidentAngle: v });
        }
      });

    const displayFolder = this.gui.addFolder('显示设置');
    displayFolder.open();

    displayFolder
      .add(this.params, 'showReflection')
      .name('显示反射波')
      .onChange((v: boolean) => {
        this.toggleReflection(v);
      });
  }

  private toggleReflection(show: boolean): void {
    if (show && !this.reflectionWaveSystem) {
      this.reflectionWaveSystem = new WaveSystem(
        this.scene,
        {
          frequency: this.params.frequency,
          amplitude: this.params.amplitude,
          wavelength: this.params.wavelength,
          incidentAngle: this.params.incidentAngle
        },
        true,
        new THREE.Color(0x8BC34A)
      );
    } else if (this.reflectionWaveSystem) {
      this.reflectionWaveSystem.setVisible(show);
    }
  }

  private setupMobileToggle(): void {
    const toggleBtn = document.getElementById('mobile-toggle');
    const guiContainer = document.getElementById('gui-container');
    if (toggleBtn && guiContainer) {
      toggleBtn.addEventListener('click', () => {
        guiContainer.classList.toggle('visible');
      });
    }
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private spawnParticles(): void {
    const mediumData = this.mediumSystem.getMediumData();
    const boundaryX = mediumData.boundaryX;

    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 4;
      let y: number;
      let color: THREE.Color;

      if (x > boundaryX) {
        const phase = performance.now() / 1000;
        const effAmp = this.params.amplitude * mediumData.amplitudeScale;
        const effWave = this.params.wavelength * mediumData.wavelengthScale;
        y = Math.sin(2 * Math.PI * (this.params.frequency * phase - x / effWave)) * effAmp;
        color = new THREE.Color(0xF44336);
      } else {
        const phase = performance.now() / 1000;
        y = Math.sin(2 * Math.PI * (this.params.frequency * phase - x / this.params.wavelength)) * this.params.amplitude;
        color = new THREE.Color(0x2196F3);
      }

      if (this.params.showReflection && x < boundaryX + 0.5 && Math.random() > 0.5) {
        color = new THREE.Color(0x8BC34A);
      }

      this.particleSystem.spawn(
        new THREE.Vector3(x, y, z),
        color
      );
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();
    this.mediumSystem.applyFog(this.camera);

    const mediumData = this.mediumSystem.getMediumData();
    this.waveSystem.update(elapsedTime, {
      boundaryX: mediumData.boundaryX,
      wavelengthScale: mediumData.wavelengthScale,
      amplitudeScale: mediumData.amplitudeScale,
      incidentAngle: this.params.incidentAngle
    });

    if (this.reflectionWaveSystem && this.params.showReflection) {
      this.reflectionWaveSystem.update(elapsedTime, {
        boundaryX: mediumData.boundaryX,
        wavelengthScale: mediumData.wavelengthScale,
        amplitudeScale: mediumData.amplitudeScale,
        incidentAngle: this.params.incidentAngle
      });
    }

    this.particleTimer += deltaTime;
    if (this.particleTimer > 0.05) {
      this.spawnParticles();
      this.particleTimer = 0;
    }
    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.waveSystem.dispose();
    if (this.reflectionWaveSystem) {
      this.reflectionWaveSystem.dispose();
    }
    this.particleSystem.dispose();
    this.mediumSystem.dispose();
    this.gui.destroy();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new App();
app.start();

(window as any).__app = app;
