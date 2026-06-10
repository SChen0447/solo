import * as THREE from 'three';
import type { LineData, NodeData } from './data';

export interface LineObject {
  data: LineData;
  group: THREE.Group;
  lineMesh: THREE.Mesh;
  pulseBalls: THREE.Mesh[];
  pulseOffsets: number[];
  lineLength: number;
  baseWidth: number;
}

const COLOR_LOW = new THREE.Color(0x00aaff);
const COLOR_HIGH = new THREE.Color(0xffaa00);
const sharedPulseGeometry = new THREE.SphereGeometry(0.04, 12, 12);

function createLineGeometry(length: number, colorStart: THREE.Color, colorEnd: THREE.Color): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(1, 1, length, 8, 1, true);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0, length / 2);

  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const z = geometry.attributes.position.getZ(i);
    const t = z / length;
    const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function createLines(
  lineDataList: LineData[],
  nodesMap: Map<number, NodeData>
): LineObject[] {
  const lines: LineObject[] = [];

  for (const data of lineDataList) {
    const fromNode = nodesMap.get(data.fromId);
    const toNode = nodesMap.get(data.toId);
    if (!fromNode || !toNode) continue;

    const from = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z);
    const to = new THREE.Vector3(toNode.x, toNode.y, toNode.z);
    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();

    const group = new THREE.Group();
    group.position.copy(from);
    group.lookAt(to);

    const startColor = COLOR_LOW.clone();
    const endColor = COLOR_LOW.clone();
    const lineGeometry = createLineGeometry(length, startColor, endColor);

    const lineMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
    lineMesh.scale.set(0.03, 0.03, 1);
    group.add(lineMesh);

    const pulseBalls: THREE.Mesh[] = [];
    const pulseOffsets: number[] = [];
    const pulseSpacing = 0.5;
    const pulseCount = Math.max(1, Math.floor(length / pulseSpacing));

    for (let i = 0; i < pulseCount; i++) {
      const pulseMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const ball = new THREE.Mesh(sharedPulseGeometry, pulseMaterial);
      const offset = (i / pulseCount) * length;
      pulseOffsets.push(offset);
      pulseBalls.push(ball);
      group.add(ball);
    }

    lines.push({
      data,
      group,
      lineMesh,
      pulseBalls,
      pulseOffsets,
      lineLength: length,
      baseWidth: 0.03
    });
  }

  return lines;
}

export function updateLines(
  lines: LineObject[],
  deltaTime: number,
  globalLoad: number,
  nodesMap: Map<number, { load: number }>
): void {
  for (const line of lines) {
    const fromNode = nodesMap.get(line.data.fromId);
    const toNode = nodesMap.get(line.data.toId);
    if (!fromNode || !toNode) continue;

    const avgLoad = (fromNode.load + toNode.load) / 2;
    const loadRatio = Math.min(1, Math.max(0, (avgLoad + globalLoad * 0.5) / 100));

    const currentColor = new THREE.Color().lerpColors(COLOR_LOW, COLOR_HIGH, loadRatio);

    const targetWidth = 0.02 + loadRatio * 0.06;
    line.baseWidth += (targetWidth - line.baseWidth) * Math.min(1, deltaTime * 4);
    line.lineMesh.scale.x = line.baseWidth;
    line.lineMesh.scale.y = line.baseWidth;

    const positionAttr = line.lineMesh.geometry.attributes.position;
    const colorAttr = line.lineMesh.geometry.attributes.color;
    const count = positionAttr.count;

    for (let i = 0; i < count; i++) {
      const z = positionAttr.getZ(i);
      const t = z / line.lineLength;
      const color = new THREE.Color().lerpColors(COLOR_LOW, currentColor, t);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    }
    colorAttr.needsUpdate = true;

    const pulseSpeed = 0.2 + loadRatio * 0.8;
    for (let i = 0; i < line.pulseBalls.length; i++) {
      line.pulseOffsets[i] = (line.pulseOffsets[i] + pulseSpeed * deltaTime) % line.lineLength;
      
      const ball = line.pulseBalls[i];
      ball.position.z = line.pulseOffsets[i];

      const pulseMaterial = ball.material as THREE.MeshBasicMaterial;
      pulseMaterial.color.copy(currentColor);
      
      const pulseScale = 0.8 + loadRatio * 0.6;
      ball.scale.setScalar(pulseScale);
    }
  }
}

export function disposeLines(lines: LineObject[]): void {
  for (const line of lines) {
    line.lineMesh.geometry.dispose();
    (line.lineMesh.material as THREE.Material).dispose();
    for (const ball of line.pulseBalls) {
      (ball.material as THREE.Material).dispose();
    }
  }
}
