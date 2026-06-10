export interface AudioSystem {
  init(): void
  playCollectSound(): void
  updateTrackLayers(collected: number): void
}

export function createAudioSystem(): AudioSystem {
  let ctx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let lowLayer: { osc: OscillatorNode; gain: GainNode } | null = null
  let midLayer: { osc: OscillatorNode; lfo: OscillatorNode; lfoGain: GainNode; gain: GainNode } | null = null
  let highLayer: { osc: OscillatorNode; gain: GainNode } | null = null
  let activeLayers = 0

  function fadeIn(gain: GainNode, duration: number = 2): void {
    if (!ctx) return
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + duration)
  }

  function ensureCtx(): void {
    if (ctx) return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.6
    masterGain.connect(ctx.destination)
  }

  function startLowLayer(): void {
    if (!ctx || !masterGain || lowLayer) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 55
    gain.gain.value = 0
    osc.connect(gain)
    gain.connect(masterGain)
    osc.start()
    lowLayer = { osc, gain }
    fadeIn(gain, 3)
  }

  function startMidLayer(): void {
    if (!ctx || !masterGain || midLayer) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 220
    lfo.type = 'sine'
    lfo.frequency.value = 0.5
    lfoGain.gain.value = 60
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    gain.gain.value = 0
    osc.connect(gain)
    gain.connect(masterGain)
    osc.start()
    lfo.start()
    midLayer = { osc, lfo, lfoGain, gain }
    fadeIn(gain, 3)
  }

  function startHighLayer(): void {
    if (!ctx || !masterGain || highLayer) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2000
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(masterGain)
    osc.start()
    highLayer = { osc, gain }
    fadeIn(gain, 3)
  }

  return {
    init(): void {
      ensureCtx()
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume()
      }
    },

    playCollectSound(): void {
      ensureCtx()
      if (!ctx || !masterGain) return
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const freq = 300 + Math.random() * 500
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.connect(gain)
      gain.connect(masterGain)
      osc.start(now)
      osc.stop(now + 0.22)
    },

    updateTrackLayers(collected: number): void {
      ensureCtx()
      const targetLayers = Math.min(3, Math.floor(collected / 3))
      while (activeLayers < targetLayers) {
        activeLayers++
        if (activeLayers === 1) startLowLayer()
        else if (activeLayers === 2) startMidLayer()
        else if (activeLayers === 3) startHighLayer()
      }
    }
  }
}
