import * as THREE from 'three';
import { gsap } from 'gsap';
import { WordData, LightBeam } from './types';
import {
  randomRange,
  randomColor,
  randomText,
  createTextTexture,
  lerpColor,
  getResponsiveScale
} from './utils';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let words: WordData[] = [];
let lightBeams: LightBeam[] = [];
let corePosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedWord: WordData | null = null;
let isDraggingWord: boolean = false;
let dragOffset: THREE.Vector3 = new THREE.Vector3();
let onWordClickCallback: ((word: WordData) => void) | null = null;
let onWordDragEndCallback: ((word: WordData) => void) | null = null;

export function initializeWordPool(
  sceneRef: THREE.Scene,
  cameraRef: THREE.PerspectiveCamera,
  corePos: THREE.Vector3,
  onWordClick?: (word: WordData) => void,
  onWordDragEnd?: (word: WordData) => void
): WordData[] {
  scene = sceneRef;
  camera = cameraRef;
  corePosition = corePos;
  onWordClickCallback = onWordClick || null;
  onWordDragEndCallback = onWordDragEnd || null;
  
  const wordCount = 400;
  const responsiveScale = getResponsiveScale();
  
  for (let i = 0; i < wordCount; i++) {
    const word = createWord(i, responsiveScale);
    words.push(word);
    scene.add(word.mesh);
  }
  
  return words;
}

function createWord(id: number, responsiveScale: number): WordData {
  const text = randomText();
  const color = randomColor();
  const opacity = randomRange(0.4, 0.7);
  const baseSize = randomRange(0.5, 1.5) * responsiveScale;
  
  const texture = createTextTexture(text, color, opacity, baseSize);
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  
  const geometry = new THREE.PlaneGeometry(baseSize * 1.2, baseSize * 1.2);
  const mesh = new THREE.Mesh(geometry, material);
  
  const distance = randomRange(5, 15);
  const theta = randomRange(0, Math.PI * 2);
  const phi = randomRange(0, Math.PI);
  
  mesh.position.set(
    distance * Math.sin(phi) * Math.cos(theta),
    distance * Math.sin(phi) * Math.sin(theta),
    distance * Math.cos(phi)
  );
  
  const rotationAxis = new THREE.Vector3(
    randomRange(-1, 1),
    randomRange(-1, 1),
    randomRange(-1, 1)
  ).normalize();
  
  const wordData: WordData = {
    id,
    text,
    mesh,
    originalColor: color.clone(),
    currentColor: color.clone(),
    baseSize,
    rotationSpeed: randomRange(Math.PI * 2 / 8, Math.PI * 2 / 3),
    rotationAxis,
    spiralAngle: randomRange(0, Math.PI * 2),
    spiralRadius: randomRange(3, 12),
    spiralHeight: randomRange(-8, 8),
    spiralSpeed: randomRange(0.02, 0.05),
    isAbsorbed: false,
    absorbedIndex: -1,
    blinkTimer: 0,
    blinkPeriod: randomRange(0.5, 0.8),
    isBlinking: false,
    mixedColor: null,
    mixedColorTimer: 0,
    originalPosition: mesh.position.clone(),
    originalRotation: mesh.rotation.clone()
  };
  
  mesh.userData = { wordData };
  
  return wordData;
}

export function updateWordPool(deltaTime: number): void {
  for (const word of words) {
    if (!word.isAbsorbed) {
      word.spiralAngle += word.spiralSpeed * deltaTime * 60;
      
      const targetX = Math.cos(word.spiralAngle) * word.spiralRadius;
      const targetY = word.spiralHeight + Math.sin(word.spiralAngle * 0.7) * 2;
      const targetZ = Math.sin(word.spiralAngle) * word.spiralRadius;
      
      word.mesh.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ),
        0.01
      );
      
      word.mesh.rotateOnAxis(word.rotationAxis, word.rotationSpeed * deltaTime);
    } else {
      if (word.isBlinking) {
        word.blinkTimer += deltaTime;
        const blinkPhase = (word.blinkTimer % word.blinkPeriod) / word.blinkPeriod;
        const opacity = 0.3 + Math.sin(blinkPhase * Math.PI * 2) * 0.7;
        const material = word.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = opacity * 0.7;
      }
    }
    
    if (word.mixedColor && word.mixedColorTimer > 0) {
      word.mixedColorTimer -= deltaTime;
      const t = Math.max(0, word.mixedColorTimer / 3);
      const color = lerpColor(word.originalColor, word.mixedColor, t);
      updateWordColor(word, color);
      
      if (word.mixedColorTimer <= 0) {
        word.mixedColor = null;
        updateWordColor(word, word.originalColor);
      }
    }
  }
  
  updateLightBeams(deltaTime);
}

function updateWordColor(word: WordData, color: THREE.Color): void {
  const material = word.mesh.material as THREE.MeshBasicMaterial;
  const texture = createTextTexture(word.text, color, 0.7, word.baseSize);
  material.map?.dispose();
  material.map = texture;
  material.needsUpdate = true;
  word.currentColor = color.clone();
}

export function handleWordClick(event: MouseEvent): boolean {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const meshes = words.filter(w => !w.isAbsorbed).map(w => w.mesh);
  const intersects = raycaster.intersectObjects(meshes);
  
  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    const wordData = mesh.userData.wordData as WordData;
    
    triggerWordPulse(wordData);
    
    if (onWordClickCallback) {
      onWordClickCallback(wordData);
    }
    
    return true;
  }
  
  return false;
}

export function triggerWordPulse(word: WordData): void {
  const originalScale = word.mesh.scale.x;
  
  gsap.to(word.mesh.scale, {
    x: originalScale * 2,
    y: originalScale * 2,
    z: originalScale * 2,
    duration: 0.2,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(word.mesh.scale, {
        x: originalScale * 1.2,
        y: originalScale * 1.2,
        z: originalScale * 1.2,
        duration: 0.2,
        onComplete: () => {
          gsap.to(word.mesh.scale, {
            x: originalScale,
            y: originalScale,
            z: originalScale,
            duration: 0.2,
            ease: 'power2.in'
          });
        }
      });
    }
  });
  
  createLightBeam(word);
}

function createLightBeam(word: WordData): void {
  const startPos = word.mesh.position.clone();
  const endPos = corePosition.clone();
  
  const points = [startPos, endPos];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  const material = new THREE.LineBasicMaterial({
    color: word.currentColor,
    transparent: true,
    opacity: 1
  });
  
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  
  lightBeams.push({
    line,
    progress: 0,
    targetColor: word.currentColor.clone(),
    active: true
  });
}

function updateLightBeams(deltaTime: number): void {
  for (let i = lightBeams.length - 1; i >= 0; i--) {
    const beam = lightBeams[i];
    if (!beam.active) continue;
    
    beam.progress += deltaTime * 3;
    
    if (beam.progress >= 1) {
      scene.remove(beam.line);
      beam.line.geometry.dispose();
      (beam.line.material as THREE.Material).dispose();
      lightBeams.splice(i, 1);
    } else {
      const material = beam.line.material as THREE.LineBasicMaterial;
      material.opacity = 1 - beam.progress;
      
      const positions = beam.line.geometry.attributes.position.array as Float32Array;
      const start = new THREE.Vector3(positions[0], positions[1], positions[2]);
      const end = corePosition.clone();
      const currentEnd = start.clone().lerp(end, beam.progress);
      
      positions[3] = currentEnd.x;
      positions[4] = currentEnd.y;
      positions[5] = currentEnd.z;
      beam.line.geometry.attributes.position.needsUpdate = true;
    }
  }
}

export function handleWordDragStart(event: MouseEvent): boolean {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const meshes = words.filter(w => !w.isAbsorbed).map(w => w.mesh);
  const intersects = raycaster.intersectObjects(meshes);
  
  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    selectedWord = mesh.userData.wordData as WordData;
    isDraggingWord = true;
    
    const intersectPoint = intersects[0].point;
    dragOffset.copy(selectedWord.mesh.position).sub(intersectPoint);
    
    return true;
  }
  
  return false;
}

export function handleWordDragMove(event: MouseEvent): void {
  if (!isDraggingWord || !selectedWord) return;
  
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const planeNormal = new THREE.Vector3();
  camera.getWorldDirection(planeNormal);
  const plane = new THREE.Plane(planeNormal.negate(), -selectedWord.mesh.position.dot(planeNormal));
  
  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);
  
  if (intersectPoint) {
    selectedWord.mesh.position.copy(intersectPoint.add(dragOffset));
  }
}

export function handleWordDragEnd(): void {
  if (isDraggingWord && selectedWord) {
    if (onWordDragEndCallback) {
      onWordDragEndCallback(selectedWord);
    }
  }
  
  isDraggingWord = false;
  selectedWord = null;
}

export function getWordMeshes(): THREE.Mesh[] {
  return words.map(w => w.mesh);
}

export function getWords(): WordData[] {
  return words;
}

export function setMixedColor(word: WordData, color: THREE.Color): void {
  word.mixedColor = color.clone();
  word.mixedColorTimer = 3;
}

export function releaseWord(word: WordData): void {
  word.isAbsorbed = false;
  word.absorbedIndex = -1;
  word.isBlinking = false;
  
  const material = word.mesh.material as THREE.MeshBasicMaterial;
  material.opacity = 0.6;
  
  const direction = new THREE.Vector3(
    randomRange(-1, 1),
    randomRange(-1, 1),
    randomRange(-1, 1)
  ).normalize();
  
  const targetPos = word.mesh.position.clone().add(direction.multiplyScalar(randomRange(8, 15)));
  
  gsap.to(word.mesh.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1.5,
    ease: 'power2.out'
  });
  
  word.spiralAngle = randomRange(0, Math.PI * 2);
  word.spiralRadius = randomRange(3, 12);
  word.spiralHeight = randomRange(-8, 8);
}

export function disposeWordPool(): void {
  for (const word of words) {
    scene.remove(word.mesh);
    word.mesh.geometry.dispose();
    const material = word.mesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
  }
  words = [];
}
