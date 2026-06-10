import { PianoKeyboard } from './pianoKeyboard.js';
import { AudioEngine } from './audioEngine.js';
import { UIController } from './uiController.js';

const audioEngine = new AudioEngine();
const uiController = new UIController(audioEngine);
const piano = new PianoKeyboard(audioEngine, uiController);

piano.init();
uiController.init();
uiController.startWaveformLoop();
