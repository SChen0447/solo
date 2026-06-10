import { Fragment } from '../types';

const FRAGMENT_TITLES = [
  '晨雾中的鸟鸣', '城市的午夜节拍', '海边的浪潮', '森林深处的低语',
  '老唱片的回忆', '雨后的街道', '星空下的旋律', '童年的风铃'
];

const FRAGMENT_CONTENTS = [
  '那段清晨在山间录下的鸟鸣，成了这首歌最纯粹的开场。',
  '凌晨三点的城市，地铁的轰鸣与远处的警笛交织成独特的节拍。',
  '海浪一遍遍拍打礁石，像是大自然在调试它的低音鼓。',
  '风吹过树叶的沙沙声，藏着最古老的节奏密码。',
  '从爷爷留下的旧唱片里采样的那段钢琴，带着岁月的温度。',
  '雨滴落在雨伞上的声音，意外地完美契合了副歌的律动。',
  '望着星空哼出的旋律，是宇宙给我的回信。',
  '外婆家门口的风铃，是我音乐记忆里的第一个音符。'
];

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateAudioData = (seed: number): number[] => {
  const length = 44100 * 2;
  const data: number[] = [];
  const freqBase = 200 + seededRandom(seed) * 600;
  for (let i = 0; i < length; i++) {
    const t = i / 44100;
    const envelope = Math.sin((t / 2) * Math.PI);
    const sample = Math.sin(2 * Math.PI * freqBase * t) * 0.3 +
                   Math.sin(2 * Math.PI * freqBase * 1.5 * t) * 0.15 +
                   Math.sin(2 * Math.PI * freqBase * 2 * t) * 0.1;
    data.push(sample * envelope);
  }
  return data;
};

export const generateFragments = (): Fragment[] => {
  const fragments: Fragment[] = [];
  const count = 8;

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const radius = 5.5;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    fragments.push({
      id: `fragment-${i}`,
      title: FRAGMENT_TITLES[i],
      content: FRAGMENT_CONTENTS[i],
      hue: Math.floor(seededRandom(i * 137.5) * 360),
      position: { x, y, z },
      collected: false,
      audioData: generateAudioData(i + 1)
    });
  }

  return fragments;
};
