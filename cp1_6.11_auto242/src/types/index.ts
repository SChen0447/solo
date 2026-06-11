export interface Wormhole {
  id: string;
  center: [number, number];
  area: number;
  radius: number;
  contour: [number, number][];
  boundingBox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface Fiber {
  id: string;
  start: [number, number];
  end: [number, number];
  opacity: number;
  delay: number;
  duration: number;
}

export interface AnalyzeResult {
  success: boolean;
  imageUrl: string;
  imagePath: string;
  filename: string;
  width: number;
  height: number;
  wormholes: Wormhole[];
}

export interface PulpResult {
  success: boolean;
  wormholeId: string;
  fibers: Fiber[];
  pulpConfig: {
    color: string;
    fiberLength: string;
    totalFibers: number;
    estimatedDuration: number;
  };
}

export interface RestorationRecord {
  id: string;
  imageFilename: string;
  wormholeId: string;
  annotation: string;
  rating: number;
  thumbnail: string;
  createdAt: string;
}

export interface SaveResult {
  success: boolean;
  record: RestorationRecord;
}

export interface RecordsResult {
  success: boolean;
  records: RestorationRecord[];
}
