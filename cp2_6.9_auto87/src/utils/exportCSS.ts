import { GlassParams } from '../types'

export function generateCSS(params: GlassParams): string {
  const {
    blurRadius,
    opacity,
    highlightPosition,
    highlightIntensity,
    gradientHue,
    gradientSaturation,
    borderColor,
  } = params

  const color1 = `hsla(${gradientHue}, ${gradientSaturation}%, 30%, ${opacity})`
  const color2 = `hsla(${(gradientHue + 40) % 360}, ${gradientSaturation}%, 30%, ${opacity})`

  return `.glass-card {
  position: relative;
  width: 180px;
  height: 240px;
  border-radius: 16px;
  background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);
  backdrop-filter: blur(${blurRadius}px);
  -webkit-backdrop-filter: blur(${blurRadius}px);
  border: 1px solid ${borderColor};
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 1px 1px rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, ${highlightIntensity * 0.3}) 0%,
    rgba(255, 255, 255, 0) ${highlightPosition}%
  );
  pointer-events: none;
}

.glass-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 12px 48px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.2);
}

.glass-card > * {
  color: rgba(255, 255, 255, 0.9);
}
`
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

export async function exportCSS(params: GlassParams): Promise<string> {
  const css = generateCSS(params)
  await copyToClipboard(css)
  return css
}
