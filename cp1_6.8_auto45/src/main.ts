import { GameState, VoteOption, VoteResults, GamePhase } from './GameState';
import { SceneManager } from './SceneManager';
import { DanmakuSystem } from './DanmakuSystem';

const VOTE_DURATION = 5;
const TRANSITION_DURATION = 0.8;
const REACTION_DURATION = 1.5;

class Game {
  private gameState: GameState;
  private sceneManager: SceneManager;
  private danmakuSystem: DanmakuSystem;
  private canvas: HTMLCanvasElement;
  private danmakuContainer: HTMLElement;
  private voteButtons: HTMLElement[];
  private voteBars: HTMLElement[];
  private voteBarContainers: HTMLElement;
  private voteProgressBar: HTMLElement;
  private voteProgressFill: HTMLElement;
  private affectionBar: HTMLElement;
  private affectionFill: HTMLElement;
  private affectionText: HTMLElement;
  private skipButton: HTMLElement;
  private restartButton: HTMLElement;
  private sceneTitle: HTMLElement;

  private lastTime: number;
  private voteTimer: number;
  private reactionTimer: number;
  private animationFrameId: number | null;
  private isRunning: boolean;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.danmakuContainer = document.getElementById('danmakuContainer') as HTMLElement;
    this.voteButtons = [
      document.getElementById('voteA') as HTMLElement,
      document.getElementById('voteB') as HTMLElement,
      document.getElementById('voteC') as HTMLElement
    ];
    this.voteBars = [
      document.getElementById('barA') as HTMLElement,
      document.getElementById('barB') as HTMLElement,
      document.getElementById('barC') as HTMLElement
    ];
    this.voteBarContainers = document.getElementById('voteBarContainer') as HTMLElement;
    this.voteProgressBar = document.getElementById('voteProgressBar') as HTMLElement;
    this.voteProgressFill = document.getElementById('voteProgressFill') as HTMLElement;
    this.affectionBar = document.getElementById('affectionBar') as HTMLElement;
    this.affectionFill = document.getElementById('affectionFill') as HTMLElement;
    this.affectionText = document.getElementById('affectionText') as HTMLElement;
    this.skipButton = document.getElementById('skipButton') as HTMLElement;
    this.restartButton = document.getElementById('restartButton') as HTMLElement;
    this.sceneTitle = document.getElementById('sceneTitle') as HTMLElement;

    this.gameState = new GameState();
    this.sceneManager = new SceneManager(this.canvas, this.gameState);
    this.danmakuSystem = new DanmakuSystem(this.danmakuContainer);

    this.lastTime = performance.now();
    this.voteTimer = 0;
    this.reactionTimer = 0;
    this.animationFrameId = null;
    this.isRunning = false;

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.danmakuSystem.setVoteCallback((option: VoteOption) => {
      this.handleVote(option);
    });

    this.voteButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const options = ['A', 'B', 'C'] as VoteOption[];
        this.handleManualVote(options[index]);
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          btn.style.transform = 'scale(1)';
        }, 100);
      });
    });

    this.canvas.addEventListener('click', () => {
      this.handleCanvasClick();
    });

    this.skipButton.addEventListener('click', () => {
      this.skipTypewriter();
    });

    this.restartButton.addEventListener('click', () => {
      this.restart();
    });

    this.updateVoteButtons();
    this.updateAffectionBar();
    this.updateSceneTitle();
    this.hideVoteUI();

    this.danmakuSystem.startSimulation();
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.sceneManager.resize(rect.width, rect.height);

    const danmakuHeight = this.danmakuContainer.clientHeight;
    this.danmakuSystem.setContainerHeight(danmakuHeight);
  }

  private handleVote(option: VoteOption): void {
    if (this.gameState.getPhase() !== 'voting') return;
    this.gameState.addVote(option);
    this.updateVoteBars();
  }

  private handleManualVote(option: VoteOption): void {
    if (this.gameState.getPhase() !== 'voting') return;
    this.danmakuSystem.addDanmaku(`我选${option}！`, true, option);
  }

  private handleCanvasClick(): void {
    const phase = this.gameState.getPhase();

    if (phase === 'dialog') {
      if (!this.sceneManager.isTypewriterDone()) {
        this.sceneManager.skipTypewriter();
      } else if (this.gameState.hasMoreDialogs()) {
        this.gameState.advanceDialog();
        this.sceneManager.resetTypewriter();
      } else if (!this.gameState.isEnding()) {
        this.startVoting();
      }
    }
  }

  private skipTypewriter(): void {
    const phase = this.gameState.getPhase();
    if (phase === 'dialog' && !this.sceneManager.isTypewriterDone()) {
      this.sceneManager.skipTypewriter();
    }
  }

  private startVoting(): void {
    if (this.gameState.isEnding()) return;

    this.gameState.setPhase('voting');
    this.gameState.resetVotes();
    this.danmakuSystem.resetVotes();
    this.danmakuSystem.startVoting();
    this.voteTimer = 0;

    this.showVoteUI();
    this.updateVoteButtons();
    this.updateVoteBars();
    this.hideSkipButton();
  }

  private endVoting(): void {
    const results = this.danmakuSystem.stopVoting();
    this.gameState.setPhase('reaction');
    this.reactionTimer = 0;

    const selected = this.determineWinner(results);
    this.gameState.setSelectedOption(selected);

    const options = this.gameState.getOptions();
    const selectedOption = options.find(o => o.key === selected);
    if (selectedOption) {
      this.gameState.setCharacterMood(selectedOption.reactionMood);
      this.sceneManager.triggerReaction(selectedOption.reactionMood);
      this.gameState.addAffection(selectedOption.affectionChange);
      this.animateAffectionChange();
    }

    this.hideVoteUI();
  }

  private determineWinner(results: VoteResults): VoteOption {
    const { A, B, C } = results;
    const max = Math.max(A, B, C);

    const winners: VoteOption[] = [];
    if (A === max) winners.push('A');
    if (B === max) winners.push('B');
    if (C === max) winners.push('C');

    if (winners.length === 1) {
      return winners[0];
    }

    return winners[Math.floor(Math.random() * winners.length)];
  }

  private endReaction(): void {
    this.gameState.setPhase('transition');

    const transition = this.gameState.getSceneTransition();
    transition.active = true;
    transition.direction = 'out';
    transition.progress = 0;
    this.gameState.setSceneTransition(transition);

    const selectedOption = this.gameState.getSelectedOption();
    const options = this.gameState.getOptions();
    const selected = options.find(o => o.key === selectedOption);

    setTimeout(() => {
      if (selected) {
        let nextSceneId = selected.nextSceneId;

        if (nextSceneId === 'gift_check') {
          const specialEnding = this.gameState.checkSpecialEndings();
          if (specialEnding) {
            nextSceneId = specialEnding;
          } else {
            nextSceneId = 'castle_talk';
          }
        }

        this.gameState.goToScene(nextSceneId);
        this.sceneManager.resetTypewriter();
        this.updateSceneTitle();
        this.updateAffectionBar();
      }

      const newTransition = this.gameState.getSceneTransition();
      newTransition.direction = 'in';
      newTransition.progress = 0;
      this.gameState.setSceneTransition(newTransition);
    }, TRANSITION_DURATION * 1000 / 2);
  }

  private endTransition(): void {
    const transition = this.gameState.getSceneTransition();
    transition.active = false;
    transition.progress = 0;
    this.gameState.setSceneTransition(transition);

    if (this.gameState.isEnding()) {
      this.gameState.setPhase('dialog');
      this.showSkipButton();
      this.showRestartButton();
    } else {
      this.gameState.setPhase('dialog');
      this.showSkipButton();
    }
  }

  private showVoteUI(): void {
    this.voteBarContainers.style.opacity = '1';
    this.voteBarContainers.style.transform = 'translateY(0)';
    this.voteButtons.forEach(btn => {
      btn.style.opacity = '1';
      btn.style.transform = 'scale(1)';
      btn.style.pointerEvents = 'auto';
    });
    this.voteProgressBar.style.opacity = '1';
  }

  private hideVoteUI(): void {
    this.voteBarContainers.style.opacity = '0';
    this.voteBarContainers.style.transform = 'translateY(20px)';
    this.voteButtons.forEach(btn => {
      btn.style.opacity = '0.5';
      btn.style.transform = 'scale(0.9)';
      btn.style.pointerEvents = 'none';
    });
    this.voteProgressBar.style.opacity = '0';
  }

  private updateVoteButtons(): void {
    const options = this.gameState.getOptions();
    const keys = ['A', 'B', 'C'];

    keys.forEach((key, index) => {
      const option = options.find(o => o.key === key);
      const btn = this.voteButtons[index];
      if (option) {
        btn.textContent = `${key}. ${option.text}`;
        btn.style.backgroundColor = option.color;
        btn.style.display = 'flex';
      } else {
        btn.style.display = 'none';
      }
    });
  }

  private updateVoteBars(): void {
    const results = this.gameState.getVoteResults();
    const total = results.A + results.B + results.C;
    const bars = [
      { el: this.voteBars[0], count: results.A },
      { el: this.voteBars[1], count: results.B },
      { el: this.voteBars[2], count: results.C }
    ];

    bars.forEach(({ el, count }) => {
      const height = total > 0 ? (count / total) * 100 : 0;
      el.style.height = `${Math.max(height, 5)}%`;
    });
  }

  private updateVoteProgress(): void {
    const progress = (this.voteTimer / VOTE_DURATION) * 100;
    this.voteProgressFill.style.width = `${100 - progress}%`;
  }

  private updateAffectionBar(): void {
    const affection = this.gameState.getAffection();
    const percentage = ((affection + 10) / 20) * 100;
    this.affectionFill.style.width = `${percentage}%`;

    let color = '#9e9e9e';
    if (affection > 0) {
      const intensity = Math.min(affection / 10, 1);
      color = `rgb(${Math.floor(186 + 40 * intensity)}, ${Math.floor(104 - 50 * intensity)}, ${Math.floor(200 - 50 * intensity)})`;
    } else if (affection < 0) {
      const intensity = Math.min(Math.abs(affection) / 10, 1);
      color = `rgb(${Math.floor(239 + 16 * intensity)}, ${Math.floor(83 - 30 * intensity)}, ${Math.floor(80 - 40 * intensity)})`;
    }
    this.affectionFill.style.backgroundColor = color;

    this.affectionText.textContent = `好感度: ${affection > 0 ? '+' : ''}${affection}`;
  }

  private animateAffectionChange(): void {
    this.gameState.setAffectionAnimating(true);
    this.affectionBar.style.transform = 'scaleX(1.05)';
    setTimeout(() => {
      this.affectionBar.style.transform = 'scaleX(1)';
      this.gameState.setAffectionAnimating(false);
    }, 500);
  }

  private updateSceneTitle(): void {
    const scene = this.gameState.getCurrentScene();
    this.sceneTitle.textContent = scene.name;
  }

  private showSkipButton(): void {
    this.skipButton.style.opacity = '1';
    this.skipButton.style.pointerEvents = 'auto';
  }

  private hideSkipButton(): void {
    this.skipButton.style.opacity = '0';
    this.skipButton.style.pointerEvents = 'none';
  }

  private showRestartButton(): void {
    this.restartButton.style.opacity = '1';
    this.restartButton.style.pointerEvents = 'auto';
    this.restartButton.style.transform = 'translateY(0)';
  }

  private hideRestartButton(): void {
    this.restartButton.style.opacity = '0';
    this.restartButton.style.pointerEvents = 'none';
    this.restartButton.style.transform = 'translateY(20px)';
  }

  private restart(): void {
    this.gameState.reset();
    this.sceneManager.resetTypewriter();
    this.updateSceneTitle();
    this.updateAffectionBar();
    this.updateVoteButtons();
    this.hideVoteUI();
    this.hideRestartButton();
    this.showSkipButton();

    const transition = this.gameState.getSceneTransition();
    transition.active = true;
    transition.direction = 'in';
    transition.progress = 0;
    this.gameState.setSceneTransition(transition);
    this.gameState.setPhase('dialog');
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    const phase = this.gameState.getPhase();

    if (phase === 'voting') {
      this.voteTimer += dt;
      this.updateVoteProgress();

      if (this.voteTimer >= VOTE_DURATION) {
        this.endVoting();
      }
    }

    if (phase === 'reaction') {
      this.reactionTimer += dt;
      if (this.reactionTimer >= REACTION_DURATION) {
        this.endReaction();
      }
    }

    if (phase === 'transition') {
      const transition = this.gameState.getSceneTransition();
      if (transition.active) {
        transition.progress += dt / (TRANSITION_DURATION / 2);
        if (transition.progress >= 1) {
          transition.progress = 1;
          if (transition.direction === 'out') {
            transition.direction = 'in';
            transition.progress = 0;
          } else {
            this.endTransition();
          }
        }
        this.gameState.setSceneTransition(transition);
      }
    }

    this.sceneManager.update(dt);
    this.danmakuSystem.update(dt);
  }

  private render(): void {
    this.sceneManager.draw();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();

  (window as unknown as { game: Game }).game = game;
});
