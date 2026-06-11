export interface LightSource {
  id: string;
  wavelength: number;
  intensity: number;
  enabled: boolean;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface SourceColor extends RGB {
  intensity: number;
  enabled: boolean;
}

export interface MixedColorResult {
  r: number;
  g: number;
  b: number;
  hex: string;
  hsl: HSL;
  colorTemperature: string;
  sourceColors: SourceColor[];
}

export interface PresetMixedColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  hsl: HSL;
}

export interface Preset {
  id: string;
  name: string;
  timestamp: number;
  sources: LightSource[];
  mixedColor: PresetMixedColor;
}
