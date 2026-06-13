import * as THREE from 'three';
import { POLE_COLORS, getPoleRopePoints, POLE_POSITIONS } from './sceneSetup';

const FLAG_DARK_VARIANTS: Record<number, number> = {
  0xff3333: 0xcc0000,
  0xff9933: 0xcc6600,
  0xffdd00: 0xccaa00,
  0x33cc33: 0x008800,
  0x3399ff: 0x0066cc
};

const FLAG_LIGHT_VARIANTS: Record<number, number> = {
  0xff3333: 0xff8888,
  0xff9933: 0xffcc88,
  0xffdd00: 0xffee66,
  0x33cc33: 0x88ee88,
  0x3399ff: 0x88bbff
};

interface FlagData {
  mesh: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  originalPositions: Float32Array;
  basePosition: THREE.Vector3;
  phase: number;
  amplitude: number;
  period: number;
  length: number;
  colorGroup: number;
  swayAmount: number;
  baseAngle: number;
}

export interface PrayerFlagsSystem {
  flagsGroup: THREE.Group;
  update: (delta: number, windDirection: number, mousePressed: boolean) => void;
  setWindDirection: (dir: number) => void;
  getFlagsCount: () => number;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createFlagMaterial(darkColor: number, lightColor: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      darkColor: { value: new THREE.Color(darkColor) },
      lightColor: { value: new THREE.Color(lightColor) },
      time: { value: 0 },
      opacity: { value: 0.92 }
    },
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 darkColor;
      uniform vec3 lightColor;
      uniform float opacity;
      varying vec2 vUv;
      void main() {
        float t = vUv.y;
        vec3 color = mix(lightColor, darkColor, t);
        float edge = smoothstep(0.0, 0.02, vUv.x) * smoothstep(1.0, 0.98, vUv.x);
        edge *= smoothstep(0.0, 0.02, vUv.y) * smoothstep(1.0, 0.98, vUv.y);
        float alpha = opacity * (0.85 + 0.15 * edge);
        float pattern = sin(vUv.x * 30.0 + vUv.y * 10.0) * 0.03;
        color += pattern;
        gl_FragColor = vec4(color, alpha);
      }
    `
  });
}

export function createPrayerFlags(poleTopPositions: THREE.Vector3[]): PrayerFlagsSystem {
  const flagsGroup = new THREE.Group();
  flagsGroup.name = 'prayerFlags';

  const flagsData: FlagData[] = [];
  const ropeSets = getPoleRopePoints(poleTopPositions);

  const flagsPerRope = [12, 13, 13, 12];
  let totalFlags = 0;

  ropeSets.forEach((ropePoints, ropeIndex) => {
    const numFlags = flagsPerRope[ropeIndex];

    for (let f = 0; f < numFlags; f++) {
      totalFlags++;

      const t = (f + 0.5) / numFlags;
      const segmentT = t * (ropePoints.length - 1);
      const idx = Math.floor(segmentT);
      const frac = segmentT - idx;

      const p1 = ropePoints[Math.min(idx, ropePoints.length - 1)];
      const p2 = ropePoints[Math.min(idx + 1, ropePoints.length - 1)];

      const anchorX = p1.x + (p2.x - p1.x) * frac;
      const anchorY = p1.y + (p2.y - p1.y) * frac;
      const anchorZ = p1.z + (p2.z - p1.z) * frac;

      const colorGroupIndex = (ropeIndex + Math.floor(f / 3)) % POLE_COLORS.length;
      const mainColor = POLE_COLORS[colorGroupIndex];
      const darkColor = FLAG_DARK_VARIANTS[mainColor];
      const lightColor = FLAG_LIGHT_VARIANTS[mainColor];

      const distFromCenter = Math.abs(anchorX) / 12;
      const flagLength = 0.8 + (1 - distFromCenter) * 1.2;
      const flagWidth = 0.1;

      const widthSegs = 2;
      const heightSegs = 16;
      const geometry = new THREE.PlaneGeometry(flagWidth, flagLength, widthSegs, heightSegs);

      const positions = geometry.attributes.position;
      const originalPositions = new Float32Array(positions.array);

      const material = createFlagMaterial(darkColor, lightColor);
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(anchorX, anchorY - flagLength / 2, anchorZ);

      const period = 0.8 + distFromCenter * 0.7;
      const phase = Math.random() * Math.PI * 2;
      const amplitude = 0.15 + Math.random() * 0.15;

      flagsData.push({
        mesh,
        geometry,
        originalPositions,
        basePosition: new THREE.Vector3(anchorX, anchorY, anchorZ),
        phase,
        amplitude,
        period,
        length: flagLength,
        colorGroup: colorGroupIndex,
        swayAmount: 0,
        baseAngle: (Math.random() - 0.5) * 0.1
      });

      flagsGroup.add(mesh);
    }
  });

  let elapsedTime = 0;
  let currentWindDir = 0;
  let targetWindDir = 0;
  let windTransitionProgress = 1;
  let pressTimer = 0;
  const pressFreezeDuration = 0.5;
  let previousMousePressed = false;

  function setWindDirection(dir: number) {
    const clamped = Math.max(-35, Math.min(35, dir));
    if (Math.abs(clamped - targetWindDir) > 0.1) {
      targetWindDir = clamped;
      windTransitionProgress = 0;
    }
  }

  function update(delta: number, windDirection: number, mousePressed: boolean) {
    elapsedTime += delta;

    if (mousePressed && !previousMousePressed) {
      pressTimer = pressFreezeDuration;
    }
    previousMousePressed = mousePressed;

    const isFrozen = pressTimer > 0;
    if (isFrozen) {
      pressTimer = Math.max(0, pressTimer - delta);
    }
    const freezeFactor = isFrozen ? easeInOutQuad(1 - pressTimer / pressFreezeDuration) : 1;

    setWindDirection(windDirection);

    if (windTransitionProgress < 1) {
      windTransitionProgress = Math.min(1, windTransitionProgress + delta * 2.5);
    }
    const easeProgress = easeInOutQuad(windTransitionProgress);
    currentWindDir = currentWindDir + (targetWindDir - currentWindDir) * easeProgress * 0.1;

    const windRad = THREE.MathUtils.degToRad(currentWindDir);

    flagsData.forEach((flag, idx) => {
      const positions = flag.geometry.attributes.position;
      const arr = positions.array as Float32Array;

      const speedFactor = 1 / flag.period;
      const wavePhase = elapsedTime * Math.PI * 2 * speedFactor + flag.phase;

      for (let i = 0; i < positions.count; i++) {
        const ox = flag.originalPositions[i * 3];
        const oy = flag.originalPositions[i * 3 + 1];
        const oz = flag.originalPositions[i * 3 + 2];

        const normalizedY = (oy + flag.length / 2) / flag.length;

        const baseWave = Math.sin(wavePhase + normalizedY * 4) * flag.amplitude * normalizedY * normalizedY;
        const secondaryWave = Math.sin(wavePhase * 1.7 + normalizedY * 6 + idx * 0.3) * flag.amplitude * 0.4 * normalizedY;

        const windEffectX = Math.sin(windRad) * normalizedY * normalizedY * flag.length * 0.35;
        const windEffectZ = -Math.cos(windRad) * normalizedY * normalizedY * flag.length * 0.35;

        const turbulence = Math.sin(elapsedTime * 3 + idx * 0.7 + normalizedY * 8) * 0.02 * normalizedY;

        arr[i * 3] = ox + (baseWave + secondaryWave) * Math.sin(windRad) * 0.5 + windEffectX * 0.3 + turbulence;
        arr[i * 3 + 2] = oz + (baseWave + secondaryWave) * Math.cos(windRad) * 0.5 + windEffectZ * 0.3 - turbulence * 0.5;

        if (freezeFactor < 1) {
          const frozenOx = arr[i * 3];
          const frozenOz = arr[i * 3 + 2];
          arr[i * 3] = ox + (frozenOx - ox) * freezeFactor;
          arr[i * 3 + 2] = oz + (frozenOz - oz) * freezeFactor;
        }
      }

      positions.needsUpdate = true;
      flag.geometry.computeVertexNormals();

      const mat = flag.mesh.material as THREE.ShaderMaterial;
      if (mat.uniforms && mat.uniforms.time) {
        mat.uniforms.time.value = elapsedTime;
      }
    });
  }

  return {
    flagsGroup,
    update,
    setWindDirection,
    getFlagsCount: () => totalFlags
  };
}
