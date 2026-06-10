import { UIController } from './uiController';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const controller = new UIController();
    controller.initialize();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #e94560;">
          <h2>应用初始化失败</h2>
          <p>${error instanceof Error ? error.message : '未知错误'}</p>
        </div>
      `;
    }
  }
});
