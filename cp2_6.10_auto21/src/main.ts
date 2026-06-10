import { UIController } from './uiController';

function initApp(): void {
  const previewElement = document.getElementById('previewElement');
  
  if (!previewElement) {
    console.error('预览元素未找到');
    return;
  }

  const uiController = new UIController(previewElement);

  window.addEventListener('beforeunload', () => {
    uiController.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
