import * as THREE from 'three';

export type ViewMode = 'normal' | 'macro' | 'xray' | 'evolution';

export interface ArtifactState {
  mode: ViewMode;
  scale: number;
  rotation: { x: number; y: number };
  rubbingsMode: boolean;
}

interface OriginalMaterial {
  material: THREE.Material | THREE.Material[];
}

export class Artifact {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group | null = null;
  private baseMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private xrayMaterials: Map<THREE.Mesh, THREE.Material> = new Map();
  private rubbingsMaterials: Map<THREE.Mesh, THREE.Material> = new Map();
  private normalArrow: THREE.ArrowHelper | null = null;
  private particles: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private evolutionTimer: number = 0;
  private evolutionActive: boolean = false;
  private autoRotateAngle: number = 0;
  private autoRotateSpeed: number = (Math.PI * 2) / 10;
  private interactionPaused: boolean = false;
  private interactionResumeTimer: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0;
  private currentRotationY: number = 0;
  private targetScale: number = 1;
  private currentScale: number = 1;
  private damping: number = 0.15;
  private rubbingsTransition: number = 0;
  private rubbingsTarget: number = 0;
  private ssaoPass: any = null;
  private composer: any = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private rotationMinX: number = -20 * (Math.PI / 180);
  private rotationMaxX: number = 20 * (Math.PI / 180);
  private rotationMinY: number = -30 * (Math.PI / 180);
  private rotationMaxY: number = 30 * (Math.PI / 180);
  private scaleMin: number = 0.5;
  private scaleMax: number = 3;
  private baseOriginalMaterials: OriginalMaterial[] = [];

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.setupNormalArrow();
  }

  private setupNormalArrow(): void {
    this.normalArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      5,
      0x88ff88,
      1.5,
      0.8
    );
    (this.normalArrow.cone as THREE.Mesh).material = new THREE.MeshBasicMaterial({
      color: 0x88ff88,
      transparent: true,
      opacity: 0.6
    });
    (this.normalArrow.line as THREE.Line).material = new THREE.LineBasicMaterial({
      color: 0x88ff88,
      transparent: true,
      opacity: 0.8
    });
    this.normalArrow.visible = false;
    this.scene.add(this.normalArrow);
  }

  public loadModel(onProgress?: (p: number) => void): Promise<THREE.Group> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const simulateProgress = (progress: number) => {
        onProgress?.(progress);
        if (progress >= 1) {
          this.createProceduralArtifact();
          resolve(this.group!);
        } else {
          const elapsed = performance.now() - startTime;
          const nextProgress = Math.min(progress + 0.08 + Math.random() * 0.05, 1);
          setTimeout(() => simulateProgress(nextProgress), 120);
        }
      };
      simulateProgress(0);
    });
  }

  private createProceduralArtifact(): void {
    this.group = new THREE.Group();

    const jarPoints: THREE.Vector2[] = [];
    const segments = 160;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let radius: number, height: number;
      if (t < 0.08) {
        radius = 1.2 + (0.6 - 1.2) * (t / 0.08);
        height = t * 18;
      } else if (t < 0.2) {
        radius = 0.6 + (3.0 - 0.6) * ((t - 0.08) / 0.12);
        height = t * 18;
      } else if (t < 0.65) {
        const bt = (t - 0.2) / 0.45;
        radius = 3.0 + Math.sin(bt * Math.PI) * 1.2 - bt * bt * 0.3;
        height = t * 18;
      } else if (t < 0.85) {
        const bt = (t - 0.65) / 0.2;
        radius = 3.9 - bt * 1.5;
        height = t * 18;
      } else {
        const bt = (t - 0.85) / 0.15;
        radius = 2.4 + bt * 0.4;
        height = t * 18;
      }
      jarPoints.push(new THREE.Vector2(radius, height));
    }

    const jarGeometry = new THREE.LatheGeometry(jarPoints, 96);
    jarGeometry.computeVertexNormals();

    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;

    const baseGrad = ctx.createLinearGradient(0, 0, 0, 2048);
    baseGrad.addColorStop(0, '#c9a06a');
    baseGrad.addColorStop(0.5, '#a07848');
    baseGrad.addColorStop(1, '#7a5632');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 2048, 2048);

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      const r = Math.random() * 3 + 0.5;
      const alpha = Math.random() * 0.15 + 0.05;
      ctx.fillStyle = `rgba(40, 25, 15, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      const r = Math.random() * 6 + 2;
      const alpha = Math.random() * 0.1;
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const drawStripe = (yCenter: number, thickness: number, color: string, alpha: number = 0.9) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (let x = 0; x < 2048; x++) {
        const wobble = Math.sin(x * 0.02 + yCenter * 0.01) * 3;
        const wobble2 = Math.sin(x * 0.05 + yCenter * 0.03) * 1.5;
        ctx.fillRect(x, yCenter - thickness / 2 + wobble + wobble2, 1, thickness);
      }
      ctx.globalAlpha = 1;
    };

    drawStripe(250, 50, '#1a5f8a', 0.85);
    drawStripe(305, 25, '#c9a84c', 0.9);
    drawStripe(1300, 70, '#8b3a1a', 0.85);
    drawStripe(1380, 30, '#c9a84c', 0.85);
    drawStripe(1700, 50, '#1a5f8a', 0.8);
    drawStripe(1760, 20, '#c9a84c', 0.9);

    const drawHieroglyph = (startX: number, y: number): void => {
      ctx.strokeStyle = '#1a3a5a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;

      ctx.beginPath();
      ctx.arc(startX + 20, y, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX + 20, y + 18);
      ctx.lineTo(startX + 20, y + 60);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX + 5, y + 35);
      ctx.lineTo(startX + 45, y + 35);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX, y + 70);
      ctx.lineTo(startX + 40, y + 70);
      ctx.lineTo(startX + 20, y + 90);
      ctx.closePath();
      ctx.stroke();

      ctx.globalAlpha = 1;
    };

    for (let i = 0; i < 8; i++) {
      drawHieroglyph(100 + i * 240, 700);
    }
    for (let i = 0; i < 8; i++) {
      drawHieroglyph(220 + i * 240, 1050);
    }

    for (let i = 0; i < 15000; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      const alpha = Math.random() * 0.08;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const baseColorTexture = new THREE.CanvasTexture(canvas);
    baseColorTexture.wrapS = THREE.RepeatWrapping;
    baseColorTexture.wrapT = THREE.RepeatWrapping;
    baseColorTexture.anisotropy = 8;

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 1024;
    normalCanvas.height = 1024;
    const nctx = normalCanvas.getContext('2d')!;

    const imgData = nctx.createImageData(1024, 1024);
    for (let i = 0; i < imgData.data.length; i += 4) {
      let r = 128, g = 128, b = 255;

      const x = (i / 4) % 1024;
      const y = Math.floor((i / 4) / 1024);
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 20;
      const noise2 = Math.sin(x * 0.05 + y * 0.03) * 15;

      if (Math.random() < 0.02) {
        const crackNoise = (Math.random() - 0.5) * 60;
        r += crackNoise;
        g += crackNoise;
      }

      if (Math.random() < 0.05) {
        r += (Math.random() - 0.5) * 30;
        g += (Math.random() - 0.5) * 30;
      }

      r += noise + noise2;
      g += noise + noise2;

      imgData.data[i] = Math.max(0, Math.min(255, r));
      imgData.data[i + 1] = Math.max(0, Math.min(255, g));
      imgData.data[i + 2] = Math.max(0, Math.min(255, b));
      imgData.data[i + 3] = 255;
    }
    nctx.putImageData(imgData, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;

    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = 512;
    roughnessCanvas.height = 512;
    const rctx = roughnessCanvas.getContext('2d')!;
    const rGrad = rctx.createLinearGradient(0, 0, 512, 512);
    rGrad.addColorStop(0, '#777');
    rGrad.addColorStop(1, '#999');
    rctx.fillStyle = rGrad;
    rctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = Math.floor(Math.random() * 100 + 80);
      rctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      rctx.fillRect(x, y, 1, 1);
    }
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);

    const jarMaterial = new THREE.MeshStandardMaterial({
      map: baseColorTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: roughnessTexture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const jarMesh = new THREE.Mesh(jarGeometry, jarMaterial);
    jarMesh.castShadow = true;
    jarMesh.receiveShadow = true;
    jarMesh.position.y = -10;
    this.group.add(jarMesh);
    this.baseMaterials.set(jarMesh, jarMaterial);

    const rimGeometry = new THREE.TorusGeometry(2.4, 0.15, 16, 96);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9a84c,
      roughness: 0.4,
      metalness: 0.6
    });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 6.44;
    rimMesh.castShadow = true;
    this.group.add(rimMesh);
    this.baseMaterials.set(rimMesh, rimMaterial);

    const baseGeometry = new THREE.CylinderGeometry(3.2, 3.5, 1.2, 64);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.95,
      metalness: 0.0
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = -10.6;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);
    this.baseMaterials.set(baseMesh, baseMaterial);

    const groundGeometry = new THREE.CircleGeometry(15, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 1.0,
      metalness: 0.0
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -11.2;
    groundMesh.receiveShadow = true;
    this.group.add(groundMesh);

    this.scene.add(this.group);

    this.createXRayMaterials();
    this.createRubbingsMaterials(baseColorTexture);
    this.setupParticles();
  }

  private createXRayMaterials(): void {
    this.baseMaterials.forEach((mat, mesh) => {
      const xrayMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.xrayMaterials.set(mesh, xrayMat);
    });
  }

  private createRubbingsMaterials(baseColor: THREE.Texture): void {
    const rubCanvas = document.createElement('canvas');
    rubCanvas.width = 2048;
    rubCanvas.height = 2048;
    const rctx = rubCanvas.getContext('2d')!;

    rctx.fillStyle = '#f0e8d8';
    rctx.fillRect(0, 0, 2048, 2048);

    for (let y = 0; y < 2048; y += 4) {
      for (let x = 0; x < 2048; x += 4) {
        const noise = Math.random();
        const v = Math.floor(220 + noise * 30);
        rctx.fillStyle = `rgb(${v},${v - 10},${v - 25})`;
        rctx.fillRect(x, y, 4, 4);
      }
    }

    rctx.strokeStyle = '#1a1a1a';
    rctx.lineWidth = 5;
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 2048;
      const len = Math.random() * 50 + 10;
      const angle = Math.random() * Math.PI * 2;
      rctx.globalAlpha = Math.random() * 0.4 + 0.1;
      rctx.beginPath();
      rctx.moveTo(x, y);
      rctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      rctx.stroke();
    }
    rctx.globalAlpha = 1;

    for (let i = 0; i < 20; i++) {
      const y = 150 + i * 95;
      rctx.strokeStyle = '#2a2a2a';
      rctx.lineWidth = i % 3 === 0 ? 8 : 4;
      rctx.globalAlpha = i % 3 === 0 ? 0.7 : 0.4;
      for (let x = 0; x < 2048; x += 2) {
        const wobble = Math.sin(x * 0.015 + i) * 5 + Math.sin(x * 0.04) * 2;
        if (x === 0) rctx.moveTo(x, y + wobble);
        else rctx.lineTo(x, y + wobble);
      }
      rctx.stroke();
    }
    rctx.globalAlpha = 1;

    const rubTexture = new THREE.CanvasTexture(rubCanvas);

    this.baseMaterials.forEach((mat, mesh) => {
      if (mesh.geometry instanceof THREE.LatheGeometry) {
        const rubMat = new THREE.MeshStandardMaterial({
          map: rubTexture,
          roughness: 0.95,
          metalness: 0.0
        });
        this.rubbingsMaterials.set(mesh, rubMat);
      }
    });
  }

  private setupParticles(): void {
    const particleCount = 1500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    this.particlePositions = positions;

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 2.5;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) - 2;
      positions[i * 3 + 2] = r * Math.cos(phi);

      const mossColor = Math.random() > 0.5;
      colors[i * 3] = mossColor ? 0.2 + Math.random() * 0.2 : 0.4 + Math.random() * 0.2;
      colors[i * 3 + 1] = mossColor ? 0.4 + Math.random() * 0.3 : 0.35 + Math.random() * 0.1;
      colors[i * 3 + 2] = mossColor ? 0.1 + Math.random() * 0.1 : 0.2 + Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  public setMode(mode: ViewMode): void {
    this.restoreBaseMaterials();

    if (mode === 'xray') {
      this.applyXRayMaterials();
    } else if (mode === 'macro') {
      this.targetScale = 2;
    } else if (mode === 'evolution') {
      this.startEvolutionMode();
    }

    if (mode === 'normal' || mode === 'xray') {
      this.targetScale = 1;
    }
  }

  private restoreBaseMaterials(): void {
    this.baseMaterials.forEach((mat, mesh) => {
      mesh.material = mat;
    });

    if (this.xrayMaterials.size > 0) {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && (obj as any)._xrayWireframe) {
          this.scene.remove(obj);
        }
      });
    }
  }

  private applyXRayMaterials(): void {
    this.baseMaterials.forEach((mat, mesh) => {
      const xrayMat = this.xrayMaterials.get(mesh);
      if (xrayMat) {
        mesh.material = xrayMat;

        if (mesh.geometry instanceof THREE.LatheGeometry) {
          const wireGeo = new THREE.WireframeGeometry(mesh.geometry);
          const wireMat = new THREE.LineBasicMaterial({
            color: 0x6699ff,
            transparent: true,
            opacity: 0.4
          });
          const wireframe = new THREE.LineSegments(wireGeo, wireMat);
          wireframe.position.copy(mesh.position);
          wireframe.rotation.copy(mesh.rotation);
          (wireframe as any)._xrayWireframe = true;
          this.scene.add(wireframe);
        }
      }
    });
  }

  private startEvolutionMode(): void {
    if (!this.particles) return;

    this.evolutionActive = true;
    this.evolutionTimer = 0;
    this.particles.visible = true;

    const mat = this.particles.material as THREE.PointsMaterial;
    const startTime = performance.now();
    const duration = 5000;

    const animate = () => {
      if (!this.evolutionActive) {
        if (this.particles) this.particles.visible = false;
        return;
      }

      const elapsed = performance.now() - startTime;
      const t = elapsed / duration;

      if (t >= 1) {
        this.evolutionActive = false;
        mat.opacity = 0;
        if (this.particles) this.particles.visible = false;
        return;
      }

      if (t < 0.3) {
        mat.opacity = (t / 0.3) * 0.9;
      } else if (t > 0.7) {
        mat.opacity = ((1 - t) / 0.3) * 0.9;
      } else {
        mat.opacity = 0.9;
      }

      if (this.particles) {
        this.particles.rotation.y += 0.002;
        this.particles.rotation.x += 0.001;
      }

      requestAnimationFrame(animate);
    };
    animate();
  }

  public setScale(scale: number): void {
    this.targetScale = Math.max(this.scaleMin, Math.min(this.scaleMax, scale));
  }

  public getScale(): number {
    return this.currentScale;
  }

  public setRotation(x: number, y: number): void {
    this.targetRotationX = Math.max(this.rotationMinX, Math.min(this.rotationMaxX, x));
    this.targetRotationY = Math.max(this.rotationMinY, Math.min(this.rotationMaxY, y));
  }

  public getRotation(): { x: number; y: number } {
    return { x: this.currentRotationX, y: this.currentRotationY };
  }

  public toggleRubbings(): boolean {
    this.rubbingsTarget = this.rubbingsTarget > 0.5 ? 0 : 1;
    return this.rubbingsTarget > 0.5;
  }

  public isRubbingsActive(): boolean {
    return this.rubbingsTarget > 0.5;
  }

  public updateHoverNormal(clientX: number, clientY: number, rect: DOMRect): void {
    if (!this.group || !this.normalArrow) return;

    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes: THREE.Mesh[] = [];
    this.baseMaterials.forEach((_, mesh) => meshes.push(mesh));

    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.normalArrow.visible = true;
      const worldNormal = hit.face!.normal.clone();
      worldNormal.transformDirection(hit.object.matrixWorld);
      this.normalArrow.position.copy(hit.point);
      this.normalArrow.setDirection(worldNormal);
    } else {
      this.normalArrow.visible = false;
    }
  }

  public hideNormalArrow(): void {
    if (this.normalArrow) {
      this.normalArrow.visible = false;
    }
  }

  public pauseAutoRotate(): void {
    this.interactionPaused = true;
    this.interactionResumeTimer = 0;
  }

  public update(delta: number): void {
    if (!this.group) return;

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.damping;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.damping;
    this.currentScale += (this.targetScale - this.currentScale) * this.damping;

    if (this.interactionPaused) {
      this.interactionResumeTimer += delta;
      if (this.interactionResumeTimer > 2) {
        this.interactionPaused = false;
      }
    } else {
      this.autoRotateAngle += this.autoRotateSpeed * delta;
    }

    this.group.rotation.x = this.currentRotationX;
    this.group.rotation.y = this.currentRotationY + (this.interactionPaused ? 0 : this.autoRotateAngle);
    this.group.scale.setScalar(this.currentScale);

    this.rubbingsTransition += (this.rubbingsTarget - this.rubbingsTransition) * 0.03;
    if (this.rubbingsTransition > 0.01) {
      this.updateRubbingsBlend();
    }
  }

  private updateRubbingsBlend(): void {
    this.rubbingsMaterials.forEach((rubMat, mesh) => {
      const baseMat = this.baseMaterials.get(mesh) as THREE.MeshStandardMaterial;
      if (!baseMat) return;

      if (this.rubbingsTransition > 0.5) {
        mesh.material = rubMat;
      } else {
        mesh.material = baseMat;
      }
    });
  }

  public getGroup(): THREE.Group | null {
    return this.group;
  }

  public dispose(): void {
    if (this.group) {
      this.scene.remove(this.group);
    }
    if (this.particles) {
      this.scene.remove(this.particles);
    }
    if (this.normalArrow) {
      this.scene.remove(this.normalArrow);
    }
  }
}
