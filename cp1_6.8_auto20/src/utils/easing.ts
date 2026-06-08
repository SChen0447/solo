export const easeOutQuad = (t: number): number => t * (2 - t)

export const easeInQuad = (t: number): number => t * t

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

export const easeOutCubic = (t: number): number => --t * t * t + 1

export const easeInCubic = (t: number): number => t * t * t

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1

export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

export const easeOutBounce = (t: number): number => {
  const n1 = 7.5625
  const d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}

export const linear = (t: number): number => t

export const getEasingFunction = (name: string): ((t: number) => number) => {
  const easingMap: Record<string, (t: number) => number> = {
    linear,
    'ease-out': easeOutQuad,
    'ease-in': easeInQuad,
    'ease-in-out': easeInOutQuad,
    'ease-out-cubic': easeOutCubic,
    'ease-in-cubic': easeInCubic,
    'ease-in-out-cubic': easeInOutCubic,
    'ease-out-elastic': easeOutElastic,
    'ease-out-bounce': easeOutBounce
  }
  return easingMap[name] || easeOutQuad
}
