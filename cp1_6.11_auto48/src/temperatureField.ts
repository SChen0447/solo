import * as THREE from 'three';

export interface TemperatureFieldSystem {
  group: THREE.Group;
  update: (temperature: number, time: number, hasParticlesNearby: boolean) => void;
  getMaxRadius: () => number;
}

interface RingLayer {
  mesh: THREE.Mesh;
  baseOpacity: number;
  phase: number;
}

export const createTemperatureField = (): TemperatureFieldSystem => {
  const group = new THREE.Group();
  const rings: RingLayer[] = [];
  const MAX_RADIUS = 50;

  const coreSphere = createCoreSphere();
  group.add(coreSphere);

  for (let i = 0; i < 10; i++) {
    const ratio = (i + 1) / 10;
    const ring = createRingLayer(ratio * MAX_RADIUS, ratio);
    rings.push({
      mesh: ring,
      baseOpacity: 0.06 + (1 - ratio) * 0.1,
      phase: Math.random() * Math.PI * 2
    });
    group.add(ring);
  }

  const gridPlane = createHeatGrid();
  gridPlane.rotation.x = -Math.PI / 2;
  gridPlane.position.y = 0.1;
  group.add(gridPlane);

  const getMaxRadius = (): number => MAX_RADIUS;

  const update = (temperature: number, time: number, hasParticlesNearby: boolean): void => {
    const tempRatio = (temperature - 200) / 200;
    const pulseIntensity = hasParticlesNearby ? 0.2 : 0.05;
    const pulseSpeed = 1.0;

    const coreMat = coreSphere.material as THREE.MeshBasicMaterial;
    const corePulse = 0.25 + Math.sin(time * pulseSpeed * Math.PI * 2) * pulseIntensity;
    coreMat.opacity = corePulse * (0.6 + tempRatio * 0.4);
    coreMat.color.setHSL(0.02 + tempRatio * 0.03, 1, 0.5);
    coreSphere.scale.setScalar(1 + tempRatio * 0.3);

    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      const mat = ring.mesh.material as THREE.MeshBasicMaterial;
      const ringRatio = (i + 1) / 10;

      const wavePhase = ring.phase + time * pulseSpeed * Math.PI * 2 * (1 + ringRatio * 0.5);
      const wave = Math.sin(wavePhase) * pulseIntensity;
      const particleBoost = hasParticlesNearby ? Math.sin(time * 2 + i * 0.5) * 0.08 : 0;

      mat.opacity = ring.baseOpacity * (0.7 + tempRatio * 0.6) + wave + particleBoost;

      const hue = 0.02 + ringRatio * 0.62;
      const saturation = 0.8 - ringRatio * 0.3;
      const lightness = 0.35 + ringRatio * 0.25;
      mat.color.setHSL(hue, saturation, lightness);

      const radiusScale = 1 + tempRatio * 0.15 + Math.sin(time * 0.5 + ring.phase) * 0.01;
      ring.mesh.scale.setScalar(radiusScale);
    }

    updateHeatGrid(gridPlane, temperature, time);
  };

  return {
    group,
    update,
    getMaxRadius
  };
};

const createCoreSphere = (): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(5, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff4500,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 10;
  return mesh;
};

const createRingLayer = (radius: number, ratio: number): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(radius, 48, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    wireframe: false,
    polygonOffset: true,
    polygonOffsetFactor: ratio * -2
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 30 + ratio * 10;
  return mesh;
};

const createHeatGrid = (): THREE.Mesh => {
  const size = 120;
  const segments = 60;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const positions = geometry.attributes.position.array as Float32Array;
  const colors = new Float32Array(positions.length);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 1];
    const dist = Math.sqrt(x * x + z * z);
    const height = Math.max(0, (1 - dist / 60)) * 2;
    positions[i + 2] = height;
  }

  geometry.computeVertexNormals();
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    wireframe: true
  });

  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
};

const updateHeatGrid = (grid: THREE.Mesh, temperature: number, time: number): void => {
  const positions = grid.geometry.attributes.position.array as Float32Array;
  const colors = grid.geometry.attributes.color.array as Float32Array;
  const tempRatio = (temperature - 200) / 200;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 1];
    const dist = Math.sqrt(x * x + z * z);
    const heatFactor = Math.max(0, 1 - dist / 60);

    const wave = Math.sin(dist * 0.2 - time * 2) * 0.5 + 0.5;
    const intensity = heatFactor * (0.5 + wave * 0.5) * (0.6 + tempRatio * 0.4);

    const hue = 0.02 + heatFactor * 0.35;
    const sat = 0.6 + heatFactor * 0.4;
    const light = 0.2 + intensity * 0.4;

    const color = new THREE.Color().setHSL(hue, sat, light);
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;

    const baseHeight = heatFactor * heatFactor * 3;
    const ripple = Math.sin(dist * 0.3 + time * 1.5) * heatFactor * 0.8;
    positions[i + 2] = baseHeight + ripple;
  }

  grid.geometry.attributes.position.needsUpdate = true;
  grid.geometry.attributes.color.needsUpdate = true;
  grid.geometry.computeVertexNormals();
};
