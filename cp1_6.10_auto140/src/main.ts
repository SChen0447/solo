import { ShapeRecognizer, type AnimalType, type Point } from './shapeRecognizer';
import { AudioSynth } from './audioSynth';
import { AnimationManager } from './animation';

const ANIMAL_NAMES: Record<AnimalType, string> = {
  cat: '猫',
  dog: '狗',
  bird: '鸟',
  fish: '鱼'
};

const ANIMAL_EMOJIS: Record<AnimalType, string> = {
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
  fish: '🐟'
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function main(): void {
  const canvas = document.getElementById('drawCanvas') as HTMLCanvasElement | null;
  const canvasWrapper = document.getElementById('canvasWrapper') as HTMLElement | null;
  const animalNameEl = document.getElementById('animalName') as HTMLElement | null;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement | null;
  const correctBtn = document.getElementById('correctBtn') as HTMLButtonElement | null;
  const counterEl = document.getElementById('counter') as HTMLElement | null;
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement | null;
  const freqSlider = document.getElementById('freqSlider') as HTMLInputElement | null;
  const volSlider = document.getElementById('volSlider') as HTMLInputElement | null;
  const tempoSlider = document.getElementById('tempoSlider') as HTMLInputElement | null;

  if (!canvas || !canvasWrapper || !animalNameEl || !clearBtn ||
      !correctBtn || !counterEl || !playBtn || !freqSlider ||
      !volSlider || !tempoSlider) {
    console.error('Missing required DOM elements');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Cannot get 2D context');
    return;
  }

  const recognizer = new ShapeRecognizer(CANVAS_WIDTH, CANVAS_HEIGHT);
  const audioSynth = new AudioSynth();
  const animationManager = new AnimationManager(canvasWrapper);

  let isDrawing = false;
  let currentPoints: Point[] = [];
  let currentAnimal: AnimalType = 'fish';
  let counter = 0;
  let consecutiveErrors = 0;

  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 2;

  const getCanvasPoint = (e: MouseEvent | TouchEvent): Point | null => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: MouseEvent | TouchEvent): void => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (!point) return;

    isDrawing = true;
    currentPoints = [point];

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: MouseEvent | TouchEvent): void => {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    if (!point) return;

    currentPoints.push(point);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = (): void => {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentPoints.length < 2) {
      currentPoints = [];
      return;
    }

    const animal = recognizer.recognize(currentPoints);
    handleRecognitionResult(animal);
    currentPoints = [];
  };

  const handleRecognitionResult = (animal: AnimalType): void => {
    currentAnimal = animal;
    animalNameEl.textContent = ANIMAL_NAMES[animal];

    const wrapperRect = canvasWrapper.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const startX = (canvasRect.left - wrapperRect.left) + CANVAS_WIDTH / 2 - 24;
    const startY = (canvasRect.top - wrapperRect.top) + CANVAS_HEIGHT / 2 - 24;
    const endX = 20;
    const endY = 20;

    animationManager.playParabolicEmoji(
      ANIMAL_EMOJIS[animal],
      startX,
      startY,
      endX,
      endY,
      500
    );

    counter++;
    consecutiveErrors = 0;
    counterEl.textContent = counter.toString();
  };

  const clearCanvas = (): void => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    animalNameEl.textContent = '';
    currentPoints = [];
  };

  const handleCorrect = (): void => {
    consecutiveErrors++;
    if (consecutiveErrors >= 3) {
      counter = 0;
      counterEl.textContent = '0';
      consecutiveErrors = 0;
    }
  };

  const handlePlaySound = (): void => {
    const freq = parseInt(freqSlider.value, 10);
    const vol = parseInt(volSlider.value, 10);
    const tempo = parseInt(tempoSlider.value, 10);
    audioSynth.play(currentAnimal, freq, vol, tempo);
  };

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);

  clearBtn.addEventListener('click', clearCanvas);
  correctBtn.addEventListener('click', handleCorrect);
  playBtn.addEventListener('click', handlePlaySound);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
