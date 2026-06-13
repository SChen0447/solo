import * as THREE from 'three';

export interface CubeData {
  index: number;
  gridX: number;
  gridY: number;
  gridZ: number;
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  distance: number;
  baseScale: number;
  currentScale: number;
  spinSpeed: number;
  spinAxis: THREE.Vector3;
  rotation: THREE.Euler;
  breathOffset: number;
  pulseHighlightTime: number;
}

export class DataManager {
  private mousePosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private nearestDistance: number = 0;
  
  private cubeDataArray: CubeData[] = [];
  private gridSize: number = 10;
  private spacing: number = 1.2;
  private cubeSize: number = 0.4;
  
  constructor() {
    this.initializeCubeData();
  }
  
  private initializeCubeData(): void {
    const halfGrid = (this.gridSize - 1) / 2;
    const offset = -halfGrid * this.spacing;
    
    let index = 0;
    
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let z = 0; z < this.gridSize; z++) {
          const baseX = offset + x * this.spacing;
          const baseY = offset + y * this.spacing;
          const baseZ = offset + z * this.spacing;
          
          const spinAxis = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
          ).normalize();
          
          const cubeData: CubeData = {
            index,
            gridX: x,
            gridY: y,
            gridZ: z,
            basePosition: new THREE.Vector3(baseX, baseY, baseZ),
            currentPosition: new THREE.Vector3(baseX, baseY, baseZ),
            distance: 0,
            baseScale: this.cubeSize,
            currentScale: this.cubeSize,
            spinSpeed: 0.005,
            spinAxis,
            rotation: new THREE.Euler(
              Math.random() * Math.PI * 2,
              Math.random() * Math.PI * 2,
              Math.random() * Math.PI * 2
            ),
            breathOffset: Math.random() * Math.PI * 2,
            pulseHighlightTime: 0
          };
          
          this.cubeDataArray.push(cubeData);
          index++;
        }
      }
    }
  }
  
  public updateMousePosition(x: number, y: number, z: number): void {
    this.mousePosition.set(x, y, z);
    this.updateDistances();
  }
  
  private updateDistances(): void {
    let minDist = Infinity;
    
    for (const cubeData of this.cubeDataArray) {
      const dx = cubeData.currentPosition.x - this.mousePosition.x;
      const dy = cubeData.currentPosition.y - this.mousePosition.y;
      const dz = cubeData.currentPosition.z - this.mousePosition.z;
      
      cubeData.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (cubeData.distance < minDist) {
        minDist = cubeData.distance;
      }
    }
    
    this.nearestDistance = minDist;
  }
  
  public getMousePosition(): THREE.Vector3 {
    return this.mousePosition.clone();
  }
  
  public getNearestDistance(): number {
    return this.nearestDistance;
  }
  
  public getCubeDataArray(): CubeData[] {
    return this.cubeDataArray;
  }
  
  public getGridSize(): number {
    return this.gridSize;
  }
  
  public getCubeCount(): number {
    return this.cubeDataArray.length;
  }
  
  public getCubeSize(): number {
    return this.cubeSize;
  }
  
  public getSpacing(): number {
    return this.spacing;
  }
  
  public updateCubePositions(elapsedTime: number): void {
    const breathAmplitude = 0.1;
    const breathPeriod = 3;
    
    for (const cubeData of this.cubeDataArray) {
      const breathPhase = (elapsedTime / breathPeriod) * Math.PI * 2 + cubeData.breathOffset;
      const yOffset = Math.sin(breathPhase) * breathAmplitude;
      
      cubeData.currentPosition.set(
        cubeData.basePosition.x,
        cubeData.basePosition.y + yOffset,
        cubeData.basePosition.z
      );
    }
    
    this.updateDistances();
  }
  
  public setPulseHighlight(index: number): void {
    if (index >= 0 && index < this.cubeDataArray.length) {
      this.cubeDataArray[index].pulseHighlightTime = 1.5;
    }
  }
  
  public updatePulseHighlights(delta: number): void {
    for (const cubeData of this.cubeDataArray) {
      if (cubeData.pulseHighlightTime > 0) {
        cubeData.pulseHighlightTime -= delta;
        if (cubeData.pulseHighlightTime < 0) {
          cubeData.pulseHighlightTime = 0;
        }
      }
    }
  }
}
