export interface StoryChapterData {
  id: number;
  title: string;
  description: string;
  backgroundImage: string;
  extendedContent: string;
  extendedImage: string;
  animationType: 'fade-up' | 'fade-in' | 'scale-in';
  animationDuration: number;
}

export const storyChapters: StoryChapterData[] = [
  {
    id: 1,
    title: '星辰之始',
    description: '在浩瀚无垠的宇宙深处，一颗新星正在孕育。无数尘埃与气体在引力的牵引下汇聚，酝酿着一场壮丽的诞生。',
    backgroundImage: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80',
    extendedContent: '恒星的诞生始于分子云的引力坍缩。当一团星际气体和尘埃在自身重力作用下开始收缩时，核心温度和压力逐渐升高。经过数千万年的演化，当核心温度达到一千万开尔文时，氢聚变反应被点燃，一颗恒星就此诞生。我们的太阳正是这样诞生于46亿年前的一片原始星云中，它的光和热孕育了地球上的生命。',
    extendedImage: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80',
    animationType: 'fade-up',
    animationDuration: 0.8,
  },
  {
    id: 2,
    title: '银河漫游',
    description: '穿越千亿星辰的海洋，我们的太阳系在银河系的猎户臂上缓缓航行，每一圈需要两亿三千万年。',
    backgroundImage: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1920&q=80',
    extendedContent: '银河系是一个包含约2000亿颗恒星的棒旋星系，直径约10万光年。我们的太阳系位于距离银河系中心约2.6万光年的猎户座旋臂上。太阳以每秒约220公里的速度绕银心公转，完成一周需要约2.3亿年，这个周期被称为一个宇宙年。自太阳诞生以来，我们已经绕银心转了约20圈。',
    extendedImage: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800&q=80',
    animationType: 'fade-in',
    animationDuration: 0.8,
  },
  {
    id: 3,
    title: '生命之蓝',
    description: '在宇宙的某个角落，一颗蓝色的星球在太阳的温暖照耀下，孕育出了宇宙中最奇妙的事物——生命。',
    backgroundImage: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=1920&q=80',
    extendedContent: '地球是太阳系中唯一已知存在生命的行星。它位于宜居带内，拥有液态水、适宜的大气层和稳定的磁场。约38亿年前，地球上首次出现了单细胞生命；经过漫长的演化，在约5.4亿年前的寒武纪生命大爆发中，复杂多细胞生物大量涌现。人类的出现只是地球生命史中极其短暂的一瞬，但我们已经开始探索这片浩瀚的宇宙。',
    extendedImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    animationType: 'scale-in',
    animationDuration: 0.8,
  },
  {
    id: 4,
    title: '时空涟漪',
    description: '引力波像水波一样在时空中荡漾，携带着黑洞碰撞、中子星合并的宇宙低语，穿越亿万年时光来到我们面前。',
    backgroundImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
    extendedContent: '引力波是爱因斯坦广义相对论预言的时空涟漪。2015年9月14日，LIGO探测器首次直接探测到引力波，信号来自两个约30倍太阳质量的黑洞合并。这一发现开启了引力波天文学的新纪元，让我们能够用全新的方式观测宇宙。此后，科学家又探测到了中子星合并产生的引力波，甚至伴随有电磁辐射，被称为"多信使天文学"。',
    extendedImage: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80',
    animationType: 'fade-up',
    animationDuration: 0.8,
  },
  {
    id: 5,
    title: '未知之境',
    description: '在可观测宇宙的边缘之外，还有什么？暗物质、暗能量、平行宇宙——宇宙的终极奥秘，正等待着下一代探索者去揭开。',
    backgroundImage: 'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=1920&q=80',
    extendedContent: '可观测宇宙的直径约为930亿光年，但这只是宇宙的一部分。我们对宇宙的理解仍有巨大空白：暗物质占宇宙质能总量的27%，但我们不知道它是什么；暗能量占68%，它正在加速宇宙的膨胀，但其本质仍是谜。弦理论、多重宇宙假说、量子引力——这些前沿理论或许能帮助我们揭开宇宙最深层的奥秘。人类的探索之旅才刚刚开始。',
    extendedImage: 'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=800&q=80',
    animationType: 'fade-in',
    animationDuration: 0.8,
  },
];
