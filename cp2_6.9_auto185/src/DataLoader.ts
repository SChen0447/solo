import * as THREE from 'three';

export type DatasetType = 'heart' | 'lungs' | 'skeleton';

export interface VolumeData {
  width: number;
  height: number;
  depth: number;
  data: Uint8Array;
  dataTexture: THREE.Data3DTexture;
  type: DatasetType;
}

export interface SliceData {
  width: number;
  height: number;
  data: Uint8Array;
  plane: 'sagittal' | 'coronal' | 'axial';
  index: number;
}

const GRID_SIZE = 128;

export class DataLoader {
  private volumeCache: Map<DatasetType, VolumeData> = new Map();

  public async loadVolumeData(type: DatasetType): Promise<VolumeData> {
    if (this.volumeCache.has(type)) {
      return this.volumeCache.get(type)!;
    }

    const data = this.generateSyntheticData(type);
    const dataTexture = this.createDataTexture(data);

    const volumeData: VolumeData = {
      width: GRID_SIZE,
      height: GRID_SIZE,
      depth: GRID_SIZE,
      data,
      dataTexture,
      type
    };

    this.volumeCache.set(type, volumeData);
    return volumeData;
  }

  private generateSyntheticData(type: DatasetType): Uint8Array {
    const data = new Uint8Array(GRID_SIZE * GRID_SIZE * GRID_SIZE);
    const center = GRID_SIZE / 2;

    for (let z = 0; z < GRID_SIZE; z++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const idx = (z * GRID_SIZE * GRID_SIZE) + (y * GRID_SIZE) + x;
          data[idx] = this.calculateVoxelValue(x, y, z, center, type);
        }
      }
    }

    return data;
  }

  private calculateVoxelValue(x: number, y: number, z: number, center: number, type: DatasetType): number {
    const dx = x - center;
    const dy = y - center;
    const dz = z - center;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distFromCenter > GRID_SIZE * 0.48) {
      return 0;
    }

    let baseValue = 30 + Math.random() * 10;

    switch (type) {
      case 'heart':
        baseValue = this.generateHeartData(x, y, z, center, baseValue);
        break;
      case 'lungs':
        baseValue = this.generateLungsData(x, y, z, center, baseValue);
        break;
      case 'skeleton':
        baseValue = this.generateSkeletonData(x, y, z, center, baseValue);
        break;
    }

    return Math.min(255, Math.max(0, Math.floor(baseValue)));
  }

  private generateHeartData(x: number, y: number, z: number, center: number, base: number): number {
    const dx = x - center;
    const dy = y - center + 5;
    const dz = z - center;

    const heartDist = Math.sqrt(
      Math.pow(dx / 28, 2) +
      Math.pow(dy / 35, 2) +
      Math.pow(dz / 25, 2)
    );

    if (heartDist < 1.0) {
      const muscleNoise = Math.sin(x * 0.3) * Math.cos(y * 0.2) * 5;
      if (heartDist < 0.6) {
        return 180 + muscleNoise + Math.random() * 15;
      }
      return 120 + muscleNoise + Math.random() * 20;
    }

    const aortaDx = x - center;
    const aortaDy = y - center - 25;
    const aortaDz = z - center;
    const aortaDist = Math.sqrt(aortaDx * aortaDx + aortaDy * aortaDy * 0.5 + aortaDz * aortaDz);

    if (aortaDist < 12 && y > center - 5) {
      return 140 + Math.random() * 20;
    }

    return base + Math.random() * 5;
  }

  private generateLungsData(x: number, y: number, z: number, center: number, base: number): number {
    const dx = x - center;
    const dy = y - center + 5;
    const dz = z - center;

    const leftLung = Math.sqrt(
      Math.pow((dx + 18) / 22, 2) +
      Math.pow(dy / 35, 2) +
      Math.pow(dz / 28, 2)
    );

    const rightLung = Math.sqrt(
      Math.pow((dx - 18) / 22, 2) +
      Math.pow(dy / 35, 2) +
      Math.pow(dz / 28, 2)
    );

    const inLung = Math.min(leftLung, rightLung) < 1.0;

    if (inLung) {
      const vesselNoise = Math.sin(x * 0.4 + z * 0.3) * Math.cos(y * 0.25) * 20;
      const bronchialPattern = Math.abs(Math.sin(x * 0.15) * Math.cos(z * 0.15)) * 30;

      if (Math.min(leftLung, rightLung) < 0.3) {
        return 80 + vesselNoise + bronchialPattern + Math.random() * 15;
      }
      return 20 + vesselNoise * 0.3 + Math.random() * 10;
    }

    const tracheaDx = x - center;
    const tracheaDy = y - center - 30;
    const tracheaDist = Math.sqrt(tracheaDx * tracheaDx + tracheaDy * tracheaDy);

    if (tracheaDist < 8 && y > center - 10) {
      return 100 + Math.random() * 20;
    }

    return base + Math.random() * 8;
  }

  private generateSkeletonData(x: number, y: number, z: number, center: number, base: number): number {
    let value = base;

    const spineDx = x - center;
    const spineDz = z - center;
    const spineDist = Math.sqrt(spineDx * spineDx + spineDz * spineDz);

    if (spineDist < 10 && y > center - 50 && y < center + 40) {
      const vertebraNoise = Math.sin(y * 0.4) * 15;
      value = 220 + vertebraNoise + Math.random() * 25;
    }

    const ribY = y - center + 10;
    if (Math.abs(ribY) < 45) {
      const ribCurve = Math.sqrt(
        Math.pow((x - center) / 42, 2) +
        Math.pow((z - center) / 30, 2)
      );
      const ribThickness = Math.abs(Math.sin(ribY * 0.35)) * 0.08 + 0.92;

      if (ribCurve > ribThickness - 0.08 && ribCurve < ribThickness + 0.08) {
        value = 200 + Math.random() * 30;
      }
    }

    const skullDist = Math.sqrt(
      Math.pow((x - center) / 35, 2) +
      Math.pow((y - center - 40) / 32, 2) +
      Math.pow((z - center) / 35, 2)
    );

    if (skullDist > 0.85 && skullDist < 1.0) {
      value = 230 + Math.random() * 20;
    }

    if (skullDist < 0.7 && y > center + 35) {
      const sinusNoise = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 30;
      value = Math.max(value, 100 + sinusNoise + Math.random() * 20);
    }

    const pelvisDy = y - center + 45;
    if (Math.abs(pelvisDy) < 15) {
      const pelvisDist = Math.sqrt(
        Math.pow((x - center) / 30, 2) +
        Math.pow((z - center) / 25, 2)
      );
      if (pelvisDist > 0.7 && pelvisDist < 1.0) {
        value = 195 + Math.random() * 30;
      }
    }

    const leftFemurDx = x - center + 18;
    const leftFemurDy = y - center + 60;
    const leftFemurDz = z - center;
    const leftFemurDist = Math.sqrt(leftFemurDx * leftFemurDx + leftFemurDz * leftFemurDz);

    if (leftFemurDist < 9 && leftFemurDy < 0 && leftFemurDy > -30) {
      value = 210 + Math.random() * 30;
    }

    const rightFemurDx = x - center - 18;
    const rightFemurDy = y - center + 60;
    const rightFemurDz = z - center;
    const rightFemurDist = Math.sqrt(rightFemurDx * rightFemurDx + rightFemurDz * rightFemurDz);

    if (rightFemurDist < 9 && rightFemurDy < 0 && rightFemurDy > -30) {
      value = 210 + Math.random() * 30;
    }

    return Math.min(255, value);
  }

  private createDataTexture(data: Uint8Array): THREE.Data3DTexture {
    const texture = new THREE.Data3DTexture(data as unknown as BufferSource, GRID_SIZE, GRID_SIZE, GRID_SIZE);
    texture.format = THREE.RedFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  }

  public getSlice(volume: VolumeData, plane: 'sagittal' | 'coronal' | 'axial', index: number): SliceData {
    const clampedIndex = Math.max(0, Math.min(index,
      plane === 'sagittal' ? volume.width - 1 :
      plane === 'coronal' ? volume.height - 1 :
      volume.depth - 1
    ));

    let sliceData: Uint8Array;
    let width: number;
    let height: number;

    if (plane === 'sagittal') {
      width = volume.height;
      height = volume.depth;
      sliceData = new Uint8Array(width * height);
      for (let z = 0; z < volume.depth; z++) {
        for (let y = 0; y < volume.height; y++) {
          const srcIdx = (z * volume.height * volume.width) + (y * volume.width) + clampedIndex;
          const dstIdx = (z * width) + y;
          sliceData[dstIdx] = volume.data[srcIdx];
        }
      }
    } else if (plane === 'coronal') {
      width = volume.width;
      height = volume.depth;
      sliceData = new Uint8Array(width * height);
      for (let z = 0; z < volume.depth; z++) {
        for (let x = 0; x < volume.width; x++) {
          const srcIdx = (z * volume.height * volume.width) + (clampedIndex * volume.width) + x;
          const dstIdx = (z * width) + x;
          sliceData[dstIdx] = volume.data[srcIdx];
        }
      }
    } else {
      width = volume.width;
      height = volume.height;
      sliceData = new Uint8Array(width * height);
      for (let y = 0; y < volume.height; y++) {
        for (let x = 0; x < volume.width; x++) {
          const srcIdx = (clampedIndex * volume.height * volume.width) + (y * volume.width) + x;
          const dstIdx = (y * width) + x;
          sliceData[dstIdx] = volume.data[srcIdx];
        }
      }
    }

    return {
      width,
      height,
      data: sliceData,
      plane,
      index: clampedIndex
    };
  }

  public getVoxelValue(volume: VolumeData, x: number, y: number, z: number): number {
    if (x < 0 || x >= volume.width || y < 0 || y >= volume.height || z < 0 || z >= volume.depth) {
      return 0;
    }
    const idx = Math.floor(z) * volume.height * volume.width + Math.floor(y) * volume.width + Math.floor(x);
    return volume.data[idx];
  }
}
