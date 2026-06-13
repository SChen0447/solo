import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TreeManager } from './TreeManager';
import { SectionManager } from './SectionManager';
import _ from 'lodash';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private treeManager: TreeManager;
  private sectionManager: SectionManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private isMouseDown: boolean = false;
  private mouseDownPos: THREE.Vector2 = new THREE.Vector2();
  private mouseUpPos: THREE.Vector2 = new THREE.Vector2();

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a0e06');
    this.scene.fog = new THREE.Fog('#1a0e06', 8, 20);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(3, 2.5, 3);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 1.2, 0);
    this.controls.maxPolarAngle = Math.PI * 0.85;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupGround();

    this.treeManager = new TreeManager(this.scene);
    this.sectionManager = new SectionManager(this.scene);

    this.treeManager.setOnRingDataUpdate((data) => {
      this.sectionManager.updateRings(data);
    });

    this.treeManager.forceEmitRingData();

    this.setupEventListeners();
    this.setupSliders();

    this.hideLoading();
    this.animate();
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xfff0d0, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 20;
    dirLight.shadow.camera.left = -5;
    dirLight.shadow.camera.right = 5;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -5;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xd0e0ff, 0.3);
    fillLight.position.set(-3, 4, -2);
    this.scene.add(fillLight);

    const pointLight = new THREE.PointLight(0xffcc66, 0.5, 8);
    pointLight.position.set(1, 3, 1);
    this.scene.add(pointLight);
  }

  private setupGround() {
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupEventListeners() {
    window.addEventListener('resize', _.throttle(() => this.onResize(), 100));

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.isMouseDown = true;
      this.mouseDownPos.set(e.clientX, e.clientY);
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      this.mouseUpPos.set(e.clientX, e.clientY);
      const dist = this.mouseDownPos.distanceTo(this.mouseUpPos);
      if (dist < 5) {
        this.onClick(e);
      }
      this.isMouseDown = false;
    });
  }

  private onClick(event: PointerEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const trunkMeshes = this.treeManager.getTrunkMeshes();
    const intersects = this.raycaster.intersectObjects(trunkMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const localY = hit.point.y;

      if (this.treeManager.getIsCut()) {
        this.treeManager.uncut();
        this.sectionManager.hideSection();
      }

      this.treeManager.cutAt(localY);

      const cutY = this.treeManager.getCutY();
      if (cutY !== null) {
        const pos = new THREE.Vector3(0, cutY + 0.025, 0);
        this.sectionManager.showSection(pos, this.treeManager.getCurrentRadius(), this.camera.position);
      }
    } else {
      if (this.treeManager.getIsCut()) {
        this.treeManager.uncut();
        this.sectionManager.hideSection();
      }
    }
  }

  private setupSliders() {
    const yearSlider = document.getElementById('year-slider') as HTMLInputElement;
    const yearValue = document.getElementById('year-value')!;
    const moistureSlider = document.getElementById('moisture-slider') as HTMLInputElement;
    const moistureValue = document.getElementById('moisture-value')!;

    if (yearSlider) {
      yearSlider.addEventListener('input', () => {
        const val = parseInt(yearSlider.value, 10);
        yearValue.textContent = val.toString();
        this.treeManager.setYear(val);

        if (this.treeManager.getIsCut()) {
          this.treeManager.uncut();
          this.sectionManager.hideSection();
        }
      });
    }

    if (moistureSlider) {
      moistureSlider.addEventListener('input', () => {
        const val = parseInt(moistureSlider.value, 10);
        moistureValue.textContent = val.toString();
        this.treeManager.setMoisture(val);
      });
    }
  }

  private hideLoading() {
    setTimeout(() => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 800);
      }
    }, 500);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.sectionManager.refreshHistogram();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.controls.update();
    this.treeManager.update(delta);
    this.sectionManager.update();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
