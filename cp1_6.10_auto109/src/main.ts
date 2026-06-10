import { ColorMatrix } from './colorMatrix';
import { ColorChecker } from './colorChecker';
import { UIController } from './uiController';

function bootstrap(): void {
  const colorMatrix = new ColorMatrix(5, 8, 5);
  const colorChecker = new ColorChecker();
  const ui = new UIController(colorMatrix, colorChecker);
  ui.initLayout();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
