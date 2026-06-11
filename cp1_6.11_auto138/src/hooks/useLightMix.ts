import { useMemo } from 'react';
import type { LightSource, MixedColorResult, SourceColor } from '../types';
import {
  wavelengthToRgb,
  rgbToHex,
  rgbToHsl,
  estimateColorTemperature,
} from '../utils/wavelengthToRgb';

export function useLightMix(sources: LightSource[]): MixedColorResult {
  return useMemo(() => {
    let r = 0;
    let g = 0;
    let b = 0;

    const sourceColors: SourceColor[] = sources.map((source) => {
      const rgb = wavelengthToRgb(source.wavelength);
      const factor = source.enabled ? source.intensity / 100 : 0;
      const cr = rgb.r * factor;
      const cg = rgb.g * factor;
      const cb = rgb.b * factor;

      r += cr;
      g += cg;
      b += cb;

      return {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        intensity: source.intensity,
        enabled: source.enabled,
      };
    });

    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);

    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    const colorTemperature = estimateColorTemperature(
      sources.map((s) => ({
        wavelength: s.wavelength,
        intensity: s.intensity,
        enabled: s.enabled,
      }))
    );

    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
      hex,
      hsl,
      colorTemperature,
      sourceColors,
    };
  }, [sources]);
}
