export interface LavaLampParameters {
  temperature: number;
  viscosity: number;
  lightAngle: number;
}

export const DEFAULT_PARAMETERS: LavaLampParameters = {
  temperature: 50,
  viscosity: 5,
  lightAngle: 45
};

export const PARAMETER_RANGES = {
  temperature: { min: 20, max: 80 },
  viscosity: { min: 1, max: 10 },
  lightAngle: { min: 0, max: 360 }
};

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}
