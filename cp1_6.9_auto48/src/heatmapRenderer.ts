import * as THREE from 'three';
import * as d3 from 'd3';
import type { CityBlock, BlockHourData, CityDataset } from './dataLoader';
import { getBlockAtHour } from './dataLoader';

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export interface TrafficStatus {
  from: BlockHourData;
  to: BlockHourData;
  startTime: number;
  duration: number;
}

const POP_MAX = 5000;
const HEIGHT_MAX = 20;
const GRID_UNIT = 10;
const BLOCK_BASE = 2;
const EDGE_GLOW = 0x4ec8ff;

const pollutionColorScale = d3.scaleLinear<THREE.Color>()
  .domain([0, 75, 150, 220])
  .range([
    new THREE.Color(0x3a7bd5), new THREE.Color(0xf09050), new THREE.Color(0xe65050), new THREE.Color(0x8b0000)]);

const getTrafficColor = (traffic: number): THREE.Color => {
  if (traffic < 30) return new THREE.Color(0x50c878);
  if (traffic <= 60) return new THREE.Color(0xf0c850);
  return new THREE.Color(0xe65050);
};

const populationToHeight = (pop: number): number => {
  const ratio = Math.min(pop / POP_MAX, 1);
  return ratio * HEIGHT_MAX;
};

const lerpHourData = (a: BlockHourData, b: BlockHourData, t: number): BlockHourData => ({
  population: a.population + (b.population - a.population) * t,
  traffic: a.traffic + (b.traffic - a.traffic) * t,
  pm25: a.pm25 + (b.pm25 - a.pm25) * t,
});

export class HeatmapRenderer {
  private scene: THREE.Scene;
  private gridSize: number;
  private dataset: CityDataset;

  private gridHelper!: THREE.GridHelper;
  private groundPlane!: THREE.Mesh;
  private columnsMesh!: THREE.InstancedMesh;
  private edgesMesh!: THREE.InstancedMesh;
  private trafficDots!: THREE.InstancedMesh;

  private dummy = new THREE.Object3D();
  private tempColor = new THREE.Color();

  private blockAnimations: Map<string, TrafficStatus> = new Map();
  private blockPositions: Map<string, THREE.Vector3> = new Map();

  private currentHour: number = 8;
  private _onBlockClick: ((block: CityBlock, screenPos: THREE.Vector2, worldPos: THREE.Vector3) => void) | null = null;

  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();

  private hoveredInstanceId: number = -1;
  private hoverHighlight!: THREE.Mesh;

  private glowTime = 0;

  constructor(scene: THREE.Scene, dataset: CityDataset) {
    this.scene = scene;
    this.dataset = dataset;
    this.gridSize = dataset.gridSize;
    this.initScene();
  }

  private initScene(): void {
    const totalSize = this.gridSize * GRID_UNIT;
    const half = totalSize / 2;

    this.gridHelper = new THREE.GridHelper(
      totalSize,
      this.gridSize,
      0x6080a0,
      0x406080
    );
    this.gridHelper.position.y = 0.01;
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.6;
    this.scene.add(this.gridHelper);

    const groundGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x182238,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.groundPlane);

    const columnGeo = new THREE.BoxGeometry(BLOCK_BASE, 1, BLOCK_BASE);
    const columnMat = new THREE.MeshPhongMaterial({
      color: 0x3a7bd5,
      transparent: true,
      opacity: 0.92,
      shininess: 60,
      emissive: 0x0a1528,
      emissiveIntensity: 0.3
    });

    const count = this.dataset.blocks.length;

    this.columnsMesh = new THREE.InstancedMesh(columnGeo, columnMat, count);
    this.columnsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.columnsMesh);

    const edgeGeo = new THREE.EdgesGeometry(columnGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: EDGE_GLOW,
      transparent: true,
      opacity: 0.85
    });
    this.edgesMesh = new THREE.InstancedMesh(edgeGeo, edgeMat, count);
    this.edgesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.edgesMesh);

    const dotGeo = new THREE.BoxGeometry(0.9, 0.4, 0.9);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x50c878,
      transparent: true,
      opacity: 0.95
    });
    this.trafficDots = new THREE.InstancedMesh(dotGeo, dotMat, count);
    this.trafficDots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.trafficDots);

    const hlGeo = new THREE.BoxGeometry(BLOCK_BASE * 1.05, 0.2, BLOCK_BASE * 1.05);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25
    });
    this.hoverHighlight = new THREE.Mesh(hlGeo, hlMat);
    this.hoverHighlight.visible = false;
    this.scene.add(this.hoverHighlight);

    this.dataset.blocks.forEach((block, idx) => {
      const pos = this.gridToWorld(block.gridX, block.gridZ);
      this.blockPositions.set(block.id, pos.clone());

      const data = getBlockAtHour(block, this.currentHour);
      this.updateInstance(idx, pos, data, data);

      this.blockAnimations.set(block.id, {
        from: { ...data },
        to: { ...data },
        startTime: performance.now(),
        duration: 0
      });
    });

    this.columnsMesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    this.trafficDots.instanceColor!.setUsage(THREE.DynamicDrawUsage);
  }

  private gridToWorld(gx: number, gz: number): THREE.Vector3 {
    const totalSize = this.gridSize * GRID_UNIT;
    const half = totalSize / 2;
    return new THREE.Vector3(
      -half + gx * GRID_UNIT + GRID_UNIT / 2,
      0,
      -half + gz * GRID_UNIT + GRID_UNIT / 2
    );
  }

  private updateInstance(
    idx: number, pos: THREE.Vector3, data: BlockHourData, _target: BlockHourData): void {
    const height = populationToHeight(data.population);
    const h = Math.max(height, 0.05);

    this.dummy.position.set(pos.x, h / 2, pos.z);
    this.dummy.scale.set(1, h, 1);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    this.columnsMesh.setMatrixAt(idx, this.dummy.matrix);
    this.edgesMesh.setMatrixAt(idx, this.dummy.matrix);

    const color = pollutionColorScale(data.pm25);
    this.tempColor.copy(color);
    this.columnsMesh.setColorAt(idx, this.tempColor);

    this.dummy.position.set(pos.x, h + 0.3, pos.z);
    this.dummy.scale.set(1, 1, 1);
    this.dummy.updateMatrix();
    this.trafficDots.setMatrixAt(idx, this.dummy.matrix);
    const tColor = getTrafficColor(data.traffic);
    this.tempColor.copy(tColor);
    this.trafficDots.setColorAt(idx, this.tempColor);
  }

  private interpolateInstance(
    idx: number, pos: THREE.Vector3, data: BlockHourData
  ): void {
    this.updateInstance(idx, pos, data, data);
  }

  setOnBlockClick(cb: (block: CityBlock, screenPos: THREE.Vector2, worldPos: THREE.Vector3) => void): void {
    this._onBlockClick = cb;
  }

  animateToHour(hour: number, duration: number = 500): void {
    const now = performance.now();
    this.dataset.blocks.forEach((block) => {
      const prev = this.blockAnimations.get(block.id);
      const currentData = prev
        ? lerpHourData(prev.from, prev.to, easeOutCubic(Math.min((now - prev.startTime) / prev.duration, 1)))
        : getBlockAtHour(block, this.currentHour);

      this.blockAnimations.set(block.id, {
        from: currentData,
        to: getBlockAtHour(block, hour),
        startTime: now,
        duration
      });
    });
    this.currentHour = hour;
  }

  refreshData(newDataset: CityDataset, duration: number = 1000): void {
    const now = performance.now();
    this.dataset = newDataset;

    newDataset.blocks.forEach((block, idx) => {
      const pos = this.gridToWorld(block.gridX, block.gridZ);
      this.blockPositions.set(block.id, pos.clone());

      const prev = this.blockAnimations.get(block.id);
      const prevData = prev
        ? lerpHourData(prev.from, prev.to, easeOutCubic(Math.min((now - prev.startTime) / prev.duration, 1)))
        : getBlockAtHour(block, this.currentHour);

      this.blockAnimations.set(block.id, {
        from: prevData,
        to: getBlockAtHour(block, this.currentHour),
        startTime: now,
        duration
      });
    });
  }

  handlePointer(mouse: { clientX: number; clientY: number }, domRect: DOMRect): void {
    this.mouseNDC.x = ((mouse.clientX - domRect.left) / domRect.width) * 2 - 1;
    this.mouseNDC.y = -((mouse.clientY - domRect.top) / domRect.height) * 2 + 1;
  }

  updateHover(camera: THREE.Camera): void {
    this.raycaster.setFromCamera(this.mouseNDC, camera);
    const hits = this.raycaster.intersectObject(this.columnsMesh);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      this.hoveredInstanceId = hits[0].instanceId;
      const block = this.dataset.blocks[this.hoveredInstanceId];
      const pos = this.blockPositions.get(block.id)!;
      const data = this.getCurrentInterpolatedData(block);
      const h = populationToHeight(data.population);
      this.hoverHighlight.position.set(pos.x, h + 0.15, pos.z);
      this.hoverHighlight.visible = true;
    } else {
      this.hoveredInstanceId = -1;
      this.hoverHighlight.visible = false;
    }
  }

  handleClick(camera: THREE.Camera, domRect: DOMRect): boolean {
    this.raycaster.setFromCamera(this.mouseNDC, camera);
    const hits = this.raycaster.intersectObject(this.columnsMesh);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      const idx = hits[0].instanceId;
      const block = this.dataset.blocks[idx];
      const pos = this.blockPositions.get(block.id)!;
      const data = this.getCurrentInterpolatedData(block);
      const worldPos = new THREE.Vector3(pos.x, populationToHeight(data.population) + 2, pos.z);
      const projected = worldPos.clone().project(camera);
      const screenPos = new THREE.Vector2(
        (projected.x * 0.5 + 0.5) * domRect.width + domRect.left,
        (-projected.y * 0.5 + 0.5) * domRect.height + domRect.top
      );
      if (this._onBlockClick) {
        this._onBlockClick(block, screenPos, worldPos);
      }
      return true;
    }
    return false;
  }

  private getCurrentInterpolatedData(block: CityBlock): BlockHourData {
    const status = this.blockAnimations.get(block.id);
    if (!status) return getBlockAtHour(block, this.currentHour);
    const now = performance.now();
    const t = status.duration > 0 ? Math.min((now - status.startTime) / status.duration, 1) : 1;
    return lerpHourData(status.from, status.to, easeOutCubic(t));
  }

  getBlockDataInterpolated(block: CityBlock): BlockHourData {
    return this.getCurrentInterpolatedData(block);
  }

  update(delta: number): void {
    this.glowTime += delta;
    const glowPulse = 0.85 + 0.15 * Math.sin(this.glowTime * 2.2);

    const now = performance.now();

    this.dataset.blocks.forEach((block, idx) => {
      const pos = this.blockPositions.get(block.id)!;
      const data = this.getCurrentInterpolatedData(block);
      this.interpolateInstance(idx, pos, data);
    });

    const dotMat = this.trafficDots.material as THREE.MeshBasicMaterial;
    dotMat.opacity = glowPulse;

    if (this.hoverHighlight.visible) {
      const hlMat = this.hoverHighlight.material as THREE.MeshBasicMaterial;
      hlMat.opacity = 0.15 + 0.1 * Math.sin(this.glowTime * 3);
    }

    this.columnsMesh.instanceMatrix.needsUpdate = true;
    this.edgesMesh.instanceMatrix.needsUpdate = true;
    this.trafficDots.instanceMatrix.needsUpdate = true;
    if (this.columnsMesh.instanceColor) this.columnsMesh.instanceColor.needsUpdate = true;
    if (this.trafficDots.instanceColor) this.trafficDots.instanceColor.needsUpdate = true;
  }

  getFocusPosition(blockId: string): THREE.Vector3 | null {
    const pos = this.blockPositions.get(blockId);
    if (!pos) return null;
    const block = this.dataset.blocks.find(b => b.id === blockId);
    if (!block) return null;
    const data = this.getCurrentInterpolatedData(block);
    return new THREE.Vector3(pos.x, populationToHeight(data.population) / 2, pos.z);
  }

  getBlockByIndex(index: number): CityBlock | null {
    return this.dataset.blocks[index] || null;
  }

  dispose(): void {
    this.scene.remove(this.gridHelper);
    this.scene.remove(this.groundPlane);
    this.scene.remove(this.columnsMesh);
    this.scene.remove(this.edgesMesh);
    this.scene.remove(this.trafficDots);
    this.scene.remove(this.hoverHighlight);
    this.columnsMesh.geometry.dispose();
    (this.columnsMesh.material as THREE.Material).dispose();
  }
}
