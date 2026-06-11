export type PlaybackState = 'idle' | 'playing' | 'paused' | 'fastForward' | 'rewind' | 'recording'

export interface AudioMetadata {
  fileName: string
  duration: number
  sampleRate: number
}

interface AudioManagerOptions {
  onStateChange?: (state: PlaybackState) => void
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
}

export class AudioManager {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private audioBuffer: AudioBuffer | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private stream: MediaStream | null = null

  private state: PlaybackState = 'idle'
  private currentTime = 0
  private startTime = 0
  private pausedAt = 0
  private metadata: AudioMetadata | null = null
  private animationFrameId: number | null = null

  private onStateChange?: (state: PlaybackState) => void
  private onTimeUpdate?: (currentTime: number) => void
  private onEnded?: () => void

  constructor(options: AudioManagerOptions = {}) {
    this.onStateChange = options.onStateChange
    this.onTimeUpdate = options.onTimeUpdate
    this.onEnded = options.onEnded
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.gainNode = this.audioContext.createGain()
      this.analyser.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)
    }
  }

  private setState(state: PlaybackState): void {
    this.state = state
    this.onStateChange?.(state)
  }

  async loadAudioFile(file: File): Promise<AudioMetadata> {
    this.initAudioContext()
    this.stop()

    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)

    this.audioBuffer = audioBuffer
    this.metadata = {
      fileName: file.name,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
    }

    return this.metadata
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer) return

    if (this.state === 'playing') return

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = this.audioBuffer
    this.source.connect(this.analyser!)

    const offset = this.pausedAt
    this.startTime = this.audioContext.currentTime - offset
    this.source.start(0, offset)

    this.source.onended = () => {
      if (this.state === 'playing') {
        this.pausedAt = 0
        this.currentTime = 0
        this.setState('idle')
        this.onEnded?.()
        this.stopTimeTracking()
      }
    }

    this.setState('playing')
    this.startTimeTracking()
  }

  pause(): void {
    if (this.state !== 'playing' && this.state !== 'fastForward' && this.state !== 'rewind') return

    if (this.source) {
      this.source.stop()
      this.source.disconnect()
      this.source = null
    }

    this.pausedAt = this.currentTime
    this.setState('paused')
    this.stopTimeTracking()
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop()
        this.source.disconnect()
      } catch (e) {
        // ignore
      }
      this.source = null
    }

    this.pausedAt = 0
    this.currentTime = 0
    this.setState('idle')
    this.stopTimeTracking()
  }

  fastForward(): void {
    if (!this.audioBuffer) return
    if (this.state === 'fastForward') return

    this.pause()

    const newTime = Math.min(this.pausedAt + 10, this.audioBuffer.duration)
    this.pausedAt = newTime
    this.currentTime = newTime
    this.onTimeUpdate?.(this.currentTime)

    this.play()
    this.setState('fastForward')

    if (this.source) {
      this.source.playbackRate.value = 2.5
    }
  }

  rewind(): void {
    if (!this.audioBuffer) return
    if (this.state === 'rewind') return

    this.pause()

    const newTime = Math.max(this.pausedAt - 10, 0)
    this.pausedAt = newTime
    this.currentTime = newTime
    this.onTimeUpdate?.(this.currentTime)

    this.play()
    this.setState('rewind')

    if (this.source) {
      this.source.playbackRate.value = 2.5
    }
  }

  async startRecording(): Promise<void> {
    this.initAudioContext()

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume()
      }

      const source = this.audioContext!.createMediaStreamSource(this.stream)
      source.connect(this.analyser!)

      this.mediaRecorder = new MediaRecorder(this.stream)
      this.recordedChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100)
      this.setState('recording')
      this.startTimeTracking()
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  stopRecording(): Blob | null {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    this.stopTimeTracking()
    this.setState('idle')

    if (this.recordedChunks.length > 0) {
      return new Blob(this.recordedChunks, { type: 'audio/webm' })
    }

    return null
  }

  private startTimeTracking(): void {
    const track = () => {
      if (this.state === 'playing' || this.state === 'recording') {
        if (this.state === 'playing' && this.audioContext) {
          this.currentTime = this.audioContext.currentTime - this.startTime
          if (this.audioBuffer && this.currentTime >= this.audioBuffer.duration) {
            this.currentTime = this.audioBuffer.duration
          }
        } else if (this.state === 'recording') {
          this.currentTime = (this.audioContext?.currentTime || 0) - this.startTime
        }
        this.onTimeUpdate?.(this.currentTime)
      }
      this.animationFrameId = requestAnimationFrame(track)
    }

    if (this.state === 'recording') {
      this.startTime = this.audioContext?.currentTime || 0
      this.currentTime = 0
    }

    this.animationFrameId = requestAnimationFrame(track)
  }

  private stopTimeTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  getState(): PlaybackState {
    return this.state
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  getMetadata(): AudioMetadata | null {
    return this.metadata
  }

  getDuration(): number {
    return this.audioBuffer?.duration || 0
  }

  destroy(): void {
    this.stopTimeTracking()

    if (this.source) {
      try {
        this.source.stop()
        this.source.disconnect()
      } catch (e) {
        // ignore
      }
      this.source = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    if (this.gainNode) {
      this.gainNode.disconnect()
      this.gainNode = null
    }

    if (this.analyser) {
      this.analyser.disconnect()
      this.analyser = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

export const audioManager = new AudioManager()
