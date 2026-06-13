import { Mail } from './Mail';
import { Obstacle, Mailbox, StarPoint, AuroraWave } from './Obstacle';

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  brightness: number;
  phase: number;
  period: number;
}

interface ConstellationData {
  name: string;
  points: { x: number; y: number }[];
  connections: [number, number][];
}

const CONSTELLATIONS: ConstellationData[] = [
  {
    name: '北斗七星',
    points: [
      { x: 20, y: 30 },
      { x: 40, y: 25 },
      { x: 55, y: 35 },
      { x: 70, y: 40 },
      { x: 85, y: 30 },
      { x: 90, y: 50 },
      { x: 75, y: 55 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [4, 5]]
  },
  {
    name: '猎户座',
    points: [
      { x: 30, y: 20 },
      { x: 70, y: 20 },
      { x: 25, y: 45 },
      { x: 50, y: 40 },
      { x: 75, y: 45 },
      { x: 40, y: 60 },
      { x: 60, y: 60 },
      { x: 35, y: 80 },
      { x: 65, y: 80 }
    ],
    connections: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6], [5, 7], [6, 8]]
  },
  {
    name: '天蝎座',
    points: [
      { x: 80, y: 15 },
      { x: 65, y: 25 },
      { x: 50, y: 35 },
      { x: 40, y: 45 },
      { x: 35, y: 60 },
      { x: 45, y: 70 },
      { x: 60, y: 75 },
      { x: 75, y: 70 },
      { x: 80, y: 55 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]]
  }
];

export class GameController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private mail: Mail;
  private obstacles: Obstacle[] = [];
  private mailboxes: Mailbox[] = [];
  private backgroundStars: BackgroundStar[] = [];
  private starPoints: StarPoint[] = [];
  private auroraWaves: AuroraWave[] = [];

  private scrollSpeed: number = 80;
  private baseScrollSpeed: number = 80;
  private trackOffset: number = 0;
  private trackCurve: number = 0;
  private trackCurveTarget: number = 0;

  private score: number = 0;
  private consecutiveDeliveries: number = 0;
  private currentLevel: number = 0;
  private currentMailboxIndex: number = 0;
  private checkPointY: number = 0;

  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private isRunning: boolean = false;

  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseDown: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  private lastTime: number = 0;
  private deltaTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  private obstacleSpawnTimer: number = 0;
  private mailboxSpawnTimer: number = 0;
  private spawnDistance: number = 0;

  private pauseBtnRect = { x: 0, y: 0, radius: 20 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mail = new Mail(0, 0);
    this.resize();
    this.initBackgroundStars();
    this.initConstellation();
    this.bindEvents();
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.pauseBtnRect.x = this.width - 50;
    this.pauseBtnRect.y = this.height - 50;
  }

  private initBackgroundStars(): void {
    this.backgroundStars = [];
    for (let i = 0; i < 300; i++) {
      this.backgroundStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random() * 2
      });
    }
  }

  private initConstellation(): void {
    this.starPoints = [];
    const constellation = CONSTELLATIONS[this.currentLevel % CONSTELLATIONS.length];
    for (const point of constellation.points) {
      this.starPoints.push(new StarPoint(point.x, point.y));
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.checkPauseButtonClick(x, y)) {
      return;
    }

    if (this.isPaused || this.isGameOver) return;
    if (this.mail.isShattered) return;

    const dist = Math.sqrt(
      Math.pow(x - this.mail.x, 2) + Math.pow(y - this.mail.y, 2)
    );

    if (dist < 50) {
      this.isMouseDown = true;
      this.mail.isDragging = true;
      this.dragOffsetX = this.mail.x - x;
      this.dragOffsetY = this.mail.y - y;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    if (this.isMouseDown && this.mail.isDragging && !this.mail.isShattered) {
      const newX = this.mouseX + this.dragOffsetX;
      const newY = this.mouseY + this.dragOffsetY;
      
      this.mail.addTrailPoint(this.mail.x, this.mail.y);
      this.mail.x = Math.max(30, Math.min(this.width - 30, newX));
      this.mail.y = Math.max(30, Math.min(this.height - 30, newY));
    }
  }

  private onMouseUp(): void {
    this.isMouseDown = false;
    if (this.mail.isDragging) {
      this.mail.isDragging = false;
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.onMouseDown(mouseEvent);
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.onMouseMove(mouseEvent);
  }

  private onTouchEnd(): void {
    this.onMouseUp();
  }

  private checkPauseButtonClick(x: number, y: number): boolean {
    const dx = x - this.pauseBtnRect.x;
    const dy = y - this.pauseBtnRect.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.pauseBtnRect.radius) {
      if (this.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
      return true;
    }
    return false;
  }

  start(): void {
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.score = 0;
    this.consecutiveDeliveries = 0;
    this.currentLevel = 0;
    this.currentMailboxIndex = 0;
    this.scrollSpeed = this.baseScrollSpeed;
    this.obstacles = [];
    this.mailboxes = [];
    this.auroraWaves = [];
    this.trackOffset = 0;
    this.spawnDistance = 0;
    this.obstacleSpawnTimer = 0;
    this.mailboxSpawnTimer = 0;

    this.mail.reset(this.width / 2, this.height * 0.7);
    this.checkPointY = this.mail.y;
    this.initConstellation();

    this.lastTime = performance.now();
    this.gameLoop();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  restart(): void {
    this.start();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.frameCount++;
    this.fpsTimer += this.deltaTime;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (!this.isPaused && !this.isGameOver) {
      this.update(this.deltaTime);
    }

    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.trackOffset += this.scrollSpeed * deltaTime;
    this.spawnDistance += this.scrollSpeed * deltaTime;

    this.trackCurveTarget = Math.sin(Date.now() * 0.0005) * 0.3;
    this.trackCurve += (this.trackCurveTarget - this.trackCurve) * deltaTime * 2;

    this.updateBackgroundStars(deltaTime);
    this.updateStarPoints(deltaTime);
    this.spawnObstacles(deltaTime);
    this.spawnMailboxes(deltaTime);
    this.updateObstacles(deltaTime);
    this.updateMailboxes(deltaTime);
    this.updateAuroraWaves(deltaTime);
    this.mail.update(deltaTime);

    if (!this.mail.isShattered) {
      this.checkCollisions();
      this.checkMailboxDelivery();
      this.applySuctionForces();
    } else if (this.mail.isShatterComplete()) {
      this.respawnMail();
    }

    if (this.currentMailboxIndex >= this.starPoints.length && this.mailboxes.length === 0) {
      this.nextLevel();
    }
  }

  private updateBackgroundStars(deltaTime: number): void {
    for (const star of this.backgroundStars) {
      star.phase += deltaTime * (Math.PI * 2) / star.period;
      star.y += this.scrollSpeed * 0.3 * deltaTime;

      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  }

  private updateStarPoints(deltaTime: number): void {
    for (const star of this.starPoints) {
      star.update(deltaTime);
    }
  }

  private spawnObstacles(deltaTime: number): void {
    this.obstacleSpawnTimer += deltaTime;
    const spawnInterval = Math.max(0.8, 2 - this.currentLevel * 0.3);

    if (this.obstacleSpawnTimer >= spawnInterval) {
      this.obstacleSpawnTimer = 0;

      const trackCenterX = this.width / 2 + Math.sin(this.trackCurve) * 100;
      const trackWidth = 200;
      const x = trackCenterX + (Math.random() - 0.5) * trackWidth;
      const radius = 20 + Math.random() * 20;

      const type = Math.random() < 0.8 ? 'meteor' : 'comet';
      this.obstacles.push(new Obstacle(x, -radius, radius, type));
    }
  }

  private spawnMailboxes(deltaTime: number): void {
    if (this.currentMailboxIndex >= this.starPoints.length) return;

    this.mailboxSpawnTimer += deltaTime;
    const spawnInterval = 4 - this.currentLevel * 0.5;

    if (this.mailboxSpawnTimer >= spawnInterval && this.mailboxes.length < 3) {
      this.mailboxSpawnTimer = 0;

      const trackCenterX = this.width / 2 + Math.sin(this.trackCurve + 1) * 80;
      const x = trackCenterX + (Math.random() - 0.5) * 100;
      this.mailboxes.push(new Mailbox(x, -60));
    }
  }

  private updateObstacles(deltaTime: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].update(deltaTime, this.scrollSpeed);
      if (this.obstacles[i].y > this.height + 50) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateMailboxes(deltaTime: number): void {
    for (let i = this.mailboxes.length - 1; i >= 0; i--) {
      const mailbox = this.mailboxes[i];
      mailbox.update(deltaTime, this.scrollSpeed, this.mail.x, this.mail.y, this.mail.isDragging);
      
      if (mailbox.y > this.height + 100) {
        this.mailboxes.splice(i, 1);
      }
    }
  }

  private updateAuroraWaves(deltaTime: number): void {
    for (let i = this.auroraWaves.length - 1; i >= 0; i--) {
      this.auroraWaves[i].update(deltaTime);
      if (!this.auroraWaves[i].active) {
        this.auroraWaves.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    if (this.mail.isShattered) return;

    const mailBox = this.mail.getCollisionBox();

    for (const obstacle of this.obstacles) {
      if (obstacle.checkCollision(this.mail.x, this.mail.y, mailBox.width, mailBox.height)) {
        this.onCollision();
        return;
      }
    }

    const trackCenterX = this.width / 2 + Math.sin(this.trackCurve) * 100;
    const trackHalfWidth = 120;
    if (Math.abs(this.mail.x - trackCenterX) > trackHalfWidth) {
      this.onCollision();
    }
  }

  private applySuctionForces(): void {
    if (this.mail.isShattered || !this.mail.isDragging) return;

    for (const mailbox of this.mailboxes) {
      const result = mailbox.update(
        this.deltaTime,
        this.scrollSpeed,
        this.mail.x,
        this.mail.y,
        this.mail.isDragging
      );
      if (result.suctionForce.x !== 0 || result.suctionForce.y !== 0) {
        this.mail.x += result.suctionForce.x;
        this.mail.y += result.suctionForce.y;
      }
    }
  }

  private checkMailboxDelivery(): void {
    if (this.mail.isShattered || !this.mail.isDragging) return;

    for (const mailbox of this.mailboxes) {
      if (mailbox.checkDelivery(this.mail.x, this.mail.y)) {
        this.onDelivery(mailbox);
        break;
      }
    }
  }

  private onCollision(): void {
    this.mail.shatter();
    this.consecutiveDeliveries = 0;
  }

  private onDelivery(mailbox: Mailbox): void {
    mailbox.deliver();
    this.mail.isDragging = false;
    this.isMouseDown = false;

    if (this.currentMailboxIndex < this.starPoints.length) {
      this.starPoints[this.currentMailboxIndex].lightUp();
      this.currentMailboxIndex++;
    }

    this.consecutiveDeliveries++;
    let points = 10;
    if (this.consecutiveDeliveries > 1) {
      points += 5;
    }
    this.score += points;

    this.auroraWaves.push(new AuroraWave(mailbox.x, mailbox.y - 30, Math.max(this.width, this.height)));

    setTimeout(() => {
      this.mail.reset(this.width / 2, this.height * 0.7);
      this.checkPointY = this.mail.y;
    }, 800);
  }

  private respawnMail(): void {
    this.mail.reset(this.width / 2, this.checkPointY);
  }

  private nextLevel(): void {
    this.currentLevel++;
    this.currentMailboxIndex = 0;
    this.scrollSpeed = this.baseScrollSpeed + this.currentLevel * 20;
    this.initConstellation();
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.renderBackground();
    this.renderTrack();
    this.renderAuroraWaves();
    this.renderObstacles();
    this.renderMailboxes();
    this.mail.render(this.ctx);
    this.renderUI();

    if (this.isPaused) {
      this.renderPauseOverlay();
    }
  }

  private renderBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a4e');
    gradient.addColorStop(0.5, '#2d1b4e');
    gradient.addColorStop(1, '#1a0a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.backgroundStars) {
      const brightness = 0.3 + Math.sin(star.phase) * 0.35 + star.brightness * 0.35;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderTrack(): void {
    const trackCenterX = this.width / 2;
    const trackWidth = 240;

    this.ctx.save();

    const gradient = this.ctx.createLinearGradient(
      trackCenterX - trackWidth / 2, 0,
      trackCenterX + trackWidth / 2, 0
    );
    gradient.addColorStop(0, 'rgba(192, 192, 192, 0.1)');
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(192, 192, 192, 0.1)');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';

    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    this.ctx.shadowBlur = 20;

    this.ctx.beginPath();
    this.ctx.moveTo(trackCenterX - trackWidth / 2, 0);
    
    for (let y = 0; y <= this.height; y += 20) {
      const curveOffset = Math.sin(y * 0.01 + this.trackCurve * 2) * 50;
      this.ctx.lineTo(trackCenterX - trackWidth / 2 + curveOffset, y);
    }
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(trackCenterX + trackWidth / 2, 0);
    
    for (let y = 0; y <= this.height; y += 20) {
      const curveOffset = Math.sin(y * 0.01 + this.trackCurve * 2) * 50;
      this.ctx.lineTo(trackCenterX + trackWidth / 2 + curveOffset, y);
    }
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private renderObstacles(): void {
    for (const obstacle of this.obstacles) {
      obstacle.render(this.ctx);
    }
  }

  private renderMailboxes(): void {
    for (const mailbox of this.mailboxes) {
      mailbox.render(this.ctx);
    }
  }

  private renderAuroraWaves(): void {
    for (const aurora of this.auroraWaves) {
      aurora.render(this.ctx);
    }
  }

  private renderUI(): void {
    this.renderConstellationPanel();
    this.renderScorePanel();
    this.renderPauseButton();
  }

  private renderConstellationPanel(): void {
    const panelX = 20;
    const panelY = 20;
    const panelW = 180;
    const panelH = 160;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(26, 26, 78, 0.8)';
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2;

    this.beginRoundRect(panelX, panelY, panelW, panelH, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#8b6914';
    const rivetPositions = [
      [panelX + 8, panelY + 8],
      [panelX + panelW - 8, panelY + 8],
      [panelX + 8, panelY + panelH - 8],
      [panelX + panelW - 8, panelY + panelH - 8]
    ];
    for (const [rx, ry] of rivetPositions) {
      this.ctx.beginPath();
      this.ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    const constellationName = CONSTELLATIONS[this.currentLevel % CONSTELLATIONS.length].name;
    this.ctx.fillText(constellationName, panelX + panelW / 2, panelY + 28);

    const chartX = panelX + 20;
    const chartY = panelY + 40;
    const chartW = panelW - 40;
    const chartH = panelH - 60;

    const constellation = CONSTELLATIONS[this.currentLevel % CONSTELLATIONS.length];
    
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    this.ctx.lineWidth = 1;
    for (const [i, j] of constellation.connections) {
      const p1 = this.starPoints[i];
      const p2 = this.starPoints[j];
      if (p1 && p2) {
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x / 100 * chartW + chartX, p1.y / 100 * chartH + chartY);
        this.ctx.lineTo(p2.x / 100 * chartW + chartX, p2.y / 100 * chartH + chartY);
        this.ctx.stroke();
      }
    }

    for (const star of this.starPoints) {
      star.render(this.ctx, chartH / 100, chartX, chartY);
    }

    const progress = `${this.currentMailboxIndex}/${this.starPoints.length}`;
    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.fillText(progress, panelX + panelW / 2, panelY + panelH - 12);

    this.ctx.restore();
  }

  private renderScorePanel(): void {
    const panelX = this.width - 200;
    const panelY = 20;
    const panelW = 180;
    const panelH = 100;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(26, 26, 78, 0.8)';
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2;

    this.beginRoundRect(panelX, panelY, panelW, panelH, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#8b6914';
    const rivetPositions = [
      [panelX + 8, panelY + 8],
      [panelX + panelW - 8, panelY + 8],
      [panelX + 8, panelY + panelH - 8],
      [panelX + panelW - 8, panelY + panelH - 8]
    ];
    for (const [rx, ry] of rivetPositions) {
      this.ctx.beginPath();
      this.ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('计分板', panelX + panelW / 2, panelY + 28);

    this.ctx.font = 'bold 24px "Courier New", monospace';
    this.ctx.fillText(`${this.score}`, panelX + panelW / 2, panelY + 60);

    if (this.consecutiveDeliveries > 1) {
      this.ctx.font = '12px "Courier New", monospace';
      this.ctx.fillStyle = '#00ff88';
      this.ctx.fillText(`连投 x${this.consecutiveDeliveries}`, panelX + panelW / 2, panelY + 82);
    }

    this.ctx.restore();
  }

  private renderPauseButton(): void {
    const { x, y, radius } = this.pauseBtnRect;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(26, 26, 78, 0.6)';
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffd700';
    if (this.isPaused) {
      this.ctx.beginPath();
      this.ctx.moveTo(x - 5, y - 8);
      this.ctx.lineTo(x + 8, y);
      this.ctx.lineTo(x - 5, y + 8);
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      this.ctx.fillRect(x - 6, y - 6, 4, 12);
      this.ctx.fillRect(x + 2, y - 6, 4, 12);
    }

    this.ctx.restore();
  }

  private renderPauseOverlay(): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const btnW = 140;
    const btnH = 50;
    const spacing = 30;

    this.renderButton(centerX - btnW - spacing / 2, centerY - btnH / 2, btnW, btnH, '继续', () => this.resume());
    this.renderButton(centerX + spacing / 2, centerY - btnH / 2, btnW, btnH, '重新开始', () => this.restart());

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 32px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏暂停', centerX, centerY - 80);

    this.ctx.restore();
  }

  private renderButton(x: number, y: number, w: number, h: number, text: string, onClick: () => void): void {
    this.ctx.fillStyle = 'rgba(26, 26, 78, 0.9)';
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2;

    this.beginRoundRect(x, y, w, h, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 16px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x + w / 2, y + h / 2);

    const handleClick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        onClick();
        this.canvas.removeEventListener('click', handleClick);
      }
    };
    this.canvas.addEventListener('click', handleClick, { once: true });
  }

  private beginRoundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  getFPS(): number {
    return this.fps;
  }
}
