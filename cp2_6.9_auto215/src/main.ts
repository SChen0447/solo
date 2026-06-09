import './style.css';
import { StarChart } from './StarChart';
import { PredictionEngine, PredictionResult, PlanetName } from './PredictionEngine';

interface HistoryItem {
  id: number;
  summary: string;
  timestamp: number;
  result: PredictionResult;
}

class Game {
  private starChart: StarChart;
  private predictionEngine: PredictionEngine;
  private canvas: HTMLCanvasElement;
  private history: HistoryItem[] = [];
  private historyCounter: number = 0;
  private isTyping: boolean = false;
  private typingTimer: number | null = null;
  private lastPlanetUIUpdate: number = 0;
  private fateBarFillEl: HTMLDivElement;

  private readonly constellationNameEl: HTMLElement;
  private readonly planetSlidersEl: HTMLElement;
  private readonly predictionTextEl: HTMLElement;
  private readonly predictionScrollEl: HTMLElement;
  private readonly divineBtnEl: HTMLButtonElement;
  private readonly historyListEl: HTMLElement;
  private readonly settingsBtnEl: HTMLButtonElement;
  private readonly settingsOverlayEl: HTMLElement;
  private readonly starCountSliderEl: HTMLInputElement;
  private readonly starCountValueEl: HTMLElement;
  private readonly planetIntervalSliderEl: HTMLInputElement;
  private readonly planetIntervalValueEl: HTMLElement;
  private readonly resetBtnEl: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('star-canvas') as HTMLCanvasElement;
    this.constellationNameEl = document.getElementById('constellation-name') as HTMLElement;
    this.planetSlidersEl = document.getElementById('planet-sliders') as HTMLElement;
    this.predictionTextEl = document.getElementById('prediction-text') as HTMLElement;
    this.predictionScrollEl = document.getElementById('prediction-scroll') as HTMLElement;
    this.divineBtnEl = document.getElementById('divine-btn') as HTMLButtonElement;
    this.historyListEl = document.getElementById('history-list') as HTMLElement;
    this.settingsBtnEl = document.getElementById('settings-btn') as HTMLButtonElement;
    this.settingsOverlayEl = document.getElementById('settings-overlay') as HTMLElement;
    this.starCountSliderEl = document.getElementById('star-count-slider') as HTMLInputElement;
    this.starCountValueEl = document.getElementById('star-count-value') as HTMLElement;
    this.planetIntervalSliderEl = document.getElementById('planet-interval-slider') as HTMLInputElement;
    this.planetIntervalValueEl = document.getElementById('planet-interval-value') as HTMLElement;
    this.resetBtnEl = document.getElementById('reset-btn') as HTMLButtonElement;

    const fateBarEl = document.getElementById('fate-bar') as HTMLElement;
    this.fateBarFillEl = document.createElement('div');
    this.fateBarFillEl.id = 'fate-bar-fill';
    fateBarEl.appendChild(this.fateBarFillEl);

    this.starChart = new StarChart(this.canvas, 150);
    this.predictionEngine = new PredictionEngine();

    this.buildPlanetSliders();
    this.bindEvents();
    this.updateConstellationName();
    this.startLoop();
  }

  private buildPlanetSliders(): void {
    const planets = this.predictionEngine.getPlanets();
    this.planetSlidersEl.innerHTML = '';

    planets.forEach((planet) => {
      const row = document.createElement('div');
      row.className = 'planet-slider-row';

      const icon = document.createElement('div');
      icon.className = 'planet-icon';
      icon.style.background = planet.color;
      icon.style.color = planet.color;
      icon.title = planet.name;

      const track = document.createElement('div');
      track.className = 'planet-slider-track';

      const thumb = document.createElement('div');
      thumb.className = 'planet-slider-thumb';
      thumb.style.color = planet.color;
      thumb.style.left = `${planet.position * 100}%`;
      thumb.dataset.planet = planet.name;
      thumb.title = `${planet.name}: ${Math.round(planet.position * 100)}%`;

      let isDraggingThumb = false;
      thumb.addEventListener('mousedown', (e) => {
        isDraggingThumb = true;
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDraggingThumb) return;
        const rect = track.getBoundingClientRect();
        let pos = (e.clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos));
        this.predictionEngine.setPlanetPosition(planet.name as PlanetName, pos);
        thumb.style.left = `${pos * 100}%`;
        thumb.title = `${planet.name}: ${Math.round(pos * 100)}%`;
      });
      document.addEventListener('mouseup', () => {
        isDraggingThumb = false;
      });

      track.appendChild(thumb);
      row.appendChild(icon);
      row.appendChild(track);
      this.planetSlidersEl.appendChild(row);
    });
  }

  private updatePlanetSliderUI(throttled: boolean = true): void {
    const now = performance.now();
    if (throttled && now - this.lastPlanetUIUpdate < 100) return;
    this.lastPlanetUIUpdate = now;

    const planets = this.predictionEngine.getPlanets();
    const thumbs = this.planetSlidersEl.querySelectorAll('.planet-slider-thumb');
    thumbs.forEach((thumb, index) => {
      if (planets[index]) {
        const el = thumb as HTMLElement;
        el.style.left = `${planets[index].position * 100}%`;
      }
    });
  }

  private bindEvents(): void {
    this.divineBtnEl.addEventListener('click', () => this.onDivineClick());

    this.settingsBtnEl.addEventListener('click', () => {
      this.settingsOverlayEl.classList.remove('hidden');
    });

    this.settingsOverlayEl.addEventListener('click', (e) => {
      if (e.target === this.settingsOverlayEl) {
        this.settingsOverlayEl.classList.add('hidden');
      }
    });

    this.starCountSliderEl.addEventListener('input', () => {
      const value = parseInt(this.starCountSliderEl.value, 10);
      this.starCountValueEl.textContent = value.toString();
      this.starChart.setStarCount(value);
    });

    this.planetIntervalSliderEl.addEventListener('input', () => {
      const value = parseInt(this.planetIntervalSliderEl.value, 10);
      this.planetIntervalValueEl.textContent = value.toString();
      this.predictionEngine.setPlanetInterval(value);
    });

    this.resetBtnEl.addEventListener('click', () => {
      this.resetGame();
    });
  }

  private resetGame(): void {
    this.history = [];
    this.historyCounter = 0;
    this.renderHistory();
    this.starChart.reset();
    this.predictionEngine.reset();
    this.updatePlanetSliderUI(false);
    this.updateConstellationName();
    this.fateBarFillEl.style.width = '0%';
    this.predictionTextEl.textContent = '';
    this.settingsOverlayEl.classList.add('hidden');
  }

  private onDivineClick(): void {
    if (this.isTyping) return;

    const constellationName = this.starChart.getHighlightedConstellationName() || '未知星座';
    const constellationCount = this.starChart.getConstellationCount();
    const result = this.predictionEngine.performDivination(constellationName, constellationCount);

    this.addToHistory(result);
    this.showPrediction(result);
    this.updateFateBar(result);
  }

  private addToHistory(result: PredictionResult): void {
    const summary = result.text.substring(0, 10);
    const item: HistoryItem = {
      id: ++this.historyCounter,
      summary,
      timestamp: result.timestamp,
      result
    };
    this.history.unshift(item);
    if (this.history.length > 10) {
      this.history.pop();
    }
    this.renderHistory();
  }

  private renderHistory(): void {
    this.historyListEl.innerHTML = '';
    this.history.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.dataset.historyId = item.id.toString();

      const summary = document.createElement('span');
      summary.className = 'history-summary';
      summary.textContent = item.summary;

      const time = document.createElement('span');
      time.className = 'history-time';
      time.textContent = this.formatTime(item.timestamp);

      div.appendChild(summary);
      div.appendChild(time);
      div.addEventListener('click', () => {
        if (this.isTyping) return;
        this.showPrediction(item.result);
        this.updateFateBar(item.result);
      });

      this.historyListEl.appendChild(div);
    });
  }

  private formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private showPrediction(result: PredictionResult): void {
    if (this.typingTimer !== null) {
      window.clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    this.isTyping = true;
    this.divineBtnEl.disabled = true;
    this.predictionTextEl.textContent = '';
    const text = result.text;
    let index = 0;

    const typeNext = () => {
      if (index < text.length) {
        this.predictionTextEl.textContent += text.charAt(index);
        this.predictionScrollEl.scrollTop = this.predictionScrollEl.scrollHeight;
        index++;
        this.typingTimer = window.setTimeout(typeNext, 50);
      } else {
        this.isTyping = false;
        this.divineBtnEl.disabled = false;
        this.typingTimer = null;
      }
    };

    typeNext();
  }

  private updateFateBar(result: PredictionResult): void {
    const widthPercent = result.harmonyScore;
    const score = result.harmonyScore;
    let color: string;
    if (score >= 75) {
      color = 'linear-gradient(90deg, #16A34A, #22C55E)';
    } else if (score >= 50) {
      color = 'linear-gradient(90deg, #CA8A04, #EAB308)';
    } else if (score >= 25) {
      color = 'linear-gradient(90deg, #EA580C, #F97316)';
    } else {
      color = 'linear-gradient(90deg, #DC2626, #EF4444)';
    }
    this.fateBarFillEl.style.background = color;
    requestAnimationFrame(() => {
      this.fateBarFillEl.style.width = `${widthPercent}%`;
    });
  }

  private updateConstellationName(): void {
    const name = this.starChart.getHighlightedConstellationName();
    if (name) {
      this.constellationNameEl.textContent = name;
    }
  }

  private startLoop(): void {
    let lastConstellationNameCheck = 0;
    let planetsChanged = false;

    const loop = (time: number) => {
      this.starChart.update(time);
      this.starChart.render(time);

      planetsChanged = this.predictionEngine.update(time);
      if (planetsChanged) {
        this.updatePlanetSliderUI(false);
      }

      if (time - lastConstellationNameCheck > 500) {
        this.updateConstellationName();
        lastConstellationNameCheck = time;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
