import { SceneManager } from './SceneManager';
import { WindowController } from './WindowController';

export class ControlPanel {
  private gearIcon: HTMLElement;
  private panel: HTMLElement;
  private sceneSwitchBtn: HTMLElement;
  private resetBtn: HTMLElement;
  private sceneManager: SceneManager;
  private windowController: WindowController;
  private isOpen = false;

  constructor(
    sceneManager: SceneManager,
    windowController: WindowController
  ) {
    const gearIcon = document.getElementById('gear-icon');
    const panel = document.getElementById('control-panel');
    const sceneSwitchBtn = document.getElementById('btn-scene-switch');
    const resetBtn = document.getElementById('btn-reset');

    if (!gearIcon || !panel || !sceneSwitchBtn || !resetBtn) {
      throw new Error('Control panel elements not found');
    }

    this.gearIcon = gearIcon;
    this.panel = panel;
    this.sceneSwitchBtn = sceneSwitchBtn;
    this.resetBtn = resetBtn;
    this.sceneManager = sceneManager;
    this.windowController = windowController;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.gearIcon.addEventListener('click', () => this.toggle());
    this.sceneSwitchBtn.addEventListener('click', () => this.onSceneSwitch());
    this.resetBtn.addEventListener('click', () => this.onReset());
  }

  private toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.panel.classList.add('active');
    } else {
      this.panel.classList.remove('active');
    }
  }

  private onSceneSwitch(): void {
    this.sceneManager.applyPreset();
  }

  private onReset(): void {
    this.sceneManager.reset();
    this.windowController.reset();
  }

  open(): void {
    this.isOpen = true;
    this.panel.classList.add('active');
  }

  close(): void {
    this.isOpen = false;
    this.panel.classList.remove('active');
  }
}
