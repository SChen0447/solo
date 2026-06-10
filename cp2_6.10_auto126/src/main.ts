import { App } from './app';

function bootstrap(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('[main] 找不到 #app 容器');
    return;
  }
  const app = new App(container);
  (window as unknown as { __app?: App }).__app = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
