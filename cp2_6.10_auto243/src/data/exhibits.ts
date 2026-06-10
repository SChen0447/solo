export interface CreationStage {
  id: string
  title: string
  date: string
  description: string
}

export interface Exhibit {
  id: string
  title: string
  artist: string
  year: number
  technique: string
  description: string
  thumbnail: string
  hdImages: string[]
  stages: CreationStage[]
  audioGuideText: string
  isCollected: boolean
}

export const exhibits: Exhibit[] = [
  {
    id: 'ex-001',
    title: '像素之海',
    artist: '林川',
    year: 2024,
    technique: '生成艺术 · Processing',
    description:
      '一件通过算法生成的数字海景作品，每一次渲染都会产生独一的波浪纹理。作品探讨机器随机性与自然韵律之间的共鸣。',
    thumbnail:
      'https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&q=80',
    hdImages: [
      'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1600&q=90',
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600&q=90',
    ],
    stages: [
      {
        id: 's1',
        title: '构思',
        date: '2024.01',
        description: '在沿海城市的旅行中记录海浪数据，萌生以算法复现自然波动的想法。',
      },
      {
        id: 's2',
        title: '草图',
        date: '2024.02',
        description: '使用手绘与 Processing 原型，研究正弦波叠加与噪声函数的视觉效果。',
      },
      {
        id: 's3',
        title: '制作',
        date: '2024.04',
        description: '编写粒子系统与着色器，逐帧调试颜色渐变与透明度叠加。',
      },
      {
        id: 's4',
        title: '完成',
        date: '2024.06',
        description: '在 4K 屏幕上完成最终输出，导出可供展览无限循环的影像版本。',
      },
    ],
    audioGuideText:
      '欢迎欣赏《像素之海》。艺术家林川在 2024 年创作了这件生成艺术作品。他用算法记录了真实海洋的波动，将自然的随机性转译为屏幕上的光影。请靠近屏幕，观察每一道波浪都不相同，就像我们站在海边所看到的那样。',
    isCollected: false,
  },
  {
    id: 'ex-002',
    title: '静帧回声',
    artist: 'Aria Moreno',
    year: 2023,
    technique: '3D 渲染 · Blender',
    description:
      '以废弃工业空间为原型的三维超现实场景，用光线追踪技术营造静默与时间停滞的氛围。',
    thumbnail:
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80',
    hdImages: [
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&q=90',
      'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1600&q=90',
    ],
    stages: [
      {
        id: 's1',
        title: '调研',
        date: '2023.02',
        description: '探访城市废弃工厂，拍摄数百张材质纹理与结构参考照片。',
      },
      {
        id: 's2',
        title: '建模',
        date: '2023.03',
        description: '在 Blender 中搭建梁柱、管道与破碎玻璃窗，重建空间尺度。',
      },
      {
        id: 's3',
        title: '材质',
        date: '2023.04',
        description: '制作灰尘、锈蚀与水渍程序化纹理，赋予场景时间的痕迹。',
      },
      {
        id: 's4',
        title: '打光',
        date: '2023.05',
        description: '设置单束体积光，模拟穿过破窗的清晨阳光。',
      },
      {
        id: 's5',
        title: '完成',
        date: '2023.06',
        description: '输出 8K 静帧与环绕视角的缓慢镜头影像。',
      },
    ],
    audioGuideText:
      '您现在看到的是 Aria Moreno 的作品《静帧回声》。这是一件完全在计算机中搭建的三维场景，却源于艺术家真实探访过的废弃工厂。每一颗粒尘、每一道锈迹，都由她亲手塑造。请留意，唯一的一束光从窗口斜斜洒入——这正是作品标题中「回声」的来源。',
    isCollected: false,
  },
  {
    id: 'ex-003',
    title: '霓虹图腾',
    artist: '陈九',
    year: 2024,
    technique: 'AI 协作 · Midjourney + 手绘合成',
    description:
      '结合 AI 生成图像与数字手绘重绘的东方赛博系列，探索传统符号在未来都会中的视觉转译。',
    thumbnail:
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&q=80',
    hdImages: [
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&q=90',
      'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=1600&q=90',
    ],
    stages: [
      {
        id: 's1',
        title: '符号提取',
        date: '2024.02',
        description: '从云纹、龙鳞与篆印中抽取基础图形，建立视觉符号库。',
      },
      {
        id: 's2',
        title: 'AI 扩散',
        date: '2024.03',
        description: '使用关键词引导图像生成，获得上百张变体作为素材。',
      },
      {
        id: 's3',
        title: '手绘重绘',
        date: '2024.04',
        description: '在数位板上重新勾勒轮廓，清理 AI 生成的结构瑕疵。',
      },
      {
        id: 's4',
        title: '合成',
        date: '2024.05',
        description: '多层叠加霓虹光效、颗粒与色差，统一整体色调。',
      },
    ],
    audioGuideText:
      '《霓虹图腾》是陈九与人工智能共同完成的作品。艺术家先从东方传统符号中提取素材，再交给图像模型产生无数变体，最后由他一笔一笔重新绘制。您看到的每一道霓虹，都经过人工精修。这不再是纯 AI 图像，而是一场人与算法共舞的结果。',
    isCollected: false,
  },
  {
    id: 'ex-004',
    title: '数据花园',
    artist: 'Mira Klein',
    year: 2022,
    technique: '实时可视化 · TouchDesigner',
    description:
      '将展厅内观众的移动速度、环境音量与温度数据实时转化为不断生长的抽象植物形态。',
    thumbnail:
      'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&q=80',
    hdImages: [
      'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1600&q=90',
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1600&q=90',
    ],
    stages: [
      {
        id: 's1',
        title: '方案',
        date: '2022.01',
        description: '确定以观众行为驱动视觉生长的互动框架。',
      },
      {
        id: 's2',
        title: '传感器',
        date: '2022.02',
        description: '部署摄像头、麦克风与温度传感器，编写数据抓取模块。',
      },
      {
        id: 's3',
        title: '生长算法',
        date: '2022.03',
        description: '基于 L-System 实现分形植物，参数映射到实时数据流。',
      },
      {
        id: 's4',
        title: '调试',
        date: '2022.04',
        description: '在展厅实际环境中调整数据阈值，保证观感稳定。',
      },
      {
        id: 's5',
        title: '完成',
        date: '2022.05',
        description: '投入展览运行，并记录不同时段观众产生的花园形态。',
      },
    ],
    audioGuideText:
      '欢迎来到《数据花园》。这件作品没有固定画面——您的走动速度、说话声、甚至房间里的温度，都在让这些数字植物不断生长变化。每一位观众都是园丁。下次您再来，它会长出完全不同的样子。',
    isCollected: false,
  },
  {
    id: 'ex-005',
    title: '记忆褶皱',
    artist: '周行',
    year: 2024,
    technique: '影像拼贴 · Premiere + After Effects',
    description:
      '由家庭旧 VHS 录像、手机短视频与公开影像素材拼贴而成的双屏影像作品，讲述时间如何在记忆里折叠。',
    thumbnail:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80',
    hdImages: [
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&q=90',
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1600&q=90',
    ],
    stages: [
      {
        id: 's1',
        title: '素材收集',
        date: '2024.01',
        description: '从家族成员处征得三十余小时家庭录像与照片。',
      },
      {
        id: 's2',
        title: '转数字化',
        date: '2024.02',
        description: '将 VHS 磁带与胶片扫描为 4K 数字文件，保留雪花与划痕。',
      },
      {
        id: 's3',
        title: '剪辑',
        date: '2024.03',
        description: '以相似运动、相近色彩为线索进行跨时空剪辑。',
      },
      {
        id: 's4',
        title: '双屏合成',
        date: '2024.04',
        description: '左右屏互为回声，形成叙事节奏的错位与呼应。',
      },
    ],
    audioGuideText:
      '《记忆褶皱》是艺术家周行用家族旧影像拼贴而成的双屏作品。请您留意左右两边画面——它们拍摄于不同年代，却总能在动作、光影与情绪上形成微妙的共鸣。这就是记忆的样子：它不是一条直线，而是在我们心中不断折叠的褶皱。',
    isCollected: false,
  },
  {
    id: 'ex-006',
    title: '无声对白',
    artist: 'Hiroshi Tanaka',
    year: 2023,
    technique: '交互式网页 · Three.js',
    description:
      '观众可通过鼠标拖拽与两个虚拟人物进行互动，他们会以肢体动作做出回应，却永远不会真正相遇。',
    thumbnail:
      'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=600&q=80',
    hdImages: [
      'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1600&q=90',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&q=90',
    ],
    stages: [
      {
        id: 's1',
        title: '人设',
        date: '2023.03',
        description: '为两个角色编写不同的行为逻辑与情绪参数。',
      },
      {
        id: 's2',
        title: '动作捕捉',
        date: '2023.04',
        description: '录制日常动作片段，作为角色动画库。',
      },
      {
        id: 's3',
        title: '物理模拟',
        date: '2023.05',
        description: '在 Three.js 中实现布料、头发与距离场交互效果。',
      },
      {
        id: 's4',
        title: '界面设计',
        date: '2023.06',
        description: '极简界面，仅保留拖拽提示，避免打破沉浸感。',
      },
      {
        id: 's5',
        title: '完成',
        date: '2023.07',
        description: '部署为可在线访问的网页作品，兼容平板与桌面端。',
      },
    ],
    audioGuideText:
      '您正在体验 Hiroshi Tanaka 的网页作品《无声对白》。尝试用鼠标拖拽画面中的两个人物——他们会回头、会闪躲、会靠近，却永远无法真正触碰到对方。艺术家希望以这样一种安静的方式，讲述人与人之间既渴望靠近，又彼此独立的关系。',
    isCollected: false,
  },
  {
    id: 'ex-007',
    title: '字体考古',
    artist: '苏野',
    year: 2024,
    technique: '动态字体 · WebGL',
    description:
      '将甲骨文、隶书、宋体、黑体四种汉字风格以动态方式相互演变，呈现中文书写的四千年时间轴。',
    thumbnail:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    hdImages: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=90',
      'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1600&q=90',
    ],
    stages: [
      {
        id: 's1',
        title: '字形采集',
        date: '2024.01',
        description: '整理代表性甲骨、简牍、刻本与现代字体样本。',
      },
      {
        id: 's2',
        title: '矢量绘制',
        date: '2024.02',
        description: '为每个阶段手工重绘矢量轮廓，保证插值平滑。',
      },
      {
        id: 's3',
        title: '变形算法',
        date: '2024.03',
        description: '实现基于对应点匹配的字形渐变过渡效果。',
      },
      {
        id: 's4',
        title: '完成',
        date: '2024.04',
        description: '以 WebGL 渲染，在大型 LED 屏幕上循环播放。',
      },
    ],
    audioGuideText:
      '请欣赏苏野的《字体考古》。一个汉字，从四千年前的甲骨文，到我们今天屏幕上看到的黑体，走过了怎样的路？艺术家把四个时期的字形抽取出来，用平滑的动画让它们彼此演化。您现在看到的，是一部用眼睛阅读的汉字简史。',
    isCollected: false,
  },
]
