import { useRef, useCallback } from 'react'
import type { EmotionType } from '@/store/fireplaceStore'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

interface ActiveSound {
  stop: () => void
}

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function startJoySound(ctx: AudioContext, duration: number): ActiveSound {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 780
  gain.gain.value = 0.2
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
  const timeout = setTimeout(() => {
    try { osc.stop() } catch (_) {}
    osc.disconnect()
    gain.disconnect()
  }, duration * 1000)
  return {
    stop: () => {
      clearTimeout(timeout)
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        osc.stop()
      } catch (_) {}
      osc.disconnect()
      gain.disconnect()
    }
  }
}

function startSadnessSound(ctx: AudioContext, duration: number): ActiveSound {
  const osc = ctx.createOscillator()
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.value = 180
  lfo.type = 'sine'
  lfo.frequency.value = 4
  lfoGain.gain.value = 8
  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)
  gain.gain.value = 0.15
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  lfo.start()
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
  const timeout = setTimeout(() => {
    try { osc.stop(); lfo.stop() } catch (_) {}
    osc.disconnect(); lfo.disconnect(); lfoGain.disconnect(); gain.disconnect()
  }, duration * 1000)
  return {
    stop: () => {
      clearTimeout(timeout)
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        osc.stop(); lfo.stop()
      } catch (_) {}
      osc.disconnect(); lfo.disconnect(); lfoGain.disconnect(); gain.disconnect()
    }
  }
}

function startAngerSound(ctx: AudioContext, duration: number): ActiveSound {
  const masterGain = ctx.createGain()
  masterGain.gain.value = 0.3
  masterGain.connect(ctx.destination)
  const bursts: { source: AudioBufferSourceNode; gain: GainNode }[] = []
  let stopped = false
  const intervalId = setInterval(() => {
    if (stopped) return
    const buffer = createNoiseBuffer(ctx, 0.05)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const burstGain = ctx.createGain()
    burstGain.gain.value = 0.3
    source.connect(burstGain)
    burstGain.connect(masterGain)
    source.start()
    bursts.push({ source, gain: burstGain })
    setTimeout(() => {
      try { source.stop(); source.disconnect(); burstGain.disconnect() } catch (_) {}
    }, 60)
  }, 200)
  masterGain.gain.setValueAtTime(0.3, ctx.currentTime)
  masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
  const timeout = setTimeout(() => {
    clearInterval(intervalId)
    stopped = true
    try { masterGain.disconnect() } catch (_) {}
  }, duration * 1000)
  return {
    stop: () => {
      clearTimeout(timeout)
      clearInterval(intervalId)
      stopped = true
      try {
        masterGain.gain.cancelScheduledValues(ctx.currentTime)
        masterGain.gain.setValueAtTime(0, ctx.currentTime)
        masterGain.disconnect()
      } catch (_) {}
    }
  }
}

function startSerenitySound(ctx: AudioContext, duration: number): ActiveSound {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 220
  gain.gain.value = 0.2
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
  gain.gain.setValueAtTime(0.001, ctx.currentTime + 0.8)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
  const timeout = setTimeout(() => {
    try { osc.stop() } catch (_) {}
    osc.disconnect(); gain.disconnect()
  }, duration * 1000)
  return {
    stop: () => {
      clearTimeout(timeout)
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        osc.stop()
      } catch (_) {}
      osc.disconnect(); gain.disconnect()
    }
  }
}

const soundCreators: Record<EmotionType, (ctx: AudioContext, duration: number) => ActiveSound> = {
  joy: startJoySound,
  sadness: startSadnessSound,
  anger: startAngerSound,
  serenity: startSerenitySound,
}

export function useAudio() {
  const activeSounds = useRef<Map<string, ActiveSound>>(new Map())

  const playEmotionSound = useCallback((id: string, emotion: EmotionType, durationSec: number = 15) => {
    const ctx = getAudioContext()
    const existing = activeSounds.current.get(id)
    if (existing) {
      existing.stop()
    }
    const sound = soundCreators[emotion](ctx, durationSec)
    activeSounds.current.set(id, sound)
    setTimeout(() => {
      activeSounds.current.delete(id)
    }, durationSec * 1000 + 100)
  }, [])

  const stopSound = useCallback((id: string) => {
    const sound = activeSounds.current.get(id)
    if (sound) {
      sound.stop()
      activeSounds.current.delete(id)
    }
  }, [])

  const stopAll = useCallback(() => {
    activeSounds.current.forEach((sound) => sound.stop())
    activeSounds.current.clear()
  }, [])

  return { playEmotionSound, stopSound, stopAll }
}
