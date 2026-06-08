import { v4 as uuidv4 } from 'uuid';
import type { Scene, EmotionType, BackgroundType } from '@/types';
import { EMOTION_COLORS, BACKGROUND_TYPES } from '@/types';

const HAPPY_WORDS = ['快乐', '开心', '高兴', '幸福', '喜悦', '愉快', '欢乐', '笑', '阳光', '温暖', '爱', '美好', '希望', '成功', '胜利', '惊喜', '美丽', '花朵', '阳光', '彩虹'];
const SAD_WORDS = ['悲伤', '难过', '伤心', '痛苦', '哭泣', '眼泪', '孤独', '寂寞', '失望', '绝望', '黑暗', '死亡', '失去', '离别', '忧伤', '忧愁', '凄凉', '阴沉'];
const TENSE_WORDS = ['紧张', '害怕', '恐惧', '危险', '战斗', '冲突', '危机', '紧急', '惊险', '刺激', '爆炸', '逃跑', '追逐', '搏斗', '恐怖', '可怕', '惊慌'];

const analyzeEmotion = (text: string): EmotionType => {
  let happyScore = 0;
  let sadScore = 0;
  let tenseScore = 0;

  HAPPY_WORDS.forEach((word) => {
    if (text.includes(word)) happyScore += 2;
  });
  SAD_WORDS.forEach((word) => {
    if (text.includes(word)) sadScore += 2;
  });
  TENSE_WORDS.forEach((word) => {
    if (text.includes(word)) tenseScore += 2;
  });

  happyScore += (text.match(/[！!。.？?~～]/g)?.length || 0) * 0.2;
  sadScore += (text.match(/[…—]/g)?.length || 0) * 0.3;

  const maxScore = Math.max(happyScore, sadScore, tenseScore, 1);
  if (maxScore === happyScore && happyScore > 0.5) return 'happy';
  if (maxScore === sadScore && sadScore > 0.5) return 'sad';
  if (maxScore === tenseScore && tenseScore > 0.5) return 'tense';
  return 'calm';
};

const detectBackground = (text: string, index: number): BackgroundType => {
  const keywords: Record<BackgroundType, string[]> = {
    forest: ['森林', '树林', '树木', '树', '丛林', '林间', '绿色'],
    castle: ['城堡', '宫殿', '王国', '国王', '王子', '公主', '塔楼'],
    desert: ['沙漠', '沙丘', '骆驼', '仙人掌', '绿洲', '黄沙'],
    ocean: ['海', '海洋', '海浪', '船', '岛屿', '沙滩', '浪花', '珊瑚'],
    mountain: ['山', '山脉', '山峰', '雪山', '山谷', '攀登', '悬崖'],
    city: ['城市', '街道', '建筑', '房子', '车', '商店', '霓虹'],
    starry: ['星空', '星星', '月亮', '夜晚', '夜空', '银河', '宇宙'],
    garden: ['花园', '花', '草', '蝴蝶', '蜜蜂', '玫瑰', '草坪'],
  };

  let bestType: BackgroundType = 'forest';
  let bestScore = 0;

  (Object.keys(keywords) as BackgroundType[]).forEach((type) => {
    let score = 0;
    keywords[type].forEach((word) => {
      if (text.includes(word)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  });

  if (bestScore === 0) {
    return BACKGROUND_TYPES[index % BACKGROUND_TYPES.length];
  }

  return bestType;
};

const splitTextIntoParagraphs = (text: string, targetCount: number): string[] => {
  const sentences = text.split(/[。！？!?\n]+/).filter((s) => s.trim().length > 0);

  if (sentences.length <= targetCount) {
    return sentences.map((s) => s.trim());
  }

  const paragraphs: string[] = [];
  const sentencesPerGroup = Math.ceil(sentences.length / targetCount);

  for (let i = 0; i < sentences.length; i += sentencesPerGroup) {
    const group = sentences.slice(i, i + sentencesPerGroup).join('。').trim();
    if (group) {
      paragraphs.push(group);
    }
  }

  while (paragraphs.length < targetCount && paragraphs.length > 0) {
    const lastIdx = paragraphs.length - 1;
    const lastPara = paragraphs[lastIdx];
    const mid = Math.floor(lastPara.length / 2);
    const firstHalf = lastPara.slice(0, mid);
    const secondHalf = lastPara.slice(mid);
    paragraphs[lastIdx] = firstHalf;
    paragraphs.push(secondHalf);
  }

  return paragraphs.slice(0, targetCount);
};

export const generateScenes = (text: string): Scene[] => {
  const cleanText = text.trim();
  if (!cleanText) return [];

  const sceneCount = Math.min(8, Math.max(5, Math.ceil(cleanText.length / 80)));
  const paragraphs = splitTextIntoParagraphs(cleanText, sceneCount);

  return paragraphs.map((para, index) => {
    const emotion = analyzeEmotion(para);
    const backgroundType = detectBackground(para, index);
    const colors = EMOTION_COLORS[emotion];

    return {
      id: uuidv4(),
      index,
      text: para,
      backgroundType,
      emotion,
      bgColor: colors.primary,
      textSpeed: 80,
      volume: 70,
    };
  });
};

export const extractTitle = (text: string): string => {
  const cleanText = text.trim();
  if (!cleanText) return '未命名故事';
  const firstLine = cleanText.split(/[\n。！？!?]/)[0].trim();
  return firstLine.slice(0, 20) || '未命名故事';
};
