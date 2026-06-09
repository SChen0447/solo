import * as THREE from 'three';

export interface RuinsData {
  group: THREE.Group;
  columns: THREE.Mesh[];
  arch: { group: THREE.Group; beam: THREE.Mesh; leftPillar: THREE.Mesh; rightPillar: THREE.Mesh };
  altar: THREE.Mesh;
  seaweed: THREE.Mesh[];
  bubbles: THREE.Points;
  bubbleData: { velocity: THREE.Vector3 }[];
  seaweedData: { baseRotation: number; swingSpeed: number; swingPhase: number }[];
  ground: THREE.Mesh;
  waterSurface: THREE.Mesh;
  stoneMaterial: THREE.MeshStandardMaterial;
  interactiveObjects: THREE.Object3D[];
}

export function createStoneMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x8B7D6B,
    roughness: 0.8,
    metalness: 0.2,
    flatShading: true
  });
}

export function createCrackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#5a4f42';
  ctx.fillRect(0, 0, 256, 256);
  
  ctx.strokeStyle = '#3a2f22';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    const startX = Math.random() * 256;
    const startY = Math.random() * 256;
    ctx.moveTo(startX, startY);
    let x = startX;
    let y = startY;
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#c2a878';
  ctx.fillRect(0, 0, 512, 512);
  
  for (let i = 0; i < 5000; i++) {
    const brightness = 100 + Math.random() * 100;
    ctx.fillStyle = `rgb(${brightness + 30}, ${brightness + 10}, ${brightness - 40})`;
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2 + 0.5;
    ctx.fillRect(x, y, size, size);
  }
  
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 8 + 3;
    ctx.fillStyle = '#6a5a40';
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

export function createReliefTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#7A6B5A';
  ctx.fillRect(0, 0, 256, 256);
  
  ctx.strokeStyle = '#3a2f22';
  ctx.lineWidth = 2;
  
  const cx = 128;
  const cy = 128;
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.fillStyle = '#2a1f12';
  ctx.beginPath();
  ctx.ellipse(cx - 40, cy, 18, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 58, cy);
  ctx.lineTo(cx - 75, cy - 10);
  ctx.lineTo(cx - 75, cy + 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy);
  ctx.lineTo(cx - 5, cy - 12);
  ctx.moveTo(cx - 22, cy);
  ctx.lineTo(cx - 5, cy + 12);
  ctx.moveTo(cx - 22, cy);
  ctx.lineTo(cx - 5, cy);
  ctx.strokeStyle = '#2a1f12';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createRuins(): RuinsData {
  const group = new THREE.Group();
  const stoneMaterial = createStoneMaterial();
  const crackTexture = createCrackTexture();
  const columns: THREE.Mesh[] = [];
  const interactiveObjects: THREE.Object3D[] = [];
  
  const basinGeometry = new THREE.SphereGeometry(20, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const sandTexture = createSandTexture();
  const basinMaterial = new THREE.MeshStandardMaterial({
    map: sandTexture,
    roughness: 0.95,
    metalness: 0.05,
    side: THREE.DoubleSide,
    flatShading: true
  });
  const ground = new THREE.Mesh(basinGeometry, basinMaterial);
  ground.rotation.x = Math.PI;
  ground.position.y = -0.1;
  group.add(ground);
  
  const columnPositions = [
    { x: -6, z: -3 },
    { x: 5, z: -4 },
    { x: 0, z: 6 }
  ];
  
  const columnGeometry = new THREE.CylinderGeometry(0.5, 0.6, 4, 8, 1);
  
  columnPositions.forEach((pos, index) => {
    const columnMat = stoneMaterial.clone();
    columnMat.map = crackTexture;
    columnMat.needsUpdate = true;
    
    const column = new THREE.Mesh(columnGeometry, columnMat);
    column.position.set(pos.x, 2, pos.z);
    column.castShadow = true;
    column.receiveShadow = true;
    column.userData = { type: 'column', index, originalY: 2, raised: false };
    columns.push(column);
    interactiveObjects.push(column);
    group.add(column);
    
    const capitalGeo = new THREE.CylinderGeometry(0.7, 0.5, 0.3, 8);
    const capital = new THREE.Mesh(capitalGeo, stoneMaterial);
    capital.position.set(pos.x, 4.15, pos.z);
    column.add(capital);
    
    const baseGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 8);
    const base = new THREE.Mesh(baseGeo, stoneMaterial);
    base.position.set(pos.x, -1.85, pos.z);
    column.add(base);
    
    if (index === 0) {
      const brokenPieceGeo = new THREE.BoxGeometry(0.8, 0.4, 0.8);
      const brokenPiece = new THREE.Mesh(brokenPieceGeo, stoneMaterial);
      brokenPiece.position.set(pos.x + 1.2, 0.2, pos.z + 0.8);
      brokenPiece.rotation.set(0.3, 0.5, 0.2);
      group.add(brokenPiece);
    }
  });
  
  const archGroup = new THREE.Group();
  
  const pillarGeometry = new THREE.BoxGeometry(1, 6, 1);
  const leftPillar = new THREE.Mesh(pillarGeometry, stoneMaterial);
  leftPillar.position.set(-3, 3, 0);
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;
  leftPillar.userData = { type: 'archPillar' };
  archGroup.add(leftPillar);
  interactiveObjects.push(leftPillar);
  
  const rightPillar = new THREE.Mesh(pillarGeometry, stoneMaterial);
  rightPillar.position.set(3, 3, 0);
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;
  rightPillar.userData = { type: 'archPillar' };
  archGroup.add(rightPillar);
  interactiveObjects.push(rightPillar);
  
  const beamGeometry = new THREE.BoxGeometry(7, 1.2, 1.2);
  const beam = new THREE.Mesh(beamGeometry, stoneMaterial);
  beam.position.set(0, 6.6, 0);
  beam.castShadow = true;
  beam.receiveShadow = true;
  beam.userData = { type: 'archBeam', activated: false };
  archGroup.add(beam);
  interactiveObjects.push(beam);
  
  const archTopGeometry = new THREE.TorusGeometry(2.5, 0.5, 8, 12, Math.PI);
  const archTop = new THREE.Mesh(archTopGeometry, stoneMaterial);
  archTop.position.set(0, 5.5, 0);
  archTop.rotation.z = Math.PI;
  archTop.castShadow = true;
  archGroup.add(archTop);
  
  archGroup.position.set(2, 0, 2);
  archGroup.rotation.y = -0.3;
  group.add(archGroup);
  
  const altarMaterial = stoneMaterial.clone();
  altarMaterial.color.set(0x7A6B5A);
  altarMaterial.map = createReliefTexture();
  altarMaterial.needsUpdate = true;
  
  const altarGeometry = new THREE.BoxGeometry(2, 1, 2);
  const altar = new THREE.Mesh(altarGeometry, altarMaterial);
  altar.position.set(-4, 0.5, 4);
  altar.castShadow = true;
  altar.receiveShadow = true;
  altar.userData = { type: 'altar', activated: false };
  interactiveObjects.push(altar);
  group.add(altar);
  
  const seaweed: THREE.Mesh[] = [];
  const seaweedData: { baseRotation: number; swingSpeed: number; swingPhase: number }[] = [];
  const seaweedGeometry = new THREE.ConeGeometry(0.08, 1.5, 4);
  const seaweedMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5a27,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
    side: THREE.DoubleSide
  });
  
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3 + Math.random() * 15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    const nearColumn = columnPositions.some(
      cp => Math.sqrt((x - cp.x) ** 2 + (z - cp.z) ** 2) < 3
    );
    const nearAltar = Math.sqrt((x + 4) ** 2 + (z - 4) ** 2) < 3;
    
    if (!nearColumn && !nearAltar && Math.sqrt(x * x + z * z) < 19) {
      const plant = new THREE.Mesh(seaweedGeometry, seaweedMaterial);
      plant.position.set(x, 0.75, z);
      const baseRotation = (Math.random() - 0.5) * 0.3;
      plant.rotation.z = baseRotation;
      plant.rotation.y = Math.random() * Math.PI * 2;
      
      seaweed.push(plant);
      seaweedData.push({
        baseRotation,
        swingSpeed: 0.5 + Math.random() * 1,
        swingPhase: Math.random() * Math.PI * 2
      });
      group.add(plant);
    }
  }
  
  const initialBubbleCount = 50;
  const bubblePositions = new Float32Array(initialBubbleCount * 3);
  const bubbleSizes = new Float32Array(initialBubbleCount);
  const bubbleData: { velocity: THREE.Vector3 }[] = [];
  
  for (let i = 0; i < initialBubbleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 18;
    bubblePositions[i * 3] = Math.cos(angle) * radius;
    bubblePositions[i * 3 + 1] = -5 + Math.random() * 12;
    bubblePositions[i * 3 + 2] = Math.sin(angle) * radius;
    bubbleSizes[i] = 0.1 + Math.random() * 0.2;
    bubbleData.push({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        0.2,
        (Math.random() - 0.5) * 0.02
      )
    });
  }
  
  const bubbleGeometry = new THREE.BufferGeometry();
  bubbleGeometry.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
  bubbleGeometry.setAttribute('size', new THREE.BufferAttribute(bubbleSizes, 1));
  
  const bubbleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    size: 0.15,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const bubbles = new THREE.Points(bubbleGeometry, bubbleMaterial);
  group.add(bubbles);
  
  const waterGeometry = new THREE.PlaneGeometry(60, 60, 40, 40);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x0A2A4A,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.1,
    metalness: 0.3
  });
  const waterSurface = new THREE.Mesh(waterGeometry, waterMaterial);
  waterSurface.rotation.x = Math.PI / 2;
  waterSurface.position.y = 8;
  group.add(waterSurface);
  
  return {
    group,
    columns,
    arch: { group: archGroup, beam, leftPillar, rightPillar },
    altar,
    seaweed,
    bubbles,
    bubbleData,
    seaweedData,
    ground,
    waterSurface,
    stoneMaterial,
    interactiveObjects
  };
}

export function updateBubbles(
  bubbles: THREE.Points,
  bubbleData: { velocity: THREE.Vector3 }[],
  delta: number
): void {
  const positions = bubbles.geometry.attributes.position.array as Float32Array;
  
  for (let i = 0; i < bubbleData.length; i++) {
    const i3 = i * 3;
    positions[i3] += bubbleData[i].velocity.x * delta;
    positions[i3 + 1] += bubbleData[i].velocity.y * delta;
    positions[i3 + 2] += bubbleData[i].velocity.z * delta;
    
    if (positions[i3 + 1] > 7) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 18;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = -5;
      positions[i3 + 2] = Math.sin(angle) * radius;
    }
  }
  
  bubbles.geometry.attributes.position.needsUpdate = true;
}

export function updateSeaweed(
  seaweed: THREE.Mesh[],
  seaweedData: { baseRotation: number; swingSpeed: number; swingPhase: number }[],
  time: number
): void {
  const swingAmplitude = (5 * Math.PI) / 180;
  
  for (let i = 0; i < seaweed.length; i++) {
    const data = seaweedData[i];
    seaweed[i].rotation.z = data.baseRotation + Math.sin(time * data.swingSpeed + data.swingPhase) * swingAmplitude;
  }
}

export function updateWaterSurface(waterSurface: THREE.Mesh, time: number, waveFrequency: number): void {
  const positions = waterSurface.geometry.attributes.position.array as Float32Array;
  const amplitude = 0.3;
  const frequency = waveFrequency;
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    positions[i + 1] = 8 + 
      Math.sin(x * 0.3 + time * frequency) * amplitude +
      Math.cos(z * 0.25 + time * frequency * 0.7) * amplitude * 0.6 +
      Math.sin((x + z) * 0.15 + time * frequency * 1.3) * amplitude * 0.4;
  }
  
  waterSurface.geometry.attributes.position.needsUpdate = true;
  waterSurface.geometry.computeVertexNormals();
}

export function resizeBubbleSystem(
  currentBubbles: THREE.Points,
  _currentData: { velocity: THREE.Vector3 }[],
  newCount: number,
  scene: THREE.Group
): { bubbles: THREE.Points; data: { velocity: THREE.Vector3 }[] } {
  scene.remove(currentBubbles);
  
  const positions = new Float32Array(newCount * 3);
  const sizes = new Float32Array(newCount);
  const data: { velocity: THREE.Vector3 }[] = [];
  
  for (let i = 0; i < newCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 18;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = -5 + Math.random() * 12;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    sizes[i] = 0.1 + Math.random() * 0.2;
    data.push({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        0.2,
        (Math.random() - 0.5) * 0.02
      )
    });
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    size: 0.15,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const newBubbles = new THREE.Points(geometry, material);
  scene.add(newBubbles);
  
  return { bubbles: newBubbles, data };
}
