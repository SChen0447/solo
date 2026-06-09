import * as THREE from 'three';
import type { DatasetType } from './DataLoader';

export interface Annotation {
  id: string;
  name: string;
  description: string;
  position: THREE.Vector3;
  color: number;
  organType: string;
}

export interface AnnotationObject {
  annotation: Annotation;
  sphere: THREE.Mesh;
  sprite: THREE.Sprite;
  group: THREE.Group;
}

const ANNOTATIONS: Record<DatasetType, Annotation[]> = {
  heart: [
    {
      id: 'left-ventricle',
      name: '左心室',
      description: '心脏四个腔室之一，负责将含氧血液泵入主动脉并输送到全身',
      position: new THREE.Vector3(0.1, -0.05, 0),
      color: 0xFF6B6B,
      organType: '心肌'
    },
    {
      id: 'right-ventricle',
      name: '右心室',
      description: '接收来自右心房的缺氧血液，并将其泵入肺动脉进行氧合',
      position: new THREE.Vector3(-0.1, -0.05, 0.05),
      color: 0x4ECDC4,
      organType: '心肌'
    },
    {
      id: 'left-atrium',
      name: '左心房',
      description: '接收来自肺静脉的含氧血液，然后将其输送到左心室',
      position: new THREE.Vector3(0.1, 0.1, -0.08),
      color: 0xFFE66D,
      organType: '心肌'
    },
    {
      id: 'aorta',
      name: '主动脉',
      description: '人体最大的动脉，从左心室出发，向全身输送含氧血液',
      position: new THREE.Vector3(0, 0.3, -0.05),
      color: 0xFF4757,
      organType: '血管'
    }
  ],
  lungs: [
    {
      id: 'left-lung',
      name: '左肺',
      description: '位于胸腔左侧，分为上、下两叶，负责血液的氧合作用',
      position: new THREE.Vector3(-0.2, 0, 0),
      color: 0x74B9FF,
      organType: '肺组织'
    },
    {
      id: 'right-lung',
      name: '右肺',
      description: '位于胸腔右侧，分为上、中、下三叶，容积略大于左肺',
      position: new THREE.Vector3(0.2, 0, 0),
      color: 0x55EFC4,
      organType: '肺组织'
    },
    {
      id: 'trachea',
      name: '气管',
      description: '连接喉部与肺部的气道，由软骨环支撑，负责空气进出肺部',
      position: new THREE.Vector3(0, 0.3, -0.05),
      color: 0xFDCB6E,
      organType: '气道'
    },
    {
      id: 'bronchi',
      name: '支气管',
      description: '气管分叉形成的左右主支气管，进一步分支形成支气管树',
      position: new THREE.Vector3(0, 0.1, -0.03),
      color: 0xE17055,
      organType: '气道'
    }
  ],
  skeleton: [
    {
      id: 'skull',
      name: '颅骨',
      description: '保护大脑的骨性结构，由23块骨头组成（不含听小骨）',
      position: new THREE.Vector3(0, 0.4, 0),
      color: 0xFFEAA7,
      organType: '扁骨'
    },
    {
      id: 'spine',
      name: '脊柱',
      description: '由33块椎骨组成的中轴骨架，支撑身体并保护脊髓',
      position: new THREE.Vector3(0, -0.1, -0.15),
      color: 0xDFE6E9,
      organType: '不规则骨'
    },
    {
      id: 'ribs',
      name: '肋骨',
      description: '共12对，构成胸廓，保护心肺等重要器官并参与呼吸运动',
      position: new THREE.Vector3(0, -0.1, 0.1),
      color: 0xDFF9DC,
      organType: '扁骨'
    },
    {
      id: 'pelvis',
      name: '骨盆',
      description: '由髂骨、坐骨、耻骨融合而成，支撑脊柱并保护盆腔器官',
      position: new THREE.Vector3(0, -0.35, 0),
      color: 0xBBE5ED,
      organType: '不规则骨'
    },
    {
      id: 'femur-left',
      name: '左股骨',
      description: '人体最长最结实的长骨，近端与髋臼构成髋关节',
      position: new THREE.Vector3(-0.18, -0.48, 0),
      color: 0xFAB1A0,
      organType: '长骨'
    },
    {
      id: 'femur-right',
      name: '右股骨',
      description: '人体最长最结实的长骨，近端与髋臼构成髋关节',
      position: new THREE.Vector3(0.18, -0.48, 0),
      color: 0xFAB1A0,
      organType: '长骨'
    }
  ]
};

export class AnnotationManager {
  private scene: THREE.Scene;
  private annotationObjects: AnnotationObject[] = [];
  private currentDataset: DatasetType | null = null;
  private visible: boolean = false;
  private scale: number = 1.0;
  private onClickCallback: ((annotation: Annotation, screenPos: { x: number; y: number }) => void) | null = null;

  constructor(scene: THREE.Scene, _camera: THREE.Camera) {
    this.scene = scene;
  }

  public setOnAnnotationClick(callback: (annotation: Annotation, screenPos: { x: number; y: number }) => void): void {
    this.onClickCallback = callback;
  }

  public loadAnnotations(dataset: DatasetType): void {
    this.clearAnnotations();
    this.currentDataset = dataset;

    const annotations = ANNOTATIONS[dataset] || [];
    annotations.forEach((annotation) => {
      this.createAnnotationObject(annotation);
    });

    this.updateVisibility();
  }

  private createAnnotationObject(annotation: Annotation): void {
    const group = new THREE.Group();

    const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: annotation.color,
      emissive: annotation.color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.userData.annotationId = annotation.id;
    sphere.userData.isAnnotation = true;
    group.add(sphere);

    const sprite = this.createTextSprite(annotation.name, annotation.color);
    sprite.position.set(0, 0.35, 0);
    group.add(sprite);

    const scaledPosition = annotation.position.clone().multiplyScalar(this.scale);
    group.position.copy(scaledPosition);

    this.scene.add(group);

    this.annotationObjects.push({
      annotation,
      sphere,
      sprite,
      group
    });
  }

  private createTextSprite(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const hexColor = '#' + color.toString(16).padStart(6, '0');

    context.font = 'bold 56px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.strokeStyle = '#000000';
    context.lineWidth = 6;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);

    context.fillStyle = hexColor;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.6, 0.15, 1);
    sprite.renderOrder = 999;

    return sprite;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.updateVisibility();
  }

  public toggleVisibility(): boolean {
    this.visible = !this.visible;
    this.updateVisibility();
    return this.visible;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  private updateVisibility(): void {
    this.annotationObjects.forEach((obj) => {
      obj.group.visible = this.visible;
    });
  }

  public setScale(scale: number): void {
    this.scale = scale;
    this.annotationObjects.forEach((obj) => {
      const basePosition = obj.annotation.position.clone();
      obj.group.position.copy(basePosition.multiplyScalar(scale));
      obj.group.scale.setScalar(scale * 0.8 + 0.2);
    });
  }

  public update(camera: THREE.Camera): void {
    this.annotationObjects.forEach((obj) => {
      const distance = camera.position.distanceTo(obj.group.position);
      const scaleFactor = Math.max(0.5, distance * 0.15);
      obj.sprite.scale.set(0.6 * scaleFactor, 0.15 * scaleFactor, 1);
    });
  }

  public findNearestAnnotation(worldPosition: THREE.Vector3): Annotation | null {
    if (this.annotationObjects.length === 0) return null;

    let nearest: AnnotationObject | null = null;
    let minDistance = Infinity;

    this.annotationObjects.forEach((obj) => {
      const distance = worldPosition.distanceTo(obj.group.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = obj;
      }
    });

    return nearest ? (nearest as AnnotationObject).annotation : null;
  }

  public handleClick(
    _mouse: THREE.Vector2,
    raycaster: THREE.Raycaster,
    screenPosition: { x: number; y: number }
  ): boolean {
    if (!this.visible) return false;

    const spheres = this.annotationObjects.map((obj) => obj.sphere);
    const intersects = raycaster.intersectObjects(spheres, false);

    if (intersects.length > 0) {
      const clickedSphere = intersects[0].object as THREE.Mesh;
      const annotationObj = this.annotationObjects.find(
        (obj) => obj.sphere === clickedSphere
      );

      if (annotationObj && this.onClickCallback) {
        this.onClickCallback(annotationObj.annotation, screenPosition);
        return true;
      }
    }

    return false;
  }

  public clearAnnotations(): void {
    this.annotationObjects.forEach((obj) => {
      this.scene.remove(obj.group);
      (obj.sphere.geometry as THREE.BufferGeometry).dispose();
      (obj.sphere.material as THREE.Material).dispose();
      const spriteMat = obj.sprite.material as THREE.SpriteMaterial;
      (spriteMat.map as THREE.Texture)?.dispose();
      spriteMat.dispose();
    });
    this.annotationObjects = [];
    this.currentDataset = null;
  }

  public getAnnotations(): Annotation[] {
    if (!this.currentDataset) return [];
    return ANNOTATIONS[this.currentDataset] || [];
  }

  public dispose(): void {
    this.clearAnnotations();
    this.onClickCallback = null;
  }
}
