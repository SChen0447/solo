import * as THREE from 'three';

const WARM_COLORS = [
  0xFF8A3D,
  0xFFB347,
  0xFFD166,
  0xF4A261,
  0xE9C46A,
  0xFF9F5C,
  0xF08A3C,
  0xE76F51,
  0xF4976A,
  0xE8A87C,
  0xC98B58,
  0xD4A373
];

export class ExtrudedModel {
  public mesh: THREE.Mesh;
  public group: THREE.Group;
  public color: THREE.Color;
  public baseY: number = 0;
  public autoRotateSpeed: number = 0.5;
  public originalGeometry: THREE.BufferGeometry;

  constructor(mesh: THREE.Mesh, color: THREE.Color) {
    this.mesh = mesh;
    this.group = new THREE.Group();
    this.group.add(mesh);
    this.color = color;
    this.originalGeometry = mesh.geometry;
  }

  public update(delta: number, userInteracting: boolean): void {
    if (!userInteracting) {
      this.group.rotation.y += (this.autoRotateSpeed * Math.PI / 180 * delta * 60);
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    const material = this.mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) {
      material.forEach((m) => m.dispose());
    } else {
      material.dispose();
    }
  }
}

export function extrudeCurveTo3D(
  screenPoints: THREE.Vector2[],
  camera: THREE.PerspectiveCamera,
  rendererWidth: number,
  rendererHeight: number,
  depth?: number
): ExtrudedModel {
  const worldPoints: THREE.Vector3[] = screenToWorld(screenPoints, camera);

  const extrudeDepth = depth ?? computeExtrudeDepth(worldPoints);

  let geometry: THREE.BufferGeometry;
  try {
    const isClosed = isCurveClosed(worldPoints);
    const pointsToUse = isClosed ? worldPoints : closeCurveWithThickness(worldPoints, extrudeDepth * 0.3);

    const shape = new THREE.Shape();
    for (let i = 0; i < pointsToUse.length; i++) {
      const p = pointsToUse[i];
      if (i === 0) {
        shape.moveTo(p.x, p.y);
      } else {
        shape.lineTo(p.x, p.y);
      }
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: extrudeDepth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 2,
      bevelSize: extrudeDepth * 0.08,
      bevelThickness: extrudeDepth * 0.04,
      curveSegments: 12
    };

    geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  } catch {
    geometry = createFallbackGeometry(worldPoints, extrudeDepth);
  }

  geometry.center();
  geometry.computeVertexNormals();

  const colorIndex = Math.floor(Math.random() * WARM_COLORS.length);
  const baseColor = new THREE.Color(WARM_COLORS[colorIndex]);
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.55,
    metalness: 0.08,
    flatShading: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const model = new ExtrudedModel(mesh, baseColor.clone());
  model.baseY = mesh.position.y;

  const centroid = computeCentroid(worldPoints);
  model.group.position.x = centroid.x;
  model.group.position.y = centroid.y;
  model.group.position.z = 0;

  const initialYRotation = (Math.random() - 0.5) * 0.2;
  model.group.rotation.y = initialYRotation;

  return model;
}

function isCurveClosed(points: THREE.Vector3[]): boolean {
  if (points.length < 3) return false;
  const first = points[0];
  const last = points[points.length - 1];
  const dist = first.distanceTo(last);
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += points[i].distanceTo(points[i - 1]);
  }
  return dist < totalLen * 0.08;
}

function closeCurveWithThickness(points: THREE.Vector3[], thickness: number): THREE.Vector3[] {
  if (points.length < 2) return points;
  const result: THREE.Vector3[] = [];
  const perpOffsets: THREE.Vector2[] = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    perpOffsets.push(new THREE.Vector2(-dy / len * thickness, dx / len * thickness));
  }

  for (let i = 0; i < points.length; i++) {
    result.push(new THREE.Vector3(
      points[i].x + perpOffsets[i].x,
      points[i].y + perpOffsets[i].y,
      0
    ));
  }
  for (let i = points.length - 1; i >= 0; i--) {
    result.push(new THREE.Vector3(
      points[i].x - perpOffsets[i].x,
      points[i].y - perpOffsets[i].y,
      0
    ));
  }
  return result;
}

function computeExtrudeDepth(points: THREE.Vector3[]): number {
  if (points.length < 2) return 0.3;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const avg = (width + height) / 2;
  return Math.max(0.15, Math.min(avg * 0.3, 1.8));
}

function computeCentroid(points: THREE.Vector3[]): THREE.Vector3 {
  let sx = 0, sy = 0, sz = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sz += p.z;
  }
  const n = points.length;
  return new THREE.Vector3(sx / n, sy / n, sz / n);
}

function screenToWorld(
  screenPoints: THREE.Vector2[],
  camera: THREE.PerspectiveCamera
): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  const ndc = new THREE.Vector3();
  for (const sp of screenPoints) {
    ndc.x = (sp.x / window.innerWidth) * 2 - 1;
    ndc.y = -(sp.y / window.innerHeight) * 2 + 1;
    ndc.z = 0;
    const worldPoint = ndc.clone().unproject(camera);
    const direction = worldPoint.sub(camera.position).normalize();
    const distance = -camera.position.z / direction.z;
    const pos = camera.position.clone().add(direction.multiplyScalar(distance));
    result.push(new THREE.Vector3(pos.x, pos.y, 0));
  }
  return result;
}

function createFallbackGeometry(points: THREE.Vector3[], depth: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];

  const halfDepth = depth / 2;
  let vertexIndex = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    positions.push(p.x, p.y, -halfDepth);
    positions.push(p.x, p.y, halfDepth);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}
