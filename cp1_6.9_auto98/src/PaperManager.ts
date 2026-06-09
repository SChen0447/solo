import * as THREE from 'three';
import { EffectsManager } from './Effects';
import { PHOENIX_PAPER_COLORS, PHOENIX_PAPER_POSES, isCorrectPair } from './Phoenix';

export interface PaperData {
  mesh: THREE.Group;
  baseMesh: THREE.Mesh;
  color: THREE.Color;
  colorIndex: number;
  paperIndex: number;
  initialPosition: THREE.Vector3;
  initialRotation: THREE.Euler;
  isJoined: boolean;
  isHeld: boolean;
  originalScale: number;
  joinedTarget?: THREE.Vector3;
  joinedTargetRotation?: THREE.Euler;
}

interface ShakeAnim {
  paperData: PaperData;
  startTime: number;
  duration: number;
  amplitude: number;
  frequency: number;
  originalPosition: THREE.Vector3;
  flashCount: number;
}

interface FoldAnim {
  paperData: PaperData;
  startTime: number;
  duration: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startRotation: THREE.Euler;
  endRotation: THREE.Euler;
  startScale: THREE.Vector3;
  endScale: THREE.Vector3;
  tiltAngle: number;
}

export class PaperManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private effects: EffectsManager;

  public papers: PaperData[] = [];
  private heldPaper: PaperData | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private plane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  public completedPairs: number[][] = [];
  public onProgressChange?: (count: number, total: number) => void;
  public onAllComplete?: () => void;

  private shakeAnimations: ShakeAnim[] = [];
  private foldAnimations: FoldAnim[] = [];

  private readonly TOTAL_PAIRS = 10;
  private readonly TABLE_RADIUS = 10;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    effects: EffectsManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.effects = effects;

    this.plane.constant = -0.15;

    this.createPapers();
  }

  private createCreaseTexture(baseColor: THREE.Color): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const r = Math.floor(baseColor.r * 255);
    const g = Math.floor(baseColor.g * 255);
    const b = Math.floor(baseColor.b * 255);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(256, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(0, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private adjustBrightness(color: THREE.Color, factor: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l = Math.min(1, Math.max(0, hsl.l * factor));
    hsl.s = Math.min(1, hsl.s * 1.1);
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  private createPaperMesh(color: THREE.Color): THREE.Group {
    const group = new THREE.Group();

    const paperSize = 2;
    const geometry = new THREE.PlaneGeometry(paperSize, paperSize);

    const texture = this.createCreaseTexture(color);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.7,
      transparent: true,
      opacity: 1.0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);

    const edgeColor = this.adjustBrightness(color, 1.3);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.8
    });

    const half = paperSize / 2;
    const edgePoints = [
      new THREE.Vector3(-half, 0.002, -half),
      new THREE.Vector3(half, 0.002, -half),
      new THREE.Vector3(half, 0.002, half),
      new THREE.Vector3(-half, 0.002, half),
      new THREE.Vector3(-half, 0.002, -half)
    ];
    const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
    const edgeLine = new THREE.Line(edgeGeometry, edgeMaterial);
    edgeLine.rotation.x = -Math.PI / 2;
    group.add(edgeLine);

    (group as unknown as { baseMesh: THREE.Mesh }).baseMesh = mesh;

    return group;
  }

  private createPapers(): void {
    const usedIndices: Set<number> = new Set();

    for (let i = 0; i < 10; i++) {
      let colorIdx: number;
      do {
        colorIdx = PHOENIX_PAPER_POSES[i].colorIndex;
      } while (false);
      usedIndices.add(colorIdx);

      const colorHex = PHOENIX_PAPER_COLORS[colorIdx];
      const color = new THREE.Color(colorHex);

      const meshGroup = this.createPaperMesh(color);

      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 3.5 + Math.random() * 3;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      meshGroup.position.set(x, 0.02, z);
      meshGroup.rotation.y = Math.random() * Math.PI;

      const baseMesh = (meshGroup as unknown as { baseMesh: THREE.Mesh }).baseMesh;

      const paperData: PaperData = {
        mesh: meshGroup,
        baseMesh: baseMesh,
        color: color,
        colorIndex: colorIdx,
        paperIndex: i,
        initialPosition: meshGroup.position.clone(),
        initialRotation: meshGroup.rotation.clone(),
        isJoined: false,
        isHeld: false,
        originalScale: 1.0
      };

      meshGroup.userData.paperData = paperData;

      this.papers.push(paperData);
      this.scene.add(meshGroup);
    }
  }

  public handleMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.heldPaper) {
      this.updateHeldPaperPosition();
    } else {
      this.updateCursor();
    }
  }

  private updateHeldPaperPosition(): void {
    if (!this.heldPaper) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, intersect);

    if (intersect) {
      const maxR = this.TABLE_RADIUS - 1;
      const dist = Math.sqrt(intersect.x * intersect.x + intersect.z * intersect.z);
      if (dist > maxR) {
        const scale = maxR / dist;
        intersect.x *= scale;
        intersect.z *= scale;
      }
      this.heldPaper.mesh.position.set(intersect.x, 0.5, intersect.z);
    }
  }

  private updateCursor(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const baseMeshes = this.papers.filter(p => !p.isJoined).map(p => p.baseMesh);
    const intersects = this.raycaster.intersectObjects(baseMeshes, false);

    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'crosshair';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  public handleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const availablePapers = this.papers.filter(p => !p.isJoined);
    const baseMeshes = availablePapers.map(p => p.baseMesh);
    const intersects = this.raycaster.intersectObjects(baseMeshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const clickedPaper = availablePapers.find(p => p.baseMesh === clickedMesh);

      if (clickedPaper) {
        if (this.heldPaper === null) {
          this.pickupPaper(clickedPaper);
        } else if (clickedPaper !== this.heldPaper) {
          this.tryJoinPapers(this.heldPaper, clickedPaper);
        }
      }
    } else if (this.heldPaper) {
      this.dropPaper(this.heldPaper);
    }
  }

  private pickupPaper(paper: PaperData): void {
    paper.isHeld = true;
    this.heldPaper = paper;
    paper.originalScale = paper.mesh.scale.x;
    paper.mesh.scale.setScalar(1.1);
    paper.mesh.position.y = 0.5;

    paper.baseMesh.castShadow = true;
  }

  private dropPaper(paper: PaperData): void {
    paper.isHeld = false;
    this.heldPaper = null;
    paper.mesh.scale.setScalar(paper.originalScale);
    paper.mesh.position.y = 0.02;
  }

  private tryJoinPapers(paper1: PaperData, paper2: PaperData): void {
    const correct = isCorrectPair(paper1.paperIndex, paper2.paperIndex, this.completedPairs);

    const midPoint = new THREE.Vector3()
      .addVectors(paper1.mesh.position, paper2.mesh.position)
      .multiplyScalar(0.5);
    midPoint.y = 0.1;

    if (correct) {
      this.handleSuccessfulJoin(paper1, paper2, midPoint);
    } else {
      this.handleFailedJoin(paper1, paper2, midPoint);
    }
  }

  private handleSuccessfulJoin(paper1: PaperData, paper2: PaperData, midPoint: THREE.Vector3): void {
    const mixedColor = paper1.color.clone().lerp(paper2.color, 0.5);
    this.effects.emitParticles(midPoint, 20, mixedColor);
    this.effects.playSuccessSound();

    this.dropPaper(paper1);

    this.completedPairs.push([paper1.paperIndex, paper2.paperIndex]);

    this.startFoldAnimation(paper1);
    this.startFoldAnimation(paper2);

    paper1.isJoined = true;
    paper2.isJoined = true;

    if (this.onProgressChange) {
      this.onProgressChange(this.completedPairs.length, this.TOTAL_PAIRS);
    }

    if (this.completedPairs.length >= this.TOTAL_PAIRS && this.onAllComplete) {
      setTimeout(() => {
        this.onAllComplete!();
      }, 1000);
    }
  }

  private handleFailedJoin(paper1: PaperData, paper2: PaperData, _midPoint: THREE.Vector3): void {
    this.dropPaper(paper1);

    this.effects.playErrorSound();
    this.startShakeAnimation(paper1);
    this.startShakeAnimation(paper2);
  }

  private startFoldAnimation(paper: PaperData): void {
    const pose = PHOENIX_PAPER_POSES[paper.paperIndex];

    const anim: FoldAnim = {
      paperData: paper,
      startTime: performance.now(),
      duration: 800,
      startPosition: paper.mesh.position.clone(),
      endPosition: pose.position.clone(),
      startRotation: paper.mesh.rotation.clone(),
      endRotation: pose.rotation.clone(),
      startScale: paper.mesh.scale.clone(),
      endScale: pose.scale.clone().multiplyScalar(1.0),
      tiltAngle: THREE.MathUtils.degToRad(5)
    };

    this.foldAnimations.push(anim);
  }

  private startShakeAnimation(paper: PaperData): void {
    const anim: ShakeAnim = {
      paperData: paper,
      startTime: performance.now(),
      duration: 300,
      amplitude: 0.1,
      frequency: 10,
      originalPosition: paper.mesh.position.clone(),
      flashCount: 0
    };
    this.shakeAnimations.push(anim);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public update(_deltaTime: number): void {
    const now = performance.now();

    for (let i = this.foldAnimations.length - 1; i >= 0; i--) {
      const anim = this.foldAnimations[i];
      const elapsed = now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);
      const eased = this.easeInOutCubic(progress);

      anim.paperData.mesh.position.lerpVectors(anim.startPosition, anim.endPosition, eased);

      anim.paperData.mesh.rotation.x = anim.startRotation.x + (anim.endRotation.x - anim.startRotation.x + anim.tiltAngle * Math.sin(progress * Math.PI)) * eased;
      anim.paperData.mesh.rotation.y = anim.startRotation.y + (anim.endRotation.y - anim.startRotation.y + THREE.MathUtils.degToRad(15) * Math.sin(progress * Math.PI)) * eased;
      anim.paperData.mesh.rotation.z = anim.startRotation.z + (anim.endRotation.z - anim.startRotation.z) * eased;

      anim.paperData.mesh.scale.lerpVectors(anim.startScale, anim.endScale, eased);

      if (progress >= 1) {
        this.foldAnimations.splice(i, 1);
      }
    }

    for (let i = this.shakeAnimations.length - 1; i >= 0; i--) {
      const anim = this.shakeAnimations[i];
      const elapsed = now - anim.startTime;
      const progress = elapsed / anim.duration;

      if (progress >= 1) {
        anim.paperData.mesh.position.copy(anim.originalPosition);
        const mat = anim.paperData.baseMesh.material as THREE.MeshStandardMaterial;
        mat.color.copy(anim.paperData.color);
        mat.opacity = 1.0;
        this.shakeAnimations.splice(i, 1);
      } else {
        const shake = Math.sin(progress * Math.PI * 2 * anim.frequency) * anim.amplitude * (1 - progress);
        anim.paperData.mesh.position.x = anim.originalPosition.x + shake;
        anim.paperData.mesh.position.z = anim.originalPosition.z + shake * 0.5;

        const flashPhase = Math.floor(progress * 4);
        const mat = anim.paperData.baseMesh.material as THREE.MeshStandardMaterial;
        if (flashPhase % 2 === 0) {
          mat.color.setRGB(1, 0.3, 0.3);
          mat.opacity = 0.3;
        } else {
          mat.color.copy(anim.paperData.color);
          mat.opacity = 0.7;
        }
        mat.transparent = true;
      }
    }
  }

  public reset(): void {
    this.completedPairs = [];
    this.heldPaper = null;
    this.shakeAnimations = [];
    this.foldAnimations = [];

    this.papers.forEach(paper => {
      paper.isJoined = false;
      paper.isHeld = false;
      paper.mesh.position.copy(paper.initialPosition);
      paper.mesh.rotation.copy(paper.initialRotation);
      paper.mesh.scale.setScalar(paper.originalScale);

      const mat = paper.baseMesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(paper.color);
      mat.opacity = 1.0;
      mat.transparent = true;
    });

    if (this.onProgressChange) {
      this.onProgressChange(0, this.TOTAL_PAIRS);
    }
  }

  public getPaperMeshes(): THREE.Mesh[] {
    return this.papers.map(p => p.baseMesh);
  }

  public dispose(): void {
    this.papers.forEach(paper => {
      this.scene.remove(paper.mesh);
      paper.mesh.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    });
    this.papers = [];
  }
}
