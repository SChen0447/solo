import * as THREE from 'three';
import { gsap } from 'gsap';
import { WordData, Particle, StarPoint } from './types';
import {
  randomRange,
  mixColors,
  getResponsiveScale
} from './utils';
import { setMixedColor, releaseWord } from './wordPool';

let scene: THREE.Scene;
let coreMesh: THREE.Mesh;
let coreGlow: THREE.Mesh;
let corePosition: THREE.Vector3;
let absorbedWords: WordData[] = [];
const MAX_ABSORBED = 12;
let particles: Particle[] = [];
let starPoints: StarPoint[] = [];
let colorCycleTimer = 0;
const COLOR_CYCLE_PERIOD = 5;
const coreColors = [
  new THREE.Color('#ff6b6b'),
  new THREE.Color('#48dbfb'),
  new THREE.Color('#feca57')
];
let onAbsorbedCountChange: ((count: number) => void) | null = null;
let ringRotationAngle = 0;
const RING_ROTATION_SPEED = 0.3;
let corePulseScale = { value: 1 };

export function initializeCore(
  sceneRef: THREE.Scene,
  onAbsorbedChange?: (count: number) => void
): { coreMesh: THREE.Mesh; corePosition: THREE.Vector3 } {
  scene = sceneRef;
  onAbsorbedCountChange = onAbsorbedChange || null;
  
  const responsiveScale = getResponsiveScale();
  const coreRadius = 1.5 * responsiveScale;
  
  corePosition = new THREE.Vector3(0, -2, 0);
  
  const coreGeometry = new THREE.SphereGeometry(coreRadius, 64, 64);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: coreColors[0],
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  
  coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
  coreMesh.position.copy(corePosition);
  coreMesh.userData = { isCore: true };
  scene.add(coreMesh);
  
  const glowGeometry = new THREE.SphereGeometry(coreRadius * 1.5, 64, 64);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: coreColors[0],
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide
  });
  
  coreGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  coreGlow.position.copy(corePosition);
  scene.add(coreGlow);
  
  createStarPoints();
  
  return { coreMesh, corePosition };
}

function createStarPoints(): void {
  const starCount = 100;
  
  for (let i = 0; i < starCount; i++) {
    const size = randomRange(0.03, 0.08);
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const opacity = randomRange(0.2, 0.5);
    
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    const distance = randomRange(15, 30);
    const theta = randomRange(0, Math.PI * 2);
    const phi = randomRange(0, Math.PI);
    
    mesh.position.set(
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.sin(phi) * Math.sin(theta),
      distance * Math.cos(phi)
    );
    
    scene.add(mesh);
    
    starPoints.push({
      mesh,
      pulseTimer: randomRange(0, 5),
      pulsePeriod: randomRange(2, 5),
      baseOpacity: opacity
    });
  }
}

export function getCorePosition(): THREE.Vector3 {
  return corePosition.clone();
}

export function getCoreMesh(): THREE.Mesh {
  return coreMesh;
}

export function updateCore(deltaTime: number): void {
  colorCycleTimer += deltaTime;
  const cycleProgress = (colorCycleTimer % COLOR_CYCLE_PERIOD) / COLOR_CYCLE_PERIOD;
  
  const colorIndex = Math.floor(cycleProgress * 3) % 3;
  const nextColorIndex = (colorIndex + 1) % 3;
  const localT = (cycleProgress * 3) % 1;
  
  const currentColor = coreColors[colorIndex];
  const nextColor = coreColors[nextColorIndex];
  const blendedColor = currentColor.clone().lerp(nextColor, localT);
  
  const coreMaterial = coreMesh.material as THREE.MeshBasicMaterial;
  const glowMaterial = coreGlow.material as THREE.MeshBasicMaterial;
  
  coreMaterial.color.copy(blendedColor);
  glowMaterial.color.copy(blendedColor);
  
  const pulseIntensity = 1 + Math.sin(colorCycleTimer * 2) * 0.1;
  coreMesh.scale.setScalar(corePulseScale.value * pulseIntensity);
  coreGlow.scale.setScalar(corePulseScale.value * pulseIntensity * 1.2);
  
  updateAbsorbedWords(deltaTime);
  updateParticles(deltaTime);
  updateStarPoints(deltaTime);
}

function updateAbsorbedWords(deltaTime: number): void {
  ringRotationAngle += RING_ROTATION_SPEED * deltaTime;
  
  for (let i = 0; i < absorbedWords.length; i++) {
    const word = absorbedWords[i];
    const angle = ringRotationAngle + (i / absorbedWords.length) * Math.PI * 2;
    const radius = 2.5;
    
    const targetPos = new THREE.Vector3(
      corePosition.x + Math.cos(angle) * radius,
      corePosition.y,
      corePosition.z + Math.sin(angle) * radius
    );
    
    word.mesh.position.lerp(targetPos, 0.1);
    word.mesh.lookAt(corePosition);
  }
}

function updateParticles(deltaTime: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life -= deltaTime;
    
    if (particle.life <= 0) {
      scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
      particles.splice(i, 1);
    } else {
      particle.velocity.y -= 0.5 * deltaTime;
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = (particle.life / particle.maxLife) * 0.8;
      
      const scale = particle.life / particle.maxLife;
      particle.mesh.scale.setScalar(scale);
    }
  }
}

function updateStarPoints(deltaTime: number): void {
  for (const star of starPoints) {
    star.pulseTimer += deltaTime;
    const pulsePhase = (star.pulseTimer % star.pulsePeriod) / star.pulsePeriod;
    const opacity = star.baseOpacity + Math.sin(pulsePhase * Math.PI * 2) * 0.2;
    
    const material = star.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, Math.min(1, opacity));
  }
}

export function absorbWord(word: WordData): boolean {
  if (absorbedWords.length >= MAX_ABSORBED) return false;
  if (word.isAbsorbed) return false;
  
  const distance = word.mesh.position.distanceTo(corePosition);
  if (distance > 4) return false;
  
  word.isAbsorbed = true;
  word.absorbedIndex = absorbedWords.length;
  word.isBlinking = true;
  absorbedWords.push(word);
  
  pulseCore(word.currentColor);
  
  if (onAbsorbedCountChange) {
    onAbsorbedCountChange(absorbedWords.length);
  }
  
  gsap.to(word.mesh.scale, {
    x: word.baseSize * 0.8,
    y: word.baseSize * 0.8,
    z: word.baseSize * 0.8,
    duration: 0.5,
    ease: 'back.out'
  });
  
  return true;
}

export function triggerParticleFountain(): void {
  if (absorbedWords.length < 4) return;
  
  const mixedColor = mixColors(absorbedWords.map(w => w.currentColor));
  const particleCount = 300;
  
  for (let i = 0; i < particleCount; i++) {
    createParticle(mixedColor);
  }
  
  const colors = absorbedWords.map(w => w.currentColor.clone());
  const wordsToRelease = [...absorbedWords];
  
  for (let i = 0; i < wordsToRelease.length; i++) {
    const word = wordsToRelease[i];
    const wordColor = colors[i % colors.length];
    setMixedColor(word, wordColor);
    releaseWord(word);
  }
  
  absorbedWords = [];
  
  if (onAbsorbedCountChange) {
    onAbsorbedCountChange(0);
  }
  
  gsap.to(coreMesh.scale, {
    x: 3,
    y: 3,
    z: 3,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(coreMesh.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.5,
        ease: 'elastic.out'
      });
    }
  });
}

function createParticle(color: THREE.Color): void {
  const size = randomRange(0.05, 0.15);
  const geometry = new THREE.SphereGeometry(size, 8, 8);
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(corePosition);
  
  const speed = randomRange(5, 8);
  const theta = randomRange(0, Math.PI * 2);
  const phi = randomRange(0, Math.PI);
  
  const velocity = new THREE.Vector3(
    speed * Math.sin(phi) * Math.cos(theta),
    speed * Math.cos(phi) + 2,
    speed * Math.sin(phi) * Math.sin(theta)
  );
  
  scene.add(mesh);
  
  particles.push({
    mesh,
    velocity,
    life: randomRange(2, 3),
    maxLife: 3,
    color: color.clone()
  });
}

function pulseCore(color: THREE.Color): void {
  gsap.to(corePulseScale, {
    value: 1.3,
    duration: 0.2,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(corePulseScale, {
        value: 1,
        duration: 0.3,
        ease: 'power2.in'
      });
    }
  });
  
  const coreMaterial = coreMesh.material as THREE.MeshBasicMaterial;
  const originalColor = coreMaterial.color.clone();
  
  gsap.to(coreMaterial.color, {
    r: color.r,
    g: color.g,
    b: color.b,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(coreMaterial.color, {
        r: originalColor.r,
        g: originalColor.g,
        b: originalColor.b,
        duration: 0.5,
        ease: 'power2.in'
      });
    }
  });
}

export function getAbsorbedCount(): number {
  return absorbedWords.length;
}

export function checkWordNearCore(word: WordData): boolean {
  const distance = word.mesh.position.distanceTo(corePosition);
  return distance <= 4;
}

export function disposeCore(): void {
  scene.remove(coreMesh);
  scene.remove(coreGlow);
  coreMesh.geometry.dispose();
  (coreMesh.material as THREE.Material).dispose();
  coreGlow.geometry.dispose();
  (coreGlow.material as THREE.Material).dispose();
  
  for (const particle of particles) {
    scene.remove(particle.mesh);
    particle.mesh.geometry.dispose();
    (particle.mesh.material as THREE.Material).dispose();
  }
  particles = [];
  
  for (const star of starPoints) {
    scene.remove(star.mesh);
    star.mesh.geometry.dispose();
    (star.mesh.material as THREE.Material).dispose();
  }
  starPoints = [];
  
  absorbedWords = [];
}
