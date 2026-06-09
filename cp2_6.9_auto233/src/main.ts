import { FrequencyKnob } from './frequencyKnob';
import { MessageReceiver, PlanetInfo, ValidateResult } from './messageReceiver';
import { StarChart } from './starChart';

interface GameState {
  score: number;
  messageCount: number;
  placedParts: Set<string>;
}

class Game {
  private telegraphCanvas: HTMLCanvasElement;
  private knobCanvas: HTMLCanvasElement;
  private starChartCanvas: HTMLCanvasElement;
  private telegraphInput: HTMLInputElement;
  private morseDisplay: HTMLElement;
  private feedbackArea: HTMLElement;
  private freqValue: HTMLElement;
  private signalDot: HTMLElement;
  private signalText: HTMLElement;
  private messageCountEl: HTMLElement;
  private scoreValueEl: HTMLElement;
  private planetDescription: HTMLElement;
  private partsGrid: HTMLElement;

  private messageReceiver: MessageReceiver;
  private frequencyKnob: FrequencyKnob;
  private starChart: StarChart;

  private lastFrameTime: number = 0;
  private state: GameState = {
    score: 0,
    messageCount: 1,
    placedParts: new Set()
  };

  constructor() {
    this.telegraphCanvas = document.getElementById('telegraphCanvas') as HTMLCanvasElement;
    this.knobCanvas = document.getElementById('knobCanvas') as HTMLCanvasElement;
    this.starChartCanvas = document.getElementById('starChartCanvas') as HTMLCanvasElement;
    this.telegraphInput = document.getElementById('telegraphInput') as HTMLInputElement;
    this.morseDisplay = document.getElementById('morseDisplay') as HTMLElement;
    this.feedbackArea = document.getElementById('feedbackArea') as HTMLElement;
    this.freqValue = document.getElementById('freqValue') as HTMLElement;
    this.signalDot = document.getElementById('signalDot') as HTMLElement;
    this.signalText = document.getElementById('signalText') as HTMLElement;
    this.messageCountEl = document.getElementById('messageCount') as HTMLElement;
    this.scoreValueEl = document.getElementById('scoreValue') as HTMLElement;
    this.planetDescription = document.getElementById('planetDescription') as HTMLElement;
    this.partsGrid = document.getElementById('partsGrid') as HTMLElement;

    if (!this.telegraphCanvas || !this.knobCanvas || !this.starChartCanvas ||
        !this.telegraphInput || !this.morseDisplay || !this.feedbackArea ||
        !this.freqValue || !this.signalDot || !this.signalText ||
        !this.messageCountEl || !this.scoreValueEl || !this.planetDescription ||
        !this.partsGrid) {
      throw new Error('Required DOM elements not found');
    }

    this.messageReceiver = new MessageReceiver(this.telegraphCanvas);
    this.frequencyKnob = new FrequencyKnob(this.knobCanvas);
    this.starChart = new StarChart(this.starChartCanvas);

    this.starChart.setDescriptionElement(this.planetDescription);
    this.bindEvents();
    this.syncInitialState();
  }

  private bindEvents(): void {
    this.frequencyKnob.setOnChange((freq: number) => {
      this.messageReceiver.setFrequency(freq);
      this.freqValue.textContent = freq.toFixed(1);
      this.updateSignalIndicator();
    });

    this.messageReceiver.setOnMessageDecoded((planet: PlanetInfo, text: string, messageId: number) => {
      this.state.score += 100;
      this.state.messageCount = messageId;
      this.updateStatusBar();
      this.starChart.flashPlanet(planet);
      this.setFeedback(`✓ 破译成功！来自 ${planet.name} 的消息："${text}"`, 'success');
      this.telegraphInput.value = '';
      this.telegraphInput.classList.remove('correct', 'wrong');
      setTimeout(() => {
        this.syncMessageDisplay();
      }, 1500);
    });

    this.messageReceiver.setOnFeedback((result: ValidateResult, expected: string, input: string) => {
      if (result === 'correct') {
        this.telegraphInput.classList.remove('wrong');
        this.telegraphInput.classList.add('correct');
      } else if (result === 'wrong') {
        this.telegraphInput.classList.remove('correct');
        this.telegraphInput.classList.add('wrong');
        this.setFeedback(`✗ 破译错误。输入: "${input}"，请再试一次。提示: ${expected.length} 个字母`, 'error');
        setTimeout(() => {
          this.telegraphInput.classList.remove('wrong');
          this.telegraphInput.value = '';
          this.telegraphInput.focus();
        }, 600);
      }
    });

    this.starChart.setOnPlanetClick((planet: PlanetInfo) => {
      this.frequencyKnob.setFrequency(planet.frequency);
    });

    this.telegraphInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const input = this.telegraphInput.value.trim();
        if (input.length > 0) {
          this.messageReceiver.validateInput(input);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const input = this.telegraphInput.value.trim();
        if (input.length > 0) {
          this.messageReceiver.validateInput(input);
        }
      }
    });

    this.telegraphInput.addEventListener('input', () => {
      this.telegraphInput.classList.remove('correct', 'wrong');
    });

    this.partsGrid.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('part-slot')) {
        const part = target.dataset.part;
        if (part) {
          this.togglePart(part, target);
        }
      }
    });

    this.partsGrid.addEventListener('touchend', (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('part-slot')) {
        const part = target.dataset.part;
        if (part) {
          this.togglePart(part, target);
        }
        e.preventDefault();
      }
    });
  }

  private togglePart(part: string, el: HTMLElement): void {
    if (this.state.placedParts.has(part)) {
      this.state.placedParts.delete(part);
      el.classList.remove('placed');
      this.setFeedback(`已移除零件: ${el.textContent}`, '');
    } else {
      this.state.placedParts.add(part);
      el.classList.add('placed');
      this.setFeedback(`已安装零件: ${el.textContent}`, 'success');
      if (this.state.placedParts.size >= 6) {
        this.setFeedback('★ 飞船零件组装完成！准备发送回信... ★', 'success');
      }
    }
  }

  private syncInitialState(): void {
    const initialFreq = this.frequencyKnob.getFrequency();
    this.messageReceiver.setFrequency(initialFreq);
    this.freqValue.textContent = initialFreq.toFixed(1);
    this.syncMessageDisplay();
    this.updateSignalIndicator();
    this.updateStatusBar();
    this.telegraphInput.focus();
  }

  private syncMessageDisplay(): void {
    this.morseDisplay.textContent = this.messageReceiver.getCurrentMorse();
    const msg = this.messageReceiver.getCurrentMessage();
    if (msg) {
      this.setFeedback(`新消息来自 ${msg.planet.name} (${msg.planet.frequency}MHz)，请破译摩斯密码...`, '');
    }
  }

  private updateSignalIndicator(): void {
    const strength = this.messageReceiver.getSignalStrength();
    this.signalDot.classList.remove('green', 'red');
    if (strength === 'clear') {
      this.signalDot.classList.add('green');
      this.signalText.textContent = 'SIGNAL STRONG';
      this.signalText.style.color = '#22C55E';
    } else {
      this.signalDot.classList.add('red');
      if (strength === 'unreadable') {
        this.signalText.textContent = 'NO SIGNAL';
      } else {
        this.signalText.textContent = 'SIGNAL WEAK';
      }
      this.signalText.style.color = '#EF4444';
    }
  }

  private updateStatusBar(): void {
    this.messageCountEl.textContent = String(this.state.messageCount).padStart(4, '0');
    this.scoreValueEl.textContent = String(this.state.score);
  }

  private setFeedback(message: string, type: 'success' | 'error' | ''): void {
    this.feedbackArea.textContent = message;
    this.feedbackArea.classList.remove('success', 'error');
    if (type) {
      this.feedbackArea.classList.add(type);
    }
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    this.messageReceiver.update(deltaTime);
    this.starChart.update(deltaTime);

    this.messageReceiver.render();
    this.starChart.render();

    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.start();
  } catch (err) {
    console.error('Failed to start game:', err);
  }
});
