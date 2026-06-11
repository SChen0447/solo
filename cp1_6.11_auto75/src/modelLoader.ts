import * as THREE from 'three';

export interface HotspotInfo {
  name: string;
  period: string;
  description: string;
}

export interface ArtifactHotspot {
  mesh: THREE.Mesh;
  info: HotspotInfo;
  glowMesh?: THREE.Mesh;
}

export interface ArtifactData {
  name: string;
  material: string;
  era: string;
  size: string;
  group: THREE.Group;
  hotspots: ArtifactHotspot[];
  gridLines: THREE.LineSegments;
}

function createBronzeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#5a8c69');
  gradient.addColorStop(0.5, '#4a7c59');
  gradient.addColorStop(1, '#3b5e4a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 30 + 5;
    const alpha = Math.random() * 0.4 + 0.1;
    
    const spotGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const dark = Math.random() > 0.5 ? '#2a4a35' : '#5a8c69';
    spotGradient.addColorStop(0, `rgba(${hexToRgb(dark)}, ${alpha})`);
    spotGradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = spotGradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = Math.random() * 60 + 10;
    const h = Math.random() * 8 + 2;
    const alpha = Math.random() * 0.3 + 0.1;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillStyle = `rgba(60, 90, 70, ${alpha})`;
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.restore();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '0, 0, 0';
}

function createGridLines(size: number, divisions: number): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const step = size / divisions;
  const halfSize = size / 2;
  
  for (let i = 0; i <= divisions; i++) {
    const pos = -halfSize + i * step;
    vertices.push(pos, 0, -halfSize, pos, 0, halfSize);
    vertices.push(-halfSize, 0, pos, halfSize, 0, pos);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  const material = new THREE.LineBasicMaterial({
    color: 0xc8a96e,
    transparent: true,
    opacity: 0.0
  });
  
  const lines = new THREE.LineSegments(geometry, material);
  lines.position.y = -size * 0.3;
  lines.rotation.x = -Math.PI / 2;
  
  return lines;
}

function createHotspot(position: THREE.Vector3, size: number, info: HotspotInfo): ArtifactHotspot {
  const geometry = new THREE.SphereGeometry(size, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0xc8a96e,
    transparent: true,
    opacity: 0.0
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.userData.isHotspot = true;
  
  const glowGeometry = new THREE.SphereGeometry(size * 1.8, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xc8a96e,
    transparent: true,
    opacity: 0.0
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  mesh.add(glowMesh);
  
  return { mesh, glowMesh, info };
}

export function createBronzeDing(): ArtifactData {
  const group = new THREE.Group();
  
  const bodyGeom = new THREE.CylinderGeometry(1.2, 0.9, 2.0, 48, 1, true);
  const bronzeTex = createBronzeTexture();
  bronzeTex.repeat.set(2, 1);
  
  const bodyMat = new THREE.MeshStandardMaterial({
    map: bronzeTex,
    color: 0x4a7c59,
    roughness: 0.7,
    metalness: 0.3,
    side: THREE.DoubleSide
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = 0;
  group.add(body);
  
  const topRingGeom = new THREE.TorusGeometry(1.2, 0.08, 12, 48);
  const topRingMat = new THREE.MeshStandardMaterial({
    map: bronzeTex,
    color: 0x5a8c69,
    roughness: 0.6,
    metalness: 0.4
  });
  const topRing = new THREE.Mesh(topRingGeom, topRingMat);
  topRing.position.y = 1.0;
  topRing.rotation.x = Math.PI / 2;
  group.add(topRing);
  
  const bottomRingGeom = new THREE.TorusGeometry(0.9, 0.06, 12, 48);
  const bottomRing = new THREE.Mesh(bottomRingGeom, topRingMat);
  bottomRing.position.y = -1.0;
  bottomRing.rotation.x = Math.PI / 2;
  group.add(bottomRing);
  
  const earGeom = new THREE.TorusGeometry(0.25, 0.06, 12, 24);
  const earMat = new THREE.MeshStandardMaterial({
    map: bronzeTex,
    color: 0x4a7c59,
    roughness: 0.65,
    metalness: 0.35
  });
  
  const ear1 = new THREE.Mesh(earGeom, earMat);
  ear1.position.set(0, 1.15, 1.25);
  ear1.rotation.x = Math.PI / 2;
  group.add(ear1);
  
  const ear2 = new THREE.Mesh(earGeom, earMat);
  ear2.position.set(0, 1.15, -1.25);
  ear2.rotation.x = Math.PI / 2;
  group.add(ear2);
  
  const legGeom = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 16);
  const legMat = new THREE.MeshStandardMaterial({
    map: bronzeTex,
    color: 0x3b5e4a,
    roughness: 0.75,
    metalness: 0.25
  });
  
  const legPositions = [
    [0.6, -1.5, 0.6],
    [-0.6, -1.5, 0.6],
    [0, -1.5, -0.7]
  ];
  
  legPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeom, legMat);
    leg.position.set(pos[0], pos[1], pos[2]);
    group.add(leg);
  });
  
  const patternGeom = new THREE.CylinderGeometry(1.22, 1.22, 0.3, 48, 1, true);
  const patternMat = new THREE.MeshStandardMaterial({
    color: 0x2a4a35,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.8
  });
  
  const pattern1 = new THREE.Mesh(patternGeom, patternMat);
  pattern1.position.y = 0.4;
  group.add(pattern1);
  
  const pattern2 = new THREE.Mesh(patternGeom, patternMat);
  pattern2.position.y = -0.4;
  group.add(pattern2);
  
  const patternDetailGeom = new THREE.TorusGeometry(1.22, 0.02, 8, 48);
  const patternDetailMat = new THREE.MeshBasicMaterial({
    color: 0x2a4a35,
    transparent: true,
    opacity: 0.6
  });
  
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(patternDetailGeom, patternDetailMat);
    ring.position.y = 0.3 + i * 0.05;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(patternDetailGeom, patternDetailMat);
    ring.position.y = -0.5 + i * 0.05;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  
  const hotspots: ArtifactHotspot[] = [
    createHotspot(
      new THREE.Vector3(0, 1.3, 0),
      0.3,
      {
        name: '鼎耳',
        period: '商代晚期',
        description: '鼎耳为圆环形，用于穿绳抬鼎，表面饰有简单的弦纹，是青铜鼎的重要承重结构。'
      }
    ),
    createHotspot(
      new THREE.Vector3(0, 0.3, 0),
      0.4,
      {
        name: '腹部饕餮纹饰',
        period: '商代晚期',
        description: '饕餮纹是商周青铜器最具代表性的纹饰，以神秘威严的兽面形象展现古人对天地神灵的敬畏。'
      }
    ),
    createHotspot(
      new THREE.Vector3(0, -0.8, 0),
      0.35,
      {
        name: '底部铭文区',
        period: '商代晚期',
        description: '鼎腹内壁铸有铭文，记载作器缘由与祭祀信息，是研究商代历史的重要文字资料。'
      }
    )
  ];
  
  hotspots.forEach(h => group.add(h.mesh));
  
  const gridLines = createGridLines(3, 12);
  group.add(gridLines);
  
  return {
    name: '青铜鼎',
    material: '青铜',
    era: '商代晚期',
    size: '高45cm / 口径38cm',
    group,
    hotspots,
    gridLines
  };
}

export function createBlueWhiteVase(): ArtifactData {
  const group = new THREE.Group();
  
  function createBlueWhiteTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#f5f0e6';
    ctx.fillRect(0, 0, 512, 512);
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 20 + 5;
      ctx.fillStyle = `rgba(200, 190, 170, ${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.strokeStyle = '#2a5a8c';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.8;
    
    for (let y = 50; y < 512; y += 80) {
      for (let x = 30; x < 512; x += 100) {
        drawFlower(ctx, x + Math.random() * 30, y + Math.random() * 20, 15 + Math.random() * 10);
      }
    }
    
    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }
  
  function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save();
    ctx.translate(x, y);
    
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.6, size * 0.3, size * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
  
  const vaseTexture = createBlueWhiteTexture();
  
  const bodyPoints = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    let radius: number;
    if (t < 0.15) {
      radius = 0.4 + (t / 0.15) * 0.2;
    } else if (t < 0.4) {
      radius = 0.6 + ((t - 0.15) / 0.25) * 0.5;
    } else if (t < 0.7) {
      radius = 1.1 - ((t - 0.4) / 0.3) * 0.3;
    } else {
      radius = 0.8 - ((t - 0.7) / 0.3) * 0.5;
    }
    bodyPoints.push(new THREE.Vector2(radius, (t - 0.5) * 3));
  }
  
  const bodyGeom = new THREE.LatheGeometry(bodyPoints, 48);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: vaseTexture,
    color: 0xf5f0e6,
    roughness: 0.4,
    metalness: 0.1
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  group.add(body);
  
  const neckGeom = new THREE.CylinderGeometry(0.4, 0.5, 0.5, 48);
  const neck = new THREE.Mesh(neckGeom, bodyMat);
  neck.position.y = 1.5;
  group.add(neck);
  
  const mouthGeom = new THREE.TorusGeometry(0.45, 0.05, 12, 48);
  const mouth = new THREE.Mesh(mouthGeom, bodyMat);
  mouth.position.y = 1.75;
  mouth.rotation.x = Math.PI / 2;
  group.add(mouth);
  
  const baseGeom = new THREE.CylinderGeometry(0.35, 0.4, 0.3, 48);
  const base = new THREE.Mesh(baseGeom, bodyMat);
  base.position.y = -1.5;
  group.add(base);
  
  const bandGeom = new THREE.TorusGeometry(0.95, 0.03, 8, 48);
  const bandMat = new THREE.MeshBasicMaterial({
    color: 0x2a5a8c,
    transparent: true,
    opacity: 0.6
  });
  
  const band1 = new THREE.Mesh(bandGeom, bandMat);
  band1.position.y = 0.8;
  band1.rotation.x = Math.PI / 2;
  group.add(band1);
  
  const band2 = new THREE.Mesh(bandGeom, bandMat);
  band2.position.y = -0.5;
  band2.rotation.x = Math.PI / 2;
  group.add(band2);
  
  const hotspots: ArtifactHotspot[] = [
    createHotspot(
      new THREE.Vector3(0, 1.6, 0),
      0.25,
      {
        name: '瓶口',
        period: '明代永乐',
        description: '瓶口为撇口设计，边缘圆润，是青花瓷瓶典型的器型特征，便于插花与观赏。'
      }
    ),
    createHotspot(
      new THREE.Vector3(0, 0.5, 0),
      0.45,
      {
        name: '缠枝莲纹饰',
        period: '明代永乐',
        description: '缠枝莲纹是青花瓷最经典的纹饰，藤蔓连绵不绝，象征富贵吉祥，青花发色浓艳。'
      }
    ),
    createHotspot(
      new THREE.Vector3(0, -1.2, 0),
      0.25,
      {
        name: '底足款识',
        period: '明代永乐',
        description: '瓶底书有"大明永乐年制"六字楷书款，字体工整有力，是鉴定年代的重要依据。'
      }
    )
  ];
  
  hotspots.forEach(h => group.add(h.mesh));
  
  const gridLines = createGridLines(3, 12);
  group.add(gridLines);
  
  return {
    name: '青花瓷瓶',
    material: '瓷器',
    era: '明代永乐',
    size: '高32cm / 口径8cm',
    group,
    hotspots,
    gridLines
  };
}

export function createJadeCong(): ArtifactData {
  const group = new THREE.Group();
  
  function createJadeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#b8d4c0');
    gradient.addColorStop(0.5, '#a0c4b0');
    gradient.addColorStop(1, '#8ab49a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 25 + 5;
      const alpha = Math.random() * 0.25 + 0.05;
      const color = Math.random() > 0.5 ? '120, 160, 140' : '180, 210, 190';
      
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${color}, ${alpha})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const len = Math.random() * 80 + 20;
      const width = Math.random() * 3 + 1;
      ctx.strokeStyle = `rgba(100, 140, 120, ${Math.random() * 0.2})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * (Math.random() - 0.5), y + len * (Math.random() - 0.5));
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  
  const jadeTex = createJadeTexture();
  jadeTex.repeat.set(2, 2);
  
  const outerSize = 1.2;
  const innerRadius = 0.45;
  const height = 2.0;
  
  const outerShape = new THREE.Shape();
  outerShape.moveTo(-outerSize, -outerSize);
  outerShape.lineTo(outerSize, -outerSize);
  outerShape.lineTo(outerSize, outerSize);
  outerShape.lineTo(-outerSize, outerSize);
  outerShape.lineTo(-outerSize, -outerSize);
  
  const innerHole = new THREE.Path();
  innerHole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  outerShape.holes.push(innerHole);
  
  const extrudeSettings = {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3
  };
  
  const bodyGeom = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: jadeTex,
    color: 0xa8c8b8,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.rotation.x = -Math.PI / 2;
  body.position.y = -height / 2;
  group.add(body);
  
  const ringGeom = new THREE.TorusGeometry(outerSize * 0.95, 0.02, 8, 48);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x709080,
    transparent: true,
    opacity: 0.5
  });
  
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = -0.8 + i * 0.4;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  
  for (let i = 0; i < 4; i++) {
    const y = -0.6 + i * 0.4;
    const faceGeom = new THREE.PlaneGeometry(0.3, 0.25);
    const faceMat = new THREE.MeshBasicMaterial({
      color: 0x608070,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    
    const face1 = new THREE.Mesh(faceGeom, faceMat);
    face1.position.set(outerSize * 0.5, y, outerSize * 0.98);
    group.add(face1);
    
    const face2 = new THREE.Mesh(faceGeom, faceMat);
    face2.position.set(outerSize * 0.5, y, -outerSize * 0.98);
    group.add(face2);
    
    const face3 = new THREE.Mesh(faceGeom, faceMat);
    face3.position.set(outerSize * 0.98, y, outerSize * 0.5);
    face3.rotation.y = Math.PI / 2;
    group.add(face3);
    
    const face4 = new THREE.Mesh(faceGeom, faceMat);
    face4.position.set(-outerSize * 0.98, y, outerSize * 0.5);
    face4.rotation.y = Math.PI / 2;
    group.add(face4);
  }
  
  const hotspots: ArtifactHotspot[] = [
    createHotspot(
      new THREE.Vector3(0, 0.8, 0),
      0.3,
      {
        name: '琮顶射口',
        period: '良渚文化',
        description: '玉琮上端为射口，呈圆筒状伸出，是良渚玉琮的典型形制，用于贯通天地。'
      }
    ),
    createHotspot(
      new THREE.Vector3(0, 0, 0.9),
      0.4,
      {
        name: '神人兽面纹',
        period: '良渚文化',
        description: '琮面雕刻神人兽面纹，是良渚文化最具代表性的纹饰，表现了先民的神权信仰。'
      }
    ),
    createHotspot(
      new THREE.Vector3(0, -0.8, 0),
      0.3,
      {
        name: '琮底射孔',
        period: '良渚文化',
        description: '玉琮上下贯通，象征天地相通，是古代重要的礼器，用于祭祀地祇。'
      }
    )
  ];
  
  hotspots.forEach(h => group.add(h.mesh));
  
  const gridLines = createGridLines(3, 12);
  group.add(gridLines);
  
  return {
    name: '玉琮',
    material: '青玉',
    era: '良渚文化',
    size: '高18cm / 宽7cm',
    group,
    hotspots,
    gridLines
  };
}

export function createPedestal(): THREE.Mesh {
  const pedestalGeom = new THREE.CylinderGeometry(1.8, 2.0, 0.4, 48);
  
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#3d2a1a';
  ctx.fillRect(0, 0, 512, 512);
  
  for (let i = 0; i < 20; i++) {
    const y = (i / 20) * 512 + Math.random() * 20;
    const gradient = ctx.createLinearGradient(0, y - 5, 0, y + 5);
    gradient.addColorStop(0, 'rgba(60, 40, 25, 0)');
    gradient.addColorStop(0.5, 'rgba(70, 50, 30, 0.6)');
    gradient.addColorStop(1, 'rgba(60, 40, 25, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y - 5, 512, 10);
  }
  
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 3 + 1;
    ctx.fillStyle = `rgba(90, 65, 40, ${Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const woodTex = new THREE.CanvasTexture(canvas);
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(3, 1);
  
  const pedestalMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0x4a3520,
    roughness: 0.9,
    metalness: 0.0
  });
  
  const pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
  pedestal.position.y = -2.2;
  pedestal.receiveShadow = true;
  
  const topGeom = new THREE.CylinderGeometry(1.85, 1.8, 0.08, 48);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0x5a4530,
    roughness: 0.85,
    metalness: 0.0
  });
  const top = new THREE.Mesh(topGeom, topMat);
  top.position.y = -2.0;
  pedestal.add(top);
  
  return pedestal;
}
