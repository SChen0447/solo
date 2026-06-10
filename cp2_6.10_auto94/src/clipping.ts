import * as THREE from 'three';
import type { TerrainData } from './terrain';

export interface ClippingSystem {
  clippingPlane: THREE.Plane;
  planeMesh: THREE.Mesh;
  capMesh: THREE.Mesh;
  edgeLines: THREE.LineSegments;
  rockParticles: THREE.Points;
  updateSlicePosition: (value: number) => void;
  updateSliceAngle: (degrees: number) => void;
  update: () => void;
  handleMouseMove: (
    event: MouseEvent,
    camera: THREE.Camera,
    container: HTMLElement,
    terrainData: TerrainData
  ) => void;
  dispose: () => void;
}

export function createClippingSystem(terrainData: TerrainData): ClippingSystem {
  const halfSize = terrainData.size / 2;
  const initialX = 0;
  const initialAngleDeg = 0;

  const clippingPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -initialX);

  const planeGeometry = new THREE.PlaneGeometry(terrainData.size * 1.5, terrainData.size * 1.5);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  planeMesh.name = 'clippingPlaneMesh';

  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x5C4033,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0,
    clippingPlanes: [clippingPlane],
    clipShadows: true
  });

  const capGeometry = new THREE.PlaneGeometry(terrainData.size, terrainData.size, 32, 32);
  capGeometry.rotateX(-Math.PI / 2);
  const capMesh = new THREE.Mesh(capGeometry, capMaterial);
  capMesh.name = 'capMesh';

  const edgeGeometry = new THREE.BufferGeometry();
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0xff2222,
    linewidth: 2,
    transparent: true,
    opacity: 0.9
  });
  const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edgeLines.name = 'edgeLines';

  const rockParticleGeometry = new THREE.BufferGeometry();
  const rockParticleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const rockParticles = new THREE.Points(rockParticleGeometry, rockParticleMaterial);
  rockParticles.name = 'rockParticles';

  let currentX = initialX;
  let currentAngleDeg = initialAngleDeg;
  let tooltipVisible = false;
  let tooltipTargetX = 0;
  let tooltipTargetY = 0;
  let tooltipCurrentX = 0;
  let tooltipCurrentY = 0;

  const tooltip = document.getElementById('tooltip') as HTMLDivElement;
  const tooltipAltitude = document.getElementById('tooltip-altitude') as HTMLDivElement;
  const tooltipDistance = document.getElementById('tooltip-distance') as HTMLDivElement;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function updatePlaneTransform() {
    const angleRad = THREE.MathUtils.degToRad(currentAngleDeg);
    const normal = new THREE.Vector3(Math.cos(angleRad), 0, Math.sin(angleRad));
    clippingPlane.normal.copy(normal);
    clippingPlane.constant = -currentX;

    planeMesh.position.set(currentX * normal.x, 0, currentX * normal.z);
    planeMesh.lookAt(currentX * normal.x + normal.x, 0, currentX * normal.z + normal.z);
  }

  function generateCapAndEdges() {
    const angleRad = THREE.MathUtils.degToRad(currentAngleDeg);
    const normal = new THREE.Vector3(Math.cos(angleRad), 0, Math.sin(angleRad));
    const tangent = new THREE.Vector3(-Math.sin(angleRad), 0, Math.cos(angleRad));
    const up = new THREE.Vector3(0, 1, 0);

    const halfSize = terrainData.size / 2;
    const sampleSteps = 80;
    const capPositions: number[] = [];
    const capNormals: number[] = [];
    const edgePositions: number[] = [];
    const particlePositions: number[] = [];

    for (let i = 0; i < sampleSteps; i++) {
      const t = (i / (sampleSteps - 1)) * 2 - 1;
      const tangentOffset = t * halfSize;

      const basePoint = new THREE.Vector3(
        currentX * normal.x + tangentOffset * tangent.x,
        0,
        currentX * normal.z + tangentOffset * tangent.z
      );

      const topY = terrainData.maxHeight + 1;
      const bottomY = terrainData.minHeight - 1;

      let surfaceY = terrainData.minHeight;
      let foundSurface = false;

      for (let s = 0; s < 40; s++) {
        const sampleT = s / 39;
        const testY = bottomY + sampleT * (topY - bottomY);
        const testPoint = new THREE.Vector3(basePoint.x, testY, basePoint.z);
        
        const worldX = testPoint.x;
        const worldZ = testPoint.z;
        const terrainHeight = terrainData.getHeightAt(worldX, worldZ);
        
        if (testY <= terrainHeight) {
          surfaceY = terrainHeight;
          foundSurface = true;
        }
      }

      if (foundSurface || true) {
        const surfaceHeight = foundSurface ? surfaceY : terrainData.getHeightAt(basePoint.x, basePoint.z);

        const v1 = new THREE.Vector3(basePoint.x, bottomY, basePoint.z);
        const v2 = new THREE.Vector3(basePoint.x, surfaceHeight, basePoint.z);

        capPositions.push(v1.x, v1.y, v1.z);
        capPositions.push(v2.x, v2.y, v2.z);
        capNormals.push(normal.x, normal.y, normal.z);
        capNormals.push(normal.x, normal.y, normal.z);

        edgePositions.push(v2.x, v2.y, v2.z);
        if (i < sampleSteps - 1) {
          const nextT = ((i + 1) / (sampleSteps - 1)) * 2 - 1;
          const nextTangentOffset = nextT * halfSize;
          const nextBasePoint = new THREE.Vector3(
            currentX * normal.x + nextTangentOffset * tangent.x,
            0,
            currentX * normal.z + nextTangentOffset * tangent.z
          );
          const nextSurfaceHeight = terrainData.getHeightAt(nextBasePoint.x, nextBasePoint.z);
          edgePositions.push(nextBasePoint.x, nextSurfaceHeight, nextBasePoint.z);
        }

        const density = 5 + Math.random() * 3;
        const numParticles = Math.floor(density * (surfaceHeight - bottomY) * (halfSize * 2 / sampleSteps));
        for (let p = 0; p < numParticles; p++) {
          const py = bottomY + Math.random() * (surfaceHeight - bottomY);
          const ptOffset = (Math.random() - 0.5) * (halfSize * 2 / sampleSteps);
          const px = basePoint.x + ptOffset * tangent.x;
          const pz = basePoint.z + ptOffset * tangent.z;
          particlePositions.push(px, py, pz);
        }
      }
    }

    const finalCapPositions: number[] = [];
    const finalCapNormals: number[] = [];
    const numColumns = Math.floor(capPositions.length / 6);

    for (let i = 0; i < numColumns - 1; i++) {
      const idx = i * 6;
      const v0 = [capPositions[idx], capPositions[idx + 1], capPositions[idx + 2]];
      const v1 = [capPositions[idx + 3], capPositions[idx + 4], capPositions[idx + 5]];
      const v2 = [capPositions[idx + 6], capPositions[idx + 7], capPositions[idx + 8]];
      const v3 = [capPositions[idx + 9], capPositions[idx + 10], capPositions[idx + 11]];
      const n0 = [capNormals[idx], capNormals[idx + 1], capNormals[idx + 2]];

      finalCapPositions.push(...v0, ...v2, ...v1);
      finalCapNormals.push(...n0, ...n0, ...n0);
      finalCapPositions.push(...v1, ...v2, ...v3);
      finalCapNormals.push(...n0, ...n0, ...n0);
    }

    (capMesh.geometry as THREE.BufferGeometry).dispose();
    const newCapGeometry = new THREE.BufferGeometry();
    newCapGeometry.setAttribute('position', new THREE.Float32BufferAttribute(finalCapPositions, 3));
    newCapGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(finalCapNormals, 3));
    capMesh.geometry = newCapGeometry;

    (edgeLines.geometry as THREE.BufferGeometry).dispose();
    const newEdgeGeometry = new THREE.BufferGeometry();
    newEdgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    edgeLines.geometry = newEdgeGeometry;

    (rockParticles.geometry as THREE.BufferGeometry).dispose();
    const newParticleGeometry = new THREE.BufferGeometry();
    newParticleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    rockParticles.geometry = newParticleGeometry;
  }

  function updateSlicePosition(value: number) {
    currentX = value - halfSize;
    updatePlaneTransform();
    generateCapAndEdges();
  }

  function updateSliceAngle(degrees: number) {
    currentAngleDeg = degrees;
    updatePlaneTransform();
    generateCapAndEdges();
  }

  function update() {
    if (tooltipVisible) {
      tooltipCurrentX += (tooltipTargetX - tooltipCurrentX) * 0.15;
      tooltipCurrentY += (tooltipTargetY - tooltipCurrentY) * 0.15;
      tooltip.style.left = `${tooltipCurrentX + 15}px`;
      tooltip.style.top = `${tooltipCurrentY + 15}px`;
    }
  }

  function handleMouseMove(
    event: MouseEvent,
    camera: THREE.Camera,
    container: HTMLElement,
    terrainData: TerrainData
  ) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const angleRad = THREE.MathUtils.degToRad(currentAngleDeg);
    const normal = new THREE.Vector3(Math.cos(angleRad), 0, Math.sin(angleRad));
    
    const planeIntersect = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(clippingPlane, planeIntersect);

    if (hit && planeIntersect) {
      const half = halfSize;
      const tangent = new THREE.Vector3(-Math.sin(angleRad), 0, Math.cos(angleRad));
      const localTangent = planeIntersect.dot(tangent);

      const terrainHeight = terrainData.getHeightAt(planeIntersect.x, planeIntersect.z);

      if (
        Math.abs(localTangent) <= half &&
        planeIntersect.y >= terrainData.minHeight - 1 &&
        planeIntersect.y <= terrainHeight + 0.1
      ) {
        tooltipVisible = true;
        tooltip.classList.add('visible');

        tooltipTargetX = event.clientX;
        tooltipTargetY = event.clientY;

        const altitude = planeIntersect.y;
        tooltipAltitude.textContent = `海拔：${altitude.toFixed(1)}`;

        const distAlongNormal = planeIntersect.dot(normal) - currentX;
        const distPercent = Math.abs((distAlongNormal / half) * 100);
        tooltipDistance.textContent = `距离切割面：${Math.min(100, distPercent).toFixed(0)}%`;
        return;
      }
    }

    tooltipVisible = false;
    tooltip.classList.remove('visible');
  }

  function dispose() {
    planeGeometry.dispose();
    planeMaterial.dispose();
    capGeometry.dispose();
    capMaterial.dispose();
    edgeGeometry.dispose();
    edgeMaterial.dispose();
    rockParticleGeometry.dispose();
    rockParticleMaterial.dispose();
  }

  updatePlaneTransform();
  generateCapAndEdges();

  return {
    clippingPlane,
    planeMesh,
    capMesh,
    edgeLines,
    rockParticles,
    updateSlicePosition,
    updateSliceAngle,
    update,
    handleMouseMove,
    dispose
  };
}

export function setupDialControl(
  containerId: string,
  onChange: (degrees: number) => void
): () => void {
  const container = document.getElementById(containerId) as HTMLDivElement;
  const fill = document.getElementById('dial-fill') as HTMLDivElement;
  const indicator = document.getElementById('dial-indicator') as HTMLDivElement;
  const center = document.getElementById('dial-center') as HTMLDivElement;
  const valueDisplay = document.getElementById('angle-value') as HTMLSpanElement;

  let isDragging = false;
  let currentAngle = 0;

  function getAngleFromEvent(e: MouseEvent | Touch): number {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e as MouseEvent).clientX !== undefined ? (e as MouseEvent).clientX - cx : (e as Touch).clientX - cx;
    const dy = (e as MouseEvent).clientY !== undefined ? (e as MouseEvent).clientY - cy : (e as Touch).clientY - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  }

  function updateDial(angle: number) {
    const snapped = Math.round(angle / 5) * 5;
    const clamped = Math.max(0, Math.min(360, snapped));
    currentAngle = clamped;

    fill.style.background = `conic-gradient(#F3E5AB ${clamped}deg, transparent ${clamped}deg)`;
    indicator.style.transform = `translateX(-50%) rotate(${clamped}deg)`;
    indicator.style.transformOrigin = '50% 52px';
    center.textContent = `${clamped}°`;
    if (valueDisplay) valueDisplay.textContent = `${clamped}°`;

    onChange(clamped);
  }

  function onStart(e: MouseEvent | TouchEvent) {
    isDragging = true;
    const event = 'touches' in e ? e.touches[0] : e;
    updateDial(getAngleFromEvent(event));
    e.preventDefault();
  }

  function onMove(e: MouseEvent | TouchEvent) {
    if (!isDragging) return;
    const event = 'touches' in e ? e.touches[0] : e;
    updateDial(getAngleFromEvent(event));
    e.preventDefault();
  }

  function onEnd() {
    isDragging = false;
  }

  container.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
  container.addEventListener('touchstart', onStart);
  window.addEventListener('touchmove', onMove);
  window.addEventListener('touchend', onEnd);

  updateDial(0);

  return () => {
    container.removeEventListener('mousedown', onStart);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
    container.removeEventListener('touchstart', onStart);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onEnd);
  };
}
