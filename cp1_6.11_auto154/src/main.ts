import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { StatsManager } from './utils/StatsManager';

export const EventBus = new Phaser.Events.EventEmitter();

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1024,
  height: 768,
  backgroundColor: '#d4b68a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 600
    },
    max: {
      width: 1920,
      height: 1080
    }
  },
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  render: {
    pixelArt: false,
    antialias: true
  }
};

const statsManager = new StatsManager();

EventBus.on('stats:rotate', () => {
  statsManager.incrementRotations();
});

EventBus.on('stats:start', () => {
  statsManager.startTimer();
});

EventBus.on('stats:stop', () => {
  statsManager.stopTimer();
});

EventBus.on('stats:reset', () => {
  statsManager.reset();
});

EventBus.on('stats:trigger', (sequence: string) => {
  statsManager.addTriggerSequence(sequence);
});

EventBus.on('stats:get', (callback: (stats: { rotations: number; time: number; sequence: string[] }) => void) => {
  callback(statsManager.getStats());
});

const game = new Phaser.Game(GameConfig);

game.events.once('ready', () => {
  EventBus.emit('game:ready', statsManager);
});

export { game, statsManager };
