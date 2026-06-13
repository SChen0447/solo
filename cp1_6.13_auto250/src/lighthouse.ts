import * as THREE from 'three';
import gsap from 'gsap';

const BUBBLE_COLORS = [0xff6b6b, 0x48dbfb, 0xfeca57, 0xff9ff3];

export interface Bubble {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularSpeed: number;
  radius: number;
  angle: number;
  baseY: number;
  originalPosition: THREE.Vector3;
  colorIndex: number;
}

export interface Lighthouse {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  bubbles: Bubble[];
  glowMesh: THREE.Mesh;
  glowIntensity: number;
  isHovered: boolean;
  isShocked: boolean;
  bubbleSpeedMultiplier: number;
  update: (delta: number, elapsed: number) => void;
  setHovered: (hovered: boolean) => void;
  triggerShockwave: () => void;
}

export function createLighthouse(): Lighthouse {
  const group = new THREE.Group();

  const coreGeometry = new THREE.IcosahedronGeometry(2, 3);
  const coreMaterial = new THREE.MeshPhongMaterial({
    color: 0x48dbfb,
    transparent: true,
    opacity: 0.35,
    emissive: 0x48dbfb,
    emissiveIntensity: 0.5,
    side: THREE.DoubleSide,
    shininess: 100,
  });
  const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
  group.add(coreMesh);

  const glowGeometry = new THREE.IcosahedronGeometry(2.2, 3);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x48dbfb,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glowMesh);

  const bubbles: Bubble[] = [];
  const bubbleGeometry = new THREE.SphereGeometry(1, 16, 16);

  for (let i = 0; i < 200; i++) {
    const radius = 0.05 + Math.random() * 0.15;
    const colorIndex = Math.floor(Math.random() * BUBBLE_COLORS.length);
    const color = BUBBLE_COLORS[colorIndex];
    const opacity = 0.3 + Math.random() * 0.4;

    const bubbleMaterial = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      emissive: color,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    mesh.scale.setScalar(radius);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = Math.random() * 1.5;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);

    mesh.position.set(x, y, z);

    const bubble: Bubble = {
      mesh,
      velocity: new THREE.Vector3(0, 0.005 + Math.random() * 0.01, 0),
      angularSpeed: 0.5 + Math.random() * 1.0,
      radius: Math.sqrt(x * x + z * z),
      angle: Math.atan2(z, x),
      baseY: y,
      originalPosition: new THREE.Vector3(x, y, z),
      colorIndex,
    };

    bubbles.push(bubble);
    group.add(mesh);
  }

  let glowIntensity = 0;
  let isHovered = false;
  let isShocked = false;
  let bubbleSpeedMultiplier = 1;
  let glowPulseTime = 0;
  let shockwaveTime = 0;
  let baseYOffset = 0;

  function setHovered(hovered: boolean) {
    if (isHovered === hovered) return;
    isHovered = hovered;
    bubbleSpeedMultiplier = hovered ? 1.5 : 1;
  }

  function triggerShockwave() {
    if (isShocked) return;
    isShocked = true;
    shockwaveTime = 0;

    bubbles.forEach((bubble) => {
      const direction = bubble.mesh.position.clone().normalize();
      const targetPos = bubble.originalPosition.clone().add(direction.multiplyScalar(2));

      gsap.to(bubble.mesh.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(bubble.mesh.position, {
            x: bubble.originalPosition.x,
            y: bubble.originalPosition.y,
            z: bubble.originalPosition.z,
            duration: 2,
            ease: 'elastic.out(1, 0.5)',
          });
        },
      });
    });

    setTimeout(() => {
      isShocked = false;
    }, 2500);
  }

  function update(delta: number, elapsed: number) {
    coreMesh.rotation.y += delta * (Math.PI * 2 / 30);
    glowMesh.rotation.y = coreMesh.rotation.y;

    baseYOffset = Math.sin(elapsed * 0.5) * 0.25;
    group.position.y = baseYOffset;

    if (isHovered) {
      glowPulseTime += delta;
      const pulse = (Math.sin(glowPulseTime * (Math.PI * 2 / 3)) + 1) * 0.5;
      glowIntensity = 0.3 + pulse * 0.4;
    } else {
      glowIntensity *= 0.95;
      if (glowIntensity < 0.001) glowIntensity = 0;
    }

    (glowMesh.material as THREE.MeshBasicMaterial).opacity = glowIntensity;

    bubbles.forEach((bubble) => {
      bubble.angle += delta * bubble.angularSpeed * bubbleSpeedMultiplier;
      bubble.baseY += bubble.velocity.y * bubbleSpeedMultiplier * delta * 60;

      if (bubble.baseY > 1.8) {
        bubble.baseY = -1.8;
        bubble.radius = 0.3 + Math.random() * 1.2;
      }

      const targetX = Math.cos(bubble.angle) * bubble.radius;
      const targetZ = Math.sin(bubble.angle) * bubble.radius;

      if (!isShocked) {
        bubble.mesh.position.x += (targetX - bubble.mesh.position.x) * 0.05;
        bubble.mesh.position.z += (targetZ - bubble.mesh.position.z) * 0.05;
        bubble.mesh.position.y += (bubble.baseY - bubble.mesh.position.y) * 0.05;
      }

      bubble.mesh.rotation.x += delta * 0.5;
      bubble.mesh.rotation.y += delta * 0.7;
    });
  }

  return {
    group,
    coreMesh,
    bubbles,
    glowMesh,
    glowIntensity,
    isHovered,
    isShocked,
    bubbleSpeedMultiplier,
    update,
    setHovered,
    triggerShockwave,
  };
}
