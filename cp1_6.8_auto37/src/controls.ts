import { SoundEngine, TimbreType, NoteType } from './sound';
import { ScoreEditor, TimeSignature } from './editor';
import { MusicPlayer } from './player';

export class ControlPanel {
  private soundEngine: SoundEngine;
  private scoreEditor: ScoreEditor;
  private player: MusicPlayer;

  private noteTypeButtons: NodeListOf<HTMLButtonElement>;
  private timbreButtons: NodeListOf<HTMLButtonElement>;
  private volumeSlider: HTMLInputElement;
  private volumeValue: HTMLElement;
  private reverbSlider: HTMLInputElement;
  private reverbValue: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private playBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private loopCheckbox: HTMLInputElement;
  private clearBtn: HTMLButtonElement;
  private timeSigSelect: HTMLSelectElement;
  private togglePanelBtn: HTMLButtonElement;
  private controlPanel: HTMLElement;

  constructor(
    soundEngine: SoundEngine,
    scoreEditor: ScoreEditor,
    player: MusicPlayer
  ) {
    this.soundEngine = soundEngine;
    this.scoreEditor = scoreEditor;
    this.player = player;

    this.noteTypeButtons = document.querySelectorAll('.note-btn');
    this.timbreButtons = document.querySelectorAll('.timbre-btn');
    this.volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    this.volumeValue = document.getElementById('volumeValue') as HTMLElement;
    this.reverbSlider = document.getElementById('reverbSlider') as HTMLInputElement;
    this.reverbValue = document.getElementById('reverbValue') as HTMLElement;
    this.speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    this.speedValue = document.getElementById('speedValue') as HTMLElement;
    this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.loopCheckbox = document.getElementById('loopCheckbox') as HTMLInputElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.timeSigSelect = document.getElementById('timeSigSelect') as HTMLSelectElement;
    this.togglePanelBtn = document.getElementById('togglePanelBtn') as HTMLButtonElement;
    this.controlPanel = document.querySelector('.control-panel') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents() {
    this.noteTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type as NoteType;
        if (type) {
          this.selectNoteType(type);
        }
      });
    });

    this.timbreButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const timbre = btn.dataset.timbre as TimbreType;
        if (timbre) {
          this.selectTimbre(timbre);
        }
      });
    });

    this.volumeSlider.addEventListener('input', () => {
      const value = parseInt(this.volumeSlider.value);
      this.soundEngine.setVolume(value / 100);
      this.volumeValue.textContent = `${value}%`;
    });

    this.reverbSlider.addEventListener('input', () => {
      const value = parseInt(this.reverbSlider.value);
      this.soundEngine.setReverb(value / 100);
      this.reverbValue.textContent = `${value}%`;
    });

    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.player.setSpeed(value);
      this.speedValue.textContent = `${value.toFixed(1)}x`;
    });

    this.playBtn.addEventListener('click', () => {
      this.soundEngine.resume();
      this.player.togglePlay();
    });

    this.stopBtn.addEventListener('click', () => {
      this.player.stop();
    });

    this.loopCheckbox.addEventListener('change', () => {
      this.player.setLooping(this.loopCheckbox.checked);
    });

    this.clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有音符吗？')) {
        this.player.stop();
        this.scoreEditor.clearNotes();
      }
    });

    this.timeSigSelect.addEventListener('change', () => {
      const sig = this.timeSigSelect.value as TimeSignature;
      this.scoreEditor.setTimeSignature(sig);
    });

    this.togglePanelBtn.addEventListener('click', () => {
      this.togglePanel();
    });

    this.player.onPlayStateChange((isPlaying) => {
      this.playBtn.textContent = isPlaying ? '⏸' : '▶';
    });

    this.scoreEditor.onNotesChange(() => {
      this.player.buildTimeline();
      this.player.refreshPianoRoll();
    });

    window.addEventListener('resize', () => {
      this.scoreEditor.resize();
      this.player.resize();
      this.player.refreshPianoRoll();
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.soundEngine.resume();
        this.player.togglePlay();
      }
    });
  }

  private selectNoteType(type: NoteType) {
    this.noteTypeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    this.scoreEditor.setNoteType(type);
  }

  private selectTimbre(timbre: TimbreType) {
    this.timbreButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.timbre === timbre);
    });
    this.soundEngine.setTimbre(timbre);
  }

  private togglePanel() {
    this.controlPanel.classList.toggle('expanded');
    this.togglePanelBtn.classList.toggle('collapsed');

    setTimeout(() => {
      this.scoreEditor.resize();
      this.player.resize();
      this.player.refreshPianoRoll();
    }, 300);
  }
}
