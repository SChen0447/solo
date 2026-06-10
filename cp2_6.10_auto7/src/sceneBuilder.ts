import * as THREE from 'three';

export interface BuildingData {
  id: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

const textureCache = new Map<string, THREE.Texture>();

function createBuildingTexture(baseColor: string): THREE.Texture {
  if (textureCache.has(baseColor)) {
    return textureCache.get(baseColor)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const windowRows = 12;
  const windowCols = 6;
  const windowWidth = 22;
  const windowHeight = 28;
  const startX = 20;
  const startY = 30;
  const gapX = (canvas.width - startX * 2 - windowWidth * windowCols) / (windowCols - 1);
  const gapY = (canvas.height - startY * 2 - windowHeight * windowRows) / (windowRows - 1);

  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const x = startX + col * (windowWidth + gapX);
      const y = startY + row * (windowHeight + gapY);

      const isLit = Math.random() > 0.35;
      if (isLit) {
        const brightness = 180 + Math.floor(Math.random() * 50);
        ctx.fillStyle = `rgb(${brightness + 20}, ${brightness + 10}, ${brightness - 30})`;
      } else {
        ctx.fillStyle = 'rgba(20, 35, 55, 0.75)';
      }
      ctx.fillRect(x, y, windowWidth, windowHeight);

      ctx.strokeStyle = 'rgba(80, 100, 120, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, windowWidth, windowHeight);

      if (isLit) {
        ctx.beginPath();
        ctx.moveTo(x, y + windowHeight / 2);
        ctx.lineTo(x + windowWidth, y + windowHeight / 2);
        ctx.strokeStyle = 'rgba(120, 140, 160, 0.3)';
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;

  textureCache.set(baseColor, texture);
  return texture;
}

export function buildCity(buildingData: BuildingData[]): THREE.Group {
  const cityGroup = new THREE.Group();
  cityGroup.name = 'city';

  const buildingMeshes: THREE.Mesh[] = [];

  for (const data of buildingData) {
    const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);
    const texture = createBuildingTexture(data.color);

    const clonedTexture = texture.clone();
    clonedTexture.needsUpdate = true;
    clonedTexture.repeat.set(
      Math.max(1, Math.round(data.width / 10)),
      Math.max(1, Math.round(data.height / 10))
    );

    const material = new THREE.MeshStandardMaterial({
      map: clonedTexture,
      roughness: 0.85,
      metalness: 0.05,
      color: 0xffffff
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.x, data.height / 2, data.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { buildingId: data.id, buildingHeight: data.height };
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();

    buildingMeshes.push(mesh);
    cityGroup.add(mesh);
  }

  const groundGeometry = new THREE.PlaneGeometry(400, 400);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1a2d,
    roughness: 1.0,
    metalness: 0.0
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  ground.name = 'ground';
  cityGroup.add(ground);

  const gridHelper = new THREE.GridHelper(400, 40, 0x1a3050, 0x0f2040);
  gridHelper.position.y = 0.01;
  (gridHelper.material as THREE.Material).opacity = 0.35;
  (gridHelper.material as THREE.Material).transparent = true;
  cityGroup.add(gridHelper);

  return cityGroup;
}

export function createBuildingTextureForExport(color: string): THREE.Texture {
  return createBuildingTexture(color);
}

export function getBuildingMeshes(group: THREE.Group): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData.buildingId !== undefined) {
      meshes.push(obj);
    }
  });
  return meshes;
}
