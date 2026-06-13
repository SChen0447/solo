import { GameEngine } from './GameEngine';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const comboEl = document.getElementById('combo-display') as HTMLElement;
const energyBarEl = document.getElementById('energy-bar') as HTMLElement;
const beatIndicatorEl = document.getElementById('beat-indicator') as HTMLElement;
const beatContainerEl = document.getElementById('beat-progress-container') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLElement;

const game = new GameEngine(canvas);
game.setupUI(comboEl, energyBarEl, beatIndicatorEl, beatContainerEl, startBtn);
