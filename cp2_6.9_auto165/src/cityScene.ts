import * as THREE from 'three';

export type ZoneType = 'commercial' | 'residential' | 'industrial';

export interface BuildingData {
  mesh: THREE.Mesh;
  edges?: THREE.LineSegments;
  height: number;
  zone: ZoneType;
  lightIntensity: number;
  lightColor: number;
  pointLight?: THREE.PointLight;
  lightBeam?: THREE.Mesh;
  userData: { height: number; zone: ZoneType; lightIntensity: number };
}

const ZONE_CONFIG: Record<ZoneType, {
  heightRange: [number, number];
  colorStart: number;
  colorEnd: number;
  lightColor: number;
  lightIntensity: number;
  hasBeam: boolean;
}> = {
  commercial: {
    heightRange: [8, 15],
    colorStart: 0xfff3e0,
    colorEnd: 0xffb74d,
    lightColor: 0xffb74d,
    lightIntensity: 1.5,
    hasBeam: true,
  },
  residential: {
    heightRange: [3, 8],
    colorStart: 0xffe082,
    colorEnd: 0xff8f00,
    lightColor: 0xffe082,
    lightIntensity: 0.8,
    hasBeam: false,
  },
  industrial: {
    heightRange: [5, 10],
    colorStart: 0xe0f7fa,
    colorEnd: 0x80deea,
    lightColor: 0x80deea,
    lightIntensity: 0.3,
    hasBeam: false,
  },
};

function getZoneForPosition(x: number, z: number): ZoneType {
  const dist = Math.sqrt(x * x + z * z);
  if (dist <= 15) return 'commercial';
  if (dist <= 40) return 'residential';
  return 'industrial';
}

function lerpColor(colorStart: number, colorEnd: number, t: number): THREE.Color {
  const c1 = new THREE.Color(colorStart);
  const c2 = new THREE.Color(colorEnd);
  return c1.lerp(c2, t);
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function createGround(scene: THREE.Scene): THREE.Mesh {
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    transparent: true,
    opacity: 0.6,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(100, 20, 0x4a4a6a, 0x4a4a6a);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.6;
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  return ground;
}

export function createBuildings(
  scene: THREE.Scene,
  count: number = 50
): BuildingData[] {
  const buildings: BuildingData[] = [];
  const usedPositions: { x: number; z: number; size: number }[] = [];

  for (let i = 0; i < count; i++) {
    let x = 0, z = 0;
    let attempts = 0;

    while (attempts < 100) {
      const angle = Math.random() * Math.PI * 2;
      const radius = randomRange(2, 48);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      const size = randomRange(2.5, 5);

      let overlaps = false;
      for (const pos of usedPositions) {
        const dx = Math.abs(x - pos.x);
        const dz = Math.abs(z - pos.z);
        if (dx < (size + pos.size) * 0.6 + 1 && dz < (size + pos.size) * 0.6 + 1) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        usedPositions.push({ x, z, size });
        break;
      }
      attempts++;
    }

    const zone = getZoneForPosition(x, z);
    const config = ZONE_CONFIG[zone];
    const height = randomRange(config.heightRange[0], config.heightRange[1]);
    const size = randomRange(2.5, 5);

    const buildingGeo = new THREE.BoxGeometry(size, height, size);
    const colorT = Math.random();
    const color = lerpColor(config.colorStart, config.colorEnd, colorT);

    const buildingMat = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(config.lightColor),
      emissiveIntensity: config.lightIntensity * 0.15,
      roughness: 0.7,
      metalness: 0.1,
    });

    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;

    const buildingData: BuildingData = {
      mesh: building,
      height,
      zone,
      lightIntensity: config.lightIntensity,
      lightColor: config.lightColor,
      userData: { height, zone, lightIntensity: config.lightIntensity },
    };

    const edgesGeo = new THREE.EdgesGeometry(buildingGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    building.add(edges);
    buildingData.edges = edges;

    const topLightGeo = new THREE.BoxGeometry(size * 0.9, 0.2, size * 0.9);
    const topLightMat = new THREE.MeshBasicMaterial({
      color: config.lightColor,
      transparent: true,
      opacity: 0.9,
    });
    const topLight = new THREE.Mesh(topLightGeo, topLightMat);
    topLight.position.y = height / 2 + 0.1;
    building.add(topLight);

    const pointLight = new THREE.PointLight(config.lightColor, config.lightIntensity, 30, 2);
    pointLight.position.set(0, height / 2 + 1, 0);
    building.add(pointLight);
    buildingData.pointLight = pointLight;

    if (config.hasBeam) {
      const beamGeo = new THREE.CylinderGeometry(size * 0.4, size * 0.5, 20, 8, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: config.lightColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = height / 2 + 10;
      building.add(beam);
      buildingData.lightBeam = beam;
    }

    building.userData = buildingData.userData;
    scene.add(building);
    buildings.push(buildingData);
  }

  return buildings;
}

export function highlightBuilding(
  buildingData: BuildingData | null,
  previousHighlight?: BuildingData | null
): BuildingData | null {
  if (previousHighlight && previousHighlight.edges) {
    (previousHighlight.edges.material as THREE.LineBasicMaterial).color.set(0x000000);
    (previousHighlight.edges.material as THREE.LineBasicMaterial).opacity = 0.3;
    (previousHighlight.edges.material as THREE.LineBasicMaterial).needsUpdate = true;
  }

  if (buildingData && buildingData.edges) {
    (buildingData.edges.material as THREE.LineBasicMaterial).color.set(0xffd600);
    (buildingData.edges.material as THREE.LineBasicMaterial).opacity = 1.0;
    (buildingData.edges.material as THREE.LineBasicMaterial).needsUpdate = true;
  }

  return buildingData;
}

export function updateLightMultiplier(buildings: BuildingData[], multiplier: number): void {
  for (const b of buildings) {
    if (b.pointLight) {
      b.pointLight.intensity = b.lightIntensity * multiplier;
    }
    if (b.lightBeam) {
      (b.lightBeam.material as THREE.MeshBasicMaterial).opacity = 0.3 * multiplier;
    }
    const mat = b.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = b.lightIntensity * 0.15 * multiplier;
  }
}
