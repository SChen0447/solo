import * as THREE from 'three';

export interface LightingData {
  ambientLight: THREE.AmbientLight;
  sunLight: THREE.DirectionalLight;
  causticLights: THREE.PointLight[];
  bioluminescentParticles: THREE.Points;
  bioluminescentData: { baseIntensity: number; phase: number; speed: number }[];
  godRays: THREE.Mesh[];
  baseAmbientIntensity: number;
  waterColorTarget: THREE.Color;
  waterColorCurrent: THREE.Color;
  waterColorTransitionProgress: number;
}

export function createLighting(scene: THREE.Scene): LightingData {
  scene.background = createSkyGradient();
  scene.fog = new THREE.Fog(0x0A1A3A, 15, 45);
  
  const baseAmbientIntensity = 0.35;
  const ambientLight = new THREE.AmbientLight(0x4488aa, baseAmbientIntensity);
  scene.add(ambientLight);
  
  const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
  sunLight.position.set(5, 20, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -20;
  sunLight.shadow.camera.right = 20;
  sunLight.shadow.camera.top = 20;
  sunLight.shadow.camera.bottom = -20;
  scene.add(sunLight);
  
  const causticLights: THREE.PointLight[] = [];
  const causticColors = [0x88ccff, 0x66aaff, 0xaaddff];
  
  for (let i = 0; i < 5; i++) {
    const light = new THREE.PointLight(causticColors[i % causticColors.length], 0.4, 15, 2);
    const angle = (i / 5) * Math.PI * 2;
    light.position.set(
      Math.cos(angle) * 8,
      5 - Math.random() * 3,
      Math.sin(angle) * 8
    );
    light.userData = {
      baseX: light.position.x,
      baseZ: light.position.z,
      radius: 2 + Math.random() * 3,
      speed: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2
    };
    causticLights.push(light);
    scene.add(light);
  }
  
  const bioluminescentCount = 60;
  const bioPositions = new Float32Array(bioluminescentCount * 3);
  const bioColors = new Float32Array(bioluminescentCount * 3);
  const bioSizes = new Float32Array(bioluminescentCount);
  const bioluminescentData: { baseIntensity: number; phase: number; speed: number }[] = [];
  
  for (let i = 0; i < bioluminescentCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 16;
    bioPositions[i * 3] = Math.cos(angle) * radius;
    bioPositions[i * 3 + 1] = -1 + Math.random() * 5;
    bioPositions[i * 3 + 2] = Math.sin(angle) * radius;
    
    const colorChoice = Math.random();
    if (colorChoice < 0.5) {
      bioColors[i * 3] = 0;
      bioColors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
      bioColors[i * 3 + 2] = 0.4 + Math.random() * 0.4;
    } else {
      bioColors[i * 3] = 0.2 + Math.random() * 0.3;
      bioColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      bioColors[i * 3 + 2] = 0.9;
    }
    
    bioSizes[i] = 0.1 + Math.random() * 0.2;
    
    bioluminescentData.push({
      baseIntensity: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 2
    });
  }
  
  const bioGeometry = new THREE.BufferGeometry();
  bioGeometry.setAttribute('position', new THREE.BufferAttribute(bioPositions, 3));
  bioGeometry.setAttribute('color', new THREE.BufferAttribute(bioColors, 3));
  bioGeometry.setAttribute('size', new THREE.BufferAttribute(bioSizes, 1));
  
  const bioMaterial = new THREE.PointsMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    size: 0.2,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const bioluminescentParticles = new THREE.Points(bioGeometry, bioMaterial);
  scene.add(bioluminescentParticles);
  
  const godRays: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const rayGeometry = new THREE.CylinderGeometry(0.1, 2.5, 15, 8, 1, true);
    const rayMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ray = new THREE.Mesh(rayGeometry, rayMaterial);
    ray.position.set(
      (Math.random() - 0.5) * 10,
      0.5,
      (Math.random() - 0.5) * 10
    );
    ray.rotation.z = (Math.random() - 0.5) * 0.15;
    ray.rotation.x = (Math.random() - 0.5) * 0.1;
    ray.userData = {
      baseX: ray.position.x,
      baseZ: ray.position.z,
      speed: 0.1 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2
    };
    godRays.push(ray);
    scene.add(ray);
  }
  
  const waterColorCurrent = new THREE.Color(0x0A2A4A);
  const waterColorTarget = new THREE.Color(0x0A2A4A);
  
  return {
    ambientLight,
    sunLight,
    causticLights,
    bioluminescentParticles,
    bioluminescentData,
    godRays,
    baseAmbientIntensity,
    waterColorTarget,
    waterColorCurrent,
    waterColorTransitionProgress: 0
  };
}

function createSkyGradient(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#001133');
  gradient.addColorStop(0.5, '#1A3A5C');
  gradient.addColorStop(1, '#0A2A4A');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function updateLighting(
  lighting: LightingData,
  time: number,
  delta: number
): void {
  for (const light of lighting.causticLights) {
    const { baseX, baseZ, radius, speed, phase } = light.userData as {
      baseX: number;
      baseZ: number;
      radius: number;
      speed: number;
      phase: number;
    };
    light.position.x = baseX + Math.sin(time * speed + phase) * radius;
    light.position.z = baseZ + Math.cos(time * speed * 0.8 + phase) * radius;
    light.intensity = 0.3 + Math.sin(time * speed * 2 + phase) * 0.15;
  }
  
  const bioMaterial = lighting.bioluminescentParticles.material as THREE.PointsMaterial;
  for (let i = 0; i < lighting.bioluminescentData.length; i++) {
    const data = lighting.bioluminescentData[i];
    const pulse = data.baseIntensity * (0.5 + 0.5 * Math.sin(time * data.speed + data.phase));
    bioMaterial.opacity = 0.5 + pulse * 0.3;
  }
  
  for (const ray of lighting.godRays) {
    const { baseX, baseZ, speed, phase } = ray.userData as {
      baseX: number;
      baseZ: number;
      speed: number;
      phase: number;
    };
    ray.position.x = baseX + Math.sin(time * speed + phase) * 1.5;
    ray.position.z = baseZ + Math.cos(time * speed * 0.7 + phase) * 1.5;
    
    const mat = ray.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + Math.sin(time * speed * 1.5 + phase) * 0.025;
  }
  
  if (lighting.waterColorTransitionProgress < 1) {
    lighting.waterColorTransitionProgress = Math.min(
      1,
      lighting.waterColorTransitionProgress + delta / 4
    );
    lighting.waterColorCurrent.lerpColors(
      new THREE.Color(0x0A2A4A),
      lighting.waterColorTarget,
      lighting.waterColorTransitionProgress
    );
  }
}

export function triggerWaterColorTransition(lighting: LightingData): void {
  lighting.waterColorTarget.set(0xFFD700);
  lighting.waterColorTransitionProgress = 0;
}

export interface GoldenParticleEffect {
  points: THREE.Points;
  startTime: number;
  duration: number;
  active: boolean;
}

export function createGoldenBeamParticles(
  scene: THREE.Scene,
  columnPosition: THREE.Vector3,
  columnHeight: number
): GoldenParticleEffect {
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const velocities: THREE.Vector3[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    const heightRatio = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.3 + Math.random() * 0.4;
    
    positions[i * 3] = columnPosition.x + Math.cos(angle) * radius;
    positions[i * 3 + 1] = columnPosition.y - columnHeight / 2 + heightRatio * columnHeight;
    positions[i * 3 + 2] = columnPosition.z + Math.sin(angle) * radius;
    
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 0.84 + Math.random() * 0.16;
    colors[i * 3 + 2] = 0;
    
    sizes[i] = 0.1 + Math.random() * 0.2;
    
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      0.3 + Math.random() * 0.8,
      (Math.random() - 0.5) * 0.5
    ));
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    size: 0.15,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const points = new THREE.Points(geometry, material);
  points.userData.velocities = velocities;
  scene.add(points);
  
  return {
    points,
    startTime: performance.now() / 1000,
    duration: 3,
    active: true
  };
}

export function updateGoldenBeamParticles(
  effect: GoldenParticleEffect,
  currentTime: number,
  delta: number
): boolean {
  if (!effect.active) return false;
  
  const elapsed = currentTime - effect.startTime;
  if (elapsed >= effect.duration) {
    effect.active = false;
    effect.points.geometry.dispose();
    (effect.points.material as THREE.Material).dispose();
    return false;
  }
  
  const progress = elapsed / effect.duration;
  const material = effect.points.material as THREE.PointsMaterial;
  material.opacity = 1 - progress;
  
  const positions = effect.points.geometry.attributes.position.array as Float32Array;
  const velocities = effect.points.userData.velocities as THREE.Vector3[];
  
  for (let i = 0; i < velocities.length; i++) {
    const i3 = i * 3;
    positions[i3] += velocities[i].x * delta;
    positions[i3 + 1] += velocities[i].y * delta;
    positions[i3 + 2] += velocities[i].z * delta;
  }
  
  effect.points.geometry.attributes.position.needsUpdate = true;
  return true;
}

export interface BlueFlameEffect {
  points: THREE.Points;
  startTime: number;
  duration: number;
  active: boolean;
  basePositions: Float32Array;
}

export function createBlueFlameParticles(
  scene: THREE.Scene,
  position: THREE.Vector3
): BlueFlameEffect {
  const particleCount = 30;
  const positions = new Float32Array(particleCount * 3);
  const basePositions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.3;
    const height = Math.random() * 1;
    
    const x = position.x + Math.cos(angle) * radius;
    const y = position.y + height;
    const z = position.z + Math.sin(angle) * radius;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = position.y;
    basePositions[i * 3 + 2] = z;
    
    colors[i * 3] = 0;
    colors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
    colors[i * 3 + 2] = 1;
    
    sizes[i] = 0.15 + Math.random() * 0.2;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    size: 0.2,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  
  return {
    points,
    startTime: performance.now() / 1000,
    duration: 10,
    active: true,
    basePositions
  };
}

export function updateBlueFlameParticles(
  effect: BlueFlameEffect,
  currentTime: number,
  _delta: number
): boolean {
  if (!effect.active) return false;
  
  const elapsed = currentTime - effect.startTime;
  if (elapsed >= effect.duration) {
    effect.active = false;
    effect.points.geometry.dispose();
    (effect.points.material as THREE.Material).dispose();
    return false;
  }
  
  const fadeStart = effect.duration - 1;
  const material = effect.points.material as THREE.PointsMaterial;
  if (elapsed > fadeStart) {
    material.opacity = 0.9 * (1 - (elapsed - fadeStart));
  }
  
  const positions = effect.points.geometry.attributes.position.array as Float32Array;
  const sizes = effect.points.geometry.attributes.size.array as Float32Array;
  
  for (let i = 0; i < effect.basePositions.length / 3; i++) {
    const i3 = i * 3;
    positions[i3] = effect.basePositions[i3] + Math.sin(currentTime * 3 + i) * 0.1;
    positions[i3 + 1] = effect.basePositions[i3 + 1] + Math.random() * 1.2;
    positions[i3 + 2] = effect.basePositions[i3 + 2] + Math.cos(currentTime * 2.5 + i * 0.5) * 0.1;
    sizes[i] = 0.1 + Math.random() * 0.25;
  }
  
  effect.points.geometry.attributes.position.needsUpdate = true;
  effect.points.geometry.attributes.size.needsUpdate = true;
  return true;
}
