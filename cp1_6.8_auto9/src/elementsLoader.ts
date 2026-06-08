import * as THREE from 'three';
import { ELEMENTS, CATEGORY_COLORS, type ElementData } from './elementsData';

export interface ElementMeshInfo {
  index: number;
  element: ElementData;
  basePosition: THREE.Vector3;
  hoverPosition: THREE.Vector3;
  baseScale: number;
  hoverScale: number;
  filteredScale: number;
  isHovered: boolean;
  isFiltered: boolean;
  baseColor: THREE.Color;
  filteredColor: THREE.Color;
  currentPosition: THREE.Vector3;
  currentScale: number;
  currentColor: THREE.Color;
  textSprite?: THREE.Sprite;
}

export interface ElementsLoaderResult {
  instancedMesh: THREE.InstancedMesh;
  elementsInfo: ElementMeshInfo[];
  boundingBox: THREE.Box3;
  baseGroupOffset: THREE.Vector3;
  textGroup: THREE.Group;
}

const CARD_WIDTH = 1;
const CARD_HEIGHT = 1;
const CARD_GAP = 0.2;
const ROW_GAP = 0.3;

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

function createTextTexture(symbol: string, atomicNumber: number, color: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  ctx.font = 'bold 100px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(symbol, size / 2, size / 2 - 20);

  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 2;
  ctx.fillText(atomicNumber.toString(), size / 2, size / 2 + 50);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createElements(): ElementsLoaderResult {
  const isMobile = window.innerWidth < 768;
  const scaleMultiplier = isMobile ? 1.2 : 1;

  const cardGeometry = new THREE.ExtrudeGeometry(
    createRoundedRectShape(CARD_WIDTH * scaleMultiplier, CARD_HEIGHT * scaleMultiplier, 0.1 * scaleMultiplier),
    { depth: 0.08, bevelEnabled: false }
  );
  cardGeometry.center();

  const cardMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.15,
  });

  const instancedMesh = new THREE.InstancedMesh(cardGeometry, cardMaterial, ELEMENTS.length);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const elementsInfo: ElementMeshInfo[] = [];
  const boundingBox = new THREE.Box3();
  const textGroup = new THREE.Group();

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  ELEMENTS.forEach((element, index) => {
    const x = (element.col - 1) * (CARD_WIDTH + CARD_GAP) * scaleMultiplier;
    const z = (element.row - 1) * (CARD_HEIGHT + ROW_GAP) * scaleMultiplier * -1;

    const baseScale = scaleMultiplier;
    const basePos = new THREE.Vector3(x, 0, z);
    const hoverPos = new THREE.Vector3(x, 0.3, z);

    const categoryColor = CATEGORY_COLORS[element.category];
    const baseColor = new THREE.Color(categoryColor);
    const filteredColor = new THREE.Color(0x555555);

    dummy.position.copy(basePos);
    dummy.scale.setScalar(baseScale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, dummy.matrix);

    color.copy(baseColor);
    instancedMesh.setColorAt(index, color);

    const textTexture = createTextTexture(element.symbol, element.atomicNumber, categoryColor);
    const textMaterial = new THREE.SpriteMaterial({
      map: textTexture,
      transparent: true,
      depthTest: false,
    });
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.position.set(x, 0.05, z);
    textSprite.scale.set(0.85 * scaleMultiplier, 0.85 * scaleMultiplier, 1);
    textGroup.add(textSprite);

    const info: ElementMeshInfo = {
      index,
      element,
      basePosition: basePos.clone(),
      hoverPosition: hoverPos.clone(),
      baseScale,
      hoverScale: baseScale * 1.1,
      filteredScale: baseScale * 0.8,
      isHovered: false,
      isFiltered: false,
      baseColor: baseColor.clone(),
      filteredColor,
      currentPosition: basePos.clone(),
      currentScale: baseScale,
      currentColor: baseColor.clone(),
      textSprite,
    };

    elementsInfo.push(info);
    boundingBox.expandByPoint(basePos);
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }

  const center = boundingBox.getCenter(new THREE.Vector3());
  instancedMesh.position.set(-center.x, 0, -center.z);
  textGroup.position.set(-center.x, 0, -center.z);

  const offset = new THREE.Vector3(-center.x, 0, -center.z);

  elementsInfo.forEach((info) => {
    info.basePosition.add(offset);
    info.hoverPosition.add(offset);
    info.currentPosition.add(offset);
    if (info.textSprite) {
      info.textSprite.position.add(offset);
    }
  });

  boundingBox.translate(offset);

  return { instancedMesh, elementsInfo, boundingBox, baseGroupOffset: offset, textGroup };
}

export function updateElementInstances(
  instancedMesh: THREE.InstancedMesh,
  elementsInfo: ElementMeshInfo[],
  deltaTime: number,
  animationSpeed: number = 6
): void {
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const lerpFactor = 1 - Math.exp(-deltaTime * animationSpeed);

  elementsInfo.forEach((info, index) => {
    const targetPosition = info.isHovered ? info.hoverPosition : info.basePosition;
    const targetScale = info.isFiltered ? info.filteredScale : (info.isHovered ? info.hoverScale : info.baseScale);
    const targetColor = info.isFiltered ? info.filteredColor : info.baseColor;

    const posChanged = !info.currentPosition.equals(targetPosition);
    const scaleChanged = Math.abs(info.currentScale - targetScale) > 0.001;
    const colorChanged = !info.currentColor.equals(targetColor);

    if (posChanged) {
      info.currentPosition.lerp(targetPosition, lerpFactor);
    }
    if (scaleChanged) {
      info.currentScale += (targetScale - info.currentScale) * lerpFactor;
    }
    if (colorChanged) {
      info.currentColor.lerp(targetColor, lerpFactor);
    }

    if (posChanged || scaleChanged) {
      dummy.position.copy(info.currentPosition);
      dummy.scale.setScalar(info.currentScale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index, dummy.matrix);
    }

    if (colorChanged) {
      color.copy(info.currentColor);
      instancedMesh.setColorAt(index, color);
    }

    if (info.textSprite && (posChanged || scaleChanged)) {
      info.textSprite.position.copy(info.currentPosition);
      info.textSprite.position.y += 0.05;
      info.textSprite.scale.set(
        0.85 * info.currentScale,
        0.85 * info.currentScale,
        1
      );
    }
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }
}

export function setElementHovered(info: ElementMeshInfo, hovered: boolean): void {
  info.isHovered = hovered;
}

export function setElementFiltered(info: ElementMeshInfo, filtered: boolean): void {
  info.isFiltered = filtered;
}
