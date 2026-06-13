import * as THREE from 'three';

export interface GardenObjects {
  ground: THREE.Mesh;
  fountain: THREE.Group;
  fountainBody: THREE.Mesh;
  streams: THREE.Group;
  plants: THREE.Group;
  barrier: THREE.Group;
  barrierInner: THREE.Mesh;
  barrierLines: THREE.Line[];
}

const STREAM_COUNT = 6;
const PLANTS_PER_SIDE = 3;
const BARRIER_RADIUS = 6;

export function createGarden(scene: THREE.Scene): GardenObjects {
  const ground = createGround();
  scene.add(ground);

  const fountain = createFountain();
  scene.add(fountain);

  const streams = createStreams();
  scene.add(streams);

  const plants = createPlants(streams);
  scene.add(plants);

  const barrier = createBarrier();
  scene.add(barrier);

  const fountainBody = fountain.getObjectByName('fountainBody') as THREE.Mesh;
  const barrierInner = barrier.getObjectByName('barrierInner') as THREE.Mesh;
  const barrierLines: THREE.Line[] = [];
  barrier.traverse((obj) => {
    if (obj instanceof THREE.Line) {
      barrierLines.push(obj);
    }
  });

  return {
    ground,
    fountain,
    fountainBody,
    streams,
    plants,
    barrier,
    barrierInner,
    barrierLines
  };
}

function createGround(): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(BARRIER_RADIUS + 1, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a1a,
    metalness: 0.6,
    roughness: 0.15,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    reflectivity: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  return ground;
}

function createFountain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'fountain';

  const baseGeometry = new THREE.CylinderGeometry(1.1, 1.2, 0.2, 32);
  const baseMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1e1b4b,
    metalness: 0.9,
    roughness: 0.15,
    transparent: true,
    opacity: 0.95,
    clearcoat: 1,
    clearcoatRoughness: 0.1
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.1;
  group.add(base);

  const bodyGeometry = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7dd3fc,
    emissive: 0x7dd3fc,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.7,
    clearcoat: 1,
    clearcoatRoughness: 0.05
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.2;
  body.name = 'fountainBody';
  group.add(body);

  const innerGlowGeometry = new THREE.SphereGeometry(0.6, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const innerGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xc084fc,
    transparent: true,
    opacity: 0.5,
    side: THREE.BackSide
  });
  const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
  innerGlow.position.y = 0.2;
  innerGlow.name = 'fountainInnerGlow';
  group.add(innerGlow);

  const coreGeometry = new THREE.SphereGeometry(0.3, 24, 16);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.y = 0.6;
  core.name = 'fountainCore';
  group.add(core);

  const pointLight = new THREE.PointLight(0x7dd3fc, 3, 20);
  pointLight.position.set(0, 1.5, 0);
  group.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xc084fc, 1.5, 12);
  pointLight2.position.set(0, 0.5, 0);
  group.add(pointLight2);

  return group;
}

function createStreams(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'streams';

  for (let i = 0; i < STREAM_COUNT; i++) {
    const angle = (i / STREAM_COUNT) * Math.PI * 2;
    const stream = createSingleStream(i);
    stream.rotation.y = angle;
    group.add(stream);
  }

  return group;
}

function createSingleStream(index: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `stream_${index}`;

  const length = 4;
  const width = 0.3;

  const bedGeometry = new THREE.BoxGeometry(length, 0.08, width);
  const bedMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1e1b4b,
    metalness: 0.6,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8
  });
  const bed = new THREE.Mesh(bedGeometry, bedMaterial);
  bed.position.set(length / 2 + 1, 0.04, 0);
  group.add(bed);

  const waterGeometry = new THREE.BoxGeometry(length, 0.06, width - 0.05);
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7dd3fc,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.9
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.position.set(length / 2 + 1, 0.1, 0);
  water.name = 'streamWater';
  group.add(water);

  return group;
}

function createPlants(streamsGroup: THREE.Group): THREE.Group {
  const group = new THREE.Group();
  group.name = 'plants';

  const streamLength = 4;
  const streamWidth = 0.3;

  for (let i = 0; i < STREAM_COUNT; i++) {
    const angle = (i / STREAM_COUNT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let j = 0; j < PLANTS_PER_SIDE; j++) {
      const dist = 1.2 + (j / PLANTS_PER_SIDE) * (streamLength - 0.5);
      const perpAngle = angle + Math.PI / 2;
      const perpDist = streamWidth / 2 + 0.3;

      const leftPlant = createPlant(i * PLANTS_PER_SIDE * 2 + j * 2);
      const lx = dist * cos + perpDist * Math.cos(perpAngle);
      const lz = dist * sin + perpDist * Math.sin(perpAngle);
      leftPlant.position.set(lx, 0, lz);
      leftPlant.rotation.y = -angle + Math.PI / 2;
      leftPlant.userData.baseAngle = angle + Math.PI / 2;
      group.add(leftPlant);

      const rightPlant = createPlant(i * PLANTS_PER_SIDE * 2 + j * 2 + 1);
      const rx = dist * cos - perpDist * Math.cos(perpAngle);
      const rz = dist * sin - perpDist * Math.sin(perpAngle);
      rightPlant.position.set(rx, 0, rz);
      rightPlant.rotation.y = -angle - Math.PI / 2;
      rightPlant.userData.baseAngle = angle - Math.PI / 2;
      group.add(rightPlant);
    }
  }

  return group;
}

function createPlant(index: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `plant_${index}`;

  const height = 0.5 + Math.random() * 0.7;
  const radius = 0.08 + Math.random() * 0.04;

  const prismGeometry = new THREE.CylinderGeometry(radius * 0.7, radius, height, 6);
  
  const warmColors = [0xfcd34d, 0xfb923c, 0xf472b6];
  const coolColors = [0x38bdf8, 0x818cf8, 0xa78bfa];
  const colorIndex = index % 3;
  
  const materials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const warmColor = new THREE.Color(warmColors[colorIndex]);
    const coolColor = new THREE.Color(coolColors[colorIndex]);
    const mixed = warmColor.clone().lerp(coolColor, t);
    
    const mat = new THREE.MeshPhysicalMaterial({
      color: mixed,
      emissive: mixed,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9,
      metalness: 0.4,
      roughness: 0.3
    });
    materials.push(mat);
  }

  const topMat = new THREE.MeshPhysicalMaterial({
    color: warmColors[colorIndex],
    emissive: warmColors[colorIndex],
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.9
  });
  const bottomMat = new THREE.MeshPhysicalMaterial({
    color: coolColors[colorIndex],
    emissive: coolColors[colorIndex],
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.9
  });

  const finalMaterials = [...materials, topMat, bottomMat];

  const prism = new THREE.Mesh(prismGeometry, finalMaterials);
  prism.position.y = height / 2;
  group.add(prism);

  const glowGeometry = new THREE.CylinderGeometry(radius * 0.5, radius * 0.3, height * 1.1, 6);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.y = height / 2;
  group.add(glow);

  group.userData.height = height;
  group.userData.warmColor = new THREE.Color(warmColors[colorIndex]);
  group.userData.coolColor = new THREE.Color(coolColors[colorIndex]);
  group.userData.prism = prism;
  group.userData.glow = glow;

  return group;
}

function createBarrier(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'barrier';

  const outerGeometry = new THREE.SphereGeometry(BARRIER_RADIUS, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const outerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x818cf8,
    transparent: true,
    opacity: 0.12,
    side: THREE.FrontSide,
    metalness: 1,
    roughness: 0.02,
    transmission: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.5
  });
  const outer = new THREE.Mesh(outerGeometry, outerMaterial);
  outer.name = 'barrierOuter';
  group.add(outer);

  const innerGeometry = new THREE.SphereGeometry(BARRIER_RADIUS - 0.05, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2);
  const innerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.02,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.3,
    envMapIntensity: 2.5,
    clearcoat: 1,
    clearcoatRoughness: 0.02
  });
  const inner = new THREE.Mesh(innerGeometry, innerMaterial);
  inner.name = 'barrierInner';
  group.add(inner);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x818cf8,
    transparent: true,
    opacity: 0.9,
    linewidth: 1
  });

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= 48; j++) {
      const phi = (j / 48) * (Math.PI / 2);
      const r = BARRIER_RADIUS - 0.02;
      points.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(angle),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(angle)
      ));
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.name = `barrierMeridian_${i}`;
    group.add(line);
  }

  for (let i = 1; i <= 3; i++) {
    const phi = (i / 4) * (Math.PI / 2);
    const r = BARRIER_RADIUS - 0.02;
    const y = r * Math.cos(phi);
    const ringRadius = r * Math.sin(phi);
    
    const points: THREE.Vector3[] = [];
    for (let j = 0; j <= 96; j++) {
      const angle = (j / 96) * Math.PI * 2;
      points.push(new THREE.Vector3(
        ringRadius * Math.cos(angle),
        y,
        ringRadius * Math.sin(angle)
      ));
    }
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.name = `barrierParallel_${i}`;
    group.add(line);
  }

  const equatorPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 96; i++) {
    const angle = (i / 96) * Math.PI * 2;
    const r = BARRIER_RADIUS - 0.02;
    equatorPoints.push(new THREE.Vector3(
      r * Math.cos(angle),
      0.01,
      r * Math.sin(angle)
    ));
  }
  const equatorGeometry = new THREE.BufferGeometry().setFromPoints(equatorPoints);
  const equatorLine = new THREE.Line(equatorGeometry, lineMaterial);
  equatorLine.name = 'barrierEquator';
  group.add(equatorLine);

  return group;
}

export function updatePlantColors(plantsGroup: THREE.Group, cameraAngle: number): void {
  plantsGroup.children.forEach((plant) => {
    if (!plant.userData.prism) return;
    
    const baseAngle = plant.userData.baseAngle || 0;
    const angleDiff = Math.atan2(
      Math.sin(cameraAngle - baseAngle),
      Math.cos(cameraAngle - baseAngle)
    );
    const t = (Math.cos(angleDiff) + 1) / 2;

    const warmColor = plant.userData.warmColor as THREE.Color;
    const coolColor = plant.userData.coolColor as THREE.Color;
    const prism = plant.userData.prism as THREE.Mesh;

    if (Array.isArray(prism.material)) {
      prism.material.forEach((mat, idx) => {
        if (mat instanceof THREE.MeshPhysicalMaterial) {
          const sideT = (idx / 6 + t) % 1;
          const mixed = warmColor.clone().lerp(coolColor, sideT);
          mat.color.copy(mixed);
          mat.emissive.copy(mixed);
        }
      });
    }
  });
}

export function bendPlants(plantsGroup: THREE.Group, bendAmount: number): void {
  plantsGroup.children.forEach((plant, index) => {
    const prism = plant.userData.prism as THREE.Mesh;
    if (prism) {
      const bend = bendAmount * (0.5 + Math.random() * 0.5);
      prism.rotation.z = bend * (index % 2 === 0 ? 1 : -1);
    }
  });
}

export function updateStreamColors(streamsGroup: THREE.Group, time: number): void {
  const colors = [0x7dd3fc, 0xa78bfa, 0xf0abfc, 0x7dd3fc];
  const cycle = (time % 2) / 2;
  const colorIndex = Math.floor(cycle * 3);
  const t = (cycle * 3) % 1;

  const c1 = new THREE.Color(colors[colorIndex]);
  const c2 = new THREE.Color(colors[Math.min(colorIndex + 1, 3)]);
  const mixed = c1.clone().lerp(c2, t);

  streamsGroup.children.forEach((stream) => {
    const water = stream.getObjectByName('streamWater') as THREE.Mesh;
    if (water && water.material instanceof THREE.MeshPhysicalMaterial) {
      water.material.color.copy(mixed);
      water.material.emissive.copy(mixed);
    }
  });
}

export function updateFountainHeight(fountainGroup: THREE.Group, height: number): void {
  const body = fountainGroup.getObjectByName('fountainBody') as THREE.Mesh;
  if (body) {
    const targetScale = height / 1;
    body.scale.y = targetScale;
    body.position.y = 0.2 + (height - 1) * 0.5;
  }

  fountainGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj !== body && obj.geometry instanceof THREE.SphereGeometry) {
      const scaleY = height / 1;
      obj.scale.y = scaleY;
      if (obj.name !== '') {
        obj.position.y = 0.2 + (height - 1) * 0.5;
      }
    }
  });

  let lightIndex = 0;
  fountainGroup.traverse((obj) => {
    if (obj instanceof THREE.PointLight) {
      if (lightIndex === 0) {
        obj.position.y = 0.5 + height * 1.2;
      } else {
        obj.position.y = 0.3 + height * 0.4;
      }
      lightIndex++;
    }
  });
}

export function updateBarrierLines(barrierLines: THREE.Line[], time: number): void {
  const cycle = (time % 4) / 4;
  const pulse = 0.5 + 0.5 * Math.sin(cycle * Math.PI * 2);

  barrierLines.forEach((line, idx) => {
    if (line.material instanceof THREE.LineBasicMaterial) {
      const phaseOffset = (idx / barrierLines.length) * Math.PI * 2;
      const brightness = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(cycle * Math.PI * 2 + phaseOffset));
      line.material.opacity = 0.3 + brightness * 0.7;
    }
  });
}

export function updateStreamFlow(streamsGroup: THREE.Group, intensity: number): void {
  streamsGroup.children.forEach((stream) => {
    const water = stream.getObjectByName('streamWater') as THREE.Mesh;
    if (water && water.material instanceof THREE.MeshPhysicalMaterial) {
      water.material.emissiveIntensity = 0.3 + intensity * 0.7;
      water.material.roughness = Math.max(0.05, 0.3 - intensity * 0.25);
    }
  });
}
