import { MapManager } from './MapManager';
import { BattleEngine } from './BattleEngine';
import { UIRenderer } from './UIRenderer';
import { GameState, TransitionState, Pokemon, BattleAction, CANVAS_WIDTH, CANVAS_HEIGHT } from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private mapManager: MapManager;
  private battleEngine: BattleEngine;
  private uiRenderer: UIRenderer;
  private gameState: GameState = 'map';
  private keys: Set<string> = new Set();
  private lastTime: number = 0;
  private transition: TransitionState = {
    active: false,
    type: 'in',
    progress: 0,
    fromState: 'map',
    toState: 'battle'
  };
  private pendingBattlePokemon: Pokemon | null = null;
  private buttonY: number = 260;
  private animationFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    
    this.mapManager = new MapManager();
    this.battleEngine = new BattleEngine();
    this.uiRenderer = new UIRenderer(this.canvas);
    
    this.setupCanvas();
    this.setupInput();
    this.setupEvents();
    
    this.gameLoop = this.gameLoop.bind(this);
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private setupCanvas(): void {
    const updateSize = () => {
      const scale = this.uiRenderer.getScale();
      this.canvas.width = CANVAS_WIDTH;
      this.canvas.height = CANVAS_HEIGHT;
      this.canvas.style.width = `${CANVAS_WIDTH * scale / 2}px`;
      this.canvas.style.height = `${CANVAS_HEIGHT * scale / 2}px`;
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      this.handleKeyPress(e.key.toLowerCase());
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleTouch(touch.clientX, touch.clientY);
    });
    
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }

  private handleKeyPress(key: string): void {
    if (this.gameState === 'map') {
      if (key === 'w' || key === 'arrowup') {
        this.mapManager.movePlayer('up');
      } else if (key === 's' || key === 'arrowdown') {
        this.mapManager.movePlayer('down');
      } else if (key === 'a' || key === 'arrowleft') {
        this.mapManager.movePlayer('left');
      } else if (key === 'd' || key === 'arrowright') {
        this.mapManager.movePlayer('right');
      } else if (key === 't' || key === 'tab') {
        this.openTeamPanel();
      }
    } else if (this.gameState === 'battle') {
      if (key === '1') {
        this.handleBattleAction(0);
      } else if (key === '2') {
        this.handleBattleAction(1);
      } else if (key === '3') {
        this.handleBattleAction(2);
      } else if (key === '4') {
        this.handleBattleAction(3);
      }
    } else if (this.gameState === 'team') {
      if (key === 'escape' || key === 't' || key === 'tab') {
        this.closeTeamPanel();
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.uiRenderer.getScale();
    const x = (e.clientX - rect.left) / (scale / 2);
    const y = (e.clientY - rect.top) / (scale / 2);
    
    this.processClick(x, y);
  }

  private handleTouch(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.uiRenderer.getScale();
    const x = (clientX - rect.left) / (scale / 2);
    const y = (clientY - rect.top) / (scale / 2);
    
    this.processClick(x, y);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.gameState !== 'battle') return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.uiRenderer.getScale();
    const x = (e.clientX - rect.left) / (scale / 2);
    const y = (e.clientY - rect.top) / (scale / 2);
    
    const buttonIndex = this.uiRenderer.getButtonAtPosition(x, y, this.buttonY);
    this.uiRenderer.setHoveredButton(buttonIndex);
    
    this.canvas.style.cursor = buttonIndex >= 0 ? 'pointer' : 'default';
  }

  private processClick(x: number, y: number): void {
    if (this.gameState === 'battle') {
      const buttonIndex = this.uiRenderer.getButtonAtPosition(x, y, this.buttonY);
      if (buttonIndex >= 0) {
        this.handleBattleAction(buttonIndex);
      }
    } else if (this.gameState === 'team') {
      const slotIndex = this.uiRenderer.getTeamSlotAtPosition(x, y);
      if (slotIndex >= 0 && slotIndex < this.mapManager.getTeam().length) {
        this.releasePokemon(slotIndex);
      } else {
        this.closeTeamPanel();
      }
    }
  }

  private handleBattleAction(buttonIndex: number): void {
    const actions: BattleAction[] = ['attack', 'capture', 'run', 'team'];
    const action = actions[buttonIndex];
    
    if (action === 'team') {
      this.openTeamPanel();
      return;
    }
    
    this.battleEngine.playerAction(action);
  }

  private setupEvents(): void {
    this.mapManager.setOnEncounter((pokemon) => {
      this.startTransition('map', 'battle', pokemon);
    });
    
    this.battleEngine.setOnBattleEnd((result, capturedPokemon) => {
      this.handleBattleEnd(result, capturedPokemon);
    });
  }

  private startTransition(from: GameState, to: GameState, pokemon?: Pokemon): void {
    if (pokemon) {
      this.pendingBattlePokemon = pokemon;
    }
    
    this.transition = {
      active: true,
      type: 'out',
      progress: 0,
      fromState: from,
      toState: to
    };
  }

  private updateTransition(deltaTime: number): void {
    if (!this.transition.active) return;
    
    this.transition.progress += deltaTime * 0.002;
    
    if (this.transition.progress >= 1) {
      if (this.transition.type === 'out') {
        this.switchState(this.transition.toState);
        
        this.transition.type = 'in';
        this.transition.progress = 0;
      } else {
        this.transition.active = false;
        this.transition.progress = 0;
      }
    }
  }

  private switchState(newState: GameState): void {
    this.gameState = newState;
    
    if (newState === 'battle' && this.pendingBattlePokemon) {
      const playerPokemon = this.mapManager.getFirstAlivePokemon();
      if (playerPokemon) {
        this.battleEngine.startBattle(playerPokemon, this.pendingBattlePokemon);
      }
      this.pendingBattlePokemon = null;
    }
  }

  private handleBattleEnd(result: 'win' | 'lose' | 'captured' | 'ran', capturedPokemon?: Pokemon): void {
    if (result === 'captured' && capturedPokemon) {
      const success = this.mapManager.addToTeam(capturedPokemon);
      if (!success) {
        console.log('队伍已满！');
      }
    }
    
    const battleState = this.battleEngine.getState();
    if (battleState.playerPokemon) {
      const team = this.mapManager.getTeam();
      const idx = team.findIndex(p => p.id === battleState.playerPokemon!.id);
      if (idx >= 0) {
        team[idx].currentHp = battleState.playerPokemon.currentHp;
      }
    }
    
    setTimeout(() => {
      this.startTransition('battle', 'map');
    }, 500);
  }

  private openTeamPanel(): void {
    if (this.gameState === 'team') return;
    this.gameState = 'team';
  }

  private closeTeamPanel(): void {
    if (this.gameState !== 'team') return;
    
    const battleState = this.battleEngine.getState();
    if (battleState.enemyPokemon && !battleState.battleEnded) {
      this.gameState = 'battle';
    } else {
      this.gameState = 'map';
    }
  }

  private releasePokemon(index: number): void {
    const team = this.mapManager.getTeam();
    if (team.length <= 1) {
      return;
    }
    
    const battleState = this.battleEngine.getState();
    if (this.gameState === 'battle' && battleState.playerPokemon?.id === team[index].id) {
      return;
    }
    
    this.uiRenderer.addReleaseAnimation(index);
    
    setTimeout(() => {
      this.mapManager.removeFromTeam(index);
      this.uiRenderer.setSelectedTeamIndex(-1);
    }, 300);
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  private update(deltaTime: number): void {
    this.mapManager.update(deltaTime);
    this.battleEngine.update(deltaTime);
    this.uiRenderer.updateReleaseAnimations(deltaTime);
    this.updateTransition(deltaTime);
    
    if (this.gameState === 'map' && !this.transition.active) {
      if (this.keys.has('w') || this.keys.has('arrowup')) {
        this.mapManager.movePlayer('up');
      } else if (this.keys.has('s') || this.keys.has('arrowdown')) {
        this.mapManager.movePlayer('down');
      } else if (this.keys.has('a') || this.keys.has('arrowleft')) {
        this.mapManager.movePlayer('left');
      } else if (this.keys.has('d') || this.keys.has('arrowright')) {
        this.mapManager.movePlayer('right');
      }
    }
  }

  private render(): void {
    const player = this.mapManager.getPlayer();
    const map = this.mapManager.getMap();
    const cameraOffset = this.mapManager.getCameraOffset();
    const animFrame = this.mapManager.getAnimationFrame();
    const isFlashing = this.mapManager.getIsFlashing();
    const flashFrame = this.mapManager.getFlashFrame();
    
    const battleState = this.battleEngine.getState();
    const particles = this.battleEngine.getParticles();
    const battleAnimTime = this.battleEngine.getAnimationTime();
    const captureShakes = this.battleEngine.getCaptureShakeProgress();
    
    const team = this.mapManager.getTeam();
    
    this.uiRenderer.render(
      this.gameState,
      map,
      player,
      cameraOffset,
      animFrame,
      isFlashing,
      flashFrame,
      battleState,
      particles,
      battleAnimTime,
      captureShakes,
      this.transition,
      team
    );
    
    if (this.gameState === 'battle' && !this.transition.active) {
      const disabled = battleState.turn !== 'player' || battleState.isAnimating || battleState.battleEnded;
      this.uiRenderer.renderBattleButtons(this.buttonY, disabled);
    }
  }
}

window.addEventListener('load', () => {
  new Game();
});
