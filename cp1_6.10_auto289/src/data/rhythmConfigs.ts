export type FreqVariationCurve = 'sine' | 'sawtooth' | 'square'

export interface WaveParams {
  amplitudeRange: [number, number]
  freqVariationCurve: FreqVariationCurve
  edgeFactor: number
}

export interface RhythmConfig {
  id: string
  name: string
  bpm: number
  timeSignature: string
  instruments: string[]
  grooveKeywords: string[]
  grooveDescription: string
  waveParams: WaveParams
  colorStops: string[]
  beatPattern: number[]
}

export const rhythmConfigs: RhythmConfig[] = [
  {
    id: 'jazz',
    name: '爵士',
    bpm: 110,
    timeSignature: '4/4拍',
    instruments: ['架子鼓', '低音贝斯', '萨克斯', '钢琴'],
    grooveKeywords: ['摇摆', '切分', '即兴', '轻盈'],
    grooveDescription: '摇摆切分节奏，鼓点轻盈即兴，附点音符突出',
    waveParams: {
      amplitudeRange: [20, 55],
      freqVariationCurve: 'sine',
      edgeFactor: 0.2
    },
    colorStops: ['#ff9a56', '#ff6b35', '#d62828'],
    beatPattern: [0.8, 0.3, 0.6, 0.4, 0.9, 0.35, 0.55, 0.45, 0.85, 0.3, 0.6, 0.4, 0.9, 0.35, 0.55, 0.45]
  },
  {
    id: 'electronic',
    name: '电子',
    bpm: 128,
    timeSignature: '4/4拍',
    instruments: ['合成器', '底鼓', '踩镲', '军鼓'],
    grooveKeywords: ['强劲', '四四拍', '脉冲', '机械'],
    grooveDescription: '强劲四四拍，底鼓每拍重击，脉冲节奏稳定',
    waveParams: {
      amplitudeRange: [35, 75],
      freqVariationCurve: 'square',
      edgeFactor: 0.9
    },
    colorStops: ['#00d4ff', '#0099cc', '#6a00ff'],
    beatPattern: [1.0, 0.2, 0.2, 0.2, 0.9, 0.2, 0.2, 0.2, 1.0, 0.2, 0.2, 0.2, 0.9, 0.2, 0.2, 0.2]
  },
  {
    id: 'hiphop',
    name: '嘻哈',
    bpm: 90,
    timeSignature: '4/4拍',
    instruments: ['808底鼓', '军鼓', '踩镲', '采样器'],
    grooveKeywords: ['重拍', '切分', '碎拍', '律动'],
    grooveDescription: '重低音切分节奏，军鼓落在2和4拍，碎拍律动',
    waveParams: {
      amplitudeRange: [30, 70],
      freqVariationCurve: 'sawtooth',
      edgeFactor: 0.6
    },
    colorStops: ['#ffd93d', '#ff9f43', '#ee5253'],
    beatPattern: [1.0, 0.15, 0.3, 0.2, 0.2, 0.95, 0.2, 0.3, 1.0, 0.15, 0.3, 0.2, 0.2, 0.95, 0.2, 0.3]
  },
  {
    id: 'classical',
    name: '古典',
    bpm: 72,
    timeSignature: '4/4拍',
    instruments: ['小提琴', '大提琴', '钢琴', '长笛'],
    grooveKeywords: ['优雅', '流畅', '渐强', '抒情'],
    grooveDescription: '优雅流畅的线条，强弱起伏自然，抒情性强',
    waveParams: {
      amplitudeRange: [15, 45],
      freqVariationCurve: 'sine',
      edgeFactor: 0.1
    },
    colorStops: ['#c7ceea', '#a29bfe', '#6c5ce7'],
    beatPattern: [0.7, 0.5, 0.6, 0.4, 0.8, 0.5, 0.6, 0.45, 0.75, 0.5, 0.6, 0.4, 0.85, 0.55, 0.6, 0.45]
  },
  {
    id: 'reggae',
    name: '雷鬼',
    bpm: 80,
    timeSignature: '4/4拍',
    instruments: ['贝斯', '吉他', '架子鼓', '管风琴'],
    grooveKeywords: ['反拍', '慵懒', 'ska', '弹跳'],
    grooveDescription: '反拍重音节奏，贝斯线突出，慵懒弹跳律动',
    waveParams: {
      amplitudeRange: [25, 60],
      freqVariationCurve: 'sine',
      edgeFactor: 0.35
    },
    colorStops: ['#00b894', '#55efc4', '#fdcb6e'],
    beatPattern: [0.4, 0.9, 0.2, 0.9, 0.4, 0.85, 0.2, 0.85, 0.4, 0.9, 0.2, 0.9, 0.4, 0.85, 0.2, 0.85]
  },
  {
    id: 'rock',
    name: '摇滚',
    bpm: 140,
    timeSignature: '4/4拍',
    instruments: ['电吉他', '贝斯', '架子鼓', '主唱'],
    grooveKeywords: ['强劲', '重拍', '失真', '冲击'],
    grooveDescription: '强劲失真吉他riff，底鼓军鼓交替重击，充满力量',
    waveParams: {
      amplitudeRange: [40, 85],
      freqVariationCurve: 'square',
      edgeFactor: 0.75
    },
    colorStops: ['#e17055', '#d63031', '#2d3436'],
    beatPattern: [1.0, 0.3, 0.8, 0.3, 0.9, 1.0, 0.3, 0.8, 1.0, 0.3, 0.8, 0.3, 0.9, 1.0, 0.3, 0.8]
  },
  {
    id: 'latin',
    name: '拉丁',
    bpm: 120,
    timeSignature: '4/4拍',
    instruments: ['康加鼓', '邦戈鼓', '沙锤', '贝斯'],
    grooveKeywords: ['热情', '多节奏', '切分', '律动'],
    grooveDescription: '多节奏层叠，切分音丰富，充满热情的律动',
    waveParams: {
      amplitudeRange: [28, 65],
      freqVariationCurve: 'sawtooth',
      edgeFactor: 0.5
    },
    colorStops: ['#fd79a8', '#e84393', '#fdcb6e'],
    beatPattern: [0.7, 0.6, 0.9, 0.4, 0.6, 0.8, 0.5, 0.9, 0.7, 0.6, 0.9, 0.4, 0.6, 0.8, 0.5, 0.9]
  },
  {
    id: 'folk',
    name: '民谣',
    bpm: 85,
    timeSignature: '6/8拍',
    instruments: ['木吉他', '口琴', '小提琴', '手鼓'],
    grooveKeywords: ['质朴', '三拍子', '流畅', '叙事'],
    grooveDescription: '质朴三拍子律动，吉他分解和弦，流畅叙事感',
    waveParams: {
      amplitudeRange: [18, 50],
      freqVariationCurve: 'sine',
      edgeFactor: 0.15
    },
    colorStops: ['#a3cb38', '#78e08f', '#b8e994'],
    beatPattern: [0.85, 0.4, 0.5, 0.7, 0.45, 0.55, 0.85, 0.4, 0.5, 0.7, 0.45, 0.55, 0.85, 0.4, 0.5, 0.7]
  }
]

export function getConfigById(id: string): RhythmConfig | undefined {
  return rhythmConfigs.find(c => c.id === id)
}
