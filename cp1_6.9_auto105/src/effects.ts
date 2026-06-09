import * as THREE from 'three';
import { AppState } from './main';
import { sceneElements } from './sceneBuilder';

export interface LightBeamAPI {
  update: (elapsed: number) => void;
  updateMousePosition: (x: number, y: number, w: number, h: number) => void;
  getIntensity: () => number;
  reset: () => void;
}

export interface FishSchoolAPI {
  update: (elapsed: number, delta: number) => void;
}

export interface InteractionAPI {
  update: (elapsed: number, delta: number) => void;
}

interface Fish {
  mesh: THREE.Mesh;
  progress: number;
  speed: number;
  path: THREE.Vector3[];
  color: THREE.Color;
  wiggleOffset: number;
  particles: THREE.Points;
}

interface InteractionPoint {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  active: boolean;
  columnIndex: number;
  triggered: boolean;
}

interface GhostAnimation {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

interface LightBeamParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const CONFIG = {
  FISH_COUNT: 50,
  PARTICLES_PER_FISH: 5,
  BEAM_LENGTH: 40,
  BEAM_HALF_ANGLE: 15,
  INTERACTION_POINT_COUNT: 6
};

function generateBezierPath(center: THREE.Vector3, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const controlPoints = 8;
  for (let i = 0; i < controlPoints; i++) {
    const angle = (i / controlPoints) * Math.PI * 2 + Math.random() * 0.5;
    const r = radius + (Math.random() - 0.5) * 6;
    const height = Math.random() * 6 + 1;
    points.push(new THREE.Vector3(
      center.x + Math.cos(angle) * r,
      height,
      center.z + Math.sin(angle) * r
    ));
  }
  return points;
}

function cubicBezier(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return new THREE.Vector3(
    mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
  );
}

function evaluateBezierPath(progress: number, path: THREE.Vector3[]): THREE.Vector3 {
  const n = path.length;
  const t = (progress * n) % n;
  const segmentIndex = Math.floor(t);
  const localT = t - segmentIndex;
  
  const p0 = path[segmentIndex % n];
  const p1 = path[(segmentIndex + 1) % n];
  const p2 = path[(segmentIndex + 2) % n];
  const p3 = path[(segmentIndex + 3) % n];
  
  return cubicBezier(localT, p0, p1, p2, p3);
}

function evaluateBezierTangent(progress: number, path: THREE.Vector3[]): THREE.Vector3 {
  const epsilon = 0.001;
  const p1 = evaluateBezierPath(progress, path);
  const p2 = evaluateBezierPath(progress + epsilon, path);
  return new THREE.Vector3().subVectors(p2, p1).normalize();
}

export function setupLightBeam(scene: THREE.Scene, camera: THREE.PerspectiveCamera, appState: AppState): LightBeamAPI {
  const halfAngleRad = (CONFIG.BEAM_HALF_ANGLE * Math.PI) / 180;
  
  const spotLight = new THREE.SpotLight(0xffeebb, 2, CONFIG.BEAM_LENGTH, halfAngleRad, 0.4, 1.5);
  spotLight.position.copy(camera.position);
  spotLight.castShadow = false;
  scene.add(spotLight);

  const coneGeometry = new THREE.ConeGeometry(
    Math.tan(halfAngleRad) * CONFIG.BEAM_LENGTH,
    CONFIG.BEAM_LENGTH,
    32,
    1,
    true
  );
  coneGeometry.translate(0, -CONFIG.BEAM_LENGTH / 2, 0);
  coneGeometry.rotateX(-Math.PI / 2);

  const coneMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffeebb) },
      uOpacity: { value: 0.3 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vDepth = position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        float dist = distance(vUv, vec2(0.5, 0.5));
        float edge = smoothstep(0.45, 0.5, dist);
        float depthFade = smoothstep(0.0, 1.0, vDepth / 40.0);
        float alpha = (1.0 - edge) * uOpacity * (1.0 - depthFade * 0.7);
        float centerFade = smoothstep(0.0, 0.4, dist);
        vec3 finalColor = uColor * (0.8 + centerFade * 0.2);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
  coneMesh.castShadow = false;
  coneMesh.receiveShadow = false;
  scene.add(coneMesh);

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2(0, 0);
  const beamTarget = new THREE.Vector3(0, 2, 0);
  let targetBeamIntensity = 50;

  const lightBeamParticles: LightBeamParticle[] = [];
  const maxParticles = 200;
  
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(maxParticles * 3);
  const particleAlphas = new Float32Array(maxParticles);
  for (let i = 0; i < maxParticles; i++) {
    particlePositions[i * 3] = 0;
    particlePositions[i * 3 + 1] = -1000;
    particlePositions[i * 3 + 2] = 0;
    particleAlphas[i] = 0;
  }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('alpha', new THREE.BufferAttribute(particleAlphas, 1));
  particleGeometry.computeBoundingSphere();
  
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffeebb) }
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 4.0 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  particleSystem.castShadow = false;
  particleSystem.receiveShadow = false;
  scene.add(particleSystem);

  function updateMousePosition(x: number, y: number, w: number, h: number) {
    mouseNDC.x = (x / w) * 2 - 1;
    mouseNDC.y = -(y / h) * 2 + 1;
    
    const dx = Math.abs(mouseNDC.x);
    const dy = Math.abs(mouseNDC.y);
    const centerDist = Math.sqrt(dx * dx + dy * dy);
    targetBeamIntensity = Math.floor((1 - Math.min(centerDist, 1)) * 100);
  }

  function update(elapsed: number) {
    appState.beamIntensity += (targetBeamIntensity - appState.beamIntensity) * 0.1;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    
    const centerOffset = new THREE.Vector3(
      mouseNDC.x * 8,
      mouseNDC.y * 5,
      0
    );
    centerOffset.applyQuaternion(camera.quaternion);
    
    beamTarget.copy(camera.position).add(forward.multiplyScalar(CONFIG.BEAM_LENGTH * 0.6)).add(centerOffset);

    spotLight.position.copy(camera.position);
    spotLight.target.position.copy(beamTarget);
    spotLight.intensity = 1.5 + (appState.beamIntensity / 100) * 2;
    scene.add(spotLight.target);

    coneMesh.position.copy(camera.position);
    coneMesh.lookAt(beamTarget);
    coneMaterial.uniforms.uOpacity.value = 0.15 + (appState.beamIntensity / 100) * 0.35;

    const positions = particleGeometry.attributes.position.array as Float32Array;
    const alphas = particleGeometry.attributes.alpha.array as Float32Array;
    
    const beamDir = new THREE.Vector3().subVectors(beamTarget, camera.position).normalize();
    
    if (lightBeamParticles.length < maxParticles && Math.random() < 0.4) {
      const t = Math.random();
      const perpendicular = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize();
      const radius = Math.random() * Math.tan(halfAngleRad) * t * CONFIG.BEAM_LENGTH * 0.8;
      perpendicular.multiplyScalar(radius);
      
      const pos = new THREE.Vector3()
        .copy(camera.position)
        .add(beamDir.clone().multiplyScalar(t * CONFIG.BEAM_LENGTH * 0.9))
        .add(perpendicular);
      
      lightBeamParticles.push({
        position: pos,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          Math.random() * 0.03 + 0.01,
          (Math.random() - 0.5) * 0.05
        ),
        life: 1.0,
        maxLife: 1.5 + Math.random()
      });
    }

    for (let i = lightBeamParticles.length - 1; i >= 0; i--) {
      const p = lightBeamParticles[i];
      p.position.add(p.velocity);
      p.life -= 0.016;
      
      if (p.life <= 0) {
        lightBeamParticles.splice(i, 1);
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      if (i < lightBeamParticles.length) {
        const p = lightBeamParticles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
        alphas[i] = (p.life / p.maxLife) * 0.4 * (appState.beamIntensity / 100);
      } else {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -1000;
        positions[i * 3 + 2] = 0;
        alphas[i] = 0;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.alpha.needsUpdate = true;
  }

  function getIntensity(): number {
    return appState.beamIntensity;
  }

  function reset() {
    mouseNDC.set(0, 0);
    targetBeamIntensity = 50;
  }

  return { update, updateMousePosition, getIntensity, reset };
}

export function setupFishSchool(scene: THREE.Scene): FishSchoolAPI {
  const fishColors = [0xaaffbb, 0xffddaa, 0xffaacc];
  const fishes: Fish[] = [];
  const center = new THREE.Vector3(0, 2, 0);

  for (let i = 0; i < CONFIG.FISH_COUNT; i++) {
    const fishGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    fishGeometry.scale(2, 0.6, 0.8);
    
    const color = new THREE.Color(fishColors[Math.floor(Math.random() * fishColors.length)]);
    const fishMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85
    });
    
    const fish = new THREE.Mesh(fishGeometry, fishMaterial);
    fish.castShadow = false;
    fish.receiveShadow = false;
    
    const tailGeometry = new THREE.ConeGeometry(0.08, 0.15, 4);
    tailGeometry.rotateZ(Math.PI / 2);
    const tailMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7
    });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.x = -0.25;
    tail.castShadow = false;
    tail.receiveShadow = false;
    fish.add(tail);

    const path = generateBezierPath(center, 10 + Math.random() * 5);
    
    const particleCount = CONFIG.PARTICLES_PER_FISH;
    const glowGeometry = new THREE.BufferGeometry();
    const glowPositions = new Float32Array(particleCount * 3);
    const glowAlphas = new Float32Array(particleCount);
    for (let j = 0; j < particleCount; j++) {
      glowPositions[j * 3] = (Math.random() - 0.5) * 0.5;
      glowPositions[j * 3 + 1] = (Math.random() - 0.5) * 0.3;
      glowPositions[j * 3 + 2] = (Math.random() - 0.5) * 0.5;
      glowAlphas[j] = 0.3;
    }
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeometry.setAttribute('alpha', new THREE.BufferAttribute(glowAlphas, 1));
    glowGeometry.computeBoundingSphere();
    
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color.clone().multiplyScalar(1.5) }
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 6.0 * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    const glowParticles = new THREE.Points(glowGeometry, glowMaterial);
    glowParticles.castShadow = false;
    glowParticles.receiveShadow = false;

    scene.add(fish);
    scene.add(glowParticles);

    fishes.push({
      mesh: fish,
      progress: Math.random(),
      speed: 0.008 + Math.random() * 0.015,
      path: path,
      color: color,
      wiggleOffset: Math.random() * Math.PI * 2,
      particles: glowParticles
    });
  }

  function update(elapsed: number, delta: number) {
    fishes.forEach((fish) => {
      fish.progress += fish.speed;
      if (fish.progress >= 1) fish.progress -= 1;

      const pos = evaluateBezierPath(fish.progress, fish.path);
      const tangent = evaluateBezierTangent(fish.progress, fish.path);
      
      fish.mesh.position.copy(pos);
      
      const lookTarget = pos.clone().add(tangent);
      fish.mesh.lookAt(lookTarget);
      
      const wiggle = Math.sin(elapsed * 5 + fish.wiggleOffset) * 0.25;
      fish.mesh.rotateZ(wiggle);

      fish.particles.position.copy(pos);
      
      const glowAlphas = fish.particles.geometry.attributes.alpha.array as Float32Array;
      const flicker = 0.5 + Math.sin(elapsed * Math.PI + fish.wiggleOffset) * 0.5;
      for (let i = 0; i < glowAlphas.length; i++) {
        glowAlphas[i] = 0.15 + flicker * 0.2;
      }
      fish.particles.geometry.attributes.alpha.needsUpdate = true;
    });
  }

  return { update };
}

export function setupInteractionPoints(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): InteractionAPI {
  const points: InteractionPoint[] = [];
  const ghosts: GhostAnimation[] = [];
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const lightPillarSystems: {
    mesh: THREE.Points;
    startTime: number;
    duration: number;
  }[] = [];

  const interactionPositions = [
    { pos: new THREE.Vector3(-3, 3.5, -3), column: 0 },
    { pos: new THREE.Vector3(3, 3.5, -3), column: 1 },
    { pos: new THREE.Vector3(-3, 3, 3), column: 2 },
    { pos: new THREE.Vector3(3, 3.5, 3), column: 3 },
    { pos: new THREE.Vector3(0, 2.5, 0), column: -1 },
    { pos: new THREE.Vector3(0, 1, 2.5), column: -1 }
  ];

  interactionPositions.forEach(({ pos, column }, index) => {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.5
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(pos);
    sphere.userData.interactionIndex = index;
    sphere.castShadow = false;
    sphere.receiveShadow = false;
    scene.add(sphere);

    points.push({
      mesh: sphere,
      position: pos.clone(),
      active: true,
      columnIndex: column,
      triggered: false
    });
  });

  function onClick(event: MouseEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshes = points.filter(p => p.active).map(p => p.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const point = points.find(p => p.mesh === hitMesh);
      if (point && point.active && !point.triggered) {
        triggerInteraction(point);
      }
    }
  }

  function triggerInteraction(point: InteractionPoint) {
    point.triggered = true;
    createLightPillars(point.position);
    if (point.columnIndex >= 0) {
      createGhostColumn(point.columnIndex);
    } else {
      createGhostBeam();
    }

    setTimeout(() => {
      point.active = false;
      scene.remove(point.mesh);
    }, 5000);
  }

  function createLightPillars(origin: THREE.Vector3) {
    const pillarCount = 10;
    const particlesPerPillar = 30;
    const totalParticles = pillarCount * particlesPerPillar;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(totalParticles * 3);
    const alphas = new Float32Array(totalParticles);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < totalParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      positions[i * 3] = origin.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = origin.y + Math.random() * 0.5;
      positions[i * 3 + 2] = origin.z + Math.sin(angle) * radius;
      alphas[i] = 1.0;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        0.08 + Math.random() * 0.08,
        (Math.random() - 0.5) * 0.02
      ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.computeBoundingSphere();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffddaa) }
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 8.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.castShadow = false;
    particleSystem.receiveShadow = false;
    (particleSystem as any).velocities = velocities;
    scene.add(particleSystem);

    lightPillarSystems.push({
      mesh: particleSystem,
      startTime: performance.now(),
      duration: 5000
    });
  }

  function createGhostColumn(columnIndex: number) {
    const column = sceneElements.columns[columnIndex];
    if (!column) return;

    const ghostGeometry = new THREE.CylinderGeometry(0.5, 0.5, column.originalHeight + 1, 24, 8);
    const ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeebb,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
    ghost.position.copy(column.originalPosition);
    ghost.position.y = column.originalHeight / 2 + 0.5;
    ghost.castShadow = false;
    ghost.receiveShadow = false;
    scene.add(ghost);

    ghosts.push({
      mesh: ghost,
      startTime: performance.now(),
      duration: 5000
    });
  }

  function createGhostBeam() {
    const beamGeometry = new THREE.BoxGeometry(9, 0.8, 1.2);
    const ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeebb,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const ghost = new THREE.Mesh(beamGeometry, ghostMaterial);
    ghost.position.set(0, 6.5, 0);
    ghost.castShadow = false;
    ghost.receiveShadow = false;
    scene.add(ghost);

    ghosts.push({
      mesh: ghost,
      startTime: performance.now(),
      duration: 5000
    });
  }

  renderer.domElement.addEventListener('click', onClick);

  function update(elapsed: number, delta: number) {
    points.forEach((point) => {
      if (point.active) {
        const mat = point.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2));
      }
    });

    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i];
      const elapsed = (performance.now() - g.startTime) / g.duration;
      const mat = g.mesh.material as THREE.MeshBasicMaterial;

      if (elapsed < 0.5) {
        mat.opacity = 0.5 * (elapsed / 0.5);
      } else if (elapsed < 1) {
        mat.opacity = 0.5 * (1 - (elapsed - 0.5) / 0.5);
      } else {
        scene.remove(g.mesh);
        (g.mesh.geometry as THREE.BufferGeometry).dispose();
        (mat as THREE.Material).dispose();
        ghosts.splice(i, 1);
      }
    }

    for (let i = lightPillarSystems.length - 1; i >= 0; i--) {
      const sys = lightPillarSystems[i];
      const elapsedMs = performance.now() - sys.startTime;
      const elapsedNorm = elapsedMs / sys.duration;

      if (elapsedNorm >= 1) {
        scene.remove(sys.mesh);
        (sys.mesh.geometry as THREE.BufferGeometry).dispose();
        ((sys.mesh as any).material as THREE.Material).dispose();
        lightPillarSystems.splice(i, 1);
        continue;
      }

      const positions = sys.mesh.geometry.attributes.position.array as Float32Array;
      const alphas = sys.mesh.geometry.attributes.alpha.array as Float32Array;
      const velocities = (sys.mesh as any).velocities as THREE.Vector3[];

      const count = positions.length / 3;
      for (let j = 0; j < count; j++) {
        positions[j * 3] += velocities[j].x;
        positions[j * 3 + 1] += velocities[j].y;
        positions[j * 3 + 2] += velocities[j].z;
        alphas[j] = 1 - elapsedNorm;
      }
      sys.mesh.geometry.attributes.position.needsUpdate = true;
      sys.mesh.geometry.attributes.alpha.needsUpdate = true;
    }
  }

  return { update };
}

export function setupIntroAnimation(appState: AppState) {
  const overlay = document.getElementById('intro-overlay');
  const text = document.getElementById('intro-text');

  if (!overlay || !text) return;

  overlay.classList.add('show');

  setTimeout(() => {
    text.classList.add('show');
  }, 300);

  setTimeout(() => {
    text.classList.add('fade-out');
  }, 3000);

  setTimeout(() => {
    overlay.classList.add('hide');
    document.getElementById('info-panel')!.style.display = 'block';
    document.getElementById('reset-btn')!.style.display = 'flex';
    appState.isAnimatingIntro = false;
  }, 4500);
}
