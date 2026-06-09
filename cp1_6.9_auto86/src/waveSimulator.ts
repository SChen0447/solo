import * as THREE from 'three';
import { GEOLOGY_LAYERS, GeologyLayerInfo } from './geology';

const SOURCE_COLORS = [0xff3333, 0xff9933, 0xffee33, 0x33cc66, 0x3388ff];
const MAX_SOURCES = 5;
const MAX_RINGS_PER_SOURCE = 10;
const BASE_SPEED = 20;
const RING_THICKNESS = 1;
const INITIAL_OPACITY = 0.6;
const FINAL_OPACITY = 0.1;
const RING_RADIUS_INCREMENT = 20;
const MAX_RADIUS = 250;
const FAULT_X = 20;
const FAULT_WIDTH = 10;
const INTERFERENCE_LIFETIME = 1000;

export interface LayerTimestamp {
  layerName: string;
  time: number;
}

export interface EarthquakeSource {
  id: number;
  position: THREE.Vector3;
  color: number;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  createdAt: number;
  pulsePhase: number;
  rings: WaveRing[];
  nextRingTime: number;
  ringIdCounter: number;
  layerTimestamps: LayerTimestamp[];
  passedLayers: Set<string>;
}

export interface WaveRing {
  id: number;
  sourceId: number;
  sourceColor: number;
  radius: number;
  baseSpeed: number;
  opacity: number;
  mesh: THREE.Mesh;
  createdAt: number;
  refracted: boolean;
  refractedAngle: number;
  refractedMesh: THREE.Mesh | null;
}

export interface InterferenceStripe {
  id: number;
  mesh: THREE.Mesh;
  createdAt: number;
}

export interface WaveSimulator {
  addSource: (position: THREE.Vector3) => EarthquakeSource | null;
  update: (deltaTime: number, currentTime: number) => void;
  getSources: () => EarthquakeSource[];
  getTotalRingCount: () => number;
  getSourceById: (id: number) => EarthquakeSource | undefined;
}

export function createWaveSimulator(scene: THREE.Scene): WaveSimulator {
  const sources: EarthquakeSource[] = [];
  let sourceIdCounter = 0;
  const interferenceStripes: InterferenceStripe[] = [];
  let interferenceIdCounter = 0;

  function colorToHex(c: number): string {
    return '#' + c.toString(16).padStart(6, '0');
  }

  function createSourceMesh(color: number): { mesh: THREE.Mesh; glowMesh: THREE.Mesh } {
    const geometry = new THREE.SphereGeometry(2, 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);

    const glowGeometry = new THREE.SphereGeometry(3.5, 24, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.25,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);

    return { mesh, glowMesh };
  }

  function createRingMesh(radius: number, color: number, opacity: number): THREE.Mesh {
    const geometry = new THREE.RingGeometry(
      radius,
      radius + RING_THICKNESS,
      96
    );
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  function getSpeedFactorForDepth(y: number): number {
    for (const layer of GEOLOGY_LAYERS) {
      if (y <= layer.yStart && y >= layer.yStart - layer.thickness) {
        return 1 - layer.densityFactor;
      }
    }
    return 0.8;
  }

  function interpolateColor(t: number): number {
    const r1 = 255, g1 = 51, b1 = 51;
    const r2 = 51, g2 = 136, b2 = 255;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  function addSource(position: THREE.Vector3): EarthquakeSource | null {
    if (sources.length >= MAX_SOURCES) return null;

    const color = SOURCE_COLORS[sources.length % SOURCE_COLORS.length];
    const { mesh, glowMesh } = createSourceMesh(color);
    mesh.position.copy(position);
    glowMesh.position.copy(position);
    mesh.position.y = 1.5;
    glowMesh.position.y = 1.5;
    scene.add(mesh);
    scene.add(glowMesh);

    const source: EarthquakeSource = {
      id: sourceIdCounter++,
      position: position.clone(),
      color,
      mesh,
      glowMesh,
      createdAt: performance.now(),
      pulsePhase: 0,
      rings: [],
      nextRingTime: performance.now(),
      ringIdCounter: 0,
      layerTimestamps: [],
      passedLayers: new Set<string>(),
    };

    sources.push(source);
    return source;
  }

  function spawnRing(source: EarthquakeSource, currentTime: number): void {
    if (source.rings.length >= MAX_RINGS_PER_SOURCE) {
      const oldest = source.rings.shift();
      if (oldest) {
        scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
        if (oldest.refractedMesh) {
          scene.remove(oldest.refractedMesh);
          oldest.refractedMesh.geometry.dispose();
          (oldest.refractedMesh.material as THREE.Material).dispose();
        }
      }
    }

    const initialRadius = 3;
    const color = interpolateColor(0);
    const ringMesh = createRingMesh(initialRadius, color, INITIAL_OPACITY);
    ringMesh.position.set(source.position.x, 0.2, source.position.z);
    scene.add(ringMesh);

    const ring: WaveRing = {
      id: source.ringIdCounter++,
      sourceId: source.id,
      sourceColor: source.color,
      radius: initialRadius,
      baseSpeed: BASE_SPEED,
      opacity: INITIAL_OPACITY,
      mesh: ringMesh,
      createdAt: currentTime,
      refracted: false,
      refractedAngle: 0,
      refractedMesh: null,
    };

    source.rings.push(ring);
  }

  function checkLayerCrossing(source: EarthquakeSource, ring: WaveRing, currentTime: number): void {
    for (const layer of GEOLOGY_LAYERS) {
      if (!source.passedLayers.has(layer.name)) {
        const depthThreshold = Math.abs(layer.yStart);
        if (ring.radius >= depthThreshold * 0.3) {
          source.passedLayers.add(layer.name);
          source.layerTimestamps.push({
            layerName: layer.name,
            time: currentTime - source.createdAt,
          });
        }
      }
    }
  }

  function checkFaultRefraction(ring: WaveRing, source: EarthquakeSource): void {
    if (ring.refracted) return;

    const leftFault = FAULT_X - FAULT_WIDTH / 2;
    const rightFault = FAULT_X + FAULT_WIDTH / 2;
    const dx = source.position.x - FAULT_X;
    const distToFault = Math.abs(dx);

    if (ring.radius >= distToFault && ring.radius < distToFault + 60) {
      ring.refracted = true;
      ring.refractedAngle = (Math.random() * 30 + 15) * (Math.PI / 180);
      if (dx > 0) ring.refractedAngle = -ring.refractedAngle;

      const refractedColor = interpolateColor(ring.radius / MAX_RADIUS);
      ring.refractedMesh = createRingMesh(ring.radius, refractedColor, ring.opacity * 0.7);
      ring.refractedMesh.position.set(
        source.position.x + Math.sin(ring.refractedAngle) * ring.radius * 0.3,
        0.25,
        source.position.z + Math.cos(ring.refractedAngle) * ring.radius * 0.3
      );
      scene.add(ring.refractedMesh);
    }
  }

  function updateRingScale(ring: WaveRing): void {
    const geo = ring.mesh.geometry as THREE.RingGeometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const innerRadius = ring.radius;
    const outerRadius = ring.radius + RING_THICKNESS;

    for (let i = 0; i < posAttr.count; i++) {
      const angle = (i / posAttr.count) * Math.PI * 2;
      const isOuter = i % 2 === 1;
      const r = isOuter ? outerRadius : innerRadius;
      posAttr.setX(i, Math.cos(angle) * r);
      posAttr.setY(i, Math.sin(angle) * r);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  function detectInterference(currentTime: number): void {
    const allRings: WaveRing[] = [];
    for (const s of sources) {
      for (const r of s.rings) allRings.push(r);
    }

    for (let i = 0; i < allRings.length; i++) {
      for (let j = i + 1; j < allRings.length; j++) {
        const r1 = allRings[i];
        const r2 = allRings[j];
        if (r1.sourceId === r2.sourceId) continue;

        const s1 = sources.find(s => s.id === r1.sourceId)!;
        const s2 = sources.find(s => s.id === r2.sourceId)!;
        const dist = s1.position.distanceTo(s2.position);
        const diff = Math.abs(r1.radius - r2.radius);
        const sum = r1.radius + r2.radius;

        if (diff < dist && dist < sum && Math.abs(dist - (r1.radius + r2.radius) / 2) < 8) {
          const midX = (s1.position.x + s2.position.x) / 2;
          const midZ = (s1.position.z + s2.position.z) / 2;
          createInterferenceStripe(midX, midZ, (r1.radius + r2.radius) / 2, currentTime);
        }
      }
    }
  }

  function createInterferenceStripe(x: number, z: number, radius: number, currentTime: number): void {
    for (const existing of interferenceStripes) {
      const dx = existing.mesh.position.x - x;
      const dz = existing.mesh.position.z - z;
      if (dx * dx + dz * dz < 25) return;
    }

    const geometry = new THREE.RingGeometry(radius - 1.5, radius + 1.5, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.5, z);
    scene.add(mesh);

    interferenceStripes.push({
      id: interferenceIdCounter++,
      mesh,
      createdAt: currentTime,
    });
  }

  function updateInterferences(currentTime: number): void {
    for (let i = interferenceStripes.length - 1; i >= 0; i--) {
      const s = interferenceStripes[i];
      const age = currentTime - s.createdAt;
      if (age >= INTERFERENCE_LIFETIME) {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        interferenceStripes.splice(i, 1);
      } else {
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - age / INTERFERENCE_LIFETIME);
      }
    }
  }

  function update(deltaTime: number, currentTime: number): void {
    for (const source of sources) {
      source.pulsePhase += deltaTime * Math.PI * 4;
      const pulseScale = 1.0 + 0.2 * (0.5 + 0.5 * Math.sin(source.pulsePhase));
      source.mesh.scale.setScalar(pulseScale);
      source.glowMesh.scale.setScalar(pulseScale * 1.0);
      const glowOpacity = 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(source.pulsePhase));
      (source.glowMesh.material as THREE.MeshBasicMaterial).opacity = glowOpacity;

      if (currentTime >= source.nextRingTime) {
        spawnRing(source, currentTime);
        source.nextRingTime = currentTime + 400;
      }

      for (let i = source.rings.length - 1; i >= 0; i--) {
        const ring = source.rings[i];
        const age = currentTime - ring.createdAt;

        const speedFactor = getSpeedFactorForDepth(-ring.radius * 0.05);
        ring.radius += ring.baseSpeed * speedFactor * deltaTime;
        updateRingScale(ring);

        const progress = Math.min(1, ring.radius / MAX_RADIUS);
        ring.opacity = INITIAL_OPACITY + (FINAL_OPACITY - INITIAL_OPACITY) * progress;
        const ringColor = interpolateColor(progress);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = ring.opacity;
        (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(ringColor);

        checkLayerCrossing(source, ring, currentTime);
        checkFaultRefraction(ring, source);

        if (ring.refractedMesh) {
          ring.refractedMesh.scale.setScalar(1.01 + progress * 0.05);
          (ring.refractedMesh.material as THREE.MeshBasicMaterial).opacity = ring.opacity * 0.65;
          (ring.refractedMesh.material as THREE.MeshBasicMaterial).color.setHex(ringColor);
        }

        if (ring.radius >= MAX_RADIUS || age > 15000) {
          scene.remove(ring.mesh);
          ring.mesh.geometry.dispose();
          (ring.mesh.material as THREE.Material).dispose();
          if (ring.refractedMesh) {
            scene.remove(ring.refractedMesh);
            ring.refractedMesh.geometry.dispose();
            (ring.refractedMesh.material as THREE.Material).dispose();
          }
          source.rings.splice(i, 1);
        }
      }
    }

    detectInterference(currentTime);
    updateInterferences(currentTime);
  }

  function getSources(): EarthquakeSource[] {
    return sources;
  }

  function getTotalRingCount(): number {
    let count = 0;
    for (const s of sources) count += s.rings.length;
    return count;
  }

  function getSourceById(id: number): EarthquakeSource | undefined {
    return sources.find(s => s.id === id);
  }

  return { addSource, update, getSources, getTotalRingCount, getSourceById };
}

export { SOURCE_COLORS, colorToHex };
