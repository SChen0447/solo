import { GridManager } from './gridManager';
import { FoldEngine } from './foldEngine';
import { getPreset } from './presets';

type Mode = '2d' | '3d';

class OrigamiApp {
  private gridManager: GridManager;
  private foldEngine: FoldEngine;
  private mode: Mode = '2d';
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;
  
  private angleSlider: HTMLInputElement;
  private angleValue: HTMLElement;
  private presetSelect: HTMLSelectElement;
  private foldBtn: HTMLButtonElement;
  private unfoldBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private undoBtn: HTMLButtonElement;
  private historyList: HTMLElement;
  private historyCount: HTMLElement;
  private modeIndicator: HTMLElement;
  private toggleBtns: NodeListOf<HTMLButtonElement>;
  private mobileToggle: HTMLButtonElement;
  private panelLeft: HTMLElement;
  private panelRight: HTMLElement;
  private mobilePanelOpen: boolean = false;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
    
    this.angleSlider = document.getElementById('angleSlider') as HTMLInputElement;
    this.angleValue = document.getElementById('angleValue') as HTMLElement;
    this.presetSelect = document.getElementById('presetSelect') as HTMLSelectElement;
    this.foldBtn = document.getElementById('foldBtn') as HTMLButtonElement;
    this.unfoldBtn = document.getElementById('unfoldBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.historyList = document.getElementById('historyList') as HTMLElement;
    this.historyCount = document.getElementById('historyCount') as HTMLElement;
    this.modeIndicator = document.getElementById('modeIndicator') as HTMLElement;
    this.toggleBtns = document.querySelectorAll('.toggle-btn');
    this.mobileToggle = document.getElementById('mobileToggle') as HTMLButtonElement;
    this.panelLeft = document.querySelector('.panel-left') as HTMLElement;
    this.panelRight = document.querySelector('.panel-right') as HTMLElement;
    
    this.gridManager = new GridManager(this.canvas);
    this.foldEngine = new FoldEngine(this.canvasWrapper);
    
    this.hideFoldEngineCanvas();
    
    this.bindEvents();
    this.resize();
    this.updateHistoryUI();
  }

  private hideFoldEngineCanvas(): void {
    const foldCanvas = this.foldEngine.getDomElement();
    foldCanvas.style.display = 'none';
  }

  private showFoldEngineCanvas(): void {
    const foldCanvas = this.foldEngine.getDomElement();
    foldCanvas.style.display = 'block';
  }

  private bindEvents(): void {
    this.toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const foldType = btn.dataset.foldType as 'mountain' | 'valley';
        if (foldType) {
          this.setFoldType(foldType);
        }
      });
    });
    
    this.angleSlider.addEventListener('input', () => {
      const angle = parseInt(this.angleSlider.value);
      this.angleValue.textContent = `${angle}°`;
      this.foldEngine.setFoldAngle(angle);
    });
    
    this.presetSelect.addEventListener('change', () => {
      const presetName = this.presetSelect.value;
      if (presetName) {
        this.loadPreset(presetName);
      }
    });
    
    this.foldBtn.addEventListener('click', () => {
      this.doFold();
    });
    
    this.unfoldBtn.addEventListener('click', () => {
      this.doUnfold();
    });
    
    this.clearBtn.addEventListener('click', () => {
      if (this.mode === '3d') return;
      this.gridManager.clear();
    });
    
    this.undoBtn.addEventListener('click', () => {
      if (this.mode === '3d') return;
      this.gridManager.undo();
      this.updateHistoryUI();
    });
    
    this.mobileToggle.addEventListener('click', () => {
      this.toggleMobilePanel();
    });
    
    this.gridManager.setOnCreasesChange(() => {
      this.updateFoldButtonState();
    });
    
    this.gridManager.setOnHistoryChange(() => {
      this.updateHistoryUI();
    });
    
    window.addEventListener('resize', () => {
      this.resize();
    });
    
    this.updateFoldButtonState();
  }

  private setFoldType(type: 'mountain' | 'valley'): void {
    this.gridManager.setFoldType(type);
    
    this.toggleBtns.forEach(btn => {
      const btnType = btn.dataset.foldType;
      btn.classList.toggle('active', btnType === type);
    });
  }

  private loadPreset(name: string): void {
    const preset = getPreset(name);
    if (!preset) return;
    
    if (this.mode === '3d') {
      this.switchTo2D();
    }
    
    this.gridManager.setCreases(preset.creases, `加载${preset.name}预设`);
    this.angleSlider.value = preset.foldAngle.toString();
    this.angleValue.textContent = `${preset.foldAngle}°`;
    this.foldEngine.setFoldAngle(preset.foldAngle);
    this.updateHistoryUI();
    
    setTimeout(() => {
      this.doFold();
    }, 500);
  }

  private doFold(): void {
    if (this.mode === '3d' || this.foldEngine.isAnimating()) return;
    
    const creases = this.gridManager.getCreases();
    if (creases.length === 0) return;
    
    this.foldEngine.setCreases(creases);
    this.switchTo3D();
    
    this.foldEngine.fold(() => {
      this.updateUnfoldButtonState();
    });
  }

  private doUnfold(): void {
    if (this.mode === '2d' || this.foldEngine.isAnimating()) return;
    
    this.foldEngine.unfold(() => {
      this.switchTo2D();
      this.presetSelect.value = '';
    });
  }

  private switchTo3D(): void {
    this.mode = '3d';
    this.modeIndicator.textContent = '3D 折叠模式';
    this.canvas.style.display = 'none';
    this.showFoldEngineCanvas();
    this.updateFoldButtonState();
    this.updateClearAndUndoState();
  }

  private switchTo2D(): void {
    this.mode = '2d';
    this.modeIndicator.textContent = '2D 绘制模式';
    this.canvas.style.display = 'block';
    this.hideFoldEngineCanvas();
    this.gridManager.draw();
    this.updateFoldButtonState();
    this.updateClearAndUndoState();
  }

  private updateFoldButtonState(): void {
    const creases = this.gridManager.getCreases();
    const hasCreases = creases.length > 0;
    const is3D = this.mode === '3d';
    
    this.foldBtn.disabled = is3D || !hasCreases || this.foldEngine.isAnimating();
    this.foldBtn.style.opacity = this.foldBtn.disabled ? '0.5' : '1';
    this.foldBtn.style.cursor = this.foldBtn.disabled ? 'not-allowed' : 'pointer';
  }

  private updateUnfoldButtonState(): void {
    const is2D = this.mode === '2d';
    
    this.unfoldBtn.disabled = is2D || this.foldEngine.isAnimating();
    this.unfoldBtn.style.opacity = this.unfoldBtn.disabled ? '0.5' : '1';
    this.unfoldBtn.style.cursor = this.unfoldBtn.disabled ? 'not-allowed' : 'pointer';
  }

  private updateClearAndUndoState(): void {
    const is3D = this.mode === '3d';
    
    this.clearBtn.disabled = is3D;
    this.clearBtn.style.opacity = is3D ? '0.5' : '1';
    this.clearBtn.style.cursor = is3D ? 'not-allowed' : 'pointer';
    
    this.undoBtn.disabled = is3D || this.gridManager.getHistoryCount() === 0;
    this.undoBtn.style.opacity = this.undoBtn.disabled ? '0.5' : '1';
    this.undoBtn.style.cursor = this.undoBtn.disabled ? 'not-allowed' : 'pointer';
  }

  private updateHistoryUI(): void {
    const count = this.gridManager.getHistoryCount();
    this.historyCount.textContent = `${count}/10`;
    
    const descriptions = this.gridManager.getHistoryDescriptions();
    
    if (descriptions.length === 0) {
      this.historyList.innerHTML = '<div class="history-empty">暂无操作记录</div>';
      return;
    }
    
    const reversed = [...descriptions].reverse();
    this.historyList.innerHTML = reversed.map((desc, i) => 
      `<div class="history-item" style="animation-delay: ${i * 0.05}s">${desc}</div>`
    ).join('');
    
    this.updateClearAndUndoState();
  }

  private toggleMobilePanel(): void {
    this.mobilePanelOpen = !this.mobilePanelOpen;
    this.panelLeft.classList.toggle('active', this.mobilePanelOpen);
    this.panelRight.classList.toggle('active', this.mobilePanelOpen);
  }

  private resize(): void {
    const wrapper = this.canvasWrapper;
    const rect = wrapper.getBoundingClientRect();
    
    const padding = 40;
    const size = Math.min(rect.width, rect.height) - padding * 2;
    
    this.gridManager.resize(size, size);
    this.foldEngine.resize(rect.width, rect.height);
    
    const foldCanvas = this.foldEngine.getDomElement();
    foldCanvas.style.position = 'absolute';
    foldCanvas.style.top = '50%';
    foldCanvas.style.left = '50%';
    foldCanvas.style.transform = 'translate(-50%, -50%)';
  }

  start(): void {
    this.gridManager.draw();
    requestAnimationFrame(() => {
      this.resize();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new OrigamiApp();
  app.start();
});
