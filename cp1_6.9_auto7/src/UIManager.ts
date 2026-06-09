import type { GameEvent } from './GameEngine';
import type { GameEngine } from './GameEngine';

export class UIManager {
  private engine: GameEngine;
  private goldEl: HTMLElement;
  private keysEl: HTMLElement;
  private lifeEl: HTMLElement;
  private timeEl: HTMLElement;
  private damageFlash: HTMLElement;
  private victoryOverlay: HTMLElement;
  private gameoverOverlay: HTMLElement;
  private victoryTime: HTMLElement;
  private victoryGold: HTMLElement;
  private victoryLife: HTMLElement;
  private gameoverTime: HTMLElement;
  private gameoverGold: HTMLElement;
  private victoryRestart: HTMLElement;
  private gameoverRestart: HTMLElement;
  private mobileBtns: NodeListOf<HTMLElement>;
  private unsub: () => void;
  private onRestart: () => void;
  private onMove: (dir: 'up' | 'down' | 'left' | 'right') => void;

  constructor(
    engine: GameEngine,
    onRestart: () => void,
    onMove: (dir: 'up' | 'down' | 'left' | 'right') => void
  ) {
    this.engine = engine;
    this.onRestart = onRestart;
    this.onMove = onMove;

    this.goldEl = document.getElementById('hud-gold')!;
    this.keysEl = document.getElementById('hud-keys')!;
    this.lifeEl = document.getElementById('hud-life')!;
    this.timeEl = document.getElementById('hud-time')!;
    this.damageFlash = document.getElementById('damage-flash')!;
    this.victoryOverlay = document.getElementById('victory-overlay')!;
    this.gameoverOverlay = document.getElementById('gameover-overlay')!;
    this.victoryTime = document.getElementById('victory-time')!;
    this.victoryGold = document.getElementById('victory-gold')!;
    this.victoryLife = document.getElementById('victory-life')!;
    this.gameoverTime = document.getElementById('gameover-time')!;
    this.gameoverGold = document.getElementById('gameover-gold')!;
    this.victoryRestart = document.getElementById('victory-restart')!;
    this.gameoverRestart = document.getElementById('gameover-restart')!;
    this.mobileBtns = document.querySelectorAll('.dpad-btn');

    this.unsub = this.engine.on(e => this.handleEvent(e));
    this.bindEvents();
    this.hideAll();
  }

  private hideAll(): void {
    this.victoryOverlay.classList.remove('active');
    this.gameoverOverlay.classList.remove('active');
  }

  private bindEvents(): void {
    this.victoryRestart.addEventListener('click', () => {
      this.hideAll();
      this.onRestart();
    });
    this.gameoverRestart.addEventListener('click', () => {
      this.hideAll();
      this.onRestart();
    });

    const handleDir = (btn: HTMLElement) => {
      const dir = btn.dataset.dir as 'up' | 'down' | 'left' | 'right';
      if (dir) this.onMove(dir);
    };

    this.mobileBtns.forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDir(btn);
      }, { passive: false });
      btn.addEventListener('click', () => handleDir(btn));
    });
  }

  private handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'goldChange':
        this.bumpValue(this.goldEl, event.value);
        break;
      case 'keyChange':
        this.bumpValue(this.keysEl, event.value);
        break;
      case 'lifeChange':
        this.bumpValue(this.lifeEl, event.value);
        break;
      case 'timeUpdate':
        this.timeEl.textContent = String(event.value);
        break;
      case 'damage':
        this.flashDamage();
        break;
      case 'victory':
        this.victoryTime.textContent = String(event.time);
        this.victoryGold.textContent = String(event.gold);
        this.victoryLife.textContent = String(event.life);
        this.victoryOverlay.classList.add('active');
        break;
      case 'gameover':
        this.gameoverTime.textContent = String(event.time);
        this.gameoverGold.textContent = String(event.gold);
        this.gameoverOverlay.classList.add('active');
        break;
    }
  }

  private bumpValue(el: HTMLElement, value: number): void {
    el.textContent = String(value);
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  private flashDamage(): void {
    this.damageFlash.classList.remove('active');
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add('active');
  }

  public destroy(): void {
    this.unsub();
  }
}
