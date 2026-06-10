import * as THREE from 'three';

export interface MarkerInfo {
  index: number;
  name: string;
  note: string;
}

const MARKER_NAMES = [
  '一徽', '二徽', '三徽', '四徽', '五徽', '六徽', '七徽',
  '八徽', '九徽', '十徽', '十一徽', '十二徽', '十三徽'
];

const MARKER_NOTES = [
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5'
];

const DIMENSIONS = {
  bodyLength: 16,
  bodyWidth: 2,
  bodyHeight: 0.5,
  stringCount: 7,
  markerCount: 13,
  stringRadius: 0.02,
  stringHeight: 0.5,
  markerRadius: 0.3
};

export class Instrument {
  public group: THREE.Group;
  public body: THREE.Mesh;
  public strings: THREE.Mesh[] = [];
  public markers: THREE.Mesh[] = [];
  public markerInfos: MarkerInfo[] = [];

  private stringOriginalPositions: Map<THREE.Mesh, Float32Array> = new Map();
  private vibratingStrings: Set<number> = new Set();
  private vibrationStartTimes: Map<number, number> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.body = this.createBody();
    this.group.add(this.body);
    this.createStrings();
    this.createMarkers();
    this.createEndPieces();
  }

  private createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(0.5, '#A0522D');
    gradient.addColorStop(1, '#D2691E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 80; i++) {
      const y = Math.random() * canvas.height;
      const height = Math.random() * 4 + 1;
      const opacity = Math.random() * 0.3 + 0.1;
      ctx.strokeStyle = `rgba(60, 30, 10, ${opacity})`;
      ctx.lineWidth = height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < canvas.width; x += 20) {
        const offset = Math.sin(x * 0.02 + y * 0.05) * 5;
        ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width;
      const radius = Math.random() * 30 + 10;
      const opacity = Math.random() * 0.15 + 0.05;
      const ringGradient = ctx.createRadialGradient(x, canvas.height / 2, 0, x, canvas.height / 2, radius);
      ringGradient.addColorStop(0, `rgba(139, 69, 19, 0)`);
      ringGradient.addColorStop(0.5, `rgba(60, 30, 10, ${opacity})`);
      ringGradient.addColorStop(1, `rgba(139, 69, 19, 0)`);
      ctx.fillStyle = ringGradient;
      ctx.beginPath();
      ctx.ellipse(x, canvas.height / 2, radius, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    return texture;
  }

  private createBody(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(
      DIMENSIONS.bodyLength,
      DIMENSIONS.bodyHeight,
      DIMENSIONS.bodyWidth
    );
    const woodTexture = this.createWoodTexture();
    const material = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.7,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = DIMENSIONS.bodyHeight / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createStrings(): void {
    const stringLength = DIMENSIONS.bodyLength - 1;
    const halfLength = stringLength / 2;
    const stringSpacing = (DIMENSIONS.bodyWidth - 0.4) / (DIMENSIONS.stringCount - 1);
    const startZ = -((DIMENSIONS.bodyWidth - 0.4) / 2);

    for (let i = 0; i < DIMENSIONS.stringCount; i++) {
      const geometry = new THREE.CylinderGeometry(
        DIMENSIONS.stringRadius,
        DIMENSIONS.stringRadius,
        stringLength,
        6
      );
      geometry.rotateZ(Math.PI / 2);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.6
      });
      const string = new THREE.Mesh(geometry, material);
      string.position.set(
        0,
        DIMENSIONS.bodyHeight + DIMENSIONS.stringHeight,
        startZ + i * stringSpacing
      );
      string.castShadow = true;
      this.strings.push(string);
      this.group.add(string);

      const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      this.stringOriginalPositions.set(string, new Float32Array(positionAttr.array));
    }
  }

  private createMarkers(): void {
    const markerPositions = [
      -7.0, -5.8, -4.6, -3.5, -2.5, -1.5, 0,
      1.5, 2.5, 3.5, 4.6, 5.8, 7.0
    ];

    const markerZ = -((DIMENSIONS.bodyWidth - 0.4) / 2) - 0.25;

    for (let i = 0; i < DIMENSIONS.markerCount; i++) {
      const geometry = new THREE.SphereGeometry(DIMENSIONS.markerRadius, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFF0,
        roughness: 0.4,
        metalness: 0.2,
        emissive: 0x000000
      });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.set(
        markerPositions[i],
        DIMENSIONS.bodyHeight + DIMENSIONS.stringHeight + DIMENSIONS.markerRadius * 0.5,
        markerZ
      );
      marker.castShadow = true;
      (marker as any).userData = { markerIndex: i };
      this.markers.push(marker);
      this.group.add(marker);

      this.markerInfos.push({
        index: i,
        name: MARKER_NAMES[i],
        note: MARKER_NOTES[i]
      });
    }
  }

  private createEndPieces(): void {
    const yueShanGeom = new THREE.BoxGeometry(0.3, 0.6, DIMENSIONS.bodyWidth - 0.1);
    const yueShanMat = new THREE.MeshStandardMaterial({
      color: 0x5C3317,
      roughness: 0.8,
      metalness: 0.1
    });
    const yueShan = new THREE.Mesh(yueShanGeom, yueShanMat);
    yueShan.position.set(
      -DIMENSIONS.bodyLength / 2 + 0.3,
      DIMENSIONS.bodyHeight + 0.3,
      0
    );
    yueShan.castShadow = true;
    this.group.add(yueShan);

    const longYinGeom = new THREE.BoxGeometry(0.25, 0.4, DIMENSIONS.bodyWidth - 0.2);
    const longYinMat = new THREE.MeshStandardMaterial({
      color: 0x5C3317,
      roughness: 0.8,
      metalness: 0.1
    });
    const longYin = new THREE.Mesh(longYinGeom, longYinMat);
    longYin.position.set(
      DIMENSIONS.bodyLength / 2 - 0.3,
      DIMENSIONS.bodyHeight + 0.2,
      0
    );
    longYin.castShadow = true;
    this.group.add(longYin);
  }

  public getMarkerByIntersect(intersect: THREE.Intersection): MarkerInfo | null {
    const mesh = intersect.object as THREE.Mesh;
    const userData = (mesh as any).userData;
    if (userData && typeof userData.markerIndex === 'number') {
      return this.markerInfos[userData.markerIndex] || null;
    }
    return null;
  }

  public getMarkerIndexByObject(obj: THREE.Object3D): number | null {
    const userData = (obj as any).userData;
    if (userData && typeof userData.markerIndex === 'number') {
      return userData.markerIndex;
    }
    return null;
  }

  public highlightMarker(index: number): void {
    const marker = this.markers[index];
    if (!marker) return;
    const material = marker.material as THREE.MeshStandardMaterial;
    const originalEmissive = material.emissive.getHex();
    material.emissive.setHex(0xd4af37);
    material.color.setHex(0xd4af37);

    setTimeout(() => {
      material.emissive.setHex(originalEmissive);
      material.color.setHex(0xFFFFF0);
    }, 1000);
  }

  public vibrateStrings(markerIndex: number): void {
    const stringIndex = Math.min(Math.floor(markerIndex / 2), this.strings.length - 1);
    for (let i = Math.max(0, stringIndex - 1); i <= Math.min(this.strings.length - 1, stringIndex + 1); i++) {
      this.vibratingStrings.add(i);
      this.vibrationStartTimes.set(i, performance.now());
    }
  }

  public updateAnimation(currentTime: number): void {
    const vibrationDuration = 500;
    const amplitude = 0.01;
    const frequency = 40;

    for (const stringIndex of Array.from(this.vibratingStrings)) {
      const stringMesh = this.strings[stringIndex];
      const startTime = this.vibrationStartTimes.get(stringIndex);
      if (startTime === undefined) continue;

      const elapsed = currentTime - startTime;
      if (elapsed > vibrationDuration) {
        this.vibratingStrings.delete(stringIndex);
        this.vibrationStartTimes.delete(stringIndex);
        this.resetStringVertices(stringMesh);
        continue;
      }

      const geometry = stringMesh.geometry;
      const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const originalPositions = this.stringOriginalPositions.get(stringMesh);
      if (!originalPositions) continue;

      const decay = 1 - elapsed / vibrationDuration;
      const count = positionAttr.count;

      for (let i = 0; i < count; i++) {
        const originalY = originalPositions[i * 3 + 1];
        const x = originalPositions[i * 3];
        const distanceFromEnd = Math.abs(x) / (DIMENSIONS.bodyLength / 2);
        const envelope = Math.sin(distanceFromEnd * Math.PI);
        const vibration = Math.sin(elapsed * 0.01 * frequency + x * 2) * amplitude * decay * envelope;
        positionAttr.setY(i, originalY + vibration);
      }
      positionAttr.needsUpdate = true;
    }
  }

  private resetStringVertices(stringMesh: THREE.Mesh): void {
    const geometry = stringMesh.geometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const originalPositions = this.stringOriginalPositions.get(stringMesh);
    if (!originalPositions) return;

    for (let i = 0; i < positionAttr.count; i++) {
      positionAttr.setY(i, originalPositions[i * 3 + 1]);
    }
    positionAttr.needsUpdate = true;
  }

  public getAllPickableObjects(): THREE.Object3D[] {
    return [...this.markers];
  }
}
