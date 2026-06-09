import React from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { GameUI } from './components/GameUI';
import { BattleScene } from './scenes/BattleScene';
import { eventBus } from './core/EventBus';
import { Elemental, Skill, createPlayerTeam, createEnemyTeam } from './entities/Elemental';

type TurnPhase = 'player' | 'enemy' | 'selecting' | 'animating' | 'ended';

class GameController {
  private playerTeam: Elemental[];
  private enemyTeam: Elemental[];
  private turnOrder: Elemental[] = [];
  private currentTurnIndex: number = 0;
  private currentTurn: number = 1;
  private turnPhase: TurnPhase = 'selecting';
  private comboCount: number = 0;
  private lastKillByAdvantage: boolean = false;
  private selectedSkill: Skill | null = null;
  private game: Phaser.Game | null = null;
  private battleScene: BattleScene | null = null;
  private battleMessage: string = '战斗开始！';
  private pendingBonusTurns: number = 0;

  constructor() {
    this.playerTeam = createPlayerTeam();
    this.enemyTeam = createEnemyTeam();
  }

  start(): void {
    this.initPhaser();
    this.initReact();
    this.setupEventListeners();
  }

  private initPhaser(): void {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: '100%',
      height: '100%',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      backgroundColor: '#1a0a2e',
      scene: [BattleScene],
      fps: {
        target: 60,
        forceSetTimeOut: false
      }
    };

    this.game = new Phaser.Game(config);

    this.game.events.once('ready', () => {
      this.battleScene = this.game!.scene.getScene('BattleScene') as BattleScene;
      setTimeout(() => {
        this.initializeBattle();
      }, 500);
    });
  }

  private initReact(): void {
    const uiContainer = document.getElementById('ui-layer');
    if (uiContainer) {
      const root = createRoot(uiContainer);
      root.render(React.createElement(GameUI));
    }
  }

  private setupEventListeners(): void {
    eventBus.on('battle:start', () => {
      // Scene is ready, wait for controller to initialize
    });

    eventBus.on('skill:selected', (data: { skill: Skill; targetId: string | null }) => {
      if (this.turnPhase !== 'selecting') return;
      this.selectedSkill = data.skill;

      if (data.skill.isAoe || data.skill.type === 'defense') {
        this.executePlayerAction(data.skill, data.targetId);
      }
    });

    eventBus.on('target:selected', (targetId: string) => {
      if (this.turnPhase !== 'selecting' || !this.selectedSkill) return;
      this.executePlayerAction(this.selectedSkill, targetId);
    });
  }

  private initializeBattle(): void {
    if (this.battleScene) {
      this.battleScene.setupCharacters(this.playerTeam, this.enemyTeam);
    }
    this.buildTurnOrder();
    this.startNextActorTurn();
    this.emitUIUpdate();
  }

  private buildTurnOrder(): void {
    const allCharacters = [...this.playerTeam, ...this.enemyTeam].filter(c => c.isAlive);
    this.turnOrder = allCharacters.sort((a, b) => b.speed - a.speed);
    this.currentTurnIndex = 0;
  }

  private startNextActorTurn(): void {
    if (this.checkBattleEnd()) return;

    if (this.pendingBonusTurns > 0) {
      this.pendingBonusTurns--;
      this.battleMessage = `获得额外行动回合！`;
    }

    while (this.currentTurnIndex < this.turnOrder.length) {
      const actor = this.turnOrder[this.currentTurnIndex];
      if (actor.isAlive) {
        if (actor.extraTurns > 0) {
          actor.extraTurns--;
        }
        this.processActorTurn(actor);
        return;
      }
      this.currentTurnIndex++;
    }

    this.endRound();
  }

  private processActorTurn(actor: Elemental): void {
    if (this.battleScene) {
      this.battleScene.highlightActiveActor(actor.id);
    }

    if (actor.team === 'player') {
      this.turnPhase = 'selecting';
      this.battleMessage = `${actor.name} 的回合 - 选择技能`;
      this.emitUIUpdate();
    } else {
      this.turnPhase = 'enemy';
      this.battleMessage = `${actor.name} 正在思考...`;
      this.emitUIUpdate();
      setTimeout(() => this.executeAIAction(actor), 800 + Math.random() * 700);
    }
  }

  private executePlayerAction(skill: Skill, targetId: string | null): void {
    const actor = this.turnOrder[this.currentTurnIndex];
    if (!actor || actor.team !== 'player') return;

    this.selectedSkill = null;

    let targets: Elemental[];
    if (skill.type === 'defense') {
      targets = [];
    } else if (skill.isAoe) {
      targets = this.enemyTeam.filter(c => c.isAlive);
    } else {
      const target = this.enemyTeam.find(c => c.id === targetId && c.isAlive);
      targets = target ? [target] : [];
      if (!target) {
        this.battleMessage = '请选择有效的目标！';
        this.emitUIUpdate();
        return;
      }
    }

    this.executeAction(actor, skill, targets);
  }

  private executeAIAction(actor: Elemental): void {
    const { skill, targets } = this.decideAIAction(actor);
    this.executeAction(actor, skill, targets);
  }

  private decideAIAction(actor: Elemental): { skill: Skill; targets: Elemental[] } {
    const availableSkills = actor.skills.filter(s => s.currentCooldown === 0);
    const aliveEnemies = this.playerTeam.filter(c => c.isAlive);

    if (aliveEnemies.length === 0) {
      return { skill: availableSkills[0], targets: [] };
    }

    if (actor.getHpPercentage() < 0.3) {
      const defenseSkill = availableSkills.find(s => s.type === 'defense');
      if (defenseSkill && Math.random() > 0.5) {
        return { skill: defenseSkill, targets: [] };
      }
    }

    let bestScore = -Infinity;
    let bestAction: { skill: Skill; targets: Elemental[] } | null = null;

    for (const skill of availableSkills) {
      if (skill.type === 'defense') {
        if (actor.getHpPercentage() < 0.4) {
          const score = (1 - actor.getHpPercentage()) * 30;
          if (score > bestScore) {
            bestScore = score;
            bestAction = { skill, targets: [] };
          }
        }
        continue;
      }

      const potentialTargets = skill.isAoe ? aliveEnemies : aliveEnemies;

      if (skill.isAoe) {
        let totalScore = 0;
        for (const target of potentialTargets) {
          const multiplier = Elemental.getElementMultiplier(actor.element, target.element);
          const hpFactor = 1 - target.getHpPercentage();
          totalScore += skill.damage * multiplier + hpFactor * 20;
        }
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestAction = { skill, targets: potentialTargets };
        }
      } else {
        for (const target of potentialTargets) {
          const multiplier = Elemental.getElementMultiplier(actor.element, target.element);
          const hpFactor = 1 - target.getHpPercentage();
          const score = skill.damage * multiplier + hpFactor * 40 + (multiplier > 1 ? 30 : 0);

          if (score > bestScore) {
            bestScore = score;
            bestAction = { skill, targets: [target] };
          }
        }
      }
    }

    return bestAction || { skill: availableSkills[0], targets: [aliveEnemies[0]] };
  }

  private executeAction(actor: Elemental, skill: Skill, targets: Elemental[]): void {
    this.turnPhase = 'animating';

    const { results, usedSkill } = actor.useSkill(skill.id, targets);

    if (!usedSkill) {
      this.battleMessage = `${actor.name} 无法使用 ${skill.name}！`;
      this.emitUIUpdate();
      setTimeout(() => this.finishActorTurn(), 500);
      return;
    }

    if (skill.type === 'defense') {
      this.battleMessage = `${actor.name} 进入防御姿态！`;
      this.emitUIUpdate();
      setTimeout(() => this.finishActorTurn(), 800);
      return;
    }

    const targetIds = targets.map(t => t.id);
    eventBus.emit('effect:play', {
      attackerId: actor.id,
      targetIds,
      skill,
      attackerElement: skill.element || actor.element
    });

    setTimeout(() => eventBus.emit('shake:screen'), 200);

    let anyKill = false;
    let anyAdvantageKill = false;
    const resultMessages: string[] = [];

    results.forEach(result => {
      const multiplierText = result.multiplier > 1
        ? ` (元素克制 x${result.multiplier})`
        : result.multiplier < 1
          ? ` (同元素抗性 x${result.multiplier})`
          : '';

      resultMessages.push(`${result.target.name} 受到 ${result.damage} 点伤害${multiplierText}`);

      if (result.multiplier > 1) {
        eventBus.emit('element:advantage', {
          targetId: result.target.id,
          attackerElement: skill.element || actor.element,
          multiplier: result.multiplier
        });
      }

      if (result.isKill) {
        anyKill = true;
        resultMessages.push(`💀 ${result.target.name} 被击败！`);
        eventBus.emit('character:death', {
          characterId: result.target.id,
          team: result.target.team,
          killedByCombo: false
        });

        if (result.multiplier > 1) {
          anyAdvantageKill = true;
        }
      }
    });

    this.battleMessage = `${actor.name} 使用了 ${skill.name}！`;
    this.emitUIUpdate();

    setTimeout(() => {
      if (anyKill && actor.team === 'player' && anyAdvantageKill) {
        this.comboCount++;
        this.lastKillByAdvantage = true;
        eventBus.emit('combo:trigger', { comboCount: this.comboCount });
        this.applyComboBonus(actor);
      } else if (!anyAdvantageKill) {
        if (this.comboCount > 0) {
          this.comboCount = 0;
          eventBus.emit('combo:trigger', { comboCount: 0 });
        }
        this.lastKillByAdvantage = false;
      }

      this.battleMessage = resultMessages.join(' | ');
      this.emitUIUpdate();

      setTimeout(() => this.finishActorTurn(), 1200);
    }, 600);
  }

  private applyComboBonus(actor: Elemental): void {
    if (this.comboCount === 3) {
      actor.damageBoost = 1.5;
      this.battleMessage += ' ⚡ 连击奖励！下次攻击伤害 +50%';
      eventBus.emit('combo:bonus', { comboCount: 3, bonusType: 'damage_boost' });
    } else if (this.comboCount === 5) {
      this.pendingBonusTurns += 1;
      this.battleMessage += ' ⚡ 连击奖励！获得额外行动回合！';
      eventBus.emit('combo:bonus', { comboCount: 5, bonusType: 'extra_turn' });
    } else if (this.comboCount === 10) {
      this.pendingBonusTurns += 2;
      actor.damageBoost = 2;
      this.battleMessage += ' ⚡ 10连击超神！获得2个额外回合和100%伤害加成！';
      eventBus.emit('combo:bonus', { comboCount: 10, bonusType: 'extra_turn' });
    }
  }

  private finishActorTurn(): void {
    const actor = this.turnOrder[this.currentTurnIndex];
    if (actor) {
      actor.tickCooldowns();
    }

    if (this.pendingBonusTurns > 0 && actor?.team === 'player') {
      this.pendingBonusTurns--;
      this.battleMessage = `连击奖励：${actor.name} 获得额外行动！`;
      this.processActorTurn(actor);
      this.emitUIUpdate();
      return;
    }

    this.currentTurnIndex++;
    this.startNextActorTurn();
  }

  private endRound(): void {
    this.currentTurn++;
    this.playerTeam.forEach(c => c.tickCooldowns());
    this.enemyTeam.forEach(c => c.tickCooldowns());
    this.buildTurnOrder();
    this.battleMessage = `=== 第 ${this.currentTurn} 回合开始 ===`;
    this.emitUIUpdate();

    setTimeout(() => this.startNextActorTurn(), 800);
  }

  private checkBattleEnd(): boolean {
    const playerAlive = this.playerTeam.some(c => c.isAlive);
    const enemyAlive = this.enemyTeam.some(c => c.isAlive);

    if (!playerAlive || !enemyAlive) {
      this.turnPhase = 'ended';
      this.battleMessage = playerAlive ? '🎉 恭喜你获得胜利！' : '💀 战斗失败...';
      eventBus.emit('battle:end', {
        winner: playerAlive ? 'player' : 'enemy',
        turns: this.currentTurn
      });
      this.emitUIUpdate();
      return true;
    }
    return false;
  }

  private emitUIUpdate(): void {
    eventBus.emit('ui:update', {
      playerTeam: this.playerTeam.map(c => c.toSerializable()),
      enemyTeam: this.enemyTeam.map(c => c.toSerializable()),
      currentTurn: this.currentTurn,
      currentActorId: this.turnOrder[this.currentTurnIndex]?.id || null,
      comboCount: this.comboCount,
      turnPhase: this.turnPhase,
      battleMessage: this.battleMessage
    });
  }
}

const game = new GameController();
game.start();
