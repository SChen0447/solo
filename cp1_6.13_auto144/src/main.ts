import './styles.css';
import { SolarSystem } from './SolarSystem';
import { UI } from './UI';

function init(): void {
  const appContainer = document.getElementById('app');
  const uiContainer = document.getElementById('ui-container');

  if (!appContainer || !uiContainer) {
    console.error('Container elements not found');
    return;
  }

  const solarSystem = new SolarSystem({
    container: appContainer
  });

  const ui = new UI(uiContainer, solarSystem);

  window.addEventListener('beforeunload', () => {
    solarSystem.dispose();
    ui.dispose();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
