import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PlantData, EcosystemData, LayerType, EcosystemType } from './ecosystem';
import { getEcosystemConfig } from './ecosystem';

export interface PlantMesh extends THREE.Group {
  userData: {
    plantData: PlantData;
    isPlant: true;
    targetScale: number;
    targetRotation: number;
  };
}

interface LayerMaterials {
  tree: THREE.MeshLambertMaterial[];
  shrub: THREE.MeshLambertMaterial[];
  herb: THREE.MeshLambertMaterial[];
}

interface HighlightData {
  mesh: PlantMesh;
  outline: THREE.Group;
}

const INITIAL_CAMERA_POSITION = new THREE.Vector3(8.5, 8.5, 8.5);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

export class EcosystemRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private ground: THREE.Mesh;
  private plantGroup: THREE.Group;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private highlightedPlant: HighlightData | null = null;
  private onHoverCallback: ((plant: PlantData | null) => void) | null = null;

  private layerMaterials: LayerMaterials = {
    tree: [],
    shrub: [],
    herb: []
  };

  private growingPlants: { mesh: PlantMesh; startTime: number; duration: number }[] = [];

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0b1a);
    this.scene.fog = new THREE.Fog(0x0b0b1a, 20, 40);

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.copy(INITIAL_CAMERA_POSITION);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 25;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.copy(INITIAL_CAMERA_TARGET);

    this.ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.directionalLight.shadow.bias = -0.0005;
    this.setSunAngle(30);
    this.scene.add(this.directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5a2a, 0.3);
    this.scene.add(hemiLight);

    this.ground = this.createGround();
    this.scene.add(this.ground);

    this.plantGroup = new THREE.Group();
    this.scene.add(this.plantGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(12, 12, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a2f1a,
      transparent: true,
      opacity: 0.6,
      roughness: 0.9,
      metalness: 0.0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;

    const gridHelper = new THREE.GridHelper(12, 24, 0xffffff, 0xffffff);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.08;
    mesh.add(gridHelper);

    return mesh;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  private onResize(): void {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  public setOnHoverCallback(callback: (plant: PlantData | null) => void): void {
    this.onHoverCallback = callback;
  }

  public setSunAngle(angleDeg: number): void {
    const angleRad = (angleDeg * Math.PI) / 180;
    const distance = 15;
    const height = Math.cos(angleRad) * distance;
    const horizontal = Math.sin(angleRad) * distance;

    this.directionalLight.position.set(horizontal, Math.abs(height) + 2, horizontal * 0.5);
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();

    const normalizedAngle = (angleDeg + 60) / 120;
    this.directionalLight.intensity = 0.6 + normalizedAngle * 0.9;
    const warmColor = new THREE.Color(0xffd4a3);
    const coolColor = new THREE.Color(0xffffff);
    this.directionalLight.color.copy(coolColor).lerp(warmColor, 1 - normalizedAngle);
  }

  public setLayerOpacity(layer: LayerType, opacity: number): void {
    this.layerMaterials[layer].forEach(mat => {
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
      mat.needsUpdate = true;
    });
  }

  public loadEcosystem(data: EcosystemData): void {
    this.clearPlants();
    this.clearHighlight();

    const config = getEcosystemConfig(data.type);
    (this.ground.material as THREE.MeshStandardMaterial).color.set(config.groundColor);

    this.layerMaterials = { tree: [], shrub: [], herb: [] };

    data.plants.forEach((plantData, index) => {
      const mesh = this.createPlantMesh(plantData, data.type);
      mesh.scale.setScalar(0.01);
      mesh.rotation.y = plantData.rotation - Math.PI / 6;
      this.plantGroup.add(mesh);

      this.growingPlants.push({
        mesh,
        startTime: performance.now() + index * 3,
        duration: 2000
      });
    });
  }

  private clearPlants(): void {
    while (this.plantGroup.children.length > 0) {
      const child = this.plantGroup.children[0];
      this.plantGroup.remove(child);
      this.disposeObject(child);
    }
    this.growingPlants = [];
  }

  private disposeObject(obj: THREE.Object3D): void {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material?.dispose();
      }
    }
    obj.children.forEach(child => this.disposeObject(child));
  }

  private createPlantMesh(plantData: PlantData, ecosystemType: EcosystemType): PlantMesh {
    const group = new THREE.Group() as PlantMesh;
    group.userData = {
      plantData,
      isPlant: true,
      targetScale: 1,
      targetRotation: plantData.rotation
    };
    group.position.set(plantData.position.x, 0, plantData.position.z);

    if (ecosystemType === 'desert' && plantData.layer === 'shrub') {
      this.createCactus(group, plantData);
    } else if (plantData.layer === 'tree') {
      this.createTree(group, plantData);
    } else if (plantData.layer === 'shrub') {
      this.createShrub(group, plantData);
    } else {
      this.createHerb(group, plantData);
    }

    return group;
  }

  private createMaterial(color: string, layer: LayerType): THREE.MeshLambertMaterial {
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color),
      transparent: false,
      opacity: 1
    });
    this.layerMaterials[layer].push(material);
    return material;
  }

  private createTree(group: PlantMesh, data: PlantData): void {
    const trunkHeight = data.height * 0.5;
    const trunkRadius = data.crownDiameter * 0.12;
    const crownHeight = data.height * 0.6;
    const crownRadius = data.crownDiameter * 0.55;

    const trunkGeo = new THREE.CylinderGeometry(
      trunkRadius * 0.7,
      trunkRadius,
      trunkHeight,
      8
    );
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const crownGeo = new THREE.SphereGeometry(crownRadius, 12, 8);
    const crownMat = this.createMaterial(data.color, 'tree');
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = trunkHeight + crownHeight * 0.35;
    crown.scale.y = 1.3;
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);

    const crown2Geo = new THREE.SphereGeometry(crownRadius * 0.7, 10, 7);
    const crown2 = new THREE.Mesh(crown2Geo, crownMat);
    crown2.position.set(
      crownRadius * 0.3,
      trunkHeight + crownHeight * 0.5,
      crownRadius * 0.2
    );
    crown2.castShadow = true;
    group.add(crown2);
  }

  private createShrub(group: PlantMesh, data: PlantData): void {
    const coneHeight = data.height * 1.1;
    const coneRadius = data.crownDiameter * 0.55;

    const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 10);
    const coneMat = this.createMaterial(data.color, 'shrub');
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = coneHeight / 2;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);

    const cone2Geo = new THREE.ConeGeometry(coneRadius * 0.6, coneHeight * 0.65, 8);
    const cone2 = new THREE.Mesh(cone2Geo, coneMat);
    cone2.position.set(coneRadius * 0.25, coneHeight * 0.4, -coneRadius * 0.15);
    cone2.castShadow = true;
    group.add(cone2);
  }

  private createHerb(group: PlantMesh, data: PlantData): void {
    const height = data.height;
    const radius = data.crownDiameter * 0.5;

    const coneGeo = new THREE.ConeGeometry(radius, height, 6);
    const coneMat = this.createMaterial(data.color, 'herb');
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = height / 2;
    cone.castShadow = true;
    group.add(cone);
  }

  private createCactus(group: PlantMesh, data: PlantData): void {
    const height = data.height;
    const radius = data.crownDiameter * 0.3;

    const mainGeo = new THREE.CylinderGeometry(radius * 0.85, radius, height, 10);
    const mainMat = this.createMaterial(data.color, 'shrub');
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.position.y = height / 2;
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);

    const topGeo = new THREE.SphereGeometry(radius * 0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const top = new THREE.Mesh(topGeo, mainMat);
    top.position.y = height;
    top.castShadow = true;
    group.add(top);

    if (height > 1) {
      const armHeight = height * 0.45;
      const armRadius = radius * 0.55;
      const armGeo = new THREE.CylinderGeometry(armRadius * 0.9, armRadius, armHeight, 8);

      const arm1 = new THREE.Mesh(armGeo, mainMat);
      arm1.position.set(radius * 1.2, height * 0.55, 0);
      arm1.rotation.z = -Math.PI / 4;
      arm1.castShadow = true;
      group.add(arm1);

      const arm2 = new THREE.Mesh(armGeo, mainMat);
      arm2.position.set(-radius * 1.2, height * 0.4, 0);
      arm2.rotation.z = Math.PI / 4;
      arm2.castShadow = true;
      group.add(arm2);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public update(): void {
    const now = performance.now();

    this.growingPlants = this.growingPlants.filter(item => {
      const elapsed = now - item.startTime;
      if (elapsed <= 0) return true;

      const progress = Math.min(elapsed / item.duration, 1);
      const eased = this.easeOutCubic(progress);

      item.mesh.scale.setScalar(eased);
      const startRot = item.mesh.userData.targetRotation - Math.PI / 6;
      item.mesh.rotation.y = startRot + (Math.PI / 6) * eased;

      if (progress >= 1) {
        item.mesh.scale.setScalar(1);
        item.mesh.rotation.y = item.mesh.userData.targetRotation;
        return false;
      }
      return true;
    });

    this.checkHover();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.plantGroup.children, true);

    let hitPlant: PlantMesh | null = null;
    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object;
      while (obj) {
        if ((obj as PlantMesh).userData?.isPlant) {
          hitPlant = obj as PlantMesh;
          break;
        }
        obj = obj.parent;
      }
      if (hitPlant) break;
    }

    if (hitPlant) {
      if (!this.highlightedPlant || this.highlightedPlant.mesh !== hitPlant) {
        this.clearHighlight();
        this.addHighlight(hitPlant);
        this.onHoverCallback?.(hitPlant.userData.plantData);
      }
    } else if (this.highlightedPlant) {
      this.clearHighlight();
      this.onHoverCallback?.(null);
    }
  }

  private addHighlight(mesh: PlantMesh): void {
    const outlineGroup = new THREE.Group();
    const meshes: { outline: THREE.LineSegments; edgeGeo: THREE.EdgesGeometry }[] = [];

    mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const edgeGeo = new THREE.EdgesGeometry(child.geometry);
        const outlineMat = new THREE.LineBasicMaterial({
          color: 0xff6b6b,
          transparent: true,
          opacity: 0.9
        });
        const outline = new THREE.LineSegments(edgeGeo, outlineMat);
        outlineGroup.add(outline);
        meshes.push({ outline, edgeGeo });
      }
    });

    if (meshes.length === 0) return;

    mesh.add(outlineGroup);
    this.highlightedPlant = { mesh, outline: outlineGroup };
  }

  private clearHighlight(): void {
    if (this.highlightedPlant) {
      const outlineGroup = this.highlightedPlant.outline;
      this.highlightedPlant.mesh.remove(outlineGroup);
      outlineGroup.traverse(child => {
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.highlightedPlant = null;
    }
  }

  public resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();
    const duration = 800;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(t);

      this.camera.position.lerpVectors(startPos, INITIAL_CAMERA_POSITION, eased);
      this.controls.target.lerpVectors(startTarget, INITIAL_CAMERA_TARGET, eased);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  public dispose(): void {
    this.clearPlants();
    this.renderer.dispose();
    this.controls.dispose();
    window.removeEventListener('resize', () => this.onResize());
  }
}
