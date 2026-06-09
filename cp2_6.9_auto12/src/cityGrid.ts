import * as THREE from 'three';

export interface RoadNode {
  x: number;
  z: number;
  isIntersection: boolean;
  id: string;
}

export interface RoadSegment {
  start: RoadNode;
  end: RoadNode;
  direction: 'horizontal' | 'vertical';
}

export interface IntersectionData {
  x: number;
  z: number;
  id: string;
  node: RoadNode;
}

export interface CityGridData {
  roadNodes: RoadNode[];
  roadSegments: RoadSegment[];
  intersections: Map<string, IntersectionData>;
  roadMeshes: THREE.Mesh[];
  buildingMeshes: THREE.Mesh[];
  trafficLightMeshes: THREE.Mesh[];
  sceneSize: number;
  gridSize: number;
}

const ROAD_WIDTH = 1.2;
const BUILDING_GAP = 0.2;

export function generateCityGrid(density: number): CityGridData {
  const clampedDensity = Math.max(0.3, Math.min(1.0, density));
  const baseGrid = 6;
  const extraDivisions = Math.floor((clampedDensity - 0.3) * 10);
  const gridSize = baseGrid + extraDivisions;
  const blockSize = 4;
  const sceneSize = gridSize * blockSize;

  const roadNodes: RoadNode[] = [];
  const roadSegments: RoadSegment[] = [];
  const intersections = new Map<string, IntersectionData>();
  const roadMeshes: THREE.Mesh[] = [];
  const buildingMeshes: THREE.Mesh[] = [];
  const trafficLightMeshes: THREE.Mesh[] = [];

  const halfScene = sceneSize / 2;
  const spacing = sceneSize / gridSize;

  const nodeMap = new Map<string, RoadNode>();

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = -halfScene + i * spacing;
      const z = -halfScene + j * spacing;
      const isIntersection = true;
      const id = `node_${i}_${j}`;
      const node: RoadNode = { x, z, isIntersection, id };
      nodeMap.set(id, node);
      roadNodes.push(node);

      if (isIntersection) {
        intersections.set(id, { x, z, id, node });
      }
    }
  }

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const start = nodeMap.get(`node_${i}_${j}`)!;
      const end = nodeMap.get(`node_${i}_${j + 1}`)!;
      roadSegments.push({ start, end, direction: 'vertical' });
    }
  }

  for (let j = 0; j <= gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const start = nodeMap.get(`node_${i}_${j}`)!;
      const end = nodeMap.get(`node_${i + 1}_${j}`)!;
      roadSegments.push({ start, end, direction: 'horizontal' });
    }
  }

  const roadMaterial = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });

  for (const seg of roadSegments) {
    const dx = seg.end.x - seg.start.x;
    const dz = seg.end.z - seg.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const midX = (seg.start.x + seg.end.x) / 2;
    const midZ = (seg.start.z + seg.end.z) / 2;

    let geometry: THREE.BoxGeometry;
    let mesh: THREE.Mesh;

    if (seg.direction === 'horizontal') {
      geometry = new THREE.BoxGeometry(length, 0.1, ROAD_WIDTH);
      mesh = new THREE.Mesh(geometry, roadMaterial);
    } else {
      geometry = new THREE.BoxGeometry(ROAD_WIDTH, 0.1, length);
      mesh = new THREE.Mesh(geometry, roadMaterial);
    }
    mesh.position.set(midX, 0.01, midZ);
    mesh.receiveShadow = true;
    roadMeshes.push(mesh);
  }

  const groundGeo = new THREE.PlaneGeometry(sceneSize + 4, sceneSize + 4);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  roadMeshes.push(ground);

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const blockX = -halfScene + (i + 0.5) * spacing;
      const blockZ = -halfScene + (j + 0.5) * spacing;
      const buildingSize = spacing - ROAD_WIDTH - BUILDING_GAP * 2;

      if (buildingSize > 0.5 && Math.random() > 0.15) {
        const height = 1 + Math.random() * 2;
        const buildingGeo = new THREE.BoxGeometry(buildingSize, height, buildingSize);
        const buildingMat = new THREE.MeshLambertMaterial({
          color: 0x2e7d32,
          transparent: true,
          opacity: 0.6
        });
        const building = new THREE.Mesh(buildingGeo, buildingMat);
        building.position.set(blockX, height / 2, blockZ);
        building.castShadow = true;
        building.receiveShadow = true;
        buildingMeshes.push(building);
      }
    }
  }

  for (const [id, inter] of intersections) {
    const offset = ROAD_WIDTH * 0.35;
    const positions = [
      { x: inter.x - offset, z: inter.z - offset, angle: 0 },
      { x: inter.x + offset, z: inter.z - offset, angle: 1 },
      { x: inter.x + offset, z: inter.z + offset, angle: 2 },
      { x: inter.x - offset, z: inter.z + offset, angle: 3 }
    ];

    positions.forEach((pos, idx) => {
      const lightGroup = new THREE.Group();
      lightGroup.name = `trafficLight_${id}_${idx}`;
      lightGroup.userData.intersectionId = id;
      lightGroup.userData.lightIndex = idx;

      const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.5;
      lightGroup.add(pole);

      const redGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const redMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const redLight = new THREE.Mesh(redGeo, redMat);
      redLight.position.set(0, 1.1, 0);
      redLight.name = 'red';
      lightGroup.add(redLight);

      const greenGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const greenLight = new THREE.Mesh(greenGeo, greenMat);
      greenLight.position.set(0, 0.85, 0);
      greenLight.name = 'green';
      lightGroup.add(greenLight);

      lightGroup.position.set(pos.x, 0, pos.z);
      trafficLightMeshes.push(lightGroup as unknown as THREE.Mesh);
    });
  }

  return {
    roadNodes,
    roadSegments,
    intersections,
    roadMeshes,
    buildingMeshes,
    trafficLightMeshes,
    sceneSize,
    gridSize
  };
}

export function disposeCityGrid(data: CityGridData, scene: THREE.Scene): void {
  const allMeshes = [...data.roadMeshes, ...data.buildingMeshes, ...data.trafficLightMeshes];
  for (const mesh of allMeshes) {
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    mesh.traverse?.((child: THREE.Object3D) => {
      const childMesh = child as THREE.Mesh;
      if (childMesh.geometry) childMesh.geometry.dispose();
      if (childMesh.material) {
        if (Array.isArray(childMesh.material)) {
          childMesh.material.forEach(m => m.dispose());
        } else {
          childMesh.material.dispose();
        }
      }
    });
  }
}

export function fadeInCityGrid(data: CityGridData, duration: number = 0.5): Promise<void> {
  return new Promise((resolve) => {
    const allMeshes = [...data.roadMeshes, ...data.buildingMeshes, ...data.trafficLightMeshes];
    const startTime = performance.now();

    allMeshes.forEach(mesh => {
      if (mesh.material && !Array.isArray(mesh.material)) {
        const mat = mesh.material as THREE.MeshLambertMaterial;
        mat.transparent = true;
        mat.opacity = 0;
      }
      mesh.traverse?.((child: THREE.Object3D) => {
        const childMesh = child as THREE.Mesh;
        if (childMesh.material && !Array.isArray(childMesh.material)) {
          const mat = childMesh.material as THREE.MeshLambertMaterial;
          mat.transparent = true;
          mat.opacity = 0;
        }
      });
    });

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      allMeshes.forEach(mesh => {
        if (mesh.material && !Array.isArray(mesh.material)) {
          const mat = mesh.material as THREE.MeshLambertMaterial;
          mat.opacity = eased;
        }
        mesh.traverse?.((child: THREE.Object3D) => {
          const childMesh = child as THREE.Mesh;
          if (childMesh.material && !Array.isArray(childMesh.material)) {
            const mat = childMesh.material as THREE.MeshLambertMaterial;
            mat.opacity = eased;
          }
        });
      });

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        allMeshes.forEach(mesh => {
          if (mesh.material && !Array.isArray(mesh.material)) {
            const mat = mesh.material as THREE.MeshLambertMaterial;
            if (mat.opacity >= 0.99) {
              mat.transparent = false;
              mat.opacity = 1;
            }
          }
        });
        resolve();
      }
    };
    animate();
  });
}

export function fadeOutCityGrid(data: CityGridData, duration: number = 0.5): Promise<void> {
  return new Promise((resolve) => {
    const allMeshes = [...data.roadMeshes, ...data.buildingMeshes, ...data.trafficLightMeshes];
    const startTime = performance.now();
    const startOpacities = new Map<THREE.Material, number>();

    allMeshes.forEach(mesh => {
      if (mesh.material && !Array.isArray(mesh.material)) {
        const mat = mesh.material as THREE.MeshLambertMaterial;
        startOpacities.set(mat, mat.opacity);
        mat.transparent = true;
      }
      mesh.traverse?.((child: THREE.Object3D) => {
        const childMesh = child as THREE.Mesh;
        if (childMesh.material && !Array.isArray(childMesh.material)) {
          const mat = childMesh.material as THREE.MeshLambertMaterial;
          startOpacities.set(mat, mat.opacity);
          mat.transparent = true;
        }
      });
    });

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);

      allMeshes.forEach(mesh => {
        if (mesh.material && !Array.isArray(mesh.material)) {
          const mat = mesh.material as THREE.MeshLambertMaterial;
          const start = startOpacities.get(mat) ?? 1;
          mat.opacity = start * (1 - t);
        }
        mesh.traverse?.((child: THREE.Object3D) => {
          const childMesh = child as THREE.Mesh;
          if (childMesh.material && !Array.isArray(childMesh.material)) {
            const mat = childMesh.material as THREE.MeshLambertMaterial;
            const start = startOpacities.get(mat) ?? 1;
            mat.opacity = start * (1 - t);
          }
        });
      });

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };
    animate();
  });
}
