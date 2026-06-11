import * as THREE from 'three';

interface AuroraBand {
  particles: THREE.Points;
  basePositions: Float32Array;
  colors: Float32Array;
  opacities: Float32Array;
  phase: number;
  amplitude: number;
  frequency: number;
  centerX: number;
  centerZ: number;
  length: number;
  rotation: number;
  pulsePeriod: number;
  pulsePhase: number;
}

interface AuroraResult {
  group: THREE.Group;
  update: (time: number, brightness: number) => void;
}

function lerpColorRGB(c1: THREE.Color, c2: THREE.Color, t: number, out: THREE.Color): THREE.Color {
  out.r = c1.r + (c2.r - c1.r) * t;
  out.g = c1.g + (c2.g - c1.g) * t;
  out.b = c1.b + (c2.b - c1.b) * t;
  return out;
}

function makeParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createAurora(): AuroraResult {
  const group = new THREE.Group();
  const bands: AuroraBand[] = [];

  const numBands = 4;
  const particlesPerBand = 250;
  const tex = makeParticleTexture();

  const cGreen = new THREE.Color('#7fff00');
  const cPurple = new THREE.Color('#dda0dd');
  const cBlue = new THREE.Color('#87ceeb');

  for (let b = 0; b < numBands; b++) {
    const positions = new Float32Array(particlesPerBand * 3);
    const colors = new Float32Array(particlesPerBand * 3);
    const opacities = new Float32Array(particlesPerBand);
    const basePositions = new Float32Array(particlesPerBand * 3);

    const bandLength = 220 + Math.random() * 120;
    const centerX = (Math.random() - 0.5) * 120;
    const centerZ = (Math.random() - 0.5) * 80 - 40;
    const baseY = 90 + Math.random() * 40;
    const bandWidth = 18 + Math.random() * 12;
    const rotation = (Math.random() - 0.5) * Math.PI * 0.6;

    const amp = 12 + Math.random() * 18;
    const freq = 0.015 + Math.random() * 0.02;

    const phase = Math.random() * Math.PI * 2;
    const pulsePeriod = 5 + Math.random() * 3;
    const pulsePhase = Math.random() * Math.PI * 2;

    const colorMixStart = Math.random();

    const tmpColor = new THREE.Color();

    for (let i = 0; i < particlesPerBand; i++) {
      const t = i / (particlesPerBand - 1);
      const px = (t - 0.5) * bandLength;
      const pz = (Math.random() - 0.5) * bandWidth;
      const py = (Math.random() - 0.5) * 6;

      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const rx = px * cosR - pz * sinR + centerX;
      const rz = px * sinR + pz * cosR + centerZ;
      const ry = py + baseY + Math.sin(t * Math.PI) * 15;

      positions[i * 3] = rx;
      positions[i * 3 + 1] = ry;
      positions[i * 3 + 2] = rz;

      basePositions[i * 3] = rx;
      basePositions[i * 3 + 1] = ry;
      basePositions[i * 3 + 2] = rz;

      let colorT = (t + colorMixStart * 0.3) % 1;
      if (colorT < 0.5) {
        lerpColorRGB(cGreen, cPurple, colorT * 2, tmpColor);
      } else {
        lerpColorRGB(cPurple, cBlue, (colorT - 0.5) * 2, tmpColor);
      }
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;

      opacities[i] = 0.1 + Math.random() * 0.4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      map: tex,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    bands.push({
      particles: points,
      basePositions,
      colors,
      opacities,
      phase,
      amplitude: amp,
      frequency: freq,
      centerX,
      centerZ,
      length: bandLength,
      rotation,
      pulsePeriod,
      pulsePhase
    });
  }

  function update(time: number, brightness: number): void {
    for (let b = 0; b < bands.length; b++) {
      const band = bands[b];
      const pos = band.particles.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      const pulseT = 0.5 + 0.5 * Math.sin(time * (Math.PI * 2 / band.pulsePeriod) + band.pulsePhase);
      const pulseAlpha = 0.3 + pulseT * 0.5;
      const mat = band.particles.material as THREE.PointsMaterial;
      mat.opacity = 0.3 + pulseAlpha * 0.5 * brightness;

      for (let i = 0; i < particlesPerBand; i++) {
        const t = i / (particlesPerBand - 1);
        const bx = band.basePositions[i * 3];
        const by = band.basePositions[i * 3 + 1];
        const bz = band.basePositions[i * 3 + 2];

        const wave1 = Math.sin(time * 0.8 + t * band.length * band.frequency + band.phase) * band.amplitude;
        const wave2 = Math.sin(time * 0.45 + t * band.length * band.frequency * 1.7 + band.phase * 1.3) * band.amplitude * 0.5;
        const wave3 = Math.cos(time * 0.6 + t * band.length * band.frequency * 0.6 + band.phase * 0.7) * band.amplitude * 0.35;

        const perpX = Math.sin(band.rotation);
        const perpZ = -Math.cos(band.rotation);

        arr[i * 3] = bx + perpX * (wave1 + wave2 * 0.5);
        arr[i * 3 + 1] = by + wave2 * 0.6 + wave3 * 0.4;
        arr[i * 3 + 2] = bz + perpZ * (wave1 + wave2 * 0.5);
      }
      pos.needsUpdate = true;
    }
  }

  return { group, update };
}
