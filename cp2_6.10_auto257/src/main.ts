import { TileMapEditor } from './TileMapEditor';
import { PathSimulator } from './PathSimulator';
import { UIRenderer } from './UIRenderer';

function bootstrap(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('Container #app not found');
    return;
  }

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 800;
  mapCanvas.height = 600;

  const tileMapEditor = new TileMapEditor(mapCanvas);
  const pathSimulator = new PathSimulator(tileMapEditor);
  pathSimulator.initVisitInfo();

  new UIRenderer(app, tileMapEditor, pathSimulator);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
