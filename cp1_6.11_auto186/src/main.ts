import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { saveAs } from 'file-saver';
import gsap from 'gsap';
import { CrystalCluster, CrystalParams } from './crystal';
import { CrystalFragments } from './particles';
import { UIControls, GeologyParams } from './controls';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let crystalClusters: CrystalCluster[] = [];
let fragmentSystem: CrystalFragments;
let uiControls: UIControls;
let caveGroup: THREE.Group;
let floorMesh: THREE.Mesh;
let wallMeshes: THREE.Mesh[] = [];
let hoveredCluster: CrystalCluster | null = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();

function init() {
  const container = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.Fog(0x0a0a0f, 8, 30);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI * 0.85;

  setupLights();
  createCaveEnvironment();

  fragmentSystem = new CrystalFragments(scene);
  createCrystalClusters();

  uiControls = new UIControls(document.getElementById('app')!);
  uiControls.onParamsChange = handleParamsChange;

  createExportButton();
  setupEventListeners();

  updateAllCrystalMaterials(uiControls.getParams());
  setTimeout(() => {
    playGrowthAnimations(uiControls.getParams().growthSpeed);
  }, 300);
}

function setupLights() {
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x6a8cff, 1.2, 15);
  pointLight1.position.set(-3, 3, 2);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xb06eff, 0.8, 12);
  pointLight2.position.set(4, 1, -3);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0x4a9eff, 0.6, 10);
  pointLight3.position.set(0, -1, 4);
  scene.add(pointLight3);
}

function createBasaltTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#14141c';
  for (let i = 0; i < 80; i++) {
    ctx.beginPath();
    const points = 5 + Math.floor(Math.random() * 4);
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);
    for (let j = 1; j < points; j++) {
      const x = startX + (Math.random() - 0.5) * 120;
      const y = startY + (Math.random() - 0.5) * 120;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = '#0a0a12';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.moveTo(x, y);
    const segments = 3 + Math.floor(Math.random() * 5);
    for (let j = 0; j < segments; j++) {
      x += (Math.random() - 0.5) * 80;
      y += (Math.random() - 0.5) * 80;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 3000; i++) {
    const gray = 20 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray + 5})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createCaveEnvironment() {
  caveGroup = new THREE.Group();
  scene.add(caveGroup);

  const basaltTexture = createBasaltTexture();
  const rockMaterial = new THREE.MeshStandardMaterial({
    map: basaltTexture,
    roughness: 0.9,
    metalness: 0.05,
    color: 0x2a2a3a
  });

  const floorGeometry = new THREE.CircleGeometry(15, 64);
  floorMesh = new THREE.Mesh(floorGeometry, rockMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -2;
  floorMesh.receiveShadow = true;
  caveGroup.add(floorMesh);

  createCaveWalls(rockMaterial, 5);
}

function createCaveWalls(material: THREE.Material, density: number) {
  wallMeshes.forEach((m) => caveGroup.remove(m));
  wallMeshes = [];

  const segments = Math.floor(4 + density * 1.2);
  const wallRadius = 8 + density * 0.3;

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nextAngle = ((i + 1) / segments) * Math.PI * 2;

    const r1 = wallRadius * (0.7 + Math.random() * 0.5);
    const r2 = wallRadius * (0.7 + Math.random() * 0.5);

    const shape = new THREE.Shape();
    const height = 8;
    const segmentsH = 6;

    const points: THREE.Vector2[] = [];
    for (let h = 0; h <= segmentsH; h++) {
      const t = h / segmentsH;
      const y = -2 + t * height;
      const bulge = Math.sin(t * Math.PI) * 1.5;
      points.push(new THREE.Vector2(r1 + bulge, y));
    }
    for (let h = segmentsH; h >= 0; h--) {
      const t = h / segmentsH;
      const y = -2 + t * height;
      const bulge = Math.sin(t * Math.PI) * 1.5;
      points.push(new THREE.Vector2(r2 + bulge + 0.5, y));
    }
    shape.setFromPoints(points);

    const extrudeSettings = {
      steps: 1,
      depth: 0.1,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geometry, material);

    const midAngle = (angle + nextAngle) / 2;
    mesh.rotation.y = midAngle;
    mesh.position.x = Math.cos(midAngle) * 0.05;
    mesh.position.z = Math.sin(midAngle) * 0.05;

    caveGroup.add(mesh);
    wallMeshes.push(mesh);
  }

  const ceilingGeometry = new THREE.CircleGeometry(wallRadius * 0.9, 32);
  const ceilingMesh = new THREE.Mesh(ceilingGeometry, material);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = 6;
  caveGroup.add(ceilingMesh);
  wallMeshes.push(ceilingMesh);
}

function createCrystalClusters() {
  const clusterCount = 15;
  const positions: { pos: THREE.Vector3; normal: THREE.Vector3 }[] = [];

  for (let i = 0; i < clusterCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * 4;
    const y = -1 + Math.random() * 5;

    const pos = new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    const normal = new THREE.Vector3(
      -Math.cos(angle) + (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.5,
      -Math.sin(angle) + (Math.random() - 0.5) * 0.3
    ).normalize();

    positions.push({ pos, normal });
  }

  positions.forEach(({ pos, normal }) => {
    const cluster = new CrystalCluster(pos, normal, fragmentSystem);
    crystalClusters.push(cluster);
    scene.add(cluster.group);
  });
}

function updateAllCrystalMaterials(params: GeologyParams) {
  const crystalParams: CrystalParams = {
    temperature: params.temperature,
    growthSpeed: params.growthSpeed
  };
  crystalClusters.forEach((cluster) => {
    cluster.updateMaterial(crystalParams);
  });
}

function playGrowthAnimations(growthSpeed: number) {
  const duration = Math.max(0.5, 11 - growthSpeed) * 0.3;
  crystalClusters.forEach((cluster, index) => {
    setTimeout(() => {
      cluster.playGrowthAnimation(duration);
    }, index * 80);
  });
}

function regenerateCave(density: number) {
  const basaltTexture = createBasaltTexture();
  const rockMaterial = new THREE.MeshStandardMaterial({
    map: basaltTexture,
    roughness: 0.9,
    metalness: 0.05,
    color: 0x2a2a3a
  });

  wallMeshes.forEach((m) => {
    gsap.to(m.scale, {
      x: 0.01,
      y: 0.01,
      z: 0.01,
      duration: 0.75,
      ease: 'power2.in',
      onComplete: () => {
        caveGroup.remove(m);
        m.geometry.dispose();
      }
    });
  });

  setTimeout(() => {
    wallMeshes = [];
    createCaveWalls(rockMaterial, density);
    wallMeshes.forEach((m) => {
      m.scale.setScalar(0.01);
      gsap.to(m.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.75,
        ease: 'back.out(1.2)'
      });
    });
  }, 800);

  crystalClusters.forEach((cluster) => {
    const targetRadius = 3 + (10 - density) * 0.4 + Math.random() * 2;
    const currentLen = cluster.group.position.length();
    const dir = cluster.group.position.clone().normalize();
    const targetPos = dir.multiplyScalar(targetRadius);
    targetPos.y = cluster.group.position.y;

    gsap.to(cluster.group.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.5,
      ease: 'power2.out'
    });
  });
}

function handleParamsChange(params: GeologyParams) {
  updateAllCrystalMaterials(params);

  if (hoveredCluster) {
    // nothing extra needed
  }
}

let lastDensity = 5;
function checkDensityChange(params: GeologyParams) {
  if (params.rockDensity !== lastDensity) {
    lastDensity = params.rockDensity;
    regenerateCave(params.rockDensity);
  }
}

let lastSpeed = 5;
function checkSpeedChange(params: GeologyParams) {
  if (params.growthSpeed !== lastSpeed) {
    lastSpeed = params.growthSpeed;
    playGrowthAnimations(params.growthSpeed);
  }
}

function createExportButton() {
  const btn = document.createElement('button');
  btn.className = 'export-btn';
  btn.innerHTML = '<i class="fas fa-camera"></i>';
  btn.title = '导出全景';
  btn.addEventListener('click', exportPanorama);
  document.getElementById('app')!.appendChild(btn);
}

function exportPanorama() {
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (blob) {
      const filename = `crystal-cave-${Date.now()}.png`;
      saveAs(blob, filename);
    }
  }, 'image/png');
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('dblclick', onDoubleClick);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateMouse(event: MouseEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseMove(event: MouseEvent) {
  updateMouse(event);
  raycaster.setFromCamera(mouse, camera);

  const allCrystals: THREE.Mesh[] = [];
  crystalClusters.forEach((cluster) => {
    allCrystals.push(...cluster.crystals);
  });

  const intersects = raycaster.intersectObjects(allCrystals, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    const cluster = hitMesh.userData.cluster as CrystalCluster;
    if (cluster && cluster !== hoveredCluster) {
      if (hoveredCluster) {
        hoveredCluster.playHoverGlow(false);
      }
      hoveredCluster = cluster;
      hoveredCluster.playHoverGlow(true);
      renderer.domElement.style.cursor = 'pointer';
    }
  } else {
    if (hoveredCluster) {
      hoveredCluster.playHoverGlow(false);
      hoveredCluster = null;
      renderer.domElement.style.cursor = 'grab';
    }
  }
}

function onDoubleClick(event: MouseEvent) {
  updateMouse(event);
  raycaster.setFromCamera(mouse, camera);

  const allCrystals: THREE.Mesh[] = [];
  crystalClusters.forEach((cluster) => {
    allCrystals.push(...cluster.crystals);
  });

  const intersects = raycaster.intersectObjects(allCrystals, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    const cluster = hitMesh.userData.cluster as CrystalCluster;
    if (cluster) {
      const worldPos = new THREE.Vector3();
      intersects[0].object.getWorldPosition(worldPos);
      const hitPoint = intersects[0].point.clone();
      cluster.triggerBurst(hitPoint);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  controls.update();
  fragmentSystem.update(delta);

  const params = uiControls.getParams();
  checkDensityChange(params);
  checkSpeedChange(params);

  crystalClusters.forEach((cluster, i) => {
    cluster.group.rotation.y += Math.sin(Date.now() * 0.0005 + i) * 0.0003;
  });

  renderer.render(scene, camera);
}

init();
animate();
