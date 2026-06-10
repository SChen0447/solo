export type EmotionCategory = 'positive' | 'negative' | 'neutral';

export interface ImageryNode {
  id: string;
  name: string;
  frequency: number;
  emotion: EmotionCategory;
}

export interface ImageryLink {
  source: string;
  target: string;
  strength: number;
}

export interface Poem {
  title: string;
  author: string;
  dynasty: string;
  content: string;
}

export interface ImageryData {
  nodes: ImageryNode[];
  links: ImageryLink[];
}

const imageryNodes: ImageryNode[] = [
  { id: 'moon', name: '月', frequency: 342, emotion: 'negative' },
  { id: 'willow', name: '柳', frequency: 256, emotion: 'negative' },
  { id: 'wine', name: '酒', frequency: 298, emotion: 'positive' },
  { id: 'flower', name: '花', frequency: 312, emotion: 'positive' },
  { id: 'spring', name: '春', frequency: 287, emotion: 'positive' },
  { id: 'autumn', name: '秋', frequency: 265, emotion: 'negative' },
  { id: 'mountain', name: '山', frequency: 198, emotion: 'neutral' },
  { id: 'river', name: '水', frequency: 234, emotion: 'neutral' },
  { id: 'cloud', name: '云', frequency: 176, emotion: 'neutral' },
  { id: 'wind', name: '风', frequency: 221, emotion: 'neutral' },
  { id: 'rain', name: '雨', frequency: 189, emotion: 'negative' },
  { id: 'snow', name: '雪', frequency: 145, emotion: 'negative' },
  { id: 'sunset', name: '夕阳', frequency: 167, emotion: 'negative' },
  { id: 'dawn', name: '朝阳', frequency: 98, emotion: 'positive' },
  { id: 'star', name: '星', frequency: 134, emotion: 'neutral' },
  { id: 'plum', name: '梅', frequency: 156, emotion: 'positive' },
  { id: 'orchid', name: '兰', frequency: 89, emotion: 'positive' },
  { id: 'bamboo', name: '竹', frequency: 145, emotion: 'positive' },
  { id: 'chrysanthemum', name: '菊', frequency: 132, emotion: 'positive' },
  { id: 'pine', name: '松', frequency: 167, emotion: 'positive' },
  { id: 'lotus', name: '莲', frequency: 112, emotion: 'positive' },
  { id: 'peach', name: '桃', frequency: 134, emotion: 'positive' },
  { id: 'pear', name: '梨', frequency: 78, emotion: 'neutral' },
  { id: 'cuckoo', name: '杜鹃', frequency: 87, emotion: 'negative' },
  { id: 'wildgoose', name: '雁', frequency: 123, emotion: 'negative' },
  { id: 'swallow', name: '燕', frequency: 98, emotion: 'positive' },
  { id: 'butterfly', name: '蝶', frequency: 76, emotion: 'positive' },
  { id: 'cicada', name: '蝉', frequency: 65, emotion: 'negative' },
  { id: 'cricket', name: '蟋蟀', frequency: 54, emotion: 'negative' },
  { id: 'fish', name: '鱼', frequency: 67, emotion: 'neutral' },
  { id: 'boat', name: '舟', frequency: 145, emotion: 'neutral' },
  { id: 'bridge', name: '桥', frequency: 89, emotion: 'neutral' },
  { id: 'tower', name: '楼', frequency: 178, emotion: 'negative' },
  { id: 'pavilion', name: '亭', frequency: 112, emotion: 'neutral' },
  { id: 'temple', name: '寺', frequency: 98, emotion: 'neutral' },
  { id: 'palace', name: '宫', frequency: 134, emotion: 'negative' },
  { id: 'gate', name: '门', frequency: 156, emotion: 'neutral' },
  { id: 'road', name: '路', frequency: 143, emotion: 'neutral' },
  { id: 'frontier', name: '边塞', frequency: 112, emotion: 'negative' },
  { id: 'hometown', name: '故乡', frequency: 234, emotion: 'negative' },
  { id: 'guest', name: '客', frequency: 187, emotion: 'negative' },
  { id: 'friend', name: '友', frequency: 165, emotion: 'positive' },
  { id: 'lover', name: '伊人', frequency: 89, emotion: 'positive' },
  { id: 'dream', name: '梦', frequency: 156, emotion: 'neutral' },
  { id: 'tea', name: '茶', frequency: 87, emotion: 'positive' },
  { id: 'incense', name: '香', frequency: 98, emotion: 'positive' },
  { id: 'lamp', name: '灯', frequency: 76, emotion: 'negative' },
  { id: 'mirror', name: '镜', frequency: 65, emotion: 'neutral' },
  { id: 'sword', name: '剑', frequency: 89, emotion: 'positive' },
  { id: 'book', name: '书', frequency: 112, emotion: 'positive' }
];

const imageryLinks: ImageryLink[] = [
  { source: 'moon', target: 'hometown', strength: 8 },
  { source: 'moon', target: 'wine', strength: 7 },
  { source: 'moon', target: 'autumn', strength: 6 },
  { source: 'moon', target: 'tower', strength: 5 },
  { source: 'moon', target: 'guest', strength: 5 },
  { source: 'moon', target: 'star', strength: 4 },
  { source: 'moon', target: 'cloud', strength: 3 },
  { source: 'moon', target: 'dream', strength: 4 },
  { source: 'willow', target: 'spring', strength: 7 },
  { source: 'willow', target: 'friend', strength: 6 },
  { source: 'willow', target: 'boat', strength: 5 },
  { source: 'willow', target: 'bridge', strength: 4 },
  { source: 'willow', target: 'flower', strength: 5 },
  { source: 'willow', target: 'swallow', strength: 4 },
  { source: 'willow', target: 'gate', strength: 3 },
  { source: 'wine', target: 'friend', strength: 7 },
  { source: 'wine', target: 'flower', strength: 6 },
  { source: 'wine', target: 'spring', strength: 5 },
  { source: 'wine', target: 'tower', strength: 5 },
  { source: 'wine', target: 'guest', strength: 4 },
  { source: 'wine', target: 'sword', strength: 4 },
  { source: 'wine', target: 'book', strength: 3 },
  { source: 'wine', target: 'tea', strength: 3 },
  { source: 'flower', target: 'spring', strength: 8 },
  { source: 'flower', target: 'butterfly', strength: 5 },
  { source: 'flower', target: 'peach', strength: 5 },
  { source: 'flower', target: 'pear', strength: 4 },
  { source: 'flower', target: 'wind', strength: 4 },
  { source: 'flower', target: 'rain', strength: 4 },
  { source: 'flower', target: 'lotus', strength: 3 },
  { source: 'spring', target: 'swallow', strength: 6 },
  { source: 'spring', target: 'peach', strength: 5 },
  { source: 'spring', target: 'wind', strength: 5 },
  { source: 'spring', target: 'lover', strength: 4 },
  { source: 'spring', target: 'dream', strength: 3 },
  { source: 'autumn', target: 'wildgoose', strength: 7 },
  { source: 'autumn', target: 'rain', strength: 6 },
  { source: 'autumn', target: 'cicada', strength: 5 },
  { source: 'autumn', target: 'cricket', strength: 4 },
  { source: 'autumn', target: 'wind', strength: 5 },
  { source: 'autumn', target: 'sunset', strength: 5 },
  { source: 'autumn', target: 'hometown', strength: 4 },
  { source: 'autumn', target: 'tower', strength: 4 },
  { source: 'mountain', target: 'river', strength: 7 },
  { source: 'mountain', target: 'cloud', strength: 6 },
  { source: 'mountain', target: 'pine', strength: 5 },
  { source: 'mountain', target: 'temple', strength: 5 },
  { source: 'mountain', target: 'road', strength: 4 },
  { source: 'mountain', target: 'bamboo', strength: 4 },
  { source: 'river', target: 'boat', strength: 6 },
  { source: 'river', target: 'fish', strength: 5 },
  { source: 'river', target: 'bridge', strength: 5 },
  { source: 'river', target: 'cloud', strength: 4 },
  { source: 'river', target: 'frontier', strength: 3 },
  { source: 'cloud', target: 'wind', strength: 6 },
  { source: 'cloud', target: 'star', strength: 4 },
  { source: 'cloud', target: 'pavilion', strength: 3 },
  { source: 'wind', target: 'rain', strength: 5 },
  { source: 'wind', target: 'snow', strength: 4 },
  { source: 'wind', target: 'cuckoo', strength: 3 },
  { source: 'rain', target: 'lamp', strength: 4 },
  { source: 'rain', target: 'autumn', strength: 5 },
  { source: 'rain', target: 'flower', strength: 4 },
  { source: 'snow', target: 'plum', strength: 6 },
  { source: 'snow', target: 'pine', strength: 5 },
  { source: 'snow', target: 'frontier', strength: 4 },
  { source: 'sunset', target: 'tower', strength: 6 },
  { source: 'sunset', target: 'river', strength: 4 },
  { source: 'sunset', target: 'hometown', strength: 4 },
  { source: 'sunset', target: 'road', strength: 3 },
  { source: 'dawn', target: 'star', strength: 4 },
  { source: 'dawn', target: 'wind', strength: 3 },
  { source: 'star', target: 'moon', strength: 5 },
  { source: 'star', target: 'river', strength: 3 },
  { source: 'plum', target: 'bamboo', strength: 5 },
  { source: 'plum', target: 'orchid', strength: 4 },
  { source: 'plum', target: 'chrysanthemum', strength: 4 },
  { source: 'plum', target: 'snow', strength: 6 },
  { source: 'orchid', target: 'bamboo', strength: 4 },
  { source: 'orchid', target: 'chrysanthemum', strength: 3 },
  { source: 'bamboo', target: 'pine', strength: 5 },
  { source: 'bamboo', target: 'chrysanthemum', strength: 4 },
  { source: 'bamboo', target: 'book', strength: 3 },
  { source: 'chrysanthemum', target: 'autumn', strength: 5 },
  { source: 'chrysanthemum', target: 'wine', strength: 4 },
  { source: 'pine', target: 'mountain', strength: 5 },
  { source: 'pine', target: 'plum', strength: 4 },
  { source: 'lotus', target: 'summer', strength: 3 },
  { source: 'lotus', target: 'fish', strength: 4 },
  { source: 'lotus', target: 'river', strength: 4 },
  { source: 'peach', target: 'spring', strength: 5 },
  { source: 'peach', target: 'lover', strength: 4 },
  { source: 'peach', target: 'flower', strength: 4 },
  { source: 'cuckoo', target: 'hometown', strength: 5 },
  { source: 'cuckoo', target: 'autumn', strength: 4 },
  { source: 'wildgoose', target: 'hometown', strength: 6 },
  { source: 'wildgoose', target: 'frontier', strength: 5 },
  { source: 'wildgoose', target: 'cloud', strength: 4 },
  { source: 'swallow', target: 'spring', strength: 5 },
  { source: 'swallow', target: 'willow', strength: 4 },
  { source: 'swallow', target: 'lover', strength: 3 },
  { source: 'butterfly', target: 'flower', strength: 5 },
  { source: 'butterfly', target: 'dream', strength: 4 },
  { source: 'cicada', target: 'autumn', strength: 5 },
  { source: 'cicada', target: 'tree', strength: 3 },
  { source: 'boat', target: 'river', strength: 6 },
  { source: 'boat', target: 'friend', strength: 4 },
  { source: 'boat', target: 'hometown', strength: 4 },
  { source: 'boat', target: 'rain', strength: 3 },
  { source: 'bridge', target: 'willow', strength: 4 },
  { source: 'bridge', target: 'river', strength: 5 },
  { source: 'tower', target: 'hometown', strength: 5 },
  { source: 'tower', target: 'sunset', strength: 5 },
  { source: 'tower', target: 'guest', strength: 4 },
  { source: 'pavilion', target: 'friend', strength: 4 },
  { source: 'pavilion', target: 'mountain', strength: 3 },
  { source: 'temple', target: 'mountain', strength: 4 },
  { source: 'temple', target: 'incense', strength: 4 },
  { source: 'temple', target: 'cloud', strength: 3 },
  { source: 'palace', target: 'autumn', strength: 4 },
  { source: 'palace', target: 'moon', strength: 3 },
  { source: 'palace', target: 'lamp', strength: 4 },
  { source: 'gate', target: 'road', strength: 4 },
  { source: 'gate', target: 'willow', strength: 3 },
  { source: 'road', target: 'frontier', strength: 5 },
  { source: 'road', target: 'hometown', strength: 4 },
  { source: 'road', target: 'guest', strength: 4 },
  { source: 'frontier', target: 'snow', strength: 5 },
  { source: 'frontier', target: 'sword', strength: 5 },
  { source: 'frontier', target: 'wildgoose', strength: 4 },
  { source: 'hometown', target: 'guest', strength: 6 },
  { source: 'hometown', target: 'moon', strength: 7 },
  { source: 'hometown', target: 'road', strength: 4 },
  { source: 'guest', target: 'tower', strength: 5 },
  { source: 'guest', target: 'autumn', strength: 4 },
  { source: 'friend', target: 'wine', strength: 6 },
  { source: 'friend', target: 'willow', strength: 5 },
  { source: 'friend', target: 'book', strength: 3 },
  { source: 'lover', target: 'dream', strength: 4 },
  { source: 'lover', target: 'flower', strength: 4 },
  { source: 'lover', target: 'mirror', strength: 3 },
  { source: 'dream', target: 'moon', strength: 4 },
  { source: 'dream', target: 'butterfly', strength: 4 },
  { source: 'tea', target: 'book', strength: 4 },
  { source: 'tea', target: 'bamboo', strength: 3 },
  { source: 'tea', target: 'incense', strength: 4 },
  { source: 'incense', target: 'temple', strength: 4 },
  { source: 'incense', target: 'dream', strength: 3 },
  { source: 'lamp', target: 'rain', strength: 4 },
  { source: 'lamp', target: 'tower', strength: 3 },
  { source: 'lamp', target: 'book', strength: 3 },
  { source: 'mirror', target: 'flower', strength: 3 },
  { source: 'mirror', target: 'moon', strength: 3 },
  { source: 'sword', target: 'frontier', strength: 5 },
  { source: 'sword', target: 'wine', strength: 4 },
  { source: 'book', target: 'friend', strength: 4 },
  { source: 'book', target: 'tea', strength: 3 },
  { source: 'book', target: 'lamp', strength: 3 }
];

const poemsByImagery: Record<string, Poem[]> = {
  moon: [
    { title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。' },
    { title: '水调歌头', author: '苏轼', dynasty: '宋', content: '明月几时有？把酒问青天。\n不知天上宫阙，今夕是何年。' },
    { title: '春江花月夜', author: '张若虚', dynasty: '唐', content: '春江潮水连海平，海上明月共潮生。\n滟滟随波千万里，何处春江无月明。' }
  ],
  willow: [
    { title: '咏柳', author: '贺知章', dynasty: '唐', content: '碧玉妆成一树高，万条垂下绿丝绦。\n不知细叶谁裁出，二月春风似剪刀。' },
    { title: '雨霖铃', author: '柳永', dynasty: '宋', content: '今宵酒醒何处？杨柳岸，晓风残月。\n此去经年，应是良辰好景虚设。' },
    { title: '送元二使安西', author: '王维', dynasty: '唐', content: '渭城朝雨浥轻尘，客舍青青柳色新。\n劝君更尽一杯酒，西出阳关无故人。' }
  ],
  wine: [
    { title: '将进酒', author: '李白', dynasty: '唐', content: '君不见黄河之水天上来，奔流到海不复回。\n人生得意须尽欢，莫使金樽空对月。' },
    { title: '水调歌头', author: '苏轼', dynasty: '宋', content: '明月几时有？把酒问青天。\n但愿人长久，千里共婵娟。' },
    { title: '短歌行', author: '曹操', dynasty: '汉', content: '对酒当歌，人生几何！\n譬如朝露，去日苦多。' }
  ],
  flower: [
    { title: '大林寺桃花', author: '白居易', dynasty: '唐', content: '人间四月芳菲尽，山寺桃花始盛开。\n长恨春归无觅处，不知转入此中来。' },
    { title: '卜算子·咏梅', author: '陆游', dynasty: '宋', content: '驿外断桥边，寂寞开无主。\n零落成泥碾作尘，只有香如故。' },
    { title: '江畔独步寻花', author: '杜甫', dynasty: '唐', content: '黄四娘家花满蹊，千朵万朵压枝低。\n留连戏蝶时时舞，自在娇莺恰恰啼。' }
  ],
  spring: [
    { title: '春晓', author: '孟浩然', dynasty: '唐', content: '春眠不觉晓，处处闻啼鸟。\n夜来风雨声，花落知多少。' },
    { title: '春望', author: '杜甫', dynasty: '唐', content: '国破山河在，城春草木深。\n感时花溅泪，恨别鸟惊心。' },
    { title: '钱塘湖春行', author: '白居易', dynasty: '唐', content: '孤山寺北贾亭西，水面初平云脚低。\n几处早莺争暖树，谁家新燕啄春泥。' }
  ],
  autumn: [
    { title: '登高', author: '杜甫', dynasty: '唐', content: '风急天高猿啸哀，渚清沙白鸟飞回。\n无边落木萧萧下，不尽长江滚滚来。' },
    { title: '声声慢', author: '李清照', dynasty: '宋', content: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。\n乍暖还寒时候，最难将息。' },
    { title: '秋词', author: '刘禹锡', dynasty: '唐', content: '自古逢秋悲寂寥，我言秋日胜春朝。\n晴空一鹤排云上，便引诗情到碧霄。' }
  ],
  mountain: [
    { title: '望岳', author: '杜甫', dynasty: '唐', content: '岱宗夫如何？齐鲁青未了。\n会当凌绝顶，一览众山小。' },
    { title: '题西林壁', author: '苏轼', dynasty: '宋', content: '横看成岭侧成峰，远近高低各不同。\n不识庐山真面目，只缘身在此山中。' },
    { title: '鹿柴', author: '王维', dynasty: '唐', content: '空山不见人，但闻人语响。\n返景入深林，复照青苔上。' }
  ],
  river: [
    { title: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋', content: '大江东去，浪淘尽，千古风流人物。\n故垒西边，人道是，三国周郎赤壁。' },
    { title: '登鹳雀楼', author: '王之涣', dynasty: '唐', content: '白日依山尽，黄河入海流。\n欲穷千里目，更上一层楼。' },
    { title: '春江花月夜', author: '张若虚', dynasty: '唐', content: '江水流春去欲尽，江潭落月复西斜。\n不知乘月几人归，落月摇情满江树。' }
  ],
  cloud: [
    { title: '黄鹤楼', author: '崔颢', dynasty: '唐', content: '黄鹤一去不复返，白云千载空悠悠。\n晴川历历汉阳树，芳草萋萋鹦鹉洲。' },
    { title: '独坐敬亭山', author: '李白', dynasty: '唐', content: '众鸟高飞尽，孤云独去闲。\n相看两不厌，只有敬亭山。' },
    { title: '山行', author: '杜牧', dynasty: '唐', content: '远上寒山石径斜，白云生处有人家。\n停车坐爱枫林晚，霜叶红于二月花。' }
  ],
  wind: [
    { title: '风', author: '李峤', dynasty: '唐', content: '解落三秋叶，能开二月花。\n过江千尺浪，入竹万竿斜。' },
    { title: '茅屋为秋风所破歌', author: '杜甫', dynasty: '唐', content: '八月秋高风怒号，卷我屋上三重茅。\n安得广厦千万间，大庇天下寒士俱欢颜。' },
    { title: '蝶恋花', author: '晏殊', dynasty: '宋', content: '昨夜西风凋碧树，独上高楼，望尽天涯路。\n欲寄彩笺兼尺素，山长水阔知何处。' }
  ],
  rain: [
    { title: '清明', author: '杜牧', dynasty: '唐', content: '清明时节雨纷纷，路上行人欲断魂。\n借问酒家何处有？牧童遥指杏花村。' },
    { title: '夜雨寄北', author: '李商隐', dynasty: '唐', content: '君问归期未有期，巴山夜雨涨秋池。\n何当共剪西窗烛，却话巴山夜雨时。' },
    { title: '定风波', author: '苏轼', dynasty: '宋', content: '莫听穿林打叶声，何妨吟啸且徐行。\n回首向来萧瑟处，归去，也无风雨也无晴。' }
  ],
  snow: [
    { title: '江雪', author: '柳宗元', dynasty: '唐', content: '千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。' },
    { title: '白雪歌送武判官归京', author: '岑参', dynasty: '唐', content: '忽如一夜春风来，千树万树梨花开。\n纷纷暮雪下辕门，风掣红旗冻不翻。' },
    { title: '沁园春·雪', author: '毛泽东', dynasty: '近', content: '北国风光，千里冰封，万里雪飘。\n望长城内外，惟余莽莽；大河上下，顿失滔滔。' }
  ],
  sunset: [
    { title: '登乐游原', author: '李商隐', dynasty: '唐', content: '向晚意不适，驱车登古原。\n夕阳无限好，只是近黄昏。' },
    { title: '滕王阁序', author: '王勃', dynasty: '唐', content: '落霞与孤鹜齐飞，秋水共长天一色。\n渔舟唱晚，响穷彭蠡之滨。' },
    { title: '如梦令', author: '李清照', dynasty: '宋', content: '常记溪亭日暮，沉醉不知归路。\n兴尽晚回舟，误入藕花深处。' }
  ],
  dawn: [
    { title: '早发白帝城', author: '李白', dynasty: '唐', content: '朝辞白帝彩云间，千里江陵一日还。\n两岸猿声啼不住，轻舟已过万重山。' },
    { title: '山中与幽人对酌', author: '李白', dynasty: '唐', content: '两人对酌山花开，一杯一杯复一杯。\n我醉欲眠卿且去，明朝有意抱琴来。' },
    { title: '商山早行', author: '温庭筠', dynasty: '唐', content: '晨起动征铎，客行悲故乡。\n鸡声茅店月，人迹板桥霜。' }
  ],
  star: [
    { title: '迢迢牵牛星', author: '佚名', dynasty: '汉', content: '迢迢牵牛星，皎皎河汉女。\n盈盈一水间，脉脉不得语。' },
    { title: '绮怀', author: '黄景仁', dynasty: '清', content: '似此星辰非昨夜，为谁风露立中宵。\n缠绵思尽抽残茧，宛转心伤剥后蕉。' },
    { title: '夜宿山寺', author: '李白', dynasty: '唐', content: '危楼高百尺，手可摘星辰。\n不敢高声语，恐惊天上人。' }
  ],
  plum: [
    { title: '卜算子·咏梅', author: '陆游', dynasty: '宋', content: '驿外断桥边，寂寞开无主。\n已是黄昏独自愁，更著风和雨。' },
    { title: '梅花', author: '王安石', dynasty: '宋', content: '墙角数枝梅，凌寒独自开。\n遥知不是雪，为有暗香来。' },
    { title: '山园小梅', author: '林逋', dynasty: '宋', content: '众芳摇落独暄妍，占尽风情向小园。\n疏影横斜水清浅，暗香浮动月黄昏。' }
  ],
  orchid: [
    { title: '古风·兰花', author: '李白', dynasty: '唐', content: '孤兰生幽园，众草共芜没。\n虽照阳春晖，复悲高秋月。' },
    { title: '种兰', author: '苏辙', dynasty: '宋', content: '兰生幽谷无人识，客种东轩遗我香。\n知有清芬能解秽，更怜细叶巧凌霜。' },
    { title: '幽兰', author: '陶渊明', dynasty: '晋', content: '幽兰生前庭，含薰待清风。\n清风脱然至，见别萧艾中。' }
  ],
  bamboo: [
    { title: '竹石', author: '郑燮', dynasty: '清', content: '咬定青山不放松，立根原在破岩中。\n千磨万击还坚劲，任尔东西南北风。' },
    { title: '于潜僧绿筠轩', author: '苏轼', dynasty: '宋', content: '宁可食无肉，不可居无竹。\n无肉令人瘦，无竹令人俗。' },
    { title: '湘妃竹', author: '李商隐', dynasty: '唐', content: '湘江竹上痕无限，岘首碑前洒几多。\n人去紫台秋入塞，兵残楚帐夜闻歌。' }
  ],
  chrysanthemum: [
    { title: '饮酒', author: '陶渊明', dynasty: '晋', content: '结庐在人境，而无车马喧。\n采菊东篱下，悠然见南山。' },
    { title: '九月九日忆山东兄弟', author: '王维', dynasty: '唐', content: '独在异乡为异客，每逢佳节倍思亲。\n遥知兄弟登高处，遍插茱萸少一人。' },
    { title: '不第后赋菊', author: '黄巢', dynasty: '唐', content: '待到秋来九月八，我花开后百花杀。\n冲天香阵透长安，满城尽带黄金甲。' }
  ],
  pine: [
    { title: '赠从弟', author: '刘桢', dynasty: '汉', content: '亭亭山上松，瑟瑟谷中风。\n风声一何盛，松枝一何劲。' },
    { title: '松树', author: '白居易', dynasty: '唐', content: '白金换得青松树，君既先栽我不栽。\n幸有西风易凭仗，夜深偷送好声来。' },
    { title: '南轩松', author: '李白', dynasty: '唐', content: '南轩有孤松，柯叶自绵幂。\n清风无闲时，潇洒终日夕。' }
  ],
  lotus: [
    { title: '爱莲说', author: '周敦颐', dynasty: '宋', content: '出淤泥而不染，濯清涟而不妖。\n中通外直，不蔓不枝。' },
    { title: '晓出净慈寺送林子方', author: '杨万里', dynasty: '宋', content: '毕竟西湖六月中，风光不与四时同。\n接天莲叶无穷碧，映日荷花别样红。' },
    { title: '采莲曲', author: '王昌龄', dynasty: '唐', content: '荷叶罗裙一色裁，芙蓉向脸两边开。\n乱入池中看不见，闻歌始觉有人来。' }
  ],
  peach: [
    { title: '题都城南庄', author: '崔护', dynasty: '唐', content: '去年今日此门中，人面桃花相映红。\n人面不知何处去，桃花依旧笑春风。' },
    { title: '桃花源记', author: '陶渊明', dynasty: '晋', content: '芳草鲜美，落英缤纷。\n渔人甚异之，复前行，欲穷其林。' },
    { title: '惠崇春江晚景', author: '苏轼', dynasty: '宋', content: '竹外桃花三两枝，春江水暖鸭先知。\n蒌蒿满地芦芽短，正是河豚欲上时。' }
  ],
  pear: [
    { title: '白雪歌送武判官归京', author: '岑参', dynasty: '唐', content: '忽如一夜春风来，千树万树梨花开。\n散入珠帘湿罗幕，狐裘不暖锦衾薄。' },
    { title: '梨花', author: '杜牧', dynasty: '唐', content: '梨花带雨三月时，玉女窗中半笑枝。\n垂袖态盈轻似雪，舞裙香软薄如縠。' },
    { title: '采桑子', author: '晏殊', dynasty: '宋', content: '春风不负东君信，遍拆群芳。\n燕子双双，依旧衔泥入杏梁。' }
  ],
  cuckoo: [
    { title: '锦瑟', author: '李商隐', dynasty: '唐', content: '庄生晓梦迷蝴蝶，望帝春心托杜鹃。\n沧海月明珠有泪，蓝田日暖玉生烟。' },
    { title: '琵琶行', author: '白居易', dynasty: '唐', content: '其间旦暮闻何物？杜鹃啼血猿哀鸣。\n春江花朝秋月夜，往往取酒还独倾。' },
    { title: '送春', author: '朱弁', dynasty: '宋', content: '风烟节物眼中稀，三月人犹恋褚衣。\n结就客愁云片段，唤回乡梦雨霏微。' }
  ],
  wildgoose: [
    { title: '次北固山下', author: '王湾', dynasty: '唐', content: '客路青山外，行舟绿水前。\n乡书何处达？归雁洛阳边。' },
    { title: '渔家傲·秋思', author: '范仲淹', dynasty: '宋', content: '塞下秋来风景异，衡阳雁去无留意。\n四面边声连角起，千嶂里，长烟落日孤城闭。' },
    { title: '一剪梅', author: '李清照', dynasty: '宋', content: '云中谁寄锦书来，雁字回时，月满西楼。\n花自飘零水自流，一种相思，两处闲愁。' }
  ],
  swallow: [
    { title: '乌衣巷', author: '刘禹锡', dynasty: '唐', content: '朱雀桥边野草花，乌衣巷口夕阳斜。\n旧时王谢堂前燕，飞入寻常百姓家。' },
    { title: '浣溪沙', author: '晏殊', dynasty: '宋', content: '一曲新词酒一杯，去年天气旧亭台。\n无可奈何花落去，似曾相识燕归来。' },
    { title: '钱塘湖春行', author: '白居易', dynasty: '唐', content: '几处早莺争暖树，谁家新燕啄春泥。\n乱花渐欲迷人眼，浅草才能没马蹄。' }
  ],
  butterfly: [
    { title: '锦瑟', author: '李商隐', dynasty: '唐', content: '庄生晓梦迷蝴蝶，望帝春心托杜鹃。\n此情可待成追忆，只是当时已惘然。' },
    { title: '江畔独步寻花', author: '杜甫', dynasty: '唐', content: '黄四娘家花满蹊，千朵万朵压枝低。\n留连戏蝶时时舞，自在娇莺恰恰啼。' },
    { title: '晚春', author: '韩愈', dynasty: '唐', content: '草树知春不久归，百般红紫斗芳菲。\n杨花榆荚无才思，惟解漫天作雪飞。' }
  ],
  cicada: [
    { title: '在狱咏蝉', author: '骆宾王', dynasty: '唐', content: '西陆蝉声唱，南冠客思深。\n无人信高洁，谁为表予心。' },
    { title: '蝉', author: '虞世南', dynasty: '唐', content: '垂緌饮清露，流响出疏桐。\n居高声自远，非是藉秋风。' },
    { title: '枫桥夜泊', author: '张继', dynasty: '唐', content: '月落乌啼霜满天，江枫渔火对愁眠。\n姑苏城外寒山寺，夜半钟声到客船。' }
  ],
  cricket: [
    { title: '诗经·唐风·蟋蟀', author: '佚名', dynasty: '周', content: '蟋蟀在堂，岁聿其莫。\n今我不乐，日月其除。' },
    { title: '促织', author: '杜甫', dynasty: '唐', content: '促织甚微细，哀音何动人。\n草根吟不稳，床下夜相亲。' },
    { title: '齐天乐·蝉', author: '王沂孙', dynasty: '宋', content: '一襟余恨宫魂断，年年翠阴庭树。\n铜仙铅泪如洗，叹移盘去远，难贮零露。' }
  ],
  fish: [
    { title: '惠崇春江晚景', author: '苏轼', dynasty: '宋', content: '竹外桃花三两枝，春江水暖鸭先知。\n蒌蒿满地芦芽短，正是河豚欲上时。' },
    { title: '渔歌子', author: '张志和', dynasty: '唐', content: '西塞山前白鹭飞，桃花流水鳜鱼肥。\n青箬笠，绿蓑衣，斜风细雨不须归。' },
    { title: '江南', author: '汉乐府', dynasty: '汉', content: '江南可采莲，莲叶何田田。\n鱼戏莲叶间，鱼戏莲叶东。' }
  ],
  boat: [
    { title: '早发白帝城', author: '李白', dynasty: '唐', content: '朝辞白帝彩云间，千里江陵一日还。\n两岸猿声啼不住，轻舟已过万重山。' },
    { title: '念奴娇·赤壁怀古', author: '苏轼', dynasty: '宋', content: '人生如梦，一尊还酹江月。\n驾一叶之扁舟，举匏樽以相属。' },
    { title: '滁州西涧', author: '韦应物', dynasty: '唐', content: '独怜幽草涧边生，上有黄鹂深树鸣。\n春潮带雨晚来急，野渡无人舟自横。' }
  ],
  bridge: [
    { title: '枫桥夜泊', author: '张继', dynasty: '唐', content: '月落乌啼霜满天，江枫渔火对愁眠。\n姑苏城外寒山寺，夜半钟声到客船。' },
    { title: '商山早行', author: '温庭筠', dynasty: '唐', content: '晨起动征铎，客行悲故乡。\n鸡声茅店月，人迹板桥霜。' },
    { title: '卜算子·咏梅', author: '陆游', dynasty: '宋', content: '驿外断桥边，寂寞开无主。\n已是黄昏独自愁，更著风和雨。' }
  ],
  tower: [
    { title: '登鹳雀楼', author: '王之涣', dynasty: '唐', content: '白日依山尽，黄河入海流。\n欲穷千里目，更上一层楼。' },
    { title: '黄鹤楼', author: '崔颢', dynasty: '唐', content: '昔人已乘黄鹤去，此地空余黄鹤楼。\n黄鹤一去不复返，白云千载空悠悠。' },
    { title: '蝶恋花', author: '晏殊', dynasty: '宋', content: '昨夜西风凋碧树，独上高楼，望尽天涯路。\n欲寄彩笺兼尺素，山长水阔知何处。' }
  ],
  pavilion: [
    { title: '醉翁亭记', author: '欧阳修', dynasty: '宋', content: '醉翁之意不在酒，在乎山水之间也。\n山水之乐，得之心而寓之酒也。' },
    { title: '如梦令', author: '李清照', dynasty: '宋', content: '常记溪亭日暮，沉醉不知归路。\n兴尽晚回舟，误入藕花深处。' },
    { title: '浪淘沙', author: '李煜', dynasty: '南唐', content: '帘外雨潺潺，春意阑珊。\n罗衾不耐五更寒。梦里不知身是客，一晌贪欢。' }
  ],
  temple: [
    { title: '枫桥夜泊', author: '张继', dynasty: '唐', content: '月落乌啼霜满天，江枫渔火对愁眠。\n姑苏城外寒山寺，夜半钟声到客船。' },
    { title: '题破山寺后禅院', author: '常建', dynasty: '唐', content: '清晨入古寺，初日照高林。\n曲径通幽处，禅房花木深。' },
    { title: '江南春', author: '杜牧', dynasty: '唐', content: '千里莺啼绿映红，水村山郭酒旗风。\n南朝四百八十寺，多少楼台烟雨中。' }
  ],
  palace: [
    { title: '长恨歌', author: '白居易', dynasty: '唐', content: '汉皇重色思倾国，御宇多年求不得。\n杨家有女初长成，养在深闺人未识。' },
    { title: '过华清宫', author: '杜牧', dynasty: '唐', content: '长安回望绣成堆，山顶千门次第开。\n一骑红尘妃子笑，无人知是荔枝来。' },
    { title: '虞美人', author: '李煜', dynasty: '南唐', content: '春花秋月何时了？往事知多少。\n小楼昨夜又东风，故国不堪回首月明中。' }
  ],
  gate: [
    { title: '出塞', author: '王昌龄', dynasty: '唐', content: '秦时明月汉时关，万里长征人未还。\n但使龙城飞将在，不教胡马度阴山。' },
    { title: '题都城南庄', author: '崔护', dynasty: '唐', content: '去年今日此门中，人面桃花相映红。\n人面不知何处去，桃花依旧笑春风。' },
    { title: '归园田居', author: '陶渊明', dynasty: '晋', content: '野外罕人事，穷巷寡轮鞅。\n白日掩荆扉，虚室绝尘想。' }
  ],
  road: [
    { title: '行路难', author: '李白', dynasty: '唐', content: '金樽清酒斗十千，玉盘珍羞直万钱。\n长风破浪会有时，直挂云帆济沧海。' },
    { title: '商山早行', author: '温庭筠', dynasty: '唐', content: '晨起动征铎，客行悲故乡。\n鸡声茅店月，人迹板桥霜。' },
    { title: '十一月四日风雨大作', author: '陆游', dynasty: '宋', content: '僵卧孤村不自哀，尚思为国戍轮台。\n夜阑卧听风吹雨，铁马冰河入梦来。' }
  ],
  frontier: [
    { title: '出塞', author: '王昌龄', dynasty: '唐', content: '秦时明月汉时关，万里长征人未还。\n但使龙城飞将在，不教胡马度阴山。' },
    { title: '渔家傲·秋思', author: '范仲淹', dynasty: '宋', content: '塞下秋来风景异，衡阳雁去无留意。\n四面边声连角起，千嶂里，长烟落日孤城闭。' },
    { title: '白雪歌送武判官归京', author: '岑参', dynasty: '唐', content: '北风卷地白草折，胡天八月即飞雪。\n忽如一夜春风来，千树万树梨花开。' }
  ],
  hometown: [
    { title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。' },
    { title: '九月九日忆山东兄弟', author: '王维', dynasty: '唐', content: '独在异乡为异客，每逢佳节倍思亲。\n遥知兄弟登高处，遍插茱萸少一人。' },
    { title: '泊船瓜洲', author: '王安石', dynasty: '宋', content: '京口瓜洲一水间，钟山只隔数重山。\n春风又绿江南岸，明月何时照我还。' }
  ],
  guest: [
    { title: '春望', author: '杜甫', dynasty: '唐', content: '国破山河在，城春草木深。\n烽火连三月，家书抵万金。' },
    { title: '登高', author: '杜甫', dynasty: '唐', content: '万里悲秋常作客，百年多病独登台。\n艰难苦恨繁霜鬓，潦倒新停浊酒杯。' },
    { title: '夜雨寄北', author: '李商隐', dynasty: '唐', content: '君问归期未有期，巴山夜雨涨秋池。\n何当共剪西窗烛，却话巴山夜雨时。' }
  ],
  friend: [
    { title: '送元二使安西', author: '王维', dynasty: '唐', content: '渭城朝雨浥轻尘，客舍青青柳色新。\n劝君更尽一杯酒，西出阳关无故人。' },
    { title: '赠汪伦', author: '李白', dynasty: '唐', content: '李白乘舟将欲行，忽闻岸上踏歌声。\n桃花潭水深千尺，不及汪伦送我情。' },
    { title: '别董大', author: '高适', dynasty: '唐', content: '千里黄云白日曛，北风吹雁雪纷纷。\n莫愁前路无知己，天下谁人不识君。' }
  ],
  lover: [
    { title: '诗经·秦风·蒹葭', author: '佚名', dynasty: '周', content: '蒹葭苍苍，白露为霜。\n所谓伊人，在水一方。' },
    { title: '鹊桥仙', author: '秦观', dynasty: '宋', content: '纤云弄巧，飞星传恨，银汉迢迢暗度。\n两情若是久长时，又岂在朝朝暮暮。' },
    { title: '一剪梅', author: '李清照', dynasty: '宋', content: '红藕香残玉簟秋，轻解罗裳，独上兰舟。\n云中谁寄锦书来，雁字回时，月满西楼。' }
  ],
  dream: [
    { title: '锦瑟', author: '李商隐', dynasty: '唐', content: '锦瑟无端五十弦，一弦一柱思华年。\n庄生晓梦迷蝴蝶，望帝春心托杜鹃。' },
    { title: '蝶恋花', author: '苏轼', dynasty: '宋', content: '花褪残红青杏小，燕子飞时，绿水人家绕。\n枝上柳绵吹又少，天涯何处无芳草。' },
    { title: '声声慢', author: '李清照', dynasty: '宋', content: '守着窗儿，独自怎生得黑！\n这次第，怎一个愁字了得！' }
  ],
  tea: [
    { title: '茶经', author: '陆羽', dynasty: '唐', content: '茶者，南方之嘉木也。\n一尺、二尺乃至数十尺，其巴山峡川有两人合抱者。' },
    { title: '临安春雨初霁', author: '陆游', dynasty: '宋', content: '世味年来薄似纱，谁令骑马客京华。\n小楼一夜听春雨，深巷明朝卖杏花。' },
    { title: '汲江煎茶', author: '苏轼', dynasty: '宋', content: '活水还须活火烹，自临钓石取深清。\n大瓢贮月归春瓮，小杓分江入夜瓶。' }
  ],
  incense: [
    { title: '江城子·乙卯正月二十日夜记梦', author: '苏轼', dynasty: '宋', content: '夜来幽梦忽还乡，小轩窗，正梳妆。\n相顾无言，惟有泪千行。' },
    { title: '武陵春', author: '李清照', dynasty: '宋', content: '风住尘香花已尽，日晚倦梳头。\n物是人非事事休，欲语泪先流。' },
    { title: '枫桥夜泊', author: '张继', dynasty: '唐', content: '月落乌啼霜满天，江枫渔火对愁眠。\n姑苏城外寒山寺，夜半钟声到客船。' }
  ],
  lamp: [
    { title: '夜雨寄北', author: '李商隐', dynasty: '唐', content: '君问归期未有期，巴山夜雨涨秋池。\n何当共剪西窗烛，却话巴山夜雨时。' },
    { title: '秋夕', author: '杜牧', dynasty: '唐', content: '银烛秋光冷画屏，轻罗小扇扑流萤。\n天阶夜色凉如水，坐看牵牛织女星。' },
    { title: '青玉案·元夕', author: '辛弃疾', dynasty: '宋', content: '东风夜放花千树，更吹落，星如雨。\n众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。' }
  ],
  mirror: [
    { title: '春江花月夜', author: '张若虚', dynasty: '唐', content: '江天一色无纤尘，皎皎空中孤月轮。\n江畔何人初见月？江月何年初照人？' },
    { title: '武陵春', author: '李清照', dynasty: '宋', content: '只恐双溪舴艋舟，载不动许多愁。\n风住尘香花已尽，日晚倦梳头。' },
    { title: '破阵子', author: '辛弃疾', dynasty: '宋', content: '醉里挑灯看剑，梦回吹角连营。\n了却君王天下事，赢得生前身后名。' }
  ],
  sword: [
    { title: '将进酒', author: '李白', dynasty: '唐', content: '天生我材必有用，千金散尽还复来。\n钟鼓馔玉不足贵，但愿长醉不愿醒。' },
    { title: '破阵子', author: '辛弃疾', dynasty: '宋', content: '醉里挑灯看剑，梦回吹角连营。\n八百里分麾下炙，五十弦翻塞外声。' },
    { title: '行路难', author: '李白', dynasty: '唐', content: '停杯投箸不能食，拔剑四顾心茫然。\n长风破浪会有时，直挂云帆济沧海。' }
  ],
  book: [
    { title: '劝学', author: '颜真卿', dynasty: '唐', content: '三更灯火五更鸡，正是男儿读书时。\n黑发不知勤学早，白首方悔读书迟。' },
    { title: '观书有感', author: '朱熹', dynasty: '宋', content: '半亩方塘一鉴开，天光云影共徘徊。\n问渠那得清如许？为有源头活水来。' },
    { title: '示儿', author: '陆游', dynasty: '宋', content: '死去元知万事空，但悲不见九州同。\n王师北定中原日，家祭无忘告乃翁。' }
  ]
};

export function getImageryData(): ImageryData {
  return {
    nodes: JSON.parse(JSON.stringify(imageryNodes)),
    links: JSON.parse(JSON.stringify(imageryLinks))
  };
}

export function filterByEmotion(
  data: ImageryData,
  emotion: EmotionCategory | 'all'
): ImageryData {
  if (emotion === 'all') {
    return JSON.parse(JSON.stringify(data));
  }

  const filteredNodes = data.nodes.filter((node) => node.emotion === emotion);
  const nodeIds = new Set(filteredNodes.map((n) => n.id));

  const filteredLinks = data.links.filter(
    (link) =>
      (typeof link.source === 'string' ? nodeIds.has(link.source) : nodeIds.has((link.source as ImageryNode).id)) &&
      (typeof link.target === 'string' ? nodeIds.has(link.target) : nodeIds.has((link.target as ImageryNode).id))
  );

  return {
    nodes: JSON.parse(JSON.stringify(filteredNodes)),
    links: JSON.parse(JSON.stringify(filteredLinks))
  };
}

export function getPoemsByImagery(imageryId: string): Poem[] {
  return poemsByImagery[imageryId] || [];
}

export function searchImagery(query: string): ImageryNode[] {
  const lowerQuery = query.trim().toLowerCase();
  if (!lowerQuery) return [];

  return imageryNodes.filter(
    (node) =>
      node.name.includes(query) ||
      node.id.toLowerCase().includes(lowerQuery)
  );
}

export function getEmotionLabel(emotion: EmotionCategory): string {
  const labels: Record<EmotionCategory, string> = {
    positive: '积极意象',
    negative: '消极意象',
    neutral: '中性意象'
  };
  return labels[emotion];
}
