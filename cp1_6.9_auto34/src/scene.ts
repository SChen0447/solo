import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public ground: THREE.Mesh;
  public container: HTMLElement;
  public minimapCtx: CanvasRenderingContext2D | null = null;

  private hudCountEl: HTMLElement | null = null;
  private hudFreqEl: HTMLElement | null = null;
  private hudSporesEl: HTMLElement | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510);
    this.scene.fog = new THREE.FogExp2(0x000510, 0.08);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 4.5, 4.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.ground = this.createGround();
    this.scene.add(this.ground);

    this.createLights();
    this.createStars();
    this.createGroundSpots();
    this.setupHUD();
    this.setupWindowResize();
  }

  private createGround(): THREE.Mesh {
    const noise2D = createNoise2D();
    const size = 5;
    const segments = 128;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);
      const bulge = Math.max(0, 1 - distFromCenter / (size * 0.5)) * 0.12;
      const n1 = noise2D(x * 4, z * 4) * 0.05;
      const n2 = noise2D(x * 12, z * 12) * 0.02;
      positions.setY(i, bulge + n1 + n2);

      const baseColor = new THREE.Color(0x3d2a1f);
      const dirtColor = new THREE.Color(0x2a1a12);
      const variation = (noise2D(x * 8, z * 8) + 1) * 0.5;
      const mixed = baseColor.clone().lerp(dirtColor, variation * 0.4);
      colors.push(mixed.r, mixed.g, mixed.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = false;
    return mesh;
  }

  private createLights(): void {
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.PointLight(0x6644ff, 0.8, 10);
    keyLight.position.set(2, 3, 2);
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x00ff88, 0.4, 8);
    fillLight.position.set(-2, 2, -1);
    this.scene.add(fillLight);
  }

  private createStars(): void {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const colorChoices = [
      new THREE.Color(0xaa00ff),
      new THREE.Color(0x00ff88),
      new THREE.Color(0xffffff),
      new THREE.Color(0x88aaff)
    ];

    for (let i = 0; i < count; i++) {
      const radius = 8 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5 + 0.1;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.5 + 1;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const c = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = Math.random() * 0.04 + 0.01;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private createGroundSpots(): void {
    const spotCount = 15;
    for (let i = 0; i < spotCount; i++) {
      const x = (Math.random() - 0.5) * 4.5;
      const z = (Math.random() - 0.5) * 4.5;
      const size = 0.15 + Math.random() * 0.25;

      const geometry = new THREE.PlaneGeometry(size, size);
      geometry.rotateX(-Math.PI / 2);
      const hue = Math.random() > 0.5 ? 0x00ff88 : 0xaa00ff;
      const material = new THREE.MeshBasicMaterial({
        color: hue,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const spot = new THREE.Mesh(geometry, material);
      spot.position.set(x, 0.001, z);
      spot.userData.baseOpacity = 0.35;
      spot.userData.phase = Math.random() * Math.PI * 2;
      spot.userData.freq = 0.5 + Math.random() * 0.8;
      this.scene.add(spot);
    }
  }

  private setupHUD(): void {
    this.hudCountEl = document.getElementById('mushroomCount');
    this.hudFreqEl = document.getElementById('avgFreq');
    this.hudSporesEl = document.getElementById('sporeCount');

    const minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
    if (minimapCanvas) {
      this.minimapCtx = minimapCanvas.getContext('2d');
    }
  }

  private setupWindowResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  public addMushroomMesh(mesh: THREE.Object3D): void {
    this.scene.add(mesh);
  }

  public removeMushroomMesh(mesh: THREE.Object3D): void {
    this.scene.remove(mesh);
  }

  public updateHUD(count: number, avgFreq: number, spores: number): void {
    if (this.hudCountEl) this.hudCountEl.textContent = String(count);
    if (this.hudFreqEl) this.hudFreqEl.textContent = avgFreq.toFixed(2);
    if (this.hudSporesEl) this.hudSporesEl.textContent = String(spores);
  }

  public updateMinimap(
    mushrooms: Array<{ position: THREE.Vector3; color: THREE.Color; isDominant: boolean }>,
    dominantId: string | null
  ): void {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = 120;
    const h = 120;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 10;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 60);
    grad.addColorStop(0, 'rgba(20, 10, 30, 0.9)');
    grad.addColorStop(1, 'rgba(5, 2, 15, 0.4)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 136, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.stroke();

    mushrooms.forEach((m, idx) => {
      const px = cx + m.position.x * scale;
      const py = cy + m.position.z * scale;

      if (m.isDominant) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Date.now() * 0.002);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 6 : 2.5;
          const a = (i * Math.PI) / 5;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        const c = `rgb(${Math.floor(m.color.r * 255)}, ${Math.floor(m.color.g * 255)}, ${Math.floor(m.color.b * 255)})`;
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0;
  }

  public updateGroundSpots(time: number): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.baseOpacity !== undefined) {
        const mat = obj.material as THREE.MeshBasicMaterial;
        const pulse = 0.5 + 0.5 * Math.sin(time * obj.userData.freq + obj.userData.phase);
        mat.opacity = obj.userData.baseOpacity * (0.6 + 0.4 * pulse);
      }
    });
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
