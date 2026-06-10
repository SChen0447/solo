import * as THREE from 'three';

export interface SceneBuildResult {
  group: THREE.Group;
  colliders: THREE.Box3[];
}

function createBrickTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const brickColor = '#A08060';
  const mortarColor = '#4A3A2A';
  const brickW = 64;
  const brickH = 32;

  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = brickColor;
  for (let y = 0; y < 256; y += brickH) {
    const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
    for (let x = -brickW; x < 256 + brickW; x += brickW) {
      const px = x + offset;
      const jitterX = (Math.random() - 0.5) * 2;
      const jitterY = (Math.random() - 0.5) * 2;
      const colorVariation = 1 + (Math.random() - 0.5) * 0.3;
      const r = Math.min(255, Math.max(0, 160 * colorVariation));
      const g = Math.min(255, Math.max(0, 128 * colorVariation));
      const b = Math.min(255, Math.max(0, 96 * colorVariation));
      ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
      ctx.fillRect(px + 1 + jitterX, y + 1 + jitterY, brickW - 2, brickH - 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function createBrickMaterial(colorHex: number): THREE.MeshStandardMaterial {
  const brickTexture = createBrickTexture();
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.75,
    metalness: 0.05,
    map: brickTexture
  });
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function buildCastleRuins(): SceneBuildResult {
  const group = new THREE.Group();
  const colliders: THREE.Box3[] = [];

  const outerWallColor = 0x8B7355;
  const innerWallColor = 0x6B5B4B;
  const wallThickness = 0.4;
  const radius = 10;

  const outerMat = createBrickMaterial(outerWallColor);
  const innerMat = createBrickMaterial(innerWallColor);

  const groundGeo = new THREE.CircleGeometry(radius + 5, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3d3228,
    roughness: 1.0,
    metalness: 0.0
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const numWalls = 6;
  for (let i = 0; i < numWalls; i++) {
    const angleStart = (i / numWalls) * Math.PI * 2;
    const angleEnd = ((i + 1) / numWalls) * Math.PI * 2;
    const gapSize = randRange(1, 2);
    const gapFraction = gapSize / (2 * Math.PI * radius);
    const segmentStart = angleStart + gapFraction * Math.PI;
    const segmentEnd = angleEnd - gapFraction * Math.PI;
    const segmentAngle = (segmentStart + segmentEnd) / 2;

    const segLength = radius * (segmentEnd - segmentStart);
    if (segLength <= 0.5) continue;

    const height = randRange(2, 4);
    const wallGeo = new THREE.BoxGeometry(segLength, height, wallThickness);
    const wallMesh = new THREE.Mesh(wallGeo, outerMat);

    const posAngle = segmentAngle;
    const dist = radius - wallThickness / 2;
    wallMesh.position.set(
      Math.cos(posAngle) * dist,
      height / 2,
      Math.sin(posAngle) * dist
    );
    wallMesh.rotation.y = -posAngle + Math.PI / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);

    const innerWallGeo = new THREE.BoxGeometry(segLength - 0.02, height, wallThickness);
    const innerWallMesh = new THREE.Mesh(innerWallGeo, innerMat);
    innerWallMesh.position.set(
      Math.cos(posAngle) * (dist - wallThickness * 0.6),
      height / 2,
      Math.sin(posAngle) * (dist - wallThickness * 0.6)
    );
    innerWallMesh.rotation.y = -posAngle + Math.PI / 2;
    innerWallMesh.castShadow = true;
    innerWallMesh.receiveShadow = true;
    group.add(innerWallMesh);

    const topSegments = Math.floor(segLength / 0.8);
    for (let t = 0; t < topSegments; t++) {
      if (Math.random() < 0.35) continue;
      const crenHeight = randRange(0.3, 0.8);
      const crenWidth = 0.6;
      const crenGeo = new THREE.BoxGeometry(crenWidth, crenHeight, wallThickness + 0.05);
      const crenMesh = new THREE.Mesh(crenGeo, outerMat);
      const tFrac = (t / topSegments) - 0.5;
      crenMesh.position.set(
        wallMesh.position.x + Math.cos(posAngle + Math.PI / 2) * tFrac * segLength,
        height + crenHeight / 2,
        wallMesh.position.z + Math.sin(posAngle + Math.PI / 2) * tFrac * segLength
      );
      crenMesh.rotation.y = wallMesh.rotation.y;
      crenMesh.castShadow = true;
      group.add(crenMesh);
    }

    const wallBox = new THREE.Box3().setFromObject(wallMesh);
    wallBox.expandByScalar(0.1);
    colliders.push(wallBox);
    const innerBox = new THREE.Box3().setFromObject(innerWallMesh);
    innerBox.expandByScalar(0.1);
    colliders.push(innerBox);
  }

  const towerPositions = [
    { angle: Math.PI * 0.15, r: radius - 0.5 },
    { angle: Math.PI * 0.65, r: radius - 0.5 }
  ];

  for (const tp of towerPositions) {
    const towerHeight = randRange(5, 8);
    const towerRadius = randRange(0.9, 1.3);

    const towerGeo = new THREE.CylinderGeometry(towerRadius, towerRadius * 1.1, towerHeight, 8);
    const towerMesh = new THREE.Mesh(towerGeo, outerMat);
    towerMesh.position.set(
      Math.cos(tp.angle) * tp.r,
      towerHeight / 2,
      Math.sin(tp.angle) * tp.r
    );
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    group.add(towerMesh);

    const crenCount = 8;
    for (let c = 0; c < crenCount; c++) {
      if (Math.random() < 0.3) continue;
      const crenAngle = (c / crenCount) * Math.PI * 2;
      const crenHeight = randRange(0.4, 0.9);
      const crenWidth = 0.4;
      const crenDepth = 0.35;
      const crenGeo = new THREE.BoxGeometry(crenWidth, crenHeight, crenDepth);
      const crenMesh = new THREE.Mesh(crenGeo, outerMat);
      crenMesh.position.set(
        towerMesh.position.x + Math.cos(crenAngle) * towerRadius,
        towerHeight + crenHeight / 2,
        towerMesh.position.z + Math.sin(crenAngle) * towerRadius
      );
      crenMesh.rotation.y = -crenAngle + Math.PI / 2;
      crenMesh.castShadow = true;
      group.add(crenMesh);
    }

    const coneHeight = randRange(1.2, 2.0);
    if (Math.random() < 0.7) {
      const coneGeo = new THREE.ConeGeometry(towerRadius * 1.05, coneHeight, 8);
      const coneMesh = new THREE.Mesh(coneGeo, outerMat);
      coneMesh.position.set(
        towerMesh.position.x,
        towerHeight + coneHeight / 2,
        towerMesh.position.z
      );
      coneMesh.castShadow = true;
      group.add(coneMesh);

      const notchCount = Math.floor(randRange(1, 3));
      for (let n = 0; n < notchCount; n++) {
        const notchGeo = new THREE.BoxGeometry(0.4, 0.6, 0.4);
        const notchMesh = new THREE.Mesh(notchGeo, new THREE.MeshBasicMaterial({ visible: false }));
        const nAngle = Math.random() * Math.PI * 2;
        notchMesh.position.set(
          towerMesh.position.x + Math.cos(nAngle) * towerRadius * 0.6,
          towerHeight + coneHeight * 0.7,
          towerMesh.position.z + Math.sin(nAngle) * towerRadius * 0.6
        );
      }
    }

    const towerBox = new THREE.Box3().setFromObject(towerMesh);
    towerBox.expandByScalar(0.15);
    colliders.push(towerBox);
  }

  for (let i = 0; i < 3; i++) {
    const pAngle = Math.random() * Math.PI * 2;
    const pDist = randRange(2, radius - 2);
    const pillarHeight = randRange(2.5, 4.5);
    const pillarRadius = randRange(0.25, 0.45);

    const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius * 1.1, pillarHeight, 10);
    const pillarMesh = new THREE.Mesh(pillarGeo, outerMat);

    const tiltAngle = randRange(10, 30) * (Math.PI / 180);
    const tiltAxis = Math.random() * Math.PI * 2;

    pillarMesh.position.set(
      Math.cos(pAngle) * pDist,
      pillarHeight / 2 * Math.cos(tiltAngle),
      Math.sin(pAngle) * pDist
    );
    pillarMesh.rotation.z = Math.cos(tiltAxis) * tiltAngle;
    pillarMesh.rotation.x = Math.sin(tiltAxis) * tiltAngle;
    pillarMesh.castShadow = true;
    pillarMesh.receiveShadow = true;
    group.add(pillarMesh);

    const pillarBox = new THREE.Box3().setFromObject(pillarMesh);
    pillarBox.expandByScalar(0.1);
    colliders.push(pillarBox);
  }

  const rubbleCount = Math.floor(randRange(50, 80));
  for (let i = 0; i < rubbleCount; i++) {
    const rAngle = Math.random() * Math.PI * 2;
    const rDist = randRange(0.5, radius - 0.5);
    const size = randRange(0.08, 0.35);
    const geoType = Math.floor(Math.random() * 3);

    let rubbleGeo: THREE.BufferGeometry;
    if (geoType === 0) {
      rubbleGeo = new THREE.BoxGeometry(size, size * randRange(0.6, 1.2), size * randRange(0.6, 1.2));
    } else if (geoType === 1) {
      rubbleGeo = new THREE.DodecahedronGeometry(size, 0);
    } else {
      rubbleGeo = new THREE.IcosahedronGeometry(size, 0);
    }

    const rubbleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(outerWallColor).multiplyScalar(randRange(0.8, 1.1)).getHex(),
      roughness: 0.9,
      metalness: 0.02
    });

    const rubbleMesh = new THREE.Mesh(rubbleGeo, rubbleMat);
    rubbleMesh.position.set(
      Math.cos(rAngle) * rDist,
      size * 0.4,
      Math.sin(rAngle) * rDist
    );
    rubbleMesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    rubbleMesh.castShadow = true;
    rubbleMesh.receiveShadow = true;
    group.add(rubbleMesh);
  }

  return { group, colliders };
}
