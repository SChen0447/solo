import * as THREE from 'three';
import type { NodeData } from './data';

export interface NodeObject {
  data: NodeData;
  group: THREE.Group;
  sphere: THREE.Mesh;
  halo: THREE.Sprite;
  shadow: THREE.Sprite;
  label: THREE.Sprite;
  baseScale: number;
  isHovered: boolean;
}

const COLOR_LOW = new THREE.Color(0x00ff88);
const COLOR_HIGH = new THREE.Color(0xff3355);

function createHaloTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 40, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(0, 255, 170, 0)');
  gradient.addColorStop(0.4, 'rgba(0, 255, 170, 0.1)');
  gradient.addColorStop(0.7, 'rgba(0, 255, 170, 0.25)');
  gradient.addColorStop(0.85, 'rgba(0, 255, 170, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 255, 170, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  ctx.beginPath();
  ctx.arc(128, 128, 60, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(128, 128, 80, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createShadowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createLabelTexture(text: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(0, 255, 170, 1)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#00ffaa';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const sharedHaloTexture = createHaloTexture();
const sharedShadowTexture = createShadowTexture();
const sharedSphereGeometry = new THREE.SphereGeometry(1, 32, 32);

export function createNodes(nodeDataList: NodeData[]): NodeObject[] {
  const nodes: NodeObject[] = [];

  for (const data of nodeDataList) {
    const group = new THREE.Group();
    group.position.set(data.x, data.y, data.z);

    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9
    });

    const sphere = new THREE.Mesh(sharedSphereGeometry, sphereMaterial);
    sphere.scale.setScalar(0.5);
    group.add(sphere);

    const haloMaterial = new THREE.SpriteMaterial({
      map: sharedHaloTexture,
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(2.5, 2.5, 1);
    group.add(halo);

    const shadowMaterial = new THREE.SpriteMaterial({
      map: sharedShadowTexture,
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const shadow = new THREE.Sprite(shadowMaterial);
    shadow.position.y = -(data.y + 1);
    shadow.scale.set(1.5, 1.5, 1);
    group.add(shadow);

    const labelTexture = createLabelTexture(data.name);
    const labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const label = new THREE.Sprite(labelMaterial);
    label.position.y = 1.2;
    label.scale.set(3, 0.75, 1);
    group.add(label);

    const node: NodeObject = {
      data,
      group,
      sphere,
      halo,
      shadow,
      label,
      baseScale: 0.5,
      isHovered: false
    };

    nodes.push(node);
  }

  return nodes;
}

export function updateNodes(nodes: NodeObject[], deltaTime: number, globalLoad: number): void {
  for (const node of nodes) {
    const loadRatio = Math.min(1, Math.max(0, (node.data.load + globalLoad * 0.5) / 100));

    const currentColor = new THREE.Color();
    currentColor.lerpColors(COLOR_LOW, COLOR_HIGH, loadRatio);

    const sphereMaterial = node.sphere.material as THREE.MeshPhongMaterial;
    sphereMaterial.color.copy(currentColor);
    sphereMaterial.emissive.copy(currentColor);

    const haloMaterial = node.halo.material as THREE.SpriteMaterial;
    haloMaterial.color.copy(currentColor);

    const targetSize = 0.3 + loadRatio * 0.7;
    const hoverMultiplier = node.isHovered ? 1.5 : 1;
    node.baseScale += (targetSize * hoverMultiplier - node.baseScale) * Math.min(1, deltaTime * 5);
    node.sphere.scale.setScalar(node.baseScale);

    node.halo.scale.setScalar(2.0 + loadRatio * 1.5 + (node.isHovered ? 0.5 : 0));
    haloMaterial.opacity = 0.6 + loadRatio * 0.4;

    const labelMaterial = node.label.material as THREE.SpriteMaterial;
    const targetOpacity = node.isHovered ? 1 : 0;
    labelMaterial.opacity += (targetOpacity - labelMaterial.opacity) * Math.min(1, deltaTime * 8);
  }
}

export function setNodeHovered(node: NodeObject, hovered: boolean): void {
  node.isHovered = hovered;
}
