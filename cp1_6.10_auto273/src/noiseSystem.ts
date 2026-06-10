import * as THREE from 'three';
import { NoiseSourceData, getNoiseColor, getTimeFactor } from './cityBuilder';

const MAX_PARTICLES = 1000;
const MAX_RADIUS = 8;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  birthTime: number;
  lifetime: number;
  sourceIndex: number;
  size: number;
  alpha: number;
}

export interface NoiseSystem {
  group: THREE.Group;
  particles: Particle[];
  sources: NoiseSourceData[];
  particleSystem: THREE.Points;
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  lastEmitTime: number[];
  trailSystem: THREE.Points;
  trailGeometry: THREE.BufferGeometry;
  trailPositions: Float32Array;
  trailColors: Float32Array;
}

function createParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createNoiseSystem(
  scene: THREE.Scene,
  noiseSources: NoiseSourceData[]
): NoiseSystem {
  const group = new THREE.Group();
  group.name = 'noiseSystem';

  const particles: Particle[] = [];

  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const sizes = new Float32Array(MAX_PARTICLES);
  const alphas = new Float32Array(MAX_PARTICLES);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const particleTexture = createParticleTexture();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: particleTexture },
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
      uniform sampler2D uTexture;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, texColor.a * vAlpha);
        if (gl_FragColor.a < 0.01) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const particleSystem = new THREE.Points(geometry, material);
  particleSystem.frustumCulled = false;
  group.add(particleSystem);

  const trailCount = MAX_PARTICLES * 2;
  const trailPositions = new Float32Array(trailCount * 3);
  const trailColors = new Float32Array(trailCount * 3);

  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

  const trailMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: particleTexture },
    },
    vertexShader: `
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 8.0 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      varying vec3 vColor;
      void main() {
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, texColor.a * 0.3);
        if (gl_FragColor.a < 0.01) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const trailSystem = new THREE.Points(trailGeometry, trailMaterial);
  trailSystem.frustumCulled = false;
  group.add(trailSystem);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = -1000;
    positions[i * 3 + 2] = 0;
    sizes[i] = 0;
    alphas[i] = 0;
  }

  geometry.setDrawRange(0, 0);
  trailGeometry.setDrawRange(0, 0);

  scene.add(group);

  return {
    group,
    particles,
    sources: noiseSources,
    particleSystem,
    geometry,
    positions,
    colors,
    sizes,
    lastEmitTime: new Array(noiseSources.length).fill(0),
    trailSystem,
    trailGeometry,
    trailPositions,
    trailColors,
  };
}

function emitParticle(
  system: NoiseSystem,
  sourceIndex: number,
  time: number,
  intensityMultiplier: number
): void {
  if (system.particles.length >= MAX_PARTICLES) {
    system.particles.shift();
  }

  const source = system.sources[sourceIndex];
  const speed = (0.2 + Math.random() * 0.6) * intensityMultiplier;
  const angle = Math.random() * Math.PI * 2;
  const verticalBias = (Math.random() - 0.3) * 0.5;

  const velocity = new THREE.Vector3(
    Math.cos(angle) * speed,
    verticalBias * speed + 0.15,
    Math.sin(angle) * speed
  );

  const position = new THREE.Vector3(
    source.position.x + (Math.random() - 0.5) * 0.5,
    0.5 + Math.random() * 2,
    source.position.y + (Math.random() - 0.5) * 0.5
  );

  const lifetime = 3 + Math.random() * 4;
  const size = (0.15 + (source.baseIntensity / 100) * 0.35) * intensityMultiplier;

  system.particles.push({
    position,
    velocity,
    birthTime: time,
    lifetime,
    sourceIndex,
    size,
    alpha: 0.8,
  });
}

export function updateNoise(
  system: NoiseSystem,
  currentTime: number,
  deltaTime: number,
  timeOfDay: number
): void {
  const timeFactor = getTimeFactor(timeOfDay);
  const emitRate = 30 + timeFactor * 20;

  for (let i = 0; i < system.sources.length; i++) {
    const timeSinceLastEmit = currentTime - system.lastEmitTime[i];
    const emitInterval = 1 / emitRate;

    while (timeSinceLastEmit > emitInterval) {
      emitParticle(system, i, currentTime - (timeSinceLastEmit - emitInterval), Math.max(0.3, timeFactor));
      system.lastEmitTime[i] += emitInterval;
      break;
    }
  }

  const aliveParticles: Particle[] = [];

  for (const particle of system.particles) {
    const age = currentTime - particle.birthTime;
    if (age >= particle.lifetime) continue;

    const source = system.sources[particle.sourceIndex];
    const dx = particle.position.x - source.position.x;
    const dz = particle.position.z - source.position.y;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance >= MAX_RADIUS) {
      particle.alpha -= deltaTime * 2;
      if (particle.alpha <= 0) continue;
    } else {
      particle.velocity.x += (Math.random() - 0.5) * 0.3 * deltaTime;
      particle.velocity.z += (Math.random() - 0.5) * 0.3 * deltaTime;
      particle.velocity.y += (Math.random() - 0.5) * 0.15 * deltaTime;

      particle.velocity.y -= 0.05 * deltaTime;

      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;
    }

    aliveParticles.push(particle);
  }

  system.particles.length = 0;
  system.particles.push(...aliveParticles);

  const count = system.particles.length;
  const trailCount = Math.min(count * 2, MAX_PARTICLES * 2);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (i < count) {
      const p = system.particles[i];
      const age = currentTime - p.birthTime;
      const lifeRatio = age / p.lifetime;
      const source = system.sources[p.sourceIndex];

      const dx = p.position.x - source.position.x;
      const dz = p.position.z - source.position.y;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const distRatio = Math.min(1, dist / MAX_RADIUS);

      const color = getNoiseColor(source.baseIntensity * (1 - distRatio * 0.3));
      const alpha = Math.max(0, p.alpha * (1 - lifeRatio * 0.7) * (1 - distRatio * 0.4));

      system.positions[i * 3] = p.position.x;
      system.positions[i * 3 + 1] = p.position.y;
      system.positions[i * 3 + 2] = p.position.z;
      system.colors[i * 3] = color.r;
      system.colors[i * 3 + 1] = color.g;
      system.colors[i * 3 + 2] = color.b;
      system.sizes[i] = p.size * (1 - lifeRatio * 0.5);
      (system.geometry.attributes.alpha as THREE.BufferAttribute).array[i] = alpha;

      if (i * 2 < trailCount) {
        const trailOffset = 0.08;
        system.trailPositions[i * 6] = p.position.x - p.velocity.x * trailOffset;
        system.trailPositions[i * 6 + 1] = p.position.y - p.velocity.y * trailOffset;
        system.trailPositions[i * 6 + 2] = p.position.z - p.velocity.z * trailOffset;
        system.trailColors[i * 6] = color.r;
        system.trailColors[i * 6 + 1] = color.g;
        system.trailColors[i * 6 + 2] = color.b;

        system.trailPositions[i * 6 + 3] = p.position.x - p.velocity.x * trailOffset * 2;
        system.trailPositions[i * 6 + 4] = p.position.y - p.velocity.y * trailOffset * 2;
        system.trailPositions[i * 6 + 5] = p.position.z - p.velocity.z * trailOffset * 2;
        system.trailColors[i * 6 + 3] = color.r * 0.7;
        system.trailColors[i * 6 + 4] = color.g * 0.7;
        system.trailColors[i * 6 + 5] = color.b * 0.7;
      }
    } else {
      system.positions[i * 3 + 1] = -1000;
      system.sizes[i] = 0;
    }
  }

  system.geometry.attributes.position.needsUpdate = true;
  system.geometry.attributes.color.needsUpdate = true;
  system.geometry.attributes.size.needsUpdate = true;
  system.geometry.attributes.alpha.needsUpdate = true;
  system.geometry.setDrawRange(0, count);

  system.trailGeometry.attributes.position.needsUpdate = true;
  system.trailGeometry.attributes.color.needsUpdate = true;
  system.trailGeometry.setDrawRange(0, trailCount);
}
