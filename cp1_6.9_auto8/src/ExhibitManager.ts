import * as THREE from 'three';
import { Tween, Easing, Group as TweenGroup } from '@tweenjs/tween.js';
import { FossilData, FossilCategory } from './DataManager';

interface Exhibit {
  id: string;
  data: FossilData;
  group: THREE.Group;
  pedestal: THREE.Mesh;
  fossil: THREE.Group;
  halo: THREE.Mesh;
  haloMaterial: THREE.MeshBasicMaterial;
  pedestalMaterials: THREE.MeshStandardMaterial[];
  fossilMaterials: THREE.MeshStandardMaterial[];
  baseY: number;
  isSelected: boolean;
  isFiltered: boolean;
  autoRotationSpeed: number;
  haloTime: number;
  haloActive: boolean;
}

export class ExhibitManager {
  public exhibits: Exhibit[] = [];
  public earthGroup: THREE.Group | null = null;
  public selectedId: string | null = null;
  public rotationSpeed: number = 1.0;

  private scene: THREE.Scene | null = null;
  private tweenGroup: TweenGroup;
  private raycastTargets: THREE.Object3D[] = [];
  private pedestalRadius: number = 1.2;
  private pedestalHeight: number = 0.3;
  private ringRadius: number = 5.5;
  private exhibitCount: number = 6;
  private initialized: boolean = false;

  constructor() {
    this.tweenGroup = new TweenGroup();
  }

  init(scene: THREE.Scene, dataList: FossilData[]): void {
    this.scene = scene;
    this.exhibits = [];
    this.raycastTargets = [];
    this.initialized = true;

    this.createEarth();
    this.createExhibits(dataList);
    this.playIntroAnimations();
  }

  private createEarth(): void {
    if (!this.scene) return;

    this.earthGroup = new THREE.Group();

    const earthGeo = new THREE.SphereGeometry(1.8, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a6e,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x1a3a5e,
      emissiveIntensity: 0.15
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    this.earthGroup.add(earth);

    const wireGeo = new THREE.SphereGeometry(1.85, 24, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const wireframe = new THREE.Mesh(wireGeo, wireMat);
    this.earthGroup.add(wireframe);

    const glowGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.earthGroup.add(glow);

    this.earthGroup.position.set(0, 1.5, 0);
    this.scene.add(this.earthGroup);
  }

  private createMarbleTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#e8e4dd');
    gradient.addColorStop(0.5, '#d5cfc6');
    gradient.addColorStop(1, '#c8c0b5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(160, 150, 135, ${Math.random() * 0.2})`;
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.moveTo(Math.random() * size, Math.random() * size);
      ctx.bezierCurveTo(
        Math.random() * size,
        Math.random() * size,
        Math.random() * size,
        Math.random() * size,
        Math.random() * size,
        Math.random() * size
      );
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    return texture;
  }

  private createPedestal(position: THREE.Vector3): { mesh: THREE.Mesh; materials: THREE.MeshStandardMaterial[] } {
    const marbleTex = this.createMarbleTexture();
    const materials: THREE.MeshStandardMaterial[] = [];

    const sideMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      color: 0xd8d2c6,
      roughness: 0.5,
      metalness: 0.1
    });
    materials.push(sideMat);

    const topMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      color: 0xe8e4dd,
      roughness: 0.4,
      metalness: 0.15
    });
    materials.push(topMat);
    materials.push(sideMat);

    const pedestalGeo = new THREE.CylinderGeometry(
      this.pedestalRadius,
      this.pedestalRadius * 1.1,
      this.pedestalHeight,
      48
    );
    const pedestal = new THREE.Mesh(pedestalGeo, [topMat, sideMat, sideMat]);
    pedestal.position.copy(position);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;

    return { mesh: pedestal, materials };
  }

  private createHalo(): { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial } {
    const haloGeo = new THREE.RingGeometry(this.pedestalRadius * 0.85, this.pedestalRadius * 1.15, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    return { mesh: halo, material: haloMat };
  }

  private createFossilModel(data: FossilData): { group: THREE.Group; materials: THREE.MeshStandardMaterial[] } {
    const group = new THREE.Group();
    const materials: THREE.MeshStandardMaterial[] = [];
    const color = new THREE.Color(data.color);

    const baseMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.75,
      metalness: 0.08
    });
    materials.push(baseMat);

    const accentMat = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.7),
      roughness: 0.8,
      metalness: 0.05
    });
    materials.push(accentMat);

    const darkMat = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.5),
      roughness: 0.85,
      metalness: 0.05
    });
    materials.push(darkMat);

    switch (data.id) {
      case 'trilobite':
        this.buildTrilobite(group, baseMat, accentMat, darkMat);
        break;
      case 'ammonite':
        this.buildAmmonite(group, baseMat, accentMat, darkMat);
        break;
      case 'archaeopteryx':
        this.buildArchaeopteryx(group, baseMat, accentMat, darkMat);
        break;
      case 'smilodon':
        this.buildSmilodon(group, baseMat, accentMat, darkMat);
        break;
      case 'tyrannosaurus':
        this.buildTyrannosaurus(group, baseMat, accentMat, darkMat);
        break;
      case 'mammoth':
        this.buildMammoth(group, baseMat, accentMat, darkMat);
        break;
      case 'lepidodendron':
        this.buildLepidodendron(group, baseMat, accentMat, darkMat);
        break;
      case 'cycad':
        this.buildCycad(group, baseMat, accentMat, darkMat);
        break;
      default:
        this.buildGeneric(group, baseMat);
    }

    return { group, materials };
  }

  private buildTrilobite(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), base);
    body.scale.set(1.4, 0.35, 0.9);
    body.position.y = 0.1;
    group.add(body);

    const axis = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), accent);
    axis.scale.set(3.2, 1.1, 0.8);
    axis.position.y = 0.18;
    group.add(axis);

    for (let i = -2; i <= 2; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), dark);
      seg.scale.set(0.5, 1.3, 1.6);
      seg.position.set(i * 0.28, 0.2, 0);
      group.add(seg);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), base);
    head.scale.set(1.3, 0.5, 1.4);
    head.position.set(0.75, 0.12, 0);
    group.add(head);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 4), base);
    tail.rotation.z = -Math.PI / 2;
    tail.rotation.y = Math.PI / 4;
    tail.position.set(-0.85, 0.15, 0);
    group.add(tail);
  }

  private buildAmmonite(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.0, 48), base);
    cone.rotation.z = Math.PI;
    cone.position.y = 0.5;
    cone.scale.set(1, 0.8, 1);
    group.add(cone);

    const hemi = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), accent);
    hemi.position.y = 0.2;
    group.add(hemi);

    for (let i = 0; i < 6; i++) {
      const r = 0.3 + i * 0.08;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 8, 48), dark);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.22 + i * 0.04;
      ring.scale.set(1, 0.8 - i * 0.08, 1);
      group.add(ring);
    }

    const apex = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), dark);
    apex.position.y = 1.05;
    group.add(apex);
  }

  private buildArchaeopteryx(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), base);
    body.scale.set(1.4, 1, 1);
    body.position.y = 0.7;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), accent);
    head.position.set(0.45, 0.9, 0);
    group.add(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 8), dark);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.7, 0.9, 0);
    group.add(beak);

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.4), base);
    wingL.position.set(0, 0.8, 0.45);
    wingL.rotation.x = 0.15;
    group.add(wingL);

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.4), base);
    wingR.position.set(0, 0.8, -0.45);
    wingR.rotation.x = -0.15;
    group.add(wingR);

    for (let i = 0; i < 5; i++) {
      const featherL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 6), dark);
      featherL.position.set(-0.2 - i * 0.12, 0.75, 0.65);
      featherL.rotation.x = 0.2;
      group.add(featherL);
      const featherR = featherL.clone();
      featherR.position.z = -0.65;
      featherR.rotation.x = -0.2;
      group.add(featherR);
    }

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.08), dark);
    tail.position.set(-0.6, 0.7, 0);
    group.add(tail);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.35, 8), accent);
    legL.position.set(0.1, 0.4, 0.15);
    group.add(legL);
    const legR = legL.clone();
    legR.position.z = -0.15;
    group.add(legR);
  }

  private buildSmilodon(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), base);
    body.scale.set(1.8, 1, 1.1);
    body.position.y = 0.7;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), base);
    head.position.set(0.8, 0.95, 0);
    group.add(head);

    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.28), accent);
    jaw.position.set(0.9, 0.78, 0);
    group.add(jaw);

    const toothL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 8), dark);
    toothL.position.set(0.95, 0.6, 0.08);
    group.add(toothL);
    const toothR = toothL.clone();
    toothR.position.z = -0.08;
    group.add(toothR);

    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), dark);
    earL.position.set(0.7, 1.25, 0.2);
    earL.rotation.x = -0.2;
    group.add(earL);
    const earR = earL.clone();
    earR.position.z = -0.2;
    earR.rotation.x = 0.2;
    group.add(earR);

    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.55, 12), accent);
      const x = i < 2 ? 0.5 : -0.4;
      const z = i % 2 === 0 ? 0.28 : -0.28;
      leg.position.set(x, 0.3, z);
      group.add(leg);
    }

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.4, 8), dark);
    tail.position.set(-0.9, 0.75, 0);
    tail.rotation.z = 0.8;
    group.add(tail);
  }

  private buildTyrannosaurus(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), base);
    body.scale.set(2, 1.3, 1.2);
    body.position.y = 0.9;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.4), base);
    head.position.set(1.25, 1.35, 0);
    group.add(head);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.35), accent);
    snout.position.set(1.8, 1.25, 0);
    group.add(snout);

    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), dark);
    jaw.position.set(1.6, 1.05, 0);
    group.add(jaw);

    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), dark);
      tooth.position.set(1.45 + i * 0.07, 0.98, 0);
      group.add(tooth);
    }

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), dark);
    eyeL.position.set(1.3, 1.5, 0.18);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.z = -0.18;
    group.add(eyeR);

    const legFL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.7, 12), accent);
    legFL.position.set(0.5, 0.4, 0.22);
    group.add(legFL);
    const legFR = legFL.clone();
    legFR.position.z = -0.22;
    group.add(legFR);
    const legBL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.85, 12), accent);
    legBL.position.set(-0.4, 0.45, 0.25);
    group.add(legBL);
    const legBR = legBL.clone();
    legBR.position.z = -0.25;
    group.add(legBR);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.25, 8), dark);
    armL.position.set(0.8, 1.0, 0.4);
    armL.rotation.z = 0.5;
    group.add(armL);
    const armR = armL.clone();
    armR.position.z = -0.4;
    armR.rotation.z = -0.5;
    group.add(armR);

    for (let i = 0; i < 8; i++) {
      const vert = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), dark);
      vert.position.set(-0.4 + i * 0.15, 1.55, 0);
      vert.scale.set(1, 0.8, 0.9);
      group.add(vert);
    }

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.04, 1.2, 12), base);
    tail.position.set(-1.4, 0.9, 0);
    tail.rotation.z = 0.3;
    group.add(tail);
  }

  private buildMammoth(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), base);
    body.scale.set(1.8, 1.4, 1.3);
    body.position.y = 0.95;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), base);
    head.position.set(0.8, 1.25, 0);
    group.add(head);

    const forehead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), accent);
    forehead.position.set(0.95, 1.5, 0);
    forehead.scale.set(1, 0.9, 1);
    group.add(forehead);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.8, 16), accent);
    trunk.position.set(1.1, 0.75, 0);
    trunk.rotation.z = -0.6;
    group.add(trunk);

    const tuskL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.9, 12), dark);
    tuskL.position.set(1.15, 0.85, 0.22);
    tuskL.rotation.set(0.5, 0.2, -0.4);
    group.add(tuskL);
    const tuskR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.9, 12), dark);
    tuskR.position.set(1.15, 0.85, -0.22);
    tuskR.rotation.set(-0.5, 0.2, -0.4);
    group.add(tuskR);

    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), dark);
    earL.scale.set(0.3, 0.9, 1);
    earL.position.set(0.7, 1.4, 0.45);
    group.add(earL);
    const earR = earL.clone();
    earR.position.z = -0.45;
    group.add(earR);

    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.85, 16), accent);
      const x = i < 2 ? 0.6 : -0.5;
      const z = i % 2 === 0 ? 0.3 : -0.3;
      leg.position.set(x, 0.45, z);
      group.add(leg);
    }

    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), dark);
    hump.position.set(-0.1, 1.65, 0);
    hump.scale.set(1.8, 0.8, 1.2);
    group.add(hump);
  }

  private buildLepidodendron(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.8, 20), base);
    trunk.position.y = 0.9;
    group.add(trunk);

    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 8; j++) {
        const scale = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.06), accent);
        const angle = (j / 8) * Math.PI * 2 + (i % 2) * 0.3;
        const y = 0.15 + i * 0.12;
        const r = 0.18 + (i * 0.007);
        scale.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        scale.rotation.y = angle;
        group.add(scale);
      }
    }

    for (let b = 0; b < 4; b++) {
      const angle = (b / 4) * Math.PI * 2;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.7, 10), dark);
      branch.position.set(Math.cos(angle) * 0.3, 1.7, Math.sin(angle) * 0.3);
      branch.rotation.set(-0.7, angle, 0);
      group.add(branch);

      for (let l = 0; l < 6; l++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 6), dark);
        const la = angle + (l - 3) * 0.2;
        leaf.position.set(Math.cos(la) * 0.55, 1.8 + l * 0.05, Math.sin(la) * 0.55);
        leaf.rotation.set(-0.5 + l * 0.1, la, 0);
        group.add(leaf);
      }
    }
  }

  private buildCycad(group: THREE.Group, base: THREE.Material, accent: THREE.Material, dark: THREE.Material): void {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.7, 20), base);
    trunk.position.y = 0.35;
    group.add(trunk);

    for (let i = 0; i < 10; i++) {
      const scar = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), accent);
      const angle = (i / 10) * Math.PI * 2;
      const y = 0.15 + i * 0.05;
      scar.position.set(Math.cos(angle) * 0.26, y, Math.sin(angle) * 0.26);
      scar.lookAt(Math.cos(angle) * 2, y, Math.sin(angle) * 2);
      group.add(scar);
    }

    for (let l = 0; l < 10; l++) {
      const angle = (l / 10) * Math.PI * 2;
      const tilt = 0.5 + Math.random() * 0.3;
      const leafGroup = new THREE.Group();

      const rachis = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.1, 8), dark);
      rachis.position.y = 0.55;
      leafGroup.add(rachis);

      for (let p = 0; p < 8; p++) {
        const leafletL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.18, 0.04), accent);
        leafletL.position.set(0.07, 0.6 + p * 0.1, 0);
        leafletL.rotation.z = 0.4;
        leafGroup.add(leafletL);
        const leafletR = leafletL.clone();
        leafletR.position.x = -0.07;
        leafletR.rotation.z = -0.4;
        leafGroup.add(leafletR);
      }

      leafGroup.position.y = 0.5;
      leafGroup.rotation.y = angle;
      leafGroup.rotation.z = tilt;
      group.add(leafGroup);
    }

    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 16), dark);
    cone.position.y = 0.95;
    group.add(cone);
  }

  private buildGeneric(group: THREE.Group, base: THREE.Material): void {
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), base);
    core.position.y = 0.5;
    group.add(core);
  }

  private createExhibits(dataList: FossilData[]): void {
    if (!this.scene) return;

    const usedData = dataList.slice(0, this.exhibitCount);

    for (let i = 0; i < this.exhibitCount; i++) {
      const angle = (i / this.exhibitCount) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * this.ringRadius;
      const z = Math.sin(angle) * this.ringRadius;
      const data = usedData[i % usedData.length];

      const pedestalY = -2;
      const pedestalTargetY = this.pedestalHeight / 2;

      const { mesh: pedestalMesh, materials: pedestalMats } = this.createPedestal(
        new THREE.Vector3(x, pedestalY, z)
      );

      const { group: fossilGroup, materials: fossilMats } = this.createFossilModel(data);
      fossilGroup.position.set(x, pedestalTargetY + this.pedestalHeight / 2 + 0.15, z);
      fossilGroup.userData.fossilId = data.id;

      const { mesh: haloMesh, material: haloMat } = this.createHalo();
      haloMesh.position.set(x, pedestalTargetY + 0.02, z);

      const exhibitGroup = new THREE.Group();
      exhibitGroup.userData.fossilId = data.id;

      this.scene.add(pedestalMesh);
      this.scene.add(fossilGroup);
      this.scene.add(haloMesh);

      fossilGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.userData.fossilId = data.id;
          this.raycastTargets.push(obj);
        }
      });
      pedestalMesh.userData.fossilId = data.id;
      this.raycastTargets.push(pedestalMesh);

      const exhibit: Exhibit = {
        id: data.id,
        data,
        group: exhibitGroup,
        pedestal: pedestalMesh,
        fossil: fossilGroup,
        halo: haloMesh,
        haloMaterial: haloMat,
        pedestalMaterials: pedestalMats,
        fossilMaterials: fossilMats,
        baseY: pedestalTargetY + this.pedestalHeight / 2 + 0.15,
        isSelected: false,
        isFiltered: false,
        autoRotationSpeed: 0,
        haloTime: 0,
        haloActive: false
      };

      (pedestalMesh as any).userData.exhibitIndex = i;
      this.exhibits.push(exhibit);
    }
  }

  private playIntroAnimations(): void {
    this.exhibits.forEach((exhibit, idx) => {
      setTimeout(() => {
        this.tweenGroup.add(
          new Tween({ y: exhibit.pedestal.position.y })
            .to({ y: this.pedestalHeight / 2 }, 900)
            .easing(Easing.Cubic.Out)
            .onUpdate((obj) => {
              exhibit.pedestal.position.y = obj.y;
              exhibit.halo.position.y = obj.y + 0.02;
              exhibit.fossil.position.y = obj.y + this.pedestalHeight / 2 + 0.15;
              exhibit.baseY = obj.y + this.pedestalHeight / 2 + 0.15;
            })
            .start()
        );
      }, idx * 300);
    });
  }

  handleClick(intersects: THREE.Intersection[]): string | null {
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.fossilId) {
          return obj.userData.fossilId as string;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  selectExhibit(id: string): void {
    if (this.selectedId === id) return;

    this.deselectAll();

    const exhibit = this.exhibits.find((e) => e.id === id);
    if (!exhibit) return;

    exhibit.isSelected = true;
    this.selectedId = id;

    this.tweenGroup.add(
      new Tween({ y: exhibit.fossil.position.y })
        .to({ y: exhibit.baseY + 0.8 }, 600)
        .easing(Easing.Cubic.Out)
        .onUpdate((obj) => {
          exhibit.fossil.position.y = obj.y;
        })
        .start()
    );

    exhibit.autoRotationSpeed = 1;
  }

  deselectAll(): void {
    this.exhibits.forEach((exhibit) => {
      if (exhibit.isSelected) {
        exhibit.isSelected = false;
        this.tweenGroup.add(
          new Tween({ y: exhibit.fossil.position.y })
            .to({ y: exhibit.baseY }, 600)
            .easing(Easing.Cubic.Out)
            .onUpdate((obj) => {
              exhibit.fossil.position.y = obj.y;
            })
            .start()
        );
      }
      exhibit.autoRotationSpeed = 0;
    });
    this.selectedId = null;
  }

  filterCategory(category: FossilCategory | null): void {
    this.exhibits.forEach((exhibit) => {
      const shouldShow = category === null || exhibit.data.category === category;
      exhibit.isFiltered = !shouldShow;

      const targetOpacity = shouldShow ? 1 : 0.2;
      const fadeMats: THREE.MeshStandardMaterial[] = [
        ...exhibit.pedestalMaterials,
        ...exhibit.fossilMaterials
      ];

      fadeMats.forEach((mat) => {
        mat.transparent = true;
        this.tweenGroup.add(
          new Tween({ opacity: mat.opacity })
            .to({ opacity: targetOpacity }, 500)
            .easing(Easing.Cubic.InOut)
            .onUpdate((obj) => {
              mat.opacity = obj.opacity;
            })
            .start()
        );
      });

      this.tweenGroup.add(
        new Tween({ opacity: exhibit.haloMaterial.opacity })
          .to({ opacity: shouldShow ? exhibit.haloMaterial.opacity : 0 }, 500)
          .easing(Easing.Cubic.InOut)
          .onUpdate((obj) => {
            if (!exhibit.haloActive) exhibit.haloMaterial.opacity = obj.opacity;
          })
          .start()
      );
    });
  }

  update(delta: number, camera: THREE.Camera): void {
    this.tweenGroup.update();

    if (this.earthGroup) {
      this.earthGroup.rotation.y += delta * 0.1;
    }

    this.exhibits.forEach((exhibit) => {
      if (exhibit.autoRotationSpeed > 0) {
        exhibit.fossil.rotation.y += delta * exhibit.autoRotationSpeed * this.rotationSpeed * 1.2;
      }

      const dx = camera.position.x - exhibit.pedestal.position.x;
      const dz = camera.position.z - exhibit.pedestal.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const near = dist < 3.0 && !exhibit.isFiltered;

      if (near && !exhibit.haloActive) {
        exhibit.haloActive = true;
        exhibit.haloTime = 0;
      } else if (!near && exhibit.haloActive) {
        exhibit.haloActive = false;
        if (!exhibit.isFiltered) {
          this.tweenGroup.add(
            new Tween({ opacity: exhibit.haloMaterial.opacity })
              .to({ opacity: 0 }, 400)
              .easing(Easing.Cubic.Out)
              .onUpdate((obj) => {
                if (!exhibit.haloActive) exhibit.haloMaterial.opacity = obj.opacity;
              })
              .start()
          );
        }
      }

      if (exhibit.haloActive) {
        exhibit.haloTime += delta;
        const phase = (exhibit.haloTime / 1.5) * Math.PI * 2;
        exhibit.haloMaterial.opacity = 0.1 + (Math.sin(phase) + 1) * 0.12;
      }
    });
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  getSelectedData(): FossilData | null {
    if (!this.selectedId) return null;
    const ex = this.exhibits.find((e) => e.id === this.selectedId);
    return ex ? ex.data : null;
  }

  dispose(): void {
    this.exhibits.forEach((ex) => {
      this.scene?.remove(ex.pedestal);
      this.scene?.remove(ex.fossil);
      this.scene?.remove(ex.halo);
    });
    if (this.earthGroup && this.scene) {
      this.scene.remove(this.earthGroup);
    }
    this.exhibits = [];
    this.raycastTargets = [];
    this.initialized = false;
  }
}
