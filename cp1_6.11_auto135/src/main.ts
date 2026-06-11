import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { Pane } from 'tweakpane';
import gsap from 'gsap';
import { PlanetManager } from './planetManager';
import { NebulaManager } from './nebulaManager';

class PlanetEvolutionApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private planetManager: PlanetManager;
  private nebulaManager: NebulaManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private currentLabel: CSS2DObject | null = null;
  private isHovering: boolean = false;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#000011');

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0.5, 2.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 3.0;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();

    this.planetManager = new PlanetManager(this.scene);
    this.nebulaManager = new NebulaManager(this.scene);

    this.planetManager.setNebulaUpdateCallback(() => {
      this.nebulaManager.updatePosition();
    });

    this.setupTweakpane();
    this.setupInteraction();
    this.setupResponsive();

    this.animate();
  }

  private setupLights(): void {
    const directionalLight = new THREE.DirectionalLight('#ffffff', 1.8);
    directionalLight.position.set(5, 3, 4);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight('#334466', 0.4);
    this.scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight('#4488aa', 0.6);
    rimLight.position.set(-3, -1, -2);
    this.scene.add(rimLight);
  }

  private setupTweakpane(): void {
    const panelContainer = document.getElementById('control-panel')!;
    const pane = new Pane({
      container: panelContainer,
      title: '地形参数',
    });

    const style = document.createElement('style');
    style.textContent = `
      .tp-dfwv {
        --tp-font-family: 'Courier New', Consolas, monospace;
        --tp-base-background-color: rgba(0, 0, 0, 0);
        --tp-label-foreground-color: #00CED1;
        --tp-input-foreground-color: #e0e0e0;
        --tp-input-background-color: rgba(0, 206, 209, 0.1);
        --tp-monitor-foreground-color: #00CED1;
        --tp-title-foreground-color: #00CED1;
        --tp-title-background-color: rgba(0, 206, 209, 0.08);
      }
    `;
    document.head.appendChild(style);

    const params = {
      tectonicStress: 0,
      volcanicActivity: 0,
      erosion: 0,
    };

    pane.addBinding(params, 'tectonicStress', {
      min: 0,
      max: 1,
      step: 0.01,
      label: '板块应力',
    }).on('change', (ev) => {
      this.planetManager.updateTectonicStress(ev.value);
    });

    pane.addBinding(params, 'volcanicActivity', {
      min: 0,
      max: 1,
      step: 0.01,
      label: '火山活动',
    }).on('change', (ev) => {
      this.planetManager.updateVolcanicActivity(ev.value);
    });

    pane.addBinding(params, 'erosion', {
      min: 0,
      max: 1,
      step: 0.01,
      label: '风力侵蚀',
    }).on('change', (ev) => {
      this.planetManager.updateErosion(ev.value);
      this.nebulaManager.updateErosion(ev.value);
    });
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.checkHover();
    });

    canvas.addEventListener('click', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.handleClick();
    });

    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.handleClick();
      }
    });
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planetMesh = this.planetManager.getPlanetMesh();
    const intersects = this.raycaster.intersectObject(planetMesh);

    if (intersects.length > 0) {
      if (!this.isHovering) {
        this.isHovering = true;
        gsap.to(planetMesh.scale, {
          x: 1.01,
          y: 1.01,
          z: 1.01,
          duration: 0.3,
          ease: 'power2.out',
        });
        const atmosphere = this.planetManager.getAtmosphereMesh();
        const mat = atmosphere.material as THREE.ShaderMaterial;
        gsap.to(mat.uniforms.uIntensity, {
          value: 2.5,
          duration: 0.3,
        });
      }
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      if (this.isHovering) {
        this.isHovering = false;
        gsap.to(planetMesh.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
        const atmosphere = this.planetManager.getAtmosphereMesh();
        const mat = atmosphere.material as THREE.ShaderMaterial;
        gsap.to(mat.uniforms.uIntensity, {
          value: 1.5,
          duration: 0.3,
        });
      }
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planetMesh = this.planetManager.getPlanetMesh();
    const intersects = this.raycaster.intersectObject(planetMesh);

    if (intersects.length > 0) {
      const surfacePoint = this.planetManager.getSurfacePoint(intersects[0]);
      if (surfacePoint) {
        this.showLabel(intersects[0].point, surfacePoint);
      }

      gsap.to(planetMesh.scale, {
        x: 0.98,
        y: 0.98,
        z: 0.98,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });
    } else {
      this.removeLabel();
    }
  }

  private showLabel(point: THREE.Vector3, data: { lat: number; lon: number; altitude: number; terrainType: string }): void {
    this.removeLabel();

    const div = document.createElement('div');
    div.className = 'planet-label';
    div.innerHTML = `
      <div class="label-title">地形标注</div>
      <div class="label-row"><span class="label-key">纬度</span><span class="label-value">${data.lat.toFixed(2)}°</span></div>
      <div class="label-row"><span class="label-key">经度</span><span class="label-value">${data.lon.toFixed(2)}°</span></div>
      <div class="label-row"><span class="label-key">海拔</span><span class="label-value">${data.altitude.toFixed(1)} m</span></div>
      <div class="label-row"><span class="label-key">类型</span><span class="label-value">${data.terrainType}</span></div>
    `;

    const label = new CSS2DObject(div);
    label.position.copy(point);
    label.position.multiplyScalar(1.05);
    this.scene.add(label);
    this.currentLabel = label;

    div.style.opacity = '0';
    div.style.transform = 'scale(0.8)';
    gsap.to(div, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: 'back.out(1.4)',
    });
  }

  private removeLabel(): void {
    if (this.currentLabel) {
      const div = this.currentLabel.element as HTMLElement;
      gsap.to(div, {
        opacity: 0,
        scale: 0.8,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          this.scene.remove(this.currentLabel!);
          this.currentLabel = null;
        },
      });
    }
  }

  private setupResponsive(): void {
    const toggleBtn = document.getElementById('panel-toggle')!;
    const panel = document.getElementById('control-panel')!;
    let panelOpen = false;

    toggleBtn.addEventListener('click', () => {
      panelOpen = !panelOpen;
      if (panelOpen) {
        panel.classList.add('open');
        gsap.to(toggleBtn, {
          rotation: 90,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        panel.classList.remove('open');
        gsap.to(toggleBtn, {
          rotation: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.planetManager.update(elapsed);
    this.nebulaManager.update(delta);

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}

new PlanetEvolutionApp();
