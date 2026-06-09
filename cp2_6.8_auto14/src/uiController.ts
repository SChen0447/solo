export type BrushType = 'fine' | 'wash' | 'splatter';
export type ThemeType = 'rice' | 'slate' | 'ink';

export interface ThemeConfig {
  bgColor: string;
  brushColor: string;
  contrastRatio: number;
}

export interface UIControllerCallbacks {
  onBrushChange: (brush: BrushType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onThemeChange: (theme: ThemeType) => void;
  onExport: () => void;
}

const THEMES: Record<ThemeType, ThemeConfig> = {
  rice: {
    bgColor: '#F5F0E8',
    brushColor: '#222222',
    contrastRatio: 12.5
  },
  slate: {
    bgColor: '#D1CDC4',
    brushColor: '#1A1A1A',
    contrastRatio: 10.2
  },
  ink: {
    bgColor: '#1A1A1A',
    brushColor: '#D0D0D0',
    contrastRatio: 8.3
  }
};

export class UIController {
  private currentBrush: BrushType = 'fine';
  private currentTheme: ThemeType = 'rice';
  private callbacks: UIControllerCallbacks;
  private brushButtons: NodeListOf<HTMLButtonElement>;
  private themeButtons: NodeListOf<HTMLButtonElement>;
  private undoBtn: HTMLButtonElement;
  private redoBtn: HTMLButtonElement;
  private zoomDisplay: HTMLElement;
  private exportBtn: HTMLButtonElement;
  private appEl: HTMLElement;

  constructor(callbacks: UIControllerCallbacks) {
    this.callbacks = callbacks;

    this.brushButtons = document.querySelectorAll('.brush-btn');
    this.themeButtons = document.querySelectorAll('.theme-btn');
    this.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    this.redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
    this.zoomDisplay = document.getElementById('zoom-display') as HTMLElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.appEl = document.getElementById('app') as HTMLElement;

    this.bindEvents();
    this.applyTheme(this.currentTheme);
  }

  private bindEvents(): void {
    this.brushButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const brush = btn.dataset.brush as BrushType;
        this.setBrush(brush);
      });
    });

    this.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme as ThemeType;
        this.setTheme(theme);
      });
    });

    this.undoBtn.addEventListener('click', () => {
      this.callbacks.onUndo();
    });

    this.redoBtn.addEventListener('click', () => {
      this.callbacks.onRedo();
    });

    this.exportBtn.addEventListener('click', () => {
      this.callbacks.onExport();
    });
  }

  setBrush(brush: BrushType): void {
    if (brush === this.currentBrush) return;
    this.currentBrush = brush;

    this.brushButtons.forEach(btn => {
      const isActive = btn.dataset.brush === brush;
      btn.classList.toggle('active', isActive);
    });

    this.callbacks.onBrushChange(brush);
  }

  setTheme(theme: ThemeType): void {
    if (theme === this.currentTheme) return;
    this.currentTheme = theme;
    this.applyTheme(theme);

    this.themeButtons.forEach(btn => {
      const isActive = btn.dataset.theme === theme;
      btn.classList.toggle('active', isActive);
    });

    this.callbacks.onThemeChange(theme);
  }

  private applyTheme(theme: ThemeType): void {
    const config = THEMES[theme];
    this.appEl.style.backgroundColor = config.bgColor;
    this.updateToolbarStyles(theme);
  }

  private updateToolbarStyles(theme: ThemeType): void {
    const toolbars = document.querySelectorAll('.toolbar-left, .toolbar-right');
    const brushIcons = document.querySelectorAll('.brush-icon');
    const actionIcons = document.querySelectorAll('.action-icon');
    const zoomDisplay = document.querySelector('.zoom-display');

    if (theme === 'ink') {
      toolbars.forEach(el => {
        (el as HTMLElement).style.background = 'rgba(60, 60, 60, 0.7)';
        (el as HTMLElement).style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.3)';
      });
      brushIcons.forEach(el => {
        (el as SVGElement).style.stroke = '#E0E0E0';
      });
      actionIcons.forEach(el => {
        (el as SVGElement).style.stroke = '#E0E0E0';
      });
      if (zoomDisplay) {
        (zoomDisplay as HTMLElement).style.color = '#CCC';
      }
      document.querySelectorAll('.action-btn').forEach(el => {
        (el as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.15)';
      });
      document.querySelectorAll('.brush-btn').forEach(el => {
        (el as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.15)';
      });
      document.querySelectorAll('.divider').forEach(el => {
        (el as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
      });
    } else {
      toolbars.forEach(el => {
        (el as HTMLElement).style.background = 'rgba(255, 255, 255, 0.7)';
        (el as HTMLElement).style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.08)';
      });
      brushIcons.forEach(el => {
        (el as SVGElement).style.stroke = '#333';
      });
      actionIcons.forEach(el => {
        (el as SVGElement).style.stroke = '#333';
      });
      if (zoomDisplay) {
        (zoomDisplay as HTMLElement).style.color = '#555';
      }
      document.querySelectorAll('.action-btn').forEach(el => {
        (el as HTMLButtonElement).style.background = 'rgba(200, 200, 200, 0.3)';
      });
      document.querySelectorAll('.brush-btn').forEach(el => {
        (el as HTMLButtonElement).style.background = 'rgba(200, 200, 200, 0.3)';
      });
      document.querySelectorAll('.divider').forEach(el => {
        (el as HTMLElement).style.background = 'rgba(0, 0, 0, 0.1)';
      });
    }
  }

  getBrush(): BrushType {
    return this.currentBrush;
  }

  getTheme(): ThemeType {
    return this.currentTheme;
  }

  getThemeConfig(theme?: ThemeType): ThemeConfig {
    return THEMES[theme || this.currentTheme];
  }

  setZoom(zoom: number): void {
    this.zoomDisplay.textContent = `${zoom.toFixed(1)}x`;
  }

  setUndoEnabled(enabled: boolean): void {
    this.undoBtn.disabled = !enabled;
  }

  setRedoEnabled(enabled: boolean): void {
    this.redoBtn.disabled = !enabled;
  }

  setExportEnabled(enabled: boolean): void {
    this.exportBtn.disabled = !enabled;
  }
}

export { THEMES };
