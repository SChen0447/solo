import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const constellations = [
  { id: 'big_dipper', name: '北斗七星', stars: 7 },
  { id: 'orion', name: '猎户座', stars: 7 },
  { id: 'andromeda', name: '仙女座', stars: 6 },
  { id: 'scorpius', name: '天蝎座', stars: 8 },
  { id: 'leo', name: '狮子座', stars: 7 },
  { id: 'cygnus', name: '天鹅座', stars: 6 },
  { id: 'lyra', name: '天琴座', stars: 5 },
  { id: 'aquila', name: '天鹰座', stars: 6 },
];

const starNames = [
  '天狼星', '老人星', '南门二', '大角星', '织女一', '五车二', '参宿七', '南河三',
  '参宿四', '水委一', '马腹一', '河鼓二', '毕宿五', '十字架二', '心宿二', '角宿一',
  '北河三', '北落师门', '天津四', '轩辕十四', '尾宿八', '南十字座', '箕宿三',
  '弧矢七', '北河二', '天津九', '参宿五', '天枢', '天璇', '天玑', '天权',
  '玉衡', '开阳', '摇光', '帝星', '太子', '勾陈一', '天乙', '太乙',
  '紫微左垣', '紫微右垣', '太微左垣', '太微右垣', '天市左垣', '天市右垣',
  '文昌', '文曲', '武曲', '廉贞', '破军', '贪狼', '巨门', '禄存',
];

const ancientNames = [
  ['辰星', '启明', '长庚'],
  ['荧惑', '朱雀'],
  ['镇星', '后土'],
  ['太白', '白帝'],
  ['辰星', '玄武'],
  ['岁星', '青龙'],
  ['填星', '黄帝'],
];

const stories = [
  '相传此星为天帝之孙，掌管人间文运，凡科举及第者，皆为此星照耀。古人认为，梦见此星则文章大进，仕途顺遂。',
  '此星乃二十八宿之一，为东方苍龙之心宿。传说中，心宿二为天帝之孙，主司风雨，能兴云致雨，润泽万物。',
  '古时称为"启明"，日出前现于东方，又名"长庚"，日落后现于西方。诗人李白有诗云："孤猿坐啼坟上月，且须一尽杯中酒。"',
  '此星为北斗七星之魁，主司寿命。古人认为，北斗注死，南斗注生，凡人之生死寿夭，皆由此星所掌。',
  '相传织女为天帝之孙女，因思凡下界，与牛郎结为夫妇。后被天帝追回，隔于银河两岸，每年七夕鹊桥相会。',
  '此星为猎户座之腰带三星中央，又名"参宿一"。传说中，参星与商星永不相见，人生聚散无常，令人感叹。',
  '古代天文学家称之为"北辰"，为众星之主。孔子曰："为政以德，譬如北辰，居其所而众星共之。"象征帝王之尊。',
  '此星为天蝎座之心宿，又称"大火"。古时设有"火正"之官，专门观测此星，以定农时。《诗经》云："七月流火，九月授衣。"',
  '此星为银河畔之亮星，与牛郎星隔河相望。民间传说，七夕之夜，喜鹊搭桥，牛郎织女得以相会，倾诉相思之苦。',
  '古人认为此星主司文运，又名"文曲星"。相传包拯、范仲淹等名臣，皆为文曲星下凡，辅佐明君，治理天下。',
];

const spectrumTypes = ['O', 'B', 'A', 'K', 'M'];

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStars(count) {
  const stars = [];
  
  for (let i = 0; i < count; i++) {
    const ra = randomInRange(0, Math.PI * 2);
    const dec = randomInRange(-Math.PI / 2, Math.PI / 2);
    const magnitude = randomInRange(-1.5, 6);
    const spectrum = pickRandom(spectrumTypes);
    const constellation = pickRandom(constellations);
    
    const nameIndex = i < starNames.length ? i : Math.floor(Math.random() * starNames.length);
    
    stars.push({
      id: `star_${i.toString().padStart(5, '0')}`,
      name: i < starNames.length ? starNames[i] : `星${i}`,
      ra,
      dec,
      magnitude,
      spectrum,
      constellation: constellation.id,
      constellationName: constellation.name,
      ancientNames: pickRandom(ancientNames),
      story: pickRandom(stories),
    });
  }
  
  return stars;
}

function generateConstellationData(stars) {
  return constellations.map((constellation, idx) => {
    const constellationStars = stars
      .filter(s => s.constellation === constellation.id)
      .slice(0, constellation.stars + 2);
    
    if (constellationStars.length < 3) {
      for (let i = 0; i < constellation.stars; i++) {
        const star = stars[idx * 50 + i];
        if (star) {
          star.constellation = constellation.id;
          star.constellationName = constellation.name;
          constellationStars.push(star);
        }
      }
    }
    
    return {
      id: constellation.id,
      name: constellation.name,
      stars: constellationStars.slice(0, constellation.stars).map(s => s.id),
      centerStarIndex: Math.floor(constellation.stars / 2),
    };
  });
}

const stars = generateStars(2000);
const constellationsData = generateConstellationData(stars);

const data = {
  stars,
  constellations: constellationsData,
};

const outputPath = path.join(__dirname, '..', 'public', 'static', 'stars.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`Generated ${stars.length} stars and ${constellationsData.length} constellations`);
console.log(`Output: ${outputPath}`);
