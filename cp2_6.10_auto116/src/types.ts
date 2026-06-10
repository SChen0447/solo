export type Team = 'red' | 'blue';

export type SkillType = 'melee' | 'cross' | 'line' | 'diamond' | 'circle';

export interface HexCoord {
  q: number;
  r: number;
}

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  range: number;
  damage: number;
  aoeRadius?: number;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  team: Team;
  avatar: string;
  speed: number;
  position: HexCoord;
  skills: Skill[];
}

export interface BattleReportEntry {
  order: number;
  characterName: string;
  team: Team;
  skillName: string;
  coveredTiles: number;
}

export interface BattleReport {
  entries: BattleReportEntry[];
}

export interface HighlightState {
  castableTiles: HexCoord[];
  damageTiles: HexCoord[];
  selectedTarget: HexCoord | null;
  estimatedDamage: number;
}

export type UIState = {
  selectedCharacterId: string | null;
  selectedSkillId: string | null;
  showOrderNumbers: boolean;
  highlight: HighlightState;
  showBattleReport: boolean;
  battleReportData: BattleReport | null;
};
