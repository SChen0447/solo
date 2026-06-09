import * as THREE from 'three';
import {
  RuneManager,
  RuneElement,
  getRune,
  SpellResult,
  RUNE_SLOTS
} from './runeManager';
import {
  BattleSystem,
  BattleAction
} from './battleSystem';

interface RunePixel {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

const RUNE_ICONS = {} as Record<RuneElement, RunePixel[]>;

function makeRunePixels(baseColor: string, accentColor: string, pattern: string[]): RunePixel[] {
  const pixels: RunePixel[] = [];
  for (let y = 0; y < pattern.length; y++) {
    const row = pattern[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '#') pixels.push({ x, y, w: 1, h: 1, color: baseColor });
      else if (ch === '*') pixels.push({ x, y, w: 1, h: 1, color: accentColor });
      else if (ch === '@') pixels.push({ x, y, w: 1, h: 1, color: '#000' });
    }
  }
  return pixels;
}

RUNE_ICONS['fire'] = makeRunePixels('#FF4500', '#FFD700', [
  '....@@....',
  '...@*#@...',
  '..@*###@..',
  '.@*#####@.',
  '@*###*###@',
  '@*######*@',
  '@*####*#*@',
  '.@*####*@.',
  '..@*##*@..',
  '...@@@@...'
]);

RUNE_ICONS['thunder'] = makeRunePixels('#FFD700', '#FFFFFF', [
  '....@@....',
  '...@**@...',
  '..@**##@..',
  '.@**####@.',
  '@@@**###@.',
  '..@**###@.',
  '.@**##@@@.',
  '@**##@....',
  '@**@......',
  '@@........'
]);

RUNE_ICONS['ice'] = makeRunePixels('#00BFFF', '#FFFFFF', [
  '..@.@@.@..',
  '.@@.*#.@@.',
  '@*#*##*#*@',
  '@*######*@',
  '@@@*##*@@@',
  '..*####*..',
  '@@@*##*@@@',
  '@*######*@',
  '@*#*##*#*@',
  '.@@.*#.@@.'
]);

RUNE_ICONS['shield'] = makeRunePixels('#888888', '#CCCCCC', [
  '.@@@@@@@@.',
  '@********@',
  '@*######*@',
  '@*######*@',
  '@*######*@',
  '@*######*@',
  '@*######*@',
  '.@*####*@.',
  '..@*##*@..',
  '...@@@@...'
]);

RUNE_ICONS['light'] = makeRunePixels('#FFFFFF', '#FFD700', [
  '....@@....',
  '.@.@**@.@.',
  '@@@****@@@',
  '@*######*@',
  '@*#*##*#*@',
  '@*#*##*#*@',
  '@*######*@',
  '@@@****@@@',
  '.@.@**@.@.',
  '....@@....'
]);

RUNE_ICONS['wind'] = makeRunePixels('#2ECC71', '#FFFFFF', [
  '@@@@......',
  '@*##@@@...',
  '@*###*#@@.',
  '.@*####*#@',
  '..@*###*#@',
  '...@#####@',
  '....@@*##@',
  '......@*#@',
  '@@@@...@@@',
  '@**#@.....'
]);

RUNE_ICONS['water'] = makeRunePixels('#9B59B6', '#FFFFFF', [
  '....@@....',
  '...@**@...',
  '..@*##*@..',
  '.@*####*@.',
  '@*######*@',
  '@*##*###*@',
  '@*######*@',
  '.@*####*@.',
  '..@*##*@..',
  '...@@@@...'
]);

interface SlotLayout {
  x: number;
  y: number;
  size: number;
}

interface Layout {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  slots: SlotLayout[];
  circle: { x: number; y: number; radius: number };
  circleSlots: SlotLayout[];
  hover: { slot: number | null; circle: number | null };
}

function buildLayout(canvas: HTMLCanvasElement): Layout {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const slotSize = 48;
  const slotY = height - 90;
  const totalSlotWidth = 6 * slotSize + 5 * 16;
  const startX = (width - totalSlotWidth) / 2;
  const slots: SlotLayout[] = [];
  for (let i = 0; i < 6; i++) {
    slots.push({
      x: startX + i * (slotSize + 16),
      y: slotY,
      size: slotSize
    });
  }
  const circleRadius = 100;
  const circle = {
    x: width / 2,
    y: height / 2 - 10,
    radius: circleRadius
  };
  const circleSlots: SlotLayout[] = [];
  const rs = 36;
  const angles = [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6];
  for (let i = 0; i < 3; i++) {
    circleSlots.push({
      x: circle.x + Math.cos(angles[i]) * 50 - rs / 2,
      y: circle.y + Math.sin(angles[i]) * 50 - rs / 2,
      size: rs
    });
  }
  return {
    canvas,
    ctx,
    width,
    height,
    slots,
    circle,
    circleSlots,
    hover: { slot: null, circle: null }
  };
}

function drawPixelRune(
  ctx: CanvasRenderingContext2D,
  element: RuneElement,
  x: number,
  y: number,
  size: number,
  scale: number = 1
) {
  const pixels = RUNE_ICONS[element];
  const cellSize = (size / 10) * scale;
  const offsetX = x + (size - size * scale) / 2;
  const offsetY = y + (size - size * scale) / 2;
  ctx.save();
  for (const p of pixels) {
    ctx.fillStyle = p.color;
    ctx.fillRect(
      Math.floor(offsetX + p.x * cellSize),
      Math.floor(offsetY + p.y * cellSize),
      Math.ceil(cellSize),
      Math.ceil(cellSize)
    );
  }
  ctx.restore();
}

function drawRuneSlot(
  ctx: CanvasRenderingContext2D,
  slot: SlotLayout,
  element: RuneElement | null,
  hovered: boolean,
  time: number
) {
  ctx.save();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(slot.x - 2, slot.y - 2, slot.size + 4, slot.size + 4);
  ctx.fillStyle = hovered ? '#444' : '#2a2a2a';
  ctx.fillRect(slot.x, slot.y, slot.size, slot.size);
  ctx.strokeStyle = hovered ? '#FFD700' : '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(slot.x, slot.y, slot.size, slot.size);
  if (element) {
    const scale = hovered ? 1.2 : 1;
    const bob = hovered ? Math.sin(time / 200) * 2 : 0;
    drawPixelRune(ctx, element, slot.x + 4, slot.y + 4 + bob, slot.size - 8, scale);
    const r = getRune(element);
    ctx.fillStyle = '#E0E0E0';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(r.name, slot.x + slot.size / 2, slot.y + slot.size + 2);
  }
  ctx.restore();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  runeManager: RuneManager,
  time: number
) {
  const { circle, circleSlots } = layout;
  ctx.save();

  const grad = ctx.createRadialGradient(circle.x, circle.y, 0, circle.x, circle.y, circle.radius);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(0.5, 'rgba(100,100,120,0.15)');
  grad.addColorStop(1, 'rgba(68,68,68,0.4)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = runeManager.circleHighlight ? '#FFFFFF' : '#666666';
  ctx.lineWidth = 3;
  if (runeManager.circleHighlight) {
    ctx.setLineDash([6, 4]);
    const dashOffset = (time / 50) % 20;
    ctx.lineDashOffset = dashOffset;
  }
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time / 2000;
    const r1 = circle.radius - 8;
    const r2 = circle.radius - 20;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(circle.x + Math.cos(a) * r2, circle.y + Math.sin(a) * r2);
    ctx.lineTo(circle.x + Math.cos(a) * r1, circle.y + Math.sin(a) * r1);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.radius - 30, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < circleSlots.length; i++) {
    const cs = circleSlots[i];
    const r = runeManager.circleRunes[i];
    ctx.fillStyle = r ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(cs.x + cs.size / 2, cs.y + cs.size / 2, cs.size / 2 + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = r ? '#FFD700' : '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cs.x + cs.size / 2, cs.y + cs.size / 2, cs.size / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();
    if (r) {
      drawPixelRune(ctx, r, cs.x + 4, cs.y + 4, cs.size - 8, 1);
    }
  }

  if (runeManager.flashType) {
    const color = runeManager.flashType === 'success' ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const activeRunes = runeManager.circleRunes.filter((r): r is RuneElement => r !== null);
  if (activeRunes.length > 0) {
    const spell = (window as any).__lastSpell || null;
    if (spell && spell.valid) {
      ctx.fillStyle = spell.color;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = spell.color;
      ctx.shadowBlur = 10;
      ctx.fillText(spell.name, circle.x, circle.y - circle.radius - 14);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#E0E0E0';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(spell.description, circle.x, circle.y - circle.radius - 30);
    }
  }

  ctx.restore();
}

function renderCanvas(layout: Layout, runeManager: RuneManager, time: number) {
  const { ctx, width, height } = layout;
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#151515';
  for (let y = 0; y < height; y += 8) {
    for (let x = 0; x < width; x += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
  }

  drawCircle(ctx, layout, runeManager, time);

  for (let i = 0; i < layout.slots.length; i++) {
    const element = runeManager.slotRunes[i];
    drawRuneSlot(ctx, layout.slots[i], element, layout.hover.slot === i, time);
  }

  const dragState = runeManager.dragState;
  if (dragState.isDragging && dragState.draggedElement) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    const element = dragState.draggedElement;
    const size = 48;
    drawPixelRune(ctx, element, dragState.dragX - dragState.offsetX, dragState.dragY - dragState.offsetY, size, 1);
    ctx.restore();
  }

  ctx.fillStyle = '#888';
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('← 拖拽符文到阵眼组合法术 →', width / 2, height - 20);
}

interface ThreeScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  playerPlatform: THREE.Mesh;
  aiPlatform: THREE.Mesh;
  playerFigure: THREE.Group;
  aiFigure: THREE.Group;
  particles: THREE.Points;
  spellBeams: { mesh: THREE.Mesh; life: number; dir: 'playerToAI' | 'aiToPlayer'; color: string }[];
  explosionParticles: { points: THREE.Points; velocities: THREE.Vector3[]; life: number; maxLife: number }[];
  fading: number;
  targetCameraAngle: number;
}

function makePixelTexture(color: string, accent: string): THREE.CanvasTexture {
  const size = 32;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = accent;
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      if (Math.random() < 0.3) ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function buildPlatform(color1: string, color2: string): THREE.Mesh {
  const geo = new THREE.BoxGeometry(2.5, 0.4, 2.5, 1, 1, 1);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if ((x + y) % 16 === 0) ctx.fillRect(x, y, 8, 8);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.85 });
  return new THREE.Mesh(geo, mat);
}

function buildPixelBox(w: number, h: number, d: number, color: string, accent: string): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const tex = makePixelTexture(color, accent);
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  return new THREE.Mesh(geo, mat);
}

function buildKnight(): THREE.Group {
  const g = new THREE.Group();
  const body = buildPixelBox(0.6, 0.8, 0.4, '#4A90D9', '#6FB5FF');
  body.position.y = 0.8;
  g.add(body);
  const head = buildPixelBox(0.45, 0.45, 0.45, '#C0C0C0', '#FFFFFF');
  head.position.y = 1.45;
  g.add(head);
  const visor = buildPixelBox(0.46, 0.15, 0.05, '#1a1a1a', '#000');
  visor.position.set(0, 1.5, 0.23);
  g.add(visor);
  const sword = buildPixelBox(0.1, 1.0, 0.1, '#E0E0E0', '#FFFFFF');
  sword.position.set(0.5, 1.0, 0);
  sword.rotation.z = -0.3;
  g.add(sword);
  const legL = buildPixelBox(0.22, 0.5, 0.3, '#2E5A8C', '#4A90D9');
  legL.position.set(-0.18, 0.25, 0);
  g.add(legL);
  const legR = buildPixelBox(0.22, 0.5, 0.3, '#2E5A8C', '#4A90D9');
  legR.position.set(0.18, 0.25, 0);
  g.add(legR);
  const shield = buildPixelBox(0.5, 0.6, 0.08, '#FFD700', '#FFE680');
  shield.position.set(-0.45, 0.9, 0.1);
  g.add(shield);
  return g;
}

function buildThreeHeadedDragon(): THREE.Group {
  const g = new THREE.Group();
  const body = buildPixelBox(1.0, 0.7, 1.4, '#8B0000', '#DC143C');
  body.position.y = 0.7;
  g.add(body);
  const headPositions = [
    { x: -0.55, z: 0.8 },
    { x: 0, z: 0.9 },
    { x: 0.55, z: 0.8 }
  ];
  const headColors: [string, string][] = [
    ['#FF4500', '#FF8C00'],
    ['#9B59B6', '#D1A3FF'],
    ['#00BFFF', '#87CEEB']
  ];
  headPositions.forEach((pos, i) => {
    const head = buildPixelBox(0.4, 0.4, 0.55, headColors[i][0], headColors[i][1]);
    head.position.set(pos.x, 1.15, pos.z);
    g.add(head);
    const neck = buildPixelBox(0.2, 0.5, 0.2, '#5a0000', '#8B0000');
    neck.position.set(pos.x * 0.6, 0.95, pos.z * 0.6);
    neck.rotation.x = -0.4;
    g.add(neck);
    const eye = buildPixelBox(0.08, 0.08, 0.03, '#FFD700', '#FFFFFF');
    eye.position.set(pos.x, 1.2, pos.z + 0.28);
    g.add(eye);
  });
  const wingL = buildPixelBox(1.3, 0.08, 0.8, '#4a0000', '#8B0000');
  wingL.position.set(-0.9, 1.1, 0);
  wingL.rotation.z = 0.4;
  g.add(wingL);
  const wingR = buildPixelBox(1.3, 0.08, 0.8, '#4a0000', '#8B0000');
  wingR.position.set(0.9, 1.1, 0);
  wingR.rotation.z = -0.4;
  g.add(wingR);
  const tail = buildPixelBox(0.3, 0.3, 1.0, '#8B0000', '#DC143C');
  tail.position.set(0, 0.7, -1.1);
  tail.rotation.x = 0.2;
  g.add(tail);
  const legL = buildPixelBox(0.25, 0.45, 0.3, '#5a0000', '#8B0000');
  legL.position.set(-0.3, 0.22, 0.2);
  g.add(legL);
  const legR = buildPixelBox(0.25, 0.45, 0.3, '#5a0000', '#8B0000');
  legR.position.set(0.3, 0.22, 0.2);
  g.add(legR);
  const legBL = buildPixelBox(0.25, 0.45, 0.3, '#5a0000', '#8B0000');
  legBL.position.set(-0.3, 0.22, -0.3);
  g.add(legBL);
  const legBR = buildPixelBox(0.25, 0.45, 0.3, '#5a0000', '#8B0000');
  legBR.position.set(0.3, 0.22, -0.3);
  g.add(legBR);
  return g;
}

function buildParticles(count: number): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 3 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.5 + 2;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const palette = [
      [1, 0.5, 0],
      [1, 0.84, 0],
      [0, 0.75, 1],
      [0.5, 0.3, 0.9],
      [0.2, 0.8, 0.4],
      [1, 1, 1]
    ];
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true
  });
  return new THREE.Points(geo, mat);
}

function buildThreeScene(container: HTMLElement): ThreeScene {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 6.5, 9);
  camera.lookAt(0, 0.8, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(3, 8, 4);
  scene.add(dirLight);

  const backLight = new THREE.DirectionalLight(0x6666ff, 0.4);
  backLight.position.set(-3, 4, -4);
  scene.add(backLight);

  const starCanvas = document.createElement('canvas');
  starCanvas.width = 512;
  starCanvas.height = 512;
  const sctx = starCanvas.getContext('2d')!;
  const starGrad = sctx.createLinearGradient(0, 0, 0, 512);
  starGrad.addColorStop(0, '#0B0C10');
  starGrad.addColorStop(1, '#1A1A2E');
  sctx.fillStyle = starGrad;
  sctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = Math.random() * 2 + 0.5;
    const a = Math.random() * 0.8 + 0.2;
    sctx.fillStyle = `rgba(255,255,255,${a})`;
    sctx.fillRect(x, y, s, s);
  }
  const starTex = new THREE.CanvasTexture(starCanvas);
  scene.background = starTex;

  const playerPlatform = buildPlatform('#4A90D9', '#1C3D6B');
  playerPlatform.position.set(-2.8, 0, 0);
  scene.add(playerPlatform);

  const aiPlatform = buildPlatform('#8B2E2E', '#3D1C1C');
  aiPlatform.position.set(2.8, 0, 0);
  scene.add(aiPlatform);

  const playerFigure = buildKnight();
  playerFigure.position.set(-2.8, 0.2, 0);
  scene.add(playerFigure);

  const aiFigure = buildThreeHeadedDragon();
  aiFigure.position.set(2.8, 0.2, 0);
  aiFigure.rotation.y = Math.PI;
  scene.add(aiFigure);

  const particles = buildParticles(50);
  scene.add(particles);

  return {
    renderer,
    scene,
    camera,
    playerPlatform,
    aiPlatform,
    playerFigure,
    aiFigure,
    particles,
    spellBeams: [],
    explosionParticles: [],
    fading: 0,
    targetCameraAngle: 0
  };
}

function spawnSpellBeam(ts: ThreeScene, fromPlayer: boolean, color: string) {
  const start = new THREE.Vector3(fromPlayer ? -2.8 : 2.8, 1.3, 0);
  const end = new THREE.Vector3(fromPlayer ? 2.8 : -2.8, 1.3, 0);
  const dir = end.clone().sub(start).normalize();
  const length = start.distanceTo(end);
  const geo = new THREE.CylinderGeometry(0.06, 0.1, length, 8, 1, true);
  geo.translate(0, length / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(start);
  mesh.lookAt(end);
  mesh.rotateX(Math.PI / 2);
  ts.scene.add(mesh);
  ts.spellBeams.push({
    mesh,
    life: 0.6,
    dir: fromPlayer ? 'playerToAI' : 'aiToPlayer',
    color
  });
}

function spawnExplosion(ts: ThreeScene, atPlayer: boolean, color: string) {
  const count = 30;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const origin = new THREE.Vector3(atPlayer ? -2.8 : 2.8, 1.3, 0);
  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x;
    positions[i * 3 + 1] = origin.y;
    positions[i * 3 + 2] = origin.z;
    const v = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 3,
      (Math.random() - 0.5) * 3
    );
    velocities.push(v);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const c = new THREE.Color(color);
  const mat = new THREE.PointsMaterial({ color: c, size: 0.15, transparent: true, opacity: 1 });
  const points = new THREE.Points(geo, mat);
  ts.scene.add(points);
  ts.explosionParticles.push({ points, velocities, life: 0.8, maxLife: 0.8 });
}

function updateThreeScene(ts: ThreeScene, dt: number, time: number) {
  ts.particles.rotation.y += dt * 0.15;
  ts.particles.position.y = Math.sin(time / 1000) * 0.15;

  ts.playerFigure.position.y = 0.2 + Math.sin(time / 600) * 0.05;
  ts.aiFigure.position.y = 0.2 + Math.sin(time / 500 + 1) * 0.06;

  for (let i = ts.spellBeams.length - 1; i >= 0; i--) {
    const beam = ts.spellBeams[i];
    beam.life -= dt;
    (beam.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, beam.life / 0.6) * 0.9;
    if (beam.life <= 0) {
      ts.scene.remove(beam.mesh);
      beam.mesh.geometry.dispose();
      (beam.mesh.material as THREE.Material).dispose();
      ts.spellBeams.splice(i, 1);
    }
  }

  for (let i = ts.explosionParticles.length - 1; i >= 0; i--) {
    const exp = ts.explosionParticles[i];
    exp.life -= dt;
    const pos = exp.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let j = 0; j < exp.velocities.length; j++) {
      pos.array[j * 3] += exp.velocities[j].x * dt * 3;
      pos.array[j * 3 + 1] += exp.velocities[j].y * dt * 3;
      pos.array[j * 3 + 2] += exp.velocities[j].z * dt * 3;
      exp.velocities[j].y -= dt * 4;
    }
    pos.needsUpdate = true;
    (exp.points.material as THREE.PointsMaterial).opacity = Math.max(0, exp.life / exp.maxLife);
    if (exp.life <= 0) {
      ts.scene.remove(exp.points);
      exp.points.geometry.dispose();
      (exp.points.material as THREE.Material).dispose();
      ts.explosionParticles.splice(i, 1);
    }
  }

  if (ts.fading > 0) {
    ts.fading -= dt;
    const t = Math.max(0, ts.fading);
    const angle = (1 - t / 0.5) * Math.PI * 0.6;
    ts.camera.position.set(Math.sin(angle) * 9, 6.5 + Math.cos(angle) * 2, Math.cos(angle) * 9);
    ts.camera.lookAt(0, 0.8, 0);
  } else {
    ts.camera.position.set(0, 6.5, 9);
    ts.camera.lookAt(0, 0.8, 0);
  }

  ts.renderer.render(ts.scene, ts.camera);
}

function updateDOM(battle: BattleSystem) {
  const rn = document.getElementById('round-num');
  const php = document.getElementById('player-hp');
  const ahp = document.getElementById('ai-hp');
  const ws = document.getElementById('wins-display');
  const wsr = document.getElementById('win-streak');
  if (rn) rn.textContent = String(battle.state.round);
  if (php) php.textContent = String(battle.state.player.hp);
  if (ahp) ahp.textContent = String(battle.state.ai.hp);
  if (ws) ws.textContent = `胜利：${battle.progress.wins}场`;
  if (wsr) wsr.textContent = String(battle.progress.bestStreak);
}

function showToast(container: HTMLElement, msg: string) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}

function pointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function main() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const threeContainer = document.getElementById('three-container')!;
  const overlay = document.getElementById('overlay')!;
  const overlayTitle = document.getElementById('overlay-title')!;
  const overlayBtn = document.getElementById('overlay-btn')!;
  const helpModal = document.getElementById('help-modal')!;
  const helpClose = document.getElementById('help-close')!;
  const btnClear = document.getElementById('btn-clear')!;
  const btnCast = document.getElementById('btn-cast')!;
  const btnHelp = document.getElementById('btn-help')!;
  const canvasWrapper = document.getElementById('canvas-wrapper')!;

  const layout = buildLayout(canvas);
  const runeManager = new RuneManager();
  const battle = new BattleSystem();
  const three = buildThreeScene(threeContainer);

  (window as any).__lastSpell = null;

  let pendingAction: BattleAction | null = null;
  let aiDelayTimer = 0;
  let playerActionAnimTimer = 0;

  const handleResize = () => {
    const w = threeContainer.clientWidth;
    const h = threeContainer.clientHeight;
    three.renderer.setSize(w, h);
    three.camera.aspect = w / h;
    three.camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', handleResize);
  handleResize();

  updateDOM(battle);

  runeManager.onChange(() => {
    const active = runeManager.circleRunes.filter((r): r is RuneElement => r !== null);
    if (active.length > 0) {
      (window as any).__lastSpell = runeManager.castSpell();
      if ((window as any).__lastSpell.valid === false) (window as any).__lastSpell = null;
    } else {
      (window as any).__lastSpell = null;
    }
  });

  battle.onChange(() => {
    updateDOM(battle);
  });

  battle.onGameOver((winner) => {
    overlay.classList.add('show');
    overlayTitle.textContent = winner === 'player' ? '胜利！' : '失败...';
    overlayTitle.className = 'overlay-title ' + (winner === 'player' ? 'win' : 'lose');
    three.fading = 0;
  });

  battle.onAction((action) => {
    pendingAction = action;
    if (action.caster === 'player') {
      playerActionAnimTimer = 0.7;
    }
  });

  overlayBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
    battle.reset();
    runeManager.clearCircle();
    three.fading = 0.5;
    (window as any).__lastSpell = null;
    updateDOM(battle);
  });

  btnHelp.addEventListener('click', () => {
    helpModal.classList.add('show');
  });
  helpClose.addEventListener('click', () => {
    helpModal.classList.remove('show');
  });

  btnClear.addEventListener('click', () => {
    runeManager.clearCircle();
    (window as any).__lastSpell = null;
  });

  btnCast.addEventListener('click', () => {
    if (!battle.isPlayerTurn()) return;
    const spell = runeManager.castSpell();
    if (!spell.valid || spell.elements.length === 0) {
      runeManager.triggerFlash('error');
      showToast(canvasWrapper, '组合无效');
      return;
    }
    battle.applyPlayerSpell(spell);
    runeManager.clearCircle();
    (window as any).__lastSpell = null;
  });

  const getCanvasCoords = (evt: MouseEvent | TouchEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    if (evt instanceof MouseEvent) {
      clientX = evt.clientX;
      clientY = evt.clientY;
    } else if (evt.touches && evt.touches.length > 0) {
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    } else if ((evt as any).changedTouches && (evt as any).changedTouches.length > 0) {
      clientX = (evt as any).changedTouches[0].clientX;
      clientY = (evt as any).changedTouches[0].clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const findSlotAt = (x: number, y: number): number | null => {
    for (let i = 0; i < layout.slots.length; i++) {
      const s = layout.slots[i];
      if (pointInRect(x, y, s.x, s.y, s.size, s.size)) return i;
    }
    return null;
  };

  const findCircleSlotAt = (x: number, y: number): number | null => {
    for (let i = 0; i < layout.circleSlots.length; i++) {
      const s = layout.circleSlots[i];
      const cx = s.x + s.size / 2;
      const cy = s.y + s.size / 2;
      if (pointInCircle(x, y, cx, cy, s.size / 2 + 4)) return i;
    }
    return null;
  };

  const isInCircleArea = (x: number, y: number): boolean => {
    return pointInCircle(x, y, layout.circle.x, layout.circle.y, layout.circle.radius);
  };

  const onMouseDown = (evt: MouseEvent) => {
    if (!battle.isPlayerTurn()) return;
    const { x, y } = getCanvasCoords(evt);
    const slotIdx = findSlotAt(x, y);
    if (slotIdx !== null) {
      const element = runeManager.slotRunes[slotIdx];
      if (element) {
        const s = layout.slots[slotIdx];
        runeManager.startDrag(element, slotIdx, x, y, x - s.x, y - s.y);
      }
    }
    const csIdx = findCircleSlotAt(x, y);
    if (csIdx !== null) {
      const element = runeManager.circleRunes[csIdx];
      if (element) {
        const cs = layout.circleSlots[csIdx];
        runeManager.startDrag(element, -1, x, y, x - cs.x, y - cs.y);
        runeManager.removeFromCircle(csIdx);
      }
    }
  };

  const onMouseMove = (evt: MouseEvent) => {
    const { x, y } = getCanvasCoords(evt);
    if (runeManager.dragState.isDragging) {
      runeManager.updateDragPosition(x, y);
      runeManager.setCircleHover(isInCircleArea(x, y));
    } else {
      layout.hover.slot = findSlotAt(x, y);
      layout.hover.circle = findCircleSlotAt(x, y);
    }
  };

  const onMouseUp = (evt: MouseEvent) => {
    if (!runeManager.dragState.isDragging) return;
    const { x, y } = getCanvasCoords(evt);
    const inCircle = isInCircleArea(x, y);
    const csIdx = findCircleSlotAt(x, y);
    runeManager.endDrag(inCircle, csIdx);
  };

  const onMouseLeave = () => {
    if (runeManager.dragState.isDragging) {
      runeManager.endDrag(false, null);
    }
    layout.hover.slot = null;
    layout.hover.circle = null;
  };

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onMouseDown(e as any);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    onMouseMove(e as any);
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    onMouseUp(e as any);
  }, { passive: false });

  let lastTime = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    runeManager.update(dt * 1000);

    if (pendingAction && pendingAction.caster === 'player' && playerActionAnimTimer > 0) {
      playerActionAnimTimer -= dt;
      if (playerActionAnimTimer <= 0.5 && !three.spellBeams.some(b => b.dir === 'playerToAI')) {
        spawnSpellBeam(three, true, pendingAction.spell.color);
      }
      if (playerActionAnimTimer <= 0.2 && three.explosionParticles.length === 0) {
        if (pendingAction.spell.category === 'attack') {
          spawnExplosion(three, false, pendingAction.spell.color);
        }
        pendingAction = null;
        if (battle.state.phase === 'ai') {
          aiDelayTimer = 1.0;
        }
      }
    }

    if (battle.state.phase === 'ai' && aiDelayTimer > 0) {
      aiDelayTimer -= dt;
      if (aiDelayTimer <= 0) {
        const aiSpell = battle.generateAISpell();
        battle.applyAISpell(aiSpell);
      }
    }

    if (pendingAction && pendingAction.caster === 'ai') {
      if (!three.spellBeams.some(b => b.dir === 'aiToPlayer')) {
        spawnSpellBeam(three, false, pendingAction.spell.color);
      }
      setTimeout(() => {
        if (pendingAction && pendingAction.caster === 'ai' && pendingAction.spell.category === 'attack') {
          spawnExplosion(three, true, pendingAction.spell.color);
        }
        pendingAction = null;
      }, 400);
    }

    renderCanvas(layout, runeManager, now);
    updateThreeScene(three, dt, now);

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', main);
