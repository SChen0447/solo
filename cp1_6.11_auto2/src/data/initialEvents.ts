export interface HistoricalEvent {
  id: string;
  date: number;
  title: string;
  description: string;
  imageUrl: string;
  era: string;
  isCustom?: boolean;
}

export const eraColors: Record<string, string> = {
  'ancient-egypt': '#D4AF37',
  'ancient-greece': '#4A90D9',
  'ancient-rome': '#C0392B',
  'medieval': '#8E44AD',
  'renaissance': '#27AE60',
  'early-modern': '#E67E22',
  'modern': '#16A085',
  'custom': '#E74C3C',
};

export const eraNames: Record<string, string> = {
  'ancient-egypt': '古埃及',
  'ancient-greece': '古希腊',
  'ancient-rome': '古罗马',
  'medieval': '中世纪',
  'renaissance': '文艺复兴',
  'early-modern': '近代',
  'modern': '现代',
  'custom': '自定义',
};

export const initialEvents: HistoricalEvent[] = [
  {
    id: 'evt-001',
    date: -2560,
    title: '吉萨大金字塔建成',
    description: '古埃及第四王朝时期，吉萨大金字塔在法老胡夫的命令下建成。它是古代世界七大奇迹中唯一保存至今的建筑，高达146.5米，由约230万块石灰岩砌成，是古埃及文明最辉煌的象征。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/800px-Kheops-Pyramid.jpg',
    era: 'ancient-egypt',
  },
  {
    id: 'evt-002',
    date: -776,
    title: '第一届古代奥林匹克运动会',
    description: '第一届古代奥林匹克运动会在希腊奥林匹亚举行，以纪念众神之王宙斯。运动会每四年举办一次，包括赛跑、摔跤、拳击等项目，是古希腊城邦之间文化交流与和平的重要象征。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Olympia_stadium.jpg/800px-Olympia_stadium.jpg',
    era: 'ancient-greece',
  },
  {
    id: 'evt-003',
    date: -509,
    title: '罗马共和国建立',
    description: '罗马人推翻了最后一位国王的统治，建立了罗马共和国。共和国实行元老院、执政官和公民大会三权分立的政治体制，为罗马后来的扩张奠定了政治基础。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Forum_romanum.jpg/800px-Forum_romanum.jpg',
    era: 'ancient-rome',
  },
  {
    id: 'evt-004',
    date: -27,
    title: '罗马帝国建立',
    description: '屋大维获得元老院授予"奥古斯都"称号，成为罗马第一位皇帝，标志着罗马共和国的结束和罗马帝国的开始。罗马帝国在其鼎盛时期控制了整个地中海地区，成为古代世界最强大的国家。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Augustus_Prima_Porta.jpg/500px-Augustus_Prima_Porta.jpg',
    era: 'ancient-rome',
  },
  {
    id: 'evt-005',
    date: 476,
    title: '西罗马帝国灭亡',
    description: '日耳曼雇佣军首领奥多亚克废黜了最后一位西罗马皇帝罗慕路斯·奥古斯都，标志着西罗马帝国的正式终结和欧洲古典时代的结束，开启了长达近千年的中世纪时期。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/The_Sack_of_Rome_by_the_Visigoths_on_24_August_410.jpg/800px-The_Sack_of_Rome_by_the_Visigoths_on_24_August_410.jpg',
    era: 'medieval',
  },
  {
    id: 'evt-006',
    date: 1096,
    title: '第一次十字军东征',
    description: '在教皇乌尔班二世的号召下，西欧基督教国家发起了第一次十字军东征，目标是收复圣地耶路撒冷。这场运动持续近两个世纪，深刻改变了欧洲与中东的政治、经济和文化格局。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Captureofjerusalem.jpg/800px-Captureofjerusalem.jpg',
    era: 'medieval',
  },
  {
    id: 'evt-007',
    date: 1440,
    title: '古腾堡活字印刷术发明',
    description: '德国人约翰内斯·古腾堡发明了金属活字印刷术，使得书籍的大规模生产成为可能。这项发明极大地推动了知识的传播，加速了文艺复兴、宗教改革和科学革命的到来。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Gutenberg_press.jpg/800px-Gutenberg_press.jpg',
    era: 'renaissance',
  },
  {
    id: 'evt-008',
    date: 1492,
    title: '哥伦布发现新大陆',
    description: '意大利航海家克里斯托弗·哥伦布在西班牙王室的资助下横渡大西洋，到达了美洲大陆。这次航行开启了大航海时代，彻底改变了世界的格局，也开启了欧洲对美洲的殖民历史。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Columbus_Landing_on_Hispaniola.jpg/800px-Columbus_Landing_on_Hispaniola.jpg',
    era: 'renaissance',
  },
  {
    id: 'evt-009',
    date: 1687,
    title: '牛顿发表《自然哲学的数学原理》',
    description: '英国科学家艾萨克·牛顿发表了划时代的著作《自然哲学的数学原理》，系统阐述了万有引力定律和三大运动定律。这部著作奠定了经典力学的基础，被认为是科学革命的巅峰之作。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/GodfreyKneller-IsaacNewton-1689.jpg/500px-GodfreyKneller-IsaacNewton-1689.jpg',
    era: 'early-modern',
  },
  {
    id: 'evt-010',
    date: 1776,
    title: '美国独立宣言签署',
    description: '在费城召开的大陆会议上，托马斯·杰斐逊起草的《独立宣言》获得通过，宣告北美十三个殖民地脱离英国独立。宣言提出了"人人生而平等"的理念，深刻影响了此后的世界民主进程。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Declaration_independence.jpg/800px-Declaration_independence.jpg',
    era: 'early-modern',
  },
  {
    id: 'evt-011',
    date: 1789,
    title: '法国大革命爆发',
    description: '巴黎民众攻占巴士底狱，标志着法国大革命的正式爆发。这场革命推翻了波旁王朝的封建统治，传播了自由、平等、博爱的思想，对整个欧洲乃至世界的政治发展产生了深远影响。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Prise_de_la_Bastille.jpg/800px-Prise_de_la_Bastille.jpg',
    era: 'early-modern',
  },
  {
    id: 'evt-012',
    date: 1903,
    title: '莱特兄弟首飞成功',
    description: '威尔伯和奥维尔·莱特兄弟在美国北卡罗来纳州基蒂霍克成功完成了人类历史上首次动力飞行。虽然首次飞行仅持续12秒、飞行36米，但它开启了人类航空时代的大门。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/First_flight2.jpg/800px-First_flight2.jpg',
    era: 'modern',
  },
  {
    id: 'evt-013',
    date: 1945,
    title: '第二次世界大战结束',
    description: '随着日本在密苏里号战列舰上签署投降书，持续六年的第二次世界大战正式结束。这场战争造成了约7000万人死亡，彻底改变了世界政治格局，也催生了联合国等国际组织。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Missouri_surrender.jpg/800px-Missouri_surrender.jpg',
    era: 'modern',
  },
  {
    id: 'evt-014',
    date: 1969,
    title: '阿波罗11号登月成功',
    description: '美国宇航员尼尔·阿姆斯特朗成为第一个踏上月球表面的人类，他说出了那句著名的话："这是个人的一小步，却是人类的一大步。"阿波罗计划是人类太空探索史上最伟大的成就之一。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Neil_Armstrong_pose.jpg/500px-Neil_Armstrong_pose.jpg',
    era: 'modern',
  },
  {
    id: 'evt-015',
    date: 1991,
    title: '万维网诞生',
    description: '英国物理学家蒂姆·伯纳斯-李在欧洲核子研究中心发明了万维网（World Wide Web）。这项发明彻底改变了人类获取和分享信息的方式，开启了信息时代的新篇章。',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Tim_Berners-Lee_-_TED.jpg/500px-Tim_Berners-Lee_-_TED.jpg',
    era: 'modern',
  },
];
