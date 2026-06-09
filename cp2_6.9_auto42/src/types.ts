export interface CardIcon {
  id: string;
  name: string;
  svg: string;
}

export interface CardData {
  id: string;
  name: string;
  description: string;
  borderColor: string;
  backgroundColor: string;
  backgroundGradient: string;
  gradientCenterX: number;
  gradientCenterY: number;
  useGradient: boolean;
  font: string;
  iconId: string | null;
  iconColor: string;
  iconSize: number;
  cardNumber: number;
}

export interface ExportProgress {
  current: number;
  total: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
}
