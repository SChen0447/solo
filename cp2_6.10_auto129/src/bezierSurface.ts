import * as THREE from 'three';

function bernstein(n: number, i: number, t: number): number {
  const binomial = factorial(n) / (factorial(i) * factorial(n - i));
  return binomial * Math.pow(t, i) * Math.pow(1 - t, n - i);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

export function computeBezierSurface(
  controlPoints: THREE.Vector3[][],
  resolution: number
): THREE.BufferGeometry {
  const degreeU = controlPoints.length - 1;
  const degreeV = controlPoints[0].length - 1;

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const lowColor = new THREE.Color(0x2196f3);
  const highColor = new THREE.Color(0xf44336);

  let minY = Infinity;
  let maxY = -Infinity;
  const tempPositions: THREE.Vector3[] = [];

  for (let i = 0; i <= resolution; i++) {
    const u = i / resolution;
    for (let j = 0; j <= resolution; j++) {
      const v = j / resolution;
      const point = evaluateBezierPoint(controlPoints, degreeU, degreeV, u, v);
      tempPositions.push(point);
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
  }

  const yRange = maxY - minY || 1;

  for (let i = 0; i <= resolution; i++) {
    const u = i / resolution;
    for (let j = 0; j <= resolution; j++) {
      const v = j / resolution;
      const idx = i * (resolution + 1) + j;
      const point = tempPositions[idx];

      positions.push(point.x, point.y, point.z);

      const t = (point.y - minY) / yRange;
      const color = lowColor.clone().lerp(highColor, t);
      colors.push(color.r, color.g, color.b);

      uvs.push(u, v);
    }
  }

  for (let i = 0; i <= resolution; i++) {
    const u = i / resolution;
    for (let j = 0; j <= resolution; j++) {
      const v = j / resolution;
      const normal = evaluateBezierNormal(controlPoints, degreeU, degreeV, u, v);
      normals.push(normal.x, normal.y, normal.z);
    }
  }

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const a = i * (resolution + 1) + j;
      const b = a + 1;
      const c = a + (resolution + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

function evaluateBezierPoint(
  controlPoints: THREE.Vector3[][],
  degreeU: number,
  degreeV: number,
  u: number,
  v: number
): THREE.Vector3 {
  const point = new THREE.Vector3();
  for (let i = 0; i <= degreeU; i++) {
    const bu = bernstein(degreeU, i, u);
    for (let j = 0; j <= degreeV; j++) {
      const bv = bernstein(degreeV, j, v);
      const weight = bu * bv;
      point.x += controlPoints[i][j].x * weight;
      point.y += controlPoints[i][j].y * weight;
      point.z += controlPoints[i][j].z * weight;
    }
  }
  return point;
}

function evaluateBezierNormal(
  controlPoints: THREE.Vector3[][],
  degreeU: number,
  degreeV: number,
  u: number,
  v: number
): THREE.Vector3 {
  const epsilon = 0.001;
  const u1 = Math.max(0, u - epsilon);
  const u2 = Math.min(1, u + epsilon);
  const v1 = Math.max(0, v - epsilon);
  const v2 = Math.min(1, v + epsilon);

  const pU1 = evaluateBezierPoint(controlPoints, degreeU, degreeV, u1, v);
  const pU2 = evaluateBezierPoint(controlPoints, degreeU, degreeV, u2, v);
  const pV1 = evaluateBezierPoint(controlPoints, degreeU, degreeV, u, v1);
  const pV2 = evaluateBezierPoint(controlPoints, degreeU, degreeV, u, v2);

  const du = new THREE.Vector3().subVectors(pU2, pU1);
  const dv = new THREE.Vector3().subVectors(pV2, pV1);

  const normal = new THREE.Vector3().crossVectors(du, dv).normalize();
  if (normal.y < 0) normal.negate();
  return normal;
}

export function catmullClarkSubdivide(
  baseGeometry: THREE.BufferGeometry,
  iterations: number
): THREE.BufferGeometry {
  let geometry = baseGeometry;

  for (let iter = 0; iter < iterations; iter++) {
    geometry = subdivideOneStep(geometry);
  }

  return geometry;
}

function subdivideOneStep(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const positions = geometry.attributes.position;
  const indices = geometry.index;

  if (!indices) return geometry;

  const vertexCount = positions.count;
  const faceCount = indices.count / 3;

  const facePoints: THREE.Vector3[] = [];
  for (let f = 0; f < faceCount; f++) {
    const i0 = indices.getX(f * 3);
    const i1 = indices.getX(f * 3 + 1);
    const i2 = indices.getX(f * 3 + 2);

    const v0 = new THREE.Vector3(positions.getX(i0), positions.getY(i0), positions.getZ(i0));
    const v1 = new THREE.Vector3(positions.getX(i1), positions.getY(i1), positions.getZ(i1));
    const v2 = new THREE.Vector3(positions.getX(i2), positions.getY(i2), positions.getZ(i2));

    const facePoint = new THREE.Vector3()
      .add(v0).add(v1).add(v2).divideScalar(3);
    facePoints.push(facePoint);
  }

  const edgeMap = new Map<string, { faces: number[]; midpoint: THREE.Vector3 }>();
  const faceEdges: number[][] = [];

  for (let f = 0; f < faceCount; f++) {
    const edges: number[] = [];
    for (let e = 0; e < 3; e++) {
      const i0 = indices.getX(f * 3 + e);
      const i1 = indices.getX(f * 3 + (e + 1) % 3);
      const key = i0 < i1 ? `${i0}_${i1}` : `${i1}_${i0}`;

      if (!edgeMap.has(key)) {
        const v0 = new THREE.Vector3(positions.getX(i0), positions.getY(i0), positions.getZ(i0));
        const v1 = new THREE.Vector3(positions.getX(i1), positions.getY(i1), positions.getZ(i1));
        const midpoint = new THREE.Vector3().addVectors(v0, v1).divideScalar(2);
        edgeMap.set(key, { faces: [], midpoint });
      }
      edgeMap.get(key)!.faces.push(f);
      edges.push(Array.from(edgeMap.keys()).indexOf(key));
    }
    faceEdges.push(edges);
  }

  const edgeKeys = Array.from(edgeMap.keys());
  const edgePoints: THREE.Vector3[] = [];
  for (const key of edgeKeys) {
    const edge = edgeMap.get(key)!;
    if (edge.faces.length === 2) {
      const fp = new THREE.Vector3()
        .add(facePoints[edge.faces[0]])
        .add(facePoints[edge.faces[1]])
        .divideScalar(2);
      edgePoints.push(new THREE.Vector3().addVectors(edge.midpoint, fp).divideScalar(2));
    } else {
      edgePoints.push(edge.midpoint.clone());
    }
  }

  const vertexFaceCount = new Array(vertexCount).fill(0);
  const vertexEdgeCount = new Array(vertexCount).fill(0);
  const vertexFaceSum = Array.from({ length: vertexCount }, () => new THREE.Vector3());
  const vertexEdgeMidSum = Array.from({ length: vertexCount }, () => new THREE.Vector3());

  for (let f = 0; f < faceCount; f++) {
    for (let e = 0; e < 3; e++) {
      const idx = indices.getX(f * 3 + e);
      vertexFaceCount[idx]++;
      vertexFaceSum[idx].add(facePoints[f]);
    }
  }

  for (let i = 0; i < edgeKeys.length; i++) {
    const [v0Str, v1Str] = edgeKeys[i].split('_');
    const v0 = parseInt(v0Str);
    const v1 = parseInt(v1Str);
    const edge = edgeMap.get(edgeKeys[i])!;

    vertexEdgeCount[v0]++;
    vertexEdgeMidSum[v0].add(edge.midpoint);
    vertexEdgeCount[v1]++;
    vertexEdgeMidSum[v1].add(edge.midpoint);
  }

  const newVertexPositions: THREE.Vector3[] = [];
  for (let v = 0; v < vertexCount; v++) {
    const orig = new THREE.Vector3(positions.getX(v), positions.getY(v), positions.getZ(v));
    const n = vertexFaceCount[v];

    if (n >= 3) {
      const faceAvg = vertexFaceSum[v].clone().divideScalar(n);
      const edgeMidAvg = vertexEdgeMidSum[v].clone().divideScalar(vertexEdgeCount[v]);

      const newPos = new THREE.Vector3()
        .addScaledVector(faceAvg, 1 / n)
        .addScaledVector(edgeMidAvg, 2 / n)
        .addScaledVector(orig, (n - 3) / n);
      newVertexPositions.push(newPos);
    } else {
      newVertexPositions.push(orig.clone());
    }
  }

  const newPositions: number[] = [];
  const newIndices: number[] = [];

  for (const v of newVertexPositions) {
    newPositions.push(v.x, v.y, v.z);
  }
  for (const ep of edgePoints) {
    newPositions.push(ep.x, ep.y, ep.z);
  }
  for (const fp of facePoints) {
    newPositions.push(fp.x, fp.y, fp.z);
  }

  const baseVerts = newVertexPositions.length;
  const baseFacePoints = baseVerts + edgePoints.length;

  for (let f = 0; f < faceCount; f++) {
    const faceVertIndices = [
      indices.getX(f * 3),
      indices.getX(f * 3 + 1),
      indices.getX(f * 3 + 2)
    ];
    const edges = faceEdges[f];
    const fpIdx = baseFacePoints + f;

    for (let e = 0; e < 3; e++) {
      const vIdx = faceVertIndices[e];
      const edgeIdx0 = baseVerts + edges[e];
      const edgeIdx1 = baseVerts + edges[(e + 2) % 3];
      newIndices.push(vIdx, edgeIdx0, fpIdx);
      newIndices.push(vIdx, fpIdx, edgeIdx1);
    }
  }

  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  newGeometry.setIndex(newIndices);
  newGeometry.computeVertexNormals();

  const colorAttr: number[] = [];
  const lowColor = new THREE.Color(0x2196f3);
  const highColor = new THREE.Color(0xf44336);

  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < newPositions.length; i += 3) {
    if (newPositions[i + 1] < minY) minY = newPositions[i + 1];
    if (newPositions[i + 1] > maxY) maxY = newPositions[i + 1];
  }
  const yRange = maxY - minY || 1;

  for (let i = 0; i < newPositions.length; i += 3) {
    const t = (newPositions[i + 1] - minY) / yRange;
    const c = lowColor.clone().lerp(highColor, t);
    colorAttr.push(c.r, c.g, c.b);
  }
  newGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorAttr, 3));

  return newGeometry;
}

export function exportToOBJ(geometry: THREE.BufferGeometry, filename: string): void {
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const uvs = geometry.attributes.uv;
  const indices = geometry.index;

  let content = '# Bezier Surface OBJ Export\n';

  for (let i = 0; i < positions.count; i++) {
    content += `v ${positions.getX(i).toFixed(6)} ${positions.getY(i).toFixed(6)} ${positions.getZ(i).toFixed(6)}\n`;
  }

  if (uvs) {
    for (let i = 0; i < uvs.count; i++) {
      content += `vt ${uvs.getX(i).toFixed(6)} ${uvs.getY(i).toFixed(6)}\n`;
    }
  }

  if (normals) {
    for (let i = 0; i < normals.count; i++) {
      content += `vn ${normals.getX(i).toFixed(6)} ${normals.getY(i).toFixed(6)} ${normals.getZ(i).toFixed(6)}\n`;
    }
  }

  if (indices) {
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i) + 1;
      const b = indices.getX(i + 1) + 1;
      const c = indices.getX(i + 2) + 1;
      if (normals && uvs) {
        content += `f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}\n`;
      } else if (normals) {
        content += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        content += `f ${a} ${b} ${c}\n`;
      }
    }
  }

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
