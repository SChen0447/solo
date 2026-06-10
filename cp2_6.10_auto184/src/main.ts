import { SceneManager } from './sceneManager';
import { PhysicsEngine } from './physicsEngine';
import type { RouteData, EditorMode } from './types';

const STORAGE_KEY = 'climbing_route_data';

class App {
  private canvas: HTMLCanvasElement;
  private physicsEngine: PhysicsEngine;
  private sceneManager: SceneManager;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;

    this.physicsEngine = new PhysicsEngine();
    this.sceneManager = new SceneManager(this.canvas, this.physicsEngine);

    this.initEventListeners();
    this.loadFromStorage();
    this.sceneManager.render();
  }

  private initEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('resize', () => this.sceneManager.resizeCanvas());

    document.getElementById('btnAddHold')?.addEventListener('click', () => this.setMode('hold'));
    document.getElementById('btnAddAnchor')?.addEventListener('click', () => this.setMode('anchor'));
    document.getElementById('btnSimulate')?.addEventListener('click', () => this.toggleSimulation());
    document.getElementById('btnExport')?.addEventListener('click', () => this.exportRoute());
    document.getElementById('btnImport')?.addEventListener('click', () => this.triggerImport());
    document.getElementById('fileInput')?.addEventListener('change', (e) => this.onFileImport(e));
  }

  private onCanvasMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.sceneManager.handleMouseDown(x, y, e.button, e.shiftKey);
    this.saveToStorage();
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.sceneManager.handleMouseMove(x, y);
  }

  private onCanvasMouseUp(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.sceneManager.handleMouseUp(x, y);
    this.saveToStorage();
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.sceneManager.handleKeyDown(e.key);
    this.saveToStorage();
  }

  private setMode(mode: EditorMode): void {
    this.sceneManager.setEditorMode(mode);

    document.querySelectorAll('.tool-btn[data-mode]').forEach(btn => {
      btn.classList.remove('active');
    });

    const btn = document.querySelector(`.tool-btn[data-mode="${mode}"]`) as HTMLButtonElement;
    if (btn) {
      btn.classList.add('active');
    }
  }

  private toggleSimulation(): void {
    const btn = document.getElementById('btnSimulate') as HTMLButtonElement;
    if (this.sceneManager.getIsSimulating()) {
      this.sceneManager.stopSimulation();
      if (btn) {
        btn.querySelector('.label')!.textContent = '模拟攀爬';
        btn.querySelector('.icon')!.textContent = '▶';
        btn.classList.remove('active');
      }
    } else {
      this.sceneManager.startSimulation();
      if (btn) {
        btn.querySelector('.label')!.textContent = '停止模拟';
        btn.querySelector('.icon')!.textContent = '■';
        btn.classList.add('active');
      }
    }
  }

  private exportRoute(): void {
    const data = this.sceneManager.exportRoute();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `climbingRoute_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private triggerImport(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  private onFileImport(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as RouteData;
        this.sceneManager.importRoute(data);
        this.saveToStorage();
      } catch (err) {
        console.error('Failed to import route:', err);
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private saveToStorage(): void {
    try {
      const data = this.sceneManager.exportRoute();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save to storage:', err);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as RouteData;
        this.sceneManager.importRoute(data);
      }
    } catch (err) {
      console.error('Failed to load from storage:', err);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
