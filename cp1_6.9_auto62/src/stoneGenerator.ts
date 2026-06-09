import * as THREE from 'three';
import { RuneColor, COLOR_MAP } from './audioManager';

export interface StoneData {
  group: THREE.Group;
  stoneMesh: THREE.Mesh;
  runeMesh: THREE.Mesh;
  runeLight: THREE.PointLight;
  color: RuneColor;
  runeRotationSpeed: number;
  pulsePhase: number;
  baseIntensity: number;
  position: THREE.Vector3;
  isHighlighted: boolean;
  highlightTime: number;
  isError: boolean;
  errorTime: number;
  pulseRings: { mesh: THREE.Mesh; startTime: number; duration: number; startRadius: number; endRadius: number }[];
}

const RUNE_COLORS: RuneColor[] = ['red', 'green', 'blue', 'yellow', 'purple'];

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

function createRuneTexture(color: RuneColor): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  const centerX = 128;
  const centerY = 128;

  const runeDesigns: Record<RuneColor, (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void> = {
    red: (ctx, cx, cy) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 80);
      ctx.lineTo(cx + 70, cy + 60);
      ctx.lineTo(cx - 70, cy + 60);
      ctx.closePath();
      ctx.moveTo(cx, cy - 40);
      ctx.lineTo(cx, cy + 60);
      ctx.moveTo(cx - 35, cy + 10);
      ctx.lineTo(cx + 35, cy + 10);
    },
    green: (ctx, cx, cy) => {
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 45, 0, Math.PI * 2);
      ctx.moveTo(cx, cy + 25);
      ctx.lineTo(cx, cy + 85);
      ctx.moveTo(cx - 30, cy + 55);
      ctx.lineTo(cx, cy + 25);
      ctx.lineTo(cx + 30, cy + 55);
    },
    blue: (ctx, cx, cy) => {
      ctx.beginPath();
      ctx.moveTo(cx - 60, cy - 70);
      ctx.lineTo(cx + 60, cy - 70);
      ctx.lineTo(cx, cy + 80);
      ctx.closePath();
      ctx.moveTo(cx - 40, cy - 30);
      ctx.lineTo(cx + 40, cy - 30);
      ctx.moveTo(cx - 20, cy + 10);
      ctx.lineTo(cx + 20, cy + 10);
    },
    yellow: (ctx, cx, cy) => {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const r1 = 70;
        const r2 = 30;
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy + Math.sin(angle) * r1;
        const angle2 = ((i + 0.5) / 6) * Math.PI * 2 - Math.PI / 2;
        const x2 = cx + Math.cos(angle2) * r2;
        const y2 = cy + Math.sin(angle2) * r2;
        if (i === 0) ctx.moveTo(x1, y1);
        else ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    },
    purple: (ctx, cx, cy) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 80);
      ctx.bezierCurveTo(cx + 80, cy - 80, cx + 80, cy + 40, cx, cy + 80);
      ctx.bezierCurveTo(cx - 80, cy + 40, cx - 80, cy - 80, cx, cy - 80);
      ctx.moveTo(cx, cy - 30);
      ctx.lineTo(cx, cy + 40);
      ctx.moveTo(cx - 30, cy + 5);
      ctx.arc(cx, cy + 5, 30, 0, Math.PI, true);
    }
  };

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 120);
  gradient.addColorStop(0, COLOR_MAP[color] + 'ff');
  gradient.addColorStop(0.4, COLOR_MAP[color] + 'aa');
  gradient.addColorStop(0.8, COLOR_MAP[color] + '44');
  gradient.addColorStop(1, COLOR_MAP[color] + '00');

  ctx.shadowColor = COLOR_MAP[color];
  ctx.shadowBlur = 30;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  runeDesigns[color](ctx, centerX, centerY);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createStone(
  position: THREE.Vector3,
  height: number,
  color: RuneColor
): StoneData {
  const group = new THREE.Group();

  const baseWidth = randomRange(0.4, 0.8);
  const baseDepth = randomRange(0.4, 0.8);

  const stoneGeometry = new THREE.BoxGeometry(baseWidth, height, baseDepth, 1, 1, 1);
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a5a,
    transparent: true,
    opacity: 0.85,
    roughness: 0.85,
    metalness: 0.1,
    emissive: 0x1a1a2a,
    emissiveIntensity: 0.2
  });
  const stoneMesh = new THREE.Mesh(stoneGeometry, stoneMaterial);
  stoneMesh.position.y = height / 2;
  stoneMesh.castShadow = true;
  stoneMesh.receiveShadow = true;
  group.add(stoneMesh);

  const runeSize = Math.min(baseWidth, baseDepth) * 0.75;
  const runeGeometry = new THREE.PlaneGeometry(runeSize, runeSize);
  const runeTexture = createRuneTexture(color);

  const runeMaterial = new THREE.MeshBasicMaterial({
    map: runeTexture,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const runeMesh = new THREE.Mesh(runeGeometry, runeMaterial);
  runeMesh.position.set(0, height * 0.55, baseDepth / 2 + 0.01);
  group.add(runeMesh);

  const runeLight = new THREE.PointLight(new THREE.Color(COLOR_MAP[color]), 0.8, 3, 2);
  runeLight.position.set(0, height * 0.55, baseDepth / 2 + 0.15);
  group.add(runeLight);

  group.position.copy(position);
  group.rotation.y = randomRange(0, Math.PI * 2);

  return {
    group,
    stoneMesh,
    runeMesh,
    runeLight,
    color,
    runeRotationSpeed: randomRange((Math.PI * 2) / 5, (Math.PI * 2) / 3),
    pulsePhase: Math.random() * Math.PI * 2,
    baseIntensity: 0.8,
    position: position.clone(),
    isHighlighted: false,
    highlightTime: 0,
    isError: false,
    errorTime: 0,
    pulseRings: []
  };
}

export function generateStones(count: number = 10): StoneData[] {
  const stones: StoneData[] = [];
  const usedPositions: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    let position: THREE.Vector3;
    let attempts = 0;

    do {
      const angle = randomRange(0, Math.PI * 2);
      const radius = randomRange(2, 4);
      position = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      attempts++;
    } while (
      attempts < 50 &&
      usedPositions.some(
        (p) => p.distanceTo(position) < 0.8
      )
    );

    usedPositions.push(position);

    const height = randomRange(1.0, 1.5);
    const color = RUNE_COLORS[randomInt(0, RUNE_COLORS.length - 1)];

    const stone = createStone(position, height, color);
    stones.push(stone);
  }

  return stones;
}

export function createPulseRing(stone: StoneData): THREE.Mesh {
  const ringGeometry = new THREE.SphereGeometry(0.2, 16, 16);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(COLOR_MAP[stone.color]),
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.copy(stone.runeMesh.position);
  ring.position.add(new THREE.Vector3(0, 0, 0.05));
  stone.group.add(ring);
  return ring;
}

export function createTree(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();

  const trunkHeight = randomRange(1.2, 2.0);
  const trunkRadius = randomRange(0.08, 0.15);
  const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 5);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2a1a,
    roughness: 0.95,
    metalness: 0.0
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const crownLayers = randomInt(2, 3);
  for (let i = 0; i < crownLayers; i++) {
    const layerHeight = randomRange(0.6, 1.0);
    const layerRadius = randomRange(0.5, 0.9) * (1 - i * 0.25);
    const crownGeometry = new THREE.ConeGeometry(layerRadius, layerHeight, 6);
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a6a2a,
      roughness: 0.9,
      metalness: 0.0
    });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.y = trunkHeight + i * (layerHeight * 0.5) + layerHeight * 0.3;
    crown.castShadow = true;
    group.add(crown);
  }

  group.position.copy(position);
  group.rotation.y = randomRange(0, Math.PI * 2);
  return group;
}

export function generateTrees(count: number = 15): THREE.Group[] {
  const trees: THREE.Group[] = [];
  for (let i = 0; i < count; i++) {
    let position: THREE.Vector3;
    do {
      const angle = randomRange(0, Math.PI * 2);
      const radius = randomRange(4.5, 7.5);
      position = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
    } while (trees.some((t) => t.position.distanceTo(position) < 1.0));

    const tree = createTree(position);
    trees.push(tree);
  }
  return trees;
}

export function createGround(): THREE.Mesh {
  const groundGeometry = new THREE.PlaneGeometry(20, 20, 20, 20);
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = (Math.random() - 0.5) * 0.05;
    positions.setZ(i, z);
  }
  groundGeometry.computeVertexNormals();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 350);
  gradient.addColorStop(0, '#2a4a2a');
  gradient.addColorStop(1, '#1a3a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2 + 0.5;
    const shade = Math.random();
    ctx.fillStyle = shade > 0.5
      ? `rgba(${40 + Math.random() * 20}, ${80 + Math.random() * 40}, ${40 + Math.random() * 20}, 0.4)`
      : `rgba(${20 + Math.random() * 20}, ${50 + Math.random() * 30}, ${20 + Math.random() * 20}, 0.4)`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.0
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}
