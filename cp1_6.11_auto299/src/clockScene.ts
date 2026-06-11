import * as THREE from 'three';

export interface ClockParams {
  gearModule: number;
  sunRatio: number;
  moonRatio: number;
}

export interface ClockState {
  sunActualAngle: number;
  moonActualAngle: number;
  planetActualAngle: number;
  sunTheoryAngle: number;
  moonTheoryAngle: number;
  planetTheoryAngle: number;
  gearAngles: number[];
  dayOfYear: number;
}

const CLOCK_RADIUS = 12;
const CENTER_HAND_LENGTH = 3;
const GEAR_COUNT = 4;
const GEAR_TEETH = [18, 24, 16, 30];
const GEAR_RADII = [2.2, 1.8, 2.0, 1.6];
const SUN_GOLD = 0xffd54f;
const MOON_SILVER = 0xb0bec5;
const PLANET_BRONZE = 0xa1887f;
const IRON = 0x607d8b;
const BRASS = 0xb8860b;
const WOOD = 0x5d4037;

function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a;
}

function shortestAngleDiff(a: number, b: number): number {
  let diff = normalizeAngle(a) - normalizeAngle(b);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function radiansToArcminutes(radians: number): number {
  return Math.abs(radians) * (180 / Math.PI) * 60;
}

export function calculateAstroAngles(dayOfYear: number): { sun: number; moon: number; planet: number } {
  const t = (dayOfYear - 80) / 365.25 * Math.PI * 2;
  const sunRA = t + 0.0167 * Math.sin(t - 0.053);
  const meanAnomaly = 13.176 * dayOfYear * (Math.PI / 180) + 3.592;
  const moonRA = 2.183 + 13.176 * dayOfYear * (Math.PI / 180) + 0.11 * Math.sin(meanAnomaly);
  const marsMean = 2.6 * dayOfYear / 365 * Math.PI * 2;
  const planetRA = marsMean + 0.3 * Math.sin(marsMean * 0.5);
  return {
    sun: normalizeAngle(sunRA),
    moon: normalizeAngle(moonRA),
    planet: normalizeAngle(planetRA)
  };
}

function createGearShape(teeth: number, outerRadius: number, toothHeight: number): THREE.Shape {
  const shape = new THREE.Shape();
  const angleStep = (Math.PI * 2) / teeth;
  const innerR = outerRadius - toothHeight;
  for (let i = 0; i < teeth; i++) {
    const baseAngle = i * angleStep;
    const tipAngle1 = baseAngle + angleStep * 0.15;
    const tipAngle2 = baseAngle + angleStep * 0.35;
    const rootAngle1 = baseAngle + angleStep * 0.45;
    const nextTipAngle1 = baseAngle + angleStep * 0.65;
    const a1 = baseAngle;
    const a2 = tipAngle1;
    const a3 = tipAngle2;
    const a4 = rootAngle1;
    const a5 = nextTipAngle1;
    if (i === 0) {
      shape.moveTo(innerR * Math.cos(a1), innerR * Math.sin(a1));
    } else {
      shape.lineTo(innerR * Math.cos(a1), innerR * Math.sin(a1));
    }
    shape.lineTo(outerRadius * Math.cos(a2), outerRadius * Math.sin(a2));
    shape.lineTo(outerRadius * Math.cos(a3), outerRadius * Math.sin(a3));
    shape.lineTo(innerR * Math.cos(a4), innerR * Math.sin(a4));
    shape.lineTo(innerR * Math.cos(a5), innerR * Math.sin(a5));
  }
  shape.closePath();
  return shape;
}

function createRustTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 180);
  gradient.addColorStop(0, 'rgba(141, 110, 99, 0.0)');
  gradient.addColorStop(0.6, 'rgba(141, 110, 99, 0.15)');
  gradient.addColorStop(1, 'rgba(93, 64, 55, 0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 8 + 2;
    const alpha = Math.random() * 0.25 + 0.05;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(141, 110, 99, ${alpha})`;
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createRomanNumeralTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 1024;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#8d6e63';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold 72px Cinzel, serif';
  ctx.fillStyle = '#ffd54f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = size / 2 - 100;
    const x = size / 2 + r * Math.cos(angle);
    const y = size / 2 + r * Math.sin(angle);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(romans[i], 0, 0);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createRingTexture(color: string, ringType: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(0, 0, 2048, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 2040, 120);
  const tickCount = 360;
  for (let i = 0; i < tickCount; i++) {
    const x = (i / tickCount) * 2048;
    const isMajor = i % 30 === 0;
    const isMedium = i % 10 === 0;
    ctx.fillStyle = color;
    const h = isMajor ? 40 : isMedium ? 26 : 14;
    ctx.fillRect(x, 128 - h - 8, 1.5, h);
    if (isMajor) {
      ctx.fillRect(x, 8, 1.5, h);
      ctx.font = 'bold 18px Cinzel, serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const degreeLabel = i;
      ctx.fillText(`${degreeLabel}°`, x, 70);
    }
  }
  ctx.font = 'bold 14px Cinzel, serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.6;
  const labelText = ringType === 'sun' ? 'ORBIS SOLARIS' : ringType === 'moon' ? 'ORBIS LUNARIS' : 'ORBIS PLANETARUM';
  for (let offset = 0; offset < 2048; offset += 400) {
    ctx.fillText(`· ${labelText} ·`, offset + 200, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

export function createClockScene(container: HTMLElement) {
  const state: ClockState = {
    sunActualAngle: 0,
    moonActualAngle: 0,
    planetActualAngle: 0,
    sunTheoryAngle: 0,
    moonTheoryAngle: 0,
    planetTheoryAngle: 0,
    gearAngles: new Array(GEAR_COUNT).fill(0),
    dayOfYear: 0
  };

  let params: ClockParams = {
    gearModule: 1.0,
    sunRatio: 1.0,
    moonRatio: 1.0
  };

  let targetSunAngle = 0;
  let targetMoonAngle = 0;
  let targetPlanetAngle = 0;
  let targetGearAngles = new Array(GEAR_COUNT).fill(0);
  let stabilizingTime = 0;
  let stabilizationStart: number[] | null = null;
  const rustTexture = createRustTexture();

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 38);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xfff8e1, 0.75);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xfff8e1, 1.1);
  mainLight.position.set(8, 12, 15);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(2048, 2048);
  mainLight.shadow.camera.left = -25;
  mainLight.shadow.camera.right = 25;
  mainLight.shadow.camera.top = 25;
  mainLight.shadow.camera.bottom = -25;
  scene.add(mainLight);

  const fillLight = new THREE.PointLight(0xffcc80, 0.6, 60);
  fillLight.position.set(-10, 5, 10);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0x8d6e63, 0.4, 50);
  rimLight.position.set(0, -8, 10);
  scene.add(rimLight);

  const clockFrame = new THREE.Group();
  scene.add(clockFrame);

  const clockBackGeometry = new THREE.CylinderGeometry(CLOCK_RADIUS + 0.8, CLOCK_RADIUS + 0.8, 2.2, 64);
  const clockBackMaterial = new THREE.MeshStandardMaterial({
    color: WOOD,
    roughness: 0.85,
    metalness: 0.05
  });
  const clockBack = new THREE.Mesh(clockBackGeometry, clockBackMaterial);
  clockBack.rotation.x = Math.PI / 2;
  clockBack.position.z = 0;
  clockBack.receiveShadow = true;
  clockFrame.add(clockBack);

  const outerRimGeometry = new THREE.TorusGeometry(CLOCK_RADIUS + 0.3, 0.5, 16, 128);
  const outerRimMaterial = new THREE.MeshStandardMaterial({
    color: BRASS,
    roughness: 0.35,
    metalness: 0.85
  });
  const outerRim = new THREE.Mesh(outerRimGeometry, outerRimMaterial);
  outerRim.rotation.x = Math.PI / 2;
  outerRim.position.z = 1.1;
  outerRim.castShadow = true;
  clockFrame.add(outerRim);

  const dialTexture = createRomanNumeralTexture();
  const dialGeometry = new THREE.CircleGeometry(CLOCK_RADIUS, 64);
  const dialMaterial = new THREE.MeshStandardMaterial({
    map: dialTexture,
    roughness: 0.7,
    metalness: 0.1
  });
  const dial = new THREE.Mesh(dialGeometry, dialMaterial);
  dial.rotation.x = -Math.PI / 2;
  dial.position.z = 1.2;
  dial.receiveShadow = true;
  clockFrame.add(dial);

  const tickGroup = new THREE.Group();
  tickGroup.position.z = 1.35;
  clockFrame.add(tickGroup);

  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const rInner = CLOCK_RADIUS - 0.9;
    const rOuter = CLOCK_RADIUS - 0.3;
    const thickness = isMajor ? 0.12 : 0.05;
    const tickGeometry = new THREE.BoxGeometry(thickness, rOuter - rInner, 0.08);
    const tickMaterial = new THREE.MeshStandardMaterial({
      color: isMajor ? SUN_GOLD : MOON_SILVER,
      roughness: 0.25,
      metalness: 0.7
    });
    const tick = new THREE.Mesh(tickGeometry, tickMaterial);
    tick.position.set(
      Math.cos(angle) * (rInner + rOuter) / 2,
      Math.sin(angle) * (rInner + rOuter) / 2,
      0
    );
    tick.rotation.z = angle + Math.PI / 2;
    tick.castShadow = true;
    tickGroup.add(tick);
  }

  const moonPhaseWindowGroup = new THREE.Group();
  moonPhaseWindowGroup.position.set(0, CLOCK_RADIUS * 0.55, 1.4);
  clockFrame.add(moonPhaseWindowGroup);

  const moonFrameGeometry = new THREE.RingGeometry(1.3, 1.65, 64);
  const moonFrameMaterial = new THREE.MeshStandardMaterial({
    color: BRASS,
    roughness: 0.3,
    metalness: 0.9
  });
  const moonFrame = new THREE.Mesh(moonFrameGeometry, moonFrameMaterial);
  moonFrame.rotation.x = -Math.PI / 2;
  moonPhaseWindowGroup.add(moonFrame);

  const moonBgGeometry = new THREE.CircleGeometry(1.28, 64);
  const moonBgMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a237e,
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0x0a1929,
    emissiveIntensity: 0.3
  });
  const moonBg = new THREE.Mesh(moonBgGeometry, moonBgMaterial);
  moonBg.rotation.x = -Math.PI / 2;
  moonPhaseWindowGroup.add(moonBg);

  const moonFullGeometry = new THREE.SphereGeometry(1.0, 32, 32);
  const moonFullMaterial = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.9,
    metalness: 0.0
  });
  const moonFull = new THREE.Mesh(moonFullGeometry, moonFullMaterial);
  moonFull.rotation.x = -Math.PI / 2;
  moonPhaseWindowGroup.add(moonFull);

  const moonShadowGeometry = new THREE.SphereGeometry(1.02, 32, 32);
  const moonShadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a237e,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.85
  });
  const moonShadow = new THREE.Mesh(moonShadowGeometry, moonShadowMaterial);
  moonShadow.rotation.x = -Math.PI / 2;
  moonPhaseWindowGroup.add(moonShadow);

  const ringsGroup = new THREE.Group();
  ringsGroup.position.z = 1.6;
  clockFrame.add(ringsGroup);

  function createAstroRing(
    outerRadius: number,
    bandWidth: number,
    color: number,
    _labelText: string,
    ringType: 'sun' | 'moon' | 'planet'
  ): THREE.Group {
    const ringGroup = new THREE.Group();
    const tubeGeometry = new THREE.TorusGeometry(outerRadius, bandWidth / 2, 20, 256);
    const texture = createRingTexture(
      '#' + color.toString(16).padStart(6, '0'),
      ringType
    );
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: color,
      map: texture,
      roughness: 0.28,
      metalness: 0.82
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.rotation.x = Math.PI / 2;
    tube.castShadow = true;
    tube.receiveShadow = true;
    ringGroup.add(tube);

    const etchGeometry = new THREE.TorusGeometry(outerRadius, bandWidth * 0.06, 12, 256);
    const etchMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1810,
      roughness: 0.9,
      metalness: 0.1
    });
    for (let eo = 0; eo < 3; eo++) {
      const etch = new THREE.Mesh(etchGeometry, etchMaterial);
      etch.rotation.x = Math.PI / 2;
      etch.position.z = (eo - 1) * bandWidth * 0.35;
      ringGroup.add(etch);
    }

    return ringGroup;
  }

  const sunRing = createAstroRing(CLOCK_RADIUS * 0.82, 0.75, SUN_GOLD, 'ORBIS SOLARIS', 'sun');
  ringsGroup.add(sunRing);

  const moonRing = createAstroRing(CLOCK_RADIUS * 0.62, 0.6, MOON_SILVER, 'ORBIS LUNARIS', 'moon');
  ringsGroup.add(moonRing);

  const planetRing = createAstroRing(CLOCK_RADIUS * 0.42, 0.5, PLANET_BRONZE, 'ORBIS PLANETARUM', 'planet');
  ringsGroup.add(planetRing);

  const pointerGroup = new THREE.Group();
  pointerGroup.position.z = 2.2;
  clockFrame.add(pointerGroup);

  const sunPointerGroup = new THREE.Group();
  pointerGroup.add(sunPointerGroup);

  function createBodyForRing(color: number, icon: 'sun' | 'moon' | 'star', size: number): THREE.Group {
    const g = new THREE.Group();
    if (icon === 'sun') {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(size, 24, 24),
        new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.2,
          metalness: 0.9,
          emissive: color,
          emissiveIntensity: 0.3
        })
      );
      g.add(sphere);
      for (let r = 0; r < 8; r++) {
        const rayGeometry = new THREE.BoxGeometry(size * 0.1, size * 1.4, size * 0.1);
        const ray = new THREE.Mesh(rayGeometry,
          new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.8, emissive: color, emissiveIntensity: 0.2 })
        );
        const a = (r / 8) * Math.PI * 2;
        ray.position.set(Math.cos(a) * size * 1.2, Math.sin(a) * size * 1.2, 0);
        ray.rotation.z = a;
        g.add(ray);
      }
    } else if (icon === 'moon') {
      const crescent1 = new THREE.Mesh(
        new THREE.SphereGeometry(size, 24, 24),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.85 })
      );
      g.add(crescent1);
      const crescent2 = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.9, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 })
      );
      crescent2.position.x = size * 0.35;
      g.add(crescent2);
    } else {
      const starShape = new THREE.Shape();
      const spikes = 5;
      const outerR = size * 1.2;
      const innerR = size * 0.5;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        if (i === 0) starShape.moveTo(r * Math.cos(a), r * Math.sin(a));
        else starShape.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      starShape.closePath();
      const extrude = new THREE.ExtrudeGeometry(starShape, { depth: size * 0.25, bevelEnabled: true, bevelSize: size * 0.05, bevelThickness: size * 0.05, bevelSegments: 2 });
      const starMesh = new THREE.Mesh(extrude,
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.25, metalness: 0.9 })
      );
      starMesh.rotation.x = -Math.PI / 2;
      g.add(starMesh);
    }
    return g;
  }

  const sunIcon = createBodyForRing(SUN_GOLD, 'sun', 0.65);
  sunIcon.position.set(CLOCK_RADIUS * 0.82, 0, 0);
  sunPointerGroup.add(sunIcon);

  const sunLineGeometry = new THREE.BoxGeometry(CLOCK_RADIUS * 0.82, 0.08, 0.06);
  const sunLine = new THREE.Mesh(
    sunLineGeometry,
    new THREE.MeshStandardMaterial({ color: SUN_GOLD, roughness: 0.25, metalness: 0.85 })
  );
  sunLine.position.x = CLOCK_RADIUS * 0.41;
  sunPointerGroup.add(sunLine);

  const moonPointerGroup = new THREE.Group();
  pointerGroup.add(moonPointerGroup);

  const moonIcon = createBodyForRing(MOON_SILVER, 'moon', 0.5);
  moonIcon.position.set(CLOCK_RADIUS * 0.62, 0, 0.1);
  moonPointerGroup.add(moonIcon);

  const moonLineGeometry = new THREE.BoxGeometry(CLOCK_RADIUS * 0.62, 0.065, 0.05);
  const moonLine = new THREE.Mesh(
    moonLineGeometry,
    new THREE.MeshStandardMaterial({ color: MOON_SILVER, roughness: 0.3, metalness: 0.85 })
  );
  moonLine.position.x = CLOCK_RADIUS * 0.31;
  moonLine.position.z = 0.1;
  moonPointerGroup.add(moonLine);

  const planetPointerGroup = new THREE.Group();
  pointerGroup.add(planetPointerGroup);

  const planetIcon = createBodyForRing(PLANET_BRONZE, 'star', 0.4);
  planetIcon.position.set(CLOCK_RADIUS * 0.42, 0, 0.2);
  planetPointerGroup.add(planetIcon);

  const planetLineGeometry = new THREE.BoxGeometry(CLOCK_RADIUS * 0.42, 0.05, 0.04);
  const planetLine = new THREE.Mesh(
    planetLineGeometry,
    new THREE.MeshStandardMaterial({ color: PLANET_BRONZE, roughness: 0.3, metalness: 0.8 })
  );
  planetLine.position.x = CLOCK_RADIUS * 0.21;
  planetLine.position.z = 0.2;
  planetPointerGroup.add(planetLine);

  const centerHandGroup = new THREE.Group();
  centerHandGroup.position.z = 2.5;
  clockFrame.add(centerHandGroup);

  const handRodGeometry = new THREE.CylinderGeometry(0.1, 0.08, CENTER_HAND_LENGTH, 16);
  const handRodMaterial = new THREE.MeshStandardMaterial({
    color: IRON,
    roughness: 0.35,
    metalness: 0.9
  });
  const handRod = new THREE.Mesh(handRodGeometry, handRodMaterial);
  handRod.position.y = CENTER_HAND_LENGTH / 2;
  handRod.castShadow = true;
  centerHandGroup.add(handRod);

  const handTipGeometry = new THREE.ConeGeometry(0.16, 0.45, 16);
  const handTipMaterial = new THREE.MeshStandardMaterial({
    color: 0x37474f,
    roughness: 0.3,
    metalness: 0.95
  });
  const handTip = new THREE.Mesh(handTipGeometry, handTipMaterial);
  handTip.position.y = CENTER_HAND_LENGTH + 0.2;
  handTip.castShadow = true;
  centerHandGroup.add(handTip);

  const hubGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.25, 32);
  const hubMaterial = new THREE.MeshStandardMaterial({
    color: BRASS,
    roughness: 0.25,
    metalness: 0.95
  });
  const hub = new THREE.Mesh(hubGeometry, hubMaterial);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 2.6;
  hub.castShadow = true;
  clockFrame.add(hub);

  const gearsGroup = new THREE.Group();
  gearsGroup.position.set(0, -CLOCK_RADIUS - 3.5, 0);
  scene.add(gearsGroup);

  const gears: THREE.Group[] = [];

  for (let i = 0; i < GEAR_COUNT; i++) {
    const gearGroup = new THREE.Group();
    const teeth = GEAR_TEETH[i];
    const moduleScale = params.gearModule;
    const baseRadius = GEAR_RADII[i] * moduleScale;
    const toothHeight = 0.3 * moduleScale;

    const gearShape = createGearShape(teeth, baseRadius, toothHeight);
    const extrudeSettings = {
      depth: 0.5 + i * 0.05,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 2,
      curveSegments: 4
    };
    const gearGeometry = new THREE.ExtrudeGeometry(gearShape, extrudeSettings);
    gearGeometry.center();

    const gearMaterial = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? BRASS : 0x8d6e63,
      roughness: 0.55,
      metalness: 0.7,
      map: rustTexture
    });
    const gearMesh = new THREE.Mesh(gearGeometry, gearMaterial);
    gearMesh.rotation.x = -Math.PI / 2;
    gearMesh.castShadow = true;
    gearMesh.receiveShadow = true;
    gearGroup.add(gearMesh);

    const hubGeo = new THREE.CylinderGeometry(0.35 * moduleScale, 0.4 * moduleScale, 0.7, 24);
    const hubMat = new THREE.MeshStandardMaterial({
      color: IRON,
      roughness: 0.4,
      metalness: 0.85
    });
    const gearHub = new THREE.Mesh(hubGeo, hubMat);
    gearHub.rotation.x = Math.PI / 2;
    gearHub.position.z = 0;
    gearHub.castShadow = true;
    gearGroup.add(gearHub);

    for (let h = 0; h < 5; h++) {
      const ha = (h / 5) * Math.PI * 2;
      const holeGeo = new THREE.CylinderGeometry(0.12 * moduleScale, 0.12 * moduleScale, 0.8, 12);
      const holeMat = new THREE.MeshStandardMaterial({
        color: 0x2d1810,
        roughness: 0.9
      });
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.rotation.x = Math.PI / 2;
      hole.position.set(
        Math.cos(ha) * (baseRadius - toothHeight - 0.45),
        Math.sin(ha) * (baseRadius - toothHeight - 0.45),
        0
      );
      gearGroup.add(hole);
    }

    const spacing = (baseRadius + GEAR_RADII[(i + 1) % GEAR_COUNT] * moduleScale) * 0.98;
    gearGroup.position.set(
      (i - (GEAR_COUNT - 1) / 2) * spacing * 1.05,
      0,
      0
    );
    gearsGroup.add(gearGroup);
    gears.push(gearGroup);
  }

  const supportPoleGeometry = new THREE.BoxGeometry(CLOCK_RADIUS * 2.1, 0.35, 1.0);
  const supportPoleMaterial = new THREE.MeshStandardMaterial({
    color: WOOD,
    roughness: 0.85,
    metalness: 0.05
  });
  const supportPole = new THREE.Mesh(supportPoleGeometry, supportPoleMaterial);
  supportPole.position.set(0, -CLOCK_RADIUS - 0.3, 0);
  supportPole.receiveShadow = true;
  supportPole.castShadow = true;
  scene.add(supportPole);

  const bracketGeometry = new THREE.BoxGeometry(0.6, 2.5, 0.8);
  const bracketMaterial = new THREE.MeshStandardMaterial({
    color: IRON,
    roughness: 0.5,
    metalness: 0.8
  });
  for (let bi = 0; bi < 2; bi++) {
    const bracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
    bracket.position.set(
      (bi * 2 - 1) * (CLOCK_RADIUS * 0.9),
      -CLOCK_RADIUS - 2.0,
      0
    );
    bracket.castShadow = true;
    scene.add(bracket);
  }

  const clock = new THREE.Clock();
  let animationId: number;
  let lastFrameTime = 0;

  function smoothLerp(current: number, target: number, t: number): number {
    const diff = shortestAngleDiff(target, current);
    return current + diff * Math.min(t, 1);
  }

  function updateMoonPhase(dayOfYear: number) {
    const lunarPhase = (dayOfYear % 29.53) / 29.53;
    const phaseAngle = lunarPhase * Math.PI * 2;
    const offset = Math.cos(phaseAngle) * 1.0;
    moonShadow.position.x = offset;
    moonShadow.position.z = 0;
    moonShadow.scale.x = Math.abs(Math.cos(phaseAngle)) < 0.15 ? 0.3 : 1;
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    const delta = clock.getDelta();
    const now = performance.now();
    const frameDt = now - lastFrameTime;
    lastFrameTime = now;

    const daySpeed = 0.08;
    state.dayOfYear = (state.dayOfYear + daySpeed) % 365;

    const theory = calculateAstroAngles(state.dayOfYear);
    state.sunTheoryAngle = theory.sun;
    state.moonTheoryAngle = theory.moon;
    state.planetTheoryAngle = theory.planet;

    const baseSunRate = (2 * Math.PI) / (365 * 24 * 60);
    const baseMoonRate = baseSunRate * 13.37;
    const basePlanetRate = baseSunRate * 0.53;

    const dtMinutes = delta * 60 * 24;
    targetSunAngle = normalizeAngle(targetSunAngle + baseSunRate * dtMinutes * 365 * params.sunRatio);
    targetMoonAngle = normalizeAngle(targetMoonAngle + baseMoonRate * dtMinutes * 27.3 * params.moonRatio);
    targetPlanetAngle = normalizeAngle(targetPlanetAngle + basePlanetRate * dtMinutes * 365 * 0.98);

    for (let i = 0; i < GEAR_COUNT; i++) {
      const gearRatio = i === 0 ? 1 : -(GEAR_TEETH[i - 1] / GEAR_TEETH[i]);
      const baseGearSpeed = baseSunRate * 1000;
      const speed = baseGearSpeed * dtMinutes * params.gearModule;
      targetGearAngles[i] = normalizeAngle(targetGearAngles[i] + speed * gearRatio * (i === 0 ? 1 : 1));
    }

    let stabilizationFactor = 1;
    if (stabilizationStart !== null) {
      const t = elapsed - stabilizingTime;
      if (t < 0.5) {
        stabilizationFactor = 0.7 + 0.3 * (t / 0.5);
      } else {
        stabilizationStart = null;
      }
    }

    const pointerLerpSpeed = Math.min(1, delta * 4);
    state.sunActualAngle = smoothLerp(state.sunActualAngle, targetSunAngle, pointerLerpSpeed * stabilizationFactor);
    state.moonActualAngle = smoothLerp(state.moonActualAngle, targetMoonAngle, pointerLerpSpeed * stabilizationFactor);
    state.planetActualAngle = smoothLerp(state.planetActualAngle, targetPlanetAngle, pointerLerpSpeed * stabilizationFactor);

    const gearLerpSpeed = Math.min(1, delta * 6);
    for (let i = 0; i < GEAR_COUNT; i++) {
      let baseAngle = smoothLerp(state.gearAngles[i], targetGearAngles[i], gearLerpSpeed * stabilizationFactor);
      if (stabilizationStart !== null && Math.random() < 0.4) {
        baseAngle += (Math.random() - 0.5) * 0.01;
      } else if (Math.random() < 0.05) {
        baseAngle += (Math.random() - 0.5) * 0.002;
      }
      state.gearAngles[i] = baseAngle;
    }

    sunPointerGroup.rotation.z = state.sunActualAngle - Math.PI / 2;
    moonPointerGroup.rotation.z = state.moonActualAngle - Math.PI / 2;
    planetPointerGroup.rotation.z = state.planetActualAngle - Math.PI / 2;

    sunRing.rotation.z = -state.sunActualAngle * 0.02;
    moonRing.rotation.z = state.moonActualAngle * 0.03;
    planetRing.rotation.z = -state.planetActualAngle * 0.04;

    for (let i = 0; i < GEAR_COUNT; i++) {
      gears[i].rotation.z = state.gearAngles[i];
    }

    updateMoonPhase(state.dayOfYear);

    centerHandGroup.rotation.z = (elapsed * 0.3) % (Math.PI * 2);

    renderer.render(scene, camera);
    void frameDt;
  }

  animate();

  function handleResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', handleResize);

  function updateGearRatio(newParams: Partial<ClockParams>) {
    const changed = Object.keys(newParams).some(k => (params as unknown as Record<string, number>)[k] !== (newParams as unknown as Record<string, number>)[k]);
    if (changed) {
      params = { ...params, ...newParams };
      stabilizingTime = clock.getElapsedTime();
      stabilizationStart = [...state.gearAngles];
    }
  }

  function setDate(dayOfYear: number) {
    state.dayOfYear = dayOfYear;
    const theory = calculateAstroAngles(dayOfYear);
    targetSunAngle = theory.sun;
    targetMoonAngle = theory.moon;
    targetPlanetAngle = theory.planet;
    state.sunTheoryAngle = theory.sun;
    state.moonTheoryAngle = theory.moon;
    state.planetTheoryAngle = theory.planet;
    updateMoonPhase(dayOfYear);

    const gearTurns = dayOfYear * 0.8;
    for (let i = 0; i < GEAR_COUNT; i++) {
      const direction = i % 2 === 0 ? 1 : -1;
      const ratio = 1 + i * 0.3;
      targetGearAngles[i] = normalizeAngle(gearTurns * Math.PI * 2 * direction * ratio);
    }
    stabilizingTime = clock.getElapsedTime();
    stabilizationStart = [...state.gearAngles];
  }

  function getError(): { sunArcmin: number; moonArcmin: number; planetArcmin: number; totalArcmin: number; dayOfYear: number } {
    const sunDiff = shortestAngleDiff(state.sunActualAngle, state.sunTheoryAngle);
    const moonDiff = shortestAngleDiff(state.moonActualAngle, state.moonTheoryAngle);
    const planetDiff = shortestAngleDiff(state.planetActualAngle, state.planetTheoryAngle);
    const sunArcmin = radiansToArcminutes(sunDiff);
    const moonArcmin = radiansToArcminutes(moonDiff);
    const planetArcmin = radiansToArcminutes(planetDiff);
    return {
      sunArcmin,
      moonArcmin,
      planetArcmin,
      totalArcmin: (sunArcmin + moonArcmin + planetArcmin) / 3,
      dayOfYear: state.dayOfYear
    };
  }

  function reset() {
    state.dayOfYear = 80;
    const theory = calculateAstroAngles(state.dayOfYear);
    state.sunActualAngle = theory.sun;
    state.moonActualAngle = theory.moon;
    state.planetActualAngle = theory.planet;
    state.sunTheoryAngle = theory.sun;
    state.moonTheoryAngle = theory.moon;
    state.planetTheoryAngle = theory.planet;
    targetSunAngle = theory.sun;
    targetMoonAngle = theory.moon;
    targetPlanetAngle = theory.planet;
    for (let i = 0; i < GEAR_COUNT; i++) {
      state.gearAngles[i] = 0;
      targetGearAngles[i] = 0;
    }
    params = { gearModule: 1.0, sunRatio: 1.0, moonRatio: 1.0 };
    stabilizingTime = clock.getElapsedTime();
    stabilizationStart = [...state.gearAngles];
    updateMoonPhase(state.dayOfYear);
  }

  function dispose() {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
    rustTexture.dispose();
    dialTexture.dispose();
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return {
    updateGearRatio,
    setDate,
    getError,
    reset,
    dispose
  };
}

export type ClockSceneApi = ReturnType<typeof createClockScene>;
