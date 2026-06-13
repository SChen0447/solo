import * as PIXI from 'pixi.js';
import { FurnaceEngine } from './furnace';
import { WorkshopRenderer } from './renderer';
import * as Audio from './audio';
import * as Api from './api';

class App {
  private pixiApp!: PIXI.Application;
  private engine!: FurnaceEngine;
  private renderer!: WorkshopRenderer;
  private authOverlay: HTMLDivElement | null = null;
  private vesselPanel: HTMLDivElement | null = null;
  private currentUser: Api.User | null = null;

  async init(): Promise<void> {
    this.pixiApp = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a0f0a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.appendChild(this.pixiApp.view as HTMLCanvasElement);
    }

    this.engine = new FurnaceEngine();
    this.renderer = new WorkshopRenderer(this.pixiApp, this.engine);

    this.renderer.setCallbacks({
      onFurnaceClick: () => this.onFurnaceClick(),
      onPaletteAClick: (color) => this.onPaletteAClick(color),
      onPaletteBClick: (color) => this.onPaletteBClick(color),
      onCoolClick: () => this.onCoolClick(),
    });

    this.engine.setOnStateChange(() => this.onEngineStateChange());

    this.pixiApp.ticker.add((delta) => {
      const dt = delta / 60;
      this.engine.update(dt);
      this.renderer.update(dt);
    });

    window.addEventListener('resize', () => this.onResize());

    this.checkAuth();
    this.createAuthOverlay();
  }

  private onResize(): void {
    this.pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
    this.renderer.resize();
  }

  private checkAuth(): void {
    this.currentUser = Api.getCurrentUser();
    if (this.currentUser) {
      this.engine.phase = 'workshop';
    } else {
      this.engine.phase = 'idle';
    }
  }

  private createAuthOverlay(): void {
    this.authOverlay = document.createElement('div');
    this.authOverlay.id = 'auth-overlay';
    Object.assign(this.authOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '100',
      pointerEvents: 'none',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'rgba(30, 20, 14, 0.95)',
      border: '1px solid #3e2723',
      borderRadius: '16px',
      padding: '32px',
      width: '340px',
      pointerEvents: 'auto',
      boxShadow: '0 0 40px rgba(255, 107, 53, 0.15)',
    });

    const title = document.createElement('h1');
    title.textContent = '星砂·熔光工坊';
    Object.assign(title.style, {
      color: '#ff6b35',
      fontFamily: 'sans-serif',
      fontSize: '22px',
      textAlign: 'center',
      marginBottom: '8px',
      fontWeight: '300',
      letterSpacing: '4px',
    });

    const subtitle = document.createElement('p');
    subtitle.textContent = '在星空中凝出一颗发光砂晶';
    Object.assign(subtitle.style, {
      color: '#8b7355',
      fontFamily: 'sans-serif',
      fontSize: '12px',
      textAlign: 'center',
      marginBottom: '24px',
      letterSpacing: '2px',
    });

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = '邮箱';
    Object.assign(emailInput.style, {
      width: '100%',
      padding: '10px 14px',
      background: '#0e0a08',
      border: '1px solid #3e2723',
      borderRadius: '8px',
      color: '#ddd',
      fontSize: '14px',
      marginBottom: '12px',
      outline: 'none',
      boxSizing: 'border-box',
    });

    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.placeholder = '密码';
    Object.assign(passInput.style, {
      width: '100%',
      padding: '10px 14px',
      background: '#0e0a08',
      border: '1px solid #3e2723',
      borderRadius: '8px',
      color: '#ddd',
      fontSize: '14px',
      marginBottom: '18px',
      outline: 'none',
      boxSizing: 'border-box',
    });

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'flex',
      gap: '10px',
    });

    const loginBtn = this.createButton('登录', '#ff6b35');
    const registerBtn = this.createButton('注册', '#3e2723');

    const errorText = document.createElement('div');
    Object.assign(errorText.style, {
      color: '#ff3366',
      fontSize: '12px',
      textAlign: 'center',
      marginTop: '10px',
      minHeight: '18px',
    });

    const handleAuth = async (action: 'login' | 'register') => {
      const email = emailInput.value.trim();
      const pass = passInput.value;
      if (!email || !pass) {
        errorText.textContent = '请填写邮箱和密码';
        return;
      }
      try {
        Audio.resumeAudio();
        Audio.playClick();
        this.currentUser = action === 'login'
          ? await Api.login(email, pass)
          : await Api.register(email, pass);
        this.hideAuth();
        this.engine.phase = 'workshop';
      } catch (err: any) {
        errorText.textContent = err.message || '操作失败';
      }
    };

    loginBtn.onclick = () => handleAuth('login');
    registerBtn.onclick = () => handleAuth('register');

    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuth('login');
    });
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuth('login');
    });

    btnRow.appendChild(loginBtn);
    btnRow.appendChild(registerBtn);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(emailInput);
    card.appendChild(passInput);
    card.appendChild(btnRow);
    card.appendChild(errorText);

    this.authOverlay.appendChild(card);
    document.body.appendChild(this.authOverlay);

    if (this.currentUser) {
      this.hideAuth();
    }
  }

  private createButton(text: string, bgColor: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      flex: '1',
      padding: '10px',
      background: bgColor,
      color: bgColor === '#3e2723' ? '#ccc' : '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      letterSpacing: '2px',
    });
    btn.onmouseover = () => {
      btn.style.opacity = '0.85';
      btn.style.transform = 'translateY(-1px)';
    };
    btn.onmouseout = () => {
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(0)';
    };
    return btn;
  }

  private hideAuth(): void {
    if (this.authOverlay) {
      this.authOverlay.style.display = 'none';
    }
  }

  private showAuth(): void {
    if (this.authOverlay) {
      this.authOverlay.style.display = 'flex';
    }
  }

  private onFurnaceClick(): void {
    Audio.resumeAudio();
    Audio.playFurnaceOpen();
    this.engine.openBlowingStation();
  }

  private onPaletteAClick(color: string): void {
    Audio.playColorPick();
    this.engine.selectPaletteAColor(color);
  }

  private onPaletteBClick(color: string): void {
    Audio.playColorPick();
    this.engine.selectPaletteBColor(color);
  }

  private onCoolClick(): void {
    Audio.playCool();
    this.engine.startCooling();
  }

  private onEngineStateChange(): void {
    if (this.engine.phase === 'complete') {
      this.onVesselComplete();
    }
  }

  private async onVesselComplete(): Promise<void> {
    if (!this.currentUser) {
      this.showAuth();
      return;
    }

    const data = this.engine.getVesselData();
    try {
      await Api.saveVessel(data);
      this.showVesselPanel();
    } catch (err: any) {
      this.showVesselError(err.message);
    }
  }

  private async showVesselPanel(): Promise<void> {
    if (this.vesselPanel) {
      this.vesselPanel.remove();
    }

    this.vesselPanel = document.createElement('div');
    Object.assign(this.vesselPanel.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(30, 20, 14, 0.95)',
      border: '1px solid #3e2723',
      borderRadius: '12px',
      padding: '16px 24px',
      zIndex: '90',
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      boxShadow: '0 0 30px rgba(255, 107, 53, 0.2)',
    });

    const label = document.createElement('span');
    label.textContent = '✨ 器皿已保存';
    Object.assign(label.style, {
      color: '#ff6b35',
      fontSize: '14px',
      letterSpacing: '1px',
    });

    const newBtn = this.createButton('再次吹制', '#ff6b35');
    newBtn.onclick = () => {
      if (this.vesselPanel) this.vesselPanel.remove();
      this.engine.resetBlowing();
    };

    const viewBtn = this.createButton('我的器皿', '#3e2723');
    viewBtn.onclick = () => this.showVesselGallery();

    this.vesselPanel.appendChild(label);
    this.vesselPanel.appendChild(newBtn);
    this.vesselPanel.appendChild(viewBtn);
    document.body.appendChild(this.vesselPanel);
  }

  private showVesselError(msg: string): void {
    const errDiv = document.createElement('div');
    Object.assign(errDiv.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255, 51, 102, 0.15)',
      border: '1px solid #ff3366',
      borderRadius: '8px',
      padding: '10px 20px',
      color: '#ff3366',
      fontSize: '13px',
      zIndex: '100',
    });
    errDiv.textContent = msg;
    document.body.appendChild(errDiv);
    setTimeout(() => errDiv.remove(), 3000);
  }

  private async showVesselGallery(): Promise<void> {
    const vessels = await Api.loadVessels();

    const gallery = document.createElement('div');
    Object.assign(gallery.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(10, 6, 4, 0.95)',
      zIndex: '200',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
    });

    const title = document.createElement('h2');
    title.textContent = '我的器皿';
    Object.assign(title.style, {
      color: '#ff6b35',
      fontSize: '20px',
      fontWeight: '300',
      letterSpacing: '4px',
      marginBottom: '10px',
    });

    gallery.appendChild(title);

    if (vessels.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = '暂无器皿，去吹制一个吧';
      Object.assign(empty.style, { color: '#8b7355', fontSize: '14px' });
      gallery.appendChild(empty);
    } else {
      const grid = document.createElement('div');
      Object.assign(grid.style, {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      });

      for (const v of vessels) {
        const card = document.createElement('div');
        Object.assign(card.style, {
          width: '160px',
          height: '200px',
          background: 'rgba(26, 15, 10, 0.9)',
          border: '1px solid #3e2723',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          position: 'relative',
        });

        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        this.drawVesselPreview(canvas, v);
        Object.assign(canvas.style, { borderRadius: '8px' });
        card.appendChild(canvas);

        const date = new Date(v.createdAt);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        const dateLabel = document.createElement('span');
        dateLabel.textContent = dateStr;
        Object.assign(dateLabel.style, { color: '#8b7355', fontSize: '11px', marginTop: '8px' });
        card.appendChild(dateLabel);

        const delBtn = document.createElement('button');
        delBtn.textContent = '✕';
        Object.assign(delBtn.style, {
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'none',
          border: '1px solid #3e2723',
          color: '#8b7355',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          fontSize: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        });
        delBtn.onclick = async () => {
          await Api.deleteVessel(v.id);
          gallery.remove();
          this.showVesselGallery();
        };
        card.appendChild(delBtn);

        grid.appendChild(card);
      }
      gallery.appendChild(grid);
    }

    const closeBtn = this.createButton('返回', '#3e2723');
    closeBtn.onclick = () => gallery.remove();
    gallery.appendChild(closeBtn);

    document.body.appendChild(gallery);
  }

  private drawVesselPreview(canvas: HTMLCanvasElement, vessel: Api.Vessel): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0e0a08';
    ctx.fillRect(0, 0, 120, 120);

    const cx = 60;
    const cy = 60;
    const rx = 20 * vessel.shape.stretchRatio;
    const ry = 20 * vessel.shape.flatRatio;

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = vessel.colorA;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const c of vessel.crystals) {
      ctx.save();
      ctx.globalAlpha = c.opacity;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = cx + c.x + Math.cos(angle) * c.size;
        const py = cy + c.y + Math.sin(angle) * c.size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = '#ddd';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
      ctx.stroke();
    }
  }
}

const app = new App();
app.init();
