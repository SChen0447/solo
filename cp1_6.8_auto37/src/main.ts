import { SoundEngine } from './sound';
import { ScoreEditor } from './editor';
import { MusicPlayer } from './player';
import { ControlPanel } from './controls';
import './style.css';

class App {
  private soundEngine!: SoundEngine;
  private scoreEditor!: ScoreEditor;
  private player!: MusicPlayer;
  private controlPanel!: ControlPanel;

  constructor() {
    this.init();
  }

  private init() {
    const scoreCanvas = document.getElementById('scoreCanvas') as HTMLCanvasElement;
    const pianoRollCanvas = document.getElementById('pianoRollCanvas') as HTMLCanvasElement;

    if (!scoreCanvas || !pianoRollCanvas) {
      console.error('Canvas elements not found');
      return;
    }

    this.soundEngine = new SoundEngine();

    this.scoreEditor = new ScoreEditor(scoreCanvas, this.soundEngine);

    this.player = new MusicPlayer(this.soundEngine, this.scoreEditor, pianoRollCanvas);

    this.controlPanel = new ControlPanel(this.soundEngine, this.scoreEditor, this.player);

    setTimeout(() => {
      this.scoreEditor.resize();
      this.player.resize();
      this.player.refreshPianoRoll();
    }, 100);

    console.log('Music Score Editor initialized');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
