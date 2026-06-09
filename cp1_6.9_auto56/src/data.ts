export interface Civilization {
  id: string;
  name: string;
  color: string;
  startYear: number;
  endYear: number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface HistoricalEvent {
  id: string;
  title: string;
  year: number;
  lat: number;
  lng: number;
  description: string;
  imageUrl: string;
  civilizationId: string;
}

export interface CulturalWork {
  id: string;
  name: string;
  creator: string;
  year: number;
  century: number;
  category: 'literature' | 'architecture' | 'painting';
  description: string;
  civilizationId: string;
}

export interface YearSummary {
  year: number;
  summary: string;
}

const makePoly = (coords: number[][]): GeoJSON.Polygon => ({
  type: 'Polygon',
  coordinates: [coords]
});

export const civilizations: Civilization[] = [
  {
    id: 'song-china',
    name: '宋朝',
    color: '#C0392B',
    startYear: 960,
    endYear: 1279,
    geometry: makePoly([
      [100, 20], [105, 22], [110, 24], [115, 25], [120, 28], [122, 32], [120, 35],
      [118, 38], [114, 40], [110, 41], [106, 40], [102, 38], [100, 35], [98, 32],
      [97, 28], [98, 24], [100, 20]
    ])
  },
  {
    id: 'byzantine',
    name: '拜占庭帝国',
    color: '#8E44AD',
    startYear: 330,
    endYear: 1453,
    geometry: makePoly([
      [22, 36], [25, 35], [28, 36], [30, 38], [32, 40], [34, 41], [36, 41], [38, 40],
      [40, 38], [40, 36], [38, 35], [34, 34], [30, 34], [26, 35], [22, 36]
    ])
  },
  {
    id: 'abbasid',
    name: '阿拉伯帝国（阿拔斯）',
    color: '#27AE60',
    startYear: 750,
    endYear: 1258,
    geometry: makePoly([
      [40, 20], [45, 22], [50, 24], [55, 26], [60, 28], [65, 30], [68, 32], [66, 35],
      [62, 36], [58, 37], [54, 37], [50, 36], [46, 34], [42, 32], [40, 30], [38, 27],
      [38, 24], [40, 20]
    ])
  },
  {
    id: 'holy-roman',
    name: '神圣罗马帝国',
    color: '#F39C12',
    startYear: 962,
    endYear: 1806,
    geometry: makePoly([
      [5, 45], [7, 47], [9, 49], [11, 51], [13, 53], [15, 54], [17, 54], [19, 53],
      [20, 51], [20, 49], [19, 47], [17, 46], [14, 45], [11, 45], [8, 45], [5, 45]
    ])
  },
  {
    id: 'khmer',
    name: '高棉帝国',
    color: '#E67E22',
    startYear: 802,
    endYear: 1431,
    geometry: makePoly([
      [102, 10], [104, 11], [106, 13], [108, 14], [109, 16], [108, 18], [106, 19],
      [104, 18], [102, 17], [101, 15], [101, 13], [102, 10]
    ])
  },
  {
    id: 'tang-china',
    name: '唐朝',
    color: '#E74C3C',
    startYear: 618,
    endYear: 907,
    geometry: makePoly([
      [95, 22], [100, 24], [105, 26], [110, 28], [115, 30], [120, 33], [123, 37],
      [122, 40], [118, 42], [113, 43], [108, 43], [103, 42], [98, 40], [94, 37],
      [92, 33], [92, 28], [95, 22]
    ])
  },
  {
    id: 'roman-empire',
    name: '罗马帝国',
    color: '#9B59B6',
    startYear: -27,
    endYear: 476,
    geometry: makePoly([
      [-10, 35], [-6, 37], [-2, 40], [2, 42], [5, 44], [8, 46], [12, 48], [15, 49],
      [18, 48], [22, 46], [26, 44], [30, 42], [34, 40], [38, 38], [40, 36], [38, 33],
      [34, 32], [30, 31], [26, 32], [22, 34], [18, 36], [14, 37], [10, 37], [6, 36],
      [2, 36], [-2, 36], [-6, 35], [-10, 35]
    ])
  },
  {
    id: 'han-china',
    name: '汉朝',
    color: '#D35400',
    startYear: -202,
    endYear: 220,
    geometry: makePoly([
      [100, 22], [103, 24], [106, 26], [110, 28], [114, 30], [118, 33], [120, 36],
      [118, 39], [114, 41], [110, 42], [106, 41], [102, 39], [98, 36], [96, 33],
      [96, 29], [98, 25], [100, 22]
    ])
  },
  {
    id: 'mongol',
    name: '蒙古帝国',
    color: '#2980B9',
    startYear: 1206,
    endYear: 1368,
    geometry: makePoly([
      [80, 40], [85, 42], [90, 45], [95, 47], [100, 49], [105, 50], [110, 50],
      [115, 49], [120, 48], [125, 46], [130, 45], [135, 44], [138, 42], [135, 40],
      [130, 38], [125, 37], [120, 36], [115, 36], [110, 37], [105, 38], [100, 39],
      [95, 40], [90, 40], [85, 40], [80, 40]
    ])
  },
  {
    id: 'ming-china',
    name: '明朝',
    color: '#C0392B',
    startYear: 1368,
    endYear: 1644,
    geometry: makePoly([
      [98, 21], [102, 23], [106, 25], [110, 27], [115, 30], [120, 33], [123, 37],
      [125, 40], [123, 42], [119, 43], [114, 43], [109, 42], [104, 41], [100, 39],
      [97, 36], [95, 32], [95, 27], [98, 21]
    ])
  },
  {
    id: 'qing-china',
    name: '清朝',
    color: '#8B0000',
    startYear: 1644,
    endYear: 1912,
    geometry: makePoly([
      [90, 25], [95, 28], [100, 30], [105, 32], [110, 34], [115, 36], [120, 38],
      [125, 40], [130, 42], [132, 45], [130, 48], [125, 50], [120, 52], [115, 53],
      [110, 53], [105, 52], [100, 50], [95, 48], [90, 45], [85, 42], [82, 38],
      [82, 34], [85, 30], [90, 25]
    ])
  },
  {
    id: 'ottoman',
    name: '奥斯曼帝国',
    color: '#16A085',
    startYear: 1299,
    endYear: 1922,
    geometry: makePoly([
      [20, 35], [23, 36], [26, 37], [29, 38], [32, 39], [35, 40], [38, 40], [41, 39],
      [43, 38], [44, 36], [43, 34], [40, 33], [36, 32], [32, 32], [28, 33], [24, 34],
      [20, 35]
    ])
  },
  {
    id: 'renaissance-italy',
    name: '文艺复兴意大利',
    color: '#D35400',
    startYear: 1400,
    endYear: 1600,
    geometry: makePoly([
      [7, 44], [9, 45], [11, 46], [12, 45], [13, 44], [14, 43], [15, 42], [17, 41],
      [18, 40], [17, 39], [15, 38], [13, 38], [12, 40], [11, 42], [10, 43], [8, 44],
      [7, 44]
    ])
  },
  {
    id: 'aztec',
    name: '阿兹特克帝国',
    color: '#8E44AD',
    startYear: 1428,
    endYear: 1521,
    geometry: makePoly([
      [-100, 16], [-98, 17], [-96, 18], [-95, 20], [-94, 21], [-95, 22], [-97, 23],
      [-99, 22], [-101, 21], [-102, 19], [-101, 17], [-100, 16]
    ])
  },
  {
    id: 'inca',
    name: '印加帝国',
    color: '#F1C40F',
    startYear: 1438,
    endYear: 1533,
    geometry: makePoly([
      [-80, -5], [-78, -8], [-76, -12], [-74, -16], [-72, -20], [-71, -24], [-72, -28],
      [-74, -32], [-76, -35], [-75, -33], [-73, -29], [-72, -25], [-73, -21], [-75, -17],
      [-77, -13], [-79, -9], [-80, -5]
    ])
  }
];

export const historicalEvents: HistoricalEvent[] = [
  {
    id: 'evt-1',
    title: '宋辽澶渊之盟',
    year: 1005,
    lat: 36.5,
    lng: 116.5,
    description: '宋真宗景德二年，北宋与辽朝订立和约，宋辽约为兄弟之国，宋每年向辽提供岁币银十万两、绢二十万匹。此后宋辽保持百余年和平。',
    imageUrl: 'https://example.com/chanzhou.png',
    civilizationId: 'song-china'
  },
  {
    id: 'evt-2',
    title: '东西教会大分裂',
    year: 1054,
    lat: 41.0,
    lng: 28.9,
    description: '罗马教皇利奥九世与君士坦丁堡牧首米恰尔一世互相开除教籍，基督教正式分裂为罗马天主教和东正教两大派系。',
    imageUrl: 'https://example.com/schism.png',
    civilizationId: 'byzantine'
  },
  {
    id: 'evt-3',
    title: '第一次十字军东征',
    year: 1096,
    lat: 31.8,
    lng: 35.2,
    description: '在教皇乌尔班二世号召下，西欧基督教国家组成十字军，前往东方收复圣地耶路撒冷，于1099年攻克该城并建立耶路撒冷王国。',
    imageUrl: 'https://example.com/crusade.png',
    civilizationId: 'holy-roman'
  },
  {
    id: 'evt-4',
    title: '阿拔斯王朝智慧宫',
    year: 830,
    lat: 33.3,
    lng: 44.4,
    description: '哈里发马蒙在巴格达建立智慧宫，成为中世纪伊斯兰世界的学术中心，大量希腊、波斯、印度典籍被翻译为阿拉伯文。',
    imageUrl: 'https://example.com/houseofwisdom.png',
    civilizationId: 'abbasid'
  },
  {
    id: 'evt-5',
    title: '吴哥窟建成',
    year: 1150,
    lat: 13.4,
    lng: 103.9,
    description: '高棉帝国国王苏利耶跋摩二世在位期间建成吴哥窟（Angkor Wat），作为国寺兼王陵，是世界上最大的宗教建筑之一。',
    imageUrl: 'https://example.com/angkor.png',
    civilizationId: 'khmer'
  },
  {
    id: 'evt-6',
    title: '成吉思汗建立蒙古帝国',
    year: 1206,
    lat: 47.9,
    lng: 107.0,
    description: '铁木真统一蒙古各部，在斡难河畔被推举为"成吉思汗"，建立大蒙古国，开启了人类历史上疆域最辽阔的帝国。',
    imageUrl: 'https://example.com/genghis.png',
    civilizationId: 'mongol'
  },
  {
    id: 'evt-7',
    title: '郑和下西洋',
    year: 1405,
    lat: 32.1,
    lng: 118.8,
    description: '明成祖朱棣派遣宦官郑和率庞大船队首次远航西洋，此后二十八年间七次远航，最远抵达非洲东海岸，比哥伦布早近百年。',
    imageUrl: 'https://example.com/zhenghe.png',
    civilizationId: 'ming-china'
  },
  {
    id: 'evt-8',
    title: '君士坦丁堡陷落',
    year: 1453,
    lat: 41.0,
    lng: 28.9,
    description: '奥斯曼苏丹穆罕默德二世率军攻克拜占庭帝国首都君士坦丁堡，拜占庭帝国灭亡，中世纪结束，大量希腊学者逃往西欧。',
    imageUrl: 'https://example.com/constantinople.png',
    civilizationId: 'ottoman'
  },
  {
    id: 'evt-9',
    title: '哥伦布发现美洲',
    year: 1492,
    lat: 20.0,
    lng: -75.0,
    description: '在西班牙王室资助下，意大利航海家克里斯托弗·哥伦布率三艘船横渡大西洋，抵达巴哈马群岛，开启欧洲对美洲的殖民时代。',
    imageUrl: 'https://example.com/columbus.png',
    civilizationId: 'renaissance-italy'
  },
  {
    id: 'evt-10',
    title: '印刷术传入欧洲',
    year: 1450,
    lat: 49.6,
    lng: 6.6,
    description: '德国人古腾堡在美因茨发明金属活字印刷术，使书籍生产成本大幅降低，推动了知识传播和宗教改革。',
    imageUrl: 'https://example.com/gutenberg.png',
    civilizationId: 'holy-roman'
  },
  {
    id: 'evt-11',
    title: '贞观之治',
    year: 630,
    lat: 34.3,
    lng: 108.9,
    description: '唐太宗李世民在位期间，政治清明、经济繁荣、文化昌盛，被后世誉为"贞观之治"，唐朝成为当时世界最强盛的国家。',
    imageUrl: 'https://example.com/zhenguan.png',
    civilizationId: 'tang-china'
  },
  {
    id: 'evt-12',
    title: '丝绸之路全盛',
    year: 100,
    lat: 40.0,
    lng: 75.0,
    description: '东汉时期丝绸之路达到全盛，连接东西方的贸易网络使中国丝绸、瓷器远销罗马，同时西方宗教、艺术也传入中原。',
    imageUrl: 'https://example.com/silkroad.png',
    civilizationId: 'han-china'
  }
];

export const culturalWorks: CulturalWork[] = [
  {
    id: 'cw-1',
    name: '清明上河图',
    creator: '张择端',
    year: 1085,
    century: 11,
    category: 'painting',
    description: '北宋风俗画长卷，生动描绘汴京（今开封）城市面貌与社会各阶层生活，是中国十大传世名画之一。',
    civilizationId: 'song-china'
  },
  {
    id: 'cw-2',
    name: '资治通鉴',
    creator: '司马光',
    year: 1084,
    century: 11,
    category: 'literature',
    description: '中国第一部编年体通史，记载从战国到五代共1362年历史，"鉴于往事，有资于治道"。',
    civilizationId: 'song-china'
  },
  {
    id: 'cw-3',
    name: '圣索菲亚大教堂',
    creator: '查士丁尼大帝',
    year: 537,
    century: 6,
    category: 'architecture',
    description: '拜占庭建筑艺术巅峰之作，巨大的穹顶跨度达32米，被誉为"改变了建筑史"的伟大建筑。',
    civilizationId: 'byzantine'
  },
  {
    id: 'cw-4',
    name: '一千零一夜',
    creator: '民间故事集',
    year: 900,
    century: 9,
    category: 'literature',
    description: '阿拉伯民间故事集，又称《天方夜谭》，包含辛巴达航海、阿拉丁神灯等经典故事。',
    civilizationId: 'abbasid'
  },
  {
    id: 'cw-5',
    name: '神曲',
    creator: '但丁',
    year: 1320,
    century: 14,
    category: 'literature',
    description: '意大利诗人但丁的史诗长诗，分为地狱、炼狱、天堂三部分，被誉为中世纪文学的巅峰之作。',
    civilizationId: 'renaissance-italy'
  },
  {
    id: 'cw-6',
    name: '蒙娜丽莎',
    creator: '列奥纳多·达·芬奇',
    year: 1519,
    century: 16,
    category: 'painting',
    description: '达·芬奇历时16年完成的肖像画，以神秘的微笑闻名于世，是世界上最著名的油画作品。',
    civilizationId: 'renaissance-italy'
  },
  {
    id: 'cw-7',
    name: '吴哥窟',
    creator: '苏利耶跋摩二世',
    year: 1150,
    century: 12,
    category: 'architecture',
    description: '世界上最大的印度教建筑，主体建筑以沙石构筑，浮雕精美绝伦，是高棉文明的象征。',
    civilizationId: 'khmer'
  },
  {
    id: 'cw-8',
    name: '唐诗三百首',
    creator: '李白 杜甫 等',
    year: 750,
    century: 8,
    category: 'literature',
    description: '唐代是中国诗歌的黄金时代，李白、杜甫、王维等诗人创作了大量流传千古的名篇。',
    civilizationId: 'tang-china'
  },
  {
    id: 'cw-9',
    name: '史记',
    creator: '司马迁',
    year: -91,
    century: -1,
    category: 'literature',
    description: '中国第一部纪传体通史，记载从上古黄帝到汉武帝三千余年历史，被鲁迅誉为"史家之绝唱，无韵之离骚"。',
    civilizationId: 'han-china'
  },
  {
    id: 'cw-10',
    name: '罗马斗兽场',
    creator: '维斯帕先皇帝',
    year: 80,
    century: 1,
    category: 'architecture',
    description: '古罗马最大的圆形角斗场，可容纳5-8万名观众，是古罗马建筑工程的杰出代表。',
    civilizationId: 'roman-empire'
  },
  {
    id: 'cw-11',
    name: '永乐大典',
    creator: '解缙 等',
    year: 1408,
    century: 15,
    category: 'literature',
    description: '明成祖时期编纂的中国古代最大类书，全书22877卷，约3.7亿字，被称为"世界有史以来最大的百科全书"。',
    civilizationId: 'ming-china'
  },
  {
    id: 'cw-12',
    name: '西斯廷教堂天顶画',
    creator: '米开朗基罗',
    year: 1512,
    century: 16,
    category: 'painting',
    description: '米开朗基罗耗时4年独自完成的巨型湿壁画，面积逾500平方米，以《创世记》九幅场景为主体。',
    civilizationId: 'renaissance-italy'
  },
  {
    id: 'cw-13',
    name: '苏莱曼清真寺',
    creator: '希南',
    year: 1557,
    century: 16,
    category: 'architecture',
    description: '奥斯曼帝国建筑大师希南的代表作，被誉为"奥斯曼最美清真寺"，以其精巧的结构和华丽的装饰著称。',
    civilizationId: 'ottoman'
  },
  {
    id: 'cw-14',
    name: '红楼梦',
    creator: '曹雪芹',
    year: 1760,
    century: 18,
    category: 'literature',
    description: '中国古典四大名著之首，以贾、史、王、薛四大家族兴衰为背景，被誉为"中国封建社会的百科全书"。',
    civilizationId: 'qing-china'
  }
];

export const yearSummaries: YearSummary[] = [
  { year: 0, summary: '公元元年，耶稣基督诞生，罗马帝国正值奥古斯都统治时期的和平繁荣。' },
  { year: 100, summary: '东汉永元十二年，丝绸之路全盛，东西方贸易文化交流频繁。' },
  { year: 200, summary: '东汉建安五年，官渡之战爆发，曹操大败袁绍，奠定统一北方基础。' },
  { year: 300, summary: '西晋永康元年，八王之乱爆发，晋室衰落，五胡乱华序幕拉开。' },
  { year: 400, summary: '东晋隆安四年，南北朝对峙前夕，法显西行天竺求法。' },
  { year: 500, summary: '南北朝时期，北魏孝文帝改革推动鲜卑汉化，佛教艺术兴盛。' },
  { year: 600, summary: '隋开皇二十年，隋文帝统一中国，开创科举制度，为大唐盛世奠基。' },
  { year: 700, summary: '武周久视元年，武则天统治下的唐朝国力强盛，文化开放包容。' },
  { year: 800, summary: '唐贞元十六年，查理曼大帝加冕为"罗马人的皇帝"，欧洲进入中世纪。' },
  { year: 900, summary: '唐末光化三年，藩镇割据加剧，唐朝走向灭亡，阿拉伯阿拔斯王朝文化繁荣。' },
  { year: 1000, summary: '北宋咸平三年，宋辽对峙，拜占庭帝国马其顿王朝复兴，维京人发现美洲。' },
  { year: 1100, summary: '北宋元符三年，十字军东征开始，欧洲与伊斯兰世界碰撞交融。' },
  { year: 1200, summary: '南宋庆元六年，成吉思汗统一蒙古，即将开启横扫欧亚的征服。' },
  { year: 1300, summary: '元大德四年，马可·波罗游记在欧洲流传，引发对东方的无限向往。' },
  { year: 1400, summary: '明建文二年，文艺复兴在意大利萌芽，欧洲即将迈入近代曙光。' },
  { year: 1500, summary: '明弘治十三年，哥伦布发现美洲，大航海时代开启全球化进程。' },
  { year: 1600, summary: '明万历二十八年，莎士比亚与汤显祖同年逝世，东西方戏剧交相辉映。' },
  { year: 1700, summary: '清康熙三十九年，牛顿发表《自然哲学的数学原理》，科学革命改变世界。' },
  { year: 1800, summary: '清嘉庆五年，拿破仑称帝，工业革命在英国蓬勃发展，世界格局剧变。' },
  { year: 1900, summary: '清光绪二十六年，八国联军侵华，量子理论诞生，新世纪的曙光与阵痛并存。' },
  { year: 2000, summary: '公元2000年，千禧年到来，互联网普及，全球化深入，人类文明进入信息时代。' }
];
