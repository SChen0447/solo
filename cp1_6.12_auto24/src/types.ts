export interface FontOption {
  name: string;
  value: string;
  label: string;
}

export type GradientType = 'solid' | 'horizontal' | 'diagonal' | 'radial';

export interface BackgroundConfig {
  type: GradientType;
  color1: string;
  color2: string;
}

export interface PosterConfig {
  text: string;
  font: string;
  fontSize: number;
  textColor: string;
  background: BackgroundConfig;
}

export interface ExportResult {
  success: boolean;
  error?: string;
}
