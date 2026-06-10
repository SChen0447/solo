import * as THREE from 'three';
import { GameEngine } from './gameEngine';
import type { PolarType } from './levels';
import {
  updateBallPhysics,
  resolveWallCollision,
  checkSpikeCollision,
  checkGoalReached,
  checkPortalCollision
} from './physics';
import { VisualEffectManager } from './visualEffects';

class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private gameEngine: GameEngine;
  private effects: VisualEffectManager;
  private clock: THREE.Clock;
  private playerInput = { up: false, down: false, left: false, right: false };

  private ballMesh: THREE.Mesh;
  private ballGlow: THREE.Mesh;
  private magnetMeshes: Map<string, { core: THREE.Mesh; field: THREE.Mesh; glow: THREE.Mesh; rotation: number }> = new Map();
  private spikeMeshes: THREE.Mesh[] = [];
  private goalMesh: THREE.Mesh;
  private goalLight: THREE.PointLight;
  private wallMeshes: THREE.Mesh[] = [];

  private livesContainer: HTMLElement;
  private timerDisplay: HTMLElement;
  private minimapContainer: HTMLElement;
  private levelInfo: HTMLElement;
  private overlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlayTime: HTMLElement;
  private overlayGrade: HTMLElement;
  private overlayBtn: HTMLElement;

  private ballFlashAlpha: number = 0;
  private goalPulse: number = 0;

  private viewportWidth: number = 0;
  private viewportHeight: number = 0;

  constructor() {
    const container = document.getElementById('game-container')!;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    this.renderer.setClearColor(0x1A0F2E, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A0F2E);

    const aspect = this.viewportWidth / this.viewportHeight;
    const viewHeight = 900;
    const viewWidth = viewHeight * aspect;
    this.camera = new THREE.OrthographicCamera(
      -viewWidth / 2, viewWidth / 2,
      viewHeight / 2, -viewHeight / 2,
      -100, 500
    );
    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x505080, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(100, 200, 100);
    this.scene.add(dirLight);

    this.clock = new THREE.Clock();
    this.gameEngine = new GameEngine();
    this.effects = new VisualEffectManager(this.scene);

    this.livesContainer = document.getElementById('lives')!;
    this.timerDisplay = document.getElementById('timer')!;
    this.minimapContainer = document.getElementById('minimap')!;
    this.levelInfo = document.getElementById('level-info')!;
    this.overlay = document.getElementById('overlay')!;
    this.overlayTitle = document.getElementById('overlay-title')!;
    this.overlayTime = document.getElementById('overlay-time')!;
    this.overlayGrade = document.getElementById('overlay-grade')!;
    this.overlayBtn = document.getElementById('overlay-btn')!;

    this.overlayBtn.addEventListener('click', () => this.onOverlayClick());

    this.setupEventListeners();
    this.createBall();
    this.loadLevel(0);
    this.updateHUD();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': this.playerInput.up = true; break;
        case 's': case 'arrowdown': this.playerInput.down = true; break;
        case 'a': case 'arrowleft': this.playerInput.left = true; break;
        case 'd': case 'arrowright': this.playerInput.right = true; break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': this.playerInput.up = false; break;
        case 's': case 'arrowdown': this.playerInput.down = false; break;
        case 'a': case 'arrowleft': this.playerInput.left = false; break;
        case 'd': case 'arrowright': this.playerInput.right = false; break;
      }
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.renderer.setSize(this.viewportWidth, this.viewportHeight);

    const aspect = this.viewportWidth / this.viewportHeight;
    const viewHeight = 900;
    const viewWidth = viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }

  private createBall(): void {
    const ballGeo = new THREE.SphereGeometry(18, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xc0c0d0,
      metalness: 0.95,
      roughness: 0.15
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.position.z = 10;
    this.scene.add(this.ballMesh);

    const glowGeo = new THREE.RingGeometry(18, 26, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.ballGlow = new THREE.Mesh(glowGeo, glowMat);
    this.ballGlow.position.z = 9;
    this.scene.add(this.ballGlow);
  }

  private clearLevelMeshes(): void {
    for (const { core, field, glow } of this.magnetMeshes.values()) {
      this.scene.remove(core);
      this.scene.remove(field);
      this.scene.remove(glow);
      core.geometry.dispose();
      field.geometry.dispose();
      glow.geometry.dispose();
      (core.material as THREE.Material).dispose();
      (field.material as THREE.Material).dispose();
      (glow.material as THREE.Material).dispose();
    }
    this.magnetMeshes.clear();

    for (const mesh of this.spikeMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.spikeMeshes = [];

    for (const mesh of this.wallMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.wallMeshes = [];

    if (this.goalMesh) {
      this.scene.remove(this.goalMesh);
      this.goalMesh.geometry.dispose();
      (this.goalMesh.material as THREE.Material).dispose();
    }
    if (this.goalLight) {
      this.scene.remove(this.goalLight);
    }
  }

  private loadLevel(index: number): void {
    this.clearLevelMeshes();
    this.gameEngine.loadLevel(index);
    const level = this.gameEngine.getCurrentLevel();

    for (const magnet of this.gameEngine.getMagnets()) {
      this.createMagnet(magnet.id, magnet.x, magnet.y, magnet.polarity);
    }

    for (const spike of level.spikes) {
      this.createSpike(spike.x + spike.width / 2, spike.y + spike.height / 2, spike.width, spike.height);
    }

    for (const wall of level.walls) {
      this.createWall(wall.x, wall.y, wall.width, wall.height);
    }

    for (const portal of level.portals) {
      this.effects.createPortalMesh(portal.id, portal.x, portal.y);
    }

    this.createGoal(level.goalX, level.goalY);

    this.levelInfo.textContent = `第 ${index + 1} 关 / ${this.gameEngine.getTotalLevels()}`;

    this.gameEngine.setOnMagnetPolarityChange((id, x, y, polarity) => {
      this.updateMagnetVisual(id, polarity);
      this.effects.createPolarityRipple(x, y, polarity);
    });

    this.gameEngine.setOnLightning((fromX, fromY, toX, toY) => {
      this.effects.createLightning(fromX, fromY, toX, toY);
      this.effects.createShockwave(toX, toY);
    });

    this.gameEngine.setOnLifeLost((x, y) => {
      this.effects.createBallFragments(x, y);
      this.ballFlashAlpha = 1;
      this.updateHUD();
    });

    this.gameEngine.setOnRespawn(() => {
      this.ballMesh.visible = true;
      this.ballGlow.visible = true;
    });

    this.gameEngine.setOnLevelComplete((time, grade) => {
      this.showLevelComplete(time, grade);
      this.effects.createFireworks(level.goalX, level.goalY);
    });

    this.ballMesh.visible = true;
    this.ballGlow.visible = true;
  }

  private createMagnet(id: string, x: number, y: number, polarity: PolarType): void {
    const coreGeo = new THREE.CylinderGeometry(14, 14, 6, 24);
    coreGeo.rotateX(Math.PI / 2);
    const coreColor = polarity === 'N' ? 0xff4444 : 0x4488ff;
    const coreMat = new THREE.MeshStandardMaterial({
      color: coreColor,
      metalness: 0.8,
      roughness: 0.3,
      emissive: coreColor,
      emissiveIntensity: 0.3
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(x, y, 5);
    this.scene.add(core);

    const fieldGeo = new THREE.CircleGeometry(70, 48);
    const fieldColor = polarity === 'N' ? 0xff6666 : 0x6699ff;
    const fieldMat = new THREE.MeshBasicMaterial({
      color: fieldColor,
      transparent: true,
      opacity: 0.12
    });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.position.set(x, y, -1);
    this.scene.add(field);

    const glowGeo = new THREE.RingGeometry(14, 22, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x, y, 6);
    this.scene.add(glow);

    this.magnetMeshes.set(id, { core, field, glow, rotation: 0 });
  }

  private updateMagnetVisual(id: string, polarity: PolarType): void {
    const m = this.magnetMeshes.get(id);
    if (!m) return;
    const coreColor = polarity === 'N' ? 0xff4444 : 0x4488ff;
    const fieldColor = polarity === 'N' ? 0xff6666 : 0x6699ff;
    (m.core.material as THREE.MeshStandardMaterial).color.setHex(coreColor);
    (m.core.material as THREE.MeshStandardMaterial).emissive.setHex(coreColor);
    (m.field.material as THREE.MeshBasicMaterial).color.setHex(fieldColor);
    (m.glow.material as THREE.MeshBasicMaterial).color.setHex(coreColor);
  }

  private createSpike(x: number, y: number, w: number, h: number): void {
    const shape = new THREE.Shape();
    const spikes = 6;
    const outerR = Math.min(w, h) / 2;
    const innerR = outerR * 0.4;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      metalness: 0.7,
      roughness: 0.4,
      emissive: 0x660000,
      emissiveIntensity: 0.4
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = 3;
    this.scene.add(mesh);
    this.spikeMeshes.push(mesh);
  }

  private createWall(x: number, y: number, w: number, h: number): void {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3a2a5a,
      metalness: 0.5,
      roughness: 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + w / 2, y + h / 2, -2);
    this.scene.add(mesh);
    this.wallMeshes.push(mesh);

    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x6a5a9a, transparent: true, opacity: 0.5 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.copy(mesh.position);
    this.scene.add(edges);
    this.wallMeshes.push(edges as unknown as THREE.Mesh);
  }

  private createGoal(x: number, y: number): void {
    const height = 300;
    const geo = new THREE.CylinderGeometry(25, 35, height, 24, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44ff88,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.goalMesh = new THREE.Mesh(geo, mat);
    this.goalMesh.position.set(x, y, 4);
    this.scene.add(this.goalMesh);

    this.goalLight = new THREE.PointLight(0x66ffaa, 2, 300);
    this.goalLight.position.set(x, y, 50);
    this.scene.add(this.goalLight);
  }

  private updateHUD(): void {
    const lives = this.gameEngine.getLives();
    const maxLives = this.gameEngine.getMaxLives();
    this.livesContainer.innerHTML = '';
    for (let i = 0; i < maxLives; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart' + (i >= lives ? ' lost' : '');
      this.livesContainer.appendChild(heart);
    }

    this.updateMinimap();
  }

  private updateMinimap(): void {
    const level = this.gameEngine.getCurrentLevel();
    const ball = this.gameEngine.getBall();
    this.minimapContainer.innerHTML = '';

    for (const magnet of this.gameEngine.getMagnets()) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: absolute;
        width: 6px; height: 6px;
        border-radius: 50%;
        left: ${(magnet.x / level.width) * 100}%;
        top: ${(magnet.y / level.height) * 100}%;
        background: ${magnet.polarity === 'N' ? '#ff6666' : '#6699ff'};
        transform: translate(-50%, -50%);
      `;
      this.minimapContainer.appendChild(dot);
    }

    const goal = document.createElement('div');
    goal.style.cssText = `
      position: absolute;
      width: 8px; height: 8px;
      border-radius: 50%;
      left: ${(level.goalX / level.width) * 100}%;
      top: ${(level.goalY / level.height) * 100}%;
      background: #44ff88;
      box-shadow: 0 0 4px #44ff88;
      transform: translate(-50%, -50%);
    `;
    this.minimapContainer.appendChild(goal);

    const ballDot = document.createElement('div');
    ballDot.style.cssText = `
      position: absolute;
      width: 5px; height: 5px;
      border-radius: 50%;
      left: ${(ball.x / level.width) * 100}%;
      top: ${(ball.y / level.height) * 100}%;
      background: #cccccc;
      box-shadow: 0 0 3px #fff;
      transform: translate(-50%, -50%);
    `;
    this.minimapContainer.appendChild(ballDot);
  }

  private showLevelComplete(time: number, grade: string): void {
    this.overlay.style.display = 'flex';
    this.overlayTitle.textContent = '通关！';
    this.overlayTime.textContent = `用时：${time.toFixed(1)} 秒`;

    const gradeColors: Record<string, string> = {
      'S': '#ffd700',
      'A': '#ff8844',
      'B': '#44aaff',
      'C': '#888888'
    };
    this.overlayGrade.innerHTML = `评级：<span style="color:${gradeColors[grade] || '#fff'};text-shadow:0 0 1vw ${gradeColors[grade] || '#fff'}80">${grade}</span>`;

    if (this.gameEngine.getCurrentLevelIndex() >= this.gameEngine.getTotalLevels() - 1) {
      this.overlayBtn.textContent = '重新开始';
    } else {
      this.overlayBtn.textContent = '下一关';
    }
  }

  private showGameOver(): void {
    this.overlay.style.display = 'flex';
    this.overlayTitle.textContent = '游戏结束';
    this.overlayTitle.style.color = '#ff4444';
    this.overlayTime.textContent = '';
    this.overlayGrade.textContent = '';
    this.overlayBtn.textContent = '重新开始';
  }

  private onOverlayClick(): void {
    this.overlay.style.display = 'none';
    this.overlayTitle.style.color = '#ffd700';

    if (this.gameEngine.getGameState() === 'lost') {
      this.loadLevel(0);
    } else {
      const nextIndex = this.gameEngine.getCurrentLevelIndex() + 1;
      if (nextIndex >= this.gameEngine.getTotalLevels()) {
        this.loadLevel(0);
      } else {
        this.loadLevel(nextIndex);
      }
    }
    this.gameEngine.setGameState('playing');
    this.updateHUD();
  }

  public run(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      const deltaTime = Math.min(this.clock.getDelta(), 0.05);

      if (this.gameEngine.getGameState() === 'playing') {
        this.gameEngine.update(
          deltaTime,
          this.playerInput,
          updateBallPhysics,
          resolveWallCollision,
          checkSpikeCollision,
          checkGoalReached,
          checkPortalCollision
        );

        if (this.gameEngine.getGameState() === 'lost') {
          this.showGameOver();
        }
      }

      this.updateVisuals(deltaTime);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private updateVisuals(deltaTime: number): void {
    const ball = this.gameEngine.getBall();
    const level = this.gameEngine.getCurrentLevel();

    if (this.gameEngine.isRespawning()) {
      this.ballMesh.visible = false;
      this.ballGlow.visible = false;
    } else {
      this.ballMesh.visible = true;
      this.ballGlow.visible = true;
      this.ballMesh.position.set(ball.x, ball.y, 10);
      this.ballGlow.position.set(ball.x, ball.y, 9);

      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      this.ballMesh.rotation.x += ball.vy * deltaTime * 0.05;
      this.ballMesh.rotation.y -= ball.vx * deltaTime * 0.05;

      if (this.ballFlashAlpha > 0) {
        this.ballFlashAlpha -= deltaTime * 3;
        (this.ballMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
        (this.ballMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.max(0, this.ballFlashAlpha);
      } else {
        (this.ballMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
      }

      const activeMagnets = this.gameEngine.getMagnets().filter(m => {
        const dx = ball.x - m.x;
        const dy = ball.y - m.y;
        return dx * dx + dy * dy < 150 * 150;
      });

      let glowColor = 0x000000;
      let glowIntensity = 0;
      let nearestDist = Infinity;
      let nearestMagnet: string | null = null;

      for (const m of activeMagnets) {
        const dx = ball.x - m.x;
        const dy = ball.y - m.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const intensity = (150 - dist) / 150;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestMagnet = m.id;
          glowColor = m.polarity === 'N' ? 0xff4444 : 0x4488ff;
          glowIntensity = intensity;
        }
        this.effects.createPolarPulse(m.id, m.x, m.y, m.polarity, intensity * 100);
      }

      for (const m of this.gameEngine.getMagnets()) {
        if (!activeMagnets.find(am => am.id === m.id)) {
          this.effects.hidePolarPulse(m.id);
        }
      }

      if (nearestMagnet) {
        (this.ballGlow.material as THREE.MeshBasicMaterial).color.setHex(glowColor);
        (this.ballGlow.material as THREE.MeshBasicMaterial).opacity = Math.min(0.8, glowIntensity * 0.8);
        const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.15 * glowIntensity;
        this.ballGlow.scale.set(pulse, pulse, 1);
      } else {
        (this.ballGlow.material as THREE.MeshBasicMaterial).opacity = 0;
      }

      const wallResult = resolveWallCollision(ball, []);
      if (wallResult.collided) {
        this.effects.createSparkEffect(wallResult.hitX, wallResult.hitY, 5);
      }
    }

    for (const magnet of this.gameEngine.getMagnets()) {
      const m = this.magnetMeshes.get(magnet.id);
      if (m) {
        m.core.rotation.z = magnet.rotation;
        m.glow.rotation.z = -magnet.rotation * 1.5;
        const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.08;
        m.glow.scale.set(pulse, pulse, 1);
      }
    }

    this.goalPulse += deltaTime * 3;
    if (this.goalMesh) {
      const scale = 1 + Math.sin(this.goalPulse) * 0.1;
      this.goalMesh.scale.set(scale, 1, scale);
      const mat = this.goalMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(this.goalPulse) * 0.1;
    }
    if (this.goalLight) {
      this.goalLight.intensity = 1.5 + Math.sin(this.goalPulse * 1.5) * 0.8;
    }

    const targetCamX = Math.max(400, Math.min(level.width - 400, ball.x));
    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, deltaTime * 5);
    this.camera.position.y = 0;

    this.effects.update(deltaTime, this.camera.position.x);

    this.timerDisplay.textContent = `${this.gameEngine.getElapsedTime().toFixed(1)}s`;
    this.updateMinimap();
  }
}

const game = new Game();
GameEngine.run = () => game.run();
game.run();
