import { EmotionType, InspirationCard } from '../types';

const POSITIVE_WORDS = [
  '快乐', '喜悦', '开心', '兴奋', '希望', '梦想', '成功', '美好', '爱', '温暖',
  '光明', '自由', '勇气', '创造', '热情', '希望', '美丽', '幸福', '满足', '感恩',
  '微笑', '阳光', '春天', '花朵', '音乐', '灵感', '奇迹', '胜利', '成长', '智慧',
  'amazing', 'happy', 'joy', 'love', 'wonderful', 'great', 'excellent', 'beautiful',
  'hope', 'dream', 'success', 'passion', 'creative', 'brilliant', 'fantastic'
];

const NEGATIVE_WORDS = [
  '悲伤', '痛苦', '绝望', '恐惧', '愤怒', '焦虑', '孤独', '失落', '迷茫', '疲惫',
  '黑暗', '失败', '放弃', '伤心', '难过', '压抑', '厌倦', '憎恨', '嫉妒', '焦虑',
  'sad', 'pain', 'fear', 'angry', 'anxious', 'lonely', 'lost', 'tired', 'dark',
  'failure', 'hate', 'depressed', 'worried', 'stressed', 'hopeless'
];

const COLOR_MAP: Record<EmotionType, string> = {
  positive: '#f5a623',
  neutral: '#7ec8e3',
  negative: '#d0021b',
};

const POSITIVE_PHRASES = [
  '像阳光穿透云层',
  '蕴藏着无限可能',
  '让人心生向往',
  '点亮前路的灯塔',
  '绽放绚烂光彩',
  '温暖而有力量',
  '如春风拂面',
  '是梦想的起点',
  '充满生命张力',
  '在心底开出花来',
];

const NEUTRAL_PHRASES = [
  '如流水般自然',
  '在时光中沉淀',
  '静静等待发芽',
  '像薄雾中的远山',
  '保持微妙平衡',
  '处于中间地带',
  '像呼吸一样平静',
  '等待被赋予意义',
  '在沉默中积蓄',
  '是未完成的句子',
];

const NEGATIVE_PHRASES = [
  '在阴影中低语',
  '需要被温柔接纳',
  '是成长的催化剂',
  '藏着未说出口的话',
  '等待被光照亮',
  '如潮水终将退去',
  '也是真实的一部分',
  '在黑暗中寻找出口',
  '终将化为养分',
  '是内心深处的回响',
];

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '这个', '那个', '什么', '怎么', '为什么', '可以', '能',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its',
  'our', 'their', 'this', 'that', 'these', 'those', 'and', 'or', 'but',
  'if', 'then', 'so', 'as', 'of', 'at', 'by', 'for', 'with', 'about',
  'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off'
]);

function generateId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomRotation(): number {
  return (Math.random() - 0.5) * 10;
}

function extractKeywords(text: string): string[] {
  const cleanedText = text.replace(/[\p{P}\p{S}]/gu, ' ');
  const chineseChars = cleanedText.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const englishWords = cleanedText.match(/[a-zA-Z]{3,}/g) || [];
  const allWords = [...chineseChars, ...englishWords.map(w => w.toLowerCase())];
  const filtered = allWords.filter(w => !STOP_WORDS.has(w) && w.trim().length > 0);
  const wordCount: Record<string, number> = {};
  filtered.forEach(w => {
    wordCount[w] = (wordCount[w] || 0) + 1;
  });
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 8);
}

function analyzeEmotion(text: string): EmotionType {
  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;
  POSITIVE_WORDS.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) {
      positiveScore++;
    }
  });
  NEGATIVE_WORDS.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) {
      negativeScore++;
    }
  });
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

function getPhrase(emotion: EmotionType): string {
  const phrases = emotion === 'positive' ? POSITIVE_PHRASES
    : emotion === 'negative' ? NEGATIVE_PHRASES
    : NEUTRAL_PHRASES;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function splitSentences(text: string): string[] {
  const sentences = text.split(/[。！？!?.;；\n]+/).filter(s => s.trim().length > 0);
  return sentences;
}

export function analyzeText(input: string): InspirationCard[] {
  const trimmedInput = input.trim();
  if (!trimmedInput) return [];
  const overallEmotion = analyzeEmotion(trimmedInput);
  const keywords = extractKeywords(trimmedInput);
  const sentences = splitSentences(trimmedInput);
  const cards: InspirationCard[] = [];
  const usedKeywords = new Set<string>();
  let cardCount = 0;
  const maxCards = Math.min(10, Math.max(keywords.length, sentences.length, 1));

  if (keywords.length > 0) {
    keywords.slice(0, maxCards).forEach(keyword => {
      if (cardCount >= maxCards) return;
      usedKeywords.add(keyword);
      const cardEmotion = analyzeEmotion(keyword) === 'neutral' ? overallEmotion : analyzeEmotion(keyword);
      cards.push({
        id: generateId(),
        keyword,
        phrase: getPhrase(cardEmotion),
        emotion: cardEmotion,
        color: COLOR_MAP[cardEmotion],
        rotation: randomRotation(),
        tags: [],
        archived: false,
        placedOnCanvas: false,
        createdAt: Date.now() + cardCount,
      });
      cardCount++;
    });
  }

  if (cardCount < maxCards && sentences.length > 0) {
    sentences.slice(0, maxCards - cardCount).forEach(sentence => {
      if (cardCount >= maxCards) return;
      const shortKeyword = sentence.trim().slice(0, 8);
      if (usedKeywords.has(shortKeyword)) return;
      usedKeywords.add(shortKeyword);
      const cardEmotion = analyzeEmotion(sentence) === 'neutral' ? overallEmotion : analyzeEmotion(sentence);
      cards.push({
        id: generateId(),
        keyword: shortKeyword,
        phrase: getPhrase(cardEmotion),
        emotion: cardEmotion,
        color: COLOR_MAP[cardEmotion],
        rotation: randomRotation(),
        tags: [],
        archived: false,
        placedOnCanvas: false,
        createdAt: Date.now() + cardCount,
      });
      cardCount++;
    });
  }

  if (cards.length === 0) {
    const fallbackKeyword = trimmedInput.slice(0, 10);
    cards.push({
      id: generateId(),
      keyword: fallbackKeyword,
      phrase: getPhrase(overallEmotion),
      emotion: overallEmotion,
      color: COLOR_MAP[overallEmotion],
      rotation: randomRotation(),
      tags: [],
      archived: false,
      placedOnCanvas: false,
      createdAt: Date.now(),
    });
  }

  return cards;
}
