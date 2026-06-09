export type CardType = 'image' | 'color' | 'text';

export interface BoardCard {
  id: string;
  type: CardType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  cardId: string;
}
