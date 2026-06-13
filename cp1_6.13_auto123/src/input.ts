import { Vector2, UpgradeType } from './entities';

type ClickCallback = (pos: Vector2) => void;
type DragCallback = (pos: Vector2) => void;
type DragEndCallback = (points: Vector2[]) => void;
type SimpleCallback = () => void;
type UpgradeCallback = (type: UpgradeType) => void;

export class InputManager {
  private canvas: HTMLCanvasElement;
  private mousePosition: Vector2 = { x: 0, y: 0 };
  private isMouseDown: boolean = false;
  private draggedPoints: Vector2[] = [];
  private isDragging: boolean = false;
  private dragThreshold: number = 5;
  
  private clickCallbacks: ClickCallback[] = [];
  private dragStartCallbacks: DragCallback[] = [];
  private dragMoveCallbacks: DragCallback[] = [];
  private dragEndCallbacks: DragEndCallback[] = [];
  private pulseButtonCallbacks: SimpleCallback[] = [];
  private upgradeSelectCallbacks: UpgradeCallback[] = [];
  private restartCallbacks: SimpleCallback[] = [];
  
  private pulseButtonRect: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 50, height: 50 };
  private upgradePanelRect: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 400, height: 150 };
  private gameOverPanelRect: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 500, height: 400 };
  private restartButtonRect: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 150, height: 50 };
  
  private scaleX: number = 1;
  private scaleY: number = 1;
  private baseWidth: number = 1920;
  private baseHeight: number = 1080;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
    this.updateScaling();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('resize', this.updateScaling.bind(this));
  }

  private updateScaling(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.scaleX = this.canvas.width / rect.width;
    this.scaleY = this.canvas.height / rect.height;
  }

  private getGameCoordinates(clientX: number, clientY: number): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * this.scaleX,
      y: (clientY - rect.top) * this.scaleY
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mousePosition = this.getGameCoordinates(e.clientX, e.clientY);
    
    if (this.isMouseDown && this.isDragging) {
      this.draggedPoints.push({ ...this.mousePosition });
      this.dragMoveCallbacks.forEach(cb => cb(this.mousePosition));
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    
    this.isMouseDown = true;
    const pos = this.getGameCoordinates(e.clientX, e.clientY);
    this.draggedPoints = [{ ...pos }];
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    
    const pos = this.getGameCoordinates(e.clientX, e.clientY);
    
    if (this.isDragging) {
      this.dragEndCallbacks.forEach(cb => cb(this.draggedPoints));
    }
    
    this.isMouseDown = false;
    this.isDragging = false;
    this.draggedPoints = [];
  }

  private handleMouseLeave(): void {
    if (this.isDragging) {
      this.dragEndCallbacks.forEach(cb => cb(this.draggedPoints));
    }
    this.isMouseDown = false;
    this.isDragging = false;
    this.draggedPoints = [];
  }

  private handleClick(e: MouseEvent): void {
    const pos = this.getGameCoordinates(e.clientX, e.clientY);
    
    if (this.isPointInRect(pos, this.pulseButtonRect)) {
      this.pulseButtonCallbacks.forEach(cb => cb());
      return;
    }
    
    if (this.isPointInRect(pos, this.upgradePanelRect)) {
      const upgradeType = this.getUpgradeTypeFromClick(pos);
      if (upgradeType) {
        this.upgradeSelectCallbacks.forEach(cb => cb(upgradeType));
        return;
      }
    }
    
    if (this.isPointInRect(pos, this.restartButtonRect)) {
      this.restartCallbacks.forEach(cb => cb());
      return;
    }
    
    this.clickCallbacks.forEach(cb => cb(pos));
  }

  startDrag(): void {
    this.isDragging = true;
    if (this.draggedPoints.length > 0) {
      this.dragStartCallbacks.forEach(cb => cb(this.draggedPoints[0]));
    }
  }

  private isPointInRect(point: Vector2, rect: { x: number; y: number; width: number; height: number }): boolean {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  private getUpgradeTypeFromClick(pos: Vector2): UpgradeType | null {
    const panelCenterX = this.upgradePanelRect.x + this.upgradePanelRect.width / 2;
    const optionWidth = this.upgradePanelRect.width / 2 - 20;
    
    if (pos.x < panelCenterX - 10) {
      return UpgradeType.SHIELD;
    } else if (pos.x > panelCenterX + 10) {
      return UpgradeType.ENGINE;
    }
    return null;
  }

  getMousePosition(): Vector2 {
    return { ...this.mousePosition };
  }

  getIsMouseDown(): boolean {
    return this.isMouseDown;
  }

  getDraggedPoints(): Vector2[] {
    return [...this.draggedPoints];
  }

  setPulseButtonRect(x: number, y: number, width: number, height: number): void {
    this.pulseButtonRect = { x, y, width, height };
  }

  setUpgradePanelRect(x: number, y: number, width: number, height: number): void {
    this.upgradePanelRect = { x, y, width, height };
  }

  setRestartButtonRect(x: number, y: number, width: number, height: number): void {
    this.restartButtonRect = { x, y, width, height };
  }

  setGameOverPanelRect(x: number, y: number, width: number, height: number): void {
    this.gameOverPanelRect = { x, y, width, height };
  }

  onClick(callback: ClickCallback): void {
    this.clickCallbacks.push(callback);
  }

  onDragStart(callback: DragCallback): void {
    this.dragStartCallbacks.push(callback);
  }

  onDragMove(callback: DragCallback): void {
    this.dragMoveCallbacks.push(callback);
  }

  onDragEnd(callback: DragEndCallback): void {
    this.dragEndCallbacks.push(callback);
  }

  onPulseButtonClick(callback: SimpleCallback): void {
    this.pulseButtonCallbacks.push(callback);
  }

  onUpgradeSelect(callback: UpgradeCallback): void {
    this.upgradeSelectCallbacks.push(callback);
  }

  onRestart(callback: SimpleCallback): void {
    this.restartCallbacks.push(callback);
  }

  setBaseResolution(width: number, height: number): void {
    this.baseWidth = width;
    this.baseHeight = height;
    this.updateScaling();
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    window.removeEventListener('resize', this.updateScaling.bind(this));
  }
}
