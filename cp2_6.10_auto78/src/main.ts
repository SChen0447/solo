import { BlendRenderer, BackgroundBlendRenderer, type BlendMode } from './renderer';
import { TextureManager, type TextureInfo } from './textureManager';
import { UIController, type SectionType } from './uiController';
import { debounce } from 'lodash';

class BlendSandboxApp {
  private textureManager: TextureManager;
  private mixRenderer: BlendRenderer | null = null;
  private bgRenderer: BackgroundBlendRenderer | null = null;
  private uiController: UIController | null = null;

  private mixCanvas: HTMLCanvasElement;
  private bgCanvas: HTMLCanvasElement;

  private currentMixMode: BlendMode = 'multiply';
  private currentBgMode: BlendMode = 'multiply';
  private mixTexture: TextureInfo | null = null;
  private bgTexture: TextureInfo | null = null;

  constructor() {
    this.textureManager = new TextureManager();
    this.mixCanvas = document.getElementById('mixBlendCanvas') as HTMLCanvasElement;
    this.bgCanvas = document.getElementById('bgBlendCanvas') as HTMLCanvasElement;
  }

  public async init(): Promise<void> {
    await this.textureManager.loadTextures();

    const textures = this.textureManager.getTextures();
    if (textures.length > 0) {
      this.mixTexture = textures[0];
      this.bgTexture = textures[0];
    }

    this.mixRenderer = new BlendRenderer(this.mixCanvas, {
      blendMode: this.currentMixMode,
      texture: this.mixTexture?.image
    });

    this.bgRenderer = new BackgroundBlendRenderer(this.bgCanvas, {
      blendMode: this.currentBgMode,
      texture: this.bgTexture?.image
    });

    this.uiController = new UIController(this.textureManager, {
      onMixBlendModeChange: (mode: BlendMode) => this.handleMixBlendModeChange(mode),
      onBgBlendModeChange: (mode: BlendMode) => this.handleBgBlendModeChange(mode),
      onTextureApply: (texture: TextureInfo, section: SectionType) =>
        this.handleTextureApply(texture, section),
      onResize: debounce(() => this.handleResize(), 100)
    });

    this.uiController.setMixBlendMode(this.currentMixMode);
    this.uiController.setBgBlendMode(this.currentBgMode);
    this.uiController.setActiveSection('mix');
  }

  private handleMixBlendModeChange(mode: BlendMode): void {
    this.currentMixMode = mode;
    this.mixRenderer?.setOptions({ blendMode: mode });
  }

  private handleBgBlendModeChange(mode: BlendMode): void {
    this.currentBgMode = mode;
    this.bgRenderer?.setOptions({ blendMode: mode });
  }

  private handleTextureApply(texture: TextureInfo, section: SectionType): void {
    if (section === 'mix') {
      this.mixTexture = texture;
      this.mixRenderer?.setOptions({ texture: texture.image });
    } else {
      this.bgTexture = texture;
      this.bgRenderer?.setOptions({ texture: texture.image });
    }
  }

  private handleResize(): void {
    this.mixRenderer?.resize();
    this.bgRenderer?.resize();
  }

  public destroy(): void {
    this.mixRenderer?.destroy();
    this.bgRenderer?.destroy();
    this.uiController?.destroy();
  }
}

function bootstrap(): void {
  const app = new BlendSandboxApp();
  app.init().catch((err) => {
    console.error('Failed to initialize Blend Sandbox:', err);
  });

  window.addEventListener('beforeunload', () => {
    app.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
