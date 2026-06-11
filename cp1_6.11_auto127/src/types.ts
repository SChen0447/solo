export interface BookContent {
  left: string[];
  right: string[];
}

export interface RepairLog {
  timestamp: string;
  toolsUsed: {
    stainRemover: number;
    wormholeFiller: number;
    creaseIron: number;
    inkRestorer: number;
  };
  repairedAreaPercent: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  coverColor: string;
  originalCoverColor: string;
  content: BookContent;
  damageLevel: number;
  repairProgress: number;
  isPublic: boolean;
  repairedBy?: string;
  repairedAt: string;
  repairLog?: RepairLog | null;
}

export type ToolType = 'stain' | 'wormhole' | 'crease' | 'ink' | null;

export interface DamagePoint {
  id: string;
  type: 'stain' | 'wormhole' | 'crease' | 'faded';
  page: 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
  repaired: boolean;
  pathData?: string;
  opacity?: number;
}
