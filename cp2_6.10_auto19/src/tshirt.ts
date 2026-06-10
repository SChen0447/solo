import * as THREE from 'three';

export const TSHIRT_COLORS: { name: string; color: string }[] = [
  { name: '白色', color: '#ffffff' },
  { name: '黑色', color: '#1a1a1a' },
  { name: '红色', color: '#e74c3c' },
  { name: '蓝色', color: '#3498db' },
  { name: '绿色', color: '#2ecc71' },
  { name: '黄色', color: '#f1c40f' }
];

export interface TShirtCallbacks {
  onTextureUpdate?: () => void;
}

export class TShirt {
  public group: THREE.Group;
  private material: THREE.MeshStandardMaterial;
  private frontTexture: THREE.CanvasTexture;
  private frontCanvas: HTMLCanvasElement;
  private frontCtx: CanvasRenderingContext2D;
  private targetColor: THREE.Color;
  private currentColor: THREE.Color;
  private colorTransitionStart: number = 0;
  private colorTransitionDuration: number = 500;
  private isTransitioning: boolean = false;

  constructor() {
    this.group = new THREE.Group();
    this.frontCanvas = document.createElement('canvas');
    this.frontCanvas.width = 1024;
    this.frontCanvas.height = 1024;
    const ctx = this.frontCanvas.getContext('2d');
    if (!ctx) throw new Error('无法创建Canvas 2D上下文');
    this.frontCtx = ctx;

    this.frontTexture = new THREE.CanvasTexture(this.frontCanvas);
    this.frontTexture.needsUpdate = true;

    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.05
    });

    this.currentColor = new THREE.Color(0xffffff);
    this.targetColor = new THREE.Color(0xffffff);

    this.createGeometry();
    this.clearFrontTexture();
  }

  private createGeometry(): void {
    const bodyWidth = 2.2;
    const bodyHeight = 2.8;
    const bodyDepth = 0.25;
    const sleeveLength = 1.0;
    const sleeveWidth = 0.55;
    const sleeveDepth = 0.25;
    const neckWidth = 0.9;
    const neckDepth = 0.4;

    const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const body = new THREE.Mesh(bodyGeo, this.material);
    body.position.y = -0.1;
    this.group.add(body);

    const sleeveGeo = new THREE.BoxGeometry(sleeveLength, sleeveWidth, sleeveDepth);
    const leftSleeve = new THREE.Mesh(sleeveGeo, this.material);
    leftSleeve.position.set(-(bodyWidth / 2 + sleeveLength / 2 - 0.1), 0.7, 0);
    leftSleeve.rotation.z = Math.PI / 8;
    this.group.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, this.material);
    rightSleeve.position.set(bodyWidth / 2 + sleeveLength / 2 - 0.1, 0.7, 0);
    rightSleeve.rotation.z = -Math.PI / 8;
    this.group.add(rightSleeve);

    const collarGeo = new THREE.TorusGeometry(neckWidth / 2, 0.08, 16, 32, Math.PI);
    const collarMat = new THREE.MeshStandardMaterial({
      color: this.material.color,
      roughness: 0.4,
      metalness: 0.05
    });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, bodyHeight / 2 - 0.05, neckDepth / 2 - 0.05);
    collar.rotation.x = Math.PI;
    collar.name = 'collar';
    this.group.add(collar);

    const frontPlaneGeo = new THREE.PlaneGeometry(bodyWidth * 0.7, bodyHeight * 0.65);
    const frontMat = new THREE.MeshBasicMaterial({
      map: this.frontTexture,
      transparent: true
    });
    const frontPlane = new THREE.Mesh(frontPlaneGeo, frontMat);
    frontPlane.position.set(0, -0.1, bodyDepth / 2 + 0.001);
    frontPlane.name = 'frontDesign';
    this.group.add(frontPlane);
  }

  private clearFrontTexture(): void {
    this.frontCtx.clearRect(0, 0, this.frontCanvas.width, this.frontCanvas.height);
    this.frontTexture.needsUpdate = true;
  }

  public setColor(hexColor: string): void {
    this.targetColor = new THREE.Color(hexColor);
    this.colorTransitionStart = performance.now();
    this.isTransitioning = true;

    const collar = this.group.getObjectByName('collar') as THREE.Mesh;
    if (collar) {
      (collar.material as THREE.MeshStandardMaterial).color.copy(this.targetColor);
    }
  }

  public getColor(): string {
    return '#' + this.currentColor.getHexString();
  }

  public update(deltaTime: number): void {
    if (this.isTransitioning) {
      const elapsed = performance.now() - this.colorTransitionStart;
      const t = Math.min(elapsed / this.colorTransitionDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.currentColor.lerpColors(
        new THREE.Color(this.material.color.getHex()),
        this.targetColor,
        eased
      );
      this.material.color.copy(this.currentColor);

      if (t >= 1) {
        this.isTransitioning = false;
      }
    }
  }

  public getFrontCanvas(): HTMLCanvasElement {
    return this.frontCanvas;
  }

  public getFrontContext(): CanvasRenderingContext2D {
    return this.frontCtx;
  }

  public updateFrontTexture(): void {
    this.frontTexture.needsUpdate = true;
  }

  public redrawFrontTexture(drawFn: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void): void {
    this.clearFrontTexture();
    drawFn(this.frontCtx, this.frontCanvas);
    this.updateFrontTexture();
  }

  public getFrontDesignSize(): { width: number; height: number } {
    return { width: 1024, height: 1024 };
  }
}
