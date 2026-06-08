import { SoundEngine } from './sound';
import { EditorNote, ScoreEditor } from './editor';

interface TimelineNote {
  note: EditorNote;
  startTime: number;
  endTime: number;
  played: boolean;
}

export class MusicPlayer {
  private soundEngine: SoundEngine;
  private scoreEditor: ScoreEditor;
  private pianoRollCanvas: HTMLCanvasElement;
  private pianoRollCtx: CanvasRenderingContext2D;

  private isPlaying: boolean = false;
  private isLooping: boolean = false;
  private playbackSpeed: number = 1;
  private bpm: number = 120;

  private currentTime: number = 0;
  private totalDuration: number = 0;
  private timeline: TimelineNote[] = [];
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  private onPlayStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private onProgressCallback: ((progress: number) => void) | null = null;

  constructor(
    soundEngine: SoundEngine,
    scoreEditor: ScoreEditor,
    pianoRollCanvas: HTMLCanvasElement
  ) {
    this.soundEngine = soundEngine;
    this.scoreEditor = scoreEditor;
    this.pianoRollCanvas = pianoRollCanvas;
    this.pianoRollCtx = pianoRollCanvas.getContext('2d')!;

    this.setupPianoRollCanvas();
    this.buildTimeline();
  }

  private setupPianoRollCanvas() {
    const rect = this.pianoRollCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.pianoRollCanvas.width = rect.width * dpr;
    this.pianoRollCanvas.height = rect.height * dpr;
    this.pianoRollCtx.scale(dpr, dpr);
  }

  public resize() {
    const rect = this.pianoRollCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.pianoRollCanvas.width = rect.width * dpr;
    this.pianoRollCanvas.height = rect.height * dpr;
    this.pianoRollCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public buildTimeline() {
    const notes = this.scoreEditor.getNotes();
    const noteSpacing = this.scoreEditor.getNoteSpacing();
    const firstNoteX = this.scoreEditor.getFirstNoteX();
    const quarterDuration = 60 / this.bpm * this.playbackSpeed;

    this.timeline = [];
    this.totalDuration = 0;

    const columnTimes: { [col: number]: number } = {};
    notes.forEach(note => {
      if (columnTimes[note.columnIndex] === undefined) {
        columnTimes[note.columnIndex] = note.columnIndex * quarterDuration;
      }
    });

    notes.forEach(note => {
      const startTime = columnTimes[note.columnIndex];
      const noteDuration = this.scoreEditor.getNoteDuration(note.type) * quarterDuration;
      const endTime = startTime + noteDuration;

      this.timeline.push({
        note,
        startTime,
        endTime,
        played: false,
      });

      if (endTime > this.totalDuration) {
        this.totalDuration = endTime;
      }
    });

    if (notes.length === 0) {
      this.totalDuration = 0;
    } else {
      this.totalDuration += 0.5;
    }

    this.timeline.sort((a, b) => a.startTime - b.startTime);
  }

  public play() {
    if (this.isPlaying) return;
    if (this.timeline.length === 0) {
      this.buildTimeline();
      if (this.timeline.length === 0) return;
    }

    this.soundEngine.resume();
    this.isPlaying = true;
    this.lastFrameTime = performance.now();

    if (this.currentTime >= this.totalDuration) {
      this.currentTime = 0;
      this.resetPlayedNotes();
    }

    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(true);
    }

    this.startAnimation();
  }

  public pause() {
    this.isPlaying = false;
    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(false);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.resetPlayedNotes();
    this.scoreEditor.clearHighlights();

    if (this.onPlayStateChangeCallback) {
      this.onPlayStateChangeCallback(false);
    }
    if (this.onProgressCallback) {
      this.onProgressCallback(0);
    }
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setSpeed(speed: number) {
    this.playbackSpeed = speed;
    this.buildTimeline();
  }

  public setLooping(loop: boolean) {
    this.isLooping = loop;
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
    this.buildTimeline();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getTotalDuration(): number {
    return this.totalDuration;
  }

  public onPlayStateChange(callback: (isPlaying: boolean) => void) {
    this.onPlayStateChangeCallback = callback;
  }

  public onProgress(callback: (progress: number) => void) {
    this.onProgressCallback = callback;
  }

  private resetPlayedNotes() {
    this.timeline.forEach(tn => tn.played = false);
  }

  private startAnimation() {
    const animate = (time: number) => {
      if (!this.isPlaying) {
        this.animationFrameId = null;
        return;
      }

      const deltaTime = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;

      this.update(deltaTime);
      this.renderPianoRoll();

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private update(dt: number) {
    this.currentTime += dt;

    const progress = this.totalDuration > 0 ? this.currentTime / this.totalDuration : 0;
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }

    this.timeline.forEach(tn => {
      if (!tn.played && this.currentTime >= tn.startTime) {
        tn.played = true;
        const duration = this.scoreEditor.getNoteDuration(tn.note.type) * (60 / this.bpm);
        this.soundEngine.playNote(tn.note.pitch, duration);
        this.scoreEditor.highlightNote(tn.note.id);
      }
    });

    this.scoreEditor.updateHighlightProgress(dt * 1000);

    if (this.currentTime >= this.totalDuration) {
      if (this.isLooping) {
        this.currentTime = 0;
        this.resetPlayedNotes();
        this.scoreEditor.clearHighlights();
      } else {
        this.stop();
      }
    }
  }

  private renderPianoRoll() {
    const ctx = this.pianoRollCtx;
    const w = this.pianoRollCanvas.width / (window.devicePixelRatio || 1);
    const h = this.pianoRollCanvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(255, 107, 53, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 107, 53, 0.6)');

    const progress = this.totalDuration > 0 ? this.currentTime / this.totalDuration : 0;
    const playedWidth = w * progress;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(playedWidth, h * 0.3, w - playedWidth, h * 0.4);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, h * 0.3, playedWidth, h * 0.4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(playedWidth, h * 0.3, 2, h * 0.4);

    const barCount = Math.max(1, Math.floor(this.totalDuration / (60 / this.bpm * this.playbackSpeed)));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let i = 1; i < barCount; i++) {
      const x = (i / barCount) * w;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.3);
      ctx.lineTo(x, h * 0.7);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 107, 53, 0.8)';
    ctx.beginPath();
    ctx.moveTo(playedWidth, h * 0.2);
    ctx.lineTo(playedWidth + 6, h * 0.1);
    ctx.lineTo(playedWidth + 6, h * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(playedWidth, h * 0.8);
    ctx.lineTo(playedWidth + 6, h * 0.9);
    ctx.lineTo(playedWidth + 6, h * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  public refreshPianoRoll() {
    if (!this.isPlaying) {
      this.renderPianoRoll();
    }
  }

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
