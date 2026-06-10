export interface LyricLine {
  id: string
  content: string
  startTime: number
  endTime: number
  fontSize: number
  fontColor: string
  isCentered: boolean
  fadeInDuration: number
  fadeOutDuration: number
}

export interface MixSettings {
  volume: number
  balance: number
  bassBoost: number
  trebleReduction: number
  bgAudioFileName: string | null
  bgAudioVolume: number
}

export interface LyricProject {
  audioFileName: string
  duration: number
  lyrics: LyricLine[]
  mixSettings: MixSettings
}

export const defaultMixSettings: MixSettings = {
  volume: 80,
  balance: 0,
  bassBoost: 0,
  trebleReduction: 0,
  bgAudioFileName: null,
  bgAudioVolume: 50
}

export const createDefaultLyricLine = (startTime: number, endTime: number, content: string = ''): LyricLine => ({
  id: `lyric_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  content,
  startTime,
  endTime,
  fontSize: 18,
  fontColor: '#e0e0e0',
  isCentered: true,
  fadeInDuration: 0,
  fadeOutDuration: 0
})
