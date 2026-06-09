export interface ParsedSentence {
  text: string;
  sentiment: number;
  keywords: string[];
}

const POSITIVE_WORDS: Record<string, number> = {
  '欢乐': 0.9, '快乐': 0.8, '喜悦': 0.85, '幸福': 0.9, '开心': 0.75,
  '高兴': 0.7, '愉快': 0.7, '美好': 0.8, '温暖': 0.75, '希望': 0.7,
  '光明': 0.7, '成功': 0.8, '胜利': 0.85, '爱': 0.9, '热爱': 0.85,
  '美丽': 0.75, '精彩': 0.8, '优秀': 0.75, '出色': 0.75, '感动': 0.7,
  '激动': 0.7, '兴奋': 0.75, '骄傲': 0.65, '自豪': 0.7, '感恩': 0.75,
  '平静': 0.3, '宁静': 0.4, '安详': 0.35, '温柔': 0.5, '甜美': 0.65,
  '微笑': 0.6, '笑声': 0.65, '阳光': 0.55, '春天': 0.5, '花朵': 0.45,
  'happy': 0.8, 'joy': 0.85, 'love': 0.9, 'beautiful': 0.75,
  'wonderful': 0.8, 'amazing': 0.8, 'excellent': 0.75, 'great': 0.7
};

const NEGATIVE_WORDS: Record<string, number> = {
  '悲伤': -0.9, '痛苦': -0.85, '难过': -0.75, '伤心': -0.8, '绝望': -0.9,
  '恐惧': -0.8, '害怕': -0.7, '焦虑': -0.65, '担忧': -0.6, '忧愁': -0.7,
  '愤怒': -0.8, '生气': -0.7, '憎恨': -0.9, '厌恶': -0.75, '讨厌': -0.6,
  '黑暗': -0.6, '失败': -0.75, '失落': -0.65, '孤独': -0.7, '寂寞': -0.65,
  '寒冷': -0.4, '凄凉': -0.7, '悲惨': -0.85, '残酷': -0.75, '压抑': -0.6,
  '沮丧': -0.7, '郁闷': -0.6, '烦躁': -0.55, '悲伤': -0.9, '哭泣': -0.6,
  '泪水': -0.55, '风雨': -0.35, 'winter': -0.3, 'cold': -0.35,
  'sad': -0.8, 'pain': -0.85, 'fear': -0.8, 'hate': -0.9,
  'angry': -0.75, 'terrible': -0.75, 'bad': -0.6, 'awful': -0.8
};

export function parseText(text: string): ParsedSentence[] {
  if (!text || !text.trim()) {
    return [];
  }

  const rawSentences = splitSentences(text);
  const limitedSentences = rawSentences.slice(0, 60);

  return limitedSentences.map(sentence => {
    const { sentiment, keywords } = analyzeSentiment(sentence);
    return { text: sentence.trim(), sentiment, keywords };
  });
}

function splitSentences(text: string): string[] {
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences: string[] = [];
  let current = '';
  const punctuation = new Set(['。', '！', '？', '.', '!', '?', '；', ';', '\n']);
  const endPunctuation = new Set(['。', '！', '？', '.', '!', '?']);

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    current += char;

    if (punctuation.has(char)) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        let finalSentence = trimmed;
        if (!endPunctuation.has(trimmed[trimmed.length - 1]) && trimmed !== '\n') {
          finalSentence = trimmed;
        }
        if (finalSentence.replace(/[。！？.!?\s\n]/g, '').length > 0) {
          sentences.push(finalSentence);
        }
      }
      current = '';
    }
  }

  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  return sentences;
}

function analyzeSentiment(sentence: string): { sentiment: number; keywords: string[] } {
  let score = 0;
  let matchCount = 0;
  const keywords: string[] = [];

  for (const [word, weight] of Object.entries(POSITIVE_WORDS)) {
    if (sentence.includes(word)) {
      const count = (sentence.match(new RegExp(escapeRegExp(word), 'g')) || []).length;
      score += weight * count;
      matchCount += count;
      keywords.push(word);
    }
  }

  for (const [word, weight] of Object.entries(NEGATIVE_WORDS)) {
    if (sentence.includes(word)) {
      const count = (sentence.match(new RegExp(escapeRegExp(word), 'g')) || []).length;
      score += weight * count;
      matchCount += count;
      keywords.push(word);
    }
  }

  let sentiment: number;
  if (matchCount === 0) {
    sentiment = 0;
  } else {
    sentiment = Math.max(-1, Math.min(1, score / matchCount));
  }

  return { sentiment, keywords };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function averageSentiment(sentences: ParsedSentence[]): number {
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((sum, s) => sum + s.sentiment, 0);
  return total / sentences.length;
}
