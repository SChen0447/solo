export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
  isKey: boolean;
}

export const ITEMS: Record<string, Item> = {
  key: {
    id: 'key',
    name: '古铜钥匙',
    icon: '🗝️',
    description: '刻有1847年份的古铜钥匙',
    isKey: true
  },
  paper: {
    id: 'paper',
    name: '半张纸片',
    icon: '📜',
    description: '写有罗马数字IV、VII、II的破旧纸片',
    isKey: true
  },
  charcoal: {
    id: 'charcoal',
    name: '发光木炭',
    icon: '🔥',
    description: '壁炉中取出的发光木炭，散发着微弱热量',
    isKey: true
  },
  book_red: {
    id: 'book_red',
    name: '红色典籍',
    icon: '📕',
    description: '记载着古老仪式的红色封皮书',
    isKey: false
  },
  hint: {
    id: 'hint',
    name: '密码提示',
    icon: '💡',
    description: '组合后的线索：钥匙年份末位+罗马数字换算→747',
    isKey: false
  },
  gear: {
    id: 'gear',
    name: '铜制齿轮',
    icon: '⚙️',
    description: '挂钟内部取出的精密齿轮',
    isKey: false
  }
};

export const COMBINATIONS: Array<{
  inputs: string[];
  output: string;
  consume: boolean;
}> = [
  {
    inputs: ['key', 'paper'],
    output: 'hint',
    consume: false
  }
];

export const KEY_ITEMS = ['key', 'paper', 'charcoal'];
export const CORRECT_PASSWORD = '747';

export const BLESSINGS = [
  '智慧之光照亮归途',
  '愿星辰指引你的前路',
  '古老的力量守护你的灵魂',
  '迷雾散去，真相显现',
  '愿勇气与你同在',
  '知识是打破诅咒的钥匙',
  '时光会奖励勇敢的探索者',
  '尘封的秘密终被揭开',
  '光明终将驱散黑暗',
  '你的名字将被载入史册'
];

export function combineItems(item1: string, item2: string): string | null {
  for (const combo of COMBINATIONS) {
    const sorted = [...combo.inputs].sort();
    const inputSorted = [item1, item2].sort();
    if (sorted[0] === inputSorted[0] && sorted[1] === inputSorted[1]) {
      return combo.output;
    }
  }
  return null;
}

export function validatePassword(input: string): boolean {
  return input === CORRECT_PASSWORD;
}

export function getRandomBlessing(): string {
  return BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
}
