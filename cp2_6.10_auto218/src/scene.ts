import * as THREE from 'three';
import {
  AsteroidData,
  ParticleData,
  SPECTRAL_COLORS,
  MAJOR_ASTEROIDS,
  BACKGROUND_PARTICLE_COUNT,
  generateBackgroundParticles
} from './data';

const DEG2RAD = Math.PI / 180;
const SCALE_FACTOR = 50;
const CERES_RADIUS_PX = 25;
const CERES_DIAMETER_KM = 939.4;

function solveKepler(M: number, e: number, tolerance: number = 1e-6): number {
  let E = M;
  for (let i = 0; i < 100; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

function getOrbitalPosition(
  a: number,
  e: number,
  inc: number,
  node: number,
  peri: number,
  M: number
): THREE.Vector3 {
  const E = solveKepler(M, e);
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );

  const r = a * (1 - e * Math.cos(E));
  const xOrbit = r * Math.cos(trueAnomaly);
  const yOrbit = r * Math.sin(trueAnomaly);

  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosPeri = Math.cos(peri);
  const sinPeri = Math.sin(peri);
  const cosInc = Math.cos(inc);
  const sinInc = Math.sin(inc);

  const x = (cosNode * cosPeri - sinNode * sinPeri * cosInc) * xOrbit
    + (-cosNode * sinPeri - sinNode * cosPeri * cosInc) * yOrbit;
  const y = (sinNode * cosPeri + cosNode * sinPeri * cosInc) * xOrbit
    + (-sinNode * sinPeri + cosNode * cosPeri * cosInc) * yOrbit;
  const z = (sinPeri * sinInc) * xOrbit + (cosPeri * sinInc) * yOrbit;

  return new THREE.Vector3(x * SCALE_FACTOR, z * SCALE_FACTOR, y * SCALE_FACTOR);
}

interface AsteroidObject {
  data: AsteroidData;
  mesh: THREE.Mesh;
  orbitLine: THREE.Line;
  orbitPoints: THREE.Vector3[];
}

export interface SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  raycaster: THREE.Raycaster;
  asteroidMeshes: THREE.Mesh[];
  init(container: HTMLElement): void;
  update(timeYears: number): void;
  onResize(): void;
  selectAsteroid(id: string | null): void;
  getAsteroidAtIntersection(intersects: THREE.Intersection[]): AsteroidData | null;
  dispose(): void;
}

export function createSceneManager(): SceneManager {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let raycaster: THREE.Raycaster;
  let asteroids: AsteroidObject[] = [];
  let asteroidMeshes: THREE.Mesh[] = [];
  let backgroundParticles: THREE.Points;
  let particleData: ParticleData[];
  let particlePositions: Float32Array;
  let selectedId: string | null = null;

  function init(container: HTMLElement): void {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000);
    camera.position.set(0, 180, 220);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();

    createSun();
    createStars();
    createAsteroidBeltParticles();
    createMajorAsteroids();
    addLighting();
  }

  function createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(15, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    const glowGeometry = new THREE.SphereGeometry(22, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.4 },
        p: { value: 4.0 },
        glowColor: { value: new THREE.Color(0xffaa00) },
        viewVector: { value: camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.8);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(sunGlow);

    const pointLight = new THREE.PointLight(0xffffff, 2, 2000, 0.5);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    scene.add(ambientLight);
  }

  function createStars(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 1500 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const shade = 0.7 + Math.random() * 0.3;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade;
      colors[i * 3 + 2] = shade;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  function createAsteroidBeltParticles(): void {
    particleData = generateBackgroundParticles(BACKGROUND_PARTICLE_COUNT);
    particlePositions = new Float32Array(BACKGROUND_PARTICLE_COUNT * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xaaaaaa,
      size: 0.8,
      transparent: true,
      opacity: 0.2,
      sizeAttenuation: true
    });

    backgroundParticles = new THREE.Points(geometry, material);
    scene.add(backgroundParticles);

    for (let i = 0; i < BACKGROUND_PARTICLE_COUNT; i++) {
      const p = particleData[i];
      const M = p.meanAnomaly0 * DEG2RAD;
      const pos = getOrbitalPosition(
        p.semiMajorAxis,
        p.eccentricity,
        p.inclination * DEG2RAD,
        p.ascendingNode * DEG2RAD,
        p.perihelionArg * DEG2RAD,
        M
      );
      particlePositions[i * 3] = pos.x;
      particlePositions[i * 3 + 1] = pos.y;
      particlePositions[i * 3 + 2] = pos.z;
    }
    (backgroundParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  function createMajorAsteroids(): void {
    for (const data of MAJOR_ASTEROIDS) {
      const color = SPECTRAL_COLORS[data.spectralType];
      const radius = CERES_RADIUS_PX * (data.diameter / CERES_DIAMETER_KM);

      const geometry = new THREE.SphereGeometry(Math.max(radius, 3), 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.85,
        metalness: 0.1,
        flatShading: true
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.asteroidId = data.id;
      mesh.userData.asteroidData = data;
      scene.add(mesh);

      const orbitPoints = generateOrbitPoints(data);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitColor = new THREE.Color(color);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: orbitColor,
        transparent: true,
        opacity: 0.3
      });
      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
      scene.add(orbitLine);

      highlightOrbitEnds(orbitLine, data);

      asteroids.push({ data, mesh, orbitLine, orbitPoints });
      asteroidMeshes.push(mesh);
    }
  }

  function generateOrbitPoints(data: AsteroidData): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const M = (i / segments) * Math.PI * 2;
      points.push(getOrbitalPosition(
        data.semiMajorAxis,
        data.eccentricity,
        data.inclination * DEG2RAD,
        data.ascendingNode * DEG2RAD,
        data.perihelionArg * DEG2RAD,
        M
      ));
    }
    return points;
  }

  function highlightOrbitEnds(orbitLine: THREE.Line, data: AsteroidData): void {
    const positions = orbitLine.geometry.attributes.position.array as Float32Array;
    const colorAttr = new Float32Array(positions.length);
    const baseColor = new THREE.Color(SPECTRAL_COLORS[data.spectralType]);
    const highlightColor = baseColor.clone().multiplyScalar(1.8);

    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;
      const M = (i / 200) * Math.PI * 2;
      const E = solveKepler(M, data.eccentricity);
      const r = data.semiMajorAxis * (1 - data.eccentricity * Math.cos(E));
      const perihelion = data.semiMajorAxis * (1 - data.eccentricity);
      const aphelion = data.semiMajorAxis * (1 + data.eccentricity);

      let factor = 0.3;
      const periDist = Math.abs(r - perihelion);
      const apDist = Math.abs(r - aphelion);
      const threshold = data.semiMajorAxis * 0.1;

      if (periDist < threshold) {
        factor = 0.3 + 0.7 * (1 - periDist / threshold);
      } else if (apDist < threshold) {
        factor = 0.3 + 0.7 * (1 - apDist / threshold);
      }

      const c = baseColor.clone().lerp(highlightColor, factor * 0.5);
      colorAttr[idx] = c.r;
      colorAttr[idx + 1] = c.g;
      colorAttr[idx + 2] = c.b;
    }

    orbitLine.geometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    (orbitLine.material as THREE.LineBasicMaterial).vertexColors = true;
    (orbitLine.material as THREE.LineBasicMaterial).needsUpdate = true;
  }

  function addLighting(): void {
    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.15);
    fillLight.position.set(50, 100, 50);
    scene.add(fillLight);
  }

  function update(timeYears: number): void {
    for (const ast of asteroids) {
      const period = ast.data.orbitalPeriod;
      const M = ast.data.meanAnomaly0 * DEG2RAD + (timeYears / period) * Math.PI * 2;
      const pos = getOrbitalPosition(
        ast.data.semiMajorAxis,
        ast.data.eccentricity,
        ast.data.inclination * DEG2RAD,
        ast.data.ascendingNode * DEG2RAD,
        ast.data.perihelionArg * DEG2RAD,
        M
      );
      ast.mesh.position.copy(pos);
      ast.mesh.rotation.y += 0.01;
    }

    for (let i = 0; i < BACKGROUND_PARTICLE_COUNT; i++) {
      const p = particleData[i];
      const period = Math.pow(p.semiMajorAxis, 1.5);
      const M = p.meanAnomaly0 * DEG2RAD + (timeYears / period) * Math.PI * 2;
      const pos = getOrbitalPosition(
        p.semiMajorAxis,
        p.eccentricity,
        p.inclination * DEG2RAD,
        p.ascendingNode * DEG2RAD,
        p.perihelionArg * DEG2RAD,
        M
      );
      particlePositions[i * 3] = pos.x;
      particlePositions[i * 3 + 1] = pos.y;
      particlePositions[i * 3 + 2] = pos.z;
    }
    (backgroundParticles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  function onResize(): void {
    if (!renderer || !camera) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function selectAsteroid(id: string | null): void {
    selectedId = id;
    for (const ast of asteroids) {
      const isSelected = ast.data.id === id;
      const mat = ast.mesh.material as THREE.MeshStandardMaterial;

      if (id === null) {
        mat.opacity = 1.0;
        mat.transparent = false;
        (ast.orbitLine.material as THREE.LineBasicMaterial).opacity = 0.3;
        (ast.orbitLine.material as THREE.LineBasicMaterial).linewidth = 1;
      } else if (isSelected) {
        mat.opacity = 1.0;
        mat.transparent = false;
        mat.emissive = new THREE.Color(SPECTRAL_COLORS[ast.data.spectralType]).multiplyScalar(0.3);
        (ast.orbitLine.material as THREE.LineBasicMaterial).opacity = 1.0;
        (ast.orbitLine.material as THREE.LineBasicMaterial).color = new THREE.Color(SPECTRAL_COLORS[ast.data.spectralType]).multiplyScalar(1.5);
      } else {
        mat.opacity = 0.5;
        mat.transparent = true;
        mat.emissive = new THREE.Color(0x000000);
        (ast.orbitLine.material as THREE.LineBasicMaterial).opacity = 0.15;
      }
      mat.needsUpdate = true;
      (ast.orbitLine.material as THREE.LineBasicMaterial).needsUpdate = true;
    }
  }

  function getAsteroidAtIntersection(intersects: THREE.Intersection[]): AsteroidData | null {
    for (const intersect of intersects) {
      if (intersect.object && intersect.object.userData && intersect.object.userData.asteroidData) {
        return intersect.object.userData.asteroidData as AsteroidData;
      }
    }
    return null;
  }

  function dispose(): void {
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    }
  }

  return {
    get scene() { return scene!; },
    get camera() { return camera!; },
    get renderer() { return renderer!; },
    get raycaster() { return raycaster!; },
    get asteroidMeshes() { return asteroidMeshes; },
    init,
    update,
    onResize,
    selectAsteroid,
    getAsteroidAtIntersection,
    dispose
  };
}
