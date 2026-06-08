import { VoteOption, VoteResults } from './GameState';

export interface DanmakuItem {
  id: number;
  text: string;
  y: number;
  x: number;
  speed: number;
  color: string;
  isVote: boolean;
  voteOption?: VoteOption;
  element?: HTMLDivElement;
}

export type VoteCallback = (option: VoteOption) => void;

const RANDOM_MESSAGES = [
  '好棒啊！',
  '冲冲冲！',
  '主播好厉害',
  '笑死我了哈哈哈',
  '前方高能',
  '太可爱了叭',
  'awsl',
  '来了来了',
  '打卡',
  '前排',
  '支持支持',
  '绝绝子',
  'yyds',
  '厉害了',
  '哇塞',
  '太棒了',
  '爱了爱了',
  '真不错',
  '有意思',
  '继续继续'
];

const DANMAKU_COLORS = [
  '#FFFFFF',
  '#FFD700',
  '#FF6B6B',
  '#4ECDC4',
  '#A8E6CF',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8'
];

export class DanmakuSystem {
  private container: HTMLElement;
  private danmakuList: DanmakuItem[];
  private maxDanmaku: number;
  private nextId: number;
  private isVoting: boolean;
  private voteResults: VoteResults;
  private voteCallback: VoteCallback | null;
  private generationInterval: number | null;
  private lastFrameTime: number;
  private containerHeight: number;
  private usedLanes: Set<number>;
  private laneCount: number;

  constructor(container: HTMLElement) {
    this.container = container;
    this.danmakuList = [];
    this.maxDanmaku = 10;
    this.nextId = 0;
    this.isVoting = false;
    this.voteResults = { A: 0, B: 0, C: 0 };
    this.voteCallback = null;
    this.generationInterval = null;
    this.lastFrameTime = performance.now();
    this.containerHeight = 200;
    this.usedLanes = new Set();
    this.laneCount = 8;
  }

  setVoteCallback(callback: VoteCallback): void {
    this.voteCallback = callback;
  }

  startVoting(): void {
    this.isVoting = true;
    this.voteResults = { A: 0, B: 0, C: 0 };
  }

  stopVoting(): VoteResults {
    this.isVoting = false;
    return { ...this.voteResults };
  }

  getVoteResults(): VoteResults {
    return { ...this.voteResults };
  }

  resetVotes(): void {
    this.voteResults = { A: 0, B: 0, C: 0 };
  }

  startSimulation(): void {
    if (this.generationInterval) return;
    this.generationInterval = window.setInterval(() => {
      this.generateRandomDanmaku();
    }, 800 + Math.random() * 600);
  }

  stopSimulation(): void {
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = null;
    }
  }

  private generateRandomDanmaku(): void {
    if (this.danmakuList.length >= this.maxDanmaku) return;

    let text: string;
    let isVote = false;
    let voteOption: VoteOption | undefined;

    if (this.isVoting && Math.random() < 0.7) {
      const options: VoteOption[] = ['A', 'B', 'C'];
      voteOption = options[Math.floor(Math.random() * options.length)];
      const prefixes = ['选', '投', '支持', '我选', '必须', '就'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      text = `${prefix}${voteOption}！`;
      isVote = true;
    } else {
      text = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
    }

    this.addDanmaku(text, isVote, voteOption);
  }

  addDanmaku(text: string, isVote: boolean = false, voteOption?: VoteOption): void {
    if (this.danmakuList.length >= this.maxDanmaku) return;

    const lane = this.findAvailableLane();
    if (lane === -1) return;

    const laneHeight = this.containerHeight / this.laneCount;
    const y = lane * laneHeight + 10;

    const color = isVote
      ? voteOption === 'A' ? '#e74c3c' : voteOption === 'B' ? '#3498db' : '#2ecc71'
      : DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)];

    const element = document.createElement('div');
    element.className = 'danmaku-item';
    element.textContent = text;
    element.style.color = color;
    element.style.top = `${y}px`;
    element.style.left = '100%';
    element.style.position = 'absolute';
    element.style.whiteSpace = 'nowrap';
    element.style.fontSize = '16px';
    element.style.fontWeight = isVote ? 'bold' : 'normal';
    element.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)';
    element.style.pointerEvents = 'none';
    element.style.zIndex = isVote ? '10' : '5';

    if (isVote) {
      element.style.textShadow = `
        1px 1px 2px rgba(0,0,0,0.9),
        -1px -1px 2px rgba(0,0,0,0.9),
        1px -1px 2px rgba(0,0,0,0.9),
        -1px 1px 2px rgba(0,0,0,0.9)
      `;
    }

    this.container.appendChild(element);

    const danmaku: DanmakuItem = {
      id: this.nextId++,
      text,
      y,
      x: this.container.clientWidth,
      speed: 80 + Math.random() * 60,
      color,
      isVote,
      voteOption,
      element
    };

    this.danmakuList.push(danmaku);
    this.usedLanes.add(lane);

    if (isVote && voteOption && this.isVoting) {
      this.voteResults[voteOption]++;
      if (this.voteCallback) {
        this.voteCallback(voteOption);
      }
    }
  }

  private findAvailableLane(): number {
    const availableLanes: number[] = [];
    for (let i = 0; i < this.laneCount; i++) {
      if (!this.usedLanes.has(i)) {
        availableLanes.push(i);
      }
    }
    if (availableLanes.length === 0) return -1;
    return availableLanes[Math.floor(Math.random() * availableLanes.length)];
  }

  update(dt: number): void {
    const containerWidth = this.container.clientWidth;

    this.danmakuList = this.danmakuList.filter(item => {
      item.x -= item.speed * dt;

      if (item.element) {
        item.element.style.left = `${item.x}px`;

        const textWidth = item.element.offsetWidth;
        if (item.x + textWidth < 0) {
          item.element.remove();
          this.freeLane(item.y);
          return false;
        }
      }

      return true;
    });
  }

  private freeLane(y: number): void {
    const laneHeight = this.containerHeight / this.laneCount;
    const lane = Math.floor((y - 10) / laneHeight);
    this.usedLanes.delete(lane);
  }

  clear(): void {
    this.danmakuList.forEach(item => {
      if (item.element) {
        item.element.remove();
      }
    });
    this.danmakuList = [];
    this.usedLanes.clear();
  }

  setContainerHeight(height: number): void {
    this.containerHeight = height;
    this.laneCount = Math.max(4, Math.floor(height / 28));
  }

  getDanmakuCount(): number {
    return this.danmakuList.length;
  }
}
