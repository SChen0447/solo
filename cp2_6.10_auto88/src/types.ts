export type GradientType = 'linear' | 'radial';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export type ExportFormat = 'png' | 'css' | 'svg';

export interface IColorStop {
  color: string;
  opacity: number;
}

export interface ILayerConfig {
  id: string;
  type: GradientType;
  startColor: IColorStop;
  endColor: IColorStop;
  angle: number;
  radius: number;
  blendMode: BlendMode;
}
