import { Router, type Request, type Response } from 'express'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { WaveFile } = require('wavefile')

const router = Router()

interface AdsrEnvelope {
  attack: number
  decay: number
  sustain: number
  release: number
}

interface Track {
  waveform: 'sine' | 'square' | 'sawtooth' | 'noise'
  frequency: number
  volume: number
  adsr: AdsrEnvelope
  muted: boolean
}

interface ExportBody {
  tracks: Track[]
  masterVolume: number
  stereoWidth: number
  duration?: number
  sampleRate?: number
}

function generateWaveformSample(
  waveform: Track['waveform'],
  frequency: number,
  phase: number,
): number {
  switch (waveform) {
    case 'sine':
      return Math.sin(phase)
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1
    case 'sawtooth':
      return 2 * ((phase / (2 * Math.PI)) % 1) - 1
    case 'noise':
      return Math.random() * 2 - 1
    default:
      return 0
  }
}

function computeAdsrGain(
  sampleIndex: number,
  sampleRate: number,
  totalSamples: number,
  adsr: AdsrEnvelope,
): number {
  const time = sampleIndex / sampleRate

  const attackEnd = adsr.attack
  const decayEnd = attackEnd + adsr.decay
  const releaseStart = totalSamples / sampleRate - adsr.release

  if (time < attackEnd) {
    return adsr.attack > 0 ? time / adsr.attack : 1
  }
  if (time < decayEnd) {
    const decayProgress = adsr.decay > 0 ? (time - attackEnd) / adsr.decay : 1
    return 1 - (1 - adsr.sustain) * decayProgress
  }
  if (time < releaseStart) {
    return adsr.sustain
  }
  const releaseProgress =
    adsr.release > 0 ? (time - releaseStart) / adsr.release : 1
  return adsr.sustain * (1 - Math.min(releaseProgress, 1))
}

router.post(
  '/',
  (req: Request<object, object, ExportBody>, res: Response): void => {
    try {
      const { tracks, masterVolume, stereoWidth, duration, sampleRate } =
        req.body

      if (!tracks || !Array.isArray(tracks)) {
        res.status(400).json({
          success: false,
          error: 'tracks array is required',
        })
        return
      }

      const sr = sampleRate || 44100
      const dur = duration || 5
      const totalSamples = Math.floor(sr * dur)
      const numChannels = 2

      const leftChannel = new Float64Array(totalSamples)
      const rightChannel = new Float64Array(totalSamples)

      const activeTracks = tracks.filter((t) => !t.muted)

      for (const track of activeTracks) {
        const { waveform, frequency, volume, adsr } = track
        const phaseIncrement = (2 * Math.PI * frequency) / sr
        let phase = 0

        const trackSamples = new Float64Array(totalSamples)
        for (let i = 0; i < totalSamples; i++) {
          const sample = generateWaveformSample(waveform, frequency, phase)
          const envGain = computeAdsrGain(i, sr, totalSamples, adsr)
          trackSamples[i] = sample * volume * envGain
          phase += phaseIncrement
          if (phase > 2 * Math.PI) phase -= 2 * Math.PI
        }

        const trackIndex = activeTracks.indexOf(track)
        const totalActive = activeTracks.length
        const pan = totalActive <= 1 ? 0 : (trackIndex / (totalActive - 1)) * 2 - 1

        const leftGain = Math.cos(((pan * stereoWidth + 1) / 2) * (Math.PI / 2))
        const rightGain = Math.sin(((pan * stereoWidth + 1) / 2) * (Math.PI / 2))

        for (let i = 0; i < totalSamples; i++) {
          leftChannel[i] += trackSamples[i] * leftGain
          rightChannel[i] += trackSamples[i] * rightGain
        }
      }

      const maxSample = Math.max(
        ...Array.from(leftChannel).map(Math.abs),
        ...Array.from(rightChannel).map(Math.abs),
        1e-6,
      )

      const normalizationFactor = masterVolume / maxSample
      const interleaved = new Int16Array(totalSamples * numChannels)

      for (let i = 0; i < totalSamples; i++) {
        const left = Math.max(
          -32768,
          Math.min(32767, Math.round(leftChannel[i] * normalizationFactor * 32767)),
        )
        const right = Math.max(
          -32768,
          Math.min(32767, Math.round(rightChannel[i] * normalizationFactor * 32767)),
        )
        interleaved[i * 2] = left
        interleaved[i * 2 + 1] = right
      }

      const wav = new WaveFile()
      wav.fromScratch(numChannels, sr, '16', interleaved)

      const base64 = wav.toBase64()
      const fileName = `soundscape-${Date.now()}.wav`

      res.status(200).json({
        success: true,
        data: {
          base64,
          fileName,
        },
      })
    } catch (error) {
      console.error('Export error:', error)
      res.status(500).json({
        success: false,
        error: `Failed to generate WAV file: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  },
)

export default router
