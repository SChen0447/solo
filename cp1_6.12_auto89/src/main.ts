import { BattleManager } from './BattleManager';

const canvas = document.getElementById('battleCanvas') as HTMLCanvasElement;
const manager = new BattleManager(canvas);
manager.start();
