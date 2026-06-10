import { LevelEditor } from './editor';
import { PlayMode } from './player';
import { EntityType, CANVAS_WIDTH, CANVAS_HEIGHT, LevelData } from './types';

type AppMode = 'edit' | 'play';

const LOGIC_TICK_MS = 1000 / 60;

class App {
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;
  private editor: LevelEditor;
  private playMode: PlayMode;
  private mode: AppMode = 'edit';
  private lastTime = 0;
  private accumulator = 0;


  private entityPanel: HTMLElement;
  private statusText: HTMLElement;
  private hudLives: HTMLElement;
  private vignette: HTMLElement;
  private victoryModal: HTMLElement;
  private btnTest: HTMLElement;
  private btnBack: HTMLElement;
  private entityPanelEl: HTMLElement;
  private fileInput: HTMLInputElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.canvasWrapper = document.getElementById('canvasWrapper') as HTMLElement;
    this.entityPanel = document.getElementById('entityPanel') as HTMLElement;
    this.statusText = document.getElementById('statusText') as HTMLElement;
    this.hudLives = document.getElementById('hudLives') as HTMLElement;
    this.vignette = document.getElementById('vignette') as HTMLElement;
    this.victoryModal = document.getElementById('victoryModal') as HTMLElement;
    this.btnTest = document.getElementById('btnTest') as HTMLElement;
    this.btnBack = document.getElementById('btnBack') as HTMLElement;
    this.entityPanelEl = document.getElementById('entityPanel') as HTMLElement;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;

    this.editor = new LevelEditor(this.canvas);
    this.playMode = new PlayMode(this.canvas);

    this.editor.setStatusCallback(hasGap => this.updateStatus(hasGap));
    this.playMode.setCallbacks(
      () => this.showVictory(),
      lives => this.updateLives(lives)
    );

    this.initEntityIcons();
    this.bindEvents();
    this.switchMode('edit');
    this.startLoop();
  }

  private initEntityIcons(): void {
    const items = this.entityPanel.querySelectorAll<HTMLElement>('.entity-item');
    items.forEach(item => {
      const type = item.dataset.type as EntityType;
      const iconCanvas = item.querySelector<HTMLCanvasElement>('.entity-icon');
      if (iconCanvas && type) {
        this.editor.drawEntityIcon(iconCanvas, type);
      }
    });
  }

  private bindEvents(): void {
    const items = this.entityPanel.querySelectorAll<HTMLElement>('.entity-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type as EntityType;
        const current = this.editor.getSelectedTool();
        const newTool: EntityType | null = current === type ? null : type;
        this.editor.setSelectedTool(newTool);
        items.forEach(i => i.classList.toggle('selected',
          newTool !== null && i.dataset.type === newTool));
      });
    });

    this.canvas.addEventListener('click', e => {
      if (this.mode !== 'edit') return;
      const { x, y } = this.getCanvasCoords(e);
      this.editor.handleCanvasClick(x, y);
    });

    this.canvas.addEventListener('mousemove', e => {
      if (this.mode !== 'edit') return;
      const { x, y } = this.getCanvasCoords(e);
      this.editor.handleCanvasMove(x, y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.mode !== 'edit') return;
      this.editor.handleCanvasMove(-9999, -9999);
    });

    document.addEventListener('keydown', e => {
      if (this.mode === 'edit') {
        if (e.ctrlKey && e.code === 'KeyZ') {
          e.preventDefault();
          this.editor.undo();
        } else if (e.ctrlKey && e.code === 'KeyY') {
          e.preventDefault();
          this.editor.redo();
        }
      } else if (this.mode === 'play') {
        if (e.code === 'Escape') {
          this.switchMode('edit');
          return;
        }
        this.playMode.setKey(e.code, true);
      }
    });

    document.addEventListener('keyup', e => {
      if (this.mode === 'play') {
        this.playMode.setKey(e.code, false);
      }
    });

    window.addEventListener('blur', () => {
      this.playMode.resetKeys();
    });

    this.btnTest.addEventListener('click', () => this.enterPlayMode());
    this.btnBack.addEventListener('click', () => this.switchMode('edit'));
    document.getElementById('btnVictoryBack')!.addEventListener('click', () => {
      this.victoryModal.classList.remove('visible');
      this.switchMode('edit');
    });

    document.getElementById('btnSave')!.addEventListener('click', () => this.saveLevel());
    document.getElementById('btnLoad')!.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', e => this.loadLevel(e));

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    if (this.mode === 'edit') {
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    } else {
      return this.playMode.canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  private handleResize(): void {
    if (this.mode === 'edit') {
      this.canvas.classList.remove('play-mode');
      this.canvas.width = CANVAS_WIDTH;
      this.canvas.height = CANVAS_HEIGHT;
      this.playMode.setScale(1, 1, 0, 0);
    } else {
      this.canvas.classList.add('play-mode');
      const w = this.canvasWrapper.clientWidth;
      const h = this.canvasWrapper.clientHeight;
      this.canvas.width = w;
      this.canvas.height = h;
      const scale = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT);
      const offX = (w - CANVAS_WIDTH * scale) / 2;
      const offY = (h - CANVAS_HEIGHT * scale) / 2;
      this.playMode.setScale(scale, scale, offX, offY);
    }
    this.editor.forceDirty();
  }

  private enterPlayMode(): void {
    const entities = this.editor.getEntities();
    if (!entities.some(e => e.type === 'platform')) {
      alert('请至少放置一个平台！');
      return;
    }
    if (!entities.some(e => e.type === 'goal')) {
      alert('请放置终点旗！');
      return;
    }
    const ok = this.playMode.loadLevel(entities);
    if (!ok) {
      alert('关卡加载失败，请检查平台布置。');
      return;
    }
    this.switchMode('play');
  }

  private switchMode(mode: AppMode): void {
    this.mode = mode;
    this.playMode.resetKeys();

    if (mode === 'edit') {
      this.entityPanelEl.classList.remove('hidden');
      this.btnTest.classList.remove('hidden');
      this.btnBack.classList.add('hidden');
      this.hudLives.classList.remove('visible');
      this.vignette.classList.remove('visible');
      this.victoryModal.classList.remove('visible');
    } else {
      this.entityPanelEl.classList.add('hidden');
      this.btnTest.classList.add('hidden');
      this.btnBack.classList.remove('hidden');
      this.hudLives.classList.add('visible');
      this.vignette.classList.add('visible');
    }
    this.handleResize();
  }

  private showVictory(): void {
    this.victoryModal.classList.add('visible');
  }

  private updateLives(lives: number): void {
    this.hudLives.textContent = '❤'.repeat(Math.max(0, lives));
  }

  private updateStatus(hasGap: boolean): void {
    if (hasGap) {
      this.statusText.textContent = '⚠ 存在不可通过间隙，请检查平台间距！';
      this.statusText.className = 'status-warning';
    } else {
      this.statusText.textContent = '就绪';
      this.statusText.className = 'status-ok';
    }
  }

  private saveLevel(): void {
    const data = this.editor.exportLevel();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private loadLevel(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as LevelData;
        this.editor.importLevel(data);
      } catch {
        alert('文件格式错误，无法加载关卡。');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private startLoop(): void {
    const tick = (time: number) => {
      if (this.lastTime === 0) this.lastTime = time;
      let delta = time - this.lastTime;
      this.lastTime = time;
      if (delta > 100) delta = 100;

      this.accumulator += delta;
      while (this.accumulator >= LOGIC_TICK_MS) {
        if (this.mode === 'play') {
          this.playMode.update();
        }
        this.accumulator -= LOGIC_TICK_MS;
      }

      if (this.mode === 'edit') {
        this.editor.render();
      } else {
        this.playMode.render();
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
