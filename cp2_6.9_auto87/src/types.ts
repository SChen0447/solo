export interface GlassParams {
  blurRadius: number
  opacity: number
  highlightPosition: number
  highlightIntensity: number
  gradientHue: number
  gradientSaturation: number
  borderColor: string
}

export const DEFAULT_PARAMS: GlassParams = {
  blurRadius: 16,
  opacity: 0.3,
  highlightPosition: 50,
  highlightIntensity: 0.5,
  gradientHue: 260,
  gradientSaturation: 70,
  borderColor: '#FFFFFF33',
}
