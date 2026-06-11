export interface StarData {
  id: string;
  name: string;
  ra: number;
  dec: number;
  magnitude: number;
  spectrum: 'O' | 'B' | 'A' | 'K' | 'M';
  constellation: string;
  constellationName: string;
  ancientNames: string[];
  story: string;
}

export interface ConstellationData {
  id: string;
  name: string;
  stars: string[];
  centerStarIndex: number;
}

export interface StarMapData {
  stars: StarData[];
  constellations: ConstellationData[];
}
