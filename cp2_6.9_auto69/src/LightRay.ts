import * as THREE from 'three';
import { LensSystem } from './LensSystem';

export interface RayIntersection {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

const RAY_COUNT = 5;
const RAY_SPACING = 0.3;
const RAY_START_X = -6;
const SCREEN_POSITION = 3;
const WAVELENGTHS = [680, 620, 580, 530, 470, 420];

export interface LightRayData {
  line: THREE.Line;
  geometry: THREE.BufferGeometry;
  yOffset: number;
  points: THREE.Vector3[];
  intensity: number;
}

export interface ScreenSpot {
  mesh: THREE.Mesh;
}

let lightRays: LightRayData[] = [];
let screenSpots: ScreenSpot[] = [];
let focalPoint: THREE.Mesh | null = null;
let sceneRef: THREE.Scene | null = null;

function wavelengthToColor(wavelength: number): THREE.Color {
  let r = 0, g = 0, b = 0;
  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }
  return new THREE.Color(r, g, b);
}

function refract(
  incident: THREE.Vector3,
  normal: THREE.Vector3,
  iorRatio: number
): THREE.Vector3 | null {
  const cosThetaI = -incident.dot(normal);
  const sin2ThetaT = iorRatio * iorRatio * (1 - cosThetaI * cosThetaI);

  if (sin2ThetaT > 1) {
    return null;
  }

  const cosThetaT = Math.sqrt(1 - sin2ThetaT);
  const refracted = new THREE.Vector3()
    .copy(incident)
    .multiplyScalar(iorRatio)
    .add(
      new THREE.Vector3()
        .copy(normal)
        .multiplyScalar(iorRatio * cosThetaI - cosThetaT)
    );
  return refracted.normalize();
}

function getLensSurfaceNormal(
  point: THREE.Vector3,
  R1: number,
  R2: number,
  _thickness: number
): THREE.Vector3 {
  const r = Math.sqrt(point.z * point.z + point.y * point.y);

  if (point.x < 0) {
    if (R1 === Infinity) {
      return new THREE.Vector3(1, 0, 0);
    }
    const sign = R1 > 0 ? 1 : -1;
    const absR = Math.abs(R1);
    if (absR > 0.001) {
      return new THREE.Vector3(
        sign * Math.sqrt(Math.max(0, absR * absR - r * r)) / absR,
        -sign * point.y / absR,
        -sign * point.z / absR
      ).normalize();
    }
    return new THREE.Vector3(1, 0, 0);
  } else {
    if (R2 === Infinity) {
      return new THREE.Vector3(1, 0, 0);
    }
    const sign = R2 > 0 ? 1 : -1;
    const absR = Math.abs(R2);
    if (absR > 0.001) {
      return new THREE.Vector3(
        -sign * Math.sqrt(Math.max(0, absR * absR - r * r)) / absR,
        sign * point.y / absR,
        sign * point.z / absR
      ).normalize();
    }
    return new THREE.Vector3(1, 0, 0);
  }
}

function getSurfaceX(y: number, z: number, R: number, halfD: number, isFront: boolean): number {
  if (R === Infinity) {
    return isFront ? -halfD : halfD;
  }
  const r = Math.sqrt(y * y + z * z);
  const absR = Math.abs(R);
  const sign = R > 0 ? 1 : -1;
  const sag = sign * (absR - Math.sqrt(Math.max(0, absR * absR - r * r)));
  return isFront ? -halfD + sag : halfD - sag;
}

export function createLightRays(scene: THREE.Scene): LightRayData[] {
  sceneRef = scene;
  lightRays = [];

  for (let i = 0; i < RAY_COUNT; i++) {
    const yOffset = (i - (RAY_COUNT - 1) / 2) * RAY_SPACING;

    const positions = new Float32Array(100 * 3);
    const colors = new Float32Array(100 * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    lightRays.push({
      line,
      geometry,
      yOffset,
      points: [],
      intensity: 1.0
    });
  }

  const focalGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const focalMat = new THREE.MeshBasicMaterial({
    color: 0xFFFF00,
    transparent: true,
    opacity: 0.9
  });
  focalPoint = new THREE.Mesh(focalGeo, focalMat);
  scene.add(focalPoint);

  return lightRays;
}

export function createScreenSpots(scene: THREE.Scene): ScreenSpot[] {
  screenSpots = [];
  for (let i = 0; i < RAY_COUNT * WAVELENGTHS.length; i++) {
    const geo = new THREE.SphereGeometry(0.05, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.7
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    screenSpots.push({ mesh });
  }
  return screenSpots;
}

export function updateRays(lensSystem: LensSystem): { totalFlux: number; focalPos: THREE.Vector3 } {
  const { R1, R2 } = lensSystem.getSurfaceRadii();
  const thickness = lensSystem.params.thickness;
  const halfD = thickness / 2;
  const lensRadius = lensSystem.getLensRadius();

  let totalIntensity = 0;
  const rayCount = lightRays.length;
  let closestFocalDist = Infinity;
  let estimatedFocalPos = new THREE.Vector3(lensSystem.getFocalLength(), 0, 0);

  for (let rayIdx = 0; rayIdx < rayCount; rayIdx++) {
    const ray = lightRays[rayIdx];
    const allPoints: THREE.Vector3[] = [];
    const allColors: THREE.Color[] = [];

    const startPoint = new THREE.Vector3(RAY_START_X, ray.yOffset, 0);
    let direction = new THREE.Vector3(1, 0, 0);
    let currentPos = startPoint.clone();

    for (let w = 0; w < WAVELENGTHS.length; w++) {
      const wavelength = WAVELENGTHS[w];
      const n = lensSystem.getDispersionIOR(wavelength);
      const color = wavelengthToColor(wavelength);

      let rayPos = currentPos.clone();
      let rayDir = direction.clone();
      const segmentPoints: THREE.Vector3[] = [rayPos.clone()];

      const frontSurfaceX = getSurfaceX(ray.yOffset, 0, R1, halfD, true);
      const hitFront = new THREE.Vector3(frontSurfaceX, ray.yOffset, 0);

      const rAtHit = Math.sqrt(ray.yOffset * ray.yOffset);
      if (rAtHit <= lensRadius) {
        segmentPoints.push(hitFront.clone());
        rayPos = hitFront.clone();

        const normal1 = getLensSurfaceNormal(
          new THREE.Vector3(rayPos.x - 0.001, rayPos.y, rayPos.z),
          R1, R2, thickness
        );
        const refracted1 = refract(rayDir, normal1, 1 / n);

        if (refracted1) {
          rayDir = refracted1;

          const tInside = (halfD * 2 + 0.1) / Math.max(Math.abs(rayDir.x), 0.01);
          const midPos = rayPos.clone().add(rayDir.clone().multiplyScalar(tInside * 0.1));
          segmentPoints.push(midPos);
          rayPos = midPos.clone();

          const backSurfaceX = getSurfaceX(rayPos.y, rayPos.z, R2, halfD, false);
          const tToBack = (backSurfaceX - rayPos.x) / rayDir.x;
          const hitBack = rayPos.clone().add(rayDir.clone().multiplyScalar(tToBack));

          const rAtBack = Math.sqrt(hitBack.y * hitBack.y + hitBack.z * hitBack.z);
          if (rAtBack <= lensRadius && tToBack > 0) {
            segmentPoints.push(hitBack.clone());
            rayPos = hitBack.clone();

            const normal2 = getLensSurfaceNormal(
              new THREE.Vector3(rayPos.x + 0.001, rayPos.y, rayPos.z),
              R1, R2, thickness
            ).negate();
            const refracted2 = refract(rayDir, normal2, n / 1);

            if (refracted2) {
              rayDir = refracted2;
            }
          }
        }
      }

      const endX = Math.max(SCREEN_POSITION + 1, RAY_START_X + 15);
      const tToEnd = (endX - rayPos.x) / rayDir.x;
      const finalPoint = rayPos.clone().add(rayDir.clone().multiplyScalar(Math.max(tToEnd, 0)));
      segmentPoints.push(finalPoint);

      for (const p of segmentPoints) {
        allPoints.push(p.clone());
        allColors.push(color);
      }

      const tScreen = (SCREEN_POSITION - rayPos.x) / rayDir.x;
      if (tScreen > 0 && w < WAVELENGTHS.length) {
        const screenHit = rayPos.clone().add(rayDir.clone().multiplyScalar(tScreen));
        const spotIdx = rayIdx * WAVELENGTHS.length + w;
        if (screenSpots[spotIdx]) {
          screenSpots[spotIdx].mesh.position.copy(screenHit);
          (screenSpots[spotIdx].mesh.material as THREE.MeshBasicMaterial).color.copy(color);
          screenSpots[spotIdx].mesh.visible = true;
        }
      }

      if (w === Math.floor(WAVELENGTHS.length / 2)) {
        const focalLen = lensSystem.getFocalLength();
        const tFocal = (focalLen - rayPos.x) / rayDir.x;
        if (tFocal > 0) {
          const focalHit = rayPos.clone().add(rayDir.clone().multiplyScalar(tFocal));
          const dist = Math.sqrt(focalHit.y * focalHit.y + focalHit.z * focalHit.z);
          if (dist < closestFocalDist) {
            closestFocalDist = dist;
            estimatedFocalPos = focalHit;
          }
        }
      }
    }

    ray.intensity = 0.95;
    totalIntensity += ray.intensity;

    const positions = ray.geometry.attributes.position.array as Float32Array;
    const colors = ray.geometry.attributes.color.array as Float32Array;
    const maxPoints = positions.length / 3;

    for (let i = 0; i < maxPoints; i++) {
      if (i < allPoints.length) {
        positions[i * 3] = allPoints[i].x;
        positions[i * 3 + 1] = allPoints[i].y;
        positions[i * 3 + 2] = allPoints[i].z;
        colors[i * 3] = allColors[i].r * 0.7 + 1.0 * 0.3;
        colors[i * 3 + 1] = allColors[i].g * 0.7;
        colors[i * 3 + 2] = allColors[i].b * 0.7;
      } else if (allPoints.length > 0) {
        const last = allPoints[allPoints.length - 1];
        positions[i * 3] = last.x;
        positions[i * 3 + 1] = last.y;
        positions[i * 3 + 2] = last.z;
        const lastColor = allColors[allColors.length - 1];
        colors[i * 3] = lastColor.r;
        colors[i * 3 + 1] = lastColor.g;
        colors[i * 3 + 2] = lastColor.b;
      }
    }

    ray.geometry.attributes.position.needsUpdate = true;
    ray.geometry.attributes.color.needsUpdate = true;
    ray.geometry.setDrawRange(0, Math.min(allPoints.length, maxPoints));
    ray.points = allPoints;
  }

  for (let i = RAY_COUNT * WAVELENGTHS.length; i < screenSpots.length; i++) {
    if (screenSpots[i]) screenSpots[i].mesh.visible = false;
  }

  if (focalPoint) {
    const f = lensSystem.getFocalLength();
    if (f > 0 && f < 20) {
      focalPoint.position.set(f, 0, 0);
      focalPoint.visible = true;
      estimatedFocalPos = new THREE.Vector3(f, 0, 0);
    } else {
      focalPoint.visible = false;
    }
  }

  const flux = (totalIntensity / rayCount) * 100;
  return { totalFlux: flux, focalPos: estimatedFocalPos };
}

export function disposeRays(): void {
  for (const ray of lightRays) {
    ray.geometry.dispose();
    (ray.line.material as THREE.Material).dispose();
    if (sceneRef) sceneRef.remove(ray.line);
  }
  for (const spot of screenSpots) {
    spot.mesh.geometry.dispose();
    (spot.mesh.material as THREE.Material).dispose();
    if (sceneRef) sceneRef.remove(spot.mesh);
  }
  if (focalPoint) {
    focalPoint.geometry.dispose();
    (focalPoint.material as THREE.Material).dispose();
    if (sceneRef) sceneRef.remove(focalPoint);
  }
  lightRays = [];
  screenSpots = [];
  focalPoint = null;
}
