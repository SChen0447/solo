import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectObstacle, CircleObstacle, Paddle, Ball } from './physicsEngine';
import { ScoreZone, GameStatus } from './gameState';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface ZonePulse {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  baseScale: number;
}

interface FloatingCombo {
  element: HTMLDivElement;
  life: number;
  maxLife: number;
  startY: number;
}

const TABLE_WIDTH = 16;
const TABLE_HEIGHT = 9;
const WALL_THICKNESS = 0.3;
const WALL_COLOR = 0x1a237e;
const MAX_PARTICLES = 500;

const VIVID_COLORS = [
  '#ff5252', '#ff4081', '#e040fb', '#7c4dff',
  '#536dfe', '#448aff', '#40c4ff', '#18ffff',
  '#64ffda', '#69f0ae', '#b2ff59', '#eeff41',
  '#ffd740', '#ffab40', '#ff6e40',
];

const SCORE_ZONE_CONFIGS = [
  { type: 'green' as const, color: '#69f0ae', value: 100 },
  { type: 'blue' as const, color: '#40c4ff', value: 200 },
  { type: 'gold' as const, color: '#ffd700', value: 500 },
];

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private ballMesh: THREE.Mesh | null = null;
  private paddleMesh: THREE.Group | null = null;
  private rectObstacleMeshes: Map<number, THREE.Mesh> = new Map();
  private circleObstacleMeshes: Map<number, THREE.Mesh> = new Map();
  private scoreZoneMeshes: Map<number, THREE.Mesh> = new Map();
  private particles: Particle[] = [];
  private zonePulses: ZonePulse[] = [];
  private floatingCombos: FloatingCombo[] = [];
  private nextObstacleId = 1000;

  private hudScore: HTMLElement;
  private hudLives: HTMLElement;
  private hudStatus: HTMLElement;
  private gameoverPanel: HTMLElement;
  private finalScore: HTMLElement;
  private comboDisplay: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 25;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(30);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(60);
    this.controls.target.set(0, 0, 0);
    this.controls.enablePan = false;

    this.hudScore = document.getElementById('score')!;
    this.hudLives = document.getElementById('lives')!;
    this.hudStatus = document.getElementById('status')!;
    this.gameoverPanel = document.getElementById('gameover-panel')!;
    this.finalScore = document.getElementById('final-score')!;
    this.comboDisplay = document.getElementById('combo-display')!;

    this.setupLights();
    this.createTable();
    this.updateLives(3);
    this.updateStatus('准备中');

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x8ec5fc, 0.6, 50);
    pointLight.position.set(0, 8, 0);
    this.scene.add(pointLight);
  }

  private createTable(): void {
    const tableGeo = new THREE.BoxGeometry(TABLE_WIDTH, 0.2, TABLE_HEIGHT);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.6,
      metalness: 0.3,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.1;
    table.receiveShadow = true;
    this.scene.add(table);

    const wallMat = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: 0.4,
      metalness: 0.3,
      emissive: WALL_COLOR,
      emissiveIntensity: 0.1,
    });

    const halfW = TABLE_WIDTH / 2;
    const halfH = TABLE_HEIGHT / 2;
    const t = WALL_THICKNESS;
    const wallH = 1;

    const walls = [
      { w: TABLE_WIDTH + t * 2, d: t, x: 0, z: -halfH - t / 2 },
      { w: TABLE_WIDTH + t * 2, d: t, x: 0, z: halfH + t / 2 },
      { w: t, d: TABLE_HEIGHT, x: -halfW - t / 2, z: 0 },
      { w: t, d: TABLE_HEIGHT, x: halfW + t / 2, z: 0 },
    ];

    for (const w of walls) {
      const geo = new THREE.BoxGeometry(w.w, wallH, w.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(w.x, wallH / 2, w.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  public createBall(): THREE.Mesh {
    if (this.ballMesh) {
      this.scene.remove(this.ballMesh);
    }
    const geo = new THREE.SphereGeometry(0.3, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0xffd700,
      emissiveIntensity: 0.15,
    });
    this.ballMesh = new THREE.Mesh(geo, mat);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);
    return this.ballMesh;
  }

  public createPaddle(): THREE.Group {
    if (this.paddleMesh) {
      this.scene.remove(this.paddleMesh);
    }
    const group = new THREE.Group();

    const paddleGeo = new THREE.BoxGeometry(3, 0.4, 1);
    const paddleMat = new THREE.MeshStandardMaterial({
      color: 0x8ec5fc,
      roughness: 0.3,
      metalness: 0.5,
    });
    const paddleMesh = new THREE.Mesh(paddleGeo, paddleMat);
    paddleMesh.castShadow = true;
    group.add(paddleMesh);

    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 256;
    gradientCanvas.height = 32;
    const ctx = gradientCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#e0c3fc');
    grad.addColorStop(1, '#8ec5fc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 32);
    const gradientTex = new THREE.CanvasTexture(gradientCanvas);
    paddleMesh.material = new THREE.MeshStandardMaterial({
      map: gradientTex,
      roughness: 0.3,
      metalness: 0.5,
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x8ec5fc,
      transparent: true,
      opacity: 0.4,
    });
    const glowGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const glowL = new THREE.Mesh(glowGeo, glowMat.clone());
    glowL.material = new THREE.MeshBasicMaterial({
      color: 0xe0c3fc,
      transparent: true,
      opacity: 0.45,
    });
    glowL.position.set(-1.5, 0, 0);
    group.add(glowL);

    const glowR = new THREE.Mesh(glowGeo, glowMat);
    glowR.position.set(1.5, 0, 0);
    group.add(glowR);

    group.position.y = 0.4;
    group.position.z = TABLE_HEIGHT / 2 - 1;
    this.scene.add(group);
    this.paddleMesh = group;
    return group;
  }

  public createRectObstacle(obs: RectObstacle): THREE.Mesh {
    const geo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(obs.color),
      roughness: 0.4,
      metalness: 0.3,
      emissive: new THREE.Color(obs.color),
      emissiveIntensity: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(obs.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (obs.temporary) {
      mesh.userData.temporary = true;
      mesh.userData.expireTime = obs.expireTime;
    }
    this.scene.add(mesh);
    this.rectObstacleMeshes.set(obs.id, mesh);
    return mesh;
  }

  public createCircleObstacle(obs: CircleObstacle): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(obs.radius, obs.radius, obs.height, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(obs.color),
      roughness: 0.4,
      metalness: 0.3,
      emissive: new THREE.Color(obs.color),
      emissiveIntensity: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(obs.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.circleObstacleMeshes.set(obs.id, mesh);
    return mesh;
  }

  public createScoreZone(zone: ScoreZone): THREE.Mesh {
    const shape = new THREE.Shape();
    const hexRadius = 0.6;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(angle) * hexRadius;
      const y = Math.sin(angle) * hexRadius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(zone.color),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(zone.position);
    mesh.position.y = 0.03;

    const glowGeo = new THREE.RingGeometry(hexRadius * 0.9, hexRadius * 1.1, 6);
    glowGeo.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(zone.color),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    mesh.add(glow);

    this.scene.add(mesh);
    this.scoreZoneMeshes.set(zone.id, mesh);
    return mesh;
  }

  public spawnParticles(position: THREE.Vector3, colorHex: string, count: number = 20): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    const color = new THREE.Color(colorHex);
    const actualCount = Math.min(count, MAX_PARTICLES - this.particles.length);

    for (let i = 0; i < actualCount; i++) {
      const geo = new THREE.SphereGeometry(0.04, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(Math.random() * 2 + 1);

      this.scene.add(mesh);
      this.particles.push({ mesh, velocity, life: 0.5, maxLife: 0.5 });
    }
  }

  public spawnZonePulse(zone: ScoreZone): void {
    const mesh = this.scoreZoneMeshes.get(zone.id);
    if (!mesh) return;

    const shape = new THREE.Shape();
    const hexRadius = 0.6;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(angle) * hexRadius;
      const y = Math.sin(angle) * hexRadius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(zone.color),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const pulseMesh = new THREE.Mesh(geo, mat);
    pulseMesh.position.copy(zone.position);
    pulseMesh.position.y = zone.position.y + 0.1;

    this.scene.add(pulseMesh);
    this.zonePulses.push({ mesh: pulseMesh, life: 0.3, maxLife: 0.3, baseScale: 1 });
  }

  public showComboFloat(combo: number, baseScore: number, totalScore: number): void {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.fontFamily = 'Impact, sans-serif';
    el.style.fontSize = '48px';
    el.style.fontWeight = 'bold';
    el.style.color = '#ffd700';
    el.style.textShadow = '0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 100, 0, 0.8)';
    el.style.pointerEvents = 'none';
    el.style.whiteSpace = 'nowrap';
    el.style.transition = 'none';
    el.textContent = combo > 1 ? `${combo}x 连击 +${totalScore}` : `+${totalScore}`;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const startX = rect.width / 2 + (Math.random() - 0.5) * 100;
    const startY = rect.height / 2 - 50;
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.transform = 'translate(-50%, -50%)';

    this.comboDisplay.appendChild(el);
    this.floatingCombos.push({ element: el, life: 1.5, maxLife: 1.5, startY });
  }

  public addObstacle(x: number, z: number): RectObstacle {
    const id = this.nextObstacleId++;
    const obs: RectObstacle = {
      id,
      position: new THREE.Vector3(x, 0.25, z),
      width: 1,
      depth: 1,
      height: 0.5,
      restitution: 0.8,
      color: '#ff5252',
      temporary: true,
      expireTime: performance.now() + 5000,
    };
    this.createRectObstacle(obs);
    return obs;
  }

  public removeObstacle(id: number): void {
    const mesh = this.rectObstacleMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.rectObstacleMeshes.delete(id);
    }
  }

  public updateBallPosition(pos: THREE.Vector3): void {
    if (this.ballMesh) {
      this.ballMesh.position.copy(pos);
    }
  }

  public updatePaddlePosition(x: number): void {
    if (this.paddleMesh) {
      this.paddleMesh.position.x = THREE.MathUtils.clamp(x, -TABLE_WIDTH / 2 + 1.5, TABLE_WIDTH / 2 - 1.5);
    }
  }

  public updateScore(score: number): void {
    this.hudScore.textContent = `得分: ${score}`;
  }

  public updateLives(lives: number): void {
    this.hudLives.innerHTML = '';
    for (let i = 0; i < lives; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart';
      this.hudLives.appendChild(heart);
    }
  }

  public updateStatus(status: GameStatus | string): void {
    let text = status;
    if (status === 'ready') text = '准备中';
    else if (status === 'playing') text = '游戏中';
    else if (status === 'gameover') text = '游戏结束';
    this.hudStatus.textContent = text;
    this.hudStatus.style.animation = 'none';
    this.hudStatus.offsetHeight;
    this.hudStatus.style.animation = 'fadeInStatus 0.5s ease-out forwards';
  }

  public showGameOver(score: number): void {
    const hud = document.getElementById('hud');
    if (hud) hud.classList.add('gameover');
    this.finalScore.textContent = String(score);
    this.gameoverPanel.classList.add('show');
  }

  public hideGameOver(): void {
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('gameover');
    this.gameoverPanel.classList.remove('show');
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= 9.8 * deltaTime;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
      const s = Math.max(0.1, p.life / p.maxLife);
      p.mesh.scale.setScalar(s);
    }

    for (let i = this.zonePulses.length - 1; i >= 0; i--) {
      const zp = this.zonePulses[i];
      zp.life -= deltaTime;
      if (zp.life <= 0) {
        this.scene.remove(zp.mesh);
        this.zonePulses.splice(i, 1);
        continue;
      }
      const t = 1 - zp.life / zp.maxLife;
      const scale = 1 + t * 3;
      zp.mesh.scale.setScalar(scale);
      (zp.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
    }

    for (let i = this.floatingCombos.length - 1; i >= 0; i--) {
      const fc = this.floatingCombos[i];
      fc.life -= deltaTime;
      if (fc.life <= 0) {
        fc.element.remove();
        this.floatingCombos.splice(i, 1);
        continue;
      }
      const t = fc.life / fc.maxLife;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const currentY = fc.startY - (1 - t) * 120;
      fc.element.style.top = `${currentY}px`;
      fc.element.style.opacity = String(t);
      const hue = 40 + (1 - t) * 20;
      fc.element.style.color = `hsl(${hue}, 100%, ${50 + t * 20}%)`;
    }

    this.controls.update();
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public getRandomVividColor(): string {
    return VIVID_COLORS[Math.floor(Math.random() * VIVID_COLORS.length)];
  }

  public getScoreZoneConfig(index: number): { type: 'green' | 'blue' | 'gold'; color: string; value: number } {
    return SCORE_ZONE_CONFIGS[index % SCORE_ZONE_CONFIGS.length];
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
