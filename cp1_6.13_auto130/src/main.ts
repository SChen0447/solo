import { ParticleSystem } from './particleSystem';
import { Renderer } from './renderer';

const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const textInput = document.getElementById('textInput') as HTMLInputElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const diffSpeedSlider = document.getElementById('diffSpeed') as HTMLInputElement;
const colorSpeedSlider = document.getElementById('colorSpeed') as HTMLInputElement;
const rotSensSlider = document.getElementById('rotSens') as HTMLInputElement;
const diffSpeedVal = document.getElementById('diffSpeedVal') as HTMLSpanElement;
const colorSpeedVal = document.getElementById('colorSpeedVal') as HTMLSpanElement;
const rotSensVal = document.getElementById('rotSensVal') as HTMLSpanElement;

const particleSystem = new ParticleSystem(window.innerWidth / 2, window.innerHeight / 2);
const renderer = new Renderer(canvas, particleSystem);

function handleGenerate() {
  const text = textInput.value.trim();
  if (text.length === 0) return;
  particleSystem.generateFromText(text);
}

generateBtn.addEventListener('click', handleGenerate);

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleGenerate();
  }
});

resetBtn.addEventListener('click', () => {
  particleSystem.reset();
});

diffSpeedSlider.addEventListener('input', () => {
  const val = parseFloat(diffSpeedSlider.value);
  particleSystem.diffSpeed = val;
  diffSpeedVal.textContent = val.toFixed(1);
});

colorSpeedSlider.addEventListener('input', () => {
  const val = parseFloat(colorSpeedSlider.value);
  particleSystem.colorSpeed = val;
  colorSpeedVal.textContent = val.toFixed(1);
});

rotSensSlider.addEventListener('input', () => {
  const val = parseFloat(rotSensSlider.value);
  particleSystem.rotSensitivity = val;
  rotSensVal.textContent = val.toFixed(1);
});

renderer.start();
