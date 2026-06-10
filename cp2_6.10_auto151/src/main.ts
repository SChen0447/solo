import { EcosystemRenderer } from './renderer';
import { UIController } from './controls';
import { generateEcosystem } from './ecosystem';
import type { EcosystemType, DensityType, LayerType, PlantData } from './ecosystem';

class App {
  private renderer: EcosystemRenderer;
  private uiController: UIController;
  private currentEcosystem: EcosystemType;
  private currentDensity: DensityType;

  constructor() {
    this.renderer = new EcosystemRenderer('canvas-container');

    this.uiController = new UIController({
      onEcosystemChange: (type) => this.handleEcosystemChange(type),
      onDensityChange: (density) => this.handleDensityChange(density),
      onSunAngleChange: (angle) => this.handleSunAngleChange(angle),
      onLayerOpacityChange: (layer, opacity) => this.handleLayerOpacityChange(layer, opacity),
      onResetView: () => this.handleResetView()
    });

    this.currentEcosystem = this.uiController.getCurrentEcosystem();
    this.currentDensity = this.uiController.getCurrentDensity();

    this.renderer.setOnHoverCallback((plant) => this.handlePlantHover(plant));

    this.init();
    this.animate();
  }

  private init(): void {
    const data = generateEcosystem(this.currentEcosystem, this.currentDensity);
    this.renderer.loadEcosystem(data);
    this.renderer.setSunAngle(this.uiController.getCurrentSunAngle());
    this.uiController.updateStats(data.stats);
  }

  private handleEcosystemChange(type: EcosystemType): void {
    this.currentEcosystem = type;
    this.regenerateEcosystem();
  }

  private handleDensityChange(density: DensityType): void {
    this.currentDensity = density;
    this.regenerateEcosystem();
  }

  private handleSunAngleChange(angle: number): void {
    this.renderer.setSunAngle(angle);
  }

  private handleLayerOpacityChange(layer: LayerType, opacity: number): void {
    this.renderer.setLayerOpacity(layer, opacity);
  }

  private handleResetView(): void {
    this.renderer.resetCamera();
  }

  private handlePlantHover(plant: PlantData | null): void {
    this.uiController.showPlantInfo(plant);
  }

  private regenerateEcosystem(): void {
    const data = generateEcosystem(this.currentEcosystem, this.currentDensity);
    this.renderer.loadEcosystem(data);
    this.uiController.updateStats(data.stats);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.renderer.update();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
