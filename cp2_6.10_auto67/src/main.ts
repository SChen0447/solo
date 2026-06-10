import './styles.css';
import { CssGradientPreview } from './cssGradientPreview';
import { Controls } from './controls';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element with id "${id}" not found`);
  }
  return el;
};

const $input = (id: string): HTMLInputElement => {
  const el = $(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`Element with id "${id}" is not an HTMLInputElement`);
  }
  return el;
};

document.addEventListener('DOMContentLoaded', () => {
  const radialCanvas = $('radialCanvas');
  const conicCanvas = $('conicCanvas');
  const radialCodeEl = $('radialCode');
  const conicCodeEl = $('conicCode');

  const preview = new CssGradientPreview(
    radialCanvas,
    conicCanvas,
    radialCodeEl,
    conicCodeEl
  );

  const controls = new Controls(preview, {
    radialHue: $input('radialHue'),
    radialSat: $input('radialSat'),
    radialLight: $input('radialLight'),
    radialContrast: $input('radialContrast'),
    radialHueValue: $('radialHueValue'),
    radialSatValue: $('radialSatValue'),
    radialLightValue: $('radialLightValue'),
    radialContrastValue: $('radialContrastValue'),
    conicHue: $input('conicHue'),
    conicSat: $input('conicSat'),
    conicLight: $input('conicLight'),
    conicAngle: $input('conicAngle'),
    conicHueValue: $('conicHueValue'),
    conicSatValue: $('conicSatValue'),
    conicLightValue: $('conicLightValue'),
    conicAngleValue: $('conicAngleValue'),
    radialCodeEl,
    conicCodeEl,
    divider: $('divider'),
    radialPanel: $('radialPanel'),
    conicPanel: $('conicPanel'),
    toast: $('toast')
  });

  preview.forceUpdate();

  window.addEventListener('beforeunload', () => {
    preview.destroy();
    controls.destroy();
  });
});
