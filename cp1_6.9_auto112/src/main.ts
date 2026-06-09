import { createSketch, StarTrailSketch } from './sketch';

export interface AppState {
  sketch: StarTrailSketch | null;
}

export const globalState: AppState = {
  sketch: null
};

function initApp(): void {
  const containerId = 'app';

  try {
    globalState.sketch = createSketch(containerId);
  } catch (error) {
    console.error('Failed to initialize Star Trail Dancer:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
