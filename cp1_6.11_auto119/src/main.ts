import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { Environment } from './Environment';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private environment: Environment;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private pane: Pane;

  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private fpsDisplay: HTMLElement;
  private statsPanel: Record<string, HTMLElement>;
  private tooltip: HTMLElement;
  private flowerInfo: HTMLElement;
  private statsTimer: number = 0;

  private params = {
    flowerDensity: 30,
    evaporationRate: 1.0,
    obstacleCount: 6,
  };

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0d2818, 1);
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0d2818, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 20, 15);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.fpsDisplay = document.getElementById('fps-counter')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.flowerInfo = document.getElementById('flower-info')!;
    this.statsPanel = {
      bees: document.getElementById('stat-bees')!,
      collect: document.getElementById('stat-collect')!,
      pheromone: document.getElementById('stat-pheromone')!,
      avgTime: document.getElementById('stat-avg-time')!,
    };

    this.setupLights();
    this.environment = new Environment(this.scene);
    this.environment.init(this.params.flowerDensity, this.params.obstacleCount);

    this.pane = this.createPane();

    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404040, 1.5);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xfff5e1, 1.8);
    directional.position.set(10, 20, 10);
    this.scene.add(directional);

    const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x2d5a27, 0.6);
    this.scene.add(hemisphere);

    const point = new THREE.PointLight(0xffc107, 0.8, 30);
    point.position.set(0, 5, 0);
    this.scene.add(point);
  }

  private createPane(): Pane {
    const pane = new Pane({
      title: '🌸 参数控制',
      container: document.body,
    });

    const container = (pane as any).element?.container;
    if (container) {
      container.style.position = 'fixed';
      container.style.top = '50px';
      container.style.left = '16px';
      container.style.zIndex = '15';
      container.style.background = '#00000080';
    }

    pane.addBinding(this.params, 'flowerDensity', {
      label: '花朵密度',
      min: 10,
      max: 50,
      step: 5,
    }).on('change', () => {
      this.environment.regenerate(
        this.params.flowerDensity,
        this.params.obstacleCount,
        this.params.evaporationRate
      );
    });

    pane.addBinding(this.params, 'evaporationRate', {
      label: '信息素挥发速率',
      min: 0.1,
      max: 2.0,
      step: 0.1,
    }).on('change', () => {
      this.environment.swarmManager.setEvaporationRate(this.params.evaporationRate);
    });

    pane.addBinding(this.params, 'obstacleCount', {
      label: '障碍物数量',
      min: 2,
      max: 12,
      step: 1,
    }).on('change', () => {
      this.environment.regenerate(
        this.params.flowerDensity,
        this.params.obstacleCount,
        this.params.evaporationRate
      );
    });

    return pane;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.updateTooltip(e.clientX, e.clientY);
    });

    window.addEventListener('click', (e) => {
      this.handleFlowerClick(e.clientX, e.clientY);
    });
  }

  private updateTooltip(clientX: number, clientY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const beeMeshes = this.environment.swarmManager.bees.map((b) => b.mesh);
    const intersects = this.raycaster.intersectObjects(beeMeshes, true);

    if (intersects.length > 0) {
      let beeMesh = intersects[0].object;
      while (beeMesh.parent && !(beeMesh.parent as any).isScene) {
        beeMesh = beeMesh.parent;
      }

      const bee = this.environment.swarmManager.bees.find(
        (b) => b.mesh === beeMesh
      );
      if (bee) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = clientX + 15 + 'px';
        this.tooltip.style.top = clientY + 15 + 'px';
        this.tooltip.innerHTML = `
          <div>🐝 蜜蜂 #${bee.id + 1}</div>
          <div>模式: ${bee.mode}</div>
          <div>状态: ${bee.status}</div>
          <div>采集次数: ${bee.collectCount}</div>
        `;
        return;
      }
    }

    this.tooltip.style.display = 'none';
  }

  private handleFlowerClick(clientX: number, clientY: number): void {
    const mouse = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.environment.flowers, true);
    if (intersects.length > 0) {
      let flowerObj = intersects[0].object;
      while (flowerObj.parent && !(flowerObj.parent as any).isScene) {
        flowerObj = flowerObj.parent;
      }

      const data = (flowerObj as any).userData;
      if (data) {
        this.flowerInfo.style.display = 'block';
        this.flowerInfo.style.left = clientX + 15 + 'px';
        this.flowerInfo.style.top = clientY + 15 + 'px';
        this.flowerInfo.innerHTML = `
          <div>🌸 花朵信息</div>
          <div>蜜源状态: ${data.status}</div>
          <div>已采集次数: ${data.collectCount}</div>
          <div>蜜源: ${data.active ? '可用 ✅' : '冷却中 ⏳'}</div>
        `;

        setTimeout(() => {
          this.flowerInfo.style.display = 'none';
        }, 3000);
      }
    }
  }

  private updateStats(dt: number): void {
    this.statsTimer += dt;
    if (this.statsTimer < 0.5) return;
    this.statsTimer = 0;

    const sm = this.environment.swarmManager;
    this.statsPanel.bees.textContent = sm.getActiveBeeCount().toString();
    this.statsPanel.collect.textContent = sm.getTotalCollectCount().toString();
    this.statsPanel.pheromone.textContent = sm.totalPheromonesReleased.toString();
    this.statsPanel.avgTime.textContent = sm.getAverageCollectTime().toFixed(2) + 's';
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1.0) {
      this.fpsDisplay.textContent = `FPS: ${Math.round(this.fpsFrames / this.fpsTime)}`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    this.environment.update(dt, time);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.updateStats(dt);
  };
}

new App();
