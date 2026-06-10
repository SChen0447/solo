import * as THREE from 'three';
import type { SceneManager } from './scene';
import { animate, easeInOutCubic, easeOutBounce, lerp } from './utils';

const COMMON_CHARS =
  '一二三四五六七八九十百千万亿人大小上下左右前后东西南北中天地日月水火山石田土金木人口手目耳鼻舌心意情思爱好恶喜怒哀惧礼乐诗书春秋冬夏风云雨雪霜露雷电花草树木梅兰竹菊松柳槐桂桃李杏梨枣稻麦粟菽麻棉蚕丝皮毛羽角革骨血肉脂膏汗涕泪唾液气声光影色彩字画笔墨纸砚琴棋剑印章鼎彝尊爵杯盘碗盏勺筷刀叉针剪锤斧锯凿铲锄犁耙舟车船马轿辇道路桥梁楼台亭阁楼堂殿宫室宅院门户窗墙壁阶庭院街巷村市镇都城邦国省府州县乡村山水河湖海洋溪泉瀑池潭沼泽岛屿峰岭崖壑岩洞谷原野沙漠林园圃牧场农田渔盐工商医卜农渔樵牧师儒生士农工商佛道神仙鬼怪妖精神魂梦魂魄灵根气脉经络脏腑筋骨皮肉面目须发眉睫口唇齿牙手足掌指趾踵膝腿腰背胸胁腹脐肩肘腕腋颈项头脸额颜腮颔口鼻耳目舌牙唇毛须发皮肤肌肉筋骨血脉魂魄精神意志念想愿望希望爱恨忧喜悲欢乐怒恐惊思虑怀念记忆知觉感悟认识理解想象创造发明发现探索研究学习教授写作阅读听闻说唱歌舞蹈画雕刻塑造建筑装饰服饰鞋袜帽巾簪钗环佩珠宝金银铜铁锡铅铝锌镁钠钾钙氧氢氮碳磷硫氯溴碘氦氖氩氪氙氡';

interface TypeBlock {
  char: string;
  group: THREE.Group;
  baseMesh: THREE.Mesh;
  topMesh: THREE.Mesh;
  targetPosition: THREE.Vector3;
  currentVelocity: THREE.Vector3;
  inTray: boolean;
  inUse: boolean;
}

export class TypeBox {
  private sceneManager: SceneManager;
  public root: THREE.Group;
  private trayGroup: THREE.Group;
  private trayInnerGroup: THREE.Group;
  private typeTrackGroup: THREE.Group;
  private handleMesh: THREE.Mesh | null = null;

  private typeBlocks: Map<string, TypeBlock> = new Map();
  private arrangedBlocks: TypeBlock[] = [];

  private trayPulledOut = false;
  private trayOffset = 0;
  private trayTargetOffset = 0;

  private charSpacing = 0.03;
  private blockBaseSize = 0.5;
  private blockHeight = 0.7;

  private isAnimating = false;

  private typeBlockGeometry: THREE.BoxGeometry | null = null;
  private typeBlockMaterial: THREE.MeshStandardMaterial | null = null;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.root = new THREE.Group();
    this.trayGroup = new THREE.Group();
    this.trayInnerGroup = new THREE.Group();
    this.typeTrackGroup = new THREE.Group();

    this.root.add(this.trayGroup);
    this.root.add(this.typeTrackGroup);
    this.trayGroup.add(this.trayInnerGroup);

    this.sceneManager.addObject(this.root);

    this.initGeometries();
    this.createTray();
    this.createTypeTrack();
    this.populateTypeBlocks();
    this.setupInteraction();
    this.sceneManager.onAnimationFrame(this.update.bind(this));
  }

  private initGeometries(): void {
    this.typeBlockGeometry = new THREE.BoxGeometry(
      this.blockBaseSize,
      this.blockHeight,
      this.blockBaseSize
    );
    this.typeBlockMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7ccc8,
      roughness: 0.75,
      metalness: 0.05,
    });
  }

  private createTray(): void {
    const trayWidth = 12;
    const trayDepth = 8;
    const trayHeight = 1.2;
    const wallThickness = 0.3;

    const trayMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d6e63,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
    });

    const bottomGeo = new THREE.BoxGeometry(trayWidth, 0.15, trayDepth);
    const bottom = new THREE.Mesh(bottomGeo, trayMaterial);
    bottom.position.y = -trayHeight / 2 + 0.075;
    bottom.receiveShadow = true;
    this.trayInnerGroup.add(bottom);

    const backWallGeo = new THREE.BoxGeometry(
      trayWidth,
      trayHeight,
      wallThickness
    );
    const backWall = new THREE.Mesh(backWallGeo, trayMaterial.clone());
    backWall.position.set(0, 0, -trayDepth / 2 + wallThickness / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.trayInnerGroup.add(backWall);

    const sideWallGeo = new THREE.BoxGeometry(
      wallThickness,
      trayHeight,
      trayDepth
    );
    const leftWall = new THREE.Mesh(sideWallGeo, trayMaterial.clone());
    leftWall.position.set(-trayWidth / 2 + wallThickness / 2, 0, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.trayInnerGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, trayMaterial.clone());
    rightWall.position.set(trayWidth / 2 - wallThickness / 2, 0, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.trayInnerGroup.add(rightWall);

    const frontFaceGeo = new THREE.BoxGeometry(
      trayWidth + 0.4,
      trayHeight + 0.2,
      0.25
    );
    const frontFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x795548,
      roughness: 0.8,
      metalness: 0.1,
    });
    const frontFace = new THREE.Mesh(frontFaceGeo, frontFaceMaterial);
    frontFace.position.set(0, -0.05, trayDepth / 2 + 0.05);
    frontFace.castShadow = true;
    frontFace.receiveShadow = true;
    frontFace.name = 'tray-front';
    this.trayInnerGroup.add(frontFace);

    const handleGeo = new THREE.BoxGeometry(2, 0.4, 0.6);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.6,
      metalness: 0.3,
    });
    const handle = new THREE.Mesh(handleGeo, handleMaterial);
    handle.position.set(0, -0.05, trayDepth / 2 + 0.55);
    handle.castShadow = true;
    handle.name = 'tray-handle';
    this.trayInnerGroup.add(handle);
    this.handleMesh = handle;

    this.trayGroup.position.set(0, 0.3, -1.5);

    const dividerMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d4c41,
      roughness: 0.9,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 1; i < 6; i++) {
      const dividerGeo = new THREE.BoxGeometry(0.05, 0.4, trayDepth - 0.5);
      const divider = new THREE.Mesh(dividerGeo, dividerMaterial);
      divider.position.set(
        -trayWidth / 2 + (i * trayWidth) / 6,
        -trayHeight / 2 + 0.3,
        0
      );
      this.trayInnerGroup.add(divider);
    }
  }

  private createTypeTrack(): void {
    const trackWidth = 14;
    const trackDepth = 1.2;

    const trackBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.85,
      metalness: 0.05,
    });

    const trackBaseGeo = new THREE.BoxGeometry(trackWidth, 0.25, trackDepth);
    const trackBase = new THREE.Mesh(trackBaseGeo, trackBaseMaterial);
    trackBase.position.y = -0.95;
    trackBase.receiveShadow = true;
    trackBase.castShadow = true;
    this.typeTrackGroup.add(trackBase);

    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e342e,
      roughness: 0.8,
      metalness: 0.1,
    });

    const leftSideGeo = new THREE.BoxGeometry(0.15, 0.5, trackDepth);
    const leftSide = new THREE.Mesh(leftSideGeo, sideMaterial);
    leftSide.position.set(-trackWidth / 2 + 0.075, -0.6, 0);
    leftSide.castShadow = true;
    this.typeTrackGroup.add(leftSide);

    const rightSide = new THREE.Mesh(leftSideGeo, sideMaterial);
    rightSide.position.set(trackWidth / 2 - 0.075, -0.6, 0);
    rightSide.castShadow = true;
    this.typeTrackGroup.add(rightSide);

    const frontLedgeGeo = new THREE.BoxGeometry(trackWidth, 0.3, 0.12);
    const frontLedge = new THREE.Mesh(frontLedgeGeo, sideMaterial);
    frontLedge.position.set(0, -0.7, trackDepth / 2 - 0.06);
    frontLedge.castShadow = true;
    this.typeTrackGroup.add(frontLedge);

    const backLedge = new THREE.Mesh(frontLedgeGeo, sideMaterial);
    backLedge.position.set(0, -0.7, -trackDepth / 2 + 0.06);
    backLedge.castShadow = true;
    this.typeTrackGroup.add(backLedge);

    this.typeTrackGroup.position.set(0, 0.3, 3);
  }

  private createCharTexture(char: string): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.scale(-1, 1);
    ctx.font = 'bold 160px "KaiTi", "楷体", "STKaiti", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3e2723';
    ctx.fillText(char, 0, 8);
    ctx.restore();

    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(62, 39, 35, ${Math.random() * 0.08})`;
      ctx.fillRect(
        Math.random() * size,
        Math.random() * size,
        Math.random() * 3 + 1,
        Math.random() * 3 + 1
      );
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  private createTypeBlock(char: string): TypeBlock {
    const group = new THREE.Group();

    const baseMaterial = this.typeBlockMaterial!.clone();
    const baseMesh = new THREE.Mesh(this.typeBlockGeometry!, baseMaterial);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const texture = this.createCharTexture(char);
    const topMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.05,
    });

    const topGeo = new THREE.BoxGeometry(
      this.blockBaseSize * 0.92,
      0.06,
      this.blockBaseSize * 0.92
    );
    const topMesh = new THREE.Mesh(topGeo, topMaterial);
    topMesh.position.y = this.blockHeight / 2 + 0.025;
    topMesh.castShadow = true;
    group.add(topMesh);

    return {
      char,
      group,
      baseMesh,
      topMesh,
      targetPosition: new THREE.Vector3(),
      currentVelocity: new THREE.Vector3(),
      inTray: true,
      inUse: false,
    };
  }

  private populateTypeBlocks(): void {
    const trayInnerWidth = 10.5;
    const trayInnerDepth = 6.5;
    const blockSize = this.blockBaseSize + 0.08;
    const cols = Math.floor(trayInnerWidth / blockSize);
    const rows = Math.floor(trayInnerDepth / blockSize);

    const chars = COMMON_CHARS.slice(0, cols * rows);
    let charIndex = 0;

    for (let row = 0; row < rows && charIndex < chars.length; row++) {
      for (let col = 0; col < cols && charIndex < chars.length; col++) {
        const char = chars[charIndex];
        if (this.typeBlocks.has(char)) {
          charIndex++;
          continue;
        }

        const block = this.createTypeBlock(char);
        const x = -trayInnerWidth / 2 + col * blockSize + blockSize / 2;
        const z = -trayInnerDepth / 2 + row * blockSize + blockSize / 2;
        const y = 0.05;

        block.group.position.set(x, y, z);
        block.targetPosition.set(x, y, z);
        block.group.rotation.y = (Math.random() - 0.5) * 0.02;

        this.typeBlocks.set(char, block);
        this.trayInnerGroup.add(block.group);
        charIndex++;
      }
    }
  }

  private setupInteraction(): void {
    const canvas = this.sceneManager.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    canvas.addEventListener('click', (event) => {
      if (this.isAnimating) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.sceneManager.camera);
      const intersects = raycaster.intersectObjects([
        this.handleMesh!,
        this.trayInnerGroup.getObjectByName('tray-front')!,
      ]);

      if (intersects.length > 0) {
        this.toggleTray();
      }
    });
  }

  public toggleTray(): void {
    if (this.isAnimating) return;
    if (this.trayPulledOut) {
      this.pushTray();
    } else {
      this.pullTray();
    }
  }

  public pullTray(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAnimating || this.trayPulledOut) {
        resolve();
        return;
      }
      this.isAnimating = true;
      this.trayTargetOffset = 4;

      const blocks = Array.from(this.typeBlocks.values()).filter(
        (b) => b.inTray && !b.inUse
      );

      blocks.forEach((block) => {
        block.currentVelocity.set(
          (Math.random() - 0.5) * 0.03,
          Math.random() * 0.04,
          Math.random() * 0.03
        );
      });

      animate(
        1200,
        easeInOutCubic,
        (_progress, eased) => {
          this.trayOffset = lerp(0, this.trayTargetOffset, eased);
          this.trayInnerGroup.position.z = this.trayOffset;

          blocks.forEach((block) => {
            if (eased < 0.7) {
              block.group.position.x += block.currentVelocity.x;
              block.group.position.y += block.currentVelocity.y;
              block.group.position.z += block.currentVelocity.z;
              block.currentVelocity.y -= 0.003;

              block.group.rotation.x += block.currentVelocity.z * 0.5;
              block.group.rotation.z += block.currentVelocity.x * 0.5;

              if (block.group.position.y < block.targetPosition.y) {
                block.group.position.y = block.targetPosition.y;
                block.currentVelocity.y *= -0.3;
                block.currentVelocity.x *= 0.85;
                block.currentVelocity.z *= 0.85;
              }
            } else {
              const snapProgress = (eased - 0.7) / 0.3;
              const snapEased = easeOutBounce(snapProgress);
              block.group.position.x = lerp(
                block.group.position.x,
                block.targetPosition.x,
                snapEased
              );
              block.group.position.y = lerp(
                block.group.position.y,
                block.targetPosition.y,
                snapEased
              );
              block.group.position.z = lerp(
                block.group.position.z,
                block.targetPosition.z,
                snapEased
              );
              block.group.rotation.x = lerp(
                block.group.rotation.x,
                (Math.random() - 0.5) * 0.01,
                snapEased
              );
              block.group.rotation.z = lerp(
                block.group.rotation.z,
                (Math.random() - 0.5) * 0.01,
                snapEased
              );
            }
          });
        },
        () => {
          this.trayPulledOut = true;
          this.isAnimating = false;
          resolve();
        }
      );
    });
  }

  public pushTray(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAnimating || !this.trayPulledOut) {
        resolve();
        return;
      }
      this.isAnimating = true;
      const startOffset = this.trayOffset;

      animate(
        1000,
        easeInOutCubic,
        (_progress, eased) => {
          this.trayOffset = lerp(startOffset, 0, eased);
          this.trayInnerGroup.position.z = this.trayOffset;
        },
        () => {
          this.trayPulledOut = false;
          this.isAnimating = false;
          resolve();
        }
      );
    });
  }

  public clearArrangedBlocks(): void {
    this.arrangedBlocks.forEach((block) => {
      block.inUse = false;
      block.inTray = true;
      this.typeTrackGroup.remove(block.group);
      this.trayInnerGroup.add(block.group);

      animate(
        600,
        easeInOutCubic,
        (_p, eased) => {
          block.group.position.x = lerp(
            block.group.position.x,
            block.targetPosition.x,
            eased
          );
          block.group.position.y = lerp(
            block.group.position.y,
            block.targetPosition.y,
            eased
          );
          block.group.position.z = lerp(
            block.group.position.z,
            block.targetPosition.z,
            eased
          );
          block.group.rotation.y = lerp(block.group.rotation.y, 0, eased);
        }
      );

      const mat = block.baseMesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0xd7ccc8);
      mat.emissive.setHex(0x000000);
    });

    this.arrangedBlocks = [];
  }

  public setText(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.clearArrangedBlocks();

      if (!text) {
        resolve();
        return;
      }

      const chars = Array.from(text).slice(0, 20);
      const trackWidth = 14;
      const blockFullSize = this.blockBaseSize + this.charSpacing;
      const totalWidth = chars.length * blockFullSize - this.charSpacing;
      const startX = -totalWidth / 2 + this.blockBaseSize / 2;

      chars.forEach((char, index) => {
        let block = this.typeBlocks.get(char);
        if (!block) {
          block = this.createTypeBlock(char);
          block.group.position.copy(block.targetPosition);
          this.typeBlocks.set(char, block);
          this.trayInnerGroup.add(block.group);
        }

        block.inUse = true;
        block.inTray = false;
        this.arrangedBlocks.push(block);

        const targetX = startX + index * blockFullSize;
        const targetY = -0.3;
        const targetZ = 0;

        this.trayInnerGroup.remove(block.group);
        this.typeTrackGroup.add(block.group);

        const startWorldPos = new THREE.Vector3();
        block.group.getWorldPosition(startWorldPos);

        const localTarget = new THREE.Vector3(targetX, targetY, targetZ);
        block.group.position.set(
          startWorldPos.x - this.typeTrackGroup.position.x,
          startWorldPos.y - this.typeTrackGroup.position.y,
          startWorldPos.z - this.typeTrackGroup.position.z
        );

        const delay = index * 80;
        setTimeout(() => {
          animate(
            800,
            easeInOutCubic,
            (_p, eased) => {
              block!.group.position.x = lerp(
                block!.group.position.x,
                localTarget.x,
                eased
              );
              block!.group.position.y = lerp(
                block!.group.position.y,
                localTarget.y + Math.sin(eased * Math.PI) * 1.2,
                eased
              );
              block!.group.position.z = lerp(
                block!.group.position.z,
                localTarget.z,
                eased
              );
              block!.group.rotation.y = lerp(
                block!.group.rotation.y,
                0,
                eased
              );
            },
            () => {
              if (index === chars.length - 1) {
                resolve();
              }
            }
          );
        }, delay);
      });

      if (chars.length === 0) {
        resolve();
      }
    });
  }

  public adjustSpacing(spacingMm: number): void {
    this.charSpacing = spacingMm / 100;

    if (this.arrangedBlocks.length === 0) return;

    const blockFullSize = this.blockBaseSize + this.charSpacing;
    const totalWidth =
      this.arrangedBlocks.length * blockFullSize - this.charSpacing;
    const startX = -totalWidth / 2 + this.blockBaseSize / 2;

    this.arrangedBlocks.forEach((block, index) => {
      const targetX = startX + index * blockFullSize;
      animate(
        300,
        easeInOutCubic,
        (_p, eased) => {
          block.group.position.x = lerp(
            block.group.position.x,
            targetX,
            eased
          );
        }
      );
    });
  }

  public getArrangedBlocks(): TypeBlock[] {
    return this.arrangedBlocks;
  }

  public getTypeTrackWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.typeTrackGroup.getWorldPosition(pos);
    return pos;
  }

  public isBusy(): boolean {
    return this.isAnimating;
  }

  private update(_delta: number): void {}

  public getBlockSize(): number {
    return this.blockBaseSize;
  }

  public getCharSpacing(): number {
    return this.charSpacing * 100;
  }
}
