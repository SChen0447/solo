import * as THREE from 'three';

export interface TempleColumn {
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalHeight: number;
}

export interface SceneElements {
  columns: TempleColumn[];
  beam: THREE.Mesh;
  templeGroup: THREE.Group;
}

export const sceneElements: SceneElements = {
  columns: [],
  beam: null as unknown as THREE.Mesh,
  templeGroup: null as unknown as THREE.Group
};

function generateMossTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2a4a3a';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 15 + 2;
    const green = Math.floor(Math.random() * 60 + 80);
    const blue = Math.floor(Math.random() * 40 + 60);
    const alpha = Math.random() * 0.6 + 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.floor(green * 0.4)}, ${green}, ${blue}, ${alpha})`;
    ctx.fill();
  }

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function generateReliefTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, size, size);

  const bandHeight = 60;
  const patternWidth = 40;
  
  for (let row = 0; row < 4; row++) {
    const y = row * (bandHeight + 40) + 20;
    for (let x = 0; x < size; x += patternWidth) {
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(x, y, patternWidth, 10);
      ctx.fillRect(x, y + bandHeight - 10, patternWidth, 10);
      ctx.fillRect(x, y, 10, bandHeight);
      ctx.fillRect(x + patternWidth - 10, y, 10, bandHeight);
      
      ctx.fillStyle = '#666666';
      ctx.fillRect(x + 15, y + 15, 10, 10);
      ctx.fillRect(x + 10, y + 30, 20, 5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function generateSeabedTexture(): THREE.Texture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#0a3a4a');
  gradient.addColorStop(1, '#051a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 8 + 1;
    const darkness = Math.random() * 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
    ctx.fill();
  }

  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 3 + 0.5;
    const brightness = Math.random() * 0.15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100, 200, 180, ${brightness})`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createFlutedColumnGeometry(radius: number, height: number, flutes: number): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, flutes * 2, 8, false);
  
  const positions = geometry.attributes.position;
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    
    if (dist < 0.0001 || !isFinite(dist)) continue;
    
    const angle = Math.atan2(x, z);
    if (!isFinite(angle)) continue;
    
    const normalizedAngle = ((angle / (Math.PI * 2)) * flutes + flutes * 2) % flutes;
    const fluteFactor = Math.cos(normalizedAngle * Math.PI * 2) * 0.5 + 0.5;
    const fluteDepth = 0.08 * radius;
    const newDist = dist - fluteDepth * fluteFactor * fluteFactor;
    
    if (newDist <= 0 || !isFinite(newDist)) continue;
    
    const scale = newDist / dist;
    if (!isFinite(scale)) continue;
    
    positions.setX(i, x * scale);
    positions.setZ(i, z * scale);
  }
  
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildSeabed(scene: THREE.Scene) {
  const size = 60;
  const geometry = new THREE.PlaneGeometry(size, size, 10, 10);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const distFromCenter = Math.sqrt(x * x + z * z);
    const centerFactor = Math.max(0, 1 - distFromCenter / 25);
    const height = (Math.random() - 0.5) * 1.5 - centerFactor * 0.3;
    positions.setY(i, height);
  }
  geometry.computeVertexNormals();

  const seabedTexture = generateSeabedTexture();
  const mossTexture = generateMossTexture();

  const material = new THREE.MeshStandardMaterial({
    map: seabedTexture,
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  scene.add(terrain);

  const particlesCount = 500;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particlesCount * 3);
  for (let i = 0; i < particlesCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 60;
    particlePositions[i * 3 + 1] = Math.random() * 15 + 1;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.computeBoundingSphere();

  const particleMaterial = new THREE.PointsMaterial({
    color: 0x88ddcc,
    size: 0.08,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.name = 'waterParticles';
  particles.castShadow = false;
  particles.receiveShadow = false;
  scene.add(particles);
}

function buildTempleRuins(scene: THREE.Scene) {
  const templeGroup = new THREE.Group();
  sceneElements.templeGroup = templeGroup;

  const mossTexture = generateMossTexture();
  const reliefTexture = generateReliefTexture();

  const columnHeight = 6;
  const columnRadius = 0.5;
  const flutes = 8;

  const columnPositions = [
    new THREE.Vector3(-3, 0, -3),
    new THREE.Vector3(3, 0, -3),
    new THREE.Vector3(-3, 0, 3),
    new THREE.Vector3(3, 0, 3)
  ];

  const stoneBaseColor = new THREE.Color(0x8a8a7a);

  columnPositions.forEach((pos, index) => {
    const columnGeometry = createFlutedColumnGeometry(columnRadius, columnHeight, flutes);
    
    const columnMaterial = new THREE.MeshStandardMaterial({
      color: stoneBaseColor,
      roughness: 0.85,
      metalness: 0.05,
      bumpMap: reliefTexture,
      bumpScale: 0.08
    });

    const column = new THREE.Mesh(columnGeometry, columnMaterial);
    column.position.copy(pos);
    column.position.y = columnHeight / 2;
    column.castShadow = true;
    column.receiveShadow = true;

    const mossMaterial = new THREE.MeshStandardMaterial({
      map: mossTexture,
      transparent: true,
      opacity: 0.45,
      roughness: 1,
      metalness: 0,
      depthWrite: false
    });
    const mossGeometry = createFlutedColumnGeometry(columnRadius * 1.015, columnHeight * 1.015, flutes);
    const mossMesh = new THREE.Mesh(mossGeometry, mossMaterial);
    mossMesh.castShadow = false;
    mossMesh.receiveShadow = false;
    column.add(mossMesh);

    const baseGeometry = new THREE.CylinderGeometry(columnRadius * 1.4, columnRadius * 1.6, 0.4, 24);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: stoneBaseColor.clone().multiplyScalar(0.9),
      roughness: 0.9,
      metalness: 0.05
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -columnHeight / 2 - 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    column.add(base);

    const capitalGeometry = new THREE.CylinderGeometry(columnRadius * 1.3, columnRadius * 1.1, 0.5, 24);
    const capital = new THREE.Mesh(capitalGeometry, baseMaterial);
    capital.position.y = columnHeight / 2 + 0.25;
    capital.castShadow = true;
    capital.receiveShadow = true;
    column.add(capital);

    if (index === 2) {
      column.position.y -= 0.8;
      column.rotation.z = 0.15;
      column.rotation.x = -0.05;
    }
    if (index === 3) {
      column.rotation.y = 0.1;
    }

    templeGroup.add(column);
    
    sceneElements.columns.push({
      mesh: column,
      originalPosition: pos.clone(),
      originalHeight: columnHeight
    });
  });

  const beamGeometry = new THREE.BoxGeometry(8, 0.6, 1);
  const beamMaterial = new THREE.MeshStandardMaterial({
    color: stoneBaseColor,
    roughness: 0.9,
    metalness: 0.05,
    bumpMap: reliefTexture,
    bumpScale: 0.05
  });
  const beam = new THREE.Mesh(beamGeometry, beamMaterial);
  
  beam.position.set(0, 2, 0);
  beam.rotation.x = Math.PI * 0.12;
  beam.rotation.y = Math.PI * 0.3;
  beam.rotation.z = -Math.PI * 0.08;
  beam.castShadow = true;
  beam.receiveShadow = true;

  const beamMossMaterial = new THREE.MeshStandardMaterial({
    map: mossTexture,
    transparent: true,
    opacity: 0.4,
    roughness: 1,
    metalness: 0,
    depthWrite: false
  });
  const beamMossGeometry = new THREE.BoxGeometry(8 * 1.02, 0.6 * 1.02, 1 * 1.02);
  const beamMoss = new THREE.Mesh(beamMossGeometry, beamMossMaterial);
  beamMoss.castShadow = false;
  beamMoss.receiveShadow = false;
  beam.add(beamMoss);

  templeGroup.add(beam);
  sceneElements.beam = beam;

  addScatteredStones(templeGroup, stoneBaseColor, mossTexture);

  scene.add(templeGroup);
}

function addScatteredStones(group: THREE.Group, stoneColor: THREE.Color, mossTexture: THREE.Texture) {
  const stonePositions = [
    { pos: new THREE.Vector3(-5, 0.3, -1), rot: new THREE.Vector3(0.2, 0.5, 0.1), scale: new THREE.Vector3(1.2, 0.6, 0.8) },
    { pos: new THREE.Vector3(5, 0.2, 1.5), rot: new THREE.Vector3(-0.3, 0.8, 0.2), scale: new THREE.Vector3(0.8, 0.5, 1) },
    { pos: new THREE.Vector3(-1, 0.15, 5), rot: new THREE.Vector3(0.1, 0.3, -0.15), scale: new THREE.Vector3(1, 0.4, 0.7) },
    { pos: new THREE.Vector3(1.5, 0.25, -5), rot: new THREE.Vector3(0.4, 0.6, 0.3), scale: new THREE.Vector3(0.9, 0.6, 0.9) },
    { pos: new THREE.Vector3(-4, 0.2, 4), rot: new THREE.Vector3(-0.2, 0.4, 0.1), scale: new THREE.Vector3(0.7, 0.5, 0.6) },
    { pos: new THREE.Vector3(4.5, 0.18, -3), rot: new THREE.Vector3(0.15, 0.2, 0.25), scale: new THREE.Vector3(0.6, 0.4, 0.8) }
  ];

  stonePositions.forEach(({ pos, rot, scale }) => {
    const geometry = new THREE.DodecahedronGeometry(0.5, 0);
    const material = new THREE.MeshStandardMaterial({
      color: stoneColor.clone().multiplyScalar(0.85 + Math.random() * 0.2),
      roughness: 0.95,
      metalness: 0.03
    });
    const stone = new THREE.Mesh(geometry, material);
    stone.position.copy(pos);
    stone.rotation.set(rot.x, rot.y, rot.z);
    stone.scale.copy(scale);
    stone.castShadow = true;
    stone.receiveShadow = true;

    const mossMaterial = new THREE.MeshStandardMaterial({
      map: mossTexture,
      transparent: true,
      opacity: 0.35,
      roughness: 1,
      depthWrite: false
    });
    const mossGeometry = new THREE.DodecahedronGeometry(0.5 * 1.03, 0);
    const moss = new THREE.Mesh(mossGeometry, mossMaterial);
    moss.scale.copy(scale);
    moss.castShadow = false;
    moss.receiveShadow = false;
    stone.add(moss);

    group.add(stone);
  });
}

export function buildScene(scene: THREE.Scene) {
  buildSeabed(scene);
  buildTempleRuins(scene);
}
