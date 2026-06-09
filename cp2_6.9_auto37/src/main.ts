import { Simulator } from './simulator';

function init() {
  try {
    const simulator = new Simulator('canvas-container');
    simulator.start();
    console.log('3D城市交通流量可视化应用已启动');
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
