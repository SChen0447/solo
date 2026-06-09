import { AudioEngine } from './AudioEngine.js';
import { ScoreRenderer, Score, ScoreNote } from './ScoreRenderer.js';
import { PianoKeyboard } from './PianoKeyboard.js';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const TWINKLE_STAR_RAW: Array<{ midi: number; beat: number }> = [
  { midi: 60, beat: 0 },
  { midi: 60, beat: 1 },
  { midi: 67, beat: 2 },
  { midi: 67, beat: 3 },
  { midi: 69, beat: 4 },
  { midi: 69, beat: 5 },
  { midi: 67, beat: 6 },
  { midi: 65, beat: 8 },
  { midi: 65, beat: 9 },
  { midi: 64, beat: 10 },
  { midi: 64, beat: 11 },
  { midi: 62, beat: 12 },
  { midi: 62, beat: 13 },
  { midi: 60, beat: 14 },
  { midi: 67, beat: 16 },
  { midi: 67, beat: 17 },
  { midi: 65, beat: 18 },
  { midi: 65, beat: 19 },
  { midi: 64, beat: 20 },
  { midi: 64, beat: 21 },
  { midi: 62, beat: 22 },
  { midi: 67, beat: 24 },
  { midi: 67, beat: 25 },
  { midi: 65, beat: 26 },
  { midi: 65, beat: 27 },
  { midi: 64, beat: 28 },
  { midi: 64, beat: 29 },
  { midi: 62, beat: 30 },
  { midi: 60, beat: 32 },
  { midi: 60, beat: 33 },
  { midi: 67, beat: 34 },
  { midi: 67, beat: 35 },
  { midi: 69, beat: 36 },
  { midi: 69, beat: 37 },
  { midi: 67, beat: 38 },
  { midi: 65, beat: 40 },
  { midi: 65, beat: 41 },
  { midi: 64, beat: 42 },
  { midi: 64, beat: 43 },
  { midi: 62, beat: 44 },
  { midi: 62, beat: 45 },
  { midi: 60, beat: 46 },
];

const MIDI_TO_PITCH: Record<number, string> = {
  60: 'C4', 61: 'C#4', 62: 'D4', 63: 'D#4', 64: 'E4',
  65: 'F4', 66: 'F#4', 67: 'G4', 68: 'G#4', 69: 'A4',
  70: 'A#4', 71: 'B4', 72: 'C5', 73: 'C#5', 74: 'D5',
  75: 'D#5', 76: 'E5', 77: 'F5', 78: 'F#5', 79: 'G5',
  80: 'G#5', 81: 'A5',
};

const MIDI_TO_STAFF: Record<number, number> = {
  60: 2,
  62: 3,
  64: 4,
  65: 5,
  67: 6,
  69: 7,
  71: 8,
  72: 9,
  74: 10,
  76: 11,
  77: 12,
  79: 13,
  81: 14,
};

function buildScore(): Score {
  const notes: ScoreNote[] = TWINKLE_STAR_RAW.map((n) => ({
    pitch: MIDI_TO_PITCH[n.midi] ?? `MIDI${n.midi}`,
    midi: n.midi,
    frequency: midiToFreq(n.midi),
    startBeat: n.beat,
    duration: 1,
    staffLine: MIDI_TO_STAFF[n.midi] ?? 4,
  }));
  return {
    title: '小星星',
    bpm: 100,
    notes,
    totalBeats: 48,
  };
}

let audioEngine: AudioEngine | null = null;
let scoreRenderer: ScoreRenderer | null = null;
let pianoKeyboard: PianoKeyboard | null = null;

let isPlaying = false;
let isLoop = false;
let currentSpeed = 1;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

let accurateHits = 0;
const hitNotes: Set<number> = new Set();
const ACCURACY_WINDOW_BEATS = 0.8;

function updateAccuracyUI(): void {
  const total = scoreRenderer?.getScore().notes.length ?? 1;
  const pct = Math.round((accurateHits / total) * 100);
  const el = document.getElementById('accuracyValue');
  if (el) el.textContent = `${pct}%`;
}

function checkAccuracy(midi: number): void {
  if (!scoreRenderer) return;
  const notes = scoreRenderer.getScore().notes;
  const currentBeat = scoreRenderer.getCurrentBeat();

  for (let i = 0; i < notes.length; i++) {
    if (hitNotes.has(i)) continue;
    const note = notes[i];
    if (note.midi !== midi) continue;
    const diff = Math.abs(note.startBeat - currentBeat);
    if (diff <= ACCURACY_WINDOW_BEATS) {
      hitNotes.add(i);
      accurateHits++;
      updateAccuracyUI();
      return;
    }
  }
}

function updatePlayIcon(): void {
  const icon = document.getElementById('playIcon');
  if (!icon) return;
  if (isPlaying) {
    icon.innerHTML = '<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>';
  } else {
    icon.innerHTML = '<polygon points="8,5 19,12 8,19"></polygon>';
  }
}

function updateLoopIcon(): void {
  const btn = document.getElementById('loopBtn');
  const icon = document.getElementById('loopIcon');
  if (btn) btn.classList.toggle('active', isLoop);
  if (icon) {
    icon.style.transform = isLoop ? 'rotate(360deg)' : 'rotate(0deg)';
  }
}

function handlePlayToggle(): void {
  if (!audioEngine || !scoreRenderer) return;
  audioEngine.init();
  isPlaying = !isPlaying;
  if (isPlaying) {
    scoreRenderer.play();
  } else {
    scoreRenderer.pause();
  }
  updatePlayIcon();
}

function handleLoopToggle(): void {
  isLoop = !isLoop;
  scoreRenderer?.setLoop(isLoop);
  updateLoopIcon();
}

function handleSpeedChange(value: number): void {
  currentSpeed = SPEED_OPTIONS[value] ?? 1;
  scoreRenderer?.setSpeed(currentSpeed);
  const speedValueEl = document.getElementById('speedValue');
  if (speedValueEl) speedValueEl.textContent = `${currentSpeed.toFixed(2).replace(/\.?0+$/, '')}x`;
}

function setupUI(): void {
  const playBtn = document.getElementById('playBtn');
  const loopBtn = document.getElementById('loopBtn');
  const speedSlider = document.getElementById('speedSlider') as HTMLInputElement | null;

  if (playBtn) playBtn.addEventListener('click', handlePlayToggle);
  if (loopBtn) loopBtn.addEventListener('click', handleLoopToggle);
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      handleSpeedChange(v);
    });
  }

  updatePlayIcon();
  updateLoopIcon();
  updateAccuracyUI();
}

export function startApp(): void {
  const canvas = document.getElementById('scoreCanvas') as HTMLCanvasElement | null;
  const pianoContainer = document.getElementById('pianoKeyboard');
  if (!canvas || !pianoContainer) {
    console.error('Required DOM elements not found');
    return;
  }

  const score = buildScore();

  audioEngine = new AudioEngine();
  scoreRenderer = new ScoreRenderer(canvas, score);
  pianoKeyboard = new PianoKeyboard(pianoContainer, audioEngine);

  scoreRenderer.onNoteReach = (_idx, note) => {
    audioEngine?.playNote(note.frequency, 0.5);
    pianoKeyboard?.highlightKey(note.midi);
  };

  pianoKeyboard.setOnKeyPress((midi) => {
    scoreRenderer?.addUserMarker(midi);
    checkAccuracy(midi);
  });

  setupUI();
}

export function stopApp(): void {
  scoreRenderer?.destroy();
  pianoKeyboard?.destroy();
  audioEngine?.stopAll();
  scoreRenderer = null;
  pianoKeyboard = null;
  audioEngine = null;
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
}
