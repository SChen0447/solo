import { Star } from './starField';
import { InteractionManager } from './interaction';

export type ToggleCallback = (show: boolean) => void;
export type SearchCallback = (query: string) => boolean;
export type ResetCallback = () => void;
export type ClearCallback = () => void;

export class UIManager {
  container: HTMLElement;
  app: HTMLElement;
  bottomBar!: HTMLDivElement;
  searchInput!: HTMLInputElement;
  searchTip!: HTMLDivElement;
  showButton!: HTMLButtonElement;
  resetButton!: HTMLButtonElement;
  clearButton!: HTMLButtonElement;
  infoCard!: HTMLDivElement;
  starInfoName!: HTMLDivElement;
  starInfoMag!: HTMLDivElement;
  starInfoConst!: HTMLDivElement;

  onToggleConstellation: ToggleCallback | null = null;
  onSearch: SearchCallback | null = null;
  onReset: ResetCallback | null = null;
  onClear: ClearCallback | null = null;
  onCloseCard: (() => void) | null = null;

  private showConstellations = false;
  private searchFailTimer: number | null = null;

  constructor(appId: string) {
    const app = document.getElementById(appId);
    if (!app) throw new Error(`Container #${appId} not found`);
    this.app = app;
    this.container = app;
    this.createBottomBar();
    this.createInfoCard();
    this.injectStyles();
    this.bindEvents();
  }

  private createBottomBar(): void {
    this.bottomBar = document.createElement('div');
    this.bottomBar.className = 'st-bottom-bar';
    this.bottomBar.innerHTML = `
      <div class="st-search-wrap">
        <input type="text" class="st-search-input" placeholder="搜索星座（中/英文）" />
        <div class="st-search-tip"></div>
      </div>
      <div class="st-btn-group">
        <button class="st-btn st-btn-toggle" data-active="false">
          <span class="st-icon">✦</span><span class="st-btn-text">显示星座</span>
        </button>
        <button class="st-btn st-btn-reset">
          <span class="st-icon">⟲</span><span class="st-btn-text">重置视角</span>
        </button>
        <button class="st-btn st-btn-clear">
          <span class="st-icon">✕</span><span class="st-btn-text">清空连线</span>
        </button>
      </div>
    `;
    this.container.appendChild(this.bottomBar);

    this.searchInput = this.bottomBar.querySelector('.st-search-input') as HTMLInputElement;
    this.searchTip = this.bottomBar.querySelector('.st-search-tip') as HTMLDivElement;
    this.showButton = this.bottomBar.querySelector('.st-btn-toggle') as HTMLButtonElement;
    this.resetButton = this.bottomBar.querySelector('.st-btn-reset') as HTMLButtonElement;
    this.clearButton = this.bottomBar.querySelector('.st-btn-clear') as HTMLButtonElement;
  }

  private createInfoCard(): void {
    this.infoCard = document.createElement('div');
    this.infoCard.className = 'st-info-card';
    this.infoCard.style.display = 'none';
    this.infoCard.innerHTML = `
      <button class="st-info-close">×</button>
      <div class="st-info-title">✨ 星体信息</div>
      <div class="st-info-row"><span class="st-info-label">名称</span><span class="st-info-name"></span></div>
      <div class="st-info-row"><span class="st-info-label">星等</span><span class="st-info-mag"></span></div>
      <div class="st-info-row"><span class="st-info-label">所属星座</span><span class="st-info-const"></span></div>
    `;
    this.container.appendChild(this.infoCard);

    this.starInfoName = this.infoCard.querySelector('.st-info-name') as HTMLDivElement;
    this.starInfoMag = this.infoCard.querySelector('.st-info-mag') as HTMLDivElement;
    this.starInfoConst = this.infoCard.querySelector('.st-info-const') as HTMLDivElement;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .st-bottom-bar {
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        height: 60px;
        min-width: 500px;
        max-width: 96vw;
        padding: 0 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(20, 28, 60, 0.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(102, 136, 255, 0.25);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        z-index: 100;
      }
      .st-search-wrap {
        position: relative;
        flex: 1;
        min-width: 180px;
      }
      .st-search-input {
        width: 100%;
        height: 38px;
        padding: 0 14px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(102, 136, 255, 0.3);
        border-radius: 10px;
        color: #e8ecff;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit;
      }
      .st-search-input::placeholder { color: rgba(232, 236, 255, 0.4); }
      .st-search-input:focus {
        border-color: rgba(102, 136, 255, 0.7);
        box-shadow: 0 0 0 3px rgba(102, 136, 255, 0.12);
      }
      .st-search-input.shake {
        animation: st-shake 0.4s ease;
        border-color: rgba(255, 90, 90, 0.7) !important;
      }
      @keyframes st-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
      .st-search-tip {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 4px);
        padding: 4px 10px;
        font-size: 12px;
        color: #ff6b6b;
        opacity: 0;
        transform: translateY(-4px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
        text-shadow: 0 1px 2px rgba(0,0,0,0.7);
      }
      .st-search-tip.show {
        opacity: 1;
        transform: translateY(0);
      }
      .st-btn-group {
        display: flex;
        gap: 10px;
      }
      .st-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 38px;
        padding: 0 14px;
        background: rgba(102, 136, 255, 0.15);
        border: 1px solid rgba(102, 136, 255, 0.35);
        border-radius: 10px;
        color: #dce4ff;
        font-size: 13.5px;
        cursor: pointer;
        transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s, border-color 0.2s;
        font-family: inherit;
        white-space: nowrap;
      }
      .st-btn:hover {
        background: rgba(102, 136, 255, 0.28);
        border-color: rgba(102, 136, 255, 0.6);
      }
      .st-btn:active { transform: scale(0.93); }
      .st-btn.bounce { animation: st-bounce 0.15s ease; }
      @keyframes st-bounce {
        0% { transform: scale(1); }
        40% { transform: scale(0.92); }
        70% { transform: scale(1.04); }
        100% { transform: scale(1); }
      }
      .st-icon { font-size: 16px; line-height: 1; }
      .st-btn[data-active="true"] {
        background: rgba(102, 136, 255, 0.45);
        border-color: rgba(102, 136, 255, 0.8);
        color: #ffffff;
      }
      .st-info-card {
        position: fixed;
        z-index: 200;
        width: 240px;
        padding: 16px 20px 18px 20px;
        background: rgba(18, 26, 58, 0.92);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(102, 136, 255, 0.35);
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        color: #e8ecff;
        font-size: 13.5px;
        transform: scale(0.3) translateZ(0);
        opacity: 0;
        transform-origin: bottom center;
        transition: opacity 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                    transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
      }
      .st-info-card.show {
        transform: scale(1) translateZ(0);
        opacity: 1;
        pointer-events: auto;
      }
      .st-info-close {
        position: absolute;
        top: 6px;
        right: 8px;
        width: 26px;
        height: 26px;
        background: transparent;
        border: none;
        color: rgba(232, 236, 255, 0.6);
        font-size: 22px;
        line-height: 26px;
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.15s, color 0.15s;
        font-family: inherit;
      }
      .st-info-close:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }
      .st-info-title {
        font-size: 14.5px;
        font-weight: 600;
        margin-bottom: 10px;
        color: #fff;
        letter-spacing: 0.3px;
      }
      .st-info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-top: 1px solid rgba(102, 136, 255, 0.12);
        gap: 12px;
      }
      .st-info-label {
        color: rgba(232, 236, 255, 0.5);
        font-size: 12.5px;
      }
      .st-info-name, .st-info-mag, .st-info-const {
        color: #ffffff;
        text-align: right;
        font-weight: 500;
        word-break: break-all;
      }
      @media (max-width: 600px) {
        .st-bottom-bar {
          min-width: unset;
          width: 94vw;
          padding: 0 10px;
          gap: 8px;
          height: 56px;
        }
        .st-btn { padding: 0 10px; }
        .st-btn-text { display: none; }
        .st-icon { font-size: 18px; }
        .st-search-wrap { min-width: 120px; }
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    this.showButton.addEventListener('click', () => {
      this.showConstellations = !this.showConstellations;
      this.showButton.dataset.active = String(this.showConstellations);
      const text = this.showButton.querySelector('.st-btn-text') as HTMLElement;
      if (text) text.textContent = this.showConstellations ? '隐藏星座' : '显示星座';
      this.triggerBounce(this.showButton);
      this.onToggleConstellation?.(this.showConstellations);
    });

    this.resetButton.addEventListener('click', () => {
      this.triggerBounce(this.resetButton);
      this.onReset?.();
    });

    this.clearButton.addEventListener('click', () => {
      this.triggerBounce(this.clearButton);
      this.onClear?.();
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    const closeBtn = this.infoCard.querySelector('.st-info-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.hideInfoCard());
  }

  private triggerBounce(btn: HTMLButtonElement): void {
    btn.classList.remove('bounce');
    void btn.offsetWidth;
    btn.classList.add('bounce');
  }

  private performSearch(): void {
    const query = this.searchInput.value;
    const found = this.onSearch?.(query) ?? false;
    if (!found) {
      this.showSearchFail();
    } else {
      this.hideSearchFail();
    }
  }

  showSearchFail(): void {
    if (this.searchFailTimer) {
      window.clearTimeout(this.searchFailTimer);
    }
    this.searchTip.textContent = '未找到星座';
    this.searchTip.classList.add('show');
    this.searchInput.classList.remove('shake');
    void this.searchInput.offsetWidth;
    this.searchInput.classList.add('shake');
    this.searchFailTimer = window.setTimeout(() => {
      this.searchTip.classList.remove('show');
    }, 2000);
  }

  hideSearchFail(): void {
    this.searchTip.classList.remove('show');
  }

  showInfoCard(star: Star, screenX: number, screenY: number): void {
    this.starInfoName.textContent = star.name;
    this.starInfoMag.textContent = `${star.magnitude.toFixed(1)} 等`;
    this.starInfoConst.textContent = star.constellationName || '—';

    const rect = this.app.getBoundingClientRect();
    let left = screenX + 18;
    let top = screenY - 80;
    const cardW = 240;
    const cardH = 160;
    const margin = 10;

    if (left + cardW > rect.right - margin) left = screenX - cardW - 18;
    if (top < rect.top + margin) top = screenY + 18;
    if (top + cardH > rect.bottom - margin) top = rect.bottom - cardH - margin;
    if (left < rect.left + margin) left = rect.left + margin;

    this.infoCard.style.left = `${left}px`;
    this.infoCard.style.top = `${top}px`;
    this.infoCard.style.display = 'block';
    requestAnimationFrame(() => {
      this.infoCard.classList.add('show');
    });
  }

  hideInfoCard(): void {
    this.infoCard.classList.remove('show');
    setTimeout(() => {
      if (!this.infoCard.classList.contains('show')) {
        this.infoCard.style.display = 'none';
      }
    }, 300);
    this.onCloseCard?.();
  }
}
