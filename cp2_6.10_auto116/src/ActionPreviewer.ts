import { Character, HexCoord, HighlightState, Skill, SkillType } from './types';
import { hexDistance, getHexesInRange, getCrossHexes, hexEqual, isValidHex, hexKey } from './hexUtils';

const GRID_SIZE = 8;

export class ActionPreviewer {
  private selectedCharacter: Character | null = null;
  private selectedSkill: Skill | null = null;
  private highlightState: HighlightState = {
    castableTiles: [],
    damageTiles: [],
    selectedTarget: null,
    estimatedDamage: 0
  };
  private onHighlightChangeCallback: ((state: HighlightState) => void) | null = null;

  public setOnHighlightChange(callback: (state: HighlightState) => void): void {
    this.onHighlightChangeCallback = callback;
  }

  public setSelectedCharacter(character: Character | null): void {
    this.selectedCharacter = character;
    this.selectedSkill = null;
    this.clearHighlight();
  }

  public setSelectedSkill(skill: Skill | null): void {
    this.selectedSkill = skill;
    if (skill && this.selectedCharacter) {
      this.computeCastableTiles();
    } else {
      this.clearHighlight();
    }
  }

  public getCurrentHighlight(): HighlightState {
    return { ...this.highlightState };
  }

  public handleHexClick(coord: HexCoord): void {
    if (coord.q === -1 && coord.r === -1) {
      this.clearHighlight();
      if (this.selectedCharacter && this.selectedSkill) {
        this.computeCastableTiles();
      }
      return;
    }

    if (!this.selectedCharacter || !this.selectedSkill) return;

    const isInCastable = this.highlightState.castableTiles.some((t) =>
      hexEqual(t, coord)
    );

    if (isInCastable) {
      this.computeDamageTiles(coord);
    } else {
      if (this.selectedSkill) {
        this.computeCastableTiles();
      }
    }
  }

  public clearHighlight(): void {
    this.highlightState = {
      castableTiles: [],
      damageTiles: [],
      selectedTarget: null,
      estimatedDamage: 0
    };
    this.notifyChange();
  }

  private computeCastableTiles(): void {
    if (!this.selectedCharacter || !this.selectedSkill) return;

    const charPos = this.selectedCharacter.position;
    const skill = this.selectedSkill;
    let castable: HexCoord[] = [];

    switch (skill.type) {
      case 'melee':
        castable = getHexesInRange(charPos, 1).filter(
          (h) => !hexEqual(h, charPos) && isValidHex(h, GRID_SIZE)
        );
        break;
      case 'cross':
      case 'line':
        castable = getHexesInRange(charPos, skill.range).filter(
          (h) => !hexEqual(h, charPos) && isValidHex(h, GRID_SIZE)
        );
        break;
      case 'diamond':
      case 'circle':
        castable = getHexesInRange(charPos, skill.range).filter(
          (h) => !hexEqual(h, charPos) && isValidHex(h, GRID_SIZE)
        );
        break;
      default:
        castable = getHexesInRange(charPos, skill.range).filter(
          (h) => !hexEqual(h, charPos) && isValidHex(h, GRID_SIZE)
        );
    }

    const unique = this.dedupeHexes(castable);
    this.highlightState = {
      castableTiles: unique,
      damageTiles: [],
      selectedTarget: null,
      estimatedDamage: 0
    };
    this.notifyChange();
  }

  private computeDamageTiles(target: HexCoord): void {
    if (!this.selectedCharacter || !this.selectedSkill) return;

    const skill = this.selectedSkill;
    let damageTiles: HexCoord[] = [];

    switch (skill.type) {
      case 'melee':
        damageTiles = [target];
        break;
      case 'cross':
        damageTiles = getCrossHexes(target, skill.aoeRadius || 1).filter((h) =>
          isValidHex(h, GRID_SIZE)
        );
        break;
      case 'line':
        damageTiles = this.computeLineTiles(this.selectedCharacter.position, target, skill.range);
        break;
      case 'diamond':
        damageTiles = getHexesInRange(target, skill.aoeRadius || 1).filter((h) =>
          isValidHex(h, GRID_SIZE)
        );
        break;
      case 'circle':
        damageTiles = getHexesInRange(target, skill.aoeRadius || 1).filter((h) =>
          isValidHex(h, GRID_SIZE)
        );
        break;
      default:
        damageTiles = [target];
    }

    this.highlightState = {
      castableTiles: this.highlightState.castableTiles,
      damageTiles: this.dedupeHexes(damageTiles),
      selectedTarget: target,
      estimatedDamage: skill.damage
    };
    this.notifyChange();
  }

  private computeLineTiles(from: HexCoord, to: HexCoord, maxRange: number): HexCoord[] {
    const results: HexCoord[] = [];
    const distance = hexDistance(from, to);
    const steps = Math.max(Math.ceil(distance), 1);
    
    for (let i = 0; i <= steps && i <= maxRange; i++) {
      const t = distance === 0 ? 0 : i / distance;
      const q = from.q + (to.q - from.q) * t;
      const r = from.r + (to.r - from.r) * t;
      const s = -q - r;
      let rq = Math.round(q);
      let rr = Math.round(r);
      let rs = Math.round(s);
      const qDiff = Math.abs(rq - q);
      const rDiff = Math.abs(rr - r);
      const sDiff = Math.abs(rs - s);
      if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
      else if (rDiff > sDiff) rr = -rq - rs;
      const coord = { q: rq, r: rr };
      if (isValidHex(coord, GRID_SIZE)) {
        results.push(coord);
      }
    }
    return this.dedupeHexes(results);
  }

  private dedupeHexes(hexes: HexCoord[]): HexCoord[] {
    const seen = new Set<string>();
    const result: HexCoord[] = [];
    for (const h of hexes) {
      const key = hexKey(h);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(h);
      }
    }
    return result;
  }

  private notifyChange(): void {
    if (this.onHighlightChangeCallback) {
      this.onHighlightChangeCallback({ ...this.highlightState });
    }
  }

  public getSkillDamageTileCount(character: Character, skill: Skill): number {
    if (!character) return 0;
    const testTarget = character.position;
    let tiles: HexCoord[] = [];

    switch (skill.type) {
      case 'melee':
        tiles = [testTarget];
        break;
      case 'cross':
        tiles = getCrossHexes(testTarget, skill.aoeRadius || 1);
        break;
      case 'line':
        tiles = [testTarget];
        break;
      case 'diamond':
      case 'circle':
        tiles = getHexesInRange(testTarget, skill.aoeRadius || 1);
        break;
      default:
        tiles = [testTarget];
    }
    return tiles.length;
  }
}
