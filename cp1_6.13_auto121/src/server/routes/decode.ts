import { Router, Request, Response } from 'express';
import { DecodeRequest, DecodeResult, FragmentData } from '../../types/scroll';

const router = Router();

export const gameCharacters: { char: string; meaning: string }[] = [
  { char: '天', meaning: '《尚书·尧典》：乃命羲和，钦若昊天，历象日月星辰，敬授人时。' },
  { char: '地', meaning: '《周易·坤卦》：地势坤，君子以厚德载物。' },
  { char: '玄', meaning: '《道德经·第一章》：玄之又玄，众妙之门。' },
  { char: '黄', meaning: '《千字文》：天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。' },
  { char: '宇', meaning: '《庄子·庚桑楚》：有实而无乎处者，宇也；有长而无本剽者，宙也。' },
  { char: '宙', meaning: '《淮南子·齐俗训》：往古来今谓之宙，四方上下谓之宇。' },
  { char: '洪', meaning: '《尚书·洪范》：洪水滔天，浩浩怀山襄陵，下民其咨。' },
  { char: '荒', meaning: '《诗经·小雅》：天作高山，大王荒之。彼作矣，文王康之。' },
  { char: '日', meaning: '《山海经·大荒东经》：汤谷上有扶桑，十日所浴，在黑齿北。' },
  { char: '月', meaning: '《楚辞·天问》：夜光何德，死则又育？厥利维何，而顾菟在腹？' },
  { char: '盈', meaning: '《周易·丰卦》：日中则昃，月盈则食，天地盈虚，与时消息。' },
  { char: '昃', meaning: '《尚书·无逸》：文王卑服，即康功田功。徽柔懿恭，怀保小民，惠鲜鳏寡。自朝至于日中昃，不遑暇食。' },
  { char: '辰', meaning: '《左传·昭公七年》：日月之会是谓辰，故以配日。' },
  { char: '宿', meaning: '《周礼·春官》：二十有八星之位，辨其叙事，以会天位。' },
  { char: '列', meaning: '《荀子·天论》：列星随旋，日月递炤，四时代御，阴阳大化。' }
];

const clipPaths = [
  'polygon(20% 0%, 80% 5%, 100% 40%, 95% 85%, 60% 100%, 15% 95%, 0% 50%, 5% 15%)',
  'polygon(10% 10%, 75% 0%, 100% 50%, 85% 100%, 25% 95%, 0% 60%, 5% 25%)',
  'polygon(30% 5%, 90% 15%, 100% 70%, 70% 100%, 10% 85%, 0% 35%, 20% 10%)',
  'polygon(15% 0%, 85% 10%, 95% 65%, 75% 100%, 20% 90%, 0% 55%, 10% 20%)',
  'polygon(25% 5%, 80% 0%, 100% 45%, 90% 90%, 50% 100%, 5% 80%, 0% 30%)',
  'polygon(5% 15%, 70% 0%, 100% 55%, 80% 100%, 30% 95%, 0% 65%, 10% 35%)'
];

const generateStrokes = (charIndex: number): number[][][] => {
  const baseStrokes: Record<string, number[][][]> = {
    default: [
      [[10, 20], [30, 20]],
      [[20, 10], [20, 35]],
      [[8, 28], [32, 28]],
      [[14, 36], [26, 36]]
    ]
  };
  const variants = [
    [[[5, 18], [25, 12]], [[15, 8], [18, 35]], [[12, 30], [30, 32]]],
    [[[8, 15], [32, 18]], [[22, 10], [20, 38]], [[6, 32], [28, 30]]],
    [[[12, 22], [28, 16]], [[16, 6], [24, 34]], [[10, 36], [30, 28]]]
  ];
  return variants[charIndex % variants.length] || baseStrokes.default;
};

const shuffledIndices: number[] = [];
for (let i = 0; i < gameCharacters.length; i++) {
  shuffledIndices.push(i);
}
for (let i = shuffledIndices.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
}

export const getInitialFragments = (): FragmentData[] => {
  const fragments: FragmentData[] = [];
  const extraCount = 15;
  
  for (let i = 0; i < gameCharacters.length + extraCount; i++) {
    const isTarget = i < gameCharacters.length;
    const charIdx = isTarget ? shuffledIndices[i] : Math.floor(Math.random() * gameCharacters.length);
    const char = gameCharacters[charIdx];
    
    fragments.push({
      id: `frag-${i}`,
      character: char.char,
      positionIndex: isTarget ? charIdx : -1,
      clipPath: clipPaths[i % clipPaths.length],
      rotation: (Math.random() - 0.5) * 40,
      strokes: generateStrokes(i)
    });
  }
  
  for (let i = fragments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fragments[i], fragments[j]] = [fragments[j], fragments[i]];
  }
  
  return fragments;
};

router.post('/', async (req: Request<{}, {}, DecodeRequest>, res: Response<DecodeResult>) => {
  const { fragmentId, slotIndex } = req.body;
  
  const delay = 500 + Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const numMatch = fragmentId.match(/frag-(\d+)/);
  if (!numMatch) {
    return res.json({ matched: false });
  }
  
  const fragNum = parseInt(numMatch[1]);
  const initialFragments = getInitialFragments();
  const fragment = initialFragments.find(f => {
    const m = f.id.match(/frag-(\d+)/);
    return m && parseInt(m[1]) === fragNum;
  });
  
  if (!fragment) {
    return res.json({ matched: false });
  }
  
  if (fragment.positionIndex === slotIndex && slotIndex >= 0 && slotIndex < gameCharacters.length) {
    const charInfo = gameCharacters[slotIndex];
    const nextIdx = slotIndex + 1;
    const nextHint = nextIdx < gameCharacters.length 
      ? `下一个字的线索：${gameCharacters[nextIdx].meaning.slice(5, 15)}...`
      : undefined;
    
    return res.json({
      matched: true,
      character: charInfo.char,
      meaning: charInfo.meaning,
      nextHint
    });
  }
  
  return res.json({ matched: false });
});

router.get('/fragments', (_req, res) => {
  res.json(getInitialFragments());
});

router.get('/characters', (_req, res) => {
  res.json(gameCharacters);
});

export default router;
