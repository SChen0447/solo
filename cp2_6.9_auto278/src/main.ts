import { Room } from './room.js';
import { Inventory } from './inventory.js';
import {
  ITEMS,
  KEY_ITEMS,
  combineItems,
  validatePassword,
  getRandomBlessing
} from './puzzle.js';

const GAME_DURATION = 5 * 60 * 1000;

class AudioManager {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.ctx;
  }

  playUnlock(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(140, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.25);
    }, 120);
  }

  playClick(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playPickup(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playCombineSuccess(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    });
  }

  playFail(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playVictory(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const totalDuration = 20;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15, now);
    masterGain.gain.linearRampToValueAtTime(0.01, now + totalDuration);
    masterGain.connect(ctx.destination);

    const cMajor = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    for (let t = 0; t < totalDuration; t += 0.5) {
      const freq = cMajor[Math.floor(Math.random() * cMajor.length)];
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now + t);
      g1.gain.setValueAtTime(0, now + t);
      g1.gain.linearRampToValueAtTime(0.08, now + t + 0.05);
      g1.gain.linearRampToValueAtTime(0, now + t + 0.45);
      osc1.connect(g1).connect(masterGain);
      osc1.start(now + t);
      osc1.stop(now + t + 0.5);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq / 2, now + t);
      g2.gain.setValueAtTime(0, now + t);
      g2.gain.linearRampToValueAtTime(0.04, now + t + 0.05);
      g2.gain.linearRampToValueAtTime(0, now + t + 0.45);
      osc2.connect(g2).connect(masterGain);
      osc2.start(now + t);
      osc2.stop(now + t + 0.5);
    }
  }
}

class Game {
  private canvas: HTMLCanvasElement;
  private room: Room;
  private inventory: Inventory;
  private audio: AudioManager;
  private timeLeft: number = GAME_DURATION;
  private startTime: number = 0;
  private pausedOffset: number = 0;
  private isPlaying: boolean = false;
  private hasWon: boolean = false;
  private hasLost: boolean = false;
  private frame: number = 0;
  private rafId: number = 0;
  private puzzlesSolved: number = 0;
  private secretCompartmentOpen: boolean = false;
  private passwordInput: string = '';
  private unlocked: boolean = false;
  private fogCanvas: HTMLCanvasElement;
  private fogProgress: number = 0;
  private overlayView: HTMLElement;
  private overlayContent: HTMLElement;
  private overlayClose: HTMLElement;
  private passwordLock: HTMLElement;
  private passwordDisplay: HTMLElement;
  private passwordGrid: HTMLElement;
  private timerText: HTMLElement;
  private endScreen: HTMLElement;
  private endContent: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.fogCanvas = document.getElementById('fog-overlay') as HTMLCanvasElement;
    this.overlayView = document.getElementById('overlay-view') as HTMLElement;
    this.overlayContent = document.getElementById('overlay-content') as HTMLElement;
    this.overlayClose = document.getElementById('overlay-close') as HTMLElement;
    this.passwordLock = document.getElementById('password-lock') as HTMLElement;
    this.passwordDisplay = document.getElementById('password-display') as HTMLElement;
    this.passwordGrid = document.getElementById('password-grid') as HTMLElement;
    this.timerText = document.getElementById('timer-text') as HTMLElement;
    this.endScreen = document.getElementById('end-screen') as HTMLElement;
    this.endContent = document.getElementById('end-content') as HTMLElement;

    this.room = new Room(this.canvas);
    this.inventory = new Inventory(document.getElementById('inventory-bar') as HTMLElement);
    this.audio = new AudioManager();

    this.bindEvents();
    this.inventory.renderEmpty();
    this.initPasswordLock();
  }

  private bindEvents(): void {
    this.room.setOnPointClick((pointId: string) => this.handlePointClick(pointId));

    this.inventory.setOnCombine((item1: string, item2: string, pos: { x: number; y: number }) => {
      this.handleCombine(item1, item2, pos);
    });

    this.overlayClose.addEventListener('click', () => this.closeOverlay());

    this.endScreen.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('restart-btn')) {
        this.restart();
      }
    });
  }

  private initPasswordLock(): void {
    this.passwordGrid.innerHTML = '';
    const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清除', '0', '确认'];
    buttons.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'password-btn';
      btn.textContent = label;
      if (label === '清除' || label === '确认') {
        btn.classList.add('wide');
      }
      btn.addEventListener('mousedown', () => {
        btn.classList.add('pressed');
        this.audio.playClick();
      });
      btn.addEventListener('mouseup', () => {
        btn.classList.remove('pressed');
      });
      btn.addEventListener('mouseleave', () => {
        btn.classList.remove('pressed');
      });
      btn.addEventListener('click', () => this.handlePasswordInput(label));
      this.passwordGrid.appendChild(btn);
    });
  }

  private handlePasswordInput(label: string): void {
    if (this.unlocked) return;

    if (label === '清除') {
      this.passwordInput = '';
    } else if (label === '确认') {
      if (this.passwordInput.length === 3) {
        if (validatePassword(this.passwordInput)) {
          this.unlocked = true;
          this.passwordDisplay.classList.add('unlocked');
          this.audio.playUnlock();
          this.puzzlesSolved++;
          setTimeout(() => {
            this.win();
          }, 1000);
        } else {
          this.audio.playFail();
          this.passwordInput = '';
          this.passwordDisplay.style.color = '#FF4444';
          setTimeout(() => {
            this.passwordDisplay.style.color = '';
            this.updatePasswordDisplay();
          }, 300);
        }
      }
    } else if (this.passwordInput.length < 3) {
      this.passwordInput += label;
    }
    this.updatePasswordDisplay();
  }

  private updatePasswordDisplay(): void {
    const display = this.passwordInput.padEnd(3, '_');
    this.passwordDisplay.textContent = display;
  }

  private handlePointClick(pointId: string): void {
    if (!this.isPlaying) return;

    switch (pointId) {
      case 'desk':
        this.showOverlay('desk');
        break;
      case 'drawer':
        this.handleDrawer();
        break;
      case 'bookshelf':
        this.handleBookshelf();
        break;
      case 'fireplace':
        this.handleFireplace();
        break;
      case 'carpet':
        this.handleCarpet();
        break;
      case 'clock':
        this.handleClock();
        break;
      case 'plant':
        this.handlePlant();
        break;
    }
  }

  private showOverlay(type: string): void {
    let content = '';
    switch (type) {
      case 'desk':
        content = `<div class="big-icon">🪑</div>
          <p>一张布满灰尘的古老书桌</p>
          <p>桌脚刻着奇怪的符文...</p>
          <p style="margin-top:8px;font-size:11px;color:#8B7355;">试试打开下方的抽屉</p>`;
        break;
      case 'drawer_open':
        content = `<div class="big-icon">📦</div>
          <p>抽屉被拉开了！</p>
          <p>里面有一本红色的典籍</p>
          <button id="pickup-book">拿起红色典籍</button>`;
        break;
      case 'drawer_empty':
        content = `<div class="big-icon">📦</div>
          <p>抽屉已经空了</p>`;
        break;
      case 'bookshelf':
        content = `<div class="big-icon">📚</div>
          <p>高大的书架上摆满古籍</p>
          <p style="margin-top:8px;font-size:11px;color:#8B7355;">点击书本查看</p>`;
        break;
      case 'bookshelf_book':
        if (this.room.isItemTaken('bookshelf')) {
          content = `<div class="big-icon">📚</div><p>书架上剩下的都是普通典籍</p>`;
        } else {
          content = `<div class="big-icon">📕</div>
            <p>一本红色封皮的典籍格外显眼</p>
            <p>书页间夹着些什么...</p>
            <button id="inspect-book">仔细查看</button>`;
        }
        break;
      case 'fireplace':
        if (this.room.isItemTaken('fireplace')) {
          content = `<div class="big-icon">🏚️</div><p>壁炉已经熄灭，只剩灰烬</p>`;
        } else {
          content = `<div class="big-icon">🔥</div>
            <p>壁炉中燃烧着神秘的火焰</p>
            <p>一块木炭发出奇异的光</p>
            <button id="pickup-charcoal">取出发光木炭</button>`;
        }
        break;
      case 'carpet':
        if (!this.room.isInteracted('carpet')) {
          content = `<div class="big-icon">🟥</div>
            <p>一块华丽的波斯地毯</p>
            <p>边角似乎有些翘起...</p>
            <button id="lift-carpet">掀开地毯</button>`;
        } else if (!this.room.isItemTaken('carpet')) {
          content = `<div class="big-icon">🗝️</div>
            <p>地毯下藏着一把古铜钥匙！</p>
            <button id="pickup-key">拿起钥匙</button>`;
        } else {
          content = `<div class="big-icon">🟥</div><p>地毯下已经没有其他东西了</p>`;
        }
        break;
      case 'clock':
        if (!this.room.isItemTaken('clock')) {
          content = `<div class="big-icon">🕰️</div>
            <p>古老的挂钟，指针停在错误的时间</p>
            <p>钟面似乎可以打开...</p>
            <button id="open-clock">打开钟面</button>`;
        } else {
          content = `<div class="big-icon">🕰️</div><p>挂钟的齿轮已被取出</p>`;
        }
        break;
      case 'plant':
        if (!this.room.isInteracted('plant')) {
          content = `<div class="big-icon">🪴</div>
            <p>一盆枯萎的植物</p>
            <p>土壤看起来有些松动...</p>
            <button id="dig-soil">挖掘土壤</button>`;
        } else if (!this.room.isItemTaken('plant')) {
          content = `<div class="big-icon">📜</div>
            <p>土壤里埋着半张破旧的纸片！</p>
            <p>上面写着罗马数字：IV VII II</p>
            <button id="pickup-paper">拿起纸片</button>`;
        } else {
          content = `<div class="big-icon">🪴</div><p>土壤里已经没有其他东西了</p>`;
        }
        break;
    }

    this.overlayContent.innerHTML = content;
    this.overlayView.classList.add('active');
    this.bindOverlayButtons(type);
  }

  private bindOverlayButtons(type: string): void {
    const bindBtn = (id: string, handler: () => void) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', handler);
      }
    };

    switch (type) {
      case 'drawer_open':
        bindBtn('pickup-book', () => {
          if (!this.inventory.hasItem('book_red') && this.inventory.addItem('book_red')) {
            this.room.setItemTaken('drawer', true);
            this.audio.playPickup();
            this.closeOverlay();
          }
        });
        break;
      case 'bookshelf_book':
        bindBtn('inspect-book', () => {
          if (!this.inventory.hasItem('book_red') && this.inventory.addItem('book_red')) {
            this.room.setInteracted('bookshelf', true);
            this.room.setItemTaken('bookshelf', true);
            this.audio.playPickup();
            this.closeOverlay();
          }
        });
        break;
      case 'fireplace':
        bindBtn('pickup-charcoal', () => {
          if (!this.inventory.hasItem('charcoal') && this.inventory.addItem('charcoal')) {
            this.room.setItemTaken('fireplace', true);
            this.audio.playPickup();
            this.checkKeyItems();
            this.closeOverlay();
          }
        });
        break;
      case 'carpet':
        if (!this.room.isInteracted('carpet')) {
          bindBtn('lift-carpet', () => {
            this.room.setInteracted('carpet', true);
            this.showOverlay('carpet');
          });
        } else {
          bindBtn('pickup-key', () => {
            if (!this.inventory.hasItem('key') && this.inventory.addItem('key')) {
              this.room.setItemTaken('carpet', true);
              this.audio.playPickup();
              this.checkKeyItems();
              this.closeOverlay();
            }
          });
        }
        break;
      case 'clock':
        bindBtn('open-clock', () => {
          if (!this.inventory.hasItem('gear') && this.inventory.addItem('gear')) {
            this.room.setItemTaken('clock', true);
            this.audio.playPickup();
            this.closeOverlay();
          }
        });
        break;
      case 'plant':
        if (!this.room.isInteracted('plant')) {
          bindBtn('dig-soil', () => {
            this.room.setInteracted('plant', true);
            this.showOverlay('plant');
          });
        } else {
          bindBtn('pickup-paper', () => {
            if (!this.inventory.hasItem('paper') && this.inventory.addItem('paper')) {
              this.room.setItemTaken('plant', true);
              this.audio.playPickup();
              this.checkKeyItems();
              this.closeOverlay();
            }
          });
        }
        break;
    }
  }

  private handleDrawer(): void {
    if (!this.room.isInteracted('drawer')) {
      this.room.setInteracted('drawer', true);
      this.audio.playClick();
      setTimeout(() => {
        this.showOverlay('drawer_open');
      }, 300);
    } else if (!this.room.isItemTaken('drawer')) {
      this.showOverlay('drawer_open');
    } else {
      this.showOverlay('drawer_empty');
    }
  }

  private handleBookshelf(): void {
    this.showOverlay('bookshelf_book');
  }

  private handleFireplace(): void {
    this.showOverlay('fireplace');
  }

  private handleCarpet(): void {
    this.showOverlay('carpet');
  }

  private handleClock(): void {
    this.showOverlay('clock');
  }

  private handlePlant(): void {
    this.showOverlay('plant');
  }

  private closeOverlay(): void {
    this.overlayView.classList.remove('active');
  }

  private handleCombine(item1: string, item2: string, pos: { x: number; y: number }): void {
    const startTime = performance.now();
    const result = combineItems(item1, item2);
    const elapsed = performance.now() - startTime;

    if (elapsed > 5) {
      console.warn(`Combine logic took ${elapsed}ms, exceeding 5ms limit`);
    }

    if (result) {
      if (!this.inventory.hasItem(result)) {
        this.inventory.removeItem(item1);
        this.inventory.removeItem(item2);
        this.inventory.addItem(result);
        this.inventory.flashCombine();
        this.audio.playCombineSuccess();
        this.puzzlesSolved++;
      }
    } else {
      this.inventory.showFail(pos.x, pos.y);
      this.audio.playFail();
    }
  }

  private checkKeyItems(): void {
    const hasAll = KEY_ITEMS.every(id => this.inventory.hasItem(id));
    if (hasAll && !this.secretCompartmentOpen) {
      this.secretCompartmentOpen = true;
      this.openPasswordLock();
    }
  }

  private openPasswordLock(): void {
    this.passwordInput = '';
    this.unlocked = false;
    this.passwordDisplay.classList.remove('unlocked');
    this.updatePasswordDisplay();
    this.passwordLock.classList.add('active');
    this.audio.playClick();
  }

  private updateTimer(): void {
    if (!this.isPlaying) return;

    const elapsed = Date.now() - this.startTime + this.pausedOffset;
    this.timeLeft = Math.max(0, GAME_DURATION - elapsed);

    const minutes = Math.floor(this.timeLeft / 60000);
    const seconds = Math.floor((this.timeLeft % 60000) / 1000);
    this.timerText.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (this.timeLeft <= 30000) {
      this.timerText.classList.add('warning');
    } else {
      this.timerText.classList.remove('warning');
    }

    if (this.timeLeft <= 0) {
      this.lose();
    }
  }

  private win(): void {
    this.isPlaying = false;
    this.hasWon = true;
    this.audio.playVictory();

    const usedTime = GAME_DURATION - this.timeLeft;
    const minutes = Math.floor(usedTime / 60000);
    const seconds = Math.floor((usedTime % 60000) / 1000);
    const itemCount = this.inventory.getItems().length;
    const blessing = getRandomBlessing();

    this.endContent.innerHTML = `
      <h1>🎉 你成功逃出了诅咒的书房！</h1>
      <div class="stats">
        <p>⏱️ 用时：${minutes}分${seconds}秒</p>
        <p>🎒 收集道具：${itemCount}件</p>
        <p>🧩 解谜次数：${this.puzzlesSolved}次</p>
      </div>
      <div class="blessing">"${blessing}"</div>
      <button class="restart-btn">重新开始</button>
    `;
    this.passwordLock.classList.remove('active');
    this.endScreen.classList.add('active');
  }

  private lose(): void {
    this.isPlaying = false;
    this.hasLost = true;

    this.fogCanvas.width = window.innerWidth;
    this.fogCanvas.height = window.innerHeight;
    this.fogCanvas.classList.add('active');
    this.animateFog();
  }

  private animateFog(): void {
    const ctx = this.fogCanvas.getContext('2d');
    if (!ctx) return;

    const w = this.fogCanvas.width;
    const h = this.fogCanvas.height;
    const maxRadius = Math.sqrt(w * w + h * h);

    const animate = () => {
      this.fogProgress += 1 / 120;
      if (this.fogProgress >= 1) {
        this.fogProgress = 1;
        this.endContent.innerHTML = `
          <h1 class="lose">💀 你的灵魂留在了这里</h1>
          <div class="stats">
            <p>书房被诅咒吞噬...</p>
            <p>时间已耗尽</p>
          </div>
          <button class="restart-btn">重新开始</button>
        `;
        this.endScreen.classList.add('active');
        return;
      }

      const radius = maxRadius * this.fogProgress;
      ctx.clearRect(0, 0, w, h);

      const corners = [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: 0, y: h },
        { x: w, y: h }
      ];

      corners.forEach(c => {
        const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      });

      this.rafId = requestAnimationFrame(animate);
    };

    animate();
  }

  private startLoop(): void {
    const loop = () => {
      this.frame++;
      this.updateTimer();
      this.room.render(this.frame);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  start(): void {
    this.isPlaying = true;
    this.hasWon = false;
    this.hasLost = false;
    this.startTime = Date.now();
    this.pausedOffset = 0;
    this.startLoop();
  }

  restart(): void {
    cancelAnimationFrame(this.rafId);

    this.timeLeft = GAME_DURATION;
    this.puzzlesSolved = 0;
    this.secretCompartmentOpen = false;
    this.passwordInput = '';
    this.unlocked = false;
    this.fogProgress = 0;
    this.hasWon = false;
    this.hasLost = false;

    this.timerText.classList.remove('warning');
    this.timerText.textContent = '05:00';
    this.endScreen.classList.remove('active');
    this.passwordLock.classList.remove('active');
    this.fogCanvas.classList.remove('active');
    const fogCtx = this.fogCanvas.getContext('2d');
    if (fogCtx) fogCtx.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
    this.overlayView.classList.remove('active');

    this.room.reset();
    this.inventory.clear();
    this.inventory.renderEmpty();

    this.start();
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.room.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();

  window.addEventListener('beforeunload', () => {
    game.destroy();
  });
});
