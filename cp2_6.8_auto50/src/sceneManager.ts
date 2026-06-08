export interface Building {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  windowColor: string;
  windows: { x: number; y: number; lit: boolean }[];
}

export interface Tree {
  x: number;
  y: number;
  size: number;
}

export interface Lamp {
  x: number;
  y: number;
  height: number;
}

export type ItemType = 'trash' | 'sign' | 'pedestrian';

export interface PickupItem {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: ItemType;
  state: 'idle' | 'sucking' | 'flying' | 'exploding' | 'gone';
  suckProgress: number;
  suckHeight: number;
  flyVelocity: { x: number; y: number };
  flyPosition: { x: number; y: number };
  explosionFrame: number;
  flashRed: number;
}

export class SceneManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private groundY: number;
  public buildings: Building[] = [];
  public trees: Tree[] = [];
  public lamps: Lamp[] = [];
  public items: PickupItem[] = [];
  private itemIdCounter = 0;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.groundY = height * 0.7;
    this.generateScene();
  }

  private generateScene(): void {
    this.generateBuildings();
    this.generateTrees();
    this.generateLamps();
    this.generateItems();
  }

  private generateBuildings(): void {
    const buildingColors = ['#8b4513', '#6b3410', '#a0522d', '#4a4a5a', '#3a3a4a'];
    const windowColors = ['#ffeb3b', '#fff59d', '#b0bec5'];
    const numBuildings = 8;

    for (let i = 0; i < numBuildings; i++) {
      const width = 60 + Math.random() * 80;
      const height = 80 + Math.random() * 120;
      const x = (this.canvasWidth / numBuildings) * i + (Math.random() - 0.5) * 30;
      const y = this.groundY - height;
      const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
      const windowColor = windowColors[Math.floor(Math.random() * windowColors.length)];

      const windows: { x: number; y: number; lit: boolean }[] = [];
      const windowRows = Math.floor(height / 30);
      const windowCols = Math.floor(width / 25);
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          windows.push({
            x: 10 + col * 25,
            y: 15 + row * 30,
            lit: Math.random() > 0.4
          });
        }
      }

      this.buildings.push({
        x,
        y,
        width,
        height,
        color,
        windowColor,
        windows
      });
    }
  }

  private generateTrees(): void {
    const numTrees = 12;
    for (let i = 0; i < numTrees; i++) {
      this.trees.push({
        x: Math.random() * this.canvasWidth,
        y: this.groundY - 10 - Math.random() * 20,
        size: 15 + Math.random() * 15
      });
    }
  }

  private generateLamps(): void {
    const numLamps = 5;
    for (let i = 0; i < numLamps; i++) {
      this.lamps.push({
        x: (this.canvasWidth / (numLamps + 1)) * (i + 1),
        y: this.groundY,
        height: 40 + Math.random() * 20
      });
    }
  }

  private generateItems(): void {
    const numItems = 12 + Math.floor(Math.random() * 4);
    const types: ItemType[] = ['trash', 'sign', 'pedestrian'];
    const colors = {
      trash: '#558b2f',
      sign: '#f44336',
      pedestrian: '#2196f3'
    };
    const sizes = {
      trash: { w: 16, h: 20 },
      sign: { w: 12, h: 24 },
      pedestrian: { w: 10, h: 18 }
    };

    for (let i = 0; i < numItems; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const size = sizes[type];
      let x: number;
      let attempts = 0;
      let valid = false;

      while (!valid && attempts < 50) {
        x = 50 + Math.random() * (this.canvasWidth - 100);
        valid = true;
        for (const building of this.buildings) {
          if (x > building.x - size.w && x < building.x + building.width + size.w) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      this.items.push({
        id: this.itemIdCounter++,
        x: x!,
        y: this.groundY - size.h,
        width: size.w,
        height: size.h,
        color: colors[type],
        type,
        state: 'idle',
        suckProgress: 0,
        suckHeight: 0,
        flyVelocity: { x: 0, y: 0 },
        flyPosition: { x: 0, y: 0 },
        explosionFrame: 0,
        flashRed: 0
      });
    }
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.groundY = height * 0.7;
    this.buildings = [];
    this.trees = [];
    this.lamps = [];
    this.items = [];
    this.itemIdCounter = 0;
    this.generateScene();
  }

  public getGroundY(): number {
    return this.groundY;
  }

  public checkTornadoCollision(
    tornadoX: number,
    tornadoY: number,
    tornadoRadius: number
  ): PickupItem[] {
    const suckedItems: PickupItem[] = [];

    for (const item of this.items) {
      if (item.state !== 'idle') continue;

      const itemCenterX = item.x + item.width / 2;
      const itemCenterY = item.y + item.height / 2;
      const dx = itemCenterX - tornadoX;
      const dy = itemCenterY - tornadoY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < tornadoRadius * 0.6) {
        item.state = 'sucking';
        item.suckProgress = 0;
        item.suckHeight = 0;
        item.flashRed = 0.3;
        suckedItems.push(item);
      }
    }

    return suckedItems;
  }

  public updateItems(deltaTime: number, tornadoCenter: { x: number; y: number }): void {
    const suckDuration = 0.5;

    for (const item of this.items) {
      if (item.flashRed > 0) {
        item.flashRed -= deltaTime;
        if (item.flashRed < 0) item.flashRed = 0;
      }

      if (item.state === 'sucking') {
        item.suckProgress += deltaTime / suckDuration;

        const t = item.suckProgress;
        const angle = t * Math.PI * 4;
        const spiralRadius = (1 - t) * 30;
        const height = t * 150;

        item.suckHeight = height;
        item.x = tornadoCenter.x + Math.cos(angle) * spiralRadius - item.width / 2;
        item.y = tornadoCenter.y - height - item.height / 2;

        if (item.suckProgress >= 1) {
          item.state = 'flying';
          const flyAngle = Math.random() * Math.PI * 2;
          const flySpeed = 200 + Math.random() * 200;
          item.flyVelocity = {
            x: Math.cos(flyAngle) * flySpeed,
            y: -150 - Math.random() * 100
          };
          item.flyPosition = {
            x: tornadoCenter.x,
            y: tornadoCenter.y - 150
          };
        }
      } else if (item.state === 'flying') {
        item.flyPosition.x += item.flyVelocity.x * deltaTime;
        item.flyPosition.y += item.flyVelocity.y * deltaTime;
        item.flyVelocity.y += 400 * deltaTime;

        if (
          item.flyPosition.x < -50 ||
          item.flyPosition.x > this.canvasWidth + 50 ||
          item.flyPosition.y > this.groundY + 50
        ) {
          item.state = 'exploding';
          item.explosionFrame = 0;
          if (item.flyPosition.y > this.groundY) {
            item.flyPosition.y = this.groundY;
          }
        }
      } else if (item.state === 'exploding') {
        item.explosionFrame += deltaTime * 10;
        if (item.explosionFrame >= 3) {
          item.state = 'gone';
        }
      }
    }

    this.items = this.items.filter((item) => item.state !== 'gone');
  }

  public reset(): void {
    this.items = [];
    this.itemIdCounter = 0;
    this.generateItems();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderSky(ctx);
    this.renderBuildings(ctx);
    this.renderGround(ctx);
    this.renderTrees(ctx);
    this.renderLamps(ctx);
    this.renderItems(ctx);
  }

  private renderSky(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.groundY);
    gradient.addColorStop(0, '#0d1033');
    gradient.addColorStop(0.5, '#1a1a4e');
    gradient.addColorStop(1, '#2d2d66');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.groundY);

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) {
      const x = (i * 137.5) % this.canvasWidth;
      const y = (i * 53.7) % (this.groundY * 0.6);
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(0, this.groundY, this.canvasWidth, this.canvasHeight - this.groundY);

    ctx.fillStyle = '#4e342e';
    for (let x = 0; x < this.canvasWidth; x += 20) {
      ctx.fillRect(x, this.groundY + 5, 10, 3);
      ctx.fillRect(x + 5, this.groundY + 15, 8, 2);
    }

    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(0, this.groundY, this.canvasWidth, 3);
  }

  private renderBuildings(ctx: CanvasRenderingContext2D): void {
    for (const building of this.buildings) {
      ctx.fillStyle = building.color;
      ctx.fillRect(
        Math.floor(building.x),
        Math.floor(building.y),
        Math.floor(building.width),
        Math.floor(building.height)
      );

      ctx.fillStyle = '#000000';
      ctx.fillRect(
        Math.floor(building.x),
        Math.floor(building.y),
        3,
        Math.floor(building.height)
      );

      for (const win of building.windows) {
        const wx = building.x + win.x;
        const wy = building.y + win.y;
        ctx.fillStyle = win.lit ? building.windowColor : '#1a1a2e';
        ctx.fillRect(Math.floor(wx), Math.floor(wy), 10, 14);

        if (win.lit) {
          ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
          ctx.fillRect(Math.floor(wx - 1), Math.floor(wy - 1), 12, 16);
        }
      }

      ctx.fillStyle = '#3e2723';
      ctx.fillRect(
        Math.floor(building.x + building.width / 2 - 6),
        Math.floor(building.y + building.height - 25),
        12,
        25
      );
    }
  }

  private renderTrees(ctx: CanvasRenderingContext2D): void {
    for (const tree of this.trees) {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(
        Math.floor(tree.x - 2),
        Math.floor(tree.y - tree.size * 0.3),
        4,
        Math.floor(tree.size * 0.4)
      );

      ctx.fillStyle = '#2e7d32';
      const s = tree.size;
      ctx.fillRect(
        Math.floor(tree.x - s / 2),
        Math.floor(tree.y - s),
        s,
        s * 0.7
      );

      ctx.fillStyle = '#388e3c';
      ctx.fillRect(
        Math.floor(tree.x - s / 3),
        Math.floor(tree.y - s - 3),
        s * 0.66,
        s * 0.3
      );

      ctx.fillStyle = '#1b5e20';
      ctx.fillRect(
        Math.floor(tree.x - s / 2),
        Math.floor(tree.y - s * 0.3),
        s,
        3
      );
    }
  }

  private renderLamps(ctx: CanvasRenderingContext2D): void {
    for (const lamp of this.lamps) {
      ctx.fillStyle = '#424242';
      ctx.fillRect(
        Math.floor(lamp.x - 2),
        Math.floor(lamp.y - lamp.height),
        4,
        lamp.height
      );

      ctx.fillStyle = '#212121';
      ctx.fillRect(
        Math.floor(lamp.x - 6),
        Math.floor(lamp.y - lamp.height - 4),
        12,
        6
      );

      ctx.fillStyle = '#fff9c4';
      ctx.fillRect(
        Math.floor(lamp.x - 4),
        Math.floor(lamp.y - lamp.height - 2),
        8,
        4
      );

      const gradient = ctx.createRadialGradient(
        lamp.x,
        lamp.y - lamp.height,
        0,
        lamp.x,
        lamp.y - lamp.height,
        30
      );
      gradient.addColorStop(0, 'rgba(255, 249, 196, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 249, 196, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - lamp.height, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderItems(ctx: CanvasRenderingContext2D): void {
    for (const item of this.items) {
      if (item.state === 'gone') continue;

      let renderX = item.x;
      let renderY = item.y;

      if (item.state === 'flying') {
        renderX = item.flyPosition.x - item.width / 2;
        renderY = item.flyPosition.y - item.height / 2;
      }

      if (item.state === 'exploding') {
        this.renderExplosion(ctx, item);
        continue;
      }

      if (item.flashRed > 0) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.floor(renderX - 2),
          Math.floor(renderY - 2),
          item.width + 4,
          item.height + 4
        );
      }

      this.renderItemShape(ctx, item, renderX, renderY);
    }
  }

  private renderItemShape(
    ctx: CanvasRenderingContext2D,
    item: PickupItem,
    x: number,
    y: number
  ): void {
    ctx.fillStyle = item.color;

    if (item.type === 'trash') {
      ctx.fillRect(Math.floor(x), Math.floor(y + 4), item.width, item.height - 4);
      ctx.fillRect(Math.floor(x - 2), Math.floor(y), item.width + 4, 5);
      ctx.fillStyle = '#33691e';
      ctx.fillRect(Math.floor(x + 2), Math.floor(y + 8), 3, item.height - 12);
      ctx.fillRect(Math.floor(x + item.width - 5), Math.floor(y + 8), 3, item.height - 12);
    } else if (item.type === 'sign') {
      ctx.fillStyle = '#795548';
      ctx.fillRect(Math.floor(x + item.width / 2 - 1), Math.floor(y + 10), 2, item.height - 10);
      ctx.fillStyle = item.color;
      ctx.fillRect(Math.floor(x), Math.floor(y), item.width, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(x + 3), Math.floor(y + 3), item.width - 6, 2);
      ctx.fillRect(Math.floor(x + 5), Math.floor(y + 7), item.width - 10, 2);
    } else if (item.type === 'pedestrian') {
      ctx.fillRect(Math.floor(x + 2), Math.floor(y), 6, 6);
      ctx.fillRect(Math.floor(x + 1), Math.floor(y + 6), 8, 6);
      ctx.fillRect(Math.floor(x + 2), Math.floor(y + 12), 2, 6);
      ctx.fillRect(Math.floor(x + 6), Math.floor(y + 12), 2, 6);
      ctx.fillStyle = '#ffc107';
      ctx.fillRect(Math.floor(x + 3), Math.floor(y + 1), 4, 3);
    }
  }

  private renderExplosion(ctx: CanvasRenderingContext2D, item: PickupItem): void {
    const frame = Math.floor(item.explosionFrame);
    const centerX = item.flyPosition.x;
    const centerY = item.flyPosition.y;
    const sizes = [8, 14, 20];
    const size = sizes[Math.min(frame, 2)];
    const alphas = [1, 0.7, 0.4];
    const alpha = alphas[Math.min(frame, 2)];

    const colors = [item.color, '#ffeb3b', '#ff9800'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + frame * 0.3;
      const dist = size * (0.5 + Math.random() * 0.5);
      const px = centerX + Math.cos(angle) * dist;
      const py = centerY + Math.sin(angle) * dist;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors[i % 3];
      ctx.fillRect(Math.floor(px - 2), Math.floor(py - 2), 4, 4);
    }
    ctx.globalAlpha = 1;
  }
}
