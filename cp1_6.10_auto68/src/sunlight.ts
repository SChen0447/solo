import * as THREE from 'three';
import type { BuildingParams } from './building';

export interface SunPosition {
  azimuth: number;
  elevation: number;
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function getSunDirection(sun: SunPosition): THREE.Vector3 {
  const azimuthRad = degreesToRadians(sun.azimuth);
  const elevationRad = degreesToRadians(sun.elevation);

  const x = Math.cos(elevationRad) * Math.sin(azimuthRad);
  const y = Math.sin(elevationRad);
  const z = Math.cos(elevationRad) * Math.cos(azimuthRad);

  return new THREE.Vector3(x, y, z).normalize();
}

export function getSunWorldPosition(sun: SunPosition, distance: number = 15): THREE.Vector3 {
  const direction = getSunDirection(sun);
  return direction.multiplyScalar(distance);
}

export function getShadowOpacity(elevation: number): number {
  const t = THREE.MathUtils.clamp(elevation, 5, 90);
  const normalized = (t - 5) / 85;
  return THREE.MathUtils.lerp(0.4, 0.8, normalized);
}

export function getSunSize(elevation: number): number {
  const t = THREE.MathUtils.clamp(elevation, 5, 90);
  const normalized = (t - 5) / 85;
  return THREE.MathUtils.lerp(0.4, 0.3, normalized);
}

export function projectBuildingCorner(
  buildingParams: BuildingParams,
  sunDirection: THREE.Vector3
): THREE.Vector2[] {
  const { length, width, height, x, z } = buildingParams;

  const halfLength = length / 2;
  const halfWidth = width / 2;

  const topCorners: THREE.Vector3[] = [
    new THREE.Vector3(x - halfLength, height, z - halfWidth),
    new THREE.Vector3(x + halfLength, height, z - halfWidth),
    new THREE.Vector3(x + halfLength, height, z + halfWidth),
    new THREE.Vector3(x - halfLength, height, z + halfWidth),
  ];

  const bottomCorners: THREE.Vector3[] = [
    new THREE.Vector3(x - halfLength, 0, z - halfWidth),
    new THREE.Vector3(x + halfLength, 0, z - halfWidth),
    new THREE.Vector3(x + halfLength, 0, z + halfWidth),
    new THREE.Vector3(x - halfLength, 0, z + halfWidth),
  ];

  const projectedPoints: THREE.Vector2[] = [];

  const shadowLength = height / Math.max(sunDirection.y, 0.01);

  for (const corner of topCorners) {
    const projected = new THREE.Vector2(
      corner.x - sunDirection.x * shadowLength,
      corner.z - sunDirection.z * shadowLength
    );
    projectedPoints.push(projected);
  }

  for (const corner of bottomCorners) {
    projectedPoints.push(new THREE.Vector2(corner.x, corner.z));
  }

  return convexHull(projectedPoints);
}

function cross(o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points: THREE.Vector2[]): THREE.Vector2[] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  const lower: THREE.Vector2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: THREE.Vector2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

export function createShadowMesh(points: THREE.Vector2[], opacity: number): THREE.Mesh {
  const shape = new THREE.Shape();

  if (points.length > 2) {
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();
  }

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000033,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.01;
  mesh.renderOrder = 1;

  return mesh;
}

export function updateShadowMesh(
  mesh: THREE.Mesh,
  points: THREE.Vector2[],
  opacity: number
): void {
  const shape = new THREE.Shape();

  if (points.length > 2) {
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();
  }

  mesh.geometry.dispose();
  mesh.geometry = new THREE.ShapeGeometry(shape);
  (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
}

export function timeToSunPosition(totalMinutes: number): SunPosition {
  const clampedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = clampedMinutes / 60;

  const azimuth = (hour - 6) * 15;

  const normalizedHour = (hour - 6) / 12;
  const elevation = Math.sin(normalizedHour * Math.PI) * 85 + 5;

  return {
    azimuth,
    elevation
  };
}

export function sunPositionToTime(sun: SunPosition): number {
  const hour = sun.azimuth / 15 + 6;
  return hour * 60;
}

export function formatTime(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(clamped / 60);
  const minutes = Math.floor(clamped % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
