import * as THREE from 'three';
import type { OceanDataset } from './dataGenerator';

export type ColorMapType = 'blue-red' | 'green-purple' | 'heatmap';

export interface SurfaceBuilderResult {
  group: THREE.Group;
  updateColors: (colorMap: ColorMapType) => void;
  updateOpacity: (opacity: number) => void;
  getVertexCount: () => number;
  getMesh: () => THREE.Mesh;
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

function getColorMapColors(colorMap: ColorMapType): THREE.Color[] {
  switch (colorMap) {
    case 'blue-red':
      return [
        new THREE.Color(0x002266),
        new THREE.Color(0x0066cc),
        new THREE.Color(0x33aaff),
        new THREE.Color(0xffaa33),
        new THREE.Color(0xff3300)
      ];
    case 'green-purple':
      return [
        new THREE.Color(0x003311),
        new THREE.Color(0x00aa33),
        new THREE.Color(0x66ff99),
        new THREE.Color(0xcc66ff),
        new THREE.Color(0x6600aa)
      ];
    case 'heatmap':
      return [
        new THREE.Color(0x000033),
        new THREE.Color(0x330099),
        new THREE.Color(0xcc3300),
        new THREE.Color(0xffcc00),
        new THREE.Color(0xffffff)
      ];
  }
}

function valueToColor(value: number, minVal: number, maxVal: number, colors: THREE.Color[]): THREE.Color {
  const t = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));
  const segments = colors.length - 1;
  const position = t * segments;
  const index = Math.min(segments - 1, Math.floor(position));
  const localT = position - index;
  return lerpColor(colors[index], colors[index + 1], localT);
}

export function buildSurface(dataset: OceanDataset, initialColorMap: ColorMapType = 'blue-red', initialOpacity: number = 0.85): SurfaceBuilderResult {
  const { width, height, points, minValue, maxValue } = dataset;

  const geometry = new THREE.PlaneGeometry(10, 10, width - 1, height - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  for (let i = 0; i < points.length; i++) {
    positions.setY(i, points[i].z);
  }
  geometry.computeVertexNormals();

  const colors: number[] = [];
  const colormapColors = getColorMapColors(initialColorMap);
  for (const p of points) {
    const color = valueToColor(p.value, minValue, maxValue, colormapColors);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: initialOpacity,
    metalness: 0.1,
    roughness: 0.7,
    flatShading: false
  });

  const mesh = new THREE.Mesh(geometry, material);

  const edges = new THREE.EdgesGeometry(geometry, 20);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x88aacc,
    transparent: true,
    opacity: 0.25
  });
  const wireframe = new THREE.LineSegments(edges, lineMaterial);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(wireframe);

  function updateColors(colorMap: ColorMapType): void {
    const newColors = getColorMapColors(colorMap);
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < points.length; i++) {
      const c = valueToColor(points[i].value, minValue, maxValue, newColors);
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colorAttr.needsUpdate = true;
  }

  function updateOpacity(opacity: number): void {
    material.opacity = opacity;
  }

  function getVertexCount(): number {
    return positions.count;
  }

  function getMesh(): THREE.Mesh {
    return mesh;
  }

  return { group, updateColors, updateOpacity, getVertexCount, getMesh };
}
