import Phaser from 'phaser';

interface Cell {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Ellipse;
  cilia1: Phaser.GameObjects.Line;
  cilia2: Phaser.GameObjects.Line;
  star: Phaser.GameObjects.Star;
  vx: number;
  vy: number;
  baseWidth: number;
  baseHeight: number;
  currentWidth: number;
  currentHeight: number;
  directionChangeTimer: number;
  isDragging: boolean;
  sizeMultiplier: number;
  maxSizeReachedTime: number;
  baseHue: number;
  brightness: number;
  isSplitting: boolean;
  splitProgress: number;
  splitTargetX1: number;
  splitTargetY1: number;
  splitTargetX2: number;
  splitTargetY2: number;
  attachedFood: FoodParticle[];
}

interface FoodParticle {
  circle: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  isAttached: boolean;
  attachedCell: Cell | null;
  scale: number;
  life: number;
}

interface Particle {
  circle: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class GameScene extends Phaser.Scene {
  private dishRadius: number = 300;
  private dishCenterX: number = 400;
  private dishCenterY: number = 300;
  private cells: Cell[] = [];
  private foodParticles: FoodParticle[] = [];
  private particles: Particle[] = [];
  private statsText!: Phaser.GameObjects.Text;
  private resetButton!: Phaser.GameObjects.Arc;
  private controlPanel!: Phaser.GameObjects.Container;
  private temperature: number = 25;
  private phValue: number = 7.0;
  private nutrientDensity: string = 'medium';
  private eatenFood: number = 0;
  private elapsedTime: number = 0;
  private foodSpawnTimer: number = 0;
  private isDraggingCell: boolean = false;
  private draggedCell: Cell | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.dishRadius = this.scale.width < 768 ? 200 : 300;
    this.dishCenterX = this.scale.width / 2;
    this.dishCenterY = this.scale.height / 2;

    this.createGridBackground();
    this.createPetriDish();
    this.createCells(30);
    this.createFoodParticles(80);
    this.createControlPanel();
    this.createStatsDisplay();
    this.createResetButton();

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);

    this.scale.on('resize', this.handleResize, this);
  }

  private createGridBackground(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xffffff, 0.1);

    for (let x = 0; x <= this.scale.width; x += 50) {
      graphics.lineBetween(x, 0, x, this.scale.height);
    }
    for (let y = 0; y <= this.scale.height; y += 50) {
      graphics.lineBetween(0, y, this.scale.width, y);
    }
    graphics.setDepth(0);
  }

  private createPetriDish(): void {
    const shadow = this.add.ellipse(
      this.dishCenterX + 2,
      this.dishCenterY + 2,
      this.dishRadius * 2,
      this.dishRadius * 2,
      0x000000,
      0.3
    );
    shadow.setDepth(1);

    const dishBg = this.add.ellipse(
      this.dishCenterX,
      this.dishCenterY,
      this.dishRadius * 2,
      this.dishRadius * 2,
      0xd4f0e0,
      0.9
    );
    dishBg.setDepth(2);

    const dishBorder = this.add.ellipse(
      this.dishCenterX,
      this.dishCenterY,
      this.dishRadius * 2,
      this.dishRadius * 2
    );
    dishBorder.setStrokeStyle(3, 0xcccccc, 1);
    dishBorder.isFilled = false;
    dishBorder.setDepth(3);
  }

  private createCells(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createSingleCell();
    }
  }

  private createSingleCell(x?: number, y?: number, baseHue?: number): Cell {
    let posX: number, posY: number;
    if (x !== undefined && y !== undefined) {
      posX = x;
      posY = y;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.dishRadius - 40);
      posX = this.dishCenterX + Math.cos(angle) * dist;
      posY = this.dishCenterY + Math.sin(angle) * dist;
    }

    const hue = baseHue !== undefined 
      ? Phaser.Math.Clamp(baseHue + (Math.random() - 0.5) * 40, 90, 30)
      : Phaser.Math.Linear(90, 30, Math.random());

    const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.5);

    const container = this.add.container(posX, posY);
    container.setDepth(5);

    const body = this.add.ellipse(0, 0, 30, 20, color.color, 0.9);
    container.add(body);

    const ciliaColor = 0x2a5a2a;
    const cilia1 = this.add.line(-15, 0, 0, 0, -15, 8);
    cilia1.setStrokeStyle(2, ciliaColor, 0.7);
    const cilia2 = this.add.line(15, 0, 0, 0, 15, -8);
    cilia2.setStrokeStyle(2, ciliaColor, 0.7);
    container.add(cilia1);
    container.add(cilia2);

    const star = this.add.star(0, 0, 5, 4, 8, 0xffffff, 0);
    container.add(star);

    container.setSize(30, 20);
    container.setInteractive({ useHandCursor: true });

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 2;

    const cell: Cell = {
      container,
      body,
      cilia1,
      cilia2,
      star,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      baseWidth: 30,
      baseHeight: 20,
      currentWidth: 30,
      currentHeight: 20,
      directionChangeTimer: Math.random() * 40,
      isDragging: false,
      sizeMultiplier: 1,
      maxSizeReachedTime: 0,
      baseHue: hue,
      brightness: 0.5,
      isSplitting: false,
      splitProgress: 0,
      splitTargetX1: 0,
      splitTargetY1: 0,
      splitTargetX2: 0,
      splitTargetY2: 0,
      attachedFood: []
    };

    this.cells.push(cell);
    return cell;
  }

  private createFoodParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      this.createSingleFoodParticle();
    }
  }

  private createSingleFoodParticle(): FoodParticle {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (this.dishRadius - 20);
    const x = this.dishCenterX + Math.cos(angle) * dist;
    const y = this.dishCenterY + Math.sin(angle) * dist;

    const circle = this.add.arc(x, y, 4, 0, Math.PI * 2, true, 0xff6347, 0.7);
    circle.setDepth(4);

    const moveAngle = Math.random() * Math.PI * 2;
    const speed = 0.5;

    const particle: FoodParticle = {
      circle,
      vx: Math.cos(moveAngle) * speed,
      vy: Math.sin(moveAngle) * speed,
      isAttached: false,
      attachedCell: null,
      scale: 1,
      life: 0
    };

    this.foodParticles.push(particle);
    return particle;
  }

  private createControlPanel(): void {
    this.controlPanel = this.add.container(0, 0);
    this.controlPanel.setDepth(20);

    const panelWidth = 200;
    const panelHeight = 170;

    const panelX = this.scale.width - panelWidth - 20;
    const panelY = 20;

    const bg = this.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0xffffff,
      0.8
    );
    bg.setStrokeStyle(1, 0xcccccc, 1);
    (bg as Phaser.GameObjects.Shape).isFilled = true;
    this.controlPanel.add(bg);

    const titleText = this.add.text(
      panelX + 10,
      panelY + 8,
      '环境参数',
      { fontSize: '14px', color: '#2a4a7a', fontStyle: 'bold' }
    );
    this.controlPanel.add(titleText);

    const tempLabel = this.add.text(
      panelX + 10,
      panelY + 35,
      `温度: ${this.temperature}°C`,
      { fontSize: '12px', color: '#333333' }
    );
    this.controlPanel.add(tempLabel);

    const tempSliderBg = this.add.rectangle(
      panelX + 100,
      panelY + 52,
      160,
      6,
      0xdddddd,
      1
    );
    this.controlPanel.add(tempSliderBg);

    const tempGradient = this.add.graphics();
    tempGradient.fillGradientStyle(0x2a6a9a, 0xff6347, 0x2a6a9a, 0xff6347, 1);
    tempGradient.fillRect(panelX + 20, panelY + 49, 160, 6);
    this.controlPanel.add(tempGradient);

    const tempHandle = this.add.circle(
      panelX + 20 + 160 * ((this.temperature - 15) / 20),
      panelY + 52,
      8,
      0xffffff,
      1
    );
    tempHandle.setStrokeStyle(2, 0x2a6a9a, 1);
    tempHandle.setInteractive({ useHandCursor: true });
    tempHandle.setData('type', 'temperature');
    tempHandle.setData('label', tempLabel);
    tempHandle.setData('startX', panelX + 20);
    tempHandle.setData('width', 160);
    this.controlPanel.add(tempHandle);

    const phLabel = this.add.text(
      panelX + 10,
      panelY + 68,
      `pH: ${this.phValue.toFixed(1)}`,
      { fontSize: '12px', color: '#333333' }
    );
    this.controlPanel.add(phLabel);

    const phGradient = this.add.graphics();
    phGradient.fillGradientStyle(0x2a6a9a, 0xff6347, 0x2a6a9a, 0xff6347, 1);
    phGradient.fillRect(panelX + 20, panelY + 82, 160, 6);
    this.controlPanel.add(phGradient);

    const phHandle = this.add.circle(
      panelX + 20 + 160 * ((this.phValue - 5) / 4),
      panelY + 85,
      8,
      0xffffff,
      1
    );
    phHandle.setStrokeStyle(2, 0x2a6a9a, 1);
    phHandle.setInteractive({ useHandCursor: true });
    phHandle.setData('type', 'ph');
    phHandle.setData('label', phLabel);
    phHandle.setData('startX', panelX + 20);
    phHandle.setData('width', 160);
    this.controlPanel.add(phHandle);

    const nutrientLabel = this.add.text(
      panelX + 10,
      panelY + 101,
      '营养密度:',
      { fontSize: '12px', color: '#333333' }
    );
    this.controlPanel.add(nutrientLabel);

    const nutrientOptions = ['低', '中', '高'];
    const nutrientValues = ['low', 'medium', 'high'];
    let nutrientIndex = 1;

    const nutrientBox = this.add.rectangle(
      panelX + 100,
      panelY + 125,
      100,
      26,
      0xffffff,
      1
    );
    nutrientBox.setStrokeStyle(1, 0x999999, 1);
    nutrientBox.setInteractive({ useHandCursor: true });
    this.controlPanel.add(nutrientBox);

    const nutrientText = this.add.text(
      panelX + 100,
      panelY + 125,
      nutrientOptions[nutrientIndex],
      { fontSize: '13px', color: '#2a4a7a' }
    );
    nutrientText.setOrigin(0.5);
    this.controlPanel.add(nutrientText);

    const arrow = this.add.text(
      panelX + 145,
      panelY + 125,
      '▼',
      { fontSize: '10px', color: '#666666' }
    );
    arrow.setOrigin(0.5);
    this.controlPanel.add(arrow);

    nutrientBox.on('pointerdown', () => {
      nutrientIndex = (nutrientIndex + 1) % 3;
      this.nutrientDensity = nutrientValues[nutrientIndex];
      nutrientText.setText(nutrientOptions[nutrientIndex]);
      this.adjustFoodCount();
    });

    tempHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startSliderDrag(pointer, tempHandle);
    });
    phHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startSliderDrag(pointer, phHandle);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handleSliderDrag(pointer);
    });
    this.input.on('pointerup', () => {
      this.endSliderDrag();
    });
  }

  private draggingSlider: Phaser.GameObjects.Arc | null = null;

  private startSliderDrag(pointer: Phaser.Input.Pointer, handle: Phaser.GameObjects.Arc): void {
    this.draggingSlider = handle;
    this.handleSliderDrag(pointer);
  }

  private handleSliderDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingSlider) return;

    const startX = this.draggingSlider.getData('startX') as number;
    const width = this.draggingSlider.getData('width') as number;
    const type = this.draggingSlider.getData('type') as string;
    const label = this.draggingSlider.getData('label') as Phaser.GameObjects.Text;

    let newX = Phaser.Math.Clamp(pointer.x, startX, startX + width);
    this.draggingSlider.setX(newX);

    const ratio = (newX - startX) / width;

    if (type === 'temperature') {
      this.temperature = 15 + ratio * 20;
      label.setText(`温度: ${Math.round(this.temperature)}°C`);
    } else if (type === 'ph') {
      this.phValue = 5 + ratio * 4;
      label.setText(`pH: ${this.phValue.toFixed(1)}`);
    }
  }

  private endSliderDrag(): void {
    this.draggingSlider = null;
  }

  private adjustFoodCount(): void {
    const targetCount = this.nutrientDensity === 'low' ? 50 : this.nutrientDensity === 'high' ? 150 : 80;
    const currentCount = this.foodParticles.length;

    if (currentCount < targetCount) {
      for (let i = currentCount; i < targetCount; i++) {
        this.createSingleFoodParticle();
      }
    } else if (currentCount > targetCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) {
        const p = this.foodParticles.pop()!;
        p.circle.destroy();
      }
    }
  }

  private createStatsDisplay(): void {
    this.statsText = this.add.text(
      20,
      this.scale.height - 80,
      '',
      { fontSize: '16px', color: '#2a4a7a', fontStyle: 'bold' }
    );
    this.statsText.setDepth(20);
    this.statsText.setBackgroundColor('#ffffff');
    this.statsText.setPadding(8, 8, 8, 8);
  }

  private createResetButton(): void {
    const btnX = 40;
    const btnY = this.scale.height - 30;

    this.resetButton = this.add.arc(btnX, btnY, 20, 0, Math.PI * 2, true, 0xff4500, 1);
    this.resetButton.setDepth(21);
    this.resetButton.setInteractive({ useHandCursor: true });

    const resetIcon = this.add.text(btnX, btnY, '↻', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    resetIcon.setOrigin(0.5);
    resetIcon.setDepth(22);

    this.resetButton.on('pointerover', () => {
      this.resetButton.setScale(1.2);
      this.resetButton.setFillStyle(0xff6347, 1);
    });

    this.resetButton.on('pointerout', () => {
      this.resetButton.setScale(1);
      this.resetButton.setFillStyle(0xff4500, 1);
    });

    this.resetButton.on('pointerdown', () => {
      this.resetSimulation();
    });
  }

  private resetSimulation(): void {
    for (const cell of this.cells) {
      cell.container.destroy();
    }
    this.cells = [];

    for (const food of this.foodParticles) {
      food.circle.destroy();
    }
    this.foodParticles = [];

    for (const p of this.particles) {
      p.circle.destroy();
    }
    this.particles = [];

    this.eatenFood = 0;
    this.elapsedTime = 0;
    this.foodSpawnTimer = 0;

    this.createCells(30);
    this.createFoodParticles(80);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.draggingSlider) return;

    for (let i = this.cells.length - 1; i >= 0; i--) {
      const cell = this.cells[i];
      if (cell.isSplitting) continue;

      const dx = pointer.x - cell.container.x;
      const dy = pointer.y - cell.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < Math.max(cell.currentWidth, cell.currentHeight) / 2 + 5) {
        cell.isDragging = true;
        this.isDraggingCell = true;
        this.draggedCell = cell;
        this.cells.splice(i, 1);
        this.cells.push(cell);
        break;
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDraggingCell || !this.draggedCell) return;

    const cell = this.draggedCell;
    const dx = pointer.x - cell.container.x;
    const dy = pointer.y - cell.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const maxSpeed = 5;
      if (dist > maxSpeed) {
        cell.container.x += (dx / dist) * maxSpeed;
        cell.container.y += (dy / dist) * maxSpeed;
      } else {
        cell.container.x = pointer.x;
        cell.container.y = pointer.y;
      }
    }

    const distFromCenter = Math.sqrt(
      Math.pow(cell.container.x - this.dishCenterX, 2) +
      Math.pow(cell.container.y - this.dishCenterY, 2)
    );

    if (distFromCenter > this.dishRadius - 20) {
      const angle = Math.atan2(
        cell.container.y - this.dishCenterY,
        cell.container.x - this.dishCenterX
      );
      cell.container.x = this.dishCenterX + Math.cos(angle) * (this.dishRadius - 20);
      cell.container.y = this.dishCenterY + Math.sin(angle) * (this.dishRadius - 20);
    }
  }

  private handlePointerUp(): void {
    if (this.draggedCell) {
      this.draggedCell.isDragging = false;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      this.draggedCell.vx = Math.cos(angle) * speed;
      this.draggedCell.vy = Math.sin(angle) * speed;
    }
    this.isDraggingCell = false;
    this.draggedCell = null;
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.elapsedTime += dt;

    const tempMultiplier = 0.5 + ((this.temperature - 15) / 20);

    for (const cell of this.cells) {
      this.updateCell(cell, dt, tempMultiplier);
    }

    for (let i = this.cells.length - 1; i >= 0; i--) {
      if (this.cells[i].isSplitting && this.cells[i].splitProgress >= 1) {
        this.completeCellSplit(i);
      }
    }

    this.updateFoodParticles(dt);

    const foodSpawnRate = (this.phValue - 5) / 4 * 2;
    this.foodSpawnTimer += dt;
    const maxFood = this.nutrientDensity === 'low' ? 50 : this.nutrientDensity === 'high' ? 150 : 80;
    if (this.foodSpawnTimer >= 1 && this.foodParticles.length < Math.min(maxFood, 200)) {
      this.foodSpawnTimer = 0;
      const spawnCount = Math.floor(foodSpawnRate);
      for (let i = 0; i < spawnCount; i++) {
        if (this.foodParticles.length < Math.min(maxFood, 200)) {
          this.createSingleFoodParticle();
        }
      }
    }

    this.updateParticles(dt);

    this.statsText.setText(
      `细胞数量: ${this.cells.length}\n` +
      `已吞噬食物: ${this.eatenFood}\n` +
      `运行时间: ${Math.floor(this.elapsedTime)}秒`
    );
  }

  private updateCell(cell: Cell, _dt: number, tempMultiplier: number): void {
    if (cell.isSplitting) {
      cell.splitProgress += _dt * 2;
      return;
    }

    if (cell.isDragging) return;

    cell.directionChangeTimer--;
    if (cell.directionChangeTimer <= 0) {
      cell.directionChangeTimer = 40;
      const currentAngle = Math.atan2(cell.vy, cell.vx);
      const angleDelta = (Math.random() - 0.5) * (Math.PI / 6);
      const newAngle = currentAngle + angleDelta;
      const speed = 2 + Math.random() * 2;
      cell.vx = Math.cos(newAngle) * speed * tempMultiplier;
      cell.vy = Math.sin(newAngle) * speed * tempMultiplier;
    }

    const newX = cell.container.x + cell.vx;
    const newY = cell.container.y + cell.vy;

    const distFromCenter = Math.sqrt(
      Math.pow(newX - this.dishCenterX, 2) +
      Math.pow(newY - this.dishCenterY, 2)
    );

    if (distFromCenter > this.dishRadius - 20) {
      const normalX = (newX - this.dishCenterX) / distFromCenter;
      const normalY = (newY - this.dishCenterY) / distFromCenter;
      const dot = cell.vx * normalX + cell.vy * normalY;
      cell.vx -= 2 * dot * normalX;
      cell.vy -= 2 * dot * normalY;
    } else {
      cell.container.x = newX;
      cell.container.y = newY;
    }

    const moveAngle = Math.atan2(cell.vy, cell.vx);
    cell.container.rotation = moveAngle;

    if (cell.sizeMultiplier >= 1.5) {
      cell.maxSizeReachedTime += _dt;
      const blinkFrame = Math.floor(this.elapsedTime * 12) % 2;
      cell.star.setAlpha(blinkFrame === 0 ? 1 : 0);

      if (cell.maxSizeReachedTime >= 3) {
        this.startCellSplit(cell);
      }
    } else {
      cell.maxSizeReachedTime = 0;
      cell.star.setAlpha(0);
    }

    for (let i = cell.attachedFood.length - 1; i >= 0; i--) {
      const food = cell.attachedFood[i];
      food.life += _dt;
      food.scale *= 0.9;
      food.circle.setScale(food.scale);

      const attachAngle = Math.atan2(
        food.circle.y - cell.container.y,
        food.circle.x - cell.container.x
      );
      const attachDist = Math.max(cell.currentWidth, cell.currentHeight) / 2;
      food.circle.x = cell.container.x + Math.cos(attachAngle) * attachDist;
      food.circle.y = cell.container.y + Math.sin(attachAngle) * attachDist;

      if (food.life >= 1) {
        food.circle.destroy();
        cell.attachedFood.splice(i, 1);
        const idx = this.foodParticles.indexOf(food);
        if (idx !== -1) {
          this.foodParticles.splice(idx, 1);
        }
        this.eatenFood++;
        this.growCell(cell);
        this.spawnEatParticles(cell.container.x, cell.container.y);
      }
    }
  }

  private growCell(cell: Cell): void {
    if (cell.sizeMultiplier < 1.5) {
      cell.sizeMultiplier = Math.min(1.5, cell.sizeMultiplier * 1.05);
      cell.currentWidth = cell.baseWidth * cell.sizeMultiplier;
      cell.currentHeight = cell.baseHeight * cell.sizeMultiplier;
      cell.body.setSize(cell.currentWidth, cell.currentHeight);

      cell.brightness = Math.min(0.7, cell.brightness + 0.02);
      const newColor = Phaser.Display.Color.HSLToColor(
        cell.baseHue / 360,
        0.6,
        cell.brightness
      );
      cell.body.setFillStyle(newColor.color, 0.9);
    }
  }

  private spawnEatParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const radius = 1 + Math.random() * 2;
      const circle = this.add.arc(x, y, radius, 0, Math.PI * 2, true, 0xffffff, 1);
      circle.setDepth(10);
      this.particles.push({
        circle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.5
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.circle.x += p.vx;
      p.circle.y += p.vy;
      p.circle.setAlpha(1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        p.circle.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFoodParticles(_dt: number): void {
    for (let i = this.foodParticles.length - 1; i >= 0; i--) {
      const food = this.foodParticles[i];
      if (food.isAttached) continue;

      const newX = food.circle.x + food.vx;
      const newY = food.circle.y + food.vy;

      const distFromCenter = Math.sqrt(
        Math.pow(newX - this.dishCenterX, 2) +
        Math.pow(newY - this.dishCenterY, 2)
      );

      if (distFromCenter > this.dishRadius - 8) {
        const normalX = (newX - this.dishCenterX) / distFromCenter;
        const normalY = (newY - this.dishCenterY) / distFromCenter;
        const dot = food.vx * normalX + food.vy * normalY;
        food.vx -= 2 * dot * normalX;
        food.vy -= 2 * dot * normalY;
      } else {
        food.circle.x = newX;
        food.circle.y = newY;
      }

      for (const cell of this.cells) {
        if (cell.isSplitting) continue;
        const dx = food.circle.x - cell.container.x;
        const dy = food.circle.y - cell.container.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 25) {
          food.isAttached = true;
          food.attachedCell = cell;
          cell.attachedFood.push(food);
          break;
        }
      }
    }
  }

  private startCellSplit(cell: Cell): void {
    cell.isSplitting = true;
    cell.splitProgress = 0;
    cell.star.setAlpha(0);

    const splitAngle = Math.random() * Math.PI * 2;
    const splitDist = 30;
    cell.splitTargetX1 = cell.container.x + Math.cos(splitAngle) * splitDist;
    cell.splitTargetY1 = cell.container.y + Math.sin(splitAngle) * splitDist;
    cell.splitTargetX2 = cell.container.x - Math.cos(splitAngle) * splitDist;
    cell.splitTargetY2 = cell.container.y - Math.sin(splitAngle) * splitDist;
  }

  private completeCellSplit(index: number): void {
    const cell = this.cells[index];
    const x1 = cell.splitTargetX1;
    const y1 = cell.splitTargetY1;
    const x2 = cell.splitTargetX2;
    const y2 = cell.splitTargetY2;

    const newHue1 = Phaser.Math.Clamp(cell.baseHue + (Math.random() - 0.5) * 40, 30, 90);
    const newHue2 = Phaser.Math.Clamp(cell.baseHue + (Math.random() - 0.5) * 40, 30, 90);

    cell.container.destroy();
    this.cells.splice(index, 1);

    if (this.cells.length < 100) {
      const daughter1 = this.createSingleCell(x1, y1, newHue1);
      this.initDaughterCell(daughter1, cell);

      const daughter2 = this.createSingleCell(x2, y2, newHue2);
      this.initDaughterCell(daughter2, cell);
    }
  }

  private initDaughterCell(daughter: Cell, parent: Cell): void {
    daughter.sizeMultiplier = 0.6;
    daughter.currentWidth = daughter.baseWidth * 0.6;
    daughter.currentHeight = daughter.baseHeight * 0.6;
    daughter.body.setSize(daughter.currentWidth, daughter.currentHeight);
    daughter.brightness = parent.brightness;

    const color = Phaser.Display.Color.HSLToColor(
      daughter.baseHue / 360,
      0.6,
      daughter.brightness
    );
    daughter.body.setFillStyle(color.color, 0.9);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    this.dishRadius = width < 768 ? 200 : 300;
    this.dishCenterX = width / 2;
    this.dishCenterY = height / 2;
  }
}
