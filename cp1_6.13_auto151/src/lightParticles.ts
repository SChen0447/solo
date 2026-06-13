import * as THREE from 'three';
import { POLE_COLORS } from './sceneSetup';

interface PoleLight {
  orbMesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  pointLight: THREE.PointLight;
  particles: THREE.Points;
  particlePositions: Float32Array;
  particleVelocities: Float32Array;
  particleLifetimes: Float32Array;
  particleAlphas: Float32Array;
  particleCount: number;
  rotationSpeed: number;
}

export interface LightParticlesSystem {
  lightsGroup: THREE.Group;
  update: (delta: number) => void;
}

function createOrbShaderMaterial(color: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      mainColor: { value: new THREE.Color(color) },
      time: { value: 0 }
    },
    transparent: true,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 mainColor;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 1.5);
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        vec3 color = mainColor * pulse;
        color += fresnel * 0.8;
        float noise = sin(vPosition.x * 10.0 + time) * cos(vPosition.y * 10.0 + time * 1.3) * 0.1;
        color += noise * mainColor;
        gl_FragColor = vec4(color, 0.9 + intensity * 0.1);
      }
    `
  });
}

function createHaloMaterial(color: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      mainColor: { value: new THREE.Color(color) },
      time: { value: 0 }
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 mainColor;
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float intensity = pow(0.4 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        float pulse = sin(time * 1.5) * 0.15 + 0.85;
        vec3 color = mainColor * pulse;
        gl_FragColor = vec4(color, intensity * 0.7);
      }
    `
  });
}

function createParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createParticleMaterial(color: number, texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      mainColor: { value: new THREE.Color(color) },
      pointTexture: { value: texture }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 3.0 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 mainColor;
      uniform sampler2D pointTexture;
      varying float vAlpha;
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(mainColor, texColor.a * vAlpha);
      }
    `
  });
}

export function createLightParticles(poleTopPositions: THREE.Vector3[]): LightParticlesSystem {
  const lightsGroup = new THREE.Group();
  lightsGroup.name = 'lightParticles';

  const poleLights: PoleLight[] = [];
  const particleTexture = createParticleTexture();
  const PARTICLES_PER_POLE = 50;

  poleTopPositions.forEach((pos, index) => {
    const color = POLE_COLORS[index];

    const orbGeo = new THREE.SphereGeometry(0.25, 24, 24);
    const orbMat = createOrbShaderMaterial(color);
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    orbMesh.position.copy(pos);

    const haloGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const haloMat = createHaloMaterial(color);
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.copy(pos);

    const pointLight = new THREE.PointLight(color, 1.5, 8, 2);
    pointLight.position.copy(pos);

    const particleCount = PARTICLES_PER_POLE;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.5 + Math.random() * 1.0;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed * 0.5 + 0.3;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      lifetimes[i] = Math.random() * 2.0;
      alphas[i] = 0;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const particleMat = createParticleMaterial(color, particleTexture);
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.frustumCulled = false;

    lightsGroup.add(haloMesh);
    lightsGroup.add(orbMesh);
    lightsGroup.add(pointLight);
    lightsGroup.add(particles);

    poleLights.push({
      orbMesh,
      haloMesh,
      pointLight,
      particles,
      particlePositions: positions,
      particleVelocities: velocities,
      particleLifetimes: lifetimes,
      particleAlphas: alphas,
      particleCount,
      rotationSpeed: 0.5 + Math.random() * 0.5
    });
  });

  let elapsedTime = 0;

  function updateParticles(light: PoleLight, polePos: THREE.Vector3, delta: number) {
    const maxLifetime = 2.0;

    for (let i = 0; i < light.particleCount; i++) {
      light.particleLifetimes[i] += delta;

      if (light.particleLifetimes[i] >= maxLifetime) {
        light.particleLifetimes[i] = 0;
        light.particlePositions[i * 3] = polePos.x;
        light.particlePositions[i * 3 + 1] = polePos.y;
        light.particlePositions[i * 3 + 2] = polePos.z;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 0.5 + Math.random() * 1.0;
        light.particleVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        light.particleVelocities[i * 3 + 1] = Math.cos(phi) * speed * 0.5 + 0.3;
        light.particleVelocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      }

      const lifeT = light.particleLifetimes[i] / maxLifetime;
      let alpha: number;
      if (lifeT < 0.2) {
        alpha = lifeT / 0.2;
      } else {
        alpha = 1.0 - (lifeT - 0.2) / 0.8;
      }
      light.particleAlphas[i] = Math.max(0, Math.min(1, alpha));

      const dx = light.particleVelocities[i * 3];
      const dy = light.particleVelocities[i * 3 + 1];
      const dz = light.particleVelocities[i * 3 + 2];

      light.particlePositions[i * 3] += dx * delta;
      light.particlePositions[i * 3 + 1] += dy * delta;
      light.particlePositions[i * 3 + 2] += dz * delta;

      light.particleVelocities[i * 3 + 1] -= 0.1 * delta;

      const turbulence = Math.sin(elapsedTime * 2 + i * 0.5) * 0.3;
      light.particleVelocities[i * 3] += turbulence * delta;
      light.particleVelocities[i * 3 + 2] += Math.cos(elapsedTime * 1.5 + i * 0.7) * 0.3 * delta;
    }

    const posAttr = light.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = light.particles.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  function update(delta: number) {
    elapsedTime += delta;

    poleLights.forEach((light, index) => {
      const polePos = poleTopPositions[index];

      light.orbMesh.rotation.y += light.rotationSpeed * delta;
      light.orbMesh.rotation.x += light.rotationSpeed * 0.7 * delta;

      light.haloMesh.rotation.y -= light.rotationSpeed * 0.5 * delta;
      const haloScale = 1 + Math.sin(elapsedTime * 1.5 + index) * 0.1;
      light.haloMesh.scale.set(haloScale, haloScale, haloScale);

      const pulse = 1 + Math.sin(elapsedTime * 2 + index * 0.8) * 0.2;
      light.pointLight.intensity = 1.2 * pulse;

      const orbMat = light.orbMesh.material as THREE.ShaderMaterial;
      if (orbMat.uniforms && orbMat.uniforms.time) {
        orbMat.uniforms.time.value = elapsedTime;
      }
      const haloMat = light.haloMesh.material as THREE.ShaderMaterial;
      if (haloMat.uniforms && haloMat.uniforms.time) {
        haloMat.uniforms.time.value = elapsedTime;
      }

      updateParticles(light, polePos, delta);
    });
  }

  return {
    lightsGroup,
    update
  };
}
