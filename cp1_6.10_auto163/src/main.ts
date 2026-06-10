import { initUI, cleanupUI } from './ui';
import { requestPermission, getPermissionStatus } from './notify';

function mountApp(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('未找到 #app 容器');
    return;
  }

  const status = getPermissionStatus();
  if (status === 'default') {
    requestPermission();
  }

  initUI(container);

  window.addEventListener('beforeunload', () => {
    cleanupUI();
  });

  window.addEventListener('hashchange', () => {
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
