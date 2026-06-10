import { v4 as uuidv4 } from 'uuid';
import type { Book } from './types';

const bookTemplates = [
  { title: '三体', author: '刘慈欣', year: 2008, description: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。但在按下发射键的那一刻，历经劫难的叶文洁没有意识到，她彻底改变了人类的命运。', tags: ['科幻', '硬科幻', '宇宙'] },
  { title: '活着', author: '余华', year: 1993, description: '讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，终于赌光了家业一贫如洗。他的父亲被他活活气死，母亲则在穷困中患了重病。', tags: ['文学', '现实主义', '人生'] },
  { title: '百年孤独', author: '加西亚·马尔克斯', year: 1967, description: '描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰，反映了拉丁美洲一个世纪以来风云变幻的历史。', tags: ['魔幻现实', '文学', '家族'] },
  { title: '人类简史', author: '尤瓦尔·赫拉利', year: 2014, description: '十万年前，地球上至少有六种不同的人，但今日，世界舞台为什么只剩下了我们自己？从只能啃食叶根和追捕野兽的猿人，到能登陆火星、创造人工智能的智人。', tags: ['历史', '社科', '人类'] },
  { title: '围城', author: '钱钟书', year: 1947, description: '从印度洋上驶来的法国邮船白拉日隆子爵号在上海靠了岸。小说的主人公方鸿渐一踏上阔别四年的故土，就接二连三地陷入了"围城"。', tags: ['文学', '讽刺', '婚姻'] },
  { title: '小王子', author: '圣埃克苏佩里', year: 1943, description: '以一位飞行员作为故事叙述者，讲述了小王子从自己星球出发前往地球的过程中，所经历的各种历险。作者以小王子的孩子式的眼光，透视出成人的空虚。', tags: ['童话', '哲学', '治愈'] },
  { title: '1984', author: '乔治·奥威尔', year: 1949, description: '1984年的世界被三个超级大国所瓜分——大洋国、欧亚国和东亚国，三个国家之间的战争不断，国家内部社会结构被彻底打破。', tags: ['反乌托邦', '政治', '科幻'] },
  { title: '红楼梦', author: '曹雪芹', year: 1791, description: '以贾、史、王、薛四大家族的兴衰为背景，以富贵公子贾宝玉为视角，以贾宝玉与林黛玉、薛宝钗的爱情婚姻悲剧为主线。', tags: ['古典', '文学', '爱情'] },
  { title: '白夜行', author: '东野圭吾', year: 1999, description: '1973年，大阪的一栋废弃建筑内发现了一具男尸，此后19年，嫌疑人之女雪穗与被害者之子桐原亮司走上截然不同的人生道路。', tags: ['推理', '悬疑', '日本'] },
  { title: '追风筝的人', author: '卡勒德·胡赛尼', year: 2003, description: '12岁的阿富汗富家少爷阿米尔与仆人哈桑情同手足。然而，在一场风筝比赛后，发生了一件悲惨不堪的事，阿米尔为自己的懦弱感到自责和痛苦。', tags: ['文学', '成长', '阿富汗'] },
  { title: '解忧杂货店', author: '东野圭吾', year: 2012, description: '僻静的街道旁有一家杂货店，只要写下烦恼投进卷帘门的投信口，第二天就会在店后的牛奶箱里得到回答。', tags: ['治愈', '推理', '温情'] },
  { title: '平凡的世界', author: '路遥', year: 1986, description: '以中国70年代中期到80年代中期十年间为背景，通过复杂的矛盾纠葛，以孙少安和孙少平两兄弟为中心，刻画了当时社会各阶层众多普通人的形象。', tags: ['文学', '现实', '中国'] },
  { title: '老人与海', author: '海明威', year: 1952, description: '讲述了一个名叫圣地亚哥的老渔夫，一连八十四天都没有钓到一条鱼，终于在第八十五天钓到一条身长十八尺，体重一千五百磅的大马林鱼。', tags: ['文学', '硬汉', '美国'] },
  { title: '挪威的森林', author: '村上春树', year: 1987, description: '讲述了主角渡边纠缠在情绪不稳定且患有精神疾病的直子和开朗活泼的小林绿子之间，苦闷彷徨，最终展开了自我救赎和成长的旅程。', tags: ['文学', '青春', '日本'] },
  { title: '万历十五年', author: '黄仁宇', year: 1981, description: '公元1587年，在中国为明万历十五年，论干支则为丁亥，属猪。当日四海升平，全年并无大事可叙。', tags: ['历史', '中国', '明朝'] },
  { title: '傲慢与偏见', author: '简·奥斯汀', year: 1813, description: '讲述了乡绅之女伊丽莎白·班内特的爱情故事，以日常生活为素材，一反当时社会上流行的感伤小说的内容和写作方法。', tags: ['文学', '爱情', '英国'] },
  { title: '哈利波特与魔法石', author: 'J.K.罗琳', year: 1997, description: '一岁的哈利·波特失去父母后，神秘地出现在姨父姨妈家的门前。哈利在姨父家饱受欺凌，度过十年极其痛苦的日子。', tags: ['奇幻', '魔法', '儿童'] },
  { title: '了不起的盖茨比', author: '菲茨杰拉德', year: 1925, description: '以20世纪20年代的纽约市及长岛为背景的中篇小说，描写了当时美国上流社会的奢华生活与空虚的精神世界。', tags: ['文学', '美国', '爵士时代'] },
  { title: '沉默的大多数', author: '王小波', year: 1997, description: '这本杂文随笔集包括思想文化方面的文章，涉及知识分子的处境及思考，社会道德伦理，文化争论，科学与邪道等。', tags: ['杂文', '思想', '中国'] },
  { title: '霍乱时期的爱情', author: '加西亚·马尔克斯', year: 1985, description: '小说讲述了一段跨越半个多世纪的爱情史诗，穷尽了所有爱情的可能性：忠贞的、隐秘的、粗暴的、羞怯的。', tags: ['魔幻现实', '爱情', '文学'] }
];

function generateCover(seed: string, width: number = 140, height: number = 200): string {
  const colors = [
    ['#e94560', '#0f3460'],
    ['#533483', '#16213e'],
    ['#0f3460', '#e94560'],
    ['#f39c12', '#c0392b'],
    ['#27ae60', '#2980b9'],
    ['#8e44ad', '#2c3e50'],
    ['#16a085', '#d35400'],
    ['#c0392b', '#2c3e50']
  ];
  const colorIdx = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
  const [c1, c2] = colors[colorIdx];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="g${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${c2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g${seed})"/>
      <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" 
            fill="white" font-family="serif" font-size="16" font-weight="bold" opacity="0.95">
        ${seed.length > 6 ? seed.substring(0, 6) + '...' : seed}
      </text>
    </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export const initialBooks: Book[] = bookTemplates.slice(0, 16).map(template => ({
  id: uuidv4(),
  title: template.title,
  author: template.author,
  year: template.year,
  cover: generateCover(template.title),
  description: template.description,
  tags: template.tags,
  rating: 3 + Math.random() * 2
}));

export const allBooksPool: Book[] = bookTemplates.map(template => ({
  id: uuidv4(),
  title: template.title,
  author: template.author,
  year: template.year,
  cover: generateCover(template.title),
  description: template.description,
  tags: template.tags,
  rating: 3 + Math.random() * 2
}));
