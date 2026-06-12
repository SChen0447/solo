import { Pokemon, BattleState, BattleAction, TYPE_CHART, RUN_SUCCESS_RATE, CAPTURE_BASE_RATE, Particle, ELEMENT_COLORS } from './types';

export class BattleEngine {
  private state: BattleState;
  private onBattleEnd: ((result: 'win' | 'lose' | 'captured' | 'ran', pokemon?: Pokemon) => void) | null = null;
  private particles: Particle[] = [];
  private animationTime: number = 0;
  private enemyAttackTimer: number = 0;
  private hpAnimation: { target: Pokemon; from: number; to: number; time: number; duration: number } | null = null;

  constructor() {
    this.state = {
      playerPokemon: null,
      enemyPokemon: null,
      turn: 'player',
      message: '',
      isAnimating: false,
      captureShakes: 0,
      battleEnded: false,
      result: null
    };
  }

  public startBattle(playerPokemon: Pokemon, wildPokemon: Pokemon): void {
    this.state = {
      playerPokemon: { ...playerPokemon },
      enemyPokemon: { ...wildPokemon },
      turn: 'player',
      message: `野生的 ${wildPokemon.name} 出现了！`,
      isAnimating: false,
      captureShakes: 0,
      battleEnded: false,
      result: null
    };
    this.particles = [];
    this.animationTime = 0;
    this.enemyAttackTimer = 0;
  }

  public setOnBattleEnd(callback: (result: 'win' | 'lose' | 'captured' | 'ran', pokemon?: Pokemon) => void): void {
    this.onBattleEnd = callback;
  }

  public getState(): BattleState {
    return this.state;
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getAnimationTime(): number {
    return this.animationTime;
  }

  public update(deltaTime: number): void {
    this.animationTime += deltaTime * 0.06;
    
    this.updateParticles(deltaTime);
    
    if (this.hpAnimation) {
      this.hpAnimation.time += deltaTime;
      const progress = Math.min(this.hpAnimation.time / this.hpAnimation.duration, 1);
      const currentHp = this.hpAnimation.from + (this.hpAnimation.to - this.hpAnimation.from) * progress;
      this.hpAnimation.target.currentHp = currentHp;
      
      if (progress >= 1) {
        this.hpAnimation.target.currentHp = this.hpAnimation.to;
        this.hpAnimation = null;
      }
    }
    
    if (this.state.turn === 'enemy' && !this.state.isAnimating && !this.state.battleEnded) {
      this.enemyAttackTimer += deltaTime;
      if (this.enemyAttackTimer >= 1000) {
        this.enemyAttack();
        this.enemyAttackTimer = 0;
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime * 0.06;
      p.y += p.vy * deltaTime * 0.06;
      p.vy += 0.1 * deltaTime * 0.06;
      p.life -= deltaTime * 0.06;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public playerAction(action: BattleAction): boolean {
    if (this.state.turn !== 'player' || this.state.isAnimating || this.state.battleEnded) {
      return false;
    }
    
    switch (action) {
      case 'attack':
        this.playerAttack();
        break;
      case 'capture':
        this.attemptCapture();
        break;
      case 'run':
        this.attemptRun();
        break;
      case 'team':
        return false;
    }
    
    return true;
  }

  private playerAttack(): void {
    if (!this.state.playerPokemon || !this.state.enemyPokemon) return;
    
    this.state.isAnimating = true;
    
    const damage = this.calculateDamage(this.state.playerPokemon, this.state.enemyPokemon);
    const typeMultiplier = TYPE_CHART[this.state.playerPokemon.element][this.state.enemyPokemon.element];
    
    let message = `${this.state.playerPokemon.name} 使用了攻击！`;
    if (typeMultiplier > 1) {
      message += ' 效果拔群！';
    } else if (typeMultiplier < 1) {
      message += ' 效果不佳...';
    }
    
    this.state.message = message;
    
    this.createAttackParticles(
      this.state.enemyPokemon.element,
      true
    );
    
    const newHp = Math.max(0, this.state.enemyPokemon.currentHp - damage);
    this.hpAnimation = {
      target: this.state.enemyPokemon,
      from: this.state.enemyPokemon.currentHp,
      to: newHp,
      time: 0,
      duration: 500
    };
    
    setTimeout(() => {
      this.state.isAnimating = false;
      
      if (this.state.enemyPokemon && this.state.enemyPokemon.currentHp <= 0) {
        this.state.battleEnded = true;
        this.state.result = 'win';
        this.state.message = `${this.state.enemyPokemon.name} 倒下了！`;
        
        setTimeout(() => {
          if (this.onBattleEnd) {
            this.onBattleEnd('win');
          }
        }, 1500);
      } else {
        this.state.turn = 'enemy';
        this.enemyAttackTimer = 0;
      }
    }, 800);
  }

  private enemyAttack(): void {
    if (!this.state.playerPokemon || !this.state.enemyPokemon) return;
    
    this.state.isAnimating = true;
    
    const damage = this.calculateDamage(this.state.enemyPokemon, this.state.playerPokemon);
    const typeMultiplier = TYPE_CHART[this.state.enemyPokemon.element][this.state.playerPokemon.element];
    
    let message = `${this.state.enemyPokemon.name} 发动了攻击！`;
    if (typeMultiplier > 1) {
      message += ' 效果拔群！';
    } else if (typeMultiplier < 1) {
      message += ' 效果不佳...';
    }
    
    this.state.message = message;
    
    this.createAttackParticles(
      this.state.playerPokemon.element,
      false
    );
    
    const newHp = Math.max(0, this.state.playerPokemon.currentHp - damage);
    this.hpAnimation = {
      target: this.state.playerPokemon,
      from: this.state.playerPokemon.currentHp,
      to: newHp,
      time: 0,
      duration: 500
    };
    
    setTimeout(() => {
      this.state.isAnimating = false;
      
      if (this.state.playerPokemon && this.state.playerPokemon.currentHp <= 0) {
        this.state.battleEnded = true;
        this.state.result = 'lose';
        this.state.message = `${this.state.playerPokemon.name} 倒下了！`;
        
        setTimeout(() => {
          if (this.onBattleEnd) {
            this.onBattleEnd('lose');
          }
        }, 1500);
      } else {
        this.state.turn = 'player';
        this.state.message = '选择你的行动！';
      }
    }, 800);
  }

  private calculateDamage(attacker: Pokemon, defender: Pokemon): number {
    const typeMultiplier = TYPE_CHART[attacker.element][defender.element];
    const baseDamage = ((2 * attacker.level / 5 + 2) * attacker.attack * 10 / defender.defense) / 50 + 2;
    const randomFactor = 0.85 + Math.random() * 0.15;
    
    return Math.max(1, Math.floor(baseDamage * typeMultiplier * randomFactor));
  }

  private attemptCapture(): void {
    if (!this.state.enemyPokemon) return;
    
    this.state.isAnimating = true;
    this.state.message = '投出了精灵球！';
    
    const hpRatio = this.state.enemyPokemon.currentHp / this.state.enemyPokemon.maxHp;
    const captureRate = CAPTURE_BASE_RATE + (1 - hpRatio) * 0.6;
    
    this.state.captureShakes = 0;
    
    const shakeInterval = setInterval(() => {
      this.state.captureShakes++;
      
      if (this.state.captureShakes >= 3) {
        clearInterval(shakeInterval);
        
        const success = Math.random() < captureRate;
        
        if (success) {
          this.state.battleEnded = true;
          this.state.result = 'captured';
          this.state.message = `成功捕捉了 ${this.state.enemyPokemon!.name}！`;
          
          setTimeout(() => {
            if (this.onBattleEnd && this.state.enemyPokemon) {
              this.onBattleEnd('captured', { ...this.state.enemyPokemon });
            }
          }, 1500);
        } else {
          this.state.message = `${this.state.enemyPokemon!.name} 挣脱了精灵球！`;
          this.state.captureShakes = 0;
          
          setTimeout(() => {
            this.state.isAnimating = false;
            this.state.turn = 'enemy';
            this.enemyAttackTimer = 0;
          }, 800);
        }
      }
    }, 600);
  }

  private attemptRun(): void {
    this.state.isAnimating = true;
    this.state.message = '尝试逃跑...';
    
    setTimeout(() => {
      const success = Math.random() < RUN_SUCCESS_RATE;
      
      if (success) {
        this.state.battleEnded = true;
        this.state.result = 'ran';
        this.state.message = '成功逃跑了！';
        
        setTimeout(() => {
          if (this.onBattleEnd) {
            this.onBattleEnd('ran');
          }
        }, 1000);
      } else {
        this.state.message = '逃跑失败了！';
        
        setTimeout(() => {
          this.state.isAnimating = false;
          this.state.turn = 'enemy';
          this.enemyAttackTimer = 0;
        }, 500);
      }
    }, 800);
  }

  private createAttackParticles(element: string, isEnemy: boolean): void {
    const color = ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] || '#ffffff';
    const centerX = isEnemy ? 360 : 120;
    const centerY = isEnemy ? 100 : 180;
    
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 3;
      
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  public getCaptureShakeProgress(): number {
    return this.state.captureShakes;
  }

  public isHpAnimating(): boolean {
    return this.hpAnimation !== null;
  }
}
