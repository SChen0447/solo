import { Card } from './Card';
import { ConnectionManager } from './Connection';
import { Storage, CardData } from './Storage';

class MindMapApp {
  private canvasContainer: HTMLElement;
  private canvas: HTMLElement;
  private connectionsSvg: SVGSVGElement;
  private connectionManager: ConnectionManager;
  private cards: Map<string, Card> = new Map();
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isSpacePressed: boolean = false;
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panOffsetStartX: number = 0;
  private panOffsetStartY: number = 0;

  private static readonly MIN_SCALE = 0.5;
  private static readonly MAX_SCALE = 3;

  constructor() {
    this.canvasContainer = document.getElementById('canvasContainer') as HTMLElement;
    this.canvas = document.getElementById('canvas') as HTMLElement;
    this.connectionsSvg = document.getElementById('connectionsSvg') as unknown as SVGSVGElement;
    this.connectionManager = new ConnectionManager(this.connectionsSvg);

    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.loadStateOrInit();
  }

  private setupEventListeners(): void {
    const addCardBtn = document.getElementById('addCardBtn') as HTMLButtonElement;
    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    const dashedToggle = document.getElementById('dashedToggle') as HTMLInputElement;
    const confirmModal = document.getElementById('confirmModal') as HTMLElement;
    const confirmOk = document.getElementById('confirmOk') as HTMLButtonElement;
    const confirmCancel = document.getElementById('confirmCancel') as HTMLButtonElement;

    addCardBtn.addEventListener('click', () => this.addCardAtCenter());
    saveBtn.addEventListener('click', () => this.saveState());
    clearBtn.addEventListener('click', () => this.showConfirmModal());
    dashedToggle.addEventListener('change', (e) => {
      this.connectionManager.setDashed((e.target as HTMLInputElement).checked);
    });

    confirmCancel.addEventListener('click', () => this.hideConfirmModal());
    confirmOk.addEventListener('click', () => {
      this.hideConfirmModal();
      this.clearAll();
    });

    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        this.hideConfirmModal();
      }
    });

    this.canvasContainer.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvasContainer.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    this.canvasContainer.addEventListener('click', (e) => this.onCanvasClick(e));

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));

    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
  }

  private loadStateOrInit(): void {
    if (Storage.hasData()) {
      const data = Storage.load();
      if (data && data.cards.length > 0) {
        this.restoreState(data.cards);
        return;
      }
    }
    this.createInitialCard();
  }

  private createInitialCard(): void {
    const containerRect = this.canvasContainer.getBoundingClientRect();
    const centerX = (containerRect.width / 2 - Card.CARD_WIDTH / 2) / this.scale;
    const centerY = (containerRect.height / 2 - Card.CARD_MIN_HEIGHT / 2) / this.scale;

    this.addCard(centerX, centerY, '中心思想');
  }

  private addCard(x: number, y: number, content: string = '', id?: string): Card {
    const card = new Card({ id, x, y, content });
    this.canvas.appendChild(card.element);
    this.cards.set(card.id, card);
    this.connectionManager.addCard(card);

    card.onDragEnd(() => {
      this.connectionManager.updateConnections();
    });

    card.onDelete((deletedCard) => {
      this.cards.delete(deletedCard.id);
      this.connectionManager.removeCard(deletedCard.id);
      this.connectionManager.updateConnections();
    });

    card.onCopy((sourceCard) => {
      this.addCard(sourceCard.x + 30, sourceCard.y + 30, sourceCard.getContent());
      this.connectionManager.updateConnections();
    });

    card.onContentChange(() => {
      this.connectionManager.updateConnections();
    });

    this.connectionManager.updateConnections();
    return card;
  }

  private addCardAtCenter(): void {
    const containerRect = this.canvasContainer.getBoundingClientRect();
    const centerX = (containerRect.width / 2 - Card.CARD_WIDTH / 2 - this.offsetX) / this.scale;
    const centerY = (containerRect.height / 2 - Card.CARD_MIN_HEIGHT / 2 - this.offsetY) / this.scale;

    this.addCard(centerX, centerY);
  }

  private restoreState(cardDataList: CardData[]): void {
    for (const cardData of cardDataList) {
      this.addCard(cardData.x, cardData.y, cardData.content, cardData.id);
    }
  }

  private saveState(): void {
    const cardDataList: CardData[] = [];
    for (const card of this.cards.values()) {
      cardDataList.push({
        id: card.id,
        x: card.x,
        y: card.y,
        content: card.getContent()
      });
    }

    const connectionInfos = this.connectionManager.getConnectionInfos();

    Storage.save({
      cards: cardDataList,
      connections: connectionInfos
    });

    this.showToast('已保存');
  }

  private clearAll(): void {
    for (const card of this.cards.values()) {
      card.element.remove();
    }
    this.cards.clear();
    this.connectionManager.clearAll();
    Storage.clear();
  }

  private showConfirmModal(): void {
    const modal = document.getElementById('confirmModal') as HTMLElement;
    modal.classList.remove('hidden');
  }

  private hideConfirmModal(): void {
    const modal = document.getElementById('confirmModal') as HTMLElement;
    modal.classList.add('hidden');
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MindMapApp.MIN_SCALE, Math.min(MindMapApp.MAX_SCALE, this.scale * delta));

    if (newScale === this.scale) return;

    const rect = this.canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
    this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
    this.scale = newScale;

    this.updateTransform();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !this.isSpacePressed) {
      this.isSpacePressed = true;
      this.canvasContainer.style.cursor = 'grab';
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
      if (!this.isPanning) {
        this.canvasContainer.style.cursor = 'default';
      }
    }
  }

  private onCanvasMouseDown(e: MouseEvent): void {
    if (!this.isSpacePressed) return;
    if ((e.target as HTMLElement).closest('.card')) return;

    e.preventDefault();
    this.isPanning = true;
    this.canvasContainer.classList.add('panning');
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.panOffsetStartX = this.offsetX;
    this.panOffsetStartY = this.offsetY;
  }

  private onCanvasClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.card')) return;
    if ((e.target as HTMLElement).closest('.connection-line')) return;

    this.deselectAllCards();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isPanning) return;

    const dx = e.clientX - this.panStartX;
    const dy = e.clientY - this.panStartY;
    this.offsetX = this.panOffsetStartX + dx;
    this.offsetY = this.panOffsetStartY + dy;

    this.updateTransform();
  }

  private onMouseUp(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvasContainer.classList.remove('panning');
      if (!this.isSpacePressed) {
        this.canvasContainer.style.cursor = 'default';
      }
    }
  }

  private deselectAllCards(): void {
    for (const card of this.cards.values()) {
      card.setSelected(false);
    }
  }

  private updateTransform(): void {
    const transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
    this.canvas.style.transform = transform;
    this.connectionsSvg.style.transform = transform;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MindMapApp();
});
