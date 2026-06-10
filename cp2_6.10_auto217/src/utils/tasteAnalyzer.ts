import type { Movie, UserChoice, AnalysisResult, TasteDimensions, TasteDimensionKey } from '@/types'
import { MOVIES } from '@/data/movies'
import { DIMENSION_LABELS } from '@/types'

const DEFAULT_DIMENSIONS: TasteDimensions = {
  artistic: 0,
  commercial: 0,
  rhythm: 0,
  plotComplexity: 0,
  visualStyle: 0,
  emotionalImpact: 0
}

export function analyzeTaste(choices: UserChoice[]): AnalysisResult {
  const dimensions: TasteDimensions = { ...DEFAULT_DIMENSIONS }
  let likedCount = 0
  let dislikedCount = 0

  for (const choice of choices) {
    const movie = MOVIES.find((m: Movie) => m.id === choice.movieId)
    if (!movie) continue

    const multiplier = choice.liked ? 1 : -0.3

    if (choice.liked) {
      likedCount++
    } else {
      dislikedCount++
    }

    ;(Object.keys(dimensions) as TasteDimensionKey[]).forEach((key) => {
      dimensions[key] += movie.scores[key] * multiplier
    })
  }

  const minVal = Math.min(...(Object.values(dimensions) as number[]))
  const offset = minVal < 0 ? -minVal : 0
  ;(Object.keys(dimensions) as TasteDimensionKey[]).forEach((key) => {
    dimensions[key] = dimensions[key] + offset
  })

  const maxVal = Math.max(...(Object.values(dimensions) as number[]))
  if (maxVal > 0) {
    ;(Object.keys(dimensions) as TasteDimensionKey[]).forEach((key) => {
      dimensions[key] = Math.min(100, Math.round((dimensions[key] / maxVal) * 100))
    })
  }

  const topDimension = (Object.keys(dimensions) as TasteDimensionKey[]).reduce(
    (a, b) => (dimensions[a] >= dimensions[b] ? a : b)
  )

  const summary = generateSummary(topDimension, dimensions, likedCount, dislikedCount)

  return {
    dimensions,
    topDimension,
    summary
  }
}

function generateSummary(
  top: TasteDimensionKey,
  dims: TasteDimensions,
  liked: number,
  disliked: number
): string {
  const topLabel = DIMENSION_LABELS[top]
  const total = liked + disliked
  const ratio = total > 0 ? Math.round((liked / total) * 100) : 50

  let description = ''

  switch (top) {
    case 'artistic':
      description = `你是一位追求艺术表达的影迷，偏爱富有诗意和隐喻的影像语言。`
      break
    case 'commercial':
      description = `你注重视听享受，喜欢节奏紧凑、制作精良的商业大片。`
      break
    case 'rhythm':
      description = `你对电影节奏非常敏感，快节奏的剪辑和紧凑的情节最能抓住你的注意力。`
      break
    case 'plotComplexity':
      description = `你热爱烧脑叙事，非线性结构和多重反转让你沉浸其中。`
      break
    case 'visualStyle':
      description = `你是视觉美学的追求者，构图、色彩、摄影是你评价电影的关键。`
      break
    case 'emotionalImpact':
      description = `你重视情感共鸣，能够打动人心的故事最能获得你的青睐。`
      break
  }

  return `${description}你共选择了${total}部电影，其中${ratio}%获得了你的喜爱。你的核心偏好维度是「${topLabel}」。`
}
