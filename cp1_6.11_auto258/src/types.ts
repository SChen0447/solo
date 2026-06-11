export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface DatingResult {
  success: boolean;
  requestId: string;
  patternImage: string;
  dating: {
    startYear: number;
    endYear: number;
    midYear: number;
    startYearLabel: string;
    endYearLabel: string;
    midYearLabel: string;
    confidence: number;
    description: string;
  };
  params: {
    temperature: number;
    duration: number;
    carbonizationLevel: number;
  };
}
