export const CONFIG = {
  bridge: {
    spanRatioDesktop: 0.7,
    spanRatioMobile: 0.9,
    heightRatio: 0.4,
    minWidth: 600,
    minHeight: 300,
    lineCountDesktop: 200,
    lineCountMobile: 120,
    lineWidth: 2,
    lineOpacityMin: 0.6,
    lineOpacityMax: 1.0,
    wavePeriodMin: 2,
    wavePeriodMax: 4,
    waveAmplitudeMin: 5,
    waveAmplitudeMax: 10,
    centerLineWidth: 8,
    centerLineOpacity: 0.8,
    hoverLineCount: 60,
    hoverDuration: 0.3,
    hoverRestoreDuration: 0.5,
    hoverArchHeight: 30,
    clickWaveMaxRadius: 120,
    clickWaveDuration: 1,
    clickWaveRingSpacing: 8,
    speedBoostMultiplier: 1.5,
    speedBoostDuration: 3
  },
  railing: {
    postHeight: 15,
    postSpacing: 10,
    opacity: 0.6
  },
  platform: {
    octagonSide: 40,
    bgColor: '#1a1a2e',
    borderColor: '#d4a373',
    starDiameter: 12,
    starColor: '#ffecd2',
    starPulsePeriod: 1.5,
    hoverDelay: 1000,
    beamHeight: 200,
    beamDiameter: 10,
    beamOpacity: 0.3,
    beamDuration: 2000
  },
  colors: {
    rainbow: [
      '#ff6b6b',
      '#ffa94d',
      '#ffd43b',
      '#69db7c',
      '#4dabf7',
      '#748ffc',
      '#da77f2'
    ],
    warmHover: ['#ff6b6b', '#ffd93d'],
    waveRings: ['#ff9a9e', '#fad0c4', '#a18cd1', '#fbc2eb'],
    warmPresets: ['#ff6b6b', '#ffa94d', '#ffd43b', '#ff9a9e', '#fad0c4', '#ffecd2']
  },
  audio: {
    noteStart: 'C4',
    noteEnd: 'C6',
    duration: 0.8
  },
  responsive: {
    mobileBreakpoint: 768
  },
  animation: {
    defaultEase: 'power2.out'
  }
} as const;

export type ConfigType = typeof CONFIG;
