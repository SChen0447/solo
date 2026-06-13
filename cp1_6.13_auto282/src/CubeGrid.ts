import * as THREE from 'three';
import { DataManager, CubeData } from './DataManager.js';
import { ColorMapper } from './ColorMapper.js';

interface CubeMeshPair {
  mesh: THREE.Mesh;
  border: THREE.LineSegments;
  data: CubeData;
}

export class CubeGrid {
  private scene: THREE.Scene;
  private dataManager: DataManager;
  
  private group: THREE.Group;
  private cubePairs: CubeMeshPair[] = [];
  
  private rotationSpeed: number = 0.2;
  private rotationSpeedNormal: number = 0.2;
  private rotationSpeedDragging: number = 0.05;
  
  private pulseRing: THREE.Mesh | null = null;
  private pulseActive: boolean = false;
  private pulseTime: number = 0;
  private pulseDuration: number = 1;
  private pulseMaxRadius: number = 8;
  private pulseOrigin: THREE.Vector3 = new THREE.Vector3();
  
  private pulseAlphaTime: number = 0;
  private pulseAlphaDuration: number = 1;
  private pulseAlphaActive: boolean = false;
  
  private isDragging: boolean = false;
  
  private readonly baseOpacity: number = 0.6;
  private readonly pulseMinOpacity: number = 0.2;

  constructor(scene: THREE.Scene, dataManager: DataManager) {
    this.scene = scene;
    this.dataManager = dataManager;
    
    this.group = new THREE.Group();
    this.scene.add(this.group);
    
    this.createCubes();
    this.createPulseRing();
  }
  
  private createCubes(): void {
    const cubeDataArray = this.dataManager.getCubeDataArray();
    const cubeSize = this.dataManager.getCubeSize();
    
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    
    const edges = new THREE.EdgesGeometry(geometry);
    
    for (const cubeData of cubeDataArray) {
      const material = new THREE.MeshPhongMaterial({
        color: ColorMapper.getInitialColor(),
        transparent: true,
        opacity: this.baseOpacity,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const borderMaterial = new THREE.LineBasicMaterial({
        color: ColorMapper.getInitialColor(),
        transparent: true,
        opacity: 0.3
      });
      
      const border = new THREE.LineSegments(edges, borderMaterial);
      
      mesh.position.copy(cubeData.basePosition);
      border.position.copy(cubeData.basePosition);
      
      mesh.rotation.copy(cubeData.rotation);
      border.rotation.copy(cubeData.rotation);
      
      this.group.add(mesh);
      this.group.add(border);
      
      this.cubePairs.push({ mesh, border, data: cubeData });
    }
  }
  
  private createPulseRing(): void {
    const ringGeometry = new THREE.RingGeometry(0, 0.5, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x48dbfb,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    
    this.pulseRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.pulseRing.visible = false;
    this.scene.add(this.pulseRing);
  }
  
  public setIsDragging(dragging: boolean): void {
    this.isDragging = dragging;
    this.rotationSpeed = dragging ? this.rotationSpeedDragging : this.rotationSpeedNormal;
  }
  
  public triggerPulse(x: number, y: number, z: number): void {
    this.pulseOrigin.set(x, y, z);
    this.pulseActive = true;
    this.pulseTime = 0;
    
    this.pulseAlphaActive = true;
    this.pulseAlphaTime = 0;
    
    if (this.pulseRing) {
      this.pulseRing.position.set(x, y, z);
      this.pulseRing.visible = true;
      this.pulseRing.scale.set(1, 1, 1);
      (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = 0.6;
    }
  }
  
  public update(delta: number, elapsedTime: number): void {
    this.dataManager.updateCubePositions(elapsedTime);
    this.dataManager.updatePulseHighlights(delta);
    
    this.group.rotation.y += (this.rotationSpeed * Math.PI / 180) * delta;
    
    if (this.pulseActive) {
      this.updatePulse(delta);
    }
    
    if (this.pulseAlphaActive) {
      this.updatePulseAlpha(delta);
    }
    
    this.updateCubes(delta, elapsedTime);
  }
  
  private updatePulse(delta: number): void {
    this.pulseTime += delta;
    
    const t = this.pulseTime / this.pulseDuration;
    
    if (t >= 1) {
      this.pulseActive = false;
      if (this.pulseRing) {
        this.pulseRing.visible = false;
      }
      return;
    }
    
    const currentRadius = t * this.pulseMaxRadius;
    
    if (this.pulseRing) {
      const scale = currentRadius * 2;
      this.pulseRing.scale.set(scale, scale, 1);
      
      const opacity = 0.6 * (1 - t);
      (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
    
    this.checkPulseCollision(currentRadius);
  }
  
  private checkPulseCollision(currentRadius: number): void {
    const innerRadius = currentRadius - 0.5;
    const outerRadius = currentRadius + 0.5;
    
    for (const pair of this.cubePairs) {
      const worldPos = new THREE.Vector3();
      pair.mesh.getWorldPosition(worldPos);
      
      const dx = worldPos.x - this.pulseOrigin.x;
      const dy = worldPos.y - this.pulseOrigin.y;
      const dz = worldPos.z - this.pulseOrigin.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance >= innerRadius && distance <= outerRadius) {
        if (pair.data.pulseHighlightTime <= 0) {
          this.dataManager.setPulseHighlight(pair.data.index);
        }
      }
    }
  }
  
  private updatePulseAlpha(delta: number): void {
    this.pulseAlphaTime += delta;
    
    if (this.pulseAlphaTime >= this.pulseAlphaDuration) {
      this.pulseAlphaActive = false;
    }
  }
  
  private getPulseAlphaMultiplier(): number {
    if (!this.pulseAlphaActive) return 1;
    
    const t = this.pulseAlphaTime / this.pulseAlphaDuration;
    
    if (t < 0.5) {
      const k = t / 0.5;
      return 1 - k * (1 - this.pulseMinOpacity / this.baseOpacity);
    } else {
      const k = (t - 0.5) / 0.5;
      return this.pulseMinOpacity / this.baseOpacity + k * (1 - this.pulseMinOpacity / this.baseOpacity);
    }
  }
  
  private updateCubes(delta: number, elapsedTime: number): void {
    const alphaMultiplier = this.getPulseAlphaMultiplier();
    
    for (const pair of this.cubePairs) {
      const data = pair.data;
      
      pair.mesh.position.copy(data.currentPosition);
      pair.border.position.copy(data.currentPosition);
      
      const distance = data.distance;
      
      const targetScale = ColorMapper.mapDistanceToScale(distance);
      const scaleRatio = targetScale / this.dataManager.getCubeSize();
      pair.mesh.scale.setScalar(scaleRatio);
      pair.border.scale.setScalar(scaleRatio);
      
      const spinSpeed = ColorMapper.mapDistanceToSpinSpeed(distance);
      if (spinSpeed > 0) {
        const angle = spinSpeed * delta * 60;
        pair.mesh.rotateOnAxis(data.spinAxis, angle);
        pair.border.rotateOnAxis(data.spinAxis, angle);
      }
      
      let targetColor: THREE.Color;
      
      if (data.pulseHighlightTime > 0) {
        const highlightColor = ColorMapper.getPulseHighlightColor();
        const normalColor = ColorMapper.mapDistanceToColor(distance);
        
        const fadeT = Math.min(1, (1.5 - data.pulseHighlightTime) / 1.5);
        const highlightT = data.pulseHighlightTime > 1 ? 1 : data.pulseHighlightTime / 1;
        
        if (fadeT < 0.5) {
          targetColor = normalColor.clone().lerp(highlightColor, highlightT);
        } else {
          targetColor = highlightColor.clone().lerp(normalColor, 1 - data.pulseHighlightTime / 1.5);
        }
      } else {
        targetColor = ColorMapper.mapDistanceToColor(distance);
      }
      
      (pair.mesh.material as THREE.MeshPhongMaterial).color.copy(targetColor);
      (pair.border.material as THREE.LineBasicMaterial).color.copy(targetColor);
      
      const currentOpacity = this.baseOpacity * alphaMultiplier;
      (pair.mesh.material as THREE.MeshPhongMaterial).opacity = currentOpacity;
      (pair.border.material as THREE.LineBasicMaterial).opacity = currentOpacity * 0.5;
    }
  }
  
  public getGroup(): THREE.Group {
    return this.group;
  }
}
