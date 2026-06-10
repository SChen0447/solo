export interface IconData {
  id: string;
  fileName: string;
  svgContent: string;
  width: number;
  height: number;
  lineWidths: number[];
  fills: (string | null)[];
  strokes: (string | null)[];
  isMarked: boolean;
  detectAnomalies: string[];
  isDetectFlashing: boolean;
}

export interface DetectionResult {
  lineWidthVarianceIndices: number[];
  emptyFillIndices: number[];
}

export interface ViewSettings {
  iconColor: string;
  iconSize: 32 | 48 | 64;
  backgroundColor: string;
}

export interface ExportReportItem {
  fileName: string;
  width: number;
  height: number;
  thumbnail: string;
  isMarked: boolean;
  detectAnomalies: string[];
}
