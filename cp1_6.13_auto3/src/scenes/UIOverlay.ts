import Phaser from 'phaser';

export interface GameState {
  ores: { blue: number; green: number; purple: number };
  lives: number;
  maxLives: number;
  score: number;
  shieldActive: boolean;
  shieldTimeLeft: number;
  gameOver: boolean;
  currentBeamColor: 'blue' | 'green' | 'purple';
}

export class UIOverlay extends Phaser.Scene {
  private hudContainer!: Phaser.GameObjects.DOMElement;
  private scoreEl!: HTMLElement;
  private blueCountEl!: HTMLElement;
  private greenCountEl!: HTMLElement;
  private purpleCountEl!: HTMLElement;
  private livesContainerEl!: HTMLElement;
  private shieldBarEl!: HTMLElement;
  private gameOverEl!: HTMLElement;
  private beamIndicatorEl!: HTMLElement;
  private lastScore = 0;

  constructor() {
    super({ key: 'UIOverlay', active: true });
  }

  create(): void {
    this.buildHUD();
    this.buildGameOver();
    this.game.events.on('updateState', this.updateState, this);
    this.game.events.on('bounceScore', this.bounceScore, this);
    this.game.events.on('restartGame', () => {
      if (this.gameOverEl) this.gameOverEl.style.display = 'none';
    });
  }

  private buildHUD(): void {
    const html = `
      <div id="hud-panel" style="
        position: absolute;
        top: 20px;
        right: 20px;
        width: 240px;
        padding: 18px;
        border-radius: 14px;
        background: rgba(20, 22, 48, 0.65);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(142, 208, 255, 0.25);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        color: #fff;
        font-family: 'Segoe UI', sans-serif;
        user-select: none;
      ">
        <div style="font-size: 14px; letter-spacing: 2px; color: #8ed0ff; margin-bottom: 10px; opacity: 0.9;">太空采矿 HUD</div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; color: #aac; margin-bottom: 6px; letter-spacing: 1px;">分数</div>
          <div id="score-val" style="font-size: 28px; font-weight: bold; color: #ffe58a; display: inline-block; transform-origin: center;">0</div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; color: #aac; margin-bottom: 6px; letter-spacing: 1px;">生命值</div>
          <div id="lives-container" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; color: #aac; margin-bottom: 6px; letter-spacing: 1px;">矿石库存</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #8ed0ff, #3a7bd5); box-shadow: 0 0 8px #3a7bd5;"></span>
              <span style="font-size: 13px;">蓝晶矿:</span>
              <span id="blue-count" style="font-size: 16px; font-weight: bold; color: #8ed0ff;">0</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #a8ffcc, #2ecc71); box-shadow: 0 0 8px #2ecc71;"></span>
              <span style="font-size: 13px;">翠绿矿:</span>
              <span id="green-count" style="font-size: 16px; font-weight: bold; color: #a8ffcc;">0</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #e0a8ff, #9b59b6); box-shadow: 0 0 8px #9b59b6;"></span>
              <span style="font-size: 13px;">紫辉矿:</span>
              <span id="purple-count" style="font-size: 16px; font-weight: bold; color: #e0a8ff;">0</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <div style="font-size: 11px; color: #aac; margin-bottom: 6px; letter-spacing: 1px;">当前光束 (按 Q 切换)</div>
          <div id="beam-indicator" style="
            width: 100%;
            height: 10px;
            border-radius: 5px;
            background: linear-gradient(90deg, #3a7bd5, #8ed0ff);
            box-shadow: 0 0 10px #3a7bd5;
            transition: all 0.3s ease;
          "></div>
        </div>

        <div>
          <div style="font-size: 11px; color: #aac; margin-bottom: 6px; letter-spacing: 1px;">护盾能量</div>
          <div style="width: 100%; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.1); overflow: hidden;">
            <div id="shield-bar" style="width: 0%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #00d4ff, #7affff); box-shadow: 0 0 6px #00d4ff; transition: width 0.2s linear;"></div>
          </div>
        </div>
      </div>

      <div style="
        position: absolute;
        bottom: 20px;
        left: 20px;
        padding: 12px 16px;
        border-radius: 10px;
        background: rgba(20, 22, 48, 0.55);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(142, 208, 255, 0.2);
        font-size: 12px;
        color: #cce;
        line-height: 1.7;
      ">
        <div><b style="color:#8ed0ff;">WASD</b> 移动飞船</div>
        <div><b style="color:#8ed0ff;">空格</b> 发射采集光束</div>
        <div><b style="color:#8ed0ff;">Q</b> 切换光束颜色</div>
      </div>
    `;

    this.hudContainer = this.add.dom(window.innerWidth / 2, window.innerHeight / 2).createFromHTML(html);
    this.hudContainer.setScrollFactor(0);

    this.scoreEl = document.getElementById('score-val')!;
    this.blueCountEl = document.getElementById('blue-count')!;
    this.greenCountEl = document.getElementById('green-count')!;
    this.purpleCountEl = document.getElementById('purple-count')!;
    this.livesContainerEl = document.getElementById('lives-container')!;
    this.shieldBarEl = document.getElementById('shield-bar')!;
    this.beamIndicatorEl = document.getElementById('beam-indicator')!;

    this.scale.on('resize', this.handleResize, this);
    this.renderLives(3, 3);
  }

  private buildGameOver(): void {
    const goDiv = document.createElement('div');
    goDiv.id = 'game-over-screen';
    goDiv.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(5, 5, 20, 0.75);
      backdrop-filter: blur(6px);
      z-index: 100;
      animation: fadeIn 0.5s ease forwards;
    `;
    goDiv.innerHTML = `
      <div style="
        padding: 40px 60px;
        border-radius: 20px;
        background: rgba(20, 22, 48, 0.85);
        border: 1px solid rgba(255, 100, 100, 0.4);
        box-shadow: 0 0 60px rgba(255, 80, 80, 0.3);
        text-align: center;
      ">
        <div style="font-size: 42px; font-weight: bold; color: #ff7a7a; letter-spacing: 4px; margin-bottom: 14px;">游戏结束</div>
        <div style="font-size: 16px; color: #aac; margin-bottom: 8px;">最终分数</div>
        <div id="final-score" style="font-size: 48px; font-weight: bold; color: #ffe58a; margin-bottom: 30px;">0</div>
        <button id="restart-btn" style="
          padding: 14px 42px;
          font-size: 18px;
          font-weight: bold;
          color: #fff;
          background: linear-gradient(135deg, #3a7bd5, #00d2ff);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          letter-spacing: 2px;
          box-shadow: 0 4px 20px rgba(58, 123, 213, 0.5);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        ">重来</button>
      </div>
    `;
    document.getElementById('game-container')!.appendChild(goDiv);
    this.gameOverEl = goDiv;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes heartBreak {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.4); opacity: 0.3; }
        100% { transform: scale(0); opacity: 0; }
      }
      @keyframes scoreBounce {
        0% { transform: scale(1); }
        30% { transform: scale(1.35); }
        60% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }
      #restart-btn:hover {
        transform: scale(1.08) !important;
        box-shadow: 0 6px 28px rgba(58, 123, 213, 0.75) !important;
      }
    `;
    document.head.appendChild(style);

    document.getElementById('restart-btn')!.addEventListener('click', () => {
      this.game.events.emit('restartGame');
    });
  }

  private handleResize = (gameSize: Phaser.Structs.Size): void => {
    if (this.hudContainer) {
      this.hudContainer.setPosition(gameSize.width / 2, gameSize.height / 2);
    }
  };

  private renderLives(current: number, max: number): void {
    if (!this.livesContainerEl) return;
    const existingCount = this.livesContainerEl.children.length;
    if (existingCount === max) {
      for (let i = 0; i < max; i++) {
        const heart = this.livesContainerEl.children[i] as HTMLElement;
        if (i < current) {
          heart.style.opacity = '1';
          heart.style.animation = '';
        } else if (heart.style.opacity !== '0') {
          heart.style.animation = 'heartBreak 0.5s ease forwards';
        }
      }
      return;
    }
    this.livesContainerEl.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const heart = document.createElement('span');
      heart.innerHTML = '❤';
      heart.style.cssText = `
        font-size: 24px;
        color: ${i < current ? '#ff6b8a' : 'rgba(255,255,255,0.15)'};
        text-shadow: 0 0 8px rgba(255, 107, 138, 0.7);
        transition: color 0.3s ease, opacity 0.3s ease;
      `;
      this.livesContainerEl.appendChild(heart);
    }
  }

  private bounceScore(): void {
    if (this.scoreEl) {
      this.scoreEl.style.animation = 'none';
      this.scoreEl.offsetHeight;
      this.scoreEl.style.animation = 'scoreBounce 0.4s ease';
    }
  }

  private updateState(state: GameState): void {
    if (this.scoreEl && state.score !== this.lastScore) {
      this.scoreEl.textContent = String(state.score);
      this.lastScore = state.score;
    }
    if (this.blueCountEl) this.blueCountEl.textContent = String(state.ores.blue);
    if (this.greenCountEl) this.greenCountEl.textContent = String(state.ores.green);
    if (this.purpleCountEl) this.purpleCountEl.textContent = String(state.ores.purple);

    this.renderLives(state.lives, state.maxLives);

    if (this.shieldBarEl) {
      const pct = state.shieldActive ? (state.shieldTimeLeft / 8000) * 100 : 0;
      this.shieldBarEl.style.width = `${Math.max(0, pct)}%`;
    }

    if (this.beamIndicatorEl) {
      const colorMap: Record<string, string> = {
        blue: 'linear-gradient(90deg, #3a7bd5, #8ed0ff)',
        green: 'linear-gradient(90deg, #2ecc71, #a8ffcc)',
        purple: 'linear-gradient(90deg, #9b59b6, #e0a8ff)'
      };
      const glowMap: Record<string, string> = {
        blue: '0 0 10px #3a7bd5',
        green: '0 0 10px #2ecc71',
        purple: '0 0 10px #9b59b6'
      };
      this.beamIndicatorEl.style.background = colorMap[state.currentBeamColor];
      this.beamIndicatorEl.style.boxShadow = glowMap[state.currentBeamColor];
    }

    if (state.gameOver && this.gameOverEl) {
      const finalScoreEl = document.getElementById('final-score');
      if (finalScoreEl) finalScoreEl.textContent = String(state.score);
      this.gameOverEl.style.display = 'flex';
    }
  }
}
