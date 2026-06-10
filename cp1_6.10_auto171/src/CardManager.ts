import type { MemoryCard, CollectedCard, Point } from './types';

const NOSTALGIC_PHRASES = [
  '放学后的小卖部',
  '梧桐树下的一局棋',
  '玻璃汽水的夏天',
  '磁带里的青春',
  '老街口的糖炒栗子',
  '寒假作业的最后一夜',
  '外婆的蒲扇与竹椅',
  '黑板报的粉笔灰',
  '自行车铃声的清晨',
  '折叠信纸的思念',
  '跳皮筋的欢声笑语',
  '黑白电视的雪花屏',
];

export class CardManager {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private scale: number = 1;
  private cards: MemoryCard[] = [];
  private collectedCards: CollectedCard[] = [];
  private cardIdCounter: number = 0;
  private lastCardDropTime: number = 0;
  private currentBurstCardCount: number = 0;
  private maxCardsPerBurst: number = 3;
  private activeModalCard: MemoryCard | null = null;
  private albumOffsetX: number = 0;
  private isDraggingAlbum: boolean = false;
  private albumDragStartX: number = 0;
  private albumOffsetStartX: number = 0;
  private showPostcardButton: boolean = false;

  constructor(ctx: CanvasRenderingContext2D) {}

  resize(width: number, height: number, scale: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.scale = scale;
  }

  resetBurstCounter(): void {
    this.currentBurstCardCount = 0;
    this.lastCardDropTime = 0;
  }

  tryDropCard(time: number, particles: any[], canvasScale: number): boolean {
    if (this.currentBurstCardCount >= this.maxCardsPerBurst) return false;
    if (particles.length < 3) return false;
    if (time - this.lastCardDropTime < 500) return false;
    if (this.cards.length >= 5) return false;

    this.lastCardDropTime = time;
    this.currentBurstCardCount++;

    const randomParticle = particles[Math.floor(Math.random() * particles.length)];
    const year = 1950 + Math.floor(Math.random() * 51);
    const phrase = NOSTALGIC_PHRASES[Math.floor(Math.random() * NOSTALGIC_PHRASES.length)];

    const cardWidth = 120 * canvasScale;
    const cardHeight = 80 * canvasScale;

    this.cards.push({
      id: this.cardIdCounter++,
      x: randomParticle ? randomParticle.x : this.canvasWidth / 2,
      y: randomParticle ? randomParticle.y : 0,
      targetX: this.canvasWidth * (0.2 + Math.random() * 0.6),
      vy: (1 + Math.random()) * canvasScale,
      year,
      phrase,
      width: cardWidth,
      height: cardHeight,
      fallProgress: 0,
      isCollected: false,
      collectProgress: 0,
      collectStartX: 0,
      collectStartY: 0,
      collectTargetX: 0,
      collectTargetY: 0,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.03 + Math.random() * 0.02,
    });

    return true;
  }

  update(deltaTime: number, time: number): void {
    const albumY = this.getAlbumAreaY();
    const albumTop = albumY - this.getAlbumHeight() / 2;

    this.cards = this.cards.filter((card) => {
      if (card.isCollected) {
        card.collectProgress += deltaTime / 600;
        if (card.collectProgress >= 1) {
          this.addToAlbum(card);
          return false;
        }
        return true;
      }

      card.fallProgress += deltaTime / 1000;
      card.swayOffset += card.swaySpeed;
      card.x += (card.targetX - card.x) * 0.01 + Math.sin(card.swayOffset) * 0.5;
      card.y += card.vy;

      if (card.y > this.canvasHeight + card.height) {
        return false;
      }

      return true;
    });

    this.showPostcardButton = this.collectedCards.length >= 5;
  }

  handleClick(x: number, y: number, time: number): boolean {
    if (this.activeModalCard) {
      const modalCloseX = this.canvasWidth / 2 + 110 * this.scale;
      const modalCloseY = this.canvasHeight / 2 - 90 * this.scale;
      const closeDist = Math.sqrt((x - modalCloseX) ** 2 + (y - modalCloseY) ** 2);
      if (closeDist < 20 * this.scale) {
        this.activeModalCard = null;
        return true;
      }

      const modalLeft = this.canvasWidth / 2 - 130 * this.scale;
      const modalRight = this.canvasWidth / 2 + 130 * this.scale;
      const modalTop = this.canvasHeight / 2 - 100 * this.scale;
      const modalBottom = this.canvasHeight / 2 + 100 * this.scale;
      if (x < modalLeft || x > modalRight || y < modalTop || y > modalBottom) {
        this.activeModalCard = null;
        return true;
      }
      return true;
    }

    if (this.showPostcardButton) {
      const btnX = this.canvasWidth / 2;
      const btnY = this.canvasHeight / 2 - 60 * this.scale;
      const btnW = 180 * this.scale;
      const btnH = 50 * this.scale;
      if (x >= btnX - btnW / 2 && x <= btnX + btnW / 2 && y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
        this.generatePostcard();
        return true;
      }
    }

    for (let i = this.cards.length - 1; i >= 0; i--) {
      const card = this.cards[i];
      if (card.isCollected) continue;

      const left = card.x - card.width / 2;
      const right = card.x + card.width / 2;
      const top = card.y - card.height / 2;
      const bottom = card.y + card.height / 2;

      if (x >= left && x <= right && y >= top && y <= bottom) {
        this.collectCard(card);
        return true;
      }
    }

    const albumY = this.getAlbumAreaY();
    const albumTop = albumY - this.getAlbumHeight() / 2;
    const albumBottom = albumY + this.getAlbumHeight() / 2;

    if (y >= albumTop && y <= albumBottom) {
      const thumbnailW = 60 * this.scale;
      const thumbnailH = 40 * this.scale;
      const startX = 30 * this.scale - this.albumOffsetX;

      for (let i = 0; i < this.collectedCards.length; i++) {
        const tx = startX + i * (thumbnailW + 12 * this.scale);
        const ty = albumY;
        if (x >= tx - thumbnailW / 2 && x <= tx + thumbnailW / 2 &&
            y >= ty - thumbnailH / 2 && y <= ty + thumbnailH / 2) {
          const cc = this.collectedCards[i];
          this.activeModalCard = {
            id: cc.id,
            x: this.canvasWidth / 2,
            y: this.canvasHeight / 2,
            targetX: this.canvasWidth / 2,
            vy: 0,
            year: cc.year,
            phrase: cc.phrase,
            width: 240 * this.scale,
            height: 160 * this.scale,
            fallProgress: 0,
            isCollected: false,
            collectProgress: 0,
            collectStartX: 0,
            collectStartY: 0,
            collectTargetX: 0,
            collectTargetY: 0,
            swayOffset: 0,
            swaySpeed: 0,
          };
          return true;
        }
      }
    }

    return false;
  }

  handleAlbumMouseDown(x: number, y: number): void {
    const albumY = this.getAlbumAreaY();
    const albumTop = albumY - this.getAlbumHeight() / 2;
    const albumBottom = albumY + this.getAlbumHeight() / 2;

    if (y >= albumTop && y <= albumBottom) {
      this.isDraggingAlbum = true;
      this.albumDragStartX = x;
      this.albumOffsetStartX = this.albumOffsetX;
    }
  }

  handleAlbumMouseMove(x: number): void {
    if (this.isDraggingAlbum) {
      const maxOffset = Math.max(0, this.collectedCards.length * (72 * this.scale) - this.canvasWidth + 60 * this.scale);
      this.albumOffsetX = Math.max(0, Math.min(maxOffset, this.albumOffsetStartX - (x - this.albumDragStartX)));
    }
  }

  handleAlbumMouseUp(): void {
    this.isDraggingAlbum = false;
  }

  private collectCard(card: MemoryCard): void {
    card.isCollected = true;
    card.collectStartX = card.x;
    card.collectStartY = card.y;
    card.collectTargetX = this.getAlbumThumbnailX(this.collectedCards.length);
    card.collectTargetY = this.getAlbumAreaY();
  }

  private addToAlbum(card: MemoryCard): void {
    this.collectedCards.push({
      id: card.id,
      year: card.year,
      phrase: card.phrase,
      thumbnailX: this.collectedCards.length,
    });
  }

  private getAlbumThumbnailX(index: number): number {
    const thumbnailW = 60 * this.scale;
    const startX = 30 * this.scale;
    return startX + index * (thumbnailW + 12 * this.scale) + thumbnailW / 2;
  }

  getAlbumAreaY(): number {
    return this.canvasHeight - 50 * this.scale;
  }

  getAlbumHeight(): number {
    return 100 * this.scale;
  }

  render(): void {
    const ctx = this.ctx;

    this.cards.forEach((card) => {
      ctx.save();

      if (card.isCollected) {
        const t = card.collectProgress;
        const easedT = 1 - Math.pow(1 - t, 3);
        const cx = card.collectStartX + (card.collectTargetX - card.collectStartX) * easedT;
        const cy = card.collectStartY + (card.collectTargetY - card.collectStartY) * easedT;
        const scaleFactor = 1 - easedT * 0.5;
        const opacity = 1 - easedT * 0.3;

        ctx.globalAlpha = opacity;
        ctx.translate(cx, cy);
        ctx.scale(scaleFactor, scaleFactor);
        this.drawCardBody(card, 1);
      } else {
        ctx.translate(card.x, card.y);
        this.drawCardBody(card, 1);
      }

      ctx.restore();
    });

    this.drawAlbumArea();

    if (this.showPostcardButton && !this.activeModalCard) {
      this.drawPostcardButton();
    }

    if (this.activeModalCard) {
      this.drawModal();
    }
  }

  private drawCardBody(card: MemoryCard, scaleFactor: number): void {
    const ctx = this.ctx;
    const w = card.width * scaleFactor;
    const h = card.height * scaleFactor;
    const r = 8 * this.scale * scaleFactor;

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10 * this.scale;
    ctx.shadowOffsetY = 4 * this.scale;

    ctx.fillStyle = 'rgba(255,255,230,0.95)';
    this.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.lineWidth = 2 * this.scale * scaleFactor;
    ctx.strokeStyle = '#d4a017';
    this.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.stroke();

    ctx.fillStyle = '#8b6914';
    ctx.font = `bold ${14 * this.scale * scaleFactor}px "Georgia", serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(card.year), -w / 2 + 10 * this.scale * scaleFactor, -h / 2 + 8 * this.scale * scaleFactor);

    ctx.fillStyle = '#3d2914';
    ctx.font = `${11 * this.scale * scaleFactor}px "KaiTi", "楷体", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxChars = Math.floor(w / (14 * this.scale * scaleFactor));
    let displayPhrase = card.phrase;
    if (displayPhrase.length > maxChars) {
      displayPhrase = displayPhrase.slice(0, maxChars - 1) + '…';
    }
    ctx.fillText(displayPhrase, 0, 4 * this.scale * scaleFactor);
  }

  private drawAlbumArea(): void {
    const ctx = this.ctx;
    const albumY = this.getAlbumAreaY();
    const albumH = this.getAlbumHeight();
    const r = 8 * this.scale;

    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12 * this.scale;
    ctx.shadowOffsetY = -4 * this.scale;

    const albumGrad = ctx.createLinearGradient(0, albumY - albumH / 2, 0, albumY + albumH / 2);
    albumGrad.addColorStop(0, '#3d4450');
    albumGrad.addColorStop(0.5, '#2f3640');
    albumGrad.addColorStop(1, '#1f2428');

    ctx.fillStyle = albumGrad;
    this.roundRect(10 * this.scale, albumY - albumH / 2, this.canvasWidth - 20 * this.scale, albumH, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.save();
    ctx.beginPath();
    this.roundRect(10 * this.scale, albumY - albumH / 2, this.canvasWidth - 20 * this.scale, albumH, r);
    ctx.clip();

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2 * this.scale;
    ctx.strokeRect(12 * this.scale, albumY - albumH / 2 + 4 * this.scale, this.canvasWidth - 24 * this.scale, albumH - 8 * this.scale);
    ctx.restore();

    const thumbnailW = 60 * this.scale;
    const thumbnailH = 40 * this.scale;
    const startX = 30 * this.scale - this.albumOffsetX;

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${12 * this.scale}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (this.collectedCards.length === 0) {
      ctx.fillText('← 点击飘落的卡片进行收藏 →', 30 * this.scale, albumY);
    }

    this.collectedCards.forEach((cc, i) => {
      const tx = startX + i * (thumbnailW + 12 * this.scale);
      const ty = albumY;

      ctx.save();
      ctx.translate(tx, ty);

      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6 * this.scale;
      ctx.shadowOffsetY = 2 * this.scale;

      ctx.fillStyle = 'rgba(255,255,230,0.95)';
      this.roundRect(-thumbnailW / 2, -thumbnailH / 2, thumbnailW, thumbnailH, 4 * this.scale);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1.5 * this.scale;
      ctx.strokeStyle = '#d4a017';
      this.roundRect(-thumbnailW / 2, -thumbnailH / 2, thumbnailW, thumbnailH, 4 * this.scale);
      ctx.stroke();

      ctx.fillStyle = '#8b6914';
      ctx.font = `bold ${8 * this.scale}px "Georgia", serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(cc.year), -thumbnailW / 2 + 4 * this.scale, -thumbnailH / 2 + 4 * this.scale);

      ctx.fillStyle = '#3d2914';
      ctx.font = `${7 * this.scale}px "KaiTi", "楷体", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cc.phrase.slice(0, 4), 0, 2 * this.scale);

      ctx.restore();
    });

    const maxOffset = Math.max(0, this.collectedCards.length * (72 * this.scale) - this.canvasWidth + 60 * this.scale);
    if (this.albumOffsetX > 0) {
      ctx.fillStyle = 'rgba(212,160,23,0.8)';
      ctx.beginPath();
      ctx.moveTo(18 * this.scale, albumY);
      ctx.lineTo(30 * this.scale, albumY - 8 * this.scale);
      ctx.lineTo(30 * this.scale, albumY + 8 * this.scale);
      ctx.closePath();
      ctx.fill();
    }
    if (this.albumOffsetX < maxOffset) {
      ctx.fillStyle = 'rgba(212,160,23,0.8)';
      ctx.beginPath();
      ctx.moveTo(this.canvasWidth - 18 * this.scale, albumY);
      ctx.lineTo(this.canvasWidth - 30 * this.scale, albumY - 8 * this.scale);
      ctx.lineTo(this.canvasWidth - 30 * this.scale, albumY + 8 * this.scale);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPostcardButton(): void {
    const ctx = this.ctx;
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2 - 60 * this.scale;
    const w = 180 * this.scale;
    const h = 50 * this.scale;
    const r = 25 * this.scale;

    ctx.save();

    const pulse = 1 + 0.05 * Math.sin(Date.now() / 300);
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    ctx.shadowColor = 'rgba(212,160,23,0.6)';
    ctx.shadowBlur = 20 * this.scale;

    const btnGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    btnGrad.addColorStop(0, '#f5deb3');
    btnGrad.addColorStop(0.5, '#d4a017');
    btnGrad.addColorStop(1, '#b8860b');

    ctx.fillStyle = btnGrad;
    this.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.lineWidth = 2 * this.scale;
    ctx.strokeStyle = '#8b6914';
    this.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.stroke();

    ctx.fillStyle = '#3d2914';
    ctx.font = `bold ${18 * this.scale}px "KaiTi", "楷体", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ 合成明信片 ✦', 0, 0);

    ctx.restore();
  }

  private drawModal(): void {
    const ctx = this.ctx;
    const card = this.activeModalCard!;

    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);

    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 30 * this.scale;

    const w = 260 * this.scale;
    const h = 180 * this.scale;
    const r = 12 * this.scale;

    ctx.fillStyle = 'rgba(255,255,230,1)';
    this.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.lineWidth = 3 * this.scale;
    ctx.strokeStyle = '#d4a017';
    this.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.stroke();

    ctx.fillStyle = '#8b6914';
    ctx.font = `bold ${32 * this.scale}px "Georgia", serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(card.year), -w / 2 + 20 * this.scale, -h / 2 + 18 * this.scale);

    ctx.fillStyle = '#3d2914';
    ctx.font = `${22 * this.scale}px "KaiTi", "楷体", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.phrase, 0, 10 * this.scale);

    ctx.fillStyle = '#d4a017';
    ctx.font = `${12 * this.scale}px "KaiTi", "楷体", serif`;
    ctx.fillText('─── 拾光碎片 ───', 0, h / 2 - 24 * this.scale);

    const closeX = w / 2 - 5 * this.scale;
    const closeY = -h / 2 + 5 * this.scale;
    ctx.beginPath();
    ctx.arc(closeX, closeY, 18 * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = '#c0392b';
    ctx.fill();
    ctx.strokeStyle = '#922b21';
    ctx.lineWidth = 2 * this.scale;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * this.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(closeX - 6 * this.scale, closeY - 6 * this.scale);
    ctx.lineTo(closeX + 6 * this.scale, closeY + 6 * this.scale);
    ctx.moveTo(closeX + 6 * this.scale, closeY - 6 * this.scale);
    ctx.lineTo(closeX - 6 * this.scale, closeY + 6 * this.scale);
    ctx.stroke();

    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private generatePostcard(): void {
    const postcardCanvas = document.createElement('canvas');
    const pw = 800;
    const ph = 600;
    postcardCanvas.width = pw;
    postcardCanvas.height = ph;
    const pctx = postcardCanvas.getContext('2d')!;

    const bgGrad = pctx.createRadialGradient(pw / 2, ph / 2, 50, pw / 2, ph / 2, 500);
    bgGrad.addColorStop(0, '#2c3e50');
    bgGrad.addColorStop(1, '#1a1a2e');
    pctx.fillStyle = bgGrad;
    pctx.fillRect(0, 0, pw, ph);

    const cardW = 160;
    const cardH = 100;
    const startX = pw / 2 - (cardW * 2.5 + 40);
    const startY = ph / 2 - 40;

    this.collectedCards.slice(0, 5).forEach((cc, i) => {
      const cx = startX + i * (cardW + 20);
      const cy = startY + (i % 2) * 20 - 10;

      pctx.save();
      pctx.translate(cx + cardW / 2, cy + cardH / 2);
      pctx.rotate((Math.random() - 0.5) * 0.1);

      pctx.shadowColor = 'rgba(0,0,0,0.4)';
      pctx.shadowBlur = 15;
      pctx.shadowOffsetY = 6;

      pctx.fillStyle = 'rgba(255,255,230,0.95)';
      this.pctxRoundRect(pctx, -cardW / 2, -cardH / 2, cardW, cardH, 8);
      pctx.fill();

      pctx.shadowColor = 'transparent';
      pctx.lineWidth = 3;
      pctx.strokeStyle = '#d4a017';
      this.pctxRoundRect(pctx, -cardW / 2, -cardH / 2, cardW, cardH, 8);
      pctx.stroke();

      pctx.fillStyle = '#8b6914';
      pctx.font = 'bold 22px Georgia, serif';
      pctx.textAlign = 'left';
      pctx.textBaseline = 'top';
      pctx.fillText(String(cc.year), -cardW / 2 + 12, -cardH / 2 + 10);

      pctx.fillStyle = '#3d2914';
      pctx.font = '16px KaiTi, 楷体, serif';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText(cc.phrase, 0, 5);

      pctx.restore();
    });

    pctx.fillStyle = '#d4a017';
    pctx.font = 'bold 36px KaiTi, 楷体, serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'top';
    pctx.fillText('✦ 拾 光 碎 片 ✦', pw / 2, 60);

    pctx.fillStyle = 'rgba(255,255,255,0.6)';
    pctx.font = '16px KaiTi, 楷体, serif';
    pctx.fillText('—— 专属于你的时光明信片 ——', pw / 2, 110);

    pctx.fillStyle = 'rgba(245,222,179,0.8)';
    pctx.font = '14px Georgia, serif';
    pctx.textAlign = 'right';
    pctx.textBaseline = 'bottom';
    pctx.fillText(new Date().toLocaleDateString('zh-CN'), pw - 40, ph - 30);

    const link = document.createElement('a');
    link.download = '拾光碎片_明信片.png';
    link.href = postcardCanvas.toDataURL('image/png');
    link.click();
  }

  private pctxRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  getCollectedCount(): number {
    return this.collectedCards.length;
  }

  getActiveCards(): MemoryCard[] {
    return this.cards.slice();
  }
}
