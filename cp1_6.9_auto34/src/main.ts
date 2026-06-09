import * as THREE from 'three';
import { Environment } from './Environment';
import { ElementSystem } from './ElementSystem';
import type { ElementType, FusionResultType } from './ElementSystem';
import { RecipeList } from './RecipeList';
import { MagicCircle } from './MagicCircle';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private environment: Environment;
  private elementSystem: ElementSystem;
  private recipeList: RecipeList;
  private magicCircle: MagicCircle;

  private container: HTMLElement;

  private energyBar: HTMLElement;
  private energyText: HTMLElement;
  private cooldownTimer: HTMLElement;
  private cooldownProgress: SVGCircleElement;
  private cooldownText: HTMLElement;
  private comboIndicator: HTMLElement;
  private comboIcon: HTMLElement;
  private comboText: HTMLElement;

  private baseScale: number = 1;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.energyBar = document.getElementById('energy-bar')!;
    this.energyText = document.getElementById('energy-text')!;
    this.cooldownTimer = document.getElementById('cooldown-timer')!;
    this.cooldownProgress = document.querySelector('.cooldown-ring .progress') as SVGCircleElement;
    this.cooldownText = document.getElementById('cooldown-text')!;
    this.comboIndicator = document.getElementById('combo-indicator')!;
    this.comboIcon = document.getElementById('combo-icon')!;
    this.comboText = document.getElementById('combo-text')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 500);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.environment = new Environment();
    this.scene.add(this.environment.group);

    this.elementSystem = new ElementSystem();

    this.recipeList = new RecipeList('recipe-list', this.elementSystem);

    this.magicCircle = new MagicCircle(this.scene, this.camera, this.renderer);
    this.scene.add(this.magicCircle.group);

    this.setupCallbacks();
    this.setupResize();
    this.updateEnergyUI();
    this.updateCooldownUI();
    this.resize();

    this.animate();
  }

  private setupCallbacks(): void {
    this.magicCircle.setFusionCallback((elements: ElementType[]) => {
      const result = this.elementSystem.attemptFusion(elements);
      if (result.success && result.recipe) {
        this.magicCircle.triggerFusion(result.recipe.result, elements);
        this.recipeList.addRecipe(result.recipe);
        this.showComboIndicator(result.recipe.result, result.recipe.resultName);
        this.environment.triggerBurst();
        this.magicCircle.clearCrystalsFromCircle();
      }
    });

    this.magicCircle.setElementsChangedCallback((elements: ElementType[]) => {
      this.environment.updateElementTint(elements);
    });

    this.recipeList.onReplay((elements: ElementType[]) => {
      const result = this.elementSystem.replayRecipe(elements);
      if (result.success && result.recipe) {
        this.magicCircle.replayFusion(result.recipe.result, elements);
        this.showComboIndicator(result.recipe.result, result.recipe.resultName);
        this.environment.triggerBurst();
        this.recipeList.updateDisabledState();
      }
    });

    this.elementSystem.onEnergyChange((energy, maxEnergy, isLow) => {
      this.updateEnergyUI();
      this.recipeList.updateDisabledState();
    });

    this.elementSystem.onCooldownChange(() => {
      this.updateCooldownUI();
    });
  }

  private updateEnergyUI(): void {
    const { energy, maxEnergy } = this.elementSystem;
    const percentage = (energy / maxEnergy) * 100;
    this.energyBar.style.width = `${percentage}%`;
    this.energyText.textContent = `${Math.round(energy)} / ${maxEnergy}`;

    if (this.elementSystem.isLowEnergy()) {
      this.energyBar.classList.add('warning');
    } else {
      this.energyBar.classList.remove('warning');
    }
  }

  private updateCooldownUI(): void {
    const { cooldownRemaining, cooldownTime, isOnCooldown } = this.elementSystem;

    if (isOnCooldown) {
      this.cooldownTimer.classList.add('active');
      const circumference = 2 * Math.PI * 17;
      const progress = cooldownRemaining / cooldownTime;
      this.cooldownProgress.style.strokeDashoffset = `${circumference * (1 - progress)}`;
      this.cooldownText.textContent = `${Math.ceil(cooldownRemaining)}`;
    } else {
      this.cooldownTimer.classList.remove('active');
    }
  }

  private showComboIndicator(resultType: FusionResultType, resultName: string): void {
    this.comboIcon.className = `element-icon ${resultType}`;
    const info = ElementSystem.getResultInfo(resultType);
    this.comboIcon.textContent = info.emoji;
    this.comboText.textContent = resultName;

    this.comboIndicator.classList.add('visible');

    setTimeout(() => {
      this.comboIndicator.classList.remove('visible');
    }, 2000);
  }

  private setupResize(): void {
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    const minSize = Math.min(width, height);
    this.baseScale = Math.max(0.5, Math.min(1.5, minSize / 800));
    this.magicCircle.resize(this.baseScale);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    this.environment.update(delta);
    this.elementSystem.update(delta);
    this.magicCircle.update(delta, elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.environment.dispose();
    this.magicCircle.dispose();
    this.renderer.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
