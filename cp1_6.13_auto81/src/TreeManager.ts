import * as THREE from 'three';
import _ from 'lodash';

export interface RingData {
  widths: number[];
  year: number;
  moisture: number;
}

export class TreeManager {
  private scene: THREE.Scene;
  private year: number = 15;
  private moisture: number = 50;

  private trunkGroup: THREE.Group;
  private lowerTrunk: THREE.Mesh | null = null;
  private upperTrunk: THREE.Mesh | null = null;
  private singleTrunk: THREE.Mesh | null = null;
  private trunkMaterial: THREE.MeshStandardMaterial;

  private crownGroup: THREE.Group;
  private crownSprites: THREE.Sprite[] = [];

  private cutY: number | null = null;
  private cutGap: number = 0;
  private targetCutGap: number = 0;
  private isCut: boolean = false;

  private onRingDataUpdate: ((data: RingData) => void) | null = null;

  private baseHeight: number = 2;
  private baseRadius: number = 0.3;
  private trunkTexture: THREE.CanvasTexture | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.trunkGroup = new THREE.Group();
    this.crownGroup = new THREE.Group();
    this.trunkMaterial = this.createTrunkMaterial();

    this.buildTrunk();
    this.buildCrown();

    this.scene.add(this.trunkGroup);
    this.scene.add(this.crownGroup);
  }

  setOnRingDataUpdate(cb: (data: RingData) => void) {
    this.onRingDataUpdate = cb;
  }

  private createTrunkMaterial(): THREE.MeshStandardMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#8B6914');
    grad.addColorStop(0.2, '#A0782C');
    grad.addColorStop(0.4, '#6B4E1A');
    grad.addColorStop(0.6, '#8B6914');
    grad.addColorStop(0.8, '#7A5C22');
    grad.addColorStop(1, '#5C3D1E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 512;
      ctx.strokeStyle = `rgba(40, 25, 10, ${0.05 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      let cy = 0;
      while (cy < 512) {
        const nx = x + (Math.random() - 0.5) * 4;
        cy += 3 + Math.random() * 5;
        ctx.lineTo(nx, cy);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const a = Math.random() * 0.15;
      ctx.fillStyle = `rgba(30, 15, 5, ${a})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    this.trunkTexture = new THREE.CanvasTexture(canvas);
    this.trunkTexture.wrapS = THREE.RepeatWrapping;
    this.trunkTexture.wrapT = THREE.RepeatWrapping;

    return new THREE.MeshStandardMaterial({
      map: this.trunkTexture,
      roughness: 0.85,
      metalness: 0.02,
    });
  }

  private getTrunkHeight(): number {
    return this.baseHeight * (1 + 0.8 * (1 - Math.exp(-this.year / 3)));
  }

  private getTrunkRadius(): number {
    return this.baseRadius * (1 + 0.6 * (1 - Math.exp(-this.year / 4)));
  }

  private buildTrunk() {
    const h = this.getTrunkHeight();
    const r = this.getTrunkRadius();

    if (this.singleTrunk) {
      this.trunkGroup.remove(this.singleTrunk);
      this.singleTrunk.geometry.dispose();
    }
    if (this.lowerTrunk) {
      this.trunkGroup.remove(this.lowerTrunk);
      this.lowerTrunk.geometry.dispose();
    }
    if (this.upperTrunk) {
      this.trunkGroup.remove(this.upperTrunk);
      this.upperTrunk.geometry.dispose();
    }

    if (this.isCut && this.cutY !== null) {
      const lowerH = Math.max(0.01, this.cutY);
      const upperH = Math.max(0.01, h - this.cutY);

      const lowerGeo = new THREE.CylinderGeometry(r, r * 1.08, lowerH, 24, 1);
      this.lowerTrunk = new THREE.Mesh(lowerGeo, this.trunkMaterial);
      this.lowerTrunk.position.y = lowerH / 2;
      this.trunkGroup.add(this.lowerTrunk);

      const upperGeo = new THREE.CylinderGeometry(r * 0.95, r, upperH, 24, 1);
      this.upperTrunk = new THREE.Mesh(upperGeo, this.trunkMaterial);
      this.upperTrunk.position.y = this.cutY + upperH / 2 + this.cutGap;
      this.trunkGroup.add(this.upperTrunk);

      this.singleTrunk = null;
    } else {
      const geo = new THREE.CylinderGeometry(r * 0.95, r * 1.08, h, 24, 1);
      this.singleTrunk = new THREE.Mesh(geo, this.trunkMaterial);
      this.singleTrunk.position.y = h / 2;
      this.trunkGroup.add(this.singleTrunk);
      this.lowerTrunk = null;
      this.upperTrunk = null;
    }
  }

  private buildCrown() {
    while (this.crownGroup.children.length > 0) {
      const child = this.crownGroup.children[0];
      this.crownGroup.remove(child);
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
      }
    }
    this.crownSprites = [];

    const spriteTexCanvas = document.createElement('canvas');
    spriteTexCanvas.width = 64;
    spriteTexCanvas.height = 64;
    const sCtx = spriteTexCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sGrad.addColorStop(0, 'rgba(120, 200, 60, 0.9)');
    sGrad.addColorStop(0.5, 'rgba(100, 180, 40, 0.6)');
    sGrad.addColorStop(1, 'rgba(80, 160, 30, 0.0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 64, 64);

    const spriteTex = new THREE.CanvasTexture(spriteTexCanvas);

    const h = this.getTrunkHeight();
    const r = this.getTrunkRadius();

    for (let i = 0; i < 200; i++) {
      const mat = new THREE.SpriteMaterial({
        map: spriteTex,
        transparent: true,
        opacity: 0.6,
      });

      const t = Math.random();
      const green = Math.floor(140 + t * 80);
      const red = Math.floor(60 + t * 60);
      mat.color = new THREE.Color(`rgb(${red}, ${green}, ${30 + Math.floor(t * 30)})`);

      const sprite = new THREE.Sprite(mat);

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 3.5;
      const yOff = Math.random() * r * 5;

      sprite.position.set(
        Math.cos(angle) * dist,
        h + yOff * 0.5 - r * 0.5,
        Math.sin(angle) * dist
      );

      const scale = 0.08 + Math.random() * 0.12;
      sprite.scale.set(scale, scale, scale);

      this.crownSprites.push(sprite);
      this.crownGroup.add(sprite);
    }
  }

  setYear(year: number) {
    this.year = year;
    this.rebuild();
  }

  setMoisture(moisture: number) {
    this.moisture = moisture;
    this.updateMoistureEffect();
  }

  private rebuild() {
    this.buildTrunk();
    this.rebuildCrownPositions();
    this.emitRingData();
  }

  private rebuildCrownPositions() {
    const h = this.getTrunkHeight();
    const r = this.getTrunkRadius();

    this.crownSprites.forEach((sprite) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 3.5;
      const yOff = Math.random() * r * 5;

      sprite.position.set(
        Math.cos(angle) * dist,
        h + yOff * 0.5 - r * 0.5,
        Math.sin(angle) * dist
      );
    });
  }

  private updateMoistureEffect() {
    const factor = (this.moisture - 50) / 50;

    if (this.trunkMaterial) {
      const baseHsl = { h: 0, s: 0, l: 0 };
      new THREE.Color('#8B6914').getHSL(baseHsl);
      const newS = Math.max(0, Math.min(1, baseHsl.s + factor * 0.1));
      const newL = Math.max(0, Math.min(1, baseHsl.l + factor * 0.08));
      const c = new THREE.Color();
      c.setHSL(baseHsl.h, newS, newL);
      this.trunkMaterial.color = c;
    }

    this.emitRingData();
  }

  getRingWidths(): number[] {
    const moistureFactor = (this.moisture - 50) / 50;
    const widths: number[] = [];
    for (let i = 0; i < this.year; i++) {
      let growthRate = 1.0;
      if (i < 5) {
        growthRate = 1.5 - i * 0.1;
      } else {
        growthRate = Math.max(0.4, 1.0 - (i - 5) * 0.025);
      }
      let w = (0.008 + Math.random() * 0.007) * growthRate;
      w *= (1 + moistureFactor * 0.2);
      w = Math.max(0.004, w);
      widths.push(w);
    }
    return widths;
  }

  private emitRingData() {
    if (this.onRingDataUpdate) {
      this.onRingDataUpdate({
        widths: this.getRingWidths(),
        year: this.year,
        moisture: this.moisture,
      });
    }
  }

  getTrunkMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    if (this.singleTrunk) meshes.push(this.singleTrunk);
    if (this.lowerTrunk) meshes.push(this.lowerTrunk);
    if (this.upperTrunk) meshes.push(this.upperTrunk);
    return meshes;
  }

  cutAt(y: number) {
    const h = this.getTrunkHeight();
    if (y < 0.05 || y > h - 0.05) return;

    this.cutY = y;
    this.isCut = true;
    this.targetCutGap = 0.05;
    this.buildTrunk();
    this.emitRingData();
  }

  uncut() {
    this.isCut = false;
    this.cutY = null;
    this.cutGap = 0;
    this.targetCutGap = 0;
    this.buildTrunk();
  }

  update(delta: number) {
    if (this.cutGap !== this.targetCutGap) {
      this.cutGap += (this.targetCutGap - this.cutGap) * Math.min(1, delta * 5);
      if (Math.abs(this.cutGap - this.targetCutGap) < 0.001) {
        this.cutGap = this.targetCutGap;
      }
      if (this.upperTrunk && this.cutY !== null) {
        const h = this.getTrunkHeight();
        const upperH = Math.max(0.01, h - this.cutY);
        this.upperTrunk.position.y = this.cutY + upperH / 2 + this.cutGap;
      }
    }
  }

  getCurrentHeight(): number {
    return this.getTrunkHeight();
  }

  getCurrentRadius(): number {
    return this.getTrunkRadius();
  }

  getCutY(): number | null {
    return this.cutY;
  }

  getIsCut(): boolean {
    return this.isCut;
  }

  getCrownGroup(): THREE.Group {
    return this.crownGroup;
  }

  getTrunkGroup(): THREE.Group {
    return this.trunkGroup;
  }

  getYear(): number {
    return this.year;
  }

  getMoisture(): number {
    return this.moisture;
  }

  forceEmitRingData() {
    this.emitRingData();
  }
}
