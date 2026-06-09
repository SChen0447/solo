export interface Poem {
  title: string;
  author: string;
  text: string;
}

export const poems: Poem[] = [
  {
    title: '鹿柴',
    author: '王维',
    text: '空山不见人但闻人语响返景入深林复照青苔上'
  },
  {
    title: '静夜思',
    author: '李白',
    text: '床前明月光疑是地上霜举头望明月低头思故乡'
  },
  {
    title: '登鹳雀楼',
    author: '王之涣',
    text: '白日依山尽黄河入海流欲穷千里目更上一层楼'
  },
  {
    title: '春晓',
    author: '孟浩然',
    text: '春眠不觉晓处处闻啼鸟夜来风雨声花落知多少'
  },
  {
    title: '相思',
    author: '王维',
    text: '红豆生南国春来发几枝愿君多采撷此物最相思'
  }
];
