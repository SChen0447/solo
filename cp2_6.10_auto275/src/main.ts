import { SceneManager } from './SceneManager';
import { RootSystem } from './RootSystem';
import { RootController } from './RootController';
import { UIPanel } from './UIPanel';

class App {
  private sceneManager: SceneManager;
  private rootSystem: RootSystem;
  private rootController: RootController;
  private uiPanel: UIPanel;
  private idleFrameId: number | null = null;

  constructor() {
    this.sceneManager = new SceneManager('scene-container');

    this.rootSystem = new RootSystem(this.sceneManager.scene);
    this.rootSystem.generatePlants(4);

    this.uiPanel = new UIPanel({
      onStartGrowth: this._handleStartGrowth.bind(this),
      onResetGrowth: this._handleResetGrowth.bind(this),
      onSoilOpacityChange: this._handleSoilOpacityChange.bind(this),
      onGrowthSpeedChange: this._handleGrowthSpeedChange.bind(this)
    });

    this.rootController = new RootController(
      this.sceneManager,
      this.rootSystem,
      {
        growthSpeed: 1.0,
        onPlantSelected: this._handlePlantSelected.bind(this),
        onPlantHover: this._handlePlantHover.bind(this),
        onGrowthComplete: this._handleGrowthComplete.bind(this),
        onGrowthUpdate: this._handleGrowthUpdate.bind(this)
      }
    );

    this._startIdleLoop();

    window.addEventListener('beforeunload', this._dispose.bind(this));
  }

  private _startIdleLoop(): void {
    const idleRender = () => {
      if (!this.rootController.isGrowing) {
        this.rootController.renderIdle();
      }
      this.idleFrameId = requestAnimationFrame(idleRender);
    };
    idleRender();
  }

  private _handleStartGrowth(): void {
    this.uiPanel.setGrowButtonState(true);
    this.rootController.startGrowth();
  }

  private _handleResetGrowth(): void {
    this.uiPanel.setGrowButtonState(false);
    this.rootController.resetGrowth();
    this.uiPanel.updatePlantInfo(null);
  }

  private _handleSoilOpacityChange(opacity: number): void {
    this.sceneManager.setSoilOpacity(opacity);
  }

  private _handleGrowthSpeedChange(speed: number): void {
    this.rootController.setGrowthSpeed(speed);
  }

  private _handlePlantSelected(plantId: string | null): void {
    if (plantId) {
      const info = this.rootSystem.getPlantInfo(plantId);
      this.uiPanel.updatePlantInfo(info);
    } else {
      this.uiPanel.updatePlantInfo(null);
    }
  }

  private _handlePlantHover(
    info: { depth: number; color: number } | null,
    x: number,
    y: number
  ): void {
    this.uiPanel.showTooltip(info, x, y);
  }

  private _handleGrowthComplete(): void {
    this.uiPanel.setGrowButtonState(false);
    const selected = this.rootController.getSelectedPlant();
    if (selected) {
      const info = this.rootSystem.getPlantInfo(selected.id);
      this.uiPanel.updatePlantInfo(info);
    }
  }

  private _handleGrowthUpdate(): void {
    const selected = this.rootController.getSelectedPlant();
    if (selected) {
      const info = this.rootSystem.getPlantInfo(selected.id);
      if (info) {
        this.uiPanel.updatePlantInfo(info);
      }
    }
  }

  private _dispose(): void {
    if (this.idleFrameId !== null) {
      cancelAnimationFrame(this.idleFrameId);
    }
    this.rootController.dispose();
    this.sceneManager.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
