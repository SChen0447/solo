export interface TravelPhoto {
  id: string;
  src: string;
  label: string;
  date: string;
  thought: string;
  dominantColor: string;
}

export interface MemoryBoard {
  id: string;
  createdAt: string;
  photos: TravelPhoto[];
  titleColor: string;
  dateRange: string;
  photoCount: number;
}

export interface PanelTheme {
  bg: string;
  text: string;
  accent: string;
  line: string;
}
