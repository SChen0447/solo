import { v4 as uuidv4 } from 'uuid';
import { Card, Element, ArcanaType } from './types';

const MAJOR_ARCANA_NAMES = [
  { name: '愚者', symbol: '☉', energy: 5, description: '新的开始，无限可能。代表太阳的原始能量，赐予无畏的勇气。' },
  { name: '魔术师', symbol: '☿', energy: 4, description: '意志与创造力的象征。水星的使者，掌控元素的转化。' },
  { name: '女祭司', symbol: '☾', energy: 3, description: '直觉与神秘的力量。月亮的守护，揭示隐藏的真相。' },
  { name: '皇后', symbol: '♀', energy: 5, description: '丰饶与母性的化身。金星的光辉，孕育生命与美。' },
  { name: '皇帝', symbol: '♂', energy: 5, description: '权威与秩序的象征。火星的意志，奠定稳固的基石。' },
  { name: '教皇', symbol: '♃', energy: 4, description: '智慧与信仰的指引。木星的恩泽，传播神圣的真理。' },
  { name: '恋人', symbol: '♀', energy: 3, description: '爱与选择的交汇。金星的魅力，联结两颗心灵。' },
  { name: '战车', symbol: '♂', energy: 5, description: '胜利与意志的凯旋。火星的驰骋，征服一切障碍。' },
  { name: '力量', symbol: '☉', energy: 4, description: '勇气与内在的力量。太阳的光芒，驯服心中的野兽。' },
  { name: '隐士', symbol: '♄', energy: 3, description: '智慧与内省的追寻。土星的沉淀，照亮孤独的道路。' },
  { name: '命运之轮', symbol: '♃', energy: 5, description: '命运的转折与循环。木星的运转，带来机遇与变革。' },
  { name: '正义', symbol: '♎', energy: 4, description: '平衡与公正的裁决。天秤座的权衡，维护宇宙的秩序。' },
  { name: '倒吊人', symbol: '♆', energy: 3, description: '牺牲与新的视角。海王星的启示，在等待中获得智慧。' },
  { name: '死神', symbol: '♏', energy: 5, description: '结束与重生的转化。天蝎座的深邃，带来彻底的蜕变。' },
  { name: '节制', symbol: '♐', energy: 4, description: '平衡与调和的艺术。射手座的智慧，融合对立的力量。' },
  { name: '恶魔', symbol: '♑', energy: 5, description: '束缚与诱惑的考验。摩羯座的诱惑，揭示内心的阴影。' },
  { name: '塔', symbol: '♂', energy: 5, description: '突变与觉醒的冲击。火星的霹雳，摧毁虚假的堡垒。' },
  { name: '星星', symbol: '♒', energy: 3, description: '希望与灵感的指引。水瓶座的星光，照亮黑夜的迷途。' },
  { name: '月亮', symbol: '☾', energy: 3, description: '幻觉与直觉的迷宫。月亮的迷雾，唤醒潜藏的恐惧。' },
  { name: '太阳', symbol: '☉', energy: 5, description: '光明与成功的喜悦。太阳的荣耀，散发生命的热情。' },
  { name: '审判', symbol: '♇', energy: 4, description: '觉醒与重生的召唤。冥王星的号角，唤醒沉睡的灵魂。' },
  { name: '世界', symbol: '♄', energy: 5, description: '完成与圆满的境界。土星的加冕，达成终极的整合。' },
];

const MINOR_ARCANA = {
  fire: {
    name: '权杖',
    symbol: '🔥',
    element: 'fire' as Element,
    descriptions: [
      '权杖首牌：创造的火花，点燃新的热情与行动。',
      '权杖二：远见与规划，眺望未来的方向。',
      '权杖三：探索与扩张，等待远航的归航。',
      '权杖四：稳定与庆祝，家园的和谐与欢乐。',
      '权杖五：竞争与冲突，在挑战中成长。',
      '权杖六：胜利与荣耀，凯旋的辉煌时刻。',
      '权杖七：勇气与防御，坚守自己的立场。',
      '权杖八：速度与行动，讯息的快速传递。',
      '权杖九：毅力与警觉，最后的防线。',
      '权杖十：责任与负担，承担重任的前行。',
      '权杖侍从：好奇与探索，火元素的使者。',
      '权杖骑士：热情与冲动，勇往直前的骑士。',
      '权杖王后：自信与魅力，火焰的女主人。',
      '权杖国王：领导力与远见，火元素的君王。',
    ],
  },
  water: {
    name: '圣杯',
    symbol: '💧',
    element: 'water' as Element,
    descriptions: [
      '圣杯首牌：情感的源泉，涌出爱与直觉。',
      '圣杯二：结合与和谐，两颗心的交融。',
      '圣杯三：友谊与庆祝，欢乐的相聚时光。',
      '圣杯四：沉思与厌倦，对现状的不满。',
      '圣杯五：失落与悲伤，面对失去的痛苦。',
      '圣杯六：回忆与童真，过去的美好时光。',
      '圣杯七：幻想与选择，梦境中的可能性。',
      '圣杯八：放弃与追寻，离开寻找更深的意义。',
      '圣杯九：满足与愿望，情感的丰盛与喜悦。',
      '圣杯十：圆满与幸福，家庭的和谐之美。',
      '圣杯侍从：敏感与直觉，水元素的使者。',
      '圣杯骑士：浪漫与追求，追寻理想的骑士。',
      '圣杯王后：慈悲与理解，水的女主人。',
      '圣杯国王：智慧与情感，水元素的君王。',
    ],
  },
  wind: {
    name: '宝剑',
    symbol: '🌬️',
    element: 'wind' as Element,
    descriptions: [
      '宝剑首牌：真理的利剑，划破迷雾的智慧。',
      '宝剑二：平衡与抉择，在两难中寻找平衡。',
      '宝剑三：悲伤与伤痛，心灵的创伤。',
      '宝剑四：休息与恢复，暂时的退却与沉思。',
      '宝剑五：冲突与失落，得不偿失的胜利。',
      '宝剑六：过渡与前行，穿越风暴的旅程。',
      '宝剑七：策略与谋算，智取的方式。',
      '宝剑八：束缚与限制，作茧自缚的困境。',
      '宝剑九：焦虑与恐惧，深夜的忧虑。',
      '宝剑十：终结与低谷，痛苦的尽头。',
      '宝剑侍从：警觉与好奇，风元素的使者。',
      '宝剑骑士：迅捷与冲动，风驰电掣的骑士。',
      '宝剑王后：清明与洞察，风的女主人。',
      '宝剑国王：权威与理性，风元素的君王。',
    ],
  },
  earth: {
    name: '星币',
    symbol: '🌿',
    element: 'earth' as Element,
    descriptions: [
      '星币首牌：物质的馈赠，财富与机会的种子。',
      '星币二：平衡与灵活，在变化中维持稳定。',
      '星币三：合作与技艺，团队的共同努力。',
      '星币四：稳固与占有，守护既有的财富。',
      '星币五：匮乏与困境，物质与精神的寒冬。',
      '星币六：施与受，慷慨与分享的平衡。',
      '星币七：耐心与等待，收获前的耕耘。',
      '星币八：技艺与专注，精益求精的追求。',
      '星币九：独立与丰盛，独自享受的成果。',
      '星币十：富足与传承，家族的繁荣。',
      '星币侍从：务实与学习，土元素的使者。',
      '星币骑士：稳健与可靠，脚踏实地的骑士。',
      '星币王后：富饶与关怀，大地的女主人。',
      '星币国王：财富与成功，土元素的君王。',
    ],
  },
};

const ELEMENT_ENERGY_VALUES = {
  fire: 3,
  water: 2,
  wind: 2,
  earth: 3,
};

export class CardDeck {
  private cards: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck(): void {
    this.cards = [];

    for (const major of MAJOR_ARCANA_NAMES) {
      this.cards.push({
        id: uuidv4(),
        name: major.name,
        element: 'major',
        energyValue: major.energy,
        arcanaType: 'major',
        effect: `大阿卡那：${major.name}`,
        description: major.description,
        symbol: major.symbol,
      });
    }

    const elements: Element[] = ['fire', 'water', 'wind', 'earth'];
    for (const element of elements) {
      const suite = MINOR_ARCANA[element as keyof typeof MINOR_ARCANA];
      for (let i = 0; i < 14; i++) {
        this.cards.push({
          id: uuidv4(),
          name: `${suite.name}${i + 1}`,
          element: element,
          energyValue: ELEMENT_ENERGY_VALUES[element as keyof typeof ELEMENT_ENERGY_VALUES],
          arcanaType: 'minor',
          effect: `${suite.name}牌组`,
          description: suite.descriptions[i],
          symbol: suite.symbol,
        });
      }
    }
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(): Card | null {
    if (this.cards.length === 0) {
      return null;
    }
    return this.cards.pop() || null;
  }

  drawMultiple(count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.draw();
      if (card) {
        drawn.push(card);
      }
    }
    return drawn;
  }

  getRemainingCount(): number {
    return this.cards.length;
  }

  reset(): void {
    this.initializeDeck();
    this.shuffle();
  }
}

export function useCardDeck() {
  const deck = new CardDeck();
  deck.shuffle();
  return deck;
}
