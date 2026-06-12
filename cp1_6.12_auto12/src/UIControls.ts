import GUI from 'lil-gui';

export type DisplayMode = 'ballstick' | 'spacefill';
export type BackgroundType = 'space' | 'white' | 'black';

export interface ControlParams {
  rotationSpeed: number;
  displayMode: DisplayMode;
  background: BackgroundType;
  autoRotate: boolean;
}

type ParamsListener = (params: ControlParams) => void;

export class UIControls {
  params: ControlParams;
  private gui: GUI;
  private listeners: ParamsListener[] = [];
  private hamburgerBtn: HTMLButtonElement | null;
  private guiContainer: HTMLElement | null;
  private mobileMenuOpen = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(initialParams?: Partial<ControlParams>) {
    this.params = {
      rotationSpeed: 1.0,
      displayMode: 'ballstick',
      background: 'space',
      autoRotate: true,
      ...(initialParams ?? {}),
    };

    this.guiContainer = document.getElementById('gui-container');
    this.hamburgerBtn = document.getElementById(
      'hamburgerBtn'
    ) as HTMLButtonElement | null;

    this.gui = new GUI({
      container: this.guiContainer ?? undefined,
      title: '🧬 控制面板',
      closeOnTop: true,
    });

    this.buildControls();
    this.attachResponsiveHandler();
  }

  private buildControls() {
    const p = this.params;

    const fView = this.gui.addFolder('🔄 视图控制');
    fView
      .add(p, 'autoRotate')
      .name('自动旋转')
      .onChange(() => this.emit());
    fView
      .add(p, 'rotationSpeed', 0, 5, 0.1)
      .name('旋转速度')
      .onChange(() => this.emit());
    fView
      .add(
        {
          resetView: () => {
            this.emitAction('resetView');
          },
        },
        'resetView'
      )
      .name('重置视角');
    fView
      .add(
        {
          topView: () => {
            this.emitAction('topView');
          },
        },
        'topView'
      )
      .name('顶视图');
    fView.open();

    const fStyle = this.gui.addFolder('🎨 显示设置');
    fStyle
      .add(p, 'displayMode', {
        '球棍模型 Ball-Stick': 'ballstick',
        '空间填充 Space-Filling': 'spacefill',
      })
      .name('显示模式')
      .onChange(() => this.emit());
    fStyle
      .add(p, 'background', {
        '深空渐变': 'space',
        '纯白背景': 'white',
        '纯黑背景': 'black',
      })
      .name('背景颜色')
      .onChange(() => this.emit());
    fStyle.open();

    const fInfo = this.gui.addFolder('ℹ️ 分子信息');
    const molInfo: Record<string, unknown> = {
      名称: 'Caffeine · 咖啡因',
      分子式: 'C₈H₁₀N₄O₂',
      原子数: 22,
      化学键数: 22,
    };
    Object.entries(molInfo).forEach(([k, v]) => {
      fInfo.add(molInfo, k as string).name(k as string).disable().listen();
    });
    fInfo.close();
  }

  private emit() {
    this.listeners.forEach((fn) => fn({ ...this.params }));
  }

  private emitAction(action: 'resetView' | 'topView') {
    this.listeners.forEach((fn) =>
      fn({
        ...this.params,
        __action: action as unknown as undefined,
      } as ControlParams & { __action: string })
    );
  }

  onChange(callback: ParamsListener) {
    this.listeners.push(callback);
    callback({ ...this.params });
  }

  private attachResponsiveHandler() {
    if (!this.hamburgerBtn) return;
    const mq = window.matchMedia('(max-width: 768px)');

    const apply = () => {
      if (mq.matches) {
        this.guiContainer?.classList.add('hidden-mobile');
        this.mobileMenuOpen = false;
        this.hamburgerBtn?.classList.remove('open');
      } else {
        this.guiContainer?.classList.remove('hidden-mobile');
        this.mobileMenuOpen = true;
        this.hamburgerBtn?.classList.add('open');
      }
    };
    apply();
    mq.addEventListener('change', apply);

    this.hamburgerBtn.addEventListener('click', () => this.toggleMobileMenu());
  }

  toggleMobileMenu() {
    if (!this.guiContainer || !this.hamburgerBtn) return;
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.guiContainer.classList.remove('hidden-mobile');
      this.hamburgerBtn.classList.add('open');
    } else {
      this.guiContainer.classList.add('hidden-mobile');
      this.hamburgerBtn.classList.remove('open');
    }
  }

  destroy() {
    this.gui.destroy();
    this.resizeObserver?.disconnect();
    this.listeners = [];
  }
}
