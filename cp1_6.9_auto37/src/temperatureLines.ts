import * as THREE from 'three';
import { getTemperatureGrid, tempToColor, TempGrid } from './oceanData';
import { latLonToVector3, SPHERE_RADIUS } from './oceanParticles';

const CONTOUR_LEVELS = 12;
const TEMP_MIN = -2;
const TEMP_MAX = 30;
const TEMP_STEP = (TEMP_MAX - TEMP_MIN) / CONTOUR_LEVELS;
const CONTOUR_ELEVATION = 0.008;

export class TemperatureLines {
  private group: THREE.Group;
  private contourLines: THREE.LineSegments[] = [];
  private contourFills: THREE.Mesh[] = [];
  private visible: boolean = true;
  private currentMonth: number = 1;

  constructor() {
    this.group = new THREE.Group();
    this.createContours();
  }

  private createContours(): void {
    for (let i = 0; i < CONTOUR_LEVELS; i++) {
      const temp = TEMP_MIN + i * TEMP_STEP;
      const col = tempToColor(temp);

      const lineGeom = new THREE.BufferGeometry();
      const linePositions = new Float32Array(0);
      lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(col.r, col.g, col.b),
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      });

      const line = new THREE.LineSegments(lineGeom, lineMat);
      this.contourLines.push(line);
      this.group.add(line);
    }

    for (let i = 0; i < CONTOUR_LEVELS - 1; i++) {
      const temp1 = TEMP_MIN + i * TEMP_STEP;
      const temp2 = TEMP_MIN + (i + 1) * TEMP_STEP;
      const midTemp = (temp1 + temp2) / 2;
      const col = tempToColor(midTemp);

      const fillGeom = new THREE.BufferGeometry();
      const fillPositions = new Float32Array(0);
      fillGeom.setAttribute('position', new THREE.BufferAttribute(fillPositions, 3));

      const fillMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(col.r, col.g, col.b),
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const fill = new THREE.Mesh(fillGeom, fillMat);
      this.contourFills.push(fill);
      this.group.add(fill);
    }

    this.updateForMonth(1);
  }

  public updateForMonth(month: number): void {
    this.currentMonth = month;
    const grid = getTemperatureGrid(month);

    for (let i = 0; i < CONTOUR_LEVELS; i++) {
      const temp = TEMP_MIN + i * TEMP_STEP;
      this.updateContourLine(i, temp, grid);
    }

    for (let i = 0; i < CONTOUR_LEVELS - 1; i++) {
      const tempLow = TEMP_MIN + i * TEMP_STEP;
      const tempHigh = TEMP_MIN + (i + 1) * TEMP_STEP;
      this.updateContourFill(i, tempLow, tempHigh, grid);
    }
  }

  private updateContourLine(index: number, level: number, grid: TempGrid): void {
    const positions: number[] = [];

    for (let i = 0; i < grid.latSteps - 1; i++) {
      for (let j = 0; j < grid.lonSteps - 1; j++) {
        const lat0 = this.idxToLat(grid, i);
        const lat1 = this.idxToLat(grid, i + 1);
        const lon0 = this.idxToLon(grid, j);
        const lon1 = this.idxToLon(grid, j + 1);

        const t00 = grid.data[i][j];
        const t10 = grid.data[i + 1][j];
        const t01 = grid.data[i][j + 1];
        const t11 = grid.data[i + 1][j + 1];

        this.marchingSquare(
          positions, level,
          lat0, lon0, t00,
          lat1, lon0, t10,
          lat0, lon1, t01,
          lat1, lon1, t11
        );
      }
    }

    const posArr = new Float32Array(positions);
    const geom = this.contourLines[index].geometry;
    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geom.attributes.position.needsUpdate = true;
    geom.computeBoundingSphere();
  }

  private marchingSquare(
    positions: number[],
    level: number,
    lat0: number, lon0: number, t00: number,
    lat1: number, lon1: number, t10: number,
    lat0b: number, lon1b: number, t01: number,
    lat1b: number, lon1c: number, t11: number
  ): void {
    let code = 0;
    if (t00 > level) code |= 1;
    if (t10 > level) code |= 2;
    if (t11 > level) code |= 4;
    if (t01 > level) code |= 8;

    if (code === 0 || code === 15) return;

    const interp = (a: number, b: number, ta: number, tb: number): number => {
      if (Math.abs(tb - ta) < 0.001) return (a + b) / 2;
      return a + (level - ta) * (b - a) / (tb - ta);
    };

    const addPoint = (lat: number, lon: number) => {
      const v = latLonToVector3(lat, lon, SPHERE_RADIUS + CONTOUR_ELEVATION);
      positions.push(v.x, v.y, v.z);
    };

    switch (code) {
      case 1: case 14:
        addPoint(interp(lat0, lat1, t00, t10), lon0);
        addPoint(lat0, interp(lon0, lon1b, t00, t01));
        break;
      case 2: case 13:
        addPoint(interp(lat0, lat1, t00, t10), lon0);
        addPoint(lat1, interp(lon0, lon1c, t10, t11));
        break;
      case 3: case 12:
        addPoint(lat0, interp(lon0, lon1b, t00, t01));
        addPoint(lat1, interp(lon0, lon1c, t10, t11));
        break;
      case 4: case 11:
        addPoint(lat1, interp(lon0, lon1c, t10, t11));
        addPoint(interp(lat0b, lat1b, t01, t11), lon1b);
        break;
      case 5:
        addPoint(interp(lat0, lat1, t00, t10), lon0);
        addPoint(interp(lat0b, lat1b, t01, t11), lon1b);
        addPoint(lat0, interp(lon0, lon1b, t00, t01));
        addPoint(lat1, interp(lon0, lon1c, t10, t11));
        break;
      case 6: case 9:
        addPoint(interp(lat0, lat1, t00, t10), lon0);
        addPoint(interp(lat0b, lat1b, t01, t11), lon1b);
        break;
      case 7: case 8:
        addPoint(lat0, interp(lon0, lon1b, t00, t01));
        addPoint(interp(lat0b, lat1b, t01, t11), lon1b);
        break;
      case 10:
        addPoint(lat0, interp(lon0, lon1b, t00, t01));
        addPoint(interp(lat0, lat1, t00, t10), lon0);
        addPoint(interp(lat0b, lat1b, t01, t11), lon1b);
        addPoint(lat1, interp(lon0, lon1c, t10, t11));
        break;
    }
  }

  private updateContourFill(index: number, tempLow: number, tempHigh: number, grid: TempGrid): void {
    const positions: number[] = [];
    const indices: number[] = [];

    const latSteps = grid.latSteps * 2;
    const lonSteps = grid.lonSteps * 2;
    const latStepSize = (grid.latMax - grid.latMin) / (latSteps - 1);
    const lonStepSize = (grid.lonMax - grid.lonMin) / (lonSteps - 1);

    const sampleTemp = (lat: number, lon: number): number => {
      const fi = ((lat - grid.latMin) / (grid.latMax - grid.latMin)) * (grid.latSteps - 1);
      const fj = ((lon - grid.lonMin) / (grid.lonMax - grid.lonMin)) * (grid.lonSteps - 1);
      const i0 = Math.max(0, Math.min(grid.latSteps - 1, Math.floor(fi)));
      const j0 = Math.max(0, Math.min(grid.lonSteps - 1, Math.floor(fj)));
      const i1 = Math.min(grid.latSteps - 1, i0 + 1);
      const j1 = Math.min(grid.lonSteps - 1, j0 + 1);
      const di = fi - i0;
      const dj = fj - j0;
      return grid.data[i0][j0] * (1 - di) * (1 - dj) +
             grid.data[i1][j0] * di * (1 - dj) +
             grid.data[i0][j1] * (1 - di) * dj +
             grid.data[i1][j1] * di * dj;
    };

    let vertexCount = 0;

    for (let i = 0; i < latSteps - 1; i++) {
      for (let j = 0; j < lonSteps - 1; j++) {
        const lat0 = grid.latMin + i * latStepSize;
        const lat1 = grid.latMin + (i + 1) * latStepSize;
        const lon0 = grid.lonMin + j * lonStepSize;
        const lon1 = grid.lonMin + (j + 1) * lonStepSize;

        const t00 = sampleTemp(lat0, lon0);
        const t10 = sampleTemp(lat1, lon0);
        const t01 = sampleTemp(lat0, lon1);
        const t11 = sampleTemp(lat1, lon1);

        const avg = (t00 + t10 + t01 + t11) / 4;
        if (avg < tempLow || avg > tempHigh) continue;

        const v00 = latLonToVector3(lat0, lon0, SPHERE_RADIUS + CONTOUR_ELEVATION - 0.003);
        const v10 = latLonToVector3(lat1, lon0, SPHERE_RADIUS + CONTOUR_ELEVATION - 0.003);
        const v01 = latLonToVector3(lat0, lon1, SPHERE_RADIUS + CONTOUR_ELEVATION - 0.003);
        const v11 = latLonToVector3(lat1, lon1, SPHERE_RADIUS + CONTOUR_ELEVATION - 0.003);

        positions.push(
          v00.x, v00.y, v00.z,
          v10.x, v10.y, v10.z,
          v01.x, v01.y, v01.z,
          v11.x, v11.y, v11.z
        );

        indices.push(
          vertexCount, vertexCount + 1, vertexCount + 2,
          vertexCount + 1, vertexCount + 3, vertexCount + 2
        );

        vertexCount += 4;
      }
    }

    const geom = this.contourFills[index].geometry;
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setIndex(indices);
    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
  }

  private idxToLat(grid: TempGrid, i: number): number {
    return grid.latMin + (i / (grid.latSteps - 1)) * (grid.latMax - grid.latMin);
  }

  private idxToLon(grid: TempGrid, j: number): number {
    return grid.lonMin + (j / (grid.lonSteps - 1)) * (grid.lonMax - grid.lonMin);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.visible = visible;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getCurrentMonth(): number {
    return this.currentMonth;
  }
}
