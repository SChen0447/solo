import * as THREE from 'three';
import gsap from 'gsap';
import { LightColumn } from './LightColumn';
import { LaserBeam } from './LaserBeam';
import { AudioEngine } from './AudioEngine';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 300, 400);
camera.lookAt(0, 50, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x1a1a2e, 1);
document.getElementById('app')!.appendChild(renderer.domElement);

const audioEngine = new AudioEngine();

const lightColumns: LightColumn[] = [];
const laserBeams: LaserBeam[] = [];

const groundGroup = new THREE.Group();
scene.add(groundGroup);

const maxLightColumns = 12;
const laserBeamDistance = 300;
const placementRadiusPercent = 0.3;
let placementRadius = window.innerHeight * placementRadiusPercent;

let lastNoteTime = 0;
let currentBPM = 90;
let beatTime = 0;

const baseBgColor = new THREE.Color(0x1a1a2e);
const purpleBgColor = new THREE.Color(0x2a1a4e);

function createForestGround(): void {
  const tileSize = 8;
  const gridSize = 50;
  const tileCount = gridSize * gridSize;

  const deepGreen = new THREE.Color(0x0d3b2e);
  const grassGreen = new THREE.Color(0x2a7a4b);

  const geometry = new THREE.BoxGeometry(tileSize, 1, tileSize);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: false,
    transparent: false,
  });

  const instancedMesh = new THREE.InstancedMesh(geometry, material, tileCount);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const colors = new Float32Array(tileCount * 3);
  const dummy = new THREE.Object3D();

  let index = 0;
  for (let x = -gridSize / 2; x < gridSize / 2; x++) {
    for (let z = -gridSize / 2; z < gridSize / 2; z++) {
      const noiseVal = noise2D(x * 0.1, z * 0.1);
      const height = noiseVal * 15;

      const colorNoise = noise2D(x * 0.08, z * 0.08);
      const tileColor = deepGreen.clone().lerp(grassGreen, colorNoise * 0.5 + 0.5);

      colors[index * 3] = tileColor.r;
      colors[index * 3 + 1] = tileColor.g;
      colors[index * 3 + 2] = tileColor.b;

      dummy.position.set(x * tileSize, height / 2, z * tileSize);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(index, dummy.matrix);
      index++;
    }
  }

  geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3));
  material.vertexColors = true;
  instancedMesh.instanceMatrix.needsUpdate = true;

  groundGroup.add(instancedMesh);
}

function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function createGlowArea(): void {
  const glowRadius = placementRadius;
  const glowGeo = new THREE.CircleGeometry(glowRadius, 64);

  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0xffffff) },
      innerRadius: { value: glowRadius * 0.3 },
      outerRadius: { value: glowRadius },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float innerRadius;
      uniform float outerRadius;
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        float dist = length(vPosition.xy);
        if (dist > outerRadius) {
          discard;
        }
        float alpha = 0.0;
        if (dist < innerRadius) {
          alpha = 0.08;
        } else {
          alpha = 0.08 * (1.0 - (dist - innerRadius) / (outerRadius - innerRadius));
        }
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  glowMesh.rotation.x = -Math.PI / 2;
  glowMesh.position.y = 0.1;
  groundGroup.add(glowMesh);
}

function createGridHelper(): void {
  const gridSize = 500;
  const gridDivisions = 10;
  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0x666666);
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.1;
  gridHelper.position.y = 0.05;
  groundGroup.add(gridHelper);
}

let isDraggingScene = false;
let isDraggingColumn = false;
let draggedColumn: LightColumn | null = null;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngleY = 0;
let cameraDistance = 400;
let cameraHeight = 300;
let cameraZoom = 1;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function updateCamera(): void {
  const distance = cameraDistance * cameraZoom;
  const height = cameraHeight * cameraZoom;
  camera.position.x = Math.sin(cameraAngleY) * distance;
  camera.position.z = Math.cos(cameraAngleY) * distance;
  camera.position.y = height;
  camera.lookAt(0, 50, 0);
}

function onMouseDown(event: MouseEvent): void {
  audioEngine.resume();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hitColumn = findHitColumn();

  if (event.button === 2 && hitColumn) {
    removeLightColumn(hitColumn);
    return;
  }

  if (event.button === 0 && hitColumn) {
    isDraggingColumn = true;
    draggedColumn = hitColumn;
    draggedColumn.startDrag();
    previousMousePosition = { x: event.clientX, y: event.clientY };
    return;
  }

  if (event.button === 0) {
    const hitPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, hitPoint);

    if (hitPoint) {
      const distFromCenter = Math.sqrt(hitPoint.x ** 2 + hitPoint.z ** 2);
      if (distFromCenter <= placementRadius) {
        if (lightColumns.length < maxLightColumns) {
          createLightColumn(hitPoint.x, hitPoint.z);
        }
      }
    }

    isDraggingScene = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
}

function onContextMenu(event: MouseEvent): void {
  event.preventDefault();
}

function onMouseMove(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (isDraggingColumn && draggedColumn) {
    raycaster.setFromCamera(mouse, camera);
    const hitPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, hitPoint);

    if (hitPoint) {
      const distFromCenter = Math.sqrt(hitPoint.x ** 2 + hitPoint.z ** 2);
      if (distFromCenter <= placementRadius) {
        draggedColumn.setPosition(hitPoint.x, hitPoint.z);
        updateLaserBeams();
      }
    }
  } else if (isDraggingScene) {
    const deltaX = event.clientX - previousMousePosition.x;
    cameraAngleY += deltaX * 0.005 * 0.3;
    previousMousePosition = { x: event.clientX, y: event.clientY };
    updateCamera();
  }
}

function onMouseUp(event: MouseEvent): void {
  if (isDraggingColumn && draggedColumn) {
    const wasClick =
      Math.abs(event.clientX - previousMousePosition.x) < 5 &&
      Math.abs(event.clientY - previousMousePosition.y) < 5;

    if (wasClick) {
      draggedColumn.triggerNote();
      updateBPM();
    }

    draggedColumn.endDrag();
    draggedColumn = null;
    isDraggingColumn = false;
    updateLaserBeams();
  }

  isDraggingScene = false;
}

function onMouseWheel(event: WheelEvent): void {
  event.preventDefault();
  const zoomSpeed = 0.001;
  const oldZoom = cameraZoom;
  cameraZoom -= event.deltaY * zoomSpeed;
  cameraZoom = Math.max(0.5, Math.min(2.0, cameraZoom));

  if (oldZoom !== cameraZoom) {
    gsap.to({ z: oldZoom }, {
      z: cameraZoom,
      duration: 0.3,
      ease: 'power3.out',
      onUpdate: function() {
        cameraZoom = this.targets()[0].z;
        updateCamera();
      },
    });
  }
}

function findHitColumn(): LightColumn | null {
  for (let i = lightColumns.length - 1; i >= 0; i--) {
    const column = lightColumns[i];
    const intersects = raycaster.intersectObject(column.group, true);
    if (intersects.length > 0) {
      return column;
    }
  }
  return null;
}

function createLightColumn(x: number, z: number): void {
  const position = new THREE.Vector3(x, 0, z);
  const column = new LightColumn(position, 8, audioEngine);
  scene.add(column.group);
  lightColumns.push(column);
  updateLaserBeams();
  updatePulseState();
}

function removeLightColumn(column: LightColumn): void {
  const index = lightColumns.indexOf(column);
  if (index === -1) return;

  column.dissolve().then(() => {
    scene.remove(column.group);
    column.dispose();
    const idx = lightColumns.indexOf(column);
    if (idx !== -1) {
      lightColumns.splice(idx, 1);
    }
    updateLaserBeams();
    updatePulseState();
  });
}

function updateBPM(): void {
  const now = performance.now() / 1000;
  if (lastNoteTime > 0) {
    const interval = now - lastNoteTime;
    if (interval > 0.1 && interval < 3) {
      const bpm = 60 / interval;
      currentBPM = Math.max(60, Math.min(180, bpm));
      audioEngine.setBPM(currentBPM);
      for (const beam of laserBeams) {
        beam.setBPM(currentBPM);
      }
    }
  }
  lastNoteTime = now;
}

function updateLaserBeams(): void {
  for (let i = laserBeams.length - 1; i >= 0; i--) {
    const beam = laserBeams[i];
    const dist = beam.startColumn.position.distanceTo(beam.endColumn.position);
    if (dist > laserBeamDistance || !beam.startColumn.isActive || !beam.endColumn.isActive) {
      scene.remove(beam.mesh);
      beam.dispose();
      laserBeams.splice(i, 1);
    }
  }

  for (let i = 0; i < lightColumns.length; i++) {
    for (let j = i + 1; j < lightColumns.length; j++) {
      const colA = lightColumns[i];
      const colB = lightColumns[j];
      const dist = colA.position.distanceTo(colB.position);

      if (dist <= laserBeamDistance && colA.isActive && colB.isActive) {
        const exists = laserBeams.some(beam => beam.matches(colA, colB));
        if (!exists) {
          const beam = new LaserBeam(colA, colB);
          scene.add(beam.mesh);
          laserBeams.push(beam);
        }
      }
    }
  }
}

function updatePulseState(): void {
  const shouldPulse = lightColumns.filter(c => c.isActive).length >= 5;
  for (const beam of laserBeams) {
    beam.setPulsing(shouldPulse);
  }
}

let bgTransitionTime = 0;
let bgTransitionDirection = 1;

function updateBackground(delta: number): void {
  const activeColumns = lightColumns.filter(c => c.isActive).length;

  if (activeColumns >= 5) {
    bgTransitionTime += delta / 8 * bgTransitionDirection;
    if (bgTransitionTime >= 1) {
      bgTransitionTime = 1;
      bgTransitionDirection = -1;
    } else if (bgTransitionTime <= 0) {
      bgTransitionTime = 0;
      bgTransitionDirection = 1;
    }

    const t = (Math.sin(bgTransitionTime * Math.PI) + 1) / 2;
    const color = baseBgColor.clone().lerp(purpleBgColor, t);
    scene.background = color;
    renderer.setClearColor(color);
  } else {
    scene.background = baseBgColor;
    renderer.setClearColor(baseBgColor);
  }
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  placementRadius = window.innerHeight * placementRadiusPercent;
}

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  for (const column of lightColumns) {
    column.update(delta, time);
  }

  for (const beam of laserBeams) {
    beam.update(delta, time);
  }

  updateBackground(delta);

  renderer.render(scene, camera);
}

function init(): void {
  createForestGround();
  createGlowArea();
  createGridHelper();
  updateCamera();

  const initialRadius = placementRadius * 0.5;
  const initialCount = 3;
  for (let i = 0; i < initialCount; i++) {
    const angle = (i / initialCount) * Math.PI * 2;
    const x = Math.cos(angle) * initialRadius;
    const z = Math.sin(angle) * initialRadius;
    setTimeout(() => {
      createLightColumn(x, z);
    }, i * 200);
  }

  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

  animate();
}

init();
