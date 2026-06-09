export type PlanetName = '太阳' | '月亮' | '水星' | '金星' | '火星';

export interface Planet {
  name: PlanetName;
  color: string;
  position: number;
}

export type AspectType = 'conjunction' | 'sextile' | 'opposition';

export interface Aspect {
  planet1: PlanetName;
  planet2: PlanetName;
  angle: number;
  type: AspectType;
  typeName: string;
}

export interface PredictionResult {
  text: string;
  harmonyScore: number;
  fateLevel: 'harmony' | 'neutral' | 'tense' | 'ominous';
  fateColor: string;
  constellationName: string;
  constellationCount: number;
  timestamp: number;
}

const PREDICTION_TEMPLATES = [
  '{p1}与{p2}呈{aspect}，预示着一段充满{adj}的{event}即将开启，但需留意{constellation}的阴影影响。',
  '星空中{constellation}光芒闪耀，{p1}与{p2}形成{aspect}，这暗示你在{domain}上将迎来{adj}的转机。',
  '{p1}与{p2}之间的{aspect}正在汇聚能量，配合{constellation}的加持，{event}将以{adj}的方式展开。',
  '古老的{constellation}低语着命运的走向，{p1}和{p2}的{aspect}揭示了{adj}的{event}即将降临。',
  '当{constellation}高悬天际，{p1}与{p2}的{aspect}带来{adj}的启示，{domain}领域将发生重大变化。',
  '{p1}受{constellation}照耀，与{p2}形成{aspect}，你需要为即将到来的{adj}{event}做好准备。',
  '{constellation}的星轨指向{domain}，{p1}和{p2}的{aspect}预示着一段{adj}的旅程即将开始。',
  '星光指引：{p1}与{p2}在{constellation}的庇护下呈{aspect}，{adj}的{event}将改变你的命运走向。',
  '{p1}的能量在{constellation}中觉醒，与{p2}的{aspect}制造了{adj}的契机，切勿错过{domain}上的机遇。',
  '今夜{constellation}格外明亮，{p1}与{p2}的{aspect}交织出{adj}的命运之网，{event}即将上演。',
  '神秘的{constellation}庇护着你，{p1}和{p2}的{aspect}表明{adj}的时刻已近，关注{domain}的变化。',
  '{p1}与{p2}以{aspect}相连，在{constellation}的影响下，{domain}将展现{adj}的面貌。',
  '{constellation}的能量正在流动，{p1}和{p2}的{aspect}将{adj}的{event}推入你的生命轨迹。',
  '当{p1}与{p2}形成{aspect}，{constellation}的古老力量被唤醒，{adj}的变化将波及{domain}。',
  '星盘显示{constellation}处于关键位置，{p1}与{p2}的{aspect}预示{adj}的{event}迫在眉睫。',
  '{p1}与{p2}的{aspect}在{constellation}的星光下熠熠生辉，{domain}将迎来{adj}的新篇章。',
  '透过{constellation}的迷雾，{p1}和{p2}的{aspect}显露出{adj}的预兆，{event}将如期而至。',
  '古老的占星典籍记载，当{constellation}现世、{p1}与{p2}呈{aspect}时，{adj}的{event}必将发生。',
  '{p1}与{p2}在{constellation}领域形成{aspect}，这是{adj}的征兆，留意{domain}中的微妙信号。',
  '命运的齿轮开始转动：{constellation}主导今夜星盘，{p1}和{p2}的{aspect}带来{adj}的消息。',
  '{p1}的光辉与{p2}的{aspect}在{constellation}中交汇，{adj}的{event}正在悄然酝酿。',
  '星象异动，{constellation}与{p1}、{p2}的{aspect}共同指向{domain}的{adj}转变。',
  '{constellation}的传说正在应验，{p1}与{p2}的{aspect}确认了{adj}{event}的到来。',
  '深邃的夜空中，{constellation}注视着一切，{p1}和{p2}的{aspect}承诺了{adj}的未来。',
  '解读{constellation}的密语：{p1}与{p2}的{aspect}意味着{domain}将出现{adj}的机遇。',
  '当{p1}与{p2}以{aspect}共鸣，{constellation}释放出古老的力量，{adj}的{event}近在咫尺。',
  '{constellation}的星辰排成神秘阵列，{p1}和{p2}的{aspect}昭示{adj}的{event}即将显现。',
  '今夜星盘的关键在于{constellation}，{p1}与{p2}的{aspect}暗示{domain}将经历{adj}的洗礼。',
  '{p1}与{p2}之间的{aspect}被{constellation}放大，{adj}的能量将注入你的{event}之中。',
  '命运之星闪耀：{constellation}下的{p1}与{p2}呈{aspect}，{adj}的{event}将由你亲手开启。',
  '被遗忘的占星术揭示：当{constellation}活跃、{p1}和{p2}成{aspect}时，{domain}迎来{adj}的时代。',
  '{p1}与{p2}的{aspect}在{constellation}的怀抱中诞生，{adj}的命运之轮已开始转动，{event}在所难免。'
];

const ADJECTIVES_HARMONY = ['和谐', '美好', '顺利', '繁荣', '喜悦', '充满希望', '光明', '丰饶'];
const ADJECTIVES_NEUTRAL = ['平稳', '平淡', '微妙', '渐进', '温和', '稳定', '沉静', '内敛'];
const ADJECTIVES_TENSE = ['紧张', '曲折', '波折', '动荡', '起伏', '激烈', '躁动', '变幻'];
const ADJECTIVES_OMINOUS = ['凶险', '阴暗', '艰难', '混乱', '破碎', '不祥', '沉重', '危机四伏'];

const EVENTS_HARMONY = ['相遇', '机遇', '成就', '庆典', '丰收', '联盟', '胜利', '祝福'];
const EVENTS_NEUTRAL = ['变化', '转折', '旅程', '探索', '发现', '选择', '成长', '思考'];
const EVENTS_TENSE = ['考验', '挑战', '冲突', '分歧', '角逐', '博弈', '较量', '波折'];
const EVENTS_OMINOUS = ['变故', '危机', '分离', '背叛', '灾祸', '陷阱', '损失', '末日'];

const DOMAINS = ['事业', '爱情', '财富', '健康', '家庭', '友情', '学业', '旅行', '创作', '内心'];

export class PredictionEngine {
  private planets: Planet[] = [
    { name: '太阳', color: '#FFD700', position: 0.5 },
    { name: '月亮', color: '#C0C0C0', position: 0.3 },
    { name: '水星', color: '#4FC3F7', position: 0.7 },
    { name: '金星', color: '#F48FB1', position: 0.2 },
    { name: '火星', color: '#E57373', position: 0.8 }
  ];

  private lastPlanetUpdate: number = 0;
  private planetInterval: number = 10000;

  public getPlanets(): Planet[] {
    return this.planets;
  }

  public setPlanetInterval(seconds: number): void {
    this.planetInterval = seconds * 1000;
  }

  public update(time: number): boolean {
    if (time - this.lastPlanetUpdate > this.planetInterval) {
      this.randomizePlanetPositions();
      this.lastPlanetUpdate = time;
      return true;
    }
    return false;
  }

  public randomizePlanetPositions(): void {
    for (const planet of this.planets) {
      planet.position = Math.random();
    }
  }

  public setPlanetPosition(name: PlanetName, position: number): void {
    const planet = this.planets.find(p => p.name === name);
    if (planet) {
      planet.position = Math.max(0, Math.min(1, position));
    }
  }

  public calculateAspects(): Aspect[] {
    const aspects: Aspect[] = [];
    for (let i = 0; i < this.planets.length; i++) {
      for (let j = i + 1; j < this.planets.length; j++) {
        const p1 = this.planets[i];
        const p2 = this.planets[j];
        const rawAngle = Math.abs(p1.position - p2.position) * 360;
        const angle = Math.min(rawAngle, 360 - rawAngle);
        let type: AspectType;
        let typeName: string;
        if (angle <= 60) {
          type = 'conjunction';
          typeName = '合相';
        } else if (angle <= 120) {
          type = 'sextile';
          typeName = '六分相';
        } else {
          type = 'opposition';
          typeName = '对冲相';
        }
        aspects.push({
          planet1: p1.name,
          planet2: p2.name,
          angle,
          type,
          typeName
        });
      }
    }
    return aspects;
  }

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private getAspectWeight(type: AspectType): number {
    switch (type) {
      case 'conjunction': return 1.5;
      case 'sextile': return 1.0;
      case 'opposition': return -1.5;
    }
  }

  public calculateHarmonyScore(aspects: Aspect[], constellationCount: number): number {
    let totalWeight = 0;
    for (const aspect of aspects) {
      totalWeight += this.getAspectWeight(aspect.type);
    }
    const avgWeight = totalWeight / aspects.length;
    const normalizedScore = ((avgWeight + 1.5) / 3) * 100;
    const constellationBonus = Math.min(constellationCount * 2, 10);
    let finalScore = normalizedScore + constellationBonus - 10;
    finalScore = Math.max(0, Math.min(100, finalScore));
    return Math.round(finalScore);
  }

  public getFateLevel(score: number): { level: PredictionResult['fateLevel']; color: string } {
    if (score >= 75) {
      return { level: 'harmony', color: '#22C55E' };
    } else if (score >= 50) {
      return { level: 'neutral', color: '#EAB308' };
    } else if (score >= 25) {
      return { level: 'tense', color: '#F97316' };
    } else {
      return { level: 'ominous', color: '#EF4444' };
    }
  }

  public generatePrediction(aspects: Aspect[], constellationName: string, _constellationCount: number, harmonyScore: number): string {
    const template = this.pickRandom(PREDICTION_TEMPLATES);
    const sortedAspects = [...aspects].sort((a, b) => {
      const weightDiff = this.getAspectWeight(b.type) - this.getAspectWeight(a.type);
      return weightDiff !== 0 ? weightDiff : b.angle - a.angle;
    });
    const mainAspect = sortedAspects[0];
    const fateLevel = this.getFateLevel(harmonyScore).level;

    let adjectives: string[];
    let events: string[];
    switch (fateLevel) {
      case 'harmony':
        adjectives = ADJECTIVES_HARMONY;
        events = EVENTS_HARMONY;
        break;
      case 'neutral':
        adjectives = ADJECTIVES_NEUTRAL;
        events = EVENTS_NEUTRAL;
        break;
      case 'tense':
        adjectives = ADJECTIVES_TENSE;
        events = EVENTS_TENSE;
        break;
      case 'ominous':
        adjectives = ADJECTIVES_OMINOUS;
        events = EVENTS_OMINOUS;
        break;
    }

    return template
      .replace('{p1}', mainAspect.planet1)
      .replace('{p2}', mainAspect.planet2)
      .replace('{aspect}', mainAspect.typeName)
      .replace('{constellation}', constellationName)
      .replace('{adj}', this.pickRandom(adjectives))
      .replace('{event}', this.pickRandom(events))
      .replace('{domain}', this.pickRandom(DOMAINS));
  }

  public performDivination(constellationName: string, constellationCount: number): PredictionResult {
    const aspects = this.calculateAspects();
    const harmonyScore = this.calculateHarmonyScore(aspects, constellationCount);
    const { level, color } = this.getFateLevel(harmonyScore);
    const text = this.generatePrediction(aspects, constellationName, constellationCount, harmonyScore);

    return {
      text,
      harmonyScore,
      fateLevel: level,
      fateColor: color,
      constellationName,
      constellationCount,
      timestamp: Date.now()
    };
  }

  public reset(): void {
    this.lastPlanetUpdate = performance.now();
    this.randomizePlanetPositions();
  }
}
