import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NeuronNetwork, Neuron, Synapse, Dendrite } from './neuronNetwork';
import { PulseEngine, ActivePulse } from './pulseEngine';

const NEURON_COLOR = new THREE.Color(0x4a9eff);
const NEURON_ACTIVE_COLOR = new THREE.Color(0xff4a4a);
const NEURON_GLOW_COLOR = new THREE.Color(0xffaa00);
const SYNAPSE_COLOR = new THREE.Color(0x00ffff);
const SYNAPSE_ACTIVE_COLOR_START = new THREE.Color(0xff4a4a);
const SYNAPSE_ACTIVE_COLOR_MID = new THREE.Color(0xffaa00);
const SYNAPSE_ACTIVE_COLOR_END = new THREE.Color(0x00ff88);

export interface RendererConfig {
  backgroundColor: string;
}

export class NeuronRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private network: NeuronNetwork;
  private pulseEngine: PulseEngine;

  private neuronMeshes: Map<number, {
    soma: THREE.Mesh;
    glow: THREE.Mesh;
    dendrites: THREE.Mesh[];
  }> = new Map();

  private synapseLines: Map<string, {
    line: THREE.Line;
    glow: THREE.Line;
    material: THREE.LineBasicMaterial;
  }> = new Map();

  private pulsePoints: Map<string, THREE.Mesh> = new Map();

  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;
  private directionalLight: THREE.DirectionalLight;

  private backgroundColor: THREE.Color = new THREE.Color(0x0a0a1a);
  private targetBackgroundColor: THREE.Color = new THREE.Color(0x0a0a1a);
  private backgroundTransitionSpeed: number = 0.02;

  private onNeuronClickCallback: ((neuronId: number) => void) | null = null;

  private synapseBaseOpacity: number = 0.3;

  constructor(
    container: HTMLElement,
    network: NeuronNetwork,
    pulseEngine: PulseEngine
  ) {
    this.container = container;
    this.network = network;
    this.pulseEngine = pulseEngine;

    this.scene = new THREE.Scene();
    this.scene.background = this.backgroundColor;
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.5;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 30;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0x4a9eff, 0.8, 30);
    this.pointLight.position.set(5, 5, 5);
    this.scene.add(this.pointLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    this.directionalLight.position.set(-5, 10, 5);
    this.scene.add(this.directionalLight);

    this.buildNetworkMeshes();
    this.setupEventListeners();
  }

  private buildNetworkMeshes(): void {
    this.clearNetworkMeshes();

    const neurons = this.network.getNeurons();
    for (const neuron of neurons) {
      this.createNeuronMesh(neuron);
    }

    const synapses = this.network.getSynapses();
    for (const synapse of synapses) {
      this.createSynapseMesh(synapse);
    }
  }

  private clearNetworkMeshes(): void {
    for (const { soma, glow, dendrites } of this.neuronMeshes.values()) {
      this.scene.remove(soma);
      this.scene.remove(glow);
      for (const dendrite of dendrites) {
        this.scene.remove(dendrite);
      }
      soma.geometry.dispose();
      (soma.material as THREE.Material).dispose();
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
      for (const dendrite of dendrites) {
        dendrite.geometry.dispose();
        (dendrite.material as THREE.Material).dispose();
      }
    }
    this.neuronMeshes.clear();

    for (const { line, glow, material } of this.synapseLines.values()) {
      this.scene.remove(line);
      this.scene.remove(glow);
      line.geometry.dispose();
      material.dispose();
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    }
    this.synapseLines.clear();

    for (const point of this.pulsePoints.values()) {
      this.scene.remove(point);
      point.geometry.dispose();
      (point.material as THREE.Material).dispose();
    }
    this.pulsePoints.clear();
  }

  private createNeuronMesh(neuron: Neuron): void {
    const somaGeometry = new THREE.SphereGeometry(neuron.somaRadius, 32, 32);
    const somaMaterial = new THREE.MeshPhongMaterial({
      color: NEURON_COLOR,
      shininess: 80,
      specular: new THREE.Color(0x88ccff),
      emissive: new THREE.Color(0x0a1a2a),
      emissiveIntensity: 0.5,
    });
    const soma = new THREE.Mesh(somaGeometry, somaMaterial);
    soma.position.copy(neuron.position);
    soma.userData.neuronId = neuron.id;
    soma.userData.type = 'soma';
    this.scene.add(soma);

    const glowGeometry = new THREE.SphereGeometry(neuron.somaRadius * 1.4, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: NEURON_COLOR,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(neuron.position);
    this.scene.add(glow);

    const dendriteMeshes: THREE.Mesh[] = [];
    for (const dendrite of neuron.dendrites) {
      const dendriteMesh = this.createDendriteMesh(dendrite);
      dendriteMeshes.push(dendriteMesh);
      this.scene.add(dendriteMesh);
    }

    this.neuronMeshes.set(neuron.id, { soma, glow, dendrites: dendriteMeshes });
  }

  private createDendriteMesh(dendrite: Dendrite): THREE.Mesh {
    const points: THREE.Vector3[] = [];
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push(dendrite.curve.getPoint(t));
    }

    const tubeGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      segments,
      dendrite.radius,
      8,
      false
    );

    const dendriteMaterial = new THREE.MeshPhongMaterial({
      color: NEURON_COLOR,
      shininess: 60,
      specular: new THREE.Color(0x66aadd),
      emissive: new THREE.Color(0x0a1a2a),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
    });

    return new THREE.Mesh(tubeGeometry, dendriteMaterial);
  }

  private createSynapseMesh(synapse: Synapse): void {
    const points = [synapse.fromPosition.clone(), synapse.toPosition.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: SYNAPSE_COLOR,
      transparent: true,
      opacity: this.synapseBaseOpacity,
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    const glowGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const glowMaterial = new THREE.LineBasicMaterial({
      color: SYNAPSE_COLOR,
      transparent: true,
      opacity: 0,
    });
    const glow = new THREE.Line(glowGeometry, glowMaterial);
    this.scene.add(glow);

    this.synapseLines.set(synapse.id, { line, glow, material });
  }

  private createPulsePoint(pulseId: string, intensity: number): void {
    const size = 0.12 * intensity;
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });

    const pulseMesh = new THREE.Mesh(geometry, material);
    pulseMesh.visible = false;
    this.scene.add(pulseMesh);

    this.pulsePoints.set(pulseId, pulseMesh);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onMouseClick(event: MouseEvent): void {
    if (!this.onNeuronClickCallback) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const somaMeshes = Array.from(this.neuronMeshes.values()).map((m) => m.soma);
    const intersects = this.raycaster.intersectObjects(somaMeshes);

    if (intersects.length > 0) {
      const neuronId = intersects[0].object.userData.neuronId;
      if (neuronId !== undefined) {
        this.onNeuronClickCallback(neuronId);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  setOnNeuronClick(callback: (neuronId: number) => void): void {
    this.onNeuronClickCallback = callback;
  }

  setBackgroundColor(color: string): void {
    this.targetBackgroundColor = new THREE.Color(color);
  }

  update(deltaTime: number): void {
    this.controls.update();
    this.updateNeuronColors();
    this.updateSynapseColors();
    this.updatePulses();
    this.updateBackgroundTransition();
  }

  private updateNeuronColors(): void {
    for (const [neuronId, meshes] of this.neuronMeshes) {
      const progress = this.pulseEngine.getNeuronActivationProgress(neuronId);

      const somaMaterial = meshes.soma.material as THREE.MeshPhongMaterial;
      const glowMaterial = meshes.glow.material as THREE.MeshBasicMaterial;

      if (progress > 0) {
        const flashIntensity = this.easeOutQuart(progress);
        
        const color = new THREE.Color().lerpColors(
          NEURON_ACTIVE_COLOR,
          NEURON_GLOW_COLOR,
          1 - flashIntensity
        );
        somaMaterial.color.copy(color);
        somaMaterial.emissive.copy(color);
        somaMaterial.emissiveIntensity = 0.5 + flashIntensity * 1.5;

        glowMaterial.color.copy(NEURON_ACTIVE_COLOR);
        glowMaterial.opacity = flashIntensity * 0.4;

        for (const dendrite of meshes.dendrites) {
          const dendriteMat = dendrite.material as THREE.MeshPhongMaterial;
          dendriteMat.color.copy(color);
          dendriteMat.emissive.copy(color);
          dendriteMat.emissiveIntensity = 0.3 + flashIntensity * 0.8;
        }
      } else {
        somaMaterial.color.copy(NEURON_COLOR);
        somaMaterial.emissive.setHex(0x0a1a2a);
        somaMaterial.emissiveIntensity = 0.5;

        glowMaterial.opacity = 0;

        for (const dendrite of meshes.dendrites) {
          const dendriteMat = dendrite.material as THREE.MeshPhongMaterial;
          dendriteMat.color.copy(NEURON_COLOR);
          dendriteMat.emissive.setHex(0x0a1a2a);
          dendriteMat.emissiveIntensity = 0.3;
        }
      }
    }
  }

  private updateSynapseColors(): void {
    const activePulses = this.pulseEngine.getActivePulses();
    const activeSynapseIds = new Set(activePulses.map((p) => p.synapseId));

    for (const [synapseId, synapseMesh] of this.synapseLines) {
      const material = synapseMesh.material;
      const glowMaterial = synapseMesh.glow.material as THREE.LineBasicMaterial;

      if (activeSynapseIds.has(synapseId)) {
        const pulse = activePulses.find((p) => p.synapseId === synapseId);
        if (pulse) {
          const progress = pulse.direction === 1 ? pulse.progress : 1 - pulse.progress;
          
          let color: THREE.Color;
          if (progress < 0.5) {
            color = new THREE.Color().lerpColors(
              SYNAPSE_ACTIVE_COLOR_START,
              SYNAPSE_ACTIVE_COLOR_MID,
              progress * 2
            );
          } else {
            color = new THREE.Color().lerpColors(
              SYNAPSE_ACTIVE_COLOR_MID,
              SYNAPSE_ACTIVE_COLOR_END,
              (progress - 0.5) * 2
            );
          }

          material.color.copy(color);
          material.opacity = 0.8;
          glowMaterial.color.copy(color);
          glowMaterial.opacity = 0.5;
        }
      } else {
        material.color.copy(SYNAPSE_COLOR);
        material.opacity = this.synapseBaseOpacity;
        glowMaterial.opacity = 0;
      }
    }
  }

  private updatePulses(): void {
    const activePulses = this.pulseEngine.getActivePulses();
    const activePulseIds = new Set(activePulses.map((p) => p.id));

    for (const [pulseId, mesh] of this.pulsePoints) {
      if (!activePulseIds.has(pulseId)) {
        mesh.visible = false;
      }
    }

    for (const pulse of activePulses) {
      let pulseMesh = this.pulsePoints.get(pulse.id);
      if (!pulseMesh) {
        this.createPulsePoint(pulse.id, pulse.intensity);
        pulseMesh = this.pulsePoints.get(pulse.id);
      }

      if (pulseMesh) {
        const position = this.pulseEngine.getPulsePosition(pulse);
        if (position) {
          pulseMesh.position.copy(position);
          pulseMesh.visible = true;

          const material = pulseMesh.material as THREE.MeshBasicMaterial;
          const scale = 0.8 + pulse.intensity * 0.5;
          pulseMesh.scale.setScalar(scale);
          
          const pulseProgress = pulse.direction === 1 ? pulse.progress : 1 - pulse.progress;
          if (pulseProgress < 0.5) {
            material.color.lerpColors(
              SYNAPSE_ACTIVE_COLOR_START,
              SYNAPSE_ACTIVE_COLOR_MID,
              pulseProgress * 2
            );
          } else {
            material.color.lerpColors(
              SYNAPSE_ACTIVE_COLOR_MID,
              SYNAPSE_ACTIVE_COLOR_END,
              (pulseProgress - 0.5) * 2
            );
          }
        }
      }
    }
  }

  private updateBackgroundTransition(): void {
    if (this.backgroundColor.equals(this.targetBackgroundColor)) return;

    this.backgroundColor.lerp(
      this.targetBackgroundColor,
      this.backgroundTransitionSpeed
    );
    this.scene.background = this.backgroundColor;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.backgroundColor);
    }
  }

  private easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  rebuildNetwork(): void {
    this.buildNetworkMeshes();
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onMouseClick.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.clearNetworkMeshes();
    this.renderer.dispose();
    this.controls.dispose();
  }
}
