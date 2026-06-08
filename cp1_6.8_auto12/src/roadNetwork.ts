import * as THREE from 'three';
import { TrafficLight, RoadNetwork, LightColor } from './types';

const ROAD_WIDTH = 16;
const ROAD_LENGTH = 80;
const LANE_WIDTH = 4;
const LANE_COUNT = 2;

export function buildRoadNetwork(scene: THREE.Scene): RoadNetwork {
  const trafficLights: TrafficLight[] = [];

  buildGround(scene);
  buildRoads(scene);
  buildLaneMarkings(scene);
  buildIntersections(scene);

  const hPositions = [-20, 20];
  const vPositions = [-20, 20];

  let lightId = 0;
  for (const hPos of hPositions) {
    for (const vPos of vPositions) {
      const lights = buildTrafficLight(scene, hPos, vPos, lightId);
      trafficLights.push(...lights);
      lightId += 2;
    }
  }

  return { trafficLights };
}

function buildGround(scene: THREE.Scene): void {
  const groundGeometry = new THREE.PlaneGeometry(200, 200);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5016,
    roughness: 0.9,
    metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

function buildRoads(scene: THREE.Scene): void {
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.85,
    metalness: 0.05
  });

  const horizontalPositions = [-20, 20];
  for (const z of horizontalPositions) {
    const roadGeometry = new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH);
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, z);
    road.receiveShadow = true;
    scene.add(road);
  }

  const verticalPositions = [-20, 20];
  for (const x of verticalPositions) {
    const roadGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.01, 0);
    road.receiveShadow = true;
    scene.add(road);
  }
}

function buildLaneMarkings(scene: THREE.Scene): void {
  const markingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });

  const halfWidth = ROAD_WIDTH / 2;
  const leftIntersectStart = -20 - halfWidth;
  const leftIntersectEnd = -20 + halfWidth;
  const rightIntersectStart = 20 - halfWidth;
  const rightIntersectEnd = 20 + halfWidth;

  const horizontalPositions = [-20, 20];
  for (const hz of horizontalPositions) {
    for (let i = 1; i < LANE_COUNT * 2; i++) {
      const zOffset = hz - halfWidth + i * LANE_WIDTH;
      
      buildDashedLine(scene, -40, zOffset, leftIntersectStart, zOffset, markingMaterial, true);
      buildDashedLine(scene, leftIntersectEnd, zOffset, rightIntersectStart, zOffset, markingMaterial, true);
      buildDashedLine(scene, rightIntersectEnd, zOffset, 40, zOffset, markingMaterial, true);
    }
  }

  const verticalPositions = [-20, 20];
  for (const vx of verticalPositions) {
    for (let i = 1; i < LANE_COUNT * 2; i++) {
      const xOffset = vx - halfWidth + i * LANE_WIDTH;
      
      buildDashedLine(scene, xOffset, -40, xOffset, leftIntersectStart, markingMaterial, false);
      buildDashedLine(scene, xOffset, leftIntersectEnd, xOffset, rightIntersectStart, markingMaterial, false);
      buildDashedLine(scene, xOffset, rightIntersectEnd, xOffset, 40, markingMaterial, false);
    }
  }

  const centerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd00,
    transparent: true,
    opacity: 0.7
  });

  for (const hz of horizontalPositions) {
    buildSolidLine(scene, -40, hz, leftIntersectStart, hz, centerMaterial, true);
    buildSolidLine(scene, leftIntersectEnd, hz, rightIntersectStart, hz, centerMaterial, true);
    buildSolidLine(scene, rightIntersectEnd, hz, 40, hz, centerMaterial, true);
  }

  for (const vx of verticalPositions) {
    buildSolidLine(scene, vx, -40, vx, leftIntersectStart, centerMaterial, false);
    buildSolidLine(scene, vx, leftIntersectEnd, vx, rightIntersectStart, centerMaterial, false);
    buildSolidLine(scene, vx, rightIntersectEnd, vx, 40, centerMaterial, false);
  }
}

function buildDashedLine(
  scene: THREE.Scene,
  x1: number, z1: number,
  x2: number, z2: number,
  material: THREE.Material,
  horizontal: boolean
): void {
  const dashLength = 2;
  const gapLength = 2;
  const totalLength = horizontal
    ? Math.abs(x2 - x1)
    : Math.abs(z2 - z1);
  const lineWidth = 0.15;

  const segments = Math.floor(totalLength / (dashLength + gapLength));
  const startX = Math.min(x1, x2);
  const startZ = Math.min(z1, z2);

  for (let i = 0; i < segments; i++) {
    let geometry: THREE.PlaneGeometry;
    let mesh: THREE.Mesh;

    if (horizontal) {
      geometry = new THREE.PlaneGeometry(dashLength, lineWidth);
      mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        startX + i * (dashLength + gapLength) + dashLength / 2,
        0.02,
        z1
      );
    } else {
      geometry = new THREE.PlaneGeometry(lineWidth, dashLength);
      mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        x1,
        0.02,
        startZ + i * (dashLength + gapLength) + dashLength / 2
      );
    }
    scene.add(mesh);
  }
}

function buildSolidLine(
  scene: THREE.Scene,
  x1: number, z1: number,
  x2: number, z2: number,
  material: THREE.Material,
  horizontal: boolean
): void {
  const lineWidth = 0.2;
  let geometry: THREE.PlaneGeometry;
  let mesh: THREE.Mesh;

  if (horizontal) {
    const length = Math.abs(x2 - x1);
    geometry = new THREE.PlaneGeometry(length, lineWidth);
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((x1 + x2) / 2, 0.02, z1);
  } else {
    const length = Math.abs(z2 - z1);
    geometry = new THREE.PlaneGeometry(lineWidth, length);
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x1, 0.02, (z1 + z2) / 2);
  }
  scene.add(mesh);
}

function buildIntersections(scene: THREE.Scene): void {
  const intersectionMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.85,
    metalness: 0.05
  });

  const size = ROAD_WIDTH;
  const positions = [
    [-20, -20], [20, -20], [-20, 20], [20, 20]
  ];

  for (const [x, z] of positions) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geometry, intersectionMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.015, z);
    scene.add(mesh);
  }
}

function buildTrafficLight(
  scene: THREE.Scene,
  hPos: number,
  vPos: number,
  startId: number
): TrafficLight[] {
  const lights: TrafficLight[] = [];

  const poleHeight = 5;
  const poleRadius = 0.15;

  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.8,
    roughness: 0.3
  });

  const offsets = [
    { x: -ROAD_WIDTH / 2 - 1.5, z: -ROAD_WIDTH / 2 - 1.5, rot: Math.PI / 4 },
    { x: ROAD_WIDTH / 2 + 1.5, z: ROAD_WIDTH / 2 + 1.5, rot: -Math.PI * 3 / 4 }
  ];

  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    const lightGroup = new THREE.Group();

    const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius * 1.2, poleHeight, 16);
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = poleHeight / 2;
    pole.castShadow = true;
    lightGroup.add(pole);

    const boxWidth = 0.8;
    const boxHeight = 2;
    const boxDepth = 0.5;
    const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.4
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = poleHeight - boxHeight / 2 - 0.2;
    lightGroup.add(box);

    const lightRadius = 0.22;
    const lightSpacing = 0.55;

    const redMaterial = new THREE.MeshBasicMaterial({ color: 0x330000 });
    const yellowMaterial = new THREE.MeshBasicMaterial({ color: 0x333300 });
    const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x003300 });

    const redGeometry = new THREE.SphereGeometry(lightRadius, 16, 16);
    const redLight = new THREE.Mesh(redGeometry, redMaterial);
    redLight.position.set(0, poleHeight - 0.6, boxDepth / 2 + 0.01);
    lightGroup.add(redLight);

    const yellowGeometry = new THREE.SphereGeometry(lightRadius, 16, 16);
    const yellowLight = new THREE.Mesh(yellowGeometry, yellowMaterial);
    yellowLight.position.set(0, poleHeight - 0.6 - lightSpacing, boxDepth / 2 + 0.01);
    lightGroup.add(yellowLight);

    const greenGeometry = new THREE.SphereGeometry(lightRadius, 16, 16);
    const greenLight = new THREE.Mesh(greenGeometry, greenMaterial);
    greenLight.position.set(0, poleHeight - 0.6 - lightSpacing * 2, boxDepth / 2 + 0.01);
    lightGroup.add(greenLight);

    const glowGeometry = new THREE.SphereGeometry(lightRadius * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(0, poleHeight - 0.6 - lightSpacing * 2, boxDepth / 2 + 0.1);
    lightGroup.add(glowMesh);

    lightGroup.position.set(hPos + offset.x, 0, vPos + offset.z);
    lightGroup.rotation.y = offset.rot;
    lightGroup.userData.lightId = startId + i;

    scene.add(lightGroup);

    const direction = i === 0 ? 'vertical' : 'horizontal';
    const initialColor: LightColor = direction === 'horizontal' ? 'green' : 'red';

    const trafficLight: TrafficLight = {
      id: startId + i,
      position: new THREE.Vector3(hPos + offset.x, 0, vPos + offset.z),
      currentColor: initialColor,
      timer: 0,
      manualMode: false,
      direction,
      mesh: lightGroup,
      redLight,
      yellowLight,
      greenLight,
      glowMesh
    };

    updateTrafficLightVisual(trafficLight);
    lights.push(trafficLight);
  }

  return lights;
}

export function updateTrafficLightVisual(light: TrafficLight): void {
  const redMat = light.redLight.material as THREE.MeshBasicMaterial;
  const yellowMat = light.yellowLight.material as THREE.MeshBasicMaterial;
  const greenMat = light.greenLight.material as THREE.MeshBasicMaterial;
  const glowMat = light.glowMesh.material as THREE.MeshBasicMaterial;

  redMat.color.setHex(0x330000);
  yellowMat.color.setHex(0x333300);
  greenMat.color.setHex(0x003300);
  glowMat.opacity = 0;

  switch (light.currentColor) {
    case 'red':
      redMat.color.setHex(0xff2222);
      light.glowMesh.position.copy(light.redLight.position);
      glowMat.color.setHex(0xff2222);
      glowMat.opacity = 0.3;
      break;
    case 'yellow':
      yellowMat.color.setHex(0xffff22);
      light.glowMesh.position.copy(light.yellowLight.position);
      glowMat.color.setHex(0xffff22);
      glowMat.opacity = 0.3;
      break;
    case 'green':
      greenMat.color.setHex(0x22ff22);
      light.glowMesh.position.copy(light.greenLight.position);
      glowMat.color.setHex(0x22ff22);
      glowMat.opacity = 0.3;
      break;
  }
}
