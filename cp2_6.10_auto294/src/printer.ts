import * as THREE from 'three';
import type { SceneManager } from './scene';
import type { TypeBox } from './typeBox';
import { animate, easeInOutCubic, easeOutCubic, easeInOutQuad, lerp, delay } from './utils';
import { createNoise2D } from 'simplex-noise';

interface TypeBlockRef {
  group: THREE.Group;
  baseMesh: THREE.Mesh;
  topMesh: THREE.Mesh;
  char: string;
}

export class Printer {
  private sceneManager: SceneManager;
  private typeBox: TypeBox;
  public root: THREE.Group;

  private inkRoller: THREE.Group | null = null;
  private inkRollerCylinder: THREE.Mesh | null = null;
  private pressRoller: THREE.Group | null = null;
  private paper: THREE.Mesh | null = null;
  private printedResult: THREE.Group | null = null;

  private isInked = false;
  private isPrinted = false;
  private isAnimating = false;
  private currentText = '';
  private currentSpacing = 0.3;

  private noise2D = createNoise2D();

  constructor(sceneManager: SceneManager, typeBox: TypeBox) {
    this.sceneManager = sceneManager;
    this.typeBox = typeBox;
    this.root = new THREE.Group();
    this.sceneManager.addObject(this.root);
    this.sceneManager.onAnimationFrame(this.update.bind(this));
  }

  private createInkRoller(): void {
    if (this.inkRoller) return;

    this.inkRoller = new THREE.Group();

    const rollerLength = 10;
    const rollerRadius = 0.5;

    const cylinderGeo = new THREE.CylinderGeometry(
      rollerRadius,
      rollerRadius,
      rollerLength,
      32
    );
    const rollerMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1810,
      roughness: 0.3,
      metalness: 0.4,
    });
    this.inkRollerCylinder = new THREE.Mesh(cylinderGeo, rollerMaterial);
    this.inkRollerCylinder.rotation.z = Math.PI / 2;
    this.inkRollerCylinder.castShadow = true;
    this.inkRoller.add(this.inkRollerCylinder);

    const inkLayerGeo = new THREE.CylinderGeometry(
      rollerRadius + 0.03,
      rollerRadius + 0.03,
      rollerLength * 0.95,
      32
    );
    const inkMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8b0000,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });
    const inkLayer = new THREE.Mesh(inkLayerGeo, inkMaterial);
    inkLayer.rotation.z = Math.PI / 2;
    this.inkRoller.add(inkLayer);

    const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, rollerLength + 1.2, 16);
    const axleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.7,
      metalness: 0.6,
    });
    const axle = new THREE.Mesh(axleGeo, axleMaterial);
    axle.rotation.z = Math.PI / 2;
    this.inkRoller.add(axle);

    const handleGeo = new THREE.BoxGeometry(0.15, 1.2, 0.15);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.8,
      metalness: 0.2,
    });
    const leftHandle = new THREE.Mesh(handleGeo, handleMaterial);
    leftHandle.position.set(-rollerLength / 2 - 0.5, 0.6, 0);
    leftHandle.castShadow = true;
    this.inkRoller.add(leftHandle);

    const rightHandle = new THREE.Mesh(handleGeo, handleMaterial);
    rightHandle.position.set(rollerLength / 2 + 0.5, 0.6, 0);
    rightHandle.castShadow = true;
    this.inkRoller.add(rightHandle);

    this.inkRoller.position.set(-8, 2.5, 3);
    this.root.add(this.inkRoller);
  }

  private createPressRoller(): void {
    if (this.pressRoller) return;

    this.pressRoller = new THREE.Group();

    const rollerLength = 12;
    const rollerRadius = 0.7;

    const cylinderGeo = new THREE.CylinderGeometry(
      rollerRadius,
      rollerRadius,
      rollerLength,
      32
    );
    const rollerMaterial = new THREE.MeshStandardMaterial({
      color: 0x4e342e,
      roughness: 0.5,
      metalness: 0.3,
    });
    const cylinder = new THREE.Mesh(cylinderGeo, rollerMaterial);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.castShadow = true;
    this.pressRoller.add(cylinder);

    const outerGeo = new THREE.CylinderGeometry(
      rollerRadius + 0.08,
      rollerRadius + 0.08,
      rollerLength * 0.98,
      32
    );
    const outerMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.95,
      metalness: 0.0,
    });
    const outer = new THREE.Mesh(outerGeo, outerMaterial);
    outer.rotation.z = Math.PI / 2;
    this.pressRoller.add(outer);

    const axleGeo = new THREE.CylinderGeometry(0.1, 0.1, rollerLength + 1.5, 16);
    const axleMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.8,
      metalness: 0.5,
    });
    const axle = new THREE.Mesh(axleGeo, axleMaterial);
    axle.rotation.z = Math.PI / 2;
    this.pressRoller.add(axle);

    this.pressRoller.position.set(-9, 1.3, 3);
    this.pressRoller.visible = false;
    this.root.add(this.pressRoller);
  }

  private createPaperTexture(withText: boolean, text: string): THREE.CanvasTexture {
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    ctx.fillStyle = '#faebd2';
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const noise = this.noise2D(x * 0.008, y * 0.008);
        const colorValue = Math.floor(250 + noise * 15);
        const g = Math.floor(235 + noise * 12);
        const b = Math.floor(210 + noise * 10);
        ctx.fillStyle = `rgb(${colorValue}, ${g}, ${b})`;
        ctx.fillRect(x, y, 4, 4);
      }
    }

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const alpha = Math.random() * 0.08;
      const fiberColor = Math.random() > 0.5 ? '139, 90, 43' : '160, 120, 80';
      ctx.fillStyle = `rgba(${fiberColor}, ${alpha})`;
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 2);
    }

    if (withText && text) {
      const chars = Array.from(text);
      const fontSize = Math.floor((width * 0.85) / chars.length);
      ctx.save();
      ctx.font = `bold ${fontSize}px "KaiTi", "楷体", "STKaiti", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const totalWidth = chars.length * fontSize * 0.9;
      let startX = (width - totalWidth) / 2 + fontSize * 0.45;

      chars.forEach((char, i) => {
        const x = startX + i * fontSize * 0.9;
        const y = height / 2;

        for (let o = 5; o >= 0; o--) {
          const alpha = 0.08 + o * 0.02;
          const offsetX = (Math.random() - 0.5) * (o + 1) * 1.5;
          const offsetY = (Math.random() - 0.5) * (o + 1) * 1.5;
          ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
          ctx.fillText(char, x + offsetX, y + offsetY);
        }

        ctx.fillStyle = 'rgba(120, 55, 15, 0.75)';
        ctx.fillText(char, x, y);

        for (let j = 0; j < 15; j++) {
          const splatterX = x + (Math.random() - 0.5) * fontSize * 0.7;
          const splatterY = y + (Math.random() - 0.5) * fontSize * 0.5;
          const splatterSize = Math.random() * 2 + 0.5;
          const splatterAlpha = Math.random() * 0.25;
          ctx.fillStyle = `rgba(139, 69, 19, ${splatterAlpha})`;
          ctx.beginPath();
          ctx.arc(splatterX, splatterY, splatterSize, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    }

    const paperCenterX = width / 2;
    const paperCenterY = height / 2;
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const distToCenter = Math.sqrt(
          Math.pow((x - paperCenterX) / (width / 2), 2) +
          Math.pow((y - paperCenterY) / (height / 2), 2)
        );
        const edgeFactor = Math.max(0, (distToCenter - 0.75) / 0.25);
        if (edgeFactor > 0) {
          const curlNoise = this.noise2D(x * 0.02, y * 0.02);
          const curlAlpha = edgeFactor * (0.15 + curlNoise * 0.1);
          ctx.fillStyle = `rgba(180, 140, 80, ${curlAlpha})`;
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private createPaper(): void {
    if (this.paper) return;

    const paperWidth = 13;
    const paperHeight = 6.5;

    const texture = this.createPaperTexture(false, '');
    const paperMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });

    const paperGeo = new THREE.PlaneGeometry(paperWidth, paperHeight, 60, 30);
    this.paper = new THREE.Mesh(paperGeo, paperMaterial);
    this.paper.rotation.x = -Math.PI / 2;
    this.paper.position.set(0, 8, 3);
    this.paper.receiveShadow = true;

    this.applyPaperWarp(this.paper, 0);

    this.root.add(this.paper);
  }

  private applyPaperWarp(paper: THREE.Mesh, intensity: number): void {
    const positions = paper.geometry.attributes.position as THREE.BufferAttribute;
    const originalPositions = (paper.geometry as any)._originalPositions;

    if (!originalPositions) {
      (paper.geometry as any)._originalPositions = new Float32Array(positions.array);
    }
    const orig = (paper.geometry as any)._originalPositions;

    for (let i = 0; i < positions.count; i++) {
      const x = orig[i * 3];
      const y = orig[i * 3 + 1];
      const z = orig[i * 3 + 2];

      const distFromCenter = Math.sqrt(
        Math.pow(x / 6.5, 2) + Math.pow(y / 3.25, 2)
      );
      const edgeFactor = Math.max(0, (distFromCenter - 0.6) / 0.4);

      const warpNoise = this.noise2D(x * 0.5 + intensity, y * 0.5 + intensity * 0.7);
      const curlZ = edgeFactor * (0.15 + warpNoise * 0.1) * (1 + intensity * 0.5);
      const curlX = edgeFactor * x * 0.02 * (1 + intensity * 0.3);
      const curlY = edgeFactor * y * 0.02 * (1 + intensity * 0.3);

      positions.setXYZ(i, x + curlX, y + curlY, z + curlZ);
    }

    positions.needsUpdate = true;
    paper.geometry.computeVertexNormals();
  }

  public applyInk(): Promise<void> {
    return new Promise(async (resolve) => {
      if (this.isAnimating || this.isInked) {
        resolve();
        return;
      }

      const arranged = this.typeBox.getArrangedBlocks();
      if (arranged.length === 0) {
        resolve();
        return;
      }

      this.isAnimating = true;
      this.createInkRoller();

      const blockRefs: TypeBlockRef[] = arranged.map((b: any) => ({
        group: b.group,
        baseMesh: b.baseMesh,
        topMesh: b.topMesh,
        char: b.char,
      }));

      const startX = -9;
      const endX = 9;
      const trackY = 0.35;
      const trackZ = 3;

      this.inkRoller!.visible = true;
      this.inkRoller!.position.set(startX, trackY + 1.5, trackZ);

      const totalDuration = 2200;
      animate(
        totalDuration,
        easeInOutCubic,
        (progress, eased) => {
          const x = lerp(startX, endX, eased);
          this.inkRoller!.position.x = x;

          this.inkRollerCylinder!.rotation.x -= 0.08;

          const floatOffset = Math.sin(progress * Math.PI * 4) * 0.03;
          this.inkRoller!.position.y = trackY + 0.85 + floatOffset;

          const rollerWorldPos = new THREE.Vector3();
          this.inkRoller!.getWorldPosition(rollerWorldPos);

          blockRefs.forEach((block) => {
            const blockWorldPos = new THREE.Vector3();
            block.group.getWorldPosition(blockWorldPos);
            const dist = Math.abs(blockWorldPos.x - rollerWorldPos.x);

            if (dist < 0.8) {
              const inkAmount = Math.max(0, 1 - dist / 0.8);
              const baseMat = block.baseMesh.material as THREE.MeshStandardMaterial;
              const r = lerp(0.84, 0.45, inkAmount);
              const g = lerp(0.8, 0.05, inkAmount);
              const b = lerp(0.78, 0.05, inkAmount);
              baseMat.color.setRGB(r, g, b);
              baseMat.emissive.setRGB(inkAmount * 0.08, 0, 0);

              const topMat = block.topMesh.material as THREE.MeshStandardMaterial;
              if (topMat.map) {
                const mapCanvas = (topMat.map as THREE.CanvasTexture).image as HTMLCanvasElement;
                if (mapCanvas && mapCanvas.getContext) {
                  const mctx = mapCanvas.getContext('2d')!;
                  mctx.globalAlpha = inkAmount * 0.6;
                  mctx.fillStyle = '#8b0000';
                  mctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
                  mctx.globalAlpha = 1;
                  topMat.map.needsUpdate = true;
                }
              }
            }
          });
        },
        async () => {
          blockRefs.forEach((block) => {
            const baseMat = block.baseMesh.material as THREE.MeshStandardMaterial;
            baseMat.color.setRGB(0.4, 0.04, 0.04);
            baseMat.emissive.setRGB(0.06, 0, 0);
          });

          await delay(400);
          animate(
            600,
            easeOutCubic,
            (_p, eased) => {
              this.inkRoller!.position.y = lerp(trackY + 0.85, 4, eased);
              this.inkRoller!.position.x = lerp(this.inkRoller!.position.x, 8, eased);
            },
            () => {
              if (this.inkRoller) {
                this.root.remove(this.inkRoller);
                this.inkRoller = null;
              }
              this.isInked = true;
              this.isAnimating = false;
              resolve();
            }
          );
        }
      );
    });
  }

  public pressPrint(): Promise<void> {
    return new Promise(async (resolve) => {
      if (this.isAnimating || !this.isInked || this.isPrinted) {
        resolve();
        return;
      }

      const arranged = this.typeBox.getArrangedBlocks();
      if (arranged.length === 0) {
        resolve();
        return;
      }

      this.isAnimating = true;
      this.createPaper();
      this.createPressRoller();

      this.currentText = arranged.map((b: any) => b.char).join('');

      const trackPos = this.typeBox.getTypeTrackWorldPosition();

      this.paper!.visible = true;
      this.paper!.position.set(0, 8, trackPos.z);
      (this.paper!.material as THREE.MeshStandardMaterial).opacity = 0;

      animate(
        800,
        easeOutCubic,
        (_p, eased) => {
          (this.paper!.material as THREE.MeshStandardMaterial).opacity = eased;
          this.paper!.position.y = lerp(8, 2.5, eased);
          this.applyPaperWarp(this.paper!, eased * 0.5);
        },
        async () => {
          await delay(200);

          animate(
            700,
            easeInOutQuad,
            (_p, eased) => {
              this.paper!.position.y = lerp(2.5, 0.18, eased);
              this.applyPaperWarp(this.paper!, 0.5 + eased * 0.3);
            },
            async () => {
              this.pressRoller!.visible = true;
              this.pressRoller!.position.set(-9, 0.95, trackPos.z);

              await delay(300);

              animate(
                1800,
                easeInOutCubic,
                (_progress, eased) => {
                  const x = lerp(-8.5, 8.5, eased);
                  this.pressRoller!.position.x = x;

                  const pressRoller = this.pressRoller!.children[0] as THREE.Mesh;
                  if (pressRoller) {
                    pressRoller.rotation.x -= 0.06;
                  }

                  const floatY = Math.sin(eased * Math.PI) * 0.05;
                  this.pressRoller!.position.y = 0.92 - floatY;
                },
                async () => {
                  await delay(400);

                  animate(
                    500,
                    easeOutCubic,
                    (_p, eased) => {
                      this.pressRoller!.position.y = lerp(0.92, 3, eased);
                    },
                    () => {
                      if (this.pressRoller) {
                        this.root.remove(this.pressRoller);
                        this.pressRoller = null;
                      }
                    }
                  );

                  await delay(500);

                  const printedTexture = this.createPaperTexture(true, this.currentText);
                  (this.paper!.material as THREE.MeshStandardMaterial).map = printedTexture;
                  (this.paper!.material as THREE.MeshStandardMaterial).needsUpdate = true;

                  await delay(200);

                  animate(
                    1200,
                    easeOutCubic,
                    (_p, eased) => {
                      this.paper!.position.y = lerp(0.18, 3.5, eased);
                      this.paper!.rotation.z = lerp(0, 0.05 * Math.sin(eased * Math.PI), eased);
                      this.applyPaperWarp(this.paper!, 0.8 + eased * 0.4);
                    },
                    () => {
                      this.isPrinted = true;
                      this.isAnimating = false;
                      resolve();
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }

  public reset(): void {
    if (this.paper) {
      this.root.remove(this.paper);
      this.paper = null;
    }
    if (this.pressRoller) {
      this.root.remove(this.pressRoller);
      this.pressRoller = null;
    }
    if (this.inkRoller) {
      this.root.remove(this.inkRoller);
      this.inkRoller = null;
    }
    this.isInked = false;
    this.isPrinted = false;
  }

  public hasInked(): boolean {
    return this.isInked;
  }

  public hasPrinted(): boolean {
    return this.isPrinted;
  }

  public isBusy(): boolean {
    return this.isAnimating;
  }

  private time = 0;
  private update(delta: number): void {
    this.time += delta;

    if (this.paper && this.isPrinted) {
      this.applyPaperWarp(this.paper, this.time * 0.15);
    }
  }
}
