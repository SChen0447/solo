import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Jellyfish } from './Jellyfish';
import { HydrothermalVent, createDebrisParticles, updateDebrisParticles } from './HydrothermalVent';
import { UI } from './UI';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;
  private jellyfish: Jellyfish[];
  private vent: HydrothermalVent;
  private debris: THREE.Points;
  private ui: UI;
  private trackedJellyfish: Jellyfish | null;
  private speedMultiplier: number;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private jellyfishMeshes: THREE.Object3D[];
  private meshToJellyfish: Map<THREE.Object3D, Jellyfish>;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.display = 'block';

    const container = document.getElementById('app');
    if (container) {
      container.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;

    this.clock = new THREE.Clock();
    this.jellyfish = [];
    this.trackedJellyfish = null;
    this.speedMultiplier = 1.0;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.jellyfishMeshes = [];
    this.meshToJellyfish = new Map();

    this.vent = new HydrothermalVent();
    this.scene.add(this.vent.group);

    this.debris = createDebrisParticles();
    this.scene.add(this.debris);

    this.createJellyfish();

    this.ui = new UI();
    this.setupUICallbacks();

    this.addLights();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0x111122, 0.3);
    this.scene.add(ambient);
  }

  private createJellyfish(): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 3;
      const x = Math.cos(angle) * radius;
      const y = -2 + Math.random() * 4;
      const z = Math.sin(angle) * radius;

      const config = {
        position: new THREE.Vector3(x, y, z),
        contractionFrequency: 2 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.3,
        hueOffset: Math.random() * Math.PI * 2
      };

      const jf = new Jellyfish(config);
      this.jellyfish.push(jf);
      this.scene.add(jf.group);

      const meshes = jf.getAllMeshes();
      for (const mesh of meshes) {
        this.jellyfishMeshes.push(mesh);
        this.meshToJellyfish.set(mesh, jf);
      }
    }
  }

  private setupUICallbacks(): void {
    this.ui.onSpeedChange((delta: number) => {
      this.speedMultiplier = THREE.MathUtils.clamp(
        this.speedMultiplier + delta,
        0.5,
        2.0
      );
      if (this.trackedJellyfish) {
        this.ui.updateSpeedOnly(this.speedMultiplier);
      }
    });

    this.ui.onClick((event: MouseEvent) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.jellyfishMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const jf = this.meshToJellyfish.get(hit);
        
        if (jf) {
          if (this.trackedJellyfish && this.trackedJellyfish !== jf) {
            this.trackedJellyfish.setTracked(false);
          }
          
          jf.setTracked(true);
          this.trackedJellyfish = jf;
          this.ui.setPanelVisible(true);
        }
      }
    });
  }

  private checkJellyfishInteractions(): void {
    for (let i = 0; i < this.jellyfish.length; i++) {
      for (let j = i + 1; j < this.jellyfish.length; j++) {
        const dist = this.jellyfish[i].getPosition().distanceTo(this.jellyfish[j].getPosition());
        if (dist < 2) {
          this.jellyfish[i].triggerResponse();
          this.jellyfish[j].triggerResponse();
        }
      }
    }
  }

  private updatePanel(): void {
    if (this.trackedJellyfish) {
      const pos = this.trackedJellyfish.getPosition();
      this.ui.updateTrackedData({
        glowState: this.trackedJellyfish.getGlowStateText(),
        glowColor: '#' + this.trackedJellyfish.glowColor.getHexString(),
        speedMultiplier: this.speedMultiplier,
        position: { x: pos.x, y: pos.y, z: pos.z }
      });
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.controls.update();
    this.vent.update(delta, time);
    updateDebrisParticles(this.debris, time);

    for (const jf of this.jellyfish) {
      jf.update(delta, time, this.speedMultiplier);
    }

    this.checkJellyfishInteractions();
    this.updatePanel();

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }
}

const app = new App();
app.start();
