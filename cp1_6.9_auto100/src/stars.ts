import * as THREE from 'three';

export interface StarsConfig {
  speed: number;
}

export interface StarsModule {
  group: THREE.Group;
  update: (deltaTime: number, config: StarsConfig) => void;
}

interface StarData {
  radius: number;
  angle: number;
  angularSpeed: number;
  y: number;
  trailLength: number;
  history: THREE.Vector3[];
  size: number;
}

export function createStars(): StarsModule {
  const group = new THREE.Group();
  const starCount = 500;

  const starData: StarData[] = [];
  const pointPositions = new Float32Array(starCount * 3);
  const pointColors = new Float32Array(starCount * 3);
  const pointSizes = new Float32Array(starCount);

  const maxTrailLen = 60;
  const totalTrailSegments = starCount * maxTrailLen;
  const linePositions = new Float32Array(totalTrailSegments * 2 * 3);
  const lineColors = new Float32Array(totalTrailSegments * 2 * 3);

  const axisStart = new THREE.Vector3(0, 0, 0);
  const axisEnd = new THREE.Vector3(0, 10, 0);

  for (let i = 0; i < starCount; i++) {
    const radius = 15 + Math.random() * 10;
    const angle = Math.random() * Math.PI * 2;
    const y = -2 + Math.random() * 22;
    const trailLength = 30 + Math.floor(Math.random() * 31);
    const angularSpeed = (0.001 + Math.random() * 0.004) * (Math.random() < 0.5 ? 1 : -1);
    const size = 1 + Math.random();

    const history: THREE.Vector3[] = [];
    for (let t = trailLength - 1; t >= 0; t--) {
      const prevAngle = angle - angularSpeed * t * 100;
      const x = Math.cos(prevAngle) * radius;
      const z = Math.sin(prevAngle) * radius;
      history.push(new THREE.Vector3(x, y, z));
    }

    starData.push({
      radius,
      angle,
      angularSpeed,
      y,
      trailLength,
      history,
      size
    });

    pointSizes[i] = size;
    pointColors[i * 3] = 1;
    pointColors[i * 3 + 1] = 1;
    pointColors[i * 3 + 2] = 1;
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
  pointGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));

  const pointMaterial = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(pointGeometry, pointMaterial);
  group.add(points);

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  group.add(lines);

  const fillInitialBuffers = (): void => {
    for (let i = 0; i < starCount; i++) {
      const data = starData[i];
      const currentPos = data.history[data.history.length - 1];
      pointPositions[i * 3] = currentPos.x;
      pointPositions[i * 3 + 1] = currentPos.y;
      pointPositions[i * 3 + 2] = currentPos.z;
    }
    (pointGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };
  fillInitialBuffers();

  let segmentCount = 0;

  const update = (deltaTime: number, config: StarsConfig): void => {
    segmentCount = 0;
    const dt = deltaTime || 16;

    for (let i = 0; i < starCount; i++) {
      const data = starData[i];
      data.angle += data.angularSpeed * config.speed * (dt / 16);

      const x = Math.cos(data.angle) * data.radius;
      const z = Math.sin(data.angle) * data.radius;
      const newPos = new THREE.Vector3(x, data.y, z);

      data.history.shift();
      data.history.push(newPos);

      pointPositions[i * 3] = x;
      pointPositions[i * 3 + 1] = data.y;
      pointPositions[i * 3 + 2] = z;

      for (let t = 0; t < data.trailLength - 1; t++) {
        if (segmentCount >= totalTrailSegments) break;
        const pA = data.history[t];
        const pB = data.history[t + 1];
        const alpha = t / (data.trailLength - 1);
        const col = 0.6 * alpha;

        const idxA = segmentCount * 2 * 3;
        linePositions[idxA] = pA.x;
        linePositions[idxA + 1] = pA.y;
        linePositions[idxA + 2] = pA.z;
        lineColors[idxA] = col;
        lineColors[idxA + 1] = col;
        lineColors[idxA + 2] = col;

        const idxB = idxA + 3;
        linePositions[idxB] = pB.x;
        linePositions[idxB + 1] = pB.y;
        linePositions[idxB + 2] = pB.z;
        lineColors[idxB] = col * 1.05;
        lineColors[idxB + 1] = col * 1.05;
        lineColors[idxB + 2] = col * 1.05;

        segmentCount++;
      }
    }

    const posAttr = pointGeometry.attributes.position as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    const linePosAttr = lineGeometry.attributes.position as THREE.BufferAttribute;
    const lineColAttr = lineGeometry.attributes.color as THREE.BufferAttribute;
    linePosAttr.needsUpdate = true;
    lineColAttr.needsUpdate = true;
    lineGeometry.setDrawRange(0, segmentCount * 2);
  };

  return { group, update };
}
