import * as THREE from 'three';
import { ParticleState, SimulationParams } from './simulation';

const MAX_PARTICLES = 2000;
const MAX_TRAIL_LENGTH = 20;

export interface ThermalVentSystem {
  group: THREE.Group;
  ventMesh: THREE.Group;
  particleSystem: THREE.Points;
  trailLines: THREE.LineSegments;
  update: (particlesData: Float32Array, params: SimulationParams) => void;
  getVentMeshes: () => THREE.Mesh[];
  getTopPosition: () => THREE.Vector3;
}

interface ParticleVisual {
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
}

export const createThermalVent = (): ThermalVentSystem => {
  const group = new THREE.Group();
  const ventMeshes: THREE.Mesh[] = [];
  const ventGroup = createVentChimney();
  group.add(ventGroup);
  ventGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      ventMeshes.push(child);
    }
  });

  const { points: particleSystem, geometry: particleGeometry } = createParticleSystem();
  group.add(particleSystem);

  const { line: trailLines, geometry: trailGeometry } = createTrailSystem();
  group.add(trailLines);

  const particleVisuals: ParticleVisual[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particleVisuals.push({
      position: new THREE.Vector3(),
      color: new THREE.Color(),
      size: 1,
      alpha: 0
    });
  }

  const trailHistory: THREE.Vector3[][] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    trailHistory[i] = [];
  }

  const topPosition = new THREE.Vector3(0, 9, 0);

  const getVentMeshes = (): THREE.Mesh[] => ventMeshes;
  const getTopPosition = (): THREE.Vector3 => topPosition.clone();

  const update = (particlesData: Float32Array, params: SimulationParams): void => {
    const positions = particleGeometry.attributes.position.array as Float32Array;
    const colors = particleGeometry.attributes.color.array as Float32Array;
    const sizes = particleGeometry.attributes.size.array as Float32Array;
    const alphas = particleGeometry.attributes.alpha.array as Float32Array;

    const trailPositions = trailGeometry.attributes.position.array as Float32Array;
    const trailColors = trailGeometry.attributes.color.array as Float32Array;
    let trailIndex = 0;

    const tempRange = params.temperature - 4;
    const tempFactor = (params.temperature - 200) / 200;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const offset = i * 8;
      const x = particlesData[offset];
      const y = particlesData[offset + 1];
      const z = particlesData[offset + 2];
      const temperature = particlesData[offset + 3];
      const life = particlesData[offset + 4];
      const active = particlesData[offset + 5] > 0.5;

      const p = particleVisuals[i];
      p.position.set(x, y, z);

      if (active && life > 0) {
        const tempRatio = Math.max(0, Math.min(1, (temperature - 4) / tempRange));
        const colorIntensity = 0.6 + tempRatio * 0.4;

        if (tempRatio > 0.7) {
          const t = (tempRatio - 0.7) / 0.3;
          p.color.setRGB(
            1,
            0.27 * colorIntensity + (1 - t) * 0.3,
            0 * colorIntensity
          );
          p.color.lerpColors(
            new THREE.Color(0xff4500),
            new THREE.Color(0xffff00),
            t * 0.5
          );
        } else if (tempRatio > 0.4) {
          const t = (tempRatio - 0.4) / 0.3;
          p.color.lerpColors(
            new THREE.Color(0xff6600),
            new THREE.Color(0xff4500),
            t
          );
        } else if (tempRatio > 0.15) {
          const t = (tempRatio - 0.15) / 0.25;
          p.color.lerpColors(
            new THREE.Color(0x8b00ff),
            new THREE.Color(0xff6600),
            t
          );
        } else {
          const t = tempRatio / 0.15;
          p.color.lerpColors(
            new THREE.Color(0x1a2a6a),
            new THREE.Color(0x8b00ff),
            t
          );
        }

        if (tempRatio > 0.85) {
          p.color.lerp(new THREE.Color(0x39ff14), 0.15);
        }

        p.alpha = life * (0.7 + tempFactor * 0.3);
        p.size = (1.2 + tempRatio * 2.5) * (0.8 + tempFactor * 0.4);
      } else {
        p.alpha = 0;
        p.size = 0;
      }

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size;
      alphas[i] = p.alpha;

      if (active && life > 0) {
        const history = trailHistory[i];
        history.unshift(p.position.clone());
        if (history.length > MAX_TRAIL_LENGTH) {
          history.pop();
        }

        for (let h = 0; h < history.length - 1 && trailIndex < MAX_PARTICLES * MAX_TRAIL_LENGTH * 2; h++) {
          const segAlpha = (1 - h / history.length) * life * 0.4;
          const from = history[h];
          const to = history[h + 1];

          trailPositions[trailIndex * 6] = from.x;
          trailPositions[trailIndex * 6 + 1] = from.y;
          trailPositions[trailIndex * 6 + 2] = from.z;
          trailPositions[trailIndex * 6 + 3] = to.x;
          trailPositions[trailIndex * 6 + 4] = to.y;
          trailPositions[trailIndex * 6 + 5] = to.z;

          trailColors[trailIndex * 6] = p.color.r;
          trailColors[trailIndex * 6 + 1] = p.color.g;
          trailColors[trailIndex * 6 + 2] = p.color.b;
          trailColors[trailIndex * 6 + 3] = p.color.r * 0.7;
          trailColors[trailIndex * 6 + 4] = p.color.g * 0.7;
          trailColors[trailIndex * 6 + 5] = p.color.b * 0.7;

          trailIndex++;
        }
      } else {
        trailHistory[i] = [];
      }
    }

    for (let i = trailIndex; i < MAX_PARTICLES * MAX_TRAIL_LENGTH; i++) {
      trailPositions[i * 6] = 0;
      trailPositions[i * 6 + 1] = 0;
      trailPositions[i * 6 + 2] = 0;
      trailPositions[i * 6 + 3] = 0;
      trailPositions[i * 6 + 4] = 0;
      trailPositions[i * 6 + 5] = 0;
      trailColors[i * 6] = 0;
      trailColors[i * 6 + 1] = 0;
      trailColors[i * 6 + 2] = 0;
      trailColors[i * 6 + 3] = 0;
      trailColors[i * 6 + 4] = 0;
      trailColors[i * 6 + 5] = 0;
    }

    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;
    particleGeometry.attributes.size.needsUpdate = true;
    particleGeometry.attributes.alpha.needsUpdate = true;
    particleGeometry.setDrawRange(0, MAX_PARTICLES);

    trailGeometry.attributes.position.needsUpdate = true;
    trailGeometry.attributes.color.needsUpdate = true;
    trailGeometry.setDrawRange(0, trailIndex * 2);
  };

  return {
    group,
    ventMesh: ventGroup,
    particleSystem,
    trailLines,
    update,
    getVentMeshes,
    getTopPosition
  };
};

const createVentChimney = (): THREE.Group => {
  const ventGroup = new THREE.Group();

  const mainChimney = createIrregularCone(8, 3, 2.5, 8, 0.15);
  mainChimney.position.y = 4;
  ventGroup.add(mainChimney);

  const chimney2 = createIrregularCone(5.5, 2, 1.2, 7, 0.12);
  chimney2.position.set(-3.5, 2.75, 2);
  chimney2.rotation.z = 0.15;
  chimney2.rotation.x = -0.1;
  ventGroup.add(chimney2);

  const chimney3 = createIrregularCone(4.5, 1.5, 1, 6, 0.18);
  chimney3.position.set(3, 2.25, -1.5);
  chimney3.rotation.z = -0.1;
  chimney3.rotation.x = 0.12;
  ventGroup.add(chimney3);

  const baseGeometry = new THREE.CylinderGeometry(8, 10, 2, 24, 4);
  const basePositions = baseGeometry.attributes.position.array as Float32Array;
  for (let i = 0; i < basePositions.length; i += 3) {
    basePositions[i] += (Math.random() - 0.5) * 0.5;
    basePositions[i + 1] += (Math.random() - 0.5) * 0.2;
    basePositions[i + 2] += (Math.random() - 0.5) * 0.5;
  }
  baseGeometry.computeVertexNormals();

  const base = new THREE.Mesh(baseGeometry, createChimneyMaterial(0.8));
  base.position.y = 1;
  ventGroup.add(base);

  addCrackDetails(ventGroup);
  addTopGlow(ventGroup);

  return ventGroup;
};

const createIrregularCone = (
  height: number,
  bottomRadius: number,
  topRadius: number,
  segments: number,
  irregularity: number
): THREE.Mesh => {
  const geometry = new THREE.ConeGeometry(1, 1, segments, 4, false);
  const positions = geometry.attributes.position.array as Float32Array;

  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1] + 0.5;
    const radius = bottomRadius + (topRadius - bottomRadius) * y;
    const angleNoise = (Math.sin(y * 12.9898) * 43758.5453 % 1) * irregularity;

    positions[i] *= radius * (1 + angleNoise);
    positions[i + 2] *= radius * (1 - angleNoise * 0.7);
    positions[i + 1] = positions[i + 1] * height;

    if (y < 0.95 && y > 0.05) {
      positions[i] += (Math.random() - 0.5) * irregularity * 0.5;
      positions[i + 2] += (Math.random() - 0.5) * irregularity * 0.5;
    }
  }

  geometry.computeVertexNormals();

  const material = createChimneyMaterial(1);
  return new THREE.Mesh(geometry, material);
};

const createChimneyMaterial = (scale: number): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.58, 0.15, 0.12 * scale),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: false
  });
};

const addCrackDetails = (group: THREE.Group): void => {
  const crackMaterial = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    transparent: true,
    opacity: 0.4
  });

  for (let i = 0; i < 5; i++) {
    const crackGeo = new THREE.BoxGeometry(0.08, 1.5 + Math.random() * 2, 0.08);
    const crack = new THREE.Mesh(crackGeo, crackMaterial.clone());
    crack.material.opacity = 0.2 + Math.random() * 0.3;
    crack.position.set(
      (Math.random() - 0.5) * 5,
      1 + Math.random() * 5,
      (Math.random() - 0.5) * 5
    );
    crack.rotation.set(
      Math.random() * 0.3 - 0.15,
      Math.random() * Math.PI,
      Math.random() * 0.4 - 0.2
    );
    group.add(crack);
  }
};

const addTopGlow = (group: THREE.Group): void => {
  const glowGeo = new THREE.SphereGeometry(1.5, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff4500,
    transparent: true,
    opacity: 0.3
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 8.5;
  group.add(glow);

  const innerGlow = new THREE.PointLight(0xff6600, 1.5, 30, 1.5);
  innerGlow.position.y = 9;
  group.add(innerGlow);
};

const createParticleSystem = (): { points: THREE.Points; geometry: THREE.BufferGeometry } => {
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const sizes = new Float32Array(MAX_PARTICLES);
  const alphas = new Float32Array(MAX_PARTICLES);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: createParticleTexture() }
    },
    vertexShader: `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        if (texColor.a < 0.05) discard;
        gl_FragColor = vec4(vColor, vAlpha) * texColor;
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return { points, geometry };
};

const createTrailSystem = (): { line: THREE.LineSegments; geometry: THREE.BufferGeometry } => {
  const geometry = new THREE.BufferGeometry();
  const maxTrailSegments = MAX_PARTICLES * MAX_TRAIL_LENGTH;

  const positions = new Float32Array(maxTrailSegments * 6);
  const colors = new Float32Array(maxTrailSegments * 6);

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const line = new THREE.LineSegments(geometry, material);
  line.frustumCulled = false;

  return { line, geometry };
};

const createParticleTexture = (): THREE.Texture => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};
