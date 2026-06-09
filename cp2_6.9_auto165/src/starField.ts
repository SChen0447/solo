import * as THREE from 'three';

export interface StarData {
  mesh: THREE.Mesh;
  baseOpacity: number;
  baseSize: number;
  brightness: number;
  worldPos: THREE.Vector3;
}

export interface StarFieldConfig {
  lightMultiplier: number;
  visibilityThreshold: number;
}

export function createStarField(
  scene: THREE.Scene,
  count: number = 800,
  radius: number = 200
): { stars: StarData[]; group: THREE.Group } {
  const group = new THREE.Group();
  const stars: StarData[] = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const brightness = Math.random() * 5;
    const isBright = brightness < 3;
    const size = isBright ? 0.3 : 0.1;
    const color = isBright ? 0xffffff : 0xb0bec5;
    const opacity = isBright ? 0.9 : 0.6;

    const starGeo = new THREE.SphereGeometry(size, 8, 8);
    const starMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(x, y, z);

    const starData: StarData = {
      mesh: star,
      baseOpacity: opacity,
      baseSize: size,
      brightness,
      worldPos: new THREE.Vector3(x, y, z),
    };

    group.add(star);
    stars.push(starData);
  }

  scene.add(group);
  return { stars, group };
}

function calculateLightPollutionOpacity(
  starPos: THREE.Vector3,
  lightMultiplier: number
): number {
  const horizontalDist = Math.sqrt(starPos.x * starPos.x + starPos.z * starPos.z);
  const verticalHeight = starPos.y;

  let opacityFactor = 1.0;

  if (verticalHeight < 50) {
    let horizontalFactor = 1.0;
    if (horizontalDist < 25) {
      horizontalFactor = 0.1;
    } else if (horizontalDist < 40) {
      const t = (horizontalDist - 25) / 15;
      horizontalFactor = 0.1 + t * 0.9;
    }

    let verticalFactor = 1.0;
    if (verticalHeight < 30) {
      const t = verticalHeight / 30;
      verticalFactor = 0.1 + t * 0.9;
    } else {
      const t = (verticalHeight - 30) / 20;
      verticalFactor = 1.0 - (1.0 - horizontalFactor) * (1.0 - t);
    }

    opacityFactor = Math.min(horizontalFactor, verticalFactor);
  }

  const pollutionEffect = 1.0 - (1.0 - opacityFactor) * Math.min(lightMultiplier, 3.0) / 1.5;

  return Math.max(0, Math.min(1, pollutionEffect));
}

export function updateStarField(
  stars: StarData[],
  group: THREE.Group,
  config: StarFieldConfig,
  deltaTime: number
): void {
  group.rotation.y += deltaTime * 0.01;

  for (const star of stars) {
    const worldPos = new THREE.Vector3();
    star.mesh.getWorldPosition(worldPos);

    const pollutionOpacity = calculateLightPollutionOpacity(worldPos, config.lightMultiplier);
    const finalOpacity = star.baseOpacity * pollutionOpacity;

    if (finalOpacity < config.visibilityThreshold) {
      star.mesh.visible = false;
      continue;
    }

    star.mesh.visible = true;
    (star.mesh.material as THREE.MeshBasicMaterial).opacity = finalOpacity;

    if (finalOpacity < 0.3) {
      star.mesh.scale.setScalar(0.05 / star.baseSize);
    } else {
      star.mesh.scale.setScalar(1);
    }
  }
}
