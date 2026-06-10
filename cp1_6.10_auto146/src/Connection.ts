import { Card } from './Card';

export interface ConnectionInfo {
  fromId: string;
  toId: string;
}

export class ConnectionManager {
  private svg: SVGSVGElement;
  private cards: Map<string, Card> = new Map();
  private connections: Map<string, SVGPathElement> = new Map();
  private isDashed: boolean = false;
  private rafId: number | null = null;
  private pendingUpdate: boolean = false;

  static readonly DISTANCE_THRESHOLD = 120;
  static readonly LINE_COLOR = '#3498db';
  static readonly LINE_WIDTH = 2;
  static readonly HOVER_COLOR = '#e74c3c';
  static readonly HOVER_WIDTH = 4;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
  }

  public setDashed(dashed: boolean): void {
    this.isDashed = dashed;
    this.updateAllLineStyles();
  }

  public addCard(card: Card): void {
    this.cards.set(card.id, card);
  }

  public removeCard(cardId: string): void {
    this.cards.delete(cardId);
    this.removeConnectionsForCard(cardId);
  }

  public getCard(cardId: string): Card | undefined {
    return this.cards.get(cardId);
  }

  public getAllCards(): Card[] {
    return Array.from(this.cards.values());
  }

  private removeConnectionsForCard(cardId: string): void {
    const toRemove: string[] = [];
    for (const [key] of this.connections) {
      const [fromId, toId] = key.split('|');
      if (fromId === cardId || toId === cardId) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      const path = this.connections.get(key);
      if (path) {
        path.remove();
      }
      this.connections.delete(key);
    }
  }

  private getConnectionKey(fromId: string, toId: string): string {
    return fromId < toId ? `${fromId}|${toId}` : `${toId}|${fromId}`;
  }

  public updateConnections(): void {
    if (this.pendingUpdate) return;
    this.pendingUpdate = true;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.computeConnections();
      this.pendingUpdate = false;
      this.rafId = null;
    });
  }

  private computeConnections(): void {
    const cards = this.getAllCards();
    const existingKeys = new Set(this.connections.keys());
    const newKeys = new Set<string>();

    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const cardA = cards[i];
        const cardB = cards[j];
        const dist = this.getDistance(cardA, cardB);

        if (dist <= ConnectionManager.DISTANCE_THRESHOLD) {
          const key = this.getConnectionKey(cardA.id, cardB.id);
          newKeys.add(key);

          if (!existingKeys.has(key)) {
            this.createConnection(cardA, cardB);
          } else {
            this.updateConnectionPath(cardA, cardB);
          }
        }
      }
    }

    for (const key of existingKeys) {
      if (!newKeys.has(key)) {
        const path = this.connections.get(key);
        if (path) {
          path.remove();
        }
        this.connections.delete(key);
      }
    }
  }

  private getDistance(cardA: Card, cardB: Card): number {
    const centerA = cardA.getCenter();
    const centerB = cardB.getCenter();
    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createConnection(cardA: Card, cardB: Card): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('connection-line');

    this.applyLineStyle(path);
    this.updatePathData(path, cardA, cardB);

    path.addEventListener('mouseenter', () => {
      path.setAttribute('stroke', ConnectionManager.HOVER_COLOR);
      path.setAttribute('stroke-width', String(ConnectionManager.HOVER_WIDTH));
    });

    path.addEventListener('mouseleave', () => {
      path.setAttribute('stroke', ConnectionManager.LINE_COLOR);
      path.setAttribute('stroke-width', String(ConnectionManager.LINE_WIDTH));
    });

    this.svg.appendChild(path);

    const key = this.getConnectionKey(cardA.id, cardB.id);
    this.connections.set(key, path);
  }

  private updateConnectionPath(cardA: Card, cardB: Card): void {
    const key = this.getConnectionKey(cardA.id, cardB.id);
    const path = this.connections.get(key);
    if (path) {
      this.updatePathData(path, cardA, cardB);
    }
  }

  private updatePathData(path: SVGPathElement, cardA: Card, cardB: Card): void {
    const centerA = cardA.getCenter();
    const centerB = cardB.getCenter();

    const midX = (centerA.x + centerB.x) / 2;
    const midY = (centerA.y + centerB.y) / 2;

    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const curveOffset = distance * 0.15;
    const perpX = -dy / (distance || 1) * curveOffset;
    const perpY = dx / (distance || 1) * curveOffset;

    const cpX = midX + perpX;
    const cpY = midY + perpY;

    const d = `M ${centerA.x} ${centerA.y} Q ${cpX} ${cpY} ${centerB.x} ${centerB.y}`;
    path.setAttribute('d', d);
  }

  private applyLineStyle(path: SVGPathElement): void {
    path.setAttribute('stroke', ConnectionManager.LINE_COLOR);
    path.setAttribute('stroke-width', String(ConnectionManager.LINE_WIDTH));
    path.setAttribute('fill', 'none');
    if (this.isDashed) {
      path.setAttribute('stroke-dasharray', '5,5');
    } else {
      path.removeAttribute('stroke-dasharray');
    }
  }

  private updateAllLineStyles(): void {
    for (const path of this.connections.values()) {
      this.applyLineStyle(path);
    }
  }

  public getConnectionInfos(): ConnectionInfo[] {
    const infos: ConnectionInfo[] = [];
    for (const key of this.connections.keys()) {
      const [fromId, toId] = key.split('|');
      infos.push({ fromId, toId });
    }
    return infos;
  }

  public clearAll(): void {
    for (const path of this.connections.values()) {
      path.remove();
    }
    this.connections.clear();
    this.cards.clear();
  }
}
