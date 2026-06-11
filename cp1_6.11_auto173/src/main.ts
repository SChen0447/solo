import { StarSystem } from './starData';
import { SceneRenderer } from './SceneRenderer';
import { ConstellationManager } from './ConstellationManager';
import { UIManager } from './UIManager';

function init(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Container element #app not found');
  }

  const starSystem = new StarSystem();

  const sceneRenderer = new SceneRenderer(container, starSystem);

  const constellationManager = new ConstellationManager(starSystem, sceneRenderer);

  const uiManager = new UIManager(container, sceneRenderer, constellationManager);

  sceneRenderer.animate();

  console.log(
    `%c✦ 黄道星图 · 恒星运动模拟器 ✦%c\n已加载 ${starSystem.stars.length} 颗恒星，${starSystem.constellationLines.length} 个星座`,
    'color: #aaccee; font-size: 16px; font-weight: bold;',
    'color: #888; font-size: 12px;'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
