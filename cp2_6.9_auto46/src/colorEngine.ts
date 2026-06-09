import * as THREE from 'three';

export type ScaleModel = 'thinFilm' | 'grating' | 'multilayer';

export interface ColorInput {
  normal: THREE.Vector3;
  viewDir: THREE.Vector3;
  lightAngle: number;
  model: ScaleModel;
  progress?: number;
  prevModel?: ScaleModel;
  baseColor?: { r: number; g: number; b: number };
}

export interface ColorOutput {
  rgb: { r: number; g: number; b: number };
  wavelength: number;
}

const BASE_BROWN = { r: 0x4a / 255, g: 0x37 / 255, b: 0x28 / 255 };
const DEEP_BLUE = { r: 0x00 / 255, g: 0xbf / 255, b: 0xff / 255 };
const VIOLET = { r: 0x8b / 255, g: 0x5c / 255, b: 0xf6 / 255 };
const SILVER = { r: 0xc0 / 255, g: 0xc0 / 255, b: 0xc0 / 255 };

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: clamp(lerp(c1.r, c2.r, t), 0, 1),
    g: clamp(lerp(c1.g, c2.g, t), 0, 1),
    b: clamp(lerp(c1.b, c2.b, t), 0, 1)
  };
}

export function wavelengthToRGB(wavelength: number): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0;
  const wl = clamp(wavelength, 380, 780);

  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wl >= 440 && wl < 490) {
    r = 0;
    g = (wl - 440) / (490 - 440);
    b = 1;
  } else if (wl >= 490 && wl < 510) {
    r = 0;
    g = 1;
    b = -(wl - 510) / (510 - 490);
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wl >= 580 && wl < 645) {
    r = 1;
    g = -(wl - 645) / (645 - 580);
    b = 0;
  } else if (wl >= 645 && wl <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }

  let factor: number;
  if (wl >= 380 && wl < 420) {
    factor = 0.3 + (0.7 * (wl - 380)) / (420 - 380);
  } else if (wl >= 420 && wl <= 700) {
    factor = 1.0;
  } else {
    factor = 0.3 + (0.7 * (780 - wl)) / (780 - 700);
  }

  return {
    r: clamp(Math.pow(r * factor, 0.8), 0, 1),
    g: clamp(Math.pow(g * factor, 0.8), 0, 1),
    b: clamp(Math.pow(b * factor, 0.8), 0, 1)
  };
}

function computeThinFilm(normal: THREE.Vector3, viewDir: THREE.Vector3, lightAngle: number): ColorOutput {
  const cosTheta = clamp(Math.abs(normal.dot(viewDir)), 0, 1);
  const grazing = 1 - cosTheta;

  const filmThickness = 200 + 150 * Math.sin(lightAngle * Math.PI / 180);
  const refractiveIndex = 1.4;

  const thetaRad = Math.acos(cosTheta);
  const pathDiff = 2 * filmThickness * refractiveIndex * Math.cos(thetaRad);
  let wavelength = 380 + (pathDiff % 400);
  wavelength = clamp(wavelength, 380, 780);

  const spectralColor = wavelengthToRGB(wavelength);

  const verticalColor = lerpColor(DEEP_BLUE, spectralColor, 0.6);
  const grazingColor = lerpColor(VIOLET, SILVER, grazing);
  const finalColor = lerpColor(verticalColor, grazingColor, Math.pow(grazing, 0.7));

  const rgb = lerpColor(BASE_BROWN, finalColor, 0.7 + 0.3 * cosTheta);

  return { rgb, wavelength };
}

function computeGrating(normal: THREE.Vector3, viewDir: THREE.Vector3, lightAngle: number): ColorOutput {
  const cosTheta = clamp(Math.abs(normal.dot(viewDir)), 0, 1);
  const grazing = 1 - cosTheta;

  const lightRad = lightAngle * Math.PI / 180;
  const gratingSpacing = 550;

  const viewAngle = Math.acos(cosTheta);
  const diffractionOrder = 1;
  const sinDiff = diffractionOrder * 500 / gratingSpacing - Math.sin(lightRad);
  let wavelength = 450 + 200 * Math.abs(sinDiff) + 80 * Math.sin(viewAngle * 2);
  wavelength = clamp(wavelength, 380, 780);

  const spectralColor = wavelengthToRGB(wavelength);

  const hueShift = Math.sin(lightRad) * 0.3;
  const adjustedColor = {
    r: clamp(spectralColor.r + hueShift * 0.2, 0, 1),
    g: clamp(spectralColor.g - hueShift * 0.1, 0, 1),
    b: clamp(spectralColor.b + hueShift * 0.3, 0, 1)
  };

  const iridescent = lerpColor(adjustedColor, DEEP_BLUE, 0.3);
  const grazingColor = lerpColor(VIOLET, SILVER, grazing * 0.8);
  const finalColor = lerpColor(iridescent, grazingColor, Math.pow(grazing, 0.8));

  const rgb = lerpColor(BASE_BROWN, finalColor, 0.75 + 0.25 * cosTheta);

  return { rgb, wavelength };
}

function computeMultilayer(normal: THREE.Vector3, viewDir: THREE.Vector3, lightAngle: number): ColorOutput {
  const cosTheta = clamp(Math.abs(normal.dot(viewDir)), 0, 1);
  const grazing = 1 - cosTheta;
  const lightRad = lightAngle * Math.PI / 180;

  const layers = 5;
  const thicknesses = [120, 80, 150, 90, 130];
  const indices = [1.5, 1.3, 1.6, 1.35, 1.55];

  let rSum = 0, gSum = 0, bSum = 0, wlSum = 0;
  const thetaRad = Math.acos(cosTheta);

  for (let i = 0; i < layers; i++) {
    const pathDiff = 2 * thicknesses[i] * indices[i] * Math.cos(thetaRad);
    const phase = (2 * Math.PI * pathDiff) / 550;
    const reflectivity = 0.5 + 0.5 * Math.cos(phase + i * 0.5);
    let wl = 400 + (pathDiff % 380) + Math.sin(lightRad + i) * 30;
    wl = clamp(wl, 380, 780);
    const c = wavelengthToRGB(wl);
    const w = reflectivity / layers;
    rSum += c.r * w;
    gSum += c.g * w;
    bSum += c.b * w;
    wlSum += wl * w;
  }

  const layeredColor = {
    r: clamp(rSum * 1.5, 0, 1),
    g: clamp(gSum * 1.5, 0, 1),
    b: clamp(bSum * 1.5, 0, 1)
  };

  const avgWavelength = clamp(wlSum, 380, 780);
  const enhanced = lerpColor(layeredColor, DEEP_BLUE, 0.2);
  const grazingColor = lerpColor(VIOLET, SILVER, grazing * 0.7);
  const finalColor = lerpColor(enhanced, grazingColor, Math.pow(grazing, 0.65));

  const rgb = lerpColor(BASE_BROWN, finalColor, 0.8 + 0.2 * cosTheta);

  return { rgb, wavelength: avgWavelength };
}

export function computeStructuralColor(input: ColorInput): ColorOutput {
  const { normal, viewDir, lightAngle, model, progress = 1, prevModel } = input;

  let current: ColorOutput;
  switch (model) {
    case 'thinFilm':
      current = computeThinFilm(normal, viewDir, lightAngle);
      break;
    case 'grating':
      current = computeGrating(normal, viewDir, lightAngle);
      break;
    case 'multilayer':
      current = computeMultilayer(normal, viewDir, lightAngle);
      break;
    default:
      current = computeThinFilm(normal, viewDir, lightAngle);
  }

  if (progress < 1 && prevModel && prevModel !== model) {
    let previous: ColorOutput;
    switch (prevModel) {
      case 'thinFilm':
        previous = computeThinFilm(normal, viewDir, lightAngle);
        break;
      case 'grating':
        previous = computeGrating(normal, viewDir, lightAngle);
        break;
      case 'multilayer':
        previous = computeMultilayer(normal, viewDir, lightAngle);
        break;
      default:
        previous = current;
    }
    const smoothT = progress * progress * (3 - 2 * progress);
    return {
      rgb: lerpColor(previous.rgb, current.rgb, smoothT),
      wavelength: lerp(previous.wavelength, current.wavelength, smoothT)
    };
  }

  return current;
}
