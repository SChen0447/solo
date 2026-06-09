import { gsap } from 'gsap';
import { EmotionType } from './clayCharacter';

interface EmotionInfo {
  type: Exclude<EmotionType, 'neutral'>;
  emoji: string;
  label: string;
}

const EMOTIONS: EmotionInfo[] = [
  { type: 'happy', emoji: '😊', label: '开心' },
  { type: 'sad', emoji: '😢', label: '悲伤' },
  { type: 'surprised', emoji: '😮', label: '惊讶' },
  { type: 'angry', emoji: '😠', label: '愤怒' },
  { type: 'fearful', emoji: '😨', label: '恐惧' },
  { type: 'disgusted', emoji: '🤢', label: '厌恶' }
];

export class EmotionWheel {
  private container: HTMLElement;
  private wheelElement: HTMLDivElement;
  private sectorElements: Map<Exclude<EmotionType, 'neutral'>, HTMLDivElement> = new Map();
  private currentRotation: number = 0;
  private onEmotionSelect: (emotion: EmotionType) => void;
  private isAnimating: boolean = false;

  constructor(
    containerId: string,
    onEmotionSelect: (emotion: EmotionType) => void
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.onEmotionSelect = onEmotionSelect;
    this.wheelElement = this.createWheel();
    this.container.appendChild(this.wheelElement);
    this.setupResponsive();
  }

  private createWheel(): HTMLDivElement {
    const wheel = document.createElement('div');
    wheel.style.position = 'relative';
    wheel.style.width = '120px';
    wheel.style.height = '120px';
    wheel.style.borderRadius = '50%';
    wheel.style.backgroundColor = 'rgba(221, 221, 221, 0.7)';
    wheel.style.border = '2px dashed #888';
    wheel.style.overflow = 'hidden';
    wheel.style.cursor = 'pointer';
    wheel.style.transition = 'box-shadow 0.3s ease';
    wheel.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    wheel.title = '点击选择表情';

    wheel.addEventListener('mouseenter', () => {
      wheel.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    });

    wheel.addEventListener('mouseleave', () => {
      wheel.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    });

    const sectorAngle = 360 / EMOTIONS.length;

    EMOTIONS.forEach((emotion, index) => {
      const sector = this.createSector(emotion, index, sectorAngle);
      wheel.appendChild(sector);
      this.sectorElements.set(emotion.type, sector);
    });

    const centerCircle = document.createElement('div');
    centerCircle.style.position = 'absolute';
    centerCircle.style.top = '50%';
    centerCircle.style.left = '50%';
    centerCircle.style.transform = 'translate(-50%, -50%)';
    centerCircle.style.width = '28px';
    centerCircle.style.height = '28px';
    centerCircle.style.borderRadius = '50%';
    centerCircle.style.backgroundColor = '#f4c28a';
    centerCircle.style.border = '2px solid #3a2a1a';
    centerCircle.style.zIndex = '10';
    centerCircle.style.pointerEvents = 'none';
    centerCircle.style.display = 'flex';
    centerCircle.style.alignItems = 'center';
    centerCircle.style.justifyContent = 'center';
    centerCircle.style.fontSize = '14px';
    centerCircle.textContent = '🎭';
    wheel.appendChild(centerCircle);

    return wheel;
  }

  private createSector(emotion: EmotionInfo, index: number, sectorAngle: number): HTMLDivElement {
    const sector = document.createElement('div');
    const startAngle = index * sectorAngle - 90;
    const endAngle = startAngle + sectorAngle;

    sector.style.position = 'absolute';
    sector.style.top = '0';
    sector.style.left = '0';
    sector.style.width = '100%';
    sector.style.height = '100%';
    sector.style.clipPath = this.createSectorClipPath(startAngle, endAngle);
    sector.style.backgroundColor = this.getSectorColor(index);
    sector.style.transition = 'transform 0.25s ease, background-color 0.25s ease';
    sector.style.transformOrigin = 'center center';
    sector.style.cursor = 'pointer';
    sector.dataset.emotion = emotion.type;
    sector.dataset.index = String(index);

    const emojiContainer = document.createElement('div');
    emojiContainer.style.position = 'absolute';
    emojiContainer.style.top = '50%';
    emojiContainer.style.left = '50%';
    emojiContainer.style.fontSize = '24px';
    emojiContainer.style.pointerEvents = 'none';
    emojiContainer.style.userSelect = 'none';
    emojiContainer.style.lineHeight = '1';

    const midAngle = (startAngle + endAngle) / 2;
    const radius = 36;
    const rad = (midAngle * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    emojiContainer.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    emojiContainer.textContent = emotion.emoji;
    emojiContainer.title = emotion.label;

    sector.appendChild(emojiContainer);

    sector.addEventListener('mouseenter', () => {
      if (!this.isAnimating) {
        sector.style.transform = 'scale(1.25)';
        sector.style.backgroundColor = '#ffeeba';
      }
    });

    sector.addEventListener('mouseleave', () => {
      if (!sector.classList.contains('active')) {
        sector.style.transform = 'scale(1)';
        sector.style.backgroundColor = this.getSectorColor(index);
      }
    });

    sector.addEventListener('mousedown', () => {
      sector.style.transform = 'scale(0.95)';
    });

    sector.addEventListener('mouseup', () => {
      if (sector.classList.contains('active')) {
        sector.style.transform = 'scale(1.1)';
      } else {
        sector.style.transform = 'scale(1.25)';
      }
    });

    sector.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleSectorClick(emotion.type, index);
    });

    return sector;
  }

  private createSectorClipPath(startAngle: number, endAngle: number): string {
    const cx = 50;
    const cy = 50;
    const r = 50;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `path('M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z')`;
  }

  private getSectorColor(index: number): string {
    const colors = [
      'rgba(255, 215, 0, 0.4)',
      'rgba(135, 206, 250, 0.4)',
      'rgba(255, 182, 193, 0.4)',
      'rgba(255, 99, 71, 0.4)',
      'rgba(147, 112, 219, 0.4)',
      'rgba(144, 238, 144, 0.4)'
    ];
    return colors[index % colors.length];
  }

  private handleSectorClick(emotionType: Exclude<EmotionType, 'neutral'>, index: number): void {
    if (this.isAnimating) return;

    this.sectorElements.forEach((el) => {
      el.classList.remove('active');
      const elIndex = parseInt(el.dataset.index || '0');
      el.style.backgroundColor = this.getSectorColor(elIndex);
      el.style.transform = 'scale(1)';
      el.style.border = 'none';
    });

    const sector = this.sectorElements.get(emotionType);
    if (sector) {
      sector.classList.add('active');
      sector.style.backgroundColor = '#ffeeba';
      sector.style.transform = 'scale(1.1)';
    }

    this.rotateToIndex(index);
    this.onEmotionSelect(emotionType);
  }

  private rotateToIndex(index: number): void {
    const sectorAngle = 360 / EMOTIONS.length;
    const targetRotation = -index * sectorAngle;

    const currentMod = ((this.currentRotation % 360) + 360) % 360;
    const targetMod = ((targetRotation % 360) + 360) % 360;

    let diff = targetMod - currentMod;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    this.isAnimating = true;

    gsap.to(this, {
      currentRotation: this.currentRotation + diff,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => {
        this.wheelElement.style.transform = `rotate(${this.currentRotation}deg)`;
        this.sectorElements.forEach((el) => {
          const emoji = el.querySelector('div');
          if (emoji) {
            emoji.style.transform = `translate(-50%, -50%) rotate(${-this.currentRotation}deg)`;
            const idx = parseInt(el.dataset.index || '0');
            const midAngle = idx * sectorAngle;
            const rad = ((midAngle - 90) * Math.PI) / 180;
            const radius = 36;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            emoji.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${-this.currentRotation}deg)`;
          }
        });
      },
      onComplete: () => {
        this.isAnimating = false;
      }
    });
  }

  public highlightEmotion(emotionType: Exclude<EmotionType, 'neutral'> | null): void {
    this.sectorElements.forEach((el, type) => {
      if (type === emotionType) {
        el.style.border = '2px solid #ffd700';
        el.classList.add('active');
        const idx = parseInt(el.dataset.index || '0');
        el.style.backgroundColor = '#ffeeba';
      } else {
        el.style.border = 'none';
        el.classList.remove('active');
        const idx = parseInt(el.dataset.index || '0');
        el.style.backgroundColor = this.getSectorColor(idx);
      }
    });

    if (emotionType) {
      const index = EMOTIONS.findIndex((e) => e.type === emotionType);
      if (index >= 0) {
        this.rotateToIndex(index);
      }
    }
  }

  private setupResponsive(): void {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        this.container.style.transform = 'scale(0.7)';
      } else {
        this.container.style.transform = 'scale(1)';
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  public static getEmotions(): Exclude<EmotionType, 'neutral'>[] {
    return EMOTIONS.map((e) => e.type);
  }
}
