import * as THREE from 'three';

export interface RoadSegment {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  isMainRoad: boolean;
  laneOffset: number;
}

export interface Intersection {
  id: string;
  position: THREE.Vector3;
  trafficLight: TrafficLight;
  connectedRoads: string[];
}

export interface TrafficLight {
  position: THREE.Vector3;
  state: 'red' | 'yellow' | 'green';
  timer: number;
  greenDuration: number;
  yellowDuration: number;
  redDuration: number;
  mesh: THREE.Group;
  horizontalPhase: boolean;
}

export interface CityData {
  roadSegments: RoadSegment[];
  intersections: Intersection[];
  buildings: THREE.Mesh[];
  roadMeshes: THREE.Mesh[];
  allWaypoints: THREE.Vector3[];
}

const MORANDI_COLORS = [
  0x7A8B99,
  0xC4A4A4,
  0x8B9E7A,
  0xA89F8C,
  0x9B8AA6,
  0xB5A89A,
  0x8DA5A0,
  0xB39D9D,
];

const GRID_SIZE = 5;
const BLOCK_SIZE = 40;
const MAIN_ROAD_WIDTH = 10;
const SIDE_ROAD_WIDTH = 6;
const INTERSECTION_SIZE = 8;

export function generateCity(scene: THREE.Scene): CityData {
  const roadSegments: RoadSegment[] = [];
  const intersections: Intersection[] = [];
  const buildings: THREE.Mesh[] = [];
  const roadMeshes: THREE.Mesh[] = [];
  const allWaypoints: THREE.Vector3[] = [];

  const totalSize = GRID_SIZE * BLOCK_SIZE;
  const offset = -totalSize / 2 + BLOCK_SIZE / 2;

  createRoads(scene, roadSegments, intersections, roadMeshes, allWaypoints, offset);
  createBuildings(scene, buildings, offset);
  createGround(scene, totalSize);

  return { roadSegments, intersections, buildings, roadMeshes, allWaypoints };
}

function createGround(scene: THREE.Scene, totalSize: number) {
  const groundGeometry = new THREE.PlaneGeometry(totalSize * 1.5, totalSize * 1.5);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1f2e,
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  scene.add(ground);
}

function createRoads(
  scene: THREE.Scene,
  roadSegments: RoadSegment[],
  intersections: Intersection[],
  roadMeshes: THREE.Mesh[],
  allWaypoints: THREE.Vector3[],
  offset: number
) {
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    transparent: true,
    opacity: 0.7,
    roughness: 0.8,
    metalness: 0.2
  });

  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.4,
    emissive: 0xffff00,
    emissiveIntensity: 0.2
  });

  for (let i = 0; i <= GRID_SIZE; i++) {
    const isMainRoad = i % 2 === 0;
    const roadWidth = isMainRoad ? MAIN_ROAD_WIDTH : SIDE_ROAD_WIDTH;
    const pos = offset + i * BLOCK_SIZE - BLOCK_SIZE / 2;

    const roadLength = GRID_SIZE * BLOCK_SIZE;

    const hGeometry = new THREE.PlaneGeometry(roadLength + INTERSECTION_SIZE, roadWidth);
    const hRoad = new THREE.Mesh(hGeometry, roadMaterial);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.01, pos);
    hRoad.receiveShadow = true;
    scene.add(hRoad);
    roadMeshes.push(hRoad);

    const lineGeometry = new THREE.PlaneGeometry(roadLength, 0.3);
    const line1 = new THREE.Mesh(lineGeometry, lineMaterial);
    line1.rotation.x = -Math.PI / 2;
    line1.position.set(0, 0.02, pos - roadWidth * 0.25);
    scene.add(line1);
    const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
    line2.rotation.x = -Math.PI / 2;
    line2.position.set(0, 0.02, pos + roadWidth * 0.25);
    scene.add(line2);

    const vGeometry = new THREE.PlaneGeometry(roadWidth, roadLength + INTERSECTION_SIZE);
    const vRoad = new THREE.Mesh(vGeometry, roadMaterial);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(pos, 0.01, 0);
    vRoad.receiveShadow = true;
    scene.add(vRoad);
    roadMeshes.push(vRoad);

    const vLineGeometry = new THREE.PlaneGeometry(0.3, roadLength);
    const vLine1 = new THREE.Mesh(vLineGeometry, lineMaterial);
    vLine1.rotation.x = -Math.PI / 2;
    vLine1.position.set(pos - roadWidth * 0.25, 0.02, 0);
    scene.add(vLine1);
    const vLine2 = new THREE.Mesh(vLineGeometry, lineMaterial);
    vLine2.rotation.x = -Math.PI / 2;
    vLine2.position.set(pos + roadWidth * 0.25, 0.02, 0);
    scene.add(vLine2);
  }

  for (let i = 0; i <= GRID_SIZE; i++) {
    for (let j = 0; j <= GRID_SIZE; j++) {
      const x = offset + i * BLOCK_SIZE - BLOCK_SIZE / 2;
      const z = offset + j * BLOCK_SIZE - BLOCK_SIZE / 2;
      const intersectionId = `intersection_${i}_${j}`;

      const isMainRoadH = i % 2 === 0;
      const isMainRoadV = j % 2 === 0;
      const isMain = isMainRoadH || isMainRoadV;

      const trafficLight = createTrafficLight(new THREE.Vector3(x, 0, z), isMain);
      scene.add(trafficLight.mesh);

      const intersection: Intersection = {
        id: intersectionId,
        position: new THREE.Vector3(x, 0, z),
        trafficLight,
        connectedRoads: []
      };
      intersections.push(intersection);
      allWaypoints.push(new THREE.Vector3(x, 0, z));
    }
  }

  for (let j = 0; j <= GRID_SIZE; j++) {
    const z = offset + j * BLOCK_SIZE - BLOCK_SIZE / 2;
    const isMainRoad = j % 2 === 0;
    const roadWidth = isMainRoad ? MAIN_ROAD_WIDTH : SIDE_ROAD_WIDTH;

    for (let i = 0; i < GRID_SIZE; i++) {
      const startX = offset + i * BLOCK_SIZE - BLOCK_SIZE / 2;
      const endX = offset + (i + 1) * BLOCK_SIZE - BLOCK_SIZE / 2;

      const startPos = new THREE.Vector3(startX, 0, z - roadWidth * 0.25);
      const endPos = new THREE.Vector3(endX, 0, z - roadWidth * 0.25);
      roadSegments.push(createRoadSegment(
        `h_forward_${j}_${i}`,
        startPos, endPos, isMainRoad, roadWidth * 0.25
      ));

      const startPos2 = new THREE.Vector3(endX, 0, z + roadWidth * 0.25);
      const endPos2 = new THREE.Vector3(startX, 0, z + roadWidth * 0.25);
      roadSegments.push(createRoadSegment(
        `h_backward_${j}_${i}`,
        startPos2, endPos2, isMainRoad, roadWidth * 0.25
      ));
    }
  }

  for (let i = 0; i <= GRID_SIZE; i++) {
    const x = offset + i * BLOCK_SIZE - BLOCK_SIZE / 2;
    const isMainRoad = i % 2 === 0;
    const roadWidth = isMainRoad ? MAIN_ROAD_WIDTH : SIDE_ROAD_WIDTH;

    for (let j = 0; j < GRID_SIZE; j++) {
      const startZ = offset + j * BLOCK_SIZE - BLOCK_SIZE / 2;
      const endZ = offset + (j + 1) * BLOCK_SIZE - BLOCK_SIZE / 2;

      const startPos = new THREE.Vector3(x + roadWidth * 0.25, 0, startZ);
      const endPos = new THREE.Vector3(x + roadWidth * 0.25, 0, endZ);
      roadSegments.push(createRoadSegment(
        `v_forward_${i}_${j}`,
        startPos, endPos, isMainRoad, roadWidth * 0.25
      ));

      const startPos2 = new THREE.Vector3(x - roadWidth * 0.25, 0, endZ);
      const endPos2 = new THREE.Vector3(x - roadWidth * 0.25, 0, startZ);
      roadSegments.push(createRoadSegment(
        `v_backward_${i}_${j}`,
        startPos2, endPos2, isMainRoad, roadWidth * 0.25
      ));
    }
  }

  roadSegments.forEach(seg => {
    allWaypoints.push(seg.start.clone());
    allWaypoints.push(seg.end.clone());
  });

  return { roadSegments, intersections, roadMeshes, allWaypoints };
}

function createRoadSegment(
  id: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  isMainRoad: boolean,
  laneOffset: number
): RoadSegment {
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const length = start.distanceTo(end);
  return { id, start, end, direction, length, isMainRoad, laneOffset };
}

function createTrafficLight(position: THREE.Vector3, isMainIntersection: boolean): TrafficLight {
  const group = new THREE.Group();

  const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 3, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

  const offsets = [
    new THREE.Vector3(3, 0, 3),
    new THREE.Vector3(-3, 0, 3),
    new THREE.Vector3(3, 0, -3),
    new THREE.Vector3(-3, 0, -3)
  ];

  offsets.forEach((offset, idx) => {
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.copy(position).add(offset);
    pole.position.y = 1.5;
    group.add(pole);

    const lightHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    lightHousing.position.copy(position).add(offset);
    lightHousing.position.y = 3.2;
    group.add(lightHousing);

    const redLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x550000,
        emissive: 0x000000,
        emissiveIntensity: 0
      })
    );
    redLight.name = 'red';
    redLight.position.copy(position).add(offset);
    redLight.position.y = 3.7;
    if (idx % 2 === 0) redLight.position.x += 0.3;
    else redLight.position.x -= 0.3;
    group.add(redLight);

    const yellowLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x555500,
        emissive: 0x000000,
        emissiveIntensity: 0
      })
    );
    yellowLight.name = 'yellow';
    yellowLight.position.copy(position).add(offset);
    yellowLight.position.y = 3.2;
    if (idx % 2 === 0) yellowLight.position.x += 0.3;
    else yellowLight.position.x -= 0.3;
    group.add(yellowLight);

    const greenLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x005500,
        emissive: 0x000000,
        emissiveIntensity: 0
      })
    );
    greenLight.name = 'green';
    greenLight.position.copy(position).add(offset);
    greenLight.position.y = 2.7;
    if (idx % 2 === 0) greenLight.position.x += 0.3;
    else greenLight.position.x -= 0.3;
    group.add(greenLight);
  });

  const baseGreenDuration = isMainIntersection ? 30 : 20;
  const baseRedDuration = isMainIntersection ? 30 : 20;

  return {
    position: position.clone(),
    state: Math.random() > 0.5 ? 'red' : 'green',
    timer: Math.random() * 10,
    greenDuration: baseGreenDuration,
    yellowDuration: 3,
    redDuration: baseRedDuration,
    mesh: group,
    horizontalPhase: Math.random() > 0.5
  };
}

function createBuildings(
  scene: THREE.Scene,
  buildings: THREE.Mesh[],
  offset: number
) {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const blockX = offset + i * BLOCK_SIZE;
      const blockZ = offset + j * BLOCK_SIZE;

      const buildingCount = 2 + Math.floor(Math.random() * 3);
      const isCommercial = (i === 2 && j >= 1 && j <= 3) || (j === 2 && i >= 1 && i <= 3);

      for (let b = 0; b < buildingCount; b++) {
        const colorIdx = Math.floor(Math.random() * MORANDI_COLORS.length);
        let buildingHeight = 3 + Math.random() * 8;
        if (isCommercial) buildingHeight *= 1.5;

        const buildingWidth = 6 + Math.random() * 8;
        const buildingDepth = 6 + Math.random() * 8;

        const geometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
        const material = new THREE.MeshStandardMaterial({
          color: MORANDI_COLORS[colorIdx],
          roughness: 0.7,
          metalness: 0.1
        });

        const building = new THREE.Mesh(geometry, material);

        const localX = (Math.random() - 0.5) * (BLOCK_SIZE - 18);
        const localZ = (Math.random() - 0.5) * (BLOCK_SIZE - 18);

        building.position.set(
          blockX + localX,
          buildingHeight / 2,
          blockZ + localZ
        );
        building.castShadow = true;
        building.receiveShadow = true;

        scene.add(building);
        buildings.push(building);
      }
    }
  }
}

export function updateTrafficLights(
  intersections: Intersection[],
  deltaTime: number,
  isPeakHour: boolean
) {
  intersections.forEach(intersection => {
    const light = intersection.trafficLight;
    light.timer -= deltaTime;

    const peakMultiplier = isPeakHour ? 1.2 : 1.0;

    if (light.timer <= 0) {
      switch (light.state) {
        case 'green':
          light.state = 'yellow';
          light.timer = light.yellowDuration;
          break;
        case 'yellow':
          light.state = 'red';
          light.timer = light.redDuration * peakMultiplier;
          light.horizontalPhase = !light.horizontalPhase;
          break;
        case 'red':
          light.state = 'green';
          light.timer = light.greenDuration * peakMultiplier;
          break;
      }
      updateTrafficLightVisual(light);
    }
  });
}

function updateTrafficLightVisual(light: TrafficLight) {
  light.mesh.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (child.name === 'red') {
        if (light.state === 'red') {
          mat.color.setHex(0xFF0000);
          mat.emissive.setHex(0xFF0000);
          mat.emissiveIntensity = 0.8;
        } else {
          mat.color.setHex(0x550000);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      } else if (child.name === 'yellow') {
        if (light.state === 'yellow') {
          mat.color.setHex(0xFFFF00);
          mat.emissive.setHex(0xFFFF00);
          mat.emissiveIntensity = 0.8;
        } else {
          mat.color.setHex(0x555500);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      } else if (child.name === 'green') {
        if (light.state === 'green') {
          mat.color.setHex(0x00FF00);
          mat.emissive.setHex(0x00FF00);
          mat.emissiveIntensity = 0.8;
        } else {
          mat.color.setHex(0x005500);
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    }
  });
}

export function getTrafficLightStateForDirection(
  light: TrafficLight,
  direction: THREE.Vector3
): 'red' | 'yellow' | 'green' {
  const isHorizontal = Math.abs(direction.x) > Math.abs(direction.z);
  const isGreenPhase = light.horizontalPhase ? isHorizontal : !isHorizontal;

  if (light.state === 'yellow') return 'yellow';
  if (light.state === 'green') {
    return isGreenPhase ? 'green' : 'red';
  }
  return isGreenPhase ? 'red' : 'green';
}
