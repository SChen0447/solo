import * as THREE from 'three';

export interface Exhibit {
  name: string;
  group: THREE.Group;
  mesh: THREE.Mesh;
  faces: number;
  primaryColor: string;
  colorStart: string;
  colorEnd: string;
  size: number;
  rotationAxis: THREE.Vector3;
  basePosition: THREE.Vector3;
  rotationEnabled: boolean;
  update: (time: number, hovered: boolean) => void;
}

function lerpColor(color1: string, color2: string, t: number): THREE.Color {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t);
}

function createOrigamiMaterial(color: THREE.Color, transparent: boolean = true): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    transparent: transparent,
    opacity: 0.85,
    side: THREE.DoubleSide,
    roughness: 0.2,
    metalness: 0.1,
    transmission: 0.3,
    thickness: 0.5,
    emissive: color,
    emissiveIntensity: 0.15
  });
}

function createCrane(size: number, colorStart: string, colorEnd: string): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  const s = size;
  const vertices: number[] = [];
  const colors: number[] = [];

  const faces: number[][] = [
    [0, 0, s * 0.8], [-s * 0.3, 0, s * 0.2], [s * 0.3, 0, s * 0.2],
    [0, 0, s * 0.8], [s * 0.3, 0, s * 0.2], [s * 0.15, -s * 0.1, -s * 0.3],
    [0, 0, s * 0.8], [-s * 0.3, 0, s * 0.2], [-s * 0.15, -s * 0.1, -s * 0.3],
    [-s * 0.3, 0, s * 0.2], [0, 0, -s * 0.5], [s * 0.3, 0, s * 0.2],
    [-s * 0.3, 0, s * 0.2], [-s * 0.5, s * 0.15, -s * 0.1], [0, 0, -s * 0.5],
    [s * 0.3, 0, s * 0.2], [0, 0, -s * 0.5], [s * 0.5, s * 0.15, -s * 0.1],
    [-s * 0.5, s * 0.15, -s * 0.1], [-s * 0.2, s * 0.05, -s * 0.4], [0, 0, -s * 0.5],
    [s * 0.5, s * 0.15, -s * 0.1], [0, 0, -s * 0.5], [s * 0.2, s * 0.05, -s * 0.4],
    [-s * 0.5, s * 0.15, -s * 0.1], [-s * 0.15, s * 0.3, -s * 0.2], [0, 0, -s * 0.5],
    [s * 0.5, s * 0.15, -s * 0.1], [0, 0, -s * 0.5], [s * 0.15, s * 0.3, -s * 0.2],
    [-s * 0.15, s * 0.3, -s * 0.2], [0, s * 0.5, -s * 0.15], [s * 0.15, s * 0.3, -s * 0.2],
    [0, 0, -s * 0.5], [-s * 0.15, s * 0.3, -s * 0.2], [s * 0.15, s * 0.3, -s * 0.2]
  ];

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    vertices.push(...face);
    const t = i / faces.length;
    const c = lerpColor(colorStart, colorEnd, t);
    for (let j = 0; j < 3; j++) {
      colors.push(c.r, c.g, c.b);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    roughness: 0.2,
    metalness: 0.1,
    transmission: 0.3,
    thickness: 0.5,
    emissiveIntensity: 0.2
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  return group;
}

function createLotus(size: number, colorStart: string, colorEnd: string): THREE.Group {
  const group = new THREE.Group();
  const s = size;

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    for (let layer = 0; layer < 3; layer++) {
      const petalGroup = new THREE.Group();
      const layerScale = 1 - layer * 0.25;
      const layerHeight = layer * s * 0.1;

      const geometry = new THREE.BufferGeometry();
      const verts: number[] = [];
      const face1 = [
        0, s * 0.15 * layerScale, 0,
        -s * 0.15 * layerScale, s * 0.4 * layerScale, s * 0.35 * layerScale,
        s * 0.15 * layerScale, s * 0.4 * layerScale, s * 0.35 * layerScale
      ];
      const face2 = [
        0, s * 0.15 * layerScale, 0,
        s * 0.15 * layerScale, s * 0.4 * layerScale, s * 0.35 * layerScale,
        s * 0.08 * layerScale, s * 0.05 * layerScale, s * 0.05 * layerScale
      ];
      const face3 = [
        0, s * 0.15 * layerScale, 0,
        s * 0.08 * layerScale, s * 0.05 * layerScale, s * 0.05 * layerScale,
        -s * 0.08 * layerScale, s * 0.05 * layerScale, s * 0.05 * layerScale
      ];
      verts.push(...face1, ...face2, ...face3);
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geometry.computeVertexNormals();

      const t = (i * 3 + layer) / 18;
      const c = lerpColor(colorStart, colorEnd, t);
      const material = createOrigamiMaterial(c);
      const mesh = new THREE.Mesh(geometry, material);
      petalGroup.add(mesh);

      petalGroup.rotation.y = angle + layer * 0.2;
      petalGroup.position.y = layerHeight;
      petalGroup.userData = {
        baseAngle: angle,
        layer: layer,
        openSpeed: 0.5 + layer * 0.2 + i * 0.05,
        openAmount: 0,
        baseMesh: mesh
      };
      group.add(petalGroup);
    }
  }
  return group;
}

function createButterfly(size: number, colorStart: string, colorEnd: string): THREE.Group {
  const group = new THREE.Group();
  const s = size;

  const wingPairs = [
    { sx: 1, sy: 1, x: s * 0.05, y: s * 0.1, z: 0, scale: 1 },
    { sx: -1, sy: 1, x: -s * 0.05, y: s * 0.1, z: 0, scale: 1 },
    { sx: 1, sy: -1, x: s * 0.03, y: -s * 0.05, z: 0, scale: 0.7 },
    { sx: -1, sy: -1, x: -s * 0.03, y: -s * 0.05, z: 0, scale: 0.7 }
  ];

  wingPairs.forEach((wp, idx) => {
    const wingGroup = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    const sc = wp.scale;
    const verts: number[] = [];

    const faces: number[][] = [
      [0, 0, 0, s * 0.25 * wp.sx * sc, s * 0.3 * wp.sy * sc, 0, s * 0.1 * wp.sx * sc, s * 0.35 * wp.sy * sc, 0],
      [0, 0, 0, s * 0.1 * wp.sx * sc, s * 0.35 * wp.sy * sc, -s * 0.05 * sc, s * 0.25 * wp.sx * sc, s * 0.3 * wp.sy * sc, 0],
      [0, 0, 0, s * 0.3 * wp.sx * sc, 0, s * 0.05 * sc, s * 0.25 * wp.sx * sc, s * 0.3 * wp.sy * sc, 0],
      [0, 0, 0, s * 0.2 * wp.sx * sc, -s * 0.05 * wp.sy * sc, 0, s * 0.3 * wp.sx * sc, 0, s * 0.05 * sc],
      [0, 0, 0, s * 0.1 * wp.sx * sc, s * 0.35 * wp.sy * sc, 0, s * 0.1 * wp.sx * sc, s * 0.35 * wp.sy * sc, -s * 0.05 * sc]
    ];

    faces.forEach(f => verts.push(...f));
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.computeVertexNormals();

    const t = idx / wingPairs.length;
    const c = lerpColor(colorStart, colorEnd, t);
    const material = createOrigamiMaterial(c);
    const mesh = new THREE.Mesh(geometry, material);
    wingGroup.add(mesh);

    wingGroup.position.set(wp.x, wp.y, wp.z);
    wingGroup.userData = { isLeft: wp.sx < 0, baseMesh: mesh };
    group.add(wingGroup);
  });

  const bodyGeo = new THREE.BufferGeometry();
  const bodyVerts = [
    0, s * 0.2, 0, 0, -s * 0.15, s * 0.03, 0, -s * 0.15, -s * 0.03
  ];
  bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(bodyVerts, 3));
  bodyGeo.computeVertexNormals();
  const bodyMat = createOrigamiMaterial(lerpColor(colorStart, colorEnd, 0.5), false);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(bodyMesh);

  return group;
}

function createStar(size: number, colorStart: string, colorEnd: string): THREE.Group {
  const group = new THREE.Group();
  const s = size;

  const geometry = new THREE.BufferGeometry();
  const verts: number[] = [];
  const colors: number[] = [];

  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * s * 0.5,
      Math.sin(angle) * s * 0.5,
      0
    ));
  }
  const innerPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2 + Math.PI / 5;
    innerPoints.push(new THREE.Vector3(
      Math.cos(angle) * s * 0.2,
      Math.sin(angle) * s * 0.2,
      0
    ));
  }

  const center = new THREE.Vector3(0, 0, 0);
  const centerBack = new THREE.Vector3(0, 0, -s * 0.1);

  for (let i = 0; i < 5; i++) {
    const p1 = points[i];
    const p2 = innerPoints[i];
    const p3 = innerPoints[(i + 1) % 5];

    const t = i / 5;
    const c = lerpColor(colorStart, colorEnd, t);

    verts.push(center.x, center.y, center.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    verts.push(center.x, center.y, center.z, p3.x, p3.y, p3.z, p1.x, p1.y, p1.z);
    for (let j = 0; j < 6; j++) colors.push(c.r, c.g, c.b);

    verts.push(centerBack.x, centerBack.y, centerBack.z, p2.x, p2.y, p2.z, p1.x, p1.y, p1.z);
    verts.push(centerBack.x, centerBack.y, centerBack.z, p1.x, p1.y, p1.z, p3.x, p3.y, p3.z);
    for (let j = 0; j < 6; j++) colors.push(c.r * 0.7, c.g * 0.7, c.b * 0.7);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    roughness: 0.2,
    metalness: 0.1,
    transmission: 0.3,
    thickness: 0.5,
    emissiveIntensity: 0.25
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  return group;
}

function createPinwheel(size: number, colorStart: string, colorEnd: string): THREE.Group {
  const group = new THREE.Group();
  const s = size;

  for (let i = 0; i < 4; i++) {
    const bladeGroup = new THREE.Group();
    const blade = new THREE.Group();

    const geometry = new THREE.BufferGeometry();
    const verts: number[] = [];
    const depth = s * 0.08;

    const p1 = [0, 0, 0];
    const p2 = [s * 0.4, s * 0.35, 0];
    const p3 = [s * 0.1, s * 0.45, 0];
    const p4 = [0, 0, depth];
    const p5 = [s * 0.4, s * 0.35, depth];
    const p6 = [s * 0.1, s * 0.45, depth];

    verts.push(...p1, ...p2, ...p3);
    verts.push(...p4, ...p6, ...p5);
    verts.push(...p1, ...p4, ...p5);
    verts.push(...p1, ...p5, ...p2);
    verts.push(...p2, ...p5, ...p6);
    verts.push(...p2, ...p6, ...p3);
    verts.push(...p3, ...p6, ...p4);
    verts.push(...p3, ...p4, ...p1);

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.computeVertexNormals();

    const t = i / 4;
    const c = lerpColor(colorStart, colorEnd, t);
    const material = createOrigamiMaterial(c);
    const mesh = new THREE.Mesh(geometry, material);
    blade.add(mesh);

    const trailGeo = new THREE.BufferGeometry();
    const trailVerts = [
      0, 0, 0, -s * 0.3, s * 0.1, s * 0.04, -s * 0.5, -s * 0.05, s * 0.04,
      0, 0, depth, -s * 0.5, -s * 0.05, depth + s * 0.04, -s * 0.3, s * 0.1, depth + s * 0.04
    ];
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(trailVerts, 3));
    trailGeo.computeVertexNormals();
    const trailMat = createOrigamiMaterial(c);
    trailMat.opacity = 0.35;
    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    blade.add(trailMesh);

    blade.rotation.z = (i / 4) * Math.PI * 2;
    bladeGroup.add(blade);
    bladeGroup.userData = { baseAngle: (i / 4) * Math.PI * 2, blade: blade };
    group.add(bladeGroup);
  }

  const hubGeo = new THREE.SphereGeometry(s * 0.08, 12, 12);
  const hubMat = createOrigamiMaterial(lerpColor(colorStart, colorEnd, 0.5), false);
  hubMat.emissiveIntensity = 0.4;
  const hub = new THREE.Mesh(hubGeo, hubMat);
  group.add(hub);

  return group;
}

export function createExhibits(): Exhibit[] {
  const exhibits: Exhibit[] = [];
  const distance = 100;
  const height = 50;

  const configs = [
    {
      name: '发光纸鹤',
      faces: 12,
      size: 50,
      colorStart: '#ff9ff3',
      colorEnd: '#f368e0',
      primaryColor: '#ff9ff3',
      createFn: createCrane,
      axis: new THREE.Vector3(0.3, 1, 0.2).normalize()
    },
    {
      name: '折纸莲花',
      faces: 18,
      size: 60,
      colorStart: '#a29bfe',
      colorEnd: '#6c5ce7',
      primaryColor: '#a29bfe',
      createFn: createLotus,
      axis: new THREE.Vector3(0, 1, 0.1).normalize()
    },
    {
      name: '纸蝴蝶',
      faces: 16,
      size: 40,
      colorStart: '#feca57',
      colorEnd: '#ff6b6b',
      primaryColor: '#feca57',
      createFn: createButterfly,
      axis: new THREE.Vector3(0.1, 1, 0).normalize()
    },
    {
      name: '纸星',
      faces: 8,
      size: 30,
      colorStart: '#48dbfb',
      colorEnd: '#0abde3',
      primaryColor: '#48dbfb',
      createFn: createStar,
      axis: new THREE.Vector3(0.42, 0.9, 0.1).normalize()
    },
    {
      name: '纸风车',
      faces: 32,
      size: 45,
      colorStart: '#55efc4',
      colorEnd: '#00b894',
      primaryColor: '#55efc4',
      createFn: createPinwheel,
      axis: new THREE.Vector3(0, 1, 0).normalize()
    }
  ];

  configs.forEach((cfg, i) => {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const group = cfg.createFn(cfg.size, cfg.colorStart, cfg.colorEnd);
    group.position.set(x, height, z);

    const mainMesh = group.children[0] as THREE.Mesh;

    const exhibit: Exhibit = {
      name: cfg.name,
      group: group,
      mesh: mainMesh,
      faces: cfg.faces,
      primaryColor: cfg.primaryColor,
      colorStart: cfg.colorStart,
      colorEnd: cfg.colorEnd,
      size: cfg.size,
      rotationAxis: cfg.axis,
      basePosition: new THREE.Vector3(x, height, z),
      rotationEnabled: true,
      update: (time: number, hovered: boolean) => {
        updateExhibit(exhibit, time, hovered);
      }
    };

    exhibits.push(exhibit);
  });

  return exhibits;
}

let lastHoverState = new Map<string, boolean>();

function updateExhibit(exhibit: Exhibit, time: number, hovered: boolean) {
  const wasHovered = lastHoverState.get(exhibit.name) || false;
  lastHoverState.set(exhibit.name, hovered);

  const targetScale = hovered ? 1.2 : 1.0;
  const currentScale = exhibit.group.scale.x;
  const newScale = currentScale + (targetScale - currentScale) * 0.15;
  exhibit.group.scale.setScalar(newScale);

  const baseY = exhibit.basePosition.y;
  if (hovered) {
    const tremble = Math.sin(time * 10 * Math.PI * 2) * 5 * 0.1;
    exhibit.group.position.y = baseY + tremble;
    exhibit.group.position.x = exhibit.basePosition.x + Math.sin(time * 10 * Math.PI * 2 + 1) * 5 * 0.1;
    exhibit.group.position.z = exhibit.basePosition.z + Math.cos(time * 10 * Math.PI * 2 + 2) * 5 * 0.1;
  } else {
    exhibit.group.position.y = baseY + Math.sin(time * 0.8 + exhibit.basePosition.x * 0.01) * 3;
    exhibit.group.position.x = exhibit.basePosition.x;
    exhibit.group.position.z = exhibit.basePosition.z;
  }

  if (exhibit.rotationEnabled) {
    switch (exhibit.name) {
      case '发光纸鹤':
        exhibit.group.rotateOnAxis(exhibit.rotationAxis, 0.005);
        break;
      case '折纸莲花':
        exhibit.group.children.forEach((child: any) => {
          if (child.userData && child.userData.openSpeed !== undefined) {
            const openAmount = (Math.sin(time * child.userData.openSpeed) + 1) * 0.25;
            child.rotation.x = -openAmount * 0.6;
          }
        });
        exhibit.group.rotateOnAxis(exhibit.rotationAxis, 0.003);
        break;
      case '纸蝴蝶':
        const flapAngle = Math.sin(time * 2.5 * Math.PI * 2) * 0.5;
        exhibit.group.children.forEach((child: any) => {
          if (child.userData && child.userData.isLeft !== undefined) {
            child.rotation.y = child.userData.isLeft ? -flapAngle : flapAngle;
          }
        });
        exhibit.group.rotateOnAxis(exhibit.rotationAxis, 0.004);
        break;
      case '纸星':
        exhibit.group.rotateOnAxis(exhibit.rotationAxis, 0.012);
        const jitter = Math.sin(time * 3) * 0.02;
        exhibit.group.rotation.x += jitter;
        break;
      case '纸风车':
        exhibit.group.rotation.y += (Math.PI * 2) / 180;
        exhibit.group.children.forEach((child: any) => {
          if (child.userData && child.userData.blade) {
          }
        });
        break;
    }
  }
}

export function setAllRotationEnabled(exhibits: Exhibit[], enabled: boolean) {
  exhibits.forEach(e => e.rotationEnabled = enabled);
}
