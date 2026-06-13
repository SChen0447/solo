export interface FragmentData {
  id: string;
  character: string;
  positionIndex: number;
  clipPath: string;
  rotation: number;
  strokes: number[][][];
}

export interface SlotData {
  index: number;
  bambooIndex: number;
  character: string;
  meaning: string;
  isFilled: boolean;
  isWrong: boolean;
  fragmentId?: string;
}

export interface DecodeRequest {
  fragmentId: string;
  slotIndex: number;
}

export interface DecodeResult {
  matched: boolean;
  character?: string;
  meaning?: string;
  nextHint?: string;
}

export interface BambooData {
  index: number;
  slots: SlotData[];
  isGlowing: boolean;
}

export interface GameState {
  fragments: FragmentData[];
  bamboos: BambooData[];
  completedCount: number;
  totalCount: number;
  isCompleted: boolean;
  activeMeaning: {
    bambooIndex: number;
    slotIndex: number;
    text: string;
  } | null;
}
