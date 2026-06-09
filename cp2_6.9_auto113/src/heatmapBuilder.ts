import * as THREE from 'three';
import type { GeoPoint } from './dataLoader';
import { getTemperatureColorHex } from './dataLoader';

const EARTH_RADIUS = 5;
const GRID_LAT_STEP = 5;
const GRID_LON_STEP = 5;

interface HeatmapCell {
  mesh: THREE.Mesh;
  targetTemp: number;
  currentTemp: number;
  lat: number;
  lon: number;
}

export class HeatmapBuilder {
  public group: THREE.Group;
  private cells: HeatmapCell[] = [];
  private globalOpacity = 0.65;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'heatmap';
  }

  public build(geoPoints: GeoPoint[]): void {
    this.clear();

    for (let lat = -85; lat <= 85; lat += GRID_LAT_STEP) {
      for (let lon = -180; lon <= 175; lon += GRID_LON_STEP) {
        const temp = this.interpolateTemperature(lat, lon, geoPoints);
        const cell = this.createCell(lat, lon, temp);
        if (cell) {
          this.group.add(cell.mesh);
          this.cells.push(cell);
        }
      }
    }
  }

  private clear(): void {
    this.cells.forEach(cell => {
      this.group.remove(cell.mesh);
      cell.mesh.geometry.dispose();
      (cell.mesh.material as THREE.Material).dispose();
    });
    this.cells = [];
  }

  private interpolateTemperature(lat: number, lon: number, points: GeoPoint[]): number {
    let weightedSum = 0;
    let weightTotal = 0;
    const maxDist = 30;

    points.forEach(point => {
      const dLat = lat - point.lat;
      let dLon = lon - point.lon;
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;

      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist < maxDist) {
        const weight = Math.pow(1 - dist / maxDist, 2);
        weightedSum += point.temperature * weight;
        weightTotal += weight;
      }
    });

    if (weightTotal > 0) {
      return weightedSum / weightTotal;
    }

    const latFactor = 1 - Math.abs(lat) / 90;
    return -10 + latFactor * 40 + (Math.random() - 0.5) * 4;
  }

  private createCell(lat: number, lon: number, temp: number): HeatmapCell | null {
    const halfLat = GRID_LAT_STEP / 2;
    const halfLon = GRID_LON_STEP / 2;

    const corners = [
      { lat: lat - halfLat, lon: lon - halfLon },
      { lat: lat + halfLat, lon: lon - halfLon },
      { lat: lat + halfLat, lon: lon + halfLon },
      { lat: lat - halfLat, lon: lon + halfLon }
    ];

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    corners.forEach((corner, i) => {
      const pos = this.latLonToVector(corner.lat, corner.lon, EARTH_RADIUS * 1.005);
      vertices.push(pos.x, pos.y, pos.z);
      uvs.push(i % 2, Math.floor(i / 2));
    });

    indices.push(0, 1, 2, 0, 2, 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const colorHex = getTemperatureColorHex(temp);

    const material = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: this.globalOpacity * 0.55,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'heatmap-cell' };

    return {
      mesh,
      targetTemp: temp,
      currentTemp: temp,
      lat,
      lon
    };
  }

  private latLonToVector(lat: number, lon: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  }

  public setGlobalOpacity(opacity: number): void {
    this.globalOpacity = Math.max(0.1, Math.min(1, opacity));
  }

  public getGlobalOpacity(): number {
    return this.globalOpacity;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    const breath = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin((elapsedTime * Math.PI * 2) / 3));
    const baseOpacity = this.globalOpacity * breath;

    this.cells.forEach(cell => {
      const diff = cell.targetTemp - cell.currentTemp;
      cell.currentTemp += diff * Math.min(1, deltaTime * 2);

      const colorHex = getTemperatureColorHex(cell.currentTemp);
      (cell.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      (cell.mesh.material as THREE.MeshBasicMaterial).opacity = baseOpacity * (0.6 + 0.4 * Math.sin(elapsedTime * 1.5 + cell.lon * 0.02));
    });
  }

  public adjustOpacity(delta: number): void {
    this.setGlobalOpacity(this.globalOpacity + delta);
  }
}
