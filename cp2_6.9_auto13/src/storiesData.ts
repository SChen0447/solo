export type DecorType = 'circle-pulse' | 'line-grow' | 'particle-scatter'

export interface Story {
  id: number
  title: string
  subtitle: string
  description: string
  bgColor: string
  bgColorEnd: string
  decorType: DecorType
}

export const storiesData: Story[] = [
  {
    id: 1,
    title: '启程之光',
    subtitle: 'Chapter One · The Beginning',
    description: '在浩瀚的宇宙深处，一束微光穿越无尽的黑暗，带来了生命的火种。这是一个关于探索、勇气与希望的故事，每一个选择都将塑造未来的轨迹。让我们跟随这束光，开启这段奇妙的旅程。',
    bgColor: '#16213e',
    bgColorEnd: '#0f3460',
    decorType: 'circle-pulse'
  },
  {
    id: 2,
    title: '烈焰之心',
    subtitle: 'Chapter Two · The Fire Within',
    description: '当内心的火焰被点燃，没有任何寒冷能够将其熄灭。这团燃烧的热情，驱使着勇者跨越山川湖海，去追寻那遥不可及的梦想。在灰烬之中，新的力量正在悄然苏醒。',
    bgColor: '#e94560',
    bgColorEnd: '#ff6b6b',
    decorType: 'line-grow'
  },
  {
    id: 3,
    title: '森林低语',
    subtitle: 'Chapter Three · Whispers of Nature',
    description: '古老的森林藏着无数秘密，每一片树叶都在诉说着远古的传说。当风穿过林间，那些被遗忘的声音再次回响，指引着迷途的旅人找到归家的路。自然的智慧，永远值得我们敬畏。',
    bgColor: '#0f3460',
    bgColorEnd: '#1a5f4a',
    decorType: 'particle-scatter'
  },
  {
    id: 4,
    title: '金色黄昏',
    subtitle: 'Chapter Four · Golden Hour',
    description: '日落时分，天边染上了一层温暖的金色。在这短暂的魔法时刻里，世界仿佛静止了，所有的喧嚣都归于平静。这是一天中最温柔的时光，也是回忆最容易涌现的瞬间。',
    bgColor: '#f39c12',
    bgColorEnd: '#e67e22',
    decorType: 'circle-pulse'
  },
  {
    id: 5,
    title: '星河彼岸',
    subtitle: 'Chapter Five · Beyond the Stars',
    description: '在银河的尽头，存在着一个未知的世界。那里的星辰永不坠落，那里的梦想永不凋零。当我们仰望星空时，其实也是在寻找内心深处那个闪耀的自己。旅程永不结束。',
    bgColor: '#2c003e',
    bgColorEnd: '#512b58',
    decorType: 'particle-scatter'
  }
]
