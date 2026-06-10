import { useRef, useCallback } from 'react'

const NOTE_FREQUENCIES: Record<string, number> = {
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
  'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50,
}

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeOscillatorsRef = useRef<Map<string, { osc: OscillatorNode[]; gain: GainNode }>>(new Map())

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const playNote = useCallback((pitch: string, velocity: number = 100, duration: number = 0.5) => {
    const ctx = getAudioContext()
    const freq = NOTE_FREQUENCIES[pitch]
    if (!freq) return

    const now = ctx.currentTime
    const attackTime = 0.02
    const sustainTime = duration
    const releaseTime = 0.3
    const gainValue = (velocity / 127) * 0.3

    const masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)

    const oscillators: OscillatorNode[] = []

    const fundamental = ctx.createOscillator()
    fundamental.type = 'triangle'
    fundamental.frequency.setValueAtTime(freq, now)
    const fundGain = ctx.createGain()
    fundGain.gain.setValueAtTime(0, now)
    fundGain.gain.linearRampToValueAtTime(gainValue * 0.9, now + attackTime)
    fundGain.gain.setValueAtTime(gainValue * 0.9, now + attackTime + sustainTime)
    fundGain.gain.linearRampToValueAtTime(0, now + attackTime + sustainTime + releaseTime)
    fundamental.connect(fundGain)
    fundGain.connect(masterGain)
    oscillators.push(fundamental)

    const harmonic2 = ctx.createOscillator()
    harmonic2.type = 'triangle'
    harmonic2.frequency.setValueAtTime(freq * 2, now)
    const harm2Gain = ctx.createGain()
    harm2Gain.gain.setValueAtTime(0, now)
    harm2Gain.gain.linearRampToValueAtTime(gainValue * 0.07, now + attackTime)
    harm2Gain.gain.setValueAtTime(gainValue * 0.07, now + attackTime + sustainTime)
    harm2Gain.gain.linearRampToValueAtTime(0, now + attackTime + sustainTime + releaseTime)
    harmonic2.connect(harm2Gain)
    harm2Gain.connect(masterGain)
    oscillators.push(harmonic2)

    const harmonic3 = ctx.createOscillator()
    harmonic3.type = 'triangle'
    harmonic3.frequency.setValueAtTime(freq * 3, now)
    const harm3Gain = ctx.createGain()
    harm3Gain.gain.setValueAtTime(0, now)
    harm3Gain.gain.linearRampToValueAtTime(gainValue * 0.03, now + attackTime)
    harm3Gain.gain.setValueAtTime(gainValue * 0.03, now + attackTime + sustainTime)
    harm3Gain.gain.linearRampToValueAtTime(0, now + attackTime + sustainTime + releaseTime)
    harmonic3.connect(harm3Gain)
    harm3Gain.connect(masterGain)
    oscillators.push(harmonic3)

    oscillators.forEach(osc => osc.start(now))
    oscillators.forEach(osc => osc.stop(now + attackTime + sustainTime + releaseTime + 0.05))

    const noteKey = `${pitch}_${now}`
    activeOscillatorsRef.current.set(noteKey, { osc: oscillators, gain: masterGain })

    setTimeout(() => {
      activeOscillatorsRef.current.delete(noteKey)
    }, (attackTime + sustainTime + releaseTime + 0.1) * 1000)
  }, [getAudioContext])

  return { playNote }
}
