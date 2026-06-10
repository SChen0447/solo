import { Character, HexCoord, HighlightState, BattleReport, BattleReportEntry, Skill, Team } from './types';
import { MapRenderer } from './MapRenderer';
import { ActionPreviewer } from './ActionPreviewer';
import { orderBy } from 'lodash';

const AVATAR_POOL = ['🗡️', '🛡️', '🏹', '⚔️', '🔮', '💀', '👹', '🧙', '🧝', '🧛', '🦸', '🥷'];
const RED_NAMES = ['红战士', '红法师', '红弓手'];
const BLUE_NAMES = ['蓝骑士', '蓝牧师', '蓝刺客'];

export class GameManager {
  private characters: Character[] = [];
  private actionOrder: Map<string, number> = new Map();
  private selectedCharacterId: string | null = null;
  private selectedSkillId: string | null = null;
  private mapRenderer: MapRenderer;
  private actionPreviewer: ActionPreviewer;
  private onStateChangeCallback: ((state: {
    characters: Character[];
    selectedCharacterId: string | null;
    selectedSkillId: string | null;
    actionOrder: Map<string, number>;
  }) => void) | null = null;
  private onBattleReportCallback: ((report: BattleReport) => void) | null = null;

  constructor(mapRenderer: MapRenderer, actionPreviewer: ActionPreviewer) {
    this.mapRenderer = mapRenderer;
    this.actionPreviewer = actionPreviewer;
    this.bindEvents();
    this.initializeCharacters();
    this.calculateActionOrder();
    this.syncRenderers();
  }

  private bindEvents(): void {
    this.mapRenderer.setOnHexClick((coord) => this.handleHexClick(coord));
    this.actionPreviewer.setOnHighlightChange((state) => this.handleHighlightChange(state));
  }

  private initializeCharacters(): void {
    const usedAvatars = new Set<string>();
    const getRandomAvatar = (): string => {
      const available = AVATAR_POOL.filter((a) => !usedAvatars.has(a));
      const choice = available[Math.floor(Math.random() * available.length)] || '⚔️';
      usedAvatars.add(choice);
      return choice;
    };

    const randomSpeed = (): number => Math.floor(Math.random() * 21) + 10;

    const createSkills = (): Skill[] => [
      {
        id: 'melee',
        name: '近战攻击',
        type: 'melee',
        range: 1,
        damage: 25,
        description: '对相邻格子的单个目标造成伤害'
      },
      {
        id: 'cross',
        name: '十字冲击',
        type: 'cross',
        range: 2,
        damage: 18,
        aoeRadius: 1,
        description: '以目标为中心的十字形范围伤害'
      }
    ];

    const redPositions: HexCoord[] = [
      { q: 1, r: 1 },
      { q: 2, r: 2 },
      { q: 1, r: 3 }
    ];
    const bluePositions: HexCoord[] = [
      { q: 6, r: 5 },
      { q: 5, r: 5 },
      { q: 6, r: 6 }
    ];

    const createCharacter = (
      id: string,
      name: string,
      team: Team,
      position: HexCoord
    ): Character => ({
      id,
      name,
      team,
      avatar: getRandomAvatar(),
      speed: randomSpeed(),
      position,
      skills: createSkills()
    });

    this.characters = [
      createCharacter('red-1', RED_NAMES[0], 'red', redPositions[0]),
      createCharacter('red-2', RED_NAMES[1], 'red', redPositions[1]),
      createCharacter('red-3', RED_NAMES[2], 'red', redPositions[2]),
      createCharacter('blue-1', BLUE_NAMES[0], 'blue', bluePositions[0]),
      createCharacter('blue-2', BLUE_NAMES[1], 'blue', bluePositions[1]),
      createCharacter('blue-3', BLUE_NAMES[2], 'blue', bluePositions[2])
    ];
  }

  public calculateActionOrder(): void {
    const sorted = orderBy(this.characters, ['speed'], ['desc']);
    this.actionOrder.clear();
    sorted.forEach((char, index) => {
      this.actionOrder.set(char.id, index + 1);
    });
  }

  private handleHexClick(coord: HexCoord): void {
    if (coord.q === -1 && coord.r === -1) {
      this.actionPreviewer.handleHexClick(coord);
      return;
    }

    const clickedChar = this.characters.find(
      (c) => c.position.q === coord.q && c.position.r === coord.r
    );

    if (clickedChar && !this.selectedSkillId) {
      this.selectCharacter(clickedChar.id);
      return;
    }

    this.actionPreviewer.handleHexClick(coord);
  }

  private handleHighlightChange(state: HighlightState): void {
    this.mapRenderer.setHighlight(state);
  }

  public setOnStateChange(
    callback: (state: {
      characters: Character[];
      selectedCharacterId: string | null;
      selectedSkillId: string | null;
      actionOrder: Map<string, number>;
    }) => void
  ): void {
    this.onStateChangeCallback = callback;
    this.notifyStateChange();
  }

  public setOnBattleReport(callback: (report: BattleReport) => void): void {
    this.onBattleReportCallback = callback;
  }

  public selectCharacter(id: string | null): void {
    this.selectedCharacterId = id;
    this.selectedSkillId = null;

    const char = id ? this.characters.find((c) => c.id === id) || null : null;
    this.actionPreviewer.setSelectedCharacter(char);
    this.syncRenderers();
    this.notifyStateChange();
  }

  public selectSkill(skillId: string | null): void {
    this.selectedSkillId = skillId;
    if (!this.selectedCharacterId) {
      this.notifyStateChange();
      return;
    }
    const char = this.characters.find((c) => c.id === this.selectedCharacterId);
    const skill = skillId && char ? char.skills.find((s) => s.id === skillId) || null : null;
    this.actionPreviewer.setSelectedSkill(skill);
    this.notifyStateChange();
  }

  public setCharacterSpeed(id: string, speed: number): void {
    const char = this.characters.find((c) => c.id === id);
    if (char) {
      char.speed = Math.max(1, Math.min(100, speed));
      this.calculateActionOrder();
      this.syncRenderers();
      this.notifyStateChange();
    }
  }

  public setSkillDamage(characterId: string, skillId: string, damage: number): void {
    const char = this.characters.find((c) => c.id === characterId);
    if (char) {
      const skill = char.skills.find((s) => s.id === skillId);
      if (skill) {
        skill.damage = Math.max(0, damage);
        this.notifyStateChange();
      }
    }
  }

  public setSkillRange(characterId: string, skillId: string, range: number): void {
    const char = this.characters.find((c) => c.id === characterId);
    if (char) {
      const skill = char.skills.find((s) => s.id === skillId);
      if (skill) {
        skill.range = Math.max(1, Math.min(8, range));
        this.notifyStateChange();
      }
    }
  }

  public generateBattleReport(): void {
    const sorted = orderBy(this.characters, ['speed'], ['desc']);
    const entries: BattleReportEntry[] = sorted.map((char, index) => {
      const mainSkill = char.skills[1] || char.skills[0];
      return {
        order: index + 1,
        characterName: char.name,
        team: char.team,
        skillName: mainSkill.name,
        coveredTiles: this.actionPreviewer.getSkillDamageTileCount(char, mainSkill)
      };
    });
    const report: BattleReport = { entries };
    if (this.onBattleReportCallback) {
      this.onBattleReportCallback(report);
    }
  }

  private syncRenderers(): void {
    this.mapRenderer.setCharacters(this.characters);
    this.mapRenderer.setSelectedCharacter(this.selectedCharacterId);
    this.mapRenderer.setShowOrderNumbers(this.selectedCharacterId !== null);
    this.mapRenderer.setActionOrder(this.actionOrder);
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        characters: this.characters,
        selectedCharacterId: this.selectedCharacterId,
        selectedSkillId: this.selectedSkillId,
        actionOrder: this.actionOrder
      });
    }
  }

  public getCharacters(): Character[] {
    return this.characters;
  }

  public getActionOrder(): Map<string, number> {
    return this.actionOrder;
  }

  public getSelectedCharacter(): Character | null {
    return this.selectedCharacterId
      ? this.characters.find((c) => c.id === this.selectedCharacterId) || null
      : null;
  }
}
