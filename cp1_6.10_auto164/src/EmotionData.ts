export interface EmotionData {
  name: string;
  displayName: string;
  color: string;
  speedMultiplier: number;
  clusterRadius: number;
  hueShift: number;
}

export const NEUTRAL_EMOTION: EmotionData = {
  name: 'neutral',
  displayName: 'Neutral',
  color: '#aaaaaa',
  speedMultiplier: 1.0,
  clusterRadius: 5.0,
  hueShift: 0
};

export const EMOTION_PRESETS: EmotionData[] = [
  {
    name: 'joy',
    displayName: 'Joy',
    color: '#ffd700',
    speedMultiplier: 1.8,
    clusterRadius: 4.5,
    hueShift: 15
  },
  {
    name: 'sadness',
    displayName: 'Sadness',
    color: '#4a90d9',
    speedMultiplier: 0.6,
    clusterRadius: 5.5,
    hueShift: -10
  },
  {
    name: 'anger',
    displayName: 'Anger',
    color: '#ff2a2a',
    speedMultiplier: 3.0,
    clusterRadius: 8.0,
    hueShift: 12
  },
  {
    name: 'calm',
    displayName: 'Calm',
    color: '#50e3c2',
    speedMultiplier: 0.5,
    clusterRadius: 2.0,
    hueShift: -8
  },
  {
    name: 'fear',
    displayName: 'Fear',
    color: '#9b59b6',
    speedMultiplier: 2.2,
    clusterRadius: 7.0,
    hueShift: 10
  },
  {
    name: 'surprise',
    displayName: 'Surprise',
    color: '#ff6b9d',
    speedMultiplier: 2.5,
    clusterRadius: 6.0,
    hueShift: 18
  },
  {
    name: 'hope',
    displayName: 'Hope',
    color: '#7ed321',
    speedMultiplier: 1.4,
    clusterRadius: 4.0,
    hueShift: 12
  },
  {
    name: 'melancholy',
    displayName: 'Melancholy',
    color: '#636e72',
    speedMultiplier: 0.7,
    clusterRadius: 6.5,
    hueShift: -5
  }
];

const EMOTION_ALIASES: Record<string, string> = {
  happy: 'joy',
  happiness: 'joy',
  joyful: 'joy',
  excited: 'joy',
  sad: 'sadness',
  sorrow: 'sadness',
  depressed: 'sadness',
  angry: 'anger',
  rage: 'anger',
  furious: 'anger',
  peaceful: 'calm',
  relaxed: 'calm',
  serene: 'calm',
  tranquil: 'calm',
  scared: 'fear',
  afraid: 'fear',
  terrified: 'fear',
  anxious: 'fear',
  amazed: 'surprise',
  shocked: 'surprise',
  astonished: 'surprise',
  optimistic: 'hope',
  hopeful: 'hope',
  gloomy: 'melancholy',
  blue: 'melancholy'
};

export function findEmotion(keyword: string): EmotionData {
  const normalized = keyword.toLowerCase().trim();
  if (!normalized) return NEUTRAL_EMOTION;

  const directMatch = EMOTION_PRESETS.find(e => e.name === normalized);
  if (directMatch) return directMatch;

  const alias = EMOTION_ALIASES[normalized];
  if (alias) {
    const aliasMatch = EMOTION_PRESETS.find(e => e.name === alias);
    if (aliasMatch) return aliasMatch;
  }

  const partialMatch = EMOTION_PRESETS.find(e =>
    e.name.includes(normalized) || normalized.includes(e.name)
  );
  if (partialMatch) return partialMatch;

  return NEUTRAL_EMOTION;
}

export function getEmotionColorList(): { name: string; color: string }[] {
  return EMOTION_PRESETS.map(e => ({ name: e.name, color: e.color }));
}
