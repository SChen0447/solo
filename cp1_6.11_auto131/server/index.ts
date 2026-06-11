import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Book {
  id: string;
  title: string;
  type: '经' | '史' | '子' | '集';
  fragmentsRequired: number[];
  description: string;
  content: string;
  coverColor: string;
}

const booksDatabase: Book[] = [
  {
    id: 'book-1',
    title: '论语',
    type: '经',
    fragmentsRequired: [1, 3, 5],
    description: '孔子及其弟子的言行录，儒家经典之首',
    content: '子曰："学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？"\n\n有子曰："其为人也孝弟，而好犯上者，鲜矣；不好犯上，而好作乱者，未之有也。君子务本，本立而道生。孝弟也者，其为仁之本与！"\n\n子曰："巧言令色，鲜矣仁！"\n\n曾子曰："吾日三省吾身：为人谋而不忠乎？与朋友交而不信乎？传不习乎？"\n\n子曰："道千乘之国，敬事而信，节用而爱人，使民以时。"\n\n子曰："弟子入则孝，出则悌，谨而信，泛爱众，而亲仁。行有余力，则以学文。"',
    coverColor: '#8B0000'
  },
  {
    id: 'book-2',
    title: '史记',
    type: '史',
    fragmentsRequired: [2, 4, 6, 8],
    description: '司马迁所著，中国第一部纪传体通史',
    content: '太史公曰：先人有言："自周公卒五百岁而有孔子。孔子卒后至于今五百岁，有能绍明世，正易传，继春秋，本诗书礼乐之际？"意在斯乎！意在斯乎！小子何敢让焉。\n\n上大夫壶遂曰："昔孔子何为而作春秋哉？"太史公曰："余闻董生曰：周道衰废，孔子为鲁司寇，诸侯害之，大夫壅之。孔子知言之不用，道之不行也，是非二百四十二年之中，以为天下仪表，贬天子，退诸侯，讨大夫，以达王事而已矣。"',
    coverColor: '#4B0082'
  },
  {
    id: 'book-3',
    title: '道德经',
    type: '子',
    fragmentsRequired: [1, 2, 7],
    description: '老子所著道家经典，阐述无为而治的思想',
    content: '道可道，非常道；名可名，非常名。无名，天地之始；有名，万物之母。故常无欲，以观其妙；常有欲，以观其徼。此两者同出而异名，同谓之玄。玄之又玄，众妙之门。\n\n天下皆知美之为美，斯恶已；皆知善之为善，斯不善已。故有无相生，难易相成，长短相形，高下相倾，音声相和，前后相随。是以圣人处无为之事，行不言之教，万物作焉而不辞，生而不有，为而不恃，功成而弗居。夫唯弗居，是以不去。',
    coverColor: '#2F4F4F'
  },
  {
    id: 'book-4',
    title: '诗经',
    type: '集',
    fragmentsRequired: [3, 5, 9, 10],
    description: '中国最早的诗歌总集，收录西周至春秋的诗歌',
    content: '关关雎鸠，在河之洲。窈窕淑女，君子好逑。\n参差荇菜，左右流之。窈窕淑女，寤寐求之。\n求之不得，寤寐思服。悠哉悠哉，辗转反侧。\n参差荇菜，左右采之。窈窕淑女，琴瑟友之。\n参差荇菜，左右芼之。窈窕淑女，钟鼓乐之。\n\n蒹葭苍苍，白露为霜。所谓伊人，在水一方。\n溯洄从之，道阻且长。溯游从之，宛在水中央。',
    coverColor: '#556B2F'
  },
  {
    id: 'book-5',
    title: '孟子',
    type: '经',
    fragmentsRequired: [2, 5, 8],
    description: '孟子及其弟子的政治、教育、哲学等思想',
    content: '孟子见梁惠王。王曰："叟！不远千里而来，亦将有以利吾国乎？"\n\n孟子对曰："王！何必曰利？亦有仁义而已矣。王曰何以利吾国？大夫曰何以利吾家？士庶人曰何以利吾身？上下交征利而国危矣。万乘之国，弑其君者，必千乘之家；千乘之国，弑其君者，必百乘之家。万取千焉，千取百焉，不为不多矣。苟为后义而先利，不夺不餍。未有仁而遗其亲者也，未有义而后其君者也。王亦曰仁义而已矣，何必曰利？"',
    coverColor: '#800000'
  },
  {
    id: 'book-6',
    title: '资治通鉴',
    type: '史',
    fragmentsRequired: [1, 4, 6, 7, 9],
    description: '司马光主编的编年体通史，记载16朝历史',
    content: '臣光曰：臣闻天子之职莫大于礼，礼莫大于分，分莫大于名。何谓礼？纪纲是也；何谓分？君臣是也；何谓名？公、侯、卿、大夫是也。夫以四海之广，兆民之众，受制于一人，虽有绝伦之力，高世之智，莫敢不奔走而服役者，岂非以礼为之纲纪哉！是故天子统三公，三公率诸侯，诸侯制卿大夫，卿大夫治士庶人。贵以临贱，贱以承贵。',
    coverColor: '#483D8B'
  },
  {
    id: 'book-7',
    title: '庄子',
    type: '子',
    fragmentsRequired: [3, 6, 8, 10],
    description: '庄子及其后学的道家著作，充满哲学思辨',
    content: '北冥有鱼，其名为鲲。鲲之大，不知其几千里也。化而为鸟，其名为鹏。鹏之背，不知其几千里也。怒而飞，其翼若垂天之云。是鸟也，海运则将徙于南冥。南冥者，天池也。\n\n《齐谐》者，志怪者也。《谐》之言曰："鹏之徙于南冥也，水击三千里，抟扶摇而上者九万里，去以六月息者也。"野马也，尘埃也，生物之以息相吹也。天之苍苍，其正色邪？其远而无所至极邪？其视下也，亦若是则已矣。',
    coverColor: '#1C3A3A'
  },
  {
    id: 'book-8',
    title: '楚辞',
    type: '集',
    fragmentsRequired: [1, 5, 7, 10],
    description: '屈原等人的诗歌集，开创了浪漫主义文学传统',
    content: '帝高阳之苗裔兮，朕皇考曰伯庸。\n摄提贞于孟陬兮，惟庚寅吾以降。\n皇览揆余初度兮，肇锡余以嘉名：\n名余曰正则兮，字余曰灵均。\n\n纷吾既有此内美兮，又重之以修能。\n扈江离与辟芷兮，纫秋兰以为佩。\n汩余若将不及兮，恐年岁之不吾与。\n朝搴阰之木兰兮，夕揽洲之宿莽。\n日月忽其不淹兮，春与秋其代序。\n惟草木之零落兮，恐美人之迟暮。',
    coverColor: '#6B4423'
  },
  {
    id: 'book-9',
    title: '周易',
    type: '经',
    fragmentsRequired: [2, 3, 7, 8, 9],
    description: '群经之首，大道之源，包含深邃的哲学智慧',
    content: '天行健，君子以自强不息。\n\n地势坤，君子以厚德载物。\n\n《乾》：元、亨、利、贞。\n\n初九：潜龙，勿用。\n九二：见龙在田，利见大人。\n九三：君子终日乾乾，夕惕若厉，无咎。\n九四：或跃在渊，无咎。\n九五：飞龙在天，利见大人。\n上九：亢龙，有悔。\n用九：见群龙无首，吉。\n\n《彖》曰：大哉乾元，万物资始，乃统天。云行雨施，品物流形。大明终始，六位时成。时乘六龙以御天。乾道变化，各正性命。保合大和，乃利贞。首出庶物，万国咸宁。',
    coverColor: '#A0522D'
  },
  {
    id: 'book-10',
    title: '汉书',
    type: '史',
    fragmentsRequired: [1, 6, 8, 10],
    description: '班固所著，中国第一部纪传体断代史',
    content: '汉之始祖，出自帝尧之苗裔，曰刘累。在夏御龙，在商为豕韦氏，在周为唐杜氏。晋主夏盟，为范氏，其处秦者为刘氏。\n\n及周之衰，范氏自晋归秦，归而处于丰，生明，明生远，远生阳。十世孙，战国时为秦大夫，获于魏，遂为魏人。秦灭魏，迁大梁，都于丰。故周市说雍齿曰："丰，故梁徙也。"\n\n是以颂高祖云："汉帝本系，出自唐帝。降及于周，在秦作刘。涉魏而东，遂为丰公。"丰公，盖太上皇父。其迁日浅，坟墓在丰鲜焉。',
    coverColor: '#5C4033'
  },
  {
    id: 'book-11',
    title: '韩非子',
    type: '子',
    fragmentsRequired: [2, 4, 5, 9],
    description: '韩非所著法家思想集大成之作',
    content: '上古之世，人民少而禽兽众，人民不胜禽兽虫蛇。有圣人作，构木为巢以避群害，而民悦之，使王天下，号之曰有巢氏。民食果蓏蚌蛤，腥臊恶臭而伤害腹胃，民多疾病。有圣人作，钻燧取火以化腥臊，而民说之，使王天下，号之曰燧人氏。\n\n中古之世，天下大水，而鲧禹决渎。近古之世，桀纣暴乱，而汤武征伐。今有构木钻燧于夏后氏之世者，必为鲧禹笑矣；有决渎于殷周之世者，必为汤武笑矣。',
    coverColor: '#2C3E50'
  },
  {
    id: 'book-12',
    title: '乐府诗集',
    type: '集',
    fragmentsRequired: [3, 4, 6, 7],
    description: '收录汉魏至唐五代的乐府歌辞',
    content: '唧唧复唧唧，木兰当户织。不闻机杼声，唯闻女叹息。\n\n问女何所思，问女何所忆。女亦无所思，女亦无所忆。昨夜见军帖，可汗大点兵，军书十二卷，卷卷有爷名。阿爷无大儿，木兰无长兄，愿为市鞍马，从此替爷征。\n\n东市买骏马，西市买鞍鞯，南市买辔头，北市买长鞭。旦辞爷娘去，暮宿黄河边，不闻爷娘唤女声，但闻黄河流水鸣溅溅。旦辞黄河去，暮至黑山头，不闻爷娘唤女声，但闻燕山胡骑鸣啾啾。',
    coverColor: '#704214'
  },
  {
    id: 'book-13',
    title: '尚书',
    type: '经',
    fragmentsRequired: [1, 2, 10],
    description: '上古历史文献和部分追述古代事迹的汇编',
    content: '曰若稽古，帝尧曰放勋，钦明文思安安，允恭克让，光被四表，格于上下。克明俊德，以亲九族。九族既睦，平章百姓。百姓昭明，协和万邦。黎民于变时雍。\n\n乃命羲和，钦若昊天，历象日月星辰，敬授民时。分命羲仲，宅嵎夷，曰旸谷。寅宾出日，平秩东作。日中，星鸟，以殷仲春。厥民析，鸟兽孳尾。申命羲叔，宅南交。平秩南讹，敬致。日永，星火，以正仲夏。厥民因，鸟兽希革。',
    coverColor: '#8B4513'
  },
  {
    id: 'book-14',
    title: '三国志',
    type: '史',
    fragmentsRequired: [3, 5, 7, 8, 9],
    description: '陈寿所著，记载三国时期历史的纪传体史书',
    content: '太祖武皇帝，沛国谯人也，姓曹，讳操，字孟德，汉相国参之后。桓帝世，曹腾为中常侍大长秋，封费亭侯。养子嵩嗣，官至太尉，莫能审其生出本末。嵩生太祖。\n\n太祖少机警，有权数，而任侠放荡，不治行业，故世人未之奇也；惟梁国桥玄、南阳何颙异焉。玄谓太祖曰："天下将乱，非命世之才不能济也，能安之者，其在君乎！"\n\n年二十，举孝廉为郎，除洛阳北部尉，迁顿丘令，征拜议郎。',
    coverColor: '#654321'
  },
  {
    id: 'book-15',
    title: '列子',
    type: '子',
    fragmentsRequired: [1, 4, 5, 6],
    description: '列御寇所著，包含许多寓言故事和哲学思想',
    content: '子列子居郑圃，四十年人无识者。国君卿大夫视之，犹众庶也。国不足，将嫁于卫。弟子曰："先生往无反期，弟子敢有所谒，先生将何以教？先生不闻壶丘子林之言乎？"\n\n子列子笑曰："壶子何言哉？虽然，夫子尝语伯昏瞀人，吾侧闻之，试以告女。其言曰：有生不生，有化不化。不生者能生生，不化者能化化。生者不能不生，化者不能不化，故常生常化。常生常化者，无时不生，无时不化。阴阳尔，四时尔，不生者疑独，不化者往复。往复，其际不可终；疑独，其道不可穷。"',
    coverColor: '#3D5C5C'
  },
  {
    id: 'book-16',
    title: '文选',
    type: '集',
    fragmentsRequired: [2, 6, 8, 10],
    description: '萧统主编，中国现存最早的诗文总集',
    content: '式观元始，眇觌玄风，冬穴夏巢之时，茹毛饮血之世，世质民淳，斯文未作。逮乎伏羲氏之王天下也，始画八卦，造书契，以代结绳之政，由是文籍生焉。\n\n《易》曰："观乎天文，以察时变；观乎人文，以化成天下。"文之时义，远矣哉！若夫椎轮为大辂之始，大辂宁有椎轮之质；增冰为积水所成，积水曾微增冰之凛。何哉？盖踵其事而增华，变其本而加厉。物既有之，文亦宜然。随时变改，难可详悉。',
    coverColor: '#8B7355'
  },
  {
    id: 'book-17',
    title: '礼记',
    type: '经',
    fragmentsRequired: [3, 6, 9, 10],
    description: '儒家经典之一，记载各种礼仪制度',
    content: '大学之道，在明明德，在亲民，在止于至善。知止而后有定，定而后能静，静而后能安，安而后能虑，虑而后能得。物有本末，事有终始。知所先后，则近道矣。\n\n古之欲明明德于天下者，先治其国；欲治其国者，先齐其家；欲齐其家者，先修其身；欲修其身者，先正其心；欲正其心者，先诚其意；欲诚其意者，先致其知；致知在格物。\n\n物格而后知至，知至而后意诚，意诚而后心正，心正而后身修，身修而后家齐，家齐而后国治，国治而后天下平。',
    coverColor: '#7B3F00'
  },
  {
    id: 'book-18',
    title: '后汉书',
    type: '史',
    fragmentsRequired: [2, 5, 7, 8],
    description: '范晔所著，记载东汉历史的纪传体史书',
    content: '世祖光武皇帝讳秀，字文叔，南阳蔡阳人，高祖九世之孙也，出自景帝生长沙定王发。发生舂陵节侯买，买生郁林太守外，外生巨鹿都尉回，回生南顿令钦，钦生光武。\n\n光武年九岁而孤，养于叔父良。身长七尺三寸，美须眉，大口，隆准，日角。性勤于稼穑，而兄伯升好侠养士，常非笑光武事田业，比之高祖兄仲。\n\n王莽天凤中，乃之长安，受尚书，略通大义。莽末，天下连岁灾蝗，寇盗锋起。地皇三年，南阳荒饥，诸家宾客多为小盗。光武避吏新野，因卖谷于宛。',
    coverColor: '#3E2723'
  }
];

const bookSpiritComments: Record<string, string[]> = {
  '经': [
    '此经乃圣人遗训，得之者可明理修身，善哉善哉！',
    '经典永流传，此书蕴含千年智慧，当以诚心读之。',
    '经书在手，天下我有。此乃镇宅之宝，恭喜道友！'
  ],
  '史': [
    '以史为鉴，可以知兴替。此书乃史家绝唱！',
    '读史使人明智，此书记载千古风云，得之甚幸。',
    '悠悠青史，多少英雄。此书值得反复品读！'
  ],
  '子': [
    '诸子百家，各领风骚。此书记载哲人深思，妙不可言！',
    '子书乃智慧源泉，读之可开悟增智，善莫大焉。',
    '道术并济，此书蕴含天地至理，愿君细品之。'
  ],
  '集': [
    '诗文风雅，集其大成。此书可陶冶情操，提升境界！',
    '辞藻华美，意境深远，此乃文学瑰宝也！',
    '吟咏之间，感怀千年。得此集者，福缘深厚！'
  ]
};

interface ExchangeRequest {
  bookId: string;
  fragmentIds: number[];
}

interface ExchangeResponse {
  success: boolean;
  book?: Book;
  comment?: string;
  message?: string;
}

app.get('/api/books', (_req: Request, res: Response) => {
  res.json(booksDatabase);
});

app.get('/api/recommend', (req: Request, res: Response) => {
  const ownedTypes = req.query.ownedTypes as string;
  const ownedIds = (req.query.ownedIds as string)?.split(',') || [];
  
  let typeToRecommend: '经' | '史' | '子' | '集';
  
  if (ownedTypes) {
    const typeArray = ownedTypes.split(',');
    const types: Array<'经' | '史' | '子' | '集'> = ['经', '史', '子', '集'];
    const typeCount = types.map(t => ({ type: t, count: typeArray.filter(x => x === t).length }));
    const minType = typeCount.reduce((min, curr) => curr.count < min.count ? curr : min);
    typeToRecommend = minType.type;
  } else {
    const allTypes: Array<'经' | '史' | '子' | '集'> = ['经', '史', '子', '集'];
    typeToRecommend = allTypes[Math.floor(Math.random() * allTypes.length)];
  }
  
  let candidates = booksDatabase.filter(b => b.type === typeToRecommend && !ownedIds.includes(b.id));
  
  if (candidates.length === 0) {
    candidates = booksDatabase.filter(b => !ownedIds.includes(b.id));
  }
  
  if (candidates.length === 0) {
    res.json({ message: '您已收藏所有古籍！' });
    return;
  }
  
  const recommended = candidates[Math.floor(Math.random() * candidates.length)];
  const comments = bookSpiritComments[recommended.type];
  const comment = comments[Math.floor(Math.random() * comments.length)];
  
  res.json({
    book: recommended,
    comment,
    cost: 3,
    recommendation: `小书灵发现您似乎对「${recommended.type}」部书籍兴趣盎然，特为您推荐此册，只需3枚通用碎片即可获得！`
  });
});

app.post('/api/exchange', (req: Request, res: Response) => {
  const { bookId, fragmentIds }: ExchangeRequest = req.body;
  
  const book = booksDatabase.find(b => b.id === bookId);
  
  if (!book) {
    res.json({ success: false, message: '未找到该古籍' });
    return;
  }
  
  const requiredSet = new Set(book.fragmentsRequired);
  const providedSet = new Set(fragmentIds);
  
  let allMatch = true;
  for (const required of requiredSet) {
    if (!providedSet.has(required)) {
      allMatch = false;
      break;
    }
  }
  
  if (fragmentIds.length !== book.fragmentsRequired.length) {
    allMatch = false;
  }
  
  if (!allMatch) {
    res.json({ 
      success: false, 
      message: `碎片不匹配！需要 ${book.fragmentsRequired.length} 枚特定碎片：${book.fragmentsRequired.join('、')} 号` 
    });
    return;
  }
  
  const comments = bookSpiritComments[book.type];
  const comment = comments[Math.floor(Math.random() * comments.length)];
  
  res.json({
    success: true,
    book,
    comment,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`古籍兑换市集服务器运行在 http://localhost:${PORT}`);
});
