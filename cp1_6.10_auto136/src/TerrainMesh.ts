import * as THREE from 'three';
import { ErosionUpdateResult } from './ErosionController';

export class TerrainMesh {
  private scene: THREE.Scene;
  private resolution: number;
  private size: number;

  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshStandardMaterial;
  private mesh: THREE.Mesh;

  private wireframeLayers: THREE.LineSegments[] = [];
  private waterFlowMesh: THREE.Mesh | null = null;
  private waterFlowGeometry: THREE.PlaneGeometry | null = null;

  private colorLow: THREE.Color = new THREE.Color(0x2d6a4f);
  private colorMid: THREE.Color = new THREE.Color(0x8b5a2b);
  private colorHigh: THREE.Color = new THREE.Color(0xd4a373);
  private colorRock: THREE.Color = new THREE.Color(0x7f8c8d);
  private colorVegetation: THREE.Color = new THREE.Color(0x27ae60);

  private colors: Float32Array;
  private positions: Float32Array;

  constructor(scene: THREE.Scene, resolution: number = 128, size: number = 20) {
    this.scene = scene;
    this.resolution = resolution;
    this.size = size;

    this.geometry = new THREE.PlaneGeometry(size, size, resolution - 1, resolution - 1);
    this.geometry.rotateX(-Math.PI / 2);

    this.positions = this.geometry.attributes.position.array as Float32Array;
    this.colors = new Float32Array(this.positions.length);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this.createWireframeLayers();
    this.createWaterFlowOverlay();
  }

  private createWireframeLayers(): void {
    const thicknesses = [0.008, 0.015, 0.025];
    const opacities = [0.15, 0.1, 0.06];
    const colors = [0x4a4a5a, 0x3a3a4a, 0x2a2a3a];

    for (let i = 0; i < 3; i++) {
      const wireGeo = new THREE.WireframeGeometry(this.geometry);
      const wireMat = new THREE.LineBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: opacities[i]
      });
      const wireframe = new THREE.LineSegments(wireGeo, wireMat);
      wireframe.position.y = thicknesses[i];
      this.wireframeLayers.push(wireframe);
      this.scene.add(wireframe);
    }
  }

  private createWaterFlowOverlay(): void {
    this.waterFlowGeometry = new THREE.PlaneGeometry(this.size, this.size, this.resolution - 1, this.resolution - 1);
    this.waterFlowGeometry.rotateX(-Math.PI / 2);

    const waterPositions = this.waterFlowGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < waterPositions.length / 3; i++) {
      waterPositions[i * 3 + 1] = 0.05;
    }

    const waterColors = new Float32Array(waterPositions.length);
    this.waterFlowGeometry.setAttribute('color', new THREE.BufferAttribute(waterColors, 3));

    const waterMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.waterFlowMesh = new THREE.Mesh(this.waterFlowGeometry, waterMaterial);
    this.scene.add(this.waterFlowMesh);
  }

  setResolution(resolution: number): void {
    this.resolution = resolution;

    for (const wf of this.wireframeLayers) {
      this.scene.remove(wf);
      wf.geometry.dispose();
      (wf.material as THREE.Material).dispose();
    }
    this.wireframeLayers = [];

    if (this.waterFlowMesh) {
      this.scene.remove(this.waterFlowMesh);
      this.waterFlowMesh.geometry.dispose();
      (this.waterFlowMesh.material as THREE.Material).dispose();
      this.waterFlowMesh = null;
    }

    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();

    this.geometry = new THREE.PlaneGeometry(this.size, this.size, resolution - 1, resolution - 1);
    this.geometry.rotateX(-Math.PI / 2);
    this.positions = this.geometry.attributes.position.array as Float32Array;
    this.colors = new Float32Array(this.positions.length);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this.createWireframeLayers();
    this.createWaterFlowOverlay();
  }

  update(updateResult: ErosionUpdateResult, isRainfallActive: boolean): void {
    const { heights, changeRates, waterFlow } = updateResult;

    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const idx = y * this.resolution + x;
        const geoIdx = idx * 3;
        this.positions[geoIdx + 1] = heights[idx];
      }
    }

    this.updateColors(heights, changeRates);

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.computeVertexNormals();

    for (let i = 0; i < this.wireframeLayers.length; i++) {
      const wf = this.wireframeLayers[i];
      this.scene.remove(wf);
      wf.geometry.dispose();
      const newWireGeo = new THREE.WireframeGeometry(this.geometry);
      wf.geometry = newWireGeo;
      this.scene.add(wf);
    }

    if (this.waterFlowMesh && this.waterFlowGeometry && isRainfallActive) {
      this.updateWaterFlow(heights, waterFlow);
      this.waterFlowMesh.visible = true;
    } else if (this.waterFlowMesh) {
      this.waterFlowMesh.visible = false;
    }
  }

  private updateColors(heights: Float32Array, changeRates: Float32Array): void {
    let minH = Infinity, maxH = -Infinity;
    for (let i = 0; i < heights.length; i++) {
      minH = Math.min(minH, heights[i]);
      maxH = Math.max(maxH, heights[i]);
    }
    const range = Math.max(0.001, maxH - minH);

    let maxChange = 0;
    for (let i = 0; i < changeRates.length; i++) {
      maxChange = Math.max(maxChange, changeRates[i]);
    }
    const changeThreshold = maxChange > 0 ? maxChange * 0.3 : 0.001;

    for (let i = 0; i < heights.length; i++) {
      const geoIdx = i * 3;
      const t = (heights[i] - minH) / range;

      let baseColor: THREE.Color;
      if (t < 0.4) {
        const localT = t / 0.4;
        baseColor = this.colorLow.clone().lerp(this.colorMid, localT);
      } else if (t < 0.75) {
        const localT = (t - 0.4) / 0.35;
        baseColor = this.colorMid.clone().lerp(this.colorHigh, localT);
      } else {
        baseColor = this.colorHigh.clone();
      }

      const erosionIntensity = Math.min(1, changeRates[i] / changeThreshold);
      if (erosionIntensity > 0.1) {
        const rockMix = erosionIntensity;
        const vegetationColor = this.getVegetationColor(t);
        const finalBase = baseColor.clone().lerp(vegetationColor, 0.4 * (1 - rockMix));
        const finalColor = finalBase.lerp(this.colorRock, rockMix * 0.7);
        this.colors[geoIdx] = finalColor.r;
        this.colors[geoIdx + 1] = finalColor.g;
        this.colors[geoIdx + 2] = finalColor.b;
      } else {
        const vegetationColor = this.getVegetationColor(t);
        const finalColor = baseColor.clone().lerp(vegetationColor, 0.5);
        this.colors[geoIdx] = finalColor.r;
        this.colors[geoIdx + 1] = finalColor.g;
        this.colors[geoIdx + 2] = finalColor.b;
      }
    }
  }

  private getVegetationColor(t: number): THREE.Color {
    if (t < 0.2) return new THREE.Color(0x1b4332);
    if (t < 0.5) return this.colorVegetation;
    if (t < 0.7) return new THREE.Color(0x52796f);
    return new THREE.Color(0x6c757d);
  }

  private updateWaterFlow(heights: Float32Array, waterFlow: Float32Array): void {
    if (!this.waterFlowGeometry) return;

    const waterPositions = this.waterFlowGeometry.attributes.position.array as Float32Array;
    const waterColors = this.waterFlowGeometry.attributes.color.array as Float32Array;

    let maxFlow = 0;
    for (let i = 0; i < waterFlow.length; i++) {
      maxFlow = Math.max(maxFlow, waterFlow[i]);
    }
    const flowScale = maxFlow > 0 ? 1 / maxFlow : 1;

    const blueStart = new THREE.Color(0x4a90d9);
    const purpleEnd = new THREE.Color(0x9b59b6);

    for (let i = 0; i < heights.length; i++) {
      const geoIdx = i * 3;
      waterPositions[geoIdx + 1] = heights[i] + 0.08;

      const flowIntensity = waterFlow[i] * flowScale;
      if (flowIntensity > 0.05) {
        const color = blueStart.clone().lerp(purpleEnd, flowIntensity);
        waterColors[geoIdx] = color.r;
        waterColors[geoIdx + 1] = color.g;
        waterColors[geoIdx + 2] = color.b;
        (this.waterFlowGeometry.attributes.color as THREE.BufferAttribute).setXYZ(i, color.r, color.g, color.b);
      } else {
        waterColors[geoIdx] = 0;
        waterColors[geoIdx + 1] = 0;
        waterColors[geoIdx + 2] = 0;
      }
    }

    this.waterFlowGeometry.attributes.position.needsUpdate = true;
    this.waterFlowGeometry.attributes.color.needsUpdate = true;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  dispose(): void {
    for (const wf of this.wireframeLayers) {
      this.scene.remove(wf);
      wf.geometry.dispose();
      (wf.material as THREE.Material).dispose();
    }
    if (this.waterFlowMesh) {
      this.scene.remove(this.waterFlowMesh);
      this.waterFlowMesh.geometry.dispose();
      (this.waterFlowMesh.material as THREE.Material).dispose();
    }
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
