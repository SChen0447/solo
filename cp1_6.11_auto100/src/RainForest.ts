import * as THREE from 'three';
import { gsap } from 'gsap';

export interface LayerConfig {
  name: string;
  yRange: [number, number];
  centerY: number;
  fogColor: string;
  plantTypes: PlantType[];
  animalType: AnimalType;
  maxPlants: number;
  maxAnimals: number;
}

export interface PlantType {
  name: string;
  color: string;
  heightRange: [number, number];
  radiusRange: [number, number];
  info: string;
}

export interface AnimalType {
  name: string;
  color: string;
  size: number;
  info: string;
}

export interface LayerData {
  group: THREE.Group;
  plants: THREE.Group[];
  animals: THREE.Group[];
  config: LayerConfig;
}

const LAYER_CONFIGS: LayerConfig[] = [
  {
    name: '地面层',
    yRange: [0, 5],
    centerY: 2.5,
    fogColor: '#0a2a0a',
    plantTypes: [
      { name: '苔藓', color: '#1a3a1a', heightRange: [0.2, 0.5], radiusRange: [0.3, 0.8], info: '苔藓植物，适应阴湿环境' },
      { name: '蕨类', color: '#2a4a2a', heightRange: [0.5, 1.5], radiusRange: [0.5, 1.2], info: '蕨类植物，古老的孢子植物' }
    ],
    animalType: { name: '蜘蛛', color: '#1a1a1a', size: 0.3, info: '雨林蜘蛛，地面捕食者' },
    maxPlants: 15,
    maxAnimals: 5
  },
  {
    name: '灌木层',
    yRange: [5, 15],
    centerY: 10,
    fogColor: '#1a4a1a',
    plantTypes: [
      { name: '灌木', color: '#2a5a2a', heightRange: [3, 6], radiusRange: [1, 2], info: '灌木丛，提供栖息环境' },
      { name: '藤本', color: '#3a6a3a', heightRange: [4, 8], radiusRange: [0.3, 0.6], info: '藤本植物，攀援生长' }
    ],
    animalType: { name: '蝴蝶', color: '#ff6b9d', size: 0.4, info: '热带蝴蝶，翅膀色彩斑斓' },
    maxPlants: 15,
    maxAnimals: 5
  },
  {
    name: '树冠层',
    yRange: [15, 35],
    centerY: 25,
    fogColor: '#1a5a2a',
    plantTypes: [
      { name: '巨树干', color: '#4a3a2a', heightRange: [10, 18], radiusRange: [1.5, 3], info: '高大乔木，雨林的主体' },
      { name: '宽叶树', color: '#3a8a3a', heightRange: [8, 15], radiusRange: [3, 6], info: '阔叶树，光合作用强烈' }
    ],
    animalType: { name: '猴子', color: '#8b4513', size: 0.8, info: '树栖猴子，灵活敏捷' },
    maxPlants: 15,
    maxAnimals: 5
  },
  {
    name: '露生层',
    yRange: [35, 50],
    centerY: 42.5,
    fogColor: '#2a5a2a',
    plantTypes: [
      { name: '露生木', color: '#4a9a4a', heightRange: [8, 12], radiusRange: [2, 4], info: '露生层乔木，高出林冠' },
      { name: '高位芽', color: '#5aaa5a', heightRange: [6, 10], radiusRange: [1.5, 3], info: '高位芽植物，适应强光' }
    ],
    animalType: { name: '雄鹰', color: '#f5f5f5', size: 1.0, info: '猛禽，翱翔于林冠之上' },
    maxPlants: 15,
    maxAnimals: 5
  }
];

export class RainForest {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private layers: LayerData[] = [];
  private currentLayerIndex: number = 0;
  private ground: THREE.Mesh | null = null;
  private reflectionPlane: THREE.Mesh | null = null;
  private animalAnimations: Map<THREE.Group, { baseY: number; phase: number; speed: number }> = new Map();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.createGround();
    this.createLayers();
    this.createReflectionPlane();
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: '#3d5c3d',
      transparent: true,
      opacity: 0.9,
      roughness: 0.8
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private createReflectionPlane(): void {
    const geometry = new THREE.PlaneGeometry(100, 100, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: '#4a6a4a',
      transparent: true,
      opacity: 0,
      roughness: 0.1,
      metalness: 0.3
    });
    this.reflectionPlane = new THREE.Mesh(geometry, material);
    this.reflectionPlane.rotation.x = -Math.PI / 2;
    this.reflectionPlane.position.y = 0.01;
    this.scene.add(this.reflectionPlane);
  }

  setReflectionOpacity(opacity: number): void {
    if (this.reflectionPlane) {
      gsap.to(this.reflectionPlane.material, {
        opacity: opacity,
        duration: 1.2,
        ease: 'power1.inOut'
      });
    }
  }

  private createLayers(): void {
    LAYER_CONFIGS.forEach((config, index) => {
      const layerGroup = new THREE.Group();
      layerGroup.name = `layer-${config.name}`;
      layerGroup.userData.layerIndex = index;

      const plants: THREE.Group[] = [];
      const animals: THREE.Group[] = [];

      for (let i = 0; i < config.maxPlants; i++) {
        const plantType = config.plantTypes[Math.floor(Math.random() * config.plantTypes.length)];
        const plant = this.createPlant(plantType, config.yRange, index);
        plant.userData = { type: 'plant', layerIndex: index, ...plantType };
        plants.push(plant);
        layerGroup.add(plant);
      }

      for (let i = 0; i < config.maxAnimals; i++) {
        const animal = this.createAnimal(config.animalType, config.yRange, index);
        animal.userData = { type: 'animal', layerIndex: index, ...config.animalType };
        animals.push(animal);
        layerGroup.add(animal);
      }

      this.layers.push({
        group: layerGroup,
        plants,
        animals,
        config
      });

      this.scene.add(layerGroup);
    });
  }

  private createPlant(plantType: PlantType, yRange: [number, number], layerIndex: number): THREE.Group {
    const group = new THREE.Group();

    const height = plantType.heightRange[0] + Math.random() * (plantType.heightRange[1] - plantType.heightRange[0]);
    const radius = plantType.radiusRange[0] + Math.random() * (plantType.radiusRange[1] - plantType.radiusRange[0]);

    const segments = layerIndex < 2 ? 8 : 12;

    if (plantType.name === '苔藓' || plantType.name === '蕨类') {
      const baseGeo = new THREE.CylinderGeometry(radius * 0.8, radius, height * 0.3, segments);
      const topGeo = new THREE.ConeGeometry(radius, height * 0.7, segments);

      const material = new THREE.MeshStandardMaterial({
        color: plantType.color,
        roughness: 0.9,
        flatShading: true
      });

      const base = new THREE.Mesh(baseGeo, material);
      base.position.y = height * 0.15;
      base.castShadow = true;

      const top = new THREE.Mesh(topGeo, material.clone());
      top.position.y = height * 0.3 + height * 0.35;
      top.castShadow = true;

      group.add(base);
      group.add(top);
    } else if (plantType.name === '灌木' || plantType.name === '藤本') {
      const trunkGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.3, height * 0.5, segments);
      const foliageGeo = new THREE.SphereGeometry(radius, segments, segments);

      const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 0.9 });
      const foliageMat = new THREE.MeshStandardMaterial({ color: plantType.color, roughness: 0.8 });

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = height * 0.25;
      trunk.castShadow = true;

      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = height * 0.5 + radius * 0.6;
      foliage.scale.y = 0.8;
      foliage.castShadow = true;

      group.add(trunk);
      group.add(foliage);
    } else {
      const trunkGeo = new THREE.CylinderGeometry(radius * 0.15, radius * 0.25, height, segments);
      const crownGeo1 = new THREE.SphereGeometry(radius, segments, segments);
      const crownGeo2 = new THREE.SphereGeometry(radius * 0.8, segments, segments);
      const crownGeo3 = new THREE.SphereGeometry(radius * 0.6, segments, segments);

      const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 0.9 });
      const crownMat = new THREE.MeshStandardMaterial({ color: plantType.color, roughness: 0.7 });

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = height * 0.5;
      trunk.castShadow = true;

      const crown1 = new THREE.Mesh(crownGeo1, crownMat);
      crown1.position.y = height + radius * 0.2;
      crown1.castShadow = true;

      const crown2 = new THREE.Mesh(crownGeo2, crownMat.clone());
      crown2.position.set(radius * 0.5, height + radius * 0.5, radius * 0.3);
      crown2.castShadow = true;

      const crown3 = new THREE.Mesh(crownGeo3, crownMat.clone());
      crown3.position.set(-radius * 0.4, height + radius * 0.7, -radius * 0.2);
      crown3.castShadow = true;

      group.add(trunk);
      group.add(crown1);
      group.add(crown2);
      group.add(crown3);
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 35;
    const baseY = yRange[0];

    group.position.set(
      Math.cos(angle) * distance,
      baseY,
      Math.sin(angle) * distance
    );
    group.rotation.y = Math.random() * Math.PI * 2;

    return group;
  }

  private createAnimal(animalType: AnimalType, yRange: [number, number], layerIndex: number): THREE.Group {
    const group = new THREE.Group();

    if (animalType.name === '蜘蛛') {
      const bodyGeo = new THREE.SphereGeometry(animalType.size * 0.4, 8, 8);
      const legGeo = new THREE.CylinderGeometry(animalType.size * 0.05, animalType.size * 0.05, animalType.size * 0.8, 4);

      const bodyMat = new THREE.MeshStandardMaterial({ color: animalType.color, roughness: 0.5 });

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      group.add(body);

      for (let i = 0; i < 8; i++) {
        const leg = new THREE.Mesh(legGeo, bodyMat.clone());
        const angle = (i / 8) * Math.PI * 2;
        leg.position.set(Math.cos(angle) * animalType.size * 0.3, 0, Math.sin(angle) * animalType.size * 0.3);
        leg.rotation.z = Math.PI / 4;
        leg.rotation.y = angle;
        leg.castShadow = true;
        group.add(leg);
      }
    } else if (animalType.name === '蝴蝶') {
      const bodyGeo = new THREE.CylinderGeometry(animalType.size * 0.08, animalType.size * 0.08, animalType.size * 0.4, 6);
      const wingGeo = new THREE.BoxGeometry(animalType.size * 0.5, animalType.size * 0.02, animalType.size * 0.35);

      const bodyMat = new THREE.MeshStandardMaterial({ color: '#333333', roughness: 0.5 });
      const wingMat1 = new THREE.MeshStandardMaterial({ color: '#ff6b9d', roughness: 0.3, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      const wingMat2 = new THREE.MeshStandardMaterial({ color: '#6b9dff', roughness: 0.3, transparent: true, opacity: 0.9, side: THREE.DoubleSide });

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      group.add(body);

      const wing1 = new THREE.Mesh(wingGeo, wingMat1);
      wing1.position.x = animalType.size * 0.3;
      wing1.userData.isWing = true;
      group.add(wing1);

      const wing2 = new THREE.Mesh(wingGeo, wingMat2);
      wing2.position.x = -animalType.size * 0.3;
      wing2.userData.isWing = true;
      group.add(wing2);
    } else if (animalType.name === '猴子') {
      const bodyGeo = new THREE.BoxGeometry(animalType.size * 0.6, animalType.size * 0.8, animalType.size * 0.5);
      const headGeo = new THREE.SphereGeometry(animalType.size * 0.3, 8, 8);
      const limbGeo = new THREE.CylinderGeometry(animalType.size * 0.1, animalType.size * 0.1, animalType.size * 0.6, 6);

      const mat = new THREE.MeshStandardMaterial({ color: animalType.color, roughness: 0.7 });

      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = animalType.size * 0.3;
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(headGeo, mat.clone());
      head.position.y = animalType.size * 0.9;
      head.castShadow = true;
      group.add(head);

      const eyeGeo = new THREE.SphereGeometry(animalType.size * 0.05, 4, 4);
      const eyeMat = new THREE.MeshBasicMaterial({ color: '#000000' });
      const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
      const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
      eye1.position.set(animalType.size * 0.1, animalType.size * 0.95, animalType.size * 0.25);
      eye2.position.set(-animalType.size * 0.1, animalType.size * 0.95, animalType.size * 0.25);
      group.add(eye1, eye2);

      const arm1 = new THREE.Mesh(limbGeo, mat.clone());
      arm1.position.set(animalType.size * 0.4, animalType.size * 0.3, 0);
      arm1.castShadow = true;
      group.add(arm1);

      const arm2 = new THREE.Mesh(limbGeo, mat.clone());
      arm2.position.set(-animalType.size * 0.4, animalType.size * 0.3, 0);
      arm2.castShadow = true;
      group.add(arm2);

      const leg1 = new THREE.Mesh(limbGeo, mat.clone());
      leg1.position.set(animalType.size * 0.2, -animalType.size * 0.3, 0);
      leg1.castShadow = true;
      group.add(leg1);

      const leg2 = new THREE.Mesh(limbGeo, mat.clone());
      leg2.position.set(-animalType.size * 0.2, -animalType.size * 0.3, 0);
      leg2.castShadow = true;
      group.add(leg2);

      const tailGeo = new THREE.CylinderGeometry(animalType.size * 0.06, animalType.size * 0.02, animalType.size * 0.7, 6);
      const tail = new THREE.Mesh(tailGeo, mat.clone());
      tail.position.set(0, animalType.size * 0.1, -animalType.size * 0.4);
      tail.rotation.x = Math.PI / 3;
      tail.castShadow = true;
      group.add(tail);
    } else if (animalType.name === '雄鹰') {
      const bodyGeo = new THREE.ConeGeometry(animalType.size * 0.3, animalType.size * 0.8, 8);
      const wingGeo = new THREE.BoxGeometry(animalType.size * 1.2, animalType.size * 0.05, animalType.size * 0.3);

      const bodyMat = new THREE.MeshStandardMaterial({ color: animalType.color, roughness: 0.4 });
      const wingMat = new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.3 });

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(animalType.size * 0.15, 8, 8);
      const head = new THREE.Mesh(headGeo, bodyMat.clone());
      head.position.z = animalType.size * 0.5;
      head.castShadow = true;
      group.add(head);

      const beakGeo = new THREE.ConeGeometry(animalType.size * 0.08, animalType.size * 0.2, 4);
      const beakMat = new THREE.MeshStandardMaterial({ color: '#ffd700' });
      const beak = new THREE.Mesh(beakGeo, beakMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.z = animalType.size * 0.65;
      group.add(beak);

      const wing1 = new THREE.Mesh(wingGeo, wingMat);
      wing1.position.y = animalType.size * 0.05;
      wing1.userData.isWing = true;
      group.add(wing1);
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = 8 + Math.random() * 25;
    const yPos = yRange[0] + 1 + Math.random() * (yRange[1] - yRange[0] - 2);

    group.position.set(
      Math.cos(angle) * distance,
      yPos,
      Math.sin(angle) * distance
    );

    this.animalAnimations.set(group, {
      baseY: yPos,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5
    });

    return group;
  }

  switchLayer(index: number): void {
    if (index < 0 || index >= this.layers.length || index === this.currentLayerIndex) return;

    this.currentLayerIndex = index;
    const targetY = this.layers[index].config.centerY;

    gsap.to(this.camera.position, {
      y: targetY,
      duration: 1,
      ease: 'power2.out'
    });

    this.updateLayerVisibility();
  }

  updateLayerVisibility(): void {
    const cameraY = this.camera.position.y;

    this.layers.forEach((layer, index) => {
      let visible = true;

      if (cameraY < 5 && index >= 2) {
        visible = false;
      }

      layer.group.visible = visible;
    });
  }

  update(delta: number, time: number): void {
    this.animalAnimations.forEach((animData, animal) => {
      const type = animal.userData.name;
      const baseY = animData.baseY;
      const phase = animData.phase;
      const speed = animData.speed;

      if (type === '蝴蝶') {
        animal.position.y = baseY + Math.sin(time * speed + phase) * 0.5;
        animal.rotation.y = Math.sin(time * speed * 0.5 + phase) * 0.5;

        animal.children.forEach((child) => {
          if (child.userData.isWing) {
            child.rotation.y = Math.sin(time * 8) * 0.6;
          }
        });
      } else if (type === '蜘蛛') {
        animal.position.x += Math.sin(time * speed + phase) * 0.01;
        animal.position.z += Math.cos(time * speed * 0.7 + phase) * 0.01;
      } else if (type === '猴子') {
        animal.rotation.y = time * speed * 0.3;
        animal.position.y = baseY + Math.sin(time * speed + phase) * 0.3;
      } else if (type === '雄鹰') {
        animal.position.x += Math.cos(time * speed * 0.3 + phase) * 0.02;
        animal.position.y = baseY + Math.sin(time * speed * 0.5 + phase) * 1;
        animal.rotation.y = Math.atan2(
          Math.cos(time * speed * 0.3 + phase),
          -Math.sin(time * speed * 0.3 + phase) * 0.02
        );

        animal.children.forEach((child) => {
          if (child.userData.isWing) {
            child.rotation.z = Math.sin(time * 4) * 0.2;
          }
        });
      }
    });

    this.updateLayerVisibility();
  }

  getCurrentLayerIndex(): number {
    return this.currentLayerIndex;
  }

  getLayers(): LayerData[] {
    return this.layers;
  }

  getLayerConfig(index: number): LayerConfig {
    return LAYER_CONFIGS[index];
  }

  getInteractiveObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    this.layers.forEach((layer) => {
      layer.plants.forEach((plant) => objects.push(plant));
      layer.animals.forEach((animal) => objects.push(animal));
    });
    return objects;
  }

  reduceGeometryDetail(): void {
    this.layers.forEach((layer) => {
      layer.plants.forEach((plant) => {
        plant.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry instanceof THREE.CylinderGeometry) {
              child.geometry = new THREE.CylinderGeometry(
                child.geometry.parameters.radiusTop,
                child.geometry.parameters.radiusBottom,
                child.geometry.parameters.height,
                4
              );
            } else if (child.geometry instanceof THREE.SphereGeometry) {
              child.geometry = new THREE.SphereGeometry(
                child.geometry.parameters.radius,
                4,
                4
              );
            } else if (child.geometry instanceof THREE.ConeGeometry) {
              child.geometry = new THREE.ConeGeometry(
                child.geometry.parameters.radius,
                child.geometry.parameters.height,
                4
              );
            }
          }
        });
      });
    });
  }
}
