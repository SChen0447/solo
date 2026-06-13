import * as Tone from 'tone'

export class AudioManager {
  private initialized = false
  private masterGain: Tone.Gain | null = null

  async init(): Promise<void> {
    if (this.initialized) return
    try {
      await Tone.start()
      this.masterGain = new Tone.Gain(0.6).toDestination()
      this.initialized = true
    } catch (e) {
      console.warn('Audio init failed', e)
    }
  }

  private ensureReady(): boolean {
    if (!this.initialized || !this.masterGain) return false
    if (Tone.context.state !== 'running') {
      Tone.start().catch(() => {})
    }
    return true
  }

  playHum(): void {
    if (!this.ensureReady() || !this.masterGain) return
    const osc = new Tone.Oscillator({ frequency: 'C2', type: 'sawtooth' })
    const osc2 = new Tone.Oscillator({ frequency: 65.4, type: 'sine' })
    const gain = new Tone.Gain(0)
    const filter = new Tone.Filter({ frequency: 200, type: 'lowpass' })

    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    const now = Tone.now()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.2)
    gain.gain.linearRampToValueAtTime(0, now + 0.4)

    osc.start(now)
    osc2.start(now)
    osc.stop(now + 0.42)
    osc2.stop(now + 0.42)

    osc.disconnect()
    osc2.disconnect()
    filter.disconnect()
    gain.disconnect()
  }

  playMetalImpact(): void {
    if (!this.ensureReady() || !this.masterGain) return
    const now = Tone.now()

    const noise = new Tone.Noise({ type: 'white' })
    const noiseFilter = new Tone.Filter({ frequency: 4500, Q: 8, type: 'bandpass' })
    const noiseGain = new Tone.Gain(0)

    const osc1 = new Tone.Oscillator({ frequency: 'C6', type: 'square' })
    const osc2 = new Tone.Oscillator({ frequency: 1108.7, type: 'triangle' })
    const oscGain = new Tone.Gain(0)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain)

    osc1.connect(oscGain)
    osc2.connect(oscGain)
    oscGain.connect(this.masterGain)

    noiseGain.gain.setValueAtTime(0.5, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

    oscGain.gain.setValueAtTime(0.25, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.15)
    osc2.frequency.exponentialRampToValueAtTime(700, now + 0.15)

    noise.start(now)
    osc1.start(now)
    osc2.start(now)
    noise.stop(now + 0.26)
    osc1.stop(now + 0.2)
    osc2.stop(now + 0.2)

    setTimeout(() => {
      noise.disconnect(); noiseFilter.disconnect(); noiseGain.disconnect()
      osc1.disconnect(); osc2.disconnect(); oscGain.disconnect()
    }, 400)
  }

  playGlassBreak(): void {
    if (!this.ensureReady() || !this.masterGain) return
    const now = Tone.now()

    const noise = new Tone.Noise({ type: 'white' })
    const hpFilter = new Tone.Filter({ frequency: 2500, type: 'highpass' })
    const bpFilter = new Tone.Filter({ frequency: 'D7', Q: 6, type: 'bandpass' })
    const noiseGain = new Tone.Gain(0)

    const osc = new Tone.Oscillator({ frequency: 2349.3, type: 'sine' })
    const oscGain = new Tone.Gain(0)

    noise.connect(hpFilter)
    hpFilter.connect(bpFilter)
    bpFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain)

    osc.connect(oscGain)
    oscGain.connect(this.masterGain)

    noiseGain.gain.setValueAtTime(0.45, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    oscGain.gain.setValueAtTime(0.2, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3)

    noise.start(now)
    osc.start(now)
    noise.stop(now + 0.42)
    osc.stop(now + 0.32)

    setTimeout(() => {
      noise.disconnect(); hpFilter.disconnect(); bpFilter.disconnect(); noiseGain.disconnect()
      osc.disconnect(); oscGain.disconnect()
    }, 500)
  }

  playTransform(): void {
    if (!this.ensureReady() || !this.masterGain) return
    const now = Tone.now()

    const osc1 = new Tone.Oscillator({ frequency: 150, type: 'sawtooth' })
    const osc2 = new Tone.Oscillator({ frequency: 450, type: 'square' })
    const filter = new Tone.Filter({ frequency: 300, type: 'lowpass', Q: 5 })
    const gain = new Tone.Gain(0)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.03)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.15)
    gain.gain.linearRampToValueAtTime(0, now + 0.3)

    osc1.frequency.linearRampToValueAtTime(60, now + 0.3)
    osc2.frequency.linearRampToValueAtTime(180, now + 0.3)
    filter.frequency.linearRampToValueAtTime(1200, now + 0.3)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.32)
    osc2.stop(now + 0.32)

    setTimeout(() => {
      osc1.disconnect(); osc2.disconnect(); filter.disconnect(); gain.disconnect()
    }, 400)
  }

  playEnergyWave(): void {
    if (!this.ensureReady() || !this.masterGain) return
    const now = Tone.now()

    const osc = new Tone.Oscillator({ frequency: 80, type: 'sine' })
    const osc2 = new Tone.Oscillator({ frequency: 160, type: 'triangle' })
    const gain = new Tone.Gain(0)
    const filter = new Tone.Filter({ frequency: 500, type: 'lowpass', Q: 3 })

    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.28, now + 0.08)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.5)
    gain.gain.linearRampToValueAtTime(0, now + 1.2)

    osc.frequency.exponentialRampToValueAtTime(350, now + 1.2)
    osc2.frequency.exponentialRampToValueAtTime(700, now + 1.2)
    filter.frequency.exponentialRampToValueAtTime(2500, now + 1.2)

    osc.start(now)
    osc2.start(now)
    osc.stop(now + 1.25)
    osc2.stop(now + 1.25)

    setTimeout(() => {
      osc.disconnect(); osc2.disconnect(); filter.disconnect(); gain.disconnect()
    }, 1400)
  }

  playMove(): void {
    if (!this.ensureReady() || !this.masterGain) return
    const now = Tone.now()
    const osc = new Tone.Oscillator({ frequency: 320, type: 'sine' })
    const gain = new Tone.Gain(0)

    osc.connect(gain)
    gain.connect(this.masterGain)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01)
    gain.gain.linearRampToValueAtTime(0, now + 0.08)

    osc.frequency.linearRampToValueAtTime(380, now + 0.08)

    osc.start(now)
    osc.stop(now + 0.1)

    setTimeout(() => { osc.disconnect(); gain.disconnect() }, 150)
  }
}
