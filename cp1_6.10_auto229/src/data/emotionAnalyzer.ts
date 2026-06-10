export interface EmotionResult {
  value: number
  keywords: string[]
}

const positiveKeywords: string[] = [
  '开心', '快乐', '希望', '温暖', '光明', '爱', '美好', '成功', '自由', '和平',
  '喜悦', '梦想', '勇气', '阳光', '微笑', '幸福', '花朵', '春天', '飞翔', '歌唱'
]

const negativeKeywords: string[] = [
  '悲伤', '痛苦', '绝望', '寒冷', '黑暗', '恨', '丑陋', '失败', '束缚', '战争',
  '忧愁', '噩梦', '恐惧', '阴影', '哭泣', '孤独', '凋零', '冬天', '坠落', '沉默'
]

export function analyzeEmotion(text: string): EmotionResult {
  const foundPositive: string[] = []
  const foundNegative: string[] = []

  for (const word of positiveKeywords) {
    if (text.includes(word)) {
      foundPositive.push(word)
    }
  }

  for (const word of negativeKeywords) {
    if (text.includes(word)) {
      foundNegative.push(word)
    }
  }

  const total = foundPositive.length + foundNegative.length
  let value = 0.5

  if (total > 0) {
    value = foundPositive.length / total
  }

  return {
    value,
    keywords: [...foundPositive, ...foundNegative]
  }
}
