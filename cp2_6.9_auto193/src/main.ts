import * as THREE from 'three';
import { FossilPuzzle, type FossilPiece } from './fossilPuzzle';
import { ParticleEffects } from './particleEffects';
import { UIController } from './uiController';

const container = document.getElementById('three-container')!;

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(5, 10, 7);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 50;
mainLight.shadow.camera.left = -15;
mainLight.shadow.camera.right = 15;
mainLight.shadow.camera.top = 15;
mainLight.shadow.camera.bottom = -15;
scene.add(mainLight);

const rimLight = new THREE.DirectionalLight(0x6688ff, 0.4);
rimLight.position.set(-8, 6, -5);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xffaa66, 0.6, 30);
fillLight.position.set(0, 3, 0);
scene.add(fillLight);

const pedestalGroup = new THREE.Group();
scene.add(pedestalGroup);

function createGraniteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#2a2a2a');
  gradient.addColorStop(0.5, '#1e1e24');
  gradient.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2;
    const gray = 60 + Math.random() * 80;
    ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray + 10}, ${Math.random() * 0.6})`;
    ctx.fillRect(x, y, size, size);
  }

  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 3 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    const gray = 30 + Math.random() * 30;
    ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray + 5}, 0.4)`;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

const graniteTexture = createGraniteTexture();
const graniteBump = createGraniteTexture();

const pedestalGeo = new THREE.CylinderGeometry(5, 5.5, 1, 64);
const pedestalMat = new THREE.MeshStandardMaterial({
  map: graniteTexture,
  bumpMap: graniteBump,
  bumpScale: 0.05,
  roughness: 0.9,
  metalness: 0.1,
  color: 0x333333
});
const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
pedestal.position.y = 0.5;
pedestal.receiveShadow = true;
pedestalGroup.add(pedestal);

const pitGeo = new THREE.CylinderGeometry(4, 4.2, 0.3, 64);
const pitMat = new THREE.MeshStandardMaterial({
  color: 0x2a2018,
  roughness: 0.8,
  metalness: 0.05
});
const pit = new THREE.Mesh(pitGeo, pitMat);
pit.position.y = 0.86;
pit.receiveShadow = true;
pedestalGroup.add(pit);

function createSkeletonOutlineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1208';
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = 512;
  const cy = 512;
  const scale = 90;

  ctx.beginPath();
  ctx.arc(cx, cy - scale * 2.5, scale * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - scale * 0.2, cy - scale * 2);
  ctx.lineTo(cx + scale * 0.2, cy - scale * 2);
  ctx.lineTo(cx + scale * 0.3, cy - scale * 1.7);
  ctx.lineTo(cx - scale * 0.3, cy - scale * 1.7);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - scale * 2);
  ctx.lineTo(cx, cy + scale * 2.5);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const y = cy - scale * 1.5 + i * scale * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - scale * 1.1, y);
    ctx.quadraticCurveTo(cx - scale * 1.3, y - scale * 0.15, cx - scale * 0.9, y - scale * 0.3);
    ctx.moveTo(cx + scale * 1.1, y);
    ctx.quadraticCurveTo(cx + scale * 1.3, y - scale * 0.15, cx + scale * 0.9, y - scale * 0.3);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx + scale * 0.9, cy - scale * 1);
  ctx.lineTo(cx + scale * 1.6, cy - scale * 0.3);
  ctx.lineTo(cx + scale * 1.8, cy + scale * 0.2);
  ctx.moveTo(cx - scale * 0.9, cy - scale * 1);
  ctx.lineTo(cx - scale * 1.6, cy - scale * 0.3);
  ctx.lineTo(cx - scale * 1.8, cy + scale * 0.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + scale * 0.8, cy + scale * 0.8);
  ctx.lineTo(cx + scale * 1.5, cy + scale * 1.4);
  ctx.lineTo(cx + scale * 1.6, cy + scale * 2);
  ctx.moveTo(cx - scale * 0.8, cy + scale * 0.8);
  ctx.lineTo(cx - scale * 1.5, cy + scale * 1.4);
  ctx.lineTo(cx - scale * 1.6, cy + scale * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy + scale * 2.5);
  ctx.quadraticCurveTo(cx, cy + scale * 3.2, cx - scale * 0.5, cy + scale * 3.5);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.rotation = Math.PI;
  texture.center.set(0.5, 0.5);
  return texture;
}

const outlineTexture = createSkeletonOutlineTexture();
const outlineGeo = new THREE.CircleGeometry(3.9, 64);
const outlineMat = new THREE.MeshBasicMaterial({
  map: outlineTexture,
  transparent: true
});
const outline = new THREE.Mesh(outlineGeo, outlineMat);
outline.rotation.x = -Math.PI / 2;
outline.position.y = 1.01;
pedestalGroup.add(outline);

const particleEffects = new ParticleEffects(scene);

let skeletonRig: THREE.Group | null = null;
let standingAnimation: { progress: number; active: boolean } = { progress: 0, active: false };
const lyingRotation = new THREE.Euler(0, 0, -Math.PI / 2.2);
const standingRotation = new THREE.Euler(0, 0, 0);
const lyingPosition = new THREE.Vector3(0, 1.0, 0);
const standingPosition = new THREE.Vector3(0, 2.5, 0);

const fossilPuzzle = new FossilPuzzle({
  onPiecePlaced: (piece: FossilPiece) => {
    particleEffects.spawnHaloParticles(piece.mesh.position.clone(), 20);
  },
  onProgress: (placed: number, total: number) => {
    uiController.updateProgress(placed, total);
  },
  onComplete: () => {
    triggerStandingAnimation();
    particleEffects.spawnFireParticles(new THREE.Vector3(0, 1, 0), 200);
    setTimeout(() => {
      uiController.showSuccess();
    }, 1500);
  }
});

const uiController = new UIController({
  onReset: () => {
    fossilPuzzle.reset();
    particleEffects.clear();
    if (skeletonRig) {
      skeletonRig.rotation.copy(lyingRotation);
      skeletonRig.position.copy(lyingPosition);
    }
    standingAnimation = { progress: 0, active: false };
  }
});

const pieces = fossilPuzzle.createFossilPieces(scene);
uiController.setHints(pieces);
uiController.updateProgress(0, pieces.length);

function createSkeletonRig(): THREE.Group {
  const rig = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xE8D5B0,
    roughness: 0.7,
    metalness: 0.1
  });

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 12),
    bodyMat
  );
  skull.position.set(0, 0, 2.8);
  skull.scale.set(1, 0.8, 1.3);
  skull.castShadow = true;
  rig.add(skull);

  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.15, 0.5),
    bodyMat
  );
  jaw.position.set(0, -0.15, 2.9);
  jaw.castShadow = true;
  rig.add(jaw);

  const spine = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const vertebra = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12),
      bodyMat
    );
    vertebra.position.set(0, 0, 2 - i * 0.5);
    vertebra.castShadow = true;
    spine.add(vertebra);

    if (i >= 2 && i <= 7) {
      const ribL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8),
        bodyMat
      );
      ribL.position.set(0.7, 0, 2 - i * 0.5);
      ribL.rotation.z = Math.PI / 2 - 0.2;
      ribL.castShadow = true;
      spine.add(ribL);

      const ribR = ribL.clone();
      ribR.position.x = -0.7;
      ribR.rotation.z = -Math.PI / 2 + 0.2;
      spine.add(ribR);
    }
  }
  rig.add(spine);

  const tail = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const tailBone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 - t * 0.06, 0.08 - t * 0.05, 0.35, 8),
      bodyMat
    );
    tailBone.position.set(0, t * 0.15, -3.2 - i * 0.35);
    tailBone.rotation.x = 0.1 + t * 0.2;
    tailBone.castShadow = true;
    tail.add(tailBone);
  }
  rig.add(tail);

  const frontLegL = createLeg(bodyMat);
  frontLegL.position.set(1, 0, 1.2);
  rig.add(frontLegL);

  const frontLegR = createLeg(bodyMat);
  frontLegR.position.set(-1, 0, 1.2);
  rig.add(frontLegR);

  const backLegL = createLeg(bodyMat, true);
  backLegL.position.set(0.9, 0, -1);
  rig.add(backLegL);

  const backLegR = createLeg(bodyMat, true);
  backLegR.position.set(-0.9, 0, -1);
  rig.add(backLegR);

  rig.rotation.copy(lyingRotation);
  rig.position.copy(lyingPosition);
  rig.visible = false;

  return rig;
}

function createLeg(material: THREE.Material, isBack: boolean = false): THREE.Group {
  const leg = new THREE.Group();
  const scale = isBack ? 1.1 : 0.9;

  const upper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.6 * scale, 10),
    material
  );
  upper.position.set(0, -0.3 * scale, 0);
  upper.castShadow = true;
  leg.add(upper);

  const lower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 0.55 * scale, 10),
    material
  );
  lower.position.set(0, -0.85 * scale, 0);
  lower.castShadow = true;
  leg.add(lower);

  const foot = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.08, 0.3 * scale),
    material
  );
  foot.position.set(0, -1.15 * scale, 0.05);
  foot.castShadow = true;
  leg.add(foot);

  return leg;
}

skeletonRig = createSkeletonRig();
scene.add(skeletonRig);

function triggerStandingAnimation(): void {
  standingAnimation = { progress: 0, active: true };
  if (skeletonRig) {
    skeletonRig.visible = true;
  }
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedPiece: FossilPiece | null = null;
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const offsetVector = new THREE.Vector3();
const intersectionPoint = new THREE.Vector3();

function getIntersects(event: MouseEvent | PointerEvent): THREE.Intersection[] {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const allMeshes: THREE.Object3D[] = [];
  fossilPuzzle.getPieces().forEach((p) => {
    if (!p.isPlaced) {
      allMeshes.push(p.mesh);
    }
  });

  return raycaster.intersectObjects(allMeshes, true);
}

function onPointerDown(event: PointerEvent): void {
  const intersects = getIntersects(event);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj.parent && !fossilPuzzle.getPieces().some((p) => p.mesh === obj)) {
      obj = obj.parent;
    }

    const piece = fossilPuzzle.getPieces().find((p) => p.mesh === obj);
    if (piece && !piece.isPlaced) {
      draggedPiece = piece;

      raycaster.setFromCamera(mouse, camera);
      dragPlane.constant = -piece.mesh.position.y;
      if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
        offsetVector.copy(intersectionPoint).sub(piece.mesh.position);
      }

      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    }
  }
}

function onPointerMove(event: PointerEvent): void {
  if (!draggedPiece) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  dragPlane.constant = -draggedPiece.mesh.position.y;

  if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
    draggedPiece.mesh.position.copy(intersectionPoint.sub(offsetVector));
  }
}

function onPointerUp(): void {
  if (draggedPiece) {
    fossilPuzzle.checkSnap(draggedPiece);
    draggedPiece = null;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerup', onPointerUp);
renderer.domElement.addEventListener('pointercancel', onPointerUp);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let pedestalRotation = 0;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  const elapsedTime = clock.getElapsedTime();

  pedestalRotation += deltaTime * 0.15;
  pedestalGroup.rotation.y = pedestalRotation;

  pieces.forEach((piece) => {
    if (!piece.isPlaced) {
      piece.mesh.rotation.y += deltaTime * 0.1;
      piece.mesh.position.y += Math.sin(elapsedTime * 1.5 + piece.id) * deltaTime * 0.1;
    }

    piece.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'glow') {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.06 + Math.sin(elapsedTime * 2 + piece.id) * 0.03;
      }
    });
  });

  if (standingAnimation.active && skeletonRig) {
    standingAnimation.progress = Math.min(standingAnimation.progress + deltaTime / 3, 1);
    const t = easeInOutCubic(standingAnimation.progress);

    skeletonRig.rotation.x = lyingRotation.x * (1 - t) + standingRotation.x * t;
    skeletonRig.rotation.y = lyingRotation.y * (1 - t) + standingRotation.y * t;
    skeletonRig.rotation.z = lyingRotation.z * (1 - t) + standingRotation.z * t;

    skeletonRig.position.x = lyingPosition.x * (1 - t) + standingPosition.x * t;
    skeletonRig.position.y = lyingPosition.y * (1 - t) + standingPosition.y * t;
    skeletonRig.position.z = lyingPosition.z * (1 - t) + standingPosition.z * t;

    if (standingAnimation.progress >= 1) {
      standingAnimation.active = false;
    }
  }

  particleEffects.update(deltaTime);

  const cameraAngle = elapsedTime * 0.08;
  const radius = 14;
  camera.position.x = Math.sin(cameraAngle) * radius;
  camera.position.z = Math.cos(cameraAngle) * radius;
  camera.lookAt(0, 1, 0);

  renderer.render(scene, camera);
}

animate();
