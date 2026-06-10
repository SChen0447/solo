import * as THREE from 'three';
import type { Star, StarDataManager } from './StarDataManager';

export interface LayerState {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  separatedOffset: number;
  currentOffset: number;
  targetOffset: number;
  isSelected: boolean;
  group: THREE.Group;
  selectables: THREE.Object3D[];
}

const GOLD = 0xc9a84c;
const GOLD_BRIGHT = 0xe8c96a;
const OCHRE = 0x5a3e2b;
const PARCHMENT = 0xe8d5a3;
const PARCHMENT_DARK = 0xd4be87;

export class AstrolabeModel {
  public layers: LayerState[];
  public rootGroup: THREE.Group;
  public starGroup: THREE.Group;
  private starDataManager: StarDataManager;
  private reteRotation: number = 0;
  private pointerRotation: number = 0;

  private static readonly LAYER_CONFIGS = [
    {
      id: 'mater',
      name: '外环刻度盘',
      nameEn: 'Mater',
      description: '星盘最外层的厚重金属底盘，刻有方位角刻度（0°-360°）与时辰刻度，是整个仪器的基座与参考框架。',
      separatedOffset: 2.0,
    },
    {
      id: 'plate',
      name: '底板',
      nameEn: 'Plate / Climate',
      description: '刻有等高圈、方位线等坐标网格的可替换圆盘，根据观测者所在纬度定制，用于读取恒星高度角与方位角。',
      separatedOffset: 1.4,
    },
    {
      id: 'rete',
      name: '网环',
      nameEn: 'Rete',
      description: '由镂空金属制成的旋转网络，上面标记主要亮星的位置。它随天球周日旋转，是星盘最具标志性的部件。',
      separatedOffset: 0.8,
    },
    {
      id: 'pointer',
      name: '指针',
      nameEn: 'Rule / Alidade',
      description: '穿过中心轴的可旋转长尺，两端带照准器（观测孔），用于瞄准天体并在刻度盘上读取角度读数。',
      separatedOffset: 0.2,
    },
  ];

  constructor(starDataManager: StarDataManager) {
    this.starDataManager = starDataManager;
    this.rootGroup = new THREE.Group();
    this.rootGroup.rotation.x = -Math.PI / 6;
    this.starGroup = new THREE.Group();
    this.layers = [];
    this.build();
  }

  build(): void {
    this.rootGroup.clear();
    this.layers = [];

    for (const config of AstrolabeModel.LAYER_CONFIGS) {
      const group = new THREE.Group();
      const layer: LayerState = {
        id: config.id,
        name: config.name,
        nameEn: config.nameEn,
        description: config.description,
        separatedOffset: config.separatedOffset,
        currentOffset: 0,
        targetOffset: 0,
        isSelected: false,
        group,
        selectables: [],
      };

      switch (config.id) {
        case 'mater':
          this.buildMater(layer);
          break;
        case 'plate':
          this.buildPlate(layer);
          break;
        case 'rete':
          this.buildRete(layer);
          break;
        case 'pointer':
          this.buildPointer(layer);
          break;
      }

      this.layers.push(layer);
      this.rootGroup.add(group);
    }

    this.buildStars();
  }

  private buildMater(layer: LayerState): void {
    const outerRadius = 3.0;
    const innerRadius = 2.75;
    const thickness = 0.18;

    const torusGeo = new THREE.TorusGeometry((outerRadius + innerRadius) / 2, thickness / 2, 24, 128);
    const torusMat = new THREE.MeshStandardMaterial({
      color: OCHRE,
      metalness: 0.7,
      roughness: 0.35,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI / 2;
    layer.group.add(torus);
    layer.selectables.push(torus);

    const ringGeo = new THREE.RingGeometry(innerRadius - 0.02, outerRadius + 0.02, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: PARCHMENT_DARK,
      metalness: 0.3,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    layer.group.add(ring);
    layer.selectables.push(ring);

    for (let i = 0; i < 360; i += 5) {
      const angle = (i * Math.PI) / 180;
      const isMajor = i % 30 === 0;
      const r1 = innerRadius + 0.05;
      const r2 = innerRadius + (isMajor ? 0.18 : 0.10);
      const x1 = Math.cos(angle) * r1;
      const z1 = Math.sin(angle) * r1;
      const x2 = Math.cos(angle) * r2;
      const z2 = Math.sin(angle) * r2;
      const points = [new THREE.Vector3(x1, 0.06, z1), new THREE.Vector3(x2, 0.06, z2)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color: OCHRE, linewidth: isMajor ? 2 : 1 });
      const line = new THREE.Line(lineGeo, lineMat);
      layer.group.add(line);
    }

    for (let i = 0; i < 360; i += 30) {
      const angle = (i * Math.PI) / 180;
      const r = innerRadius + 0.25;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#5a3e2b';
      ctx.font = 'bold 18px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i), 32, 16);
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x, 0.08, z);
      sprite.scale.set(0.18, 0.09, 1);
      layer.group.add(sprite);
    }
  }

  private buildPlate(layer: LayerState): void {
    const radius = 2.72;
    const thickness = 0.08;

    const plateGeo = new THREE.CylinderGeometry(radius, radius, thickness, 128);
    const plateMat = new THREE.MeshStandardMaterial({
      color: PARCHMENT,
      metalness: 0.1,
      roughness: 0.9,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    layer.group.add(plate);
    layer.selectables.push(plate);

    for (let alt = 0; alt <= 90; alt += 15) {
      const r = radius * (1 - alt / 100);
      const ringGeo = new THREE.RingGeometry(r - 0.005, r + 0.005, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: OCHRE,
        transparent: true,
        opacity: alt === 0 ? 0.9 : 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = thickness / 2 + 0.005;
      layer.group.add(ring);
    }

    for (let az = 0; az < 360; az += 30) {
      const angle = (az * Math.PI) / 180;
      const points: THREE.Vector3[] = [];
      for (let r = 0; r <= radius; r += 0.05) {
        points.push(new THREE.Vector3(
          Math.cos(angle) * r,
          thickness / 2 + 0.005,
          Math.sin(angle) * r
        ));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: OCHRE,
        transparent: true,
        opacity: 0.4,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      layer.group.add(line);
    }
  }

  private buildRete(layer: LayerState): void {
    const outerRadius = 2.6;
    const thickness = 0.04;

    const ring1 = this.createWireCircle(outerRadius, OCHRE);
    ring1.position.y = thickness / 2;
    layer.group.add(ring1);

    const ring2 = this.createWireCircle(outerRadius * 0.7, OCHRE);
    ring2.position.y = thickness / 2;
    layer.group.add(ring2);

    const ring3 = this.createWireCircle(outerRadius * 0.4, OCHRE);
    ring3.position.y = thickness / 2;
    layer.group.add(ring3);

    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 * Math.PI) / 180;
      const points: THREE.Vector3[] = [];
      const r1 = outerRadius * 0.4;
      const r2 = outerRadius;
      points.push(new THREE.Vector3(
        Math.cos(angle) * r1,
        thickness / 2,
        Math.sin(angle) * r1
      ));
      points.push(new THREE.Vector3(
        Math.cos(angle) * r2,
        thickness / 2,
        Math.sin(angle) * r2
      ));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: OCHRE,
        transparent: true,
        opacity: 0.8,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      layer.group.add(line);
    }

    for (let i = 0; i < 8; i++) {
      const angle = (i * 45 * Math.PI) / 180 + Math.PI / 8;
      const curvePoints: THREE.Vector3[] = [];
      for (let t = 0; t <= 1; t += 0.02) {
        const a = angle + t * 0.8;
        const r = outerRadius * 0.3 + outerRadius * 0.5 * t;
        curvePoints.push(new THREE.Vector3(
          Math.cos(a) * r,
          thickness / 2,
          Math.sin(a) * r
        ));
      }
      const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const curveMat = new THREE.LineBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0.6,
      });
      const curve = new THREE.Line(curveGeo, curveMat);
      layer.group.add(curve);
    }

    const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, thickness * 3, 32);
    const hubMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 0.8,
      roughness: 0.2,
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    layer.group.add(hub);
    layer.selectables.push(hub);

    layer.selectables.push(ring1, ring2, ring3);
  }

  private createWireCircle(radius: number, color: number): THREE.LineLoop {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i * Math.PI * 2) / 128;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color });
    return new THREE.LineLoop(geo, mat);
  }

  private buildPointer(layer: LayerState): void {
    const length = 2.9;
    const width = 0.12;
    const thickness = 0.04;

    const pointerShape = new THREE.Shape();
    pointerShape.moveTo(-length / 2, -width / 2);
    pointerShape.lineTo(length / 2 - 0.3, -width / 2);
    pointerShape.lineTo(length / 2, 0);
    pointerShape.lineTo(length / 2 - 0.3, width / 2);
    pointerShape.lineTo(-length / 2 + 0.15, width / 2);
    pointerShape.lineTo(-length / 2, width / 3);
    pointerShape.lineTo(-length / 2, -width / 3);
    pointerShape.lineTo(-length / 2 + 0.15, -width / 2);
    pointerShape.lineTo(-length / 2, -width / 2);

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    const pointerGeo = new THREE.ExtrudeGeometry(pointerShape, extrudeSettings);
    const pointerMat = new THREE.MeshStandardMaterial({
      color: OCHRE,
      metalness: 0.6,
      roughness: 0.4,
    });
    const pointer = new THREE.Mesh(pointerGeo, pointerMat);
    pointer.rotation.x = -Math.PI / 2;
    pointer.position.y = thickness;
    layer.group.add(pointer);
    layer.selectables.push(pointer);

    const sightGeo = new THREE.BoxGeometry(0.06, 0.15, 0.06);
    const sightMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 0.8,
      roughness: 0.3,
    });
    const sight1 = new THREE.Mesh(sightGeo, sightMat);
    sight1.position.set(length / 2 - 0.15, 0.12, 0);
    layer.group.add(sight1);
    const sight2 = new THREE.Mesh(sightGeo, sightMat);
    sight2.position.set(-length / 2 + 0.2, 0.12, 0);
    layer.group.add(sight2);

    const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, thickness * 4, 32);
    const hubMat = new THREE.MeshStandardMaterial({
      color: GOLD_BRIGHT,
      metalness: 0.9,
      roughness: 0.15,
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.y = thickness * 1.5;
    layer.group.add(hub);
    layer.selectables.push(hub);
  }

  private buildStars(): void {
    this.starGroup.clear();
    const stars = this.starDataManager.getCurrentDataset().stars;
    const reteLayer = this.layers.find((l) => l.id === 'rete');
    if (!reteLayer) return;

    stars.forEach((star: Star) => {
      const size = Math.max(0.03, 0.12 - star.magnitude * 0.015);
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: GOLD_BRIGHT,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geometry, material);

      const raRad = (star.ra * Math.PI) / 180;
      const decRad = (star.dec * Math.PI) / 180;
      const r = 2.5 * (1 - (90 - Math.abs(star.dec)) / 180);
      const projectedR = Math.max(0.15, r);
      mesh.position.set(
        Math.cos(raRad) * projectedR,
        0.1,
        Math.sin(raRad) * projectedR
      );

      this.starGroup.add(mesh);

      const glowGeo = new THREE.SphereGeometry(size * 2.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0.2,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(mesh.position);
      this.starGroup.add(glow);
    });

    reteLayer.group.add(this.starGroup);
  }

  updateStarDataset(): void {
    const reteLayer = this.layers.find((l) => l.id === 'rete');
    if (reteLayer) {
      reteLayer.group.remove(this.starGroup);
    }
    this.buildStars();
  }

  separateLayer(layerId: string, animate: boolean = true): void {
    const layer = this.layers.find((l) => l.id === layerId);
    if (!layer) return;
    layer.targetOffset = layer.separatedOffset;
    if (!animate) {
      layer.currentOffset = layer.targetOffset;
      layer.group.position.z = layer.currentOffset;
    }
  }

  assembleLayer(layerId: string, animate: boolean = true): void {
    const layer = this.layers.find((l) => l.id === layerId);
    if (!layer) return;
    layer.targetOffset = 0;
    if (!animate) {
      layer.currentOffset = 0;
      layer.group.position.z = 0;
    }
  }

  separateAll(animate: boolean = true): void {
    this.layers.forEach((l) => this.separateLayer(l.id, animate));
  }

  assembleAll(animate: boolean = true): Promise<void> {
    return new Promise((resolve) => {
      this.layers.forEach((l, i) => {
        if (animate) {
          setTimeout(() => this.assembleLayer(l.id, true), i * 500);
        } else {
          this.assembleLayer(l.id, false);
        }
      });
      const delay = animate ? this.layers.length * 500 + 2000 : 0;
      setTimeout(resolve, delay);
    });
  }

  selectLayer(layerId: string | null): void {
    this.layers.forEach((layer) => {
      layer.isSelected = layer.id === layerId;
      layer.selectables.forEach((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            if (layer.isSelected) {
              mat.emissive.setHex(GOLD);
              mat.emissiveIntensity = 0.6;
            } else {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          }
        } else if (obj instanceof THREE.Line || obj instanceof THREE.LineLoop) {
          const mat = obj.material as THREE.LineBasicMaterial;
          if (layer.isSelected) {
            mat.color.setHex(GOLD_BRIGHT);
            mat.opacity = 1;
          } else {
            mat.color.setHex(OCHRE);
            mat.opacity = obj === layer.selectables[0] ? 1 : 0.8;
          }
        }
      });
    });
  }

  update(deltaTime: number): void {
    this.layers.forEach((layer) => {
      if (Math.abs(layer.currentOffset - layer.targetOffset) > 0.001) {
        const diff = layer.targetOffset - layer.currentOffset;
        layer.currentOffset += diff * Math.min(1, deltaTime * 5);
        layer.group.position.z = layer.currentOffset;
      }
    });

    const reteLayer = this.layers.find((l) => l.id === 'rete');
    if (reteLayer) {
      reteLayer.group.rotation.y = this.reteRotation;
    }
    const pointerLayer = this.layers.find((l) => l.id === 'pointer');
    if (pointerLayer) {
      pointerLayer.group.rotation.y = this.pointerRotation;
    }
  }

  updateRotation(date: Date, timeHours: number): void {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const d = jd - 2451545.0;
    let gmst = 280.46061837 + 360.98564736629 * d;
    gmst = ((gmst % 360) + 360) % 360;
    gmst += timeHours * 15;
    const sidereal = ((gmst % 360) + 360) % 360;

    this.reteRotation = -(sidereal * Math.PI) / 180;
    this.pointerRotation = -((timeHours * 15) * Math.PI) / 180;
  }

  getLayerByIntersect(intersect: THREE.Intersection): LayerState | null {
    for (const layer of this.layers) {
      for (const selectable of layer.selectables) {
        if (intersect.object === selectable || intersect.object.parent === selectable) {
          return layer;
        }
        let current: THREE.Object3D | null = intersect.object;
        while (current) {
          if (current === selectable) return layer;
          current = current.parent;
        }
      }
    }
    return null;
  }

  getSelectedLayer(): LayerState | null {
    return this.layers.find((l) => l.isSelected) || null;
  }
}
