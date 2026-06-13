import { useRef, useCallback, useEffect } from 'react'
import type { AudioConfig } from '@/services/storyService'

interface AudioRefs {
  ctx: AudioContext | null
  masterGain: GainNode | null
  windOsc: OscillatorNode | null
  windGain: GainNode | null
  windFilter: BiquadFilterNode | null
  heartOsc: OscillatorNode | null
  heartGain: GainNode | null
  heartLfo: OscillatorNode | null
  heartLfoGain: GainNode | null
  bellOsc: OscillatorNode | null
  bellGain: GainNode | null
}

export function useAudio() {
  const refs = useRef<AudioRefs>({
    ctx: null,
    masterGain: null,
    windOsc: null,
    windGain: null,
    windFilter: null,
    heartOsc: null,
    heartGain: null,
    heartLfo: null,
    heartLfoGain: null,
    bellOsc: null,
    bellGain: null,
  })

  const volumeRef = useRef(0.3)
  const currentAtmosphere = useRef<string>('')

  const initAudio = useCallback(() => {
    if (refs.current.ctx) return

    const ctx = new AudioContext()
    const masterGain = ctx.createGain()
    masterGain.gain.value = volumeRef.current
    masterGain.connect(ctx.destination)

    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 400
    windFilter.Q.value = 0.5

    const windOsc = ctx.createOscillator()
    windOsc.type = 'sawtooth'
    windOsc.frequency.value = 80

    const windGain = ctx.createGain()
    windGain.gain.value = 0.08

    windOsc.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(masterGain)

    const windLfo = ctx.createOscillator()
    windLfo.type = 'sine'
    windLfo.frequency.value = 0.3
    const windLfoGain = ctx.createGain()
    windLfoGain.gain.value = 30
    windLfo.connect(windLfoGain)
    windLfoGain.connect(windFilter.frequency)
    windLfo.start()

    windOsc.start()

    const heartOsc = ctx.createOscillator()
    heartOsc.type = 'sine'
    heartOsc.frequency.value = 50

    const heartGain = ctx.createGain()
    heartGain.gain.value = 0.12

    const heartLfo = ctx.createOscillator()
    heartLfo.type = 'square'
    heartLfo.frequency.value = 1.0

    const heartLfoGain = ctx.createGain()
    heartLfoGain.gain.value = 0.1

    heartLfo.connect(heartLfoGain)
    heartLfoGain.connect(heartGain.gain)
    heartOsc.connect(heartGain)
    heartGain.connect(masterGain)

    heartOsc.start()
    heartLfo.start()

    const bellOsc = ctx.createOscillator()
    bellOsc.type = 'sine'
    bellOsc.frequency.value = 660

    const bellGain = ctx.createGain()
    bellGain.gain.value = 0.04

    const bellLfo = ctx.createOscillator()
    bellLfo.type = 'sine'
    bellLfo.frequency.value = 0.15

    const bellLfoGain = ctx.createGain()
    bellLfoGain.gain.value = 0.03

    bellLfo.connect(bellLfoGain)
    bellLfoGain.connect(bellGain.gain)
    bellOsc.connect(bellGain)
    bellGain.connect(masterGain)

    bellOsc.start()
    bellLfo.start()

    refs.current = {
      ctx,
      masterGain,
      windOsc,
      windGain,
      windFilter,
      heartOsc,
      heartGain,
      heartLfo,
      heartLfoGain,
      bellOsc,
      bellGain,
    }
  }, [])

  const setAtmosphere = useCallback((config: AudioConfig) => {
    if (currentAtmosphere.current === config.atmosphere) return
    currentAtmosphere.current = config.atmosphere

    const { ctx, windOsc, windFilter, heartOsc, heartLfo, bellOsc } = refs.current
    if (!ctx || !windOsc || !windFilter || !heartOsc || !heartLfo || !bellOsc) return

    const now = ctx.currentTime
    const ramp = 2.0

    windOsc.frequency.linearRampToValueAtTime(config.windFreq, now + ramp)
    windFilter.frequency.linearRampToValueAtTime(
      config.atmosphere === 'tense' ? 200 : config.atmosphere === 'calm' ? 600 : 400,
      now + ramp
    )
    heartOsc.frequency.linearRampToValueAtTime(
      config.atmosphere === 'tense' ? 60 : 40,
      now + ramp
    )
    heartLfo.frequency.linearRampToValueAtTime(config.heartbeatRate, now + ramp)
    bellOsc.frequency.linearRampToValueAtTime(config.bellFreq, now + ramp)
  }, [])

  const setVolume = useCallback((vol: number) => {
    volumeRef.current = vol
    const { masterGain, ctx } = refs.current
    if (!masterGain || !ctx) return
    masterGain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.1)
  }, [])

  const resumeAudio = useCallback(() => {
    const { ctx } = refs.current
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
  }, [])

  useEffect(() => {
    return () => {
      const { ctx } = refs.current
      if (ctx) {
        ctx.close()
        refs.current.ctx = null
      }
    }
  }, [])

  return { initAudio, setAtmosphere, setVolume, resumeAudio }
}
