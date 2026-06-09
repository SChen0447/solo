import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, '..', 'dist')));

const INSECTS = [
  { id: 'ins-001', name: '蓝闪蝶', scientificName: 'Morpho menelaus', location: '南美洲亚马逊雨林', description: '翅膀呈现梦幻般的金属蓝色，是世界上最美丽的蝴蝶之一。其蓝色并非来自色素，而是翅膀鳞片的微观结构产生的光学效应。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Blue%20Morpho%20butterfly%20specimen%20top%20view%20on%20white%20background%20high%20quality%20macro&image_size=square' },
  { id: 'ins-002', name: '彩虹锹甲', scientificName: 'Phalacrognathus muelleri', location: '澳大利亚东北部', description: '拥有彩虹般绚丽的金属光泽，雄虫大颚发达如鹿角，是收藏家梦寐以求的梦幻甲虫。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Rainbow%20stag%20beetle%20specimen%20top%20view%20iridescent%20colors%20on%20white%20background&image_size=square' },
  { id: 'ins-003', name: '帝王蝶', scientificName: 'Danaus plexippus', location: '北美洲', description: '以每年数千公里的长距离迁徙闻名于世，橙黑相间的翅膀是自然界的奇迹。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Monarch%20butterfly%20specimen%20top%20view%20orange%20black%20wings%20on%20white%20background&image_size=square' },
  { id: 'ins-004', name: '大力士甲虫', scientificName: 'Dynastes hercules', location: '中美洲热带雨林', description: '世界上最长的甲虫之一，雄虫拥有超长胸角，力量惊人，能举起自身体重850倍的物体。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Hercules%20beetle%20specimen%20top%20view%20large%20horn%20on%20white%20background&image_size=square' },
  { id: 'ins-005', name: '月光蝶', scientificName: 'Chrysiridia rhipheus', location: '马达加斯加', description: '马达加斯加岛的特有物种，翅膀上的珍珠光泽在不同角度下会变换颜色，被誉为最美的蛾类。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Madagascar%20moon%20moth%20specimen%20top%20view%20pearl%20iridescent%20wings%20on%20white%20background&image_size=square' },
  { id: 'ins-006', name: '乌桕大蚕蛾', scientificName: 'Attacus atlas', location: '东南亚热带雨林', description: '世界上最大的蛾类之一，翅展可达30厘米，前翅末端形似蛇头，用于威慑天敌。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Atlas%20moth%20giant%20specimen%20top%20view%20snake%20head%20wing%20tips%20on%20white%20background&image_size=square' },
  { id: 'ins-007', name: '吉丁虫', scientificName: 'Sternocera aequisignata', location: '东南亚', description: '鞘翅上的绿金色金属光泽极为华丽，古代人曾将其作为宝石镶嵌在首饰上。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Jewel%20beetle%20specimen%20top%20view%20metallic%20green%20gold%20on%20white%20background&image_size=square' },
  { id: 'ins-008', name: '金龟子', scientificName: 'Protaetia speciosissima', location: '中国南方', description: '体色金绿交辉，是中国最美丽的花金龟之一，常见于花期的花朵上吸食花蜜。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Golden%20rose%20chafer%20beetle%20specimen%20top%20view%20gold%20green%20iridescent%20on%20white%20background&image_size=square' },
  { id: 'ins-009', name: '凤蝶', scientificName: 'Papilio machaon', location: '欧亚大陆', description: '体态优雅，翅膀黄黑相间并点缀蓝色斑点，飞行姿态如凤凰起舞，故名凤蝶。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Swallowtail%20butterfly%20specimen%20top%20view%20yellow%20black%20blue%20on%20white%20background&image_size=square' },
  { id: 'ins-010', name: '象鼻虫', scientificName: 'Eupholus magnificus', location: '新几内亚岛', description: '拥有绿松石般梦幻的蓝绿色金属外壳，是象鼻虫家族中最绚丽的成员之一。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Turquoise%20weevil%20beetle%20specimen%20top%20view%20blue%20green%20scales%20on%20white%20background&image_size=square' },
  { id: 'ins-011', name: '箭环蝶', scientificName: 'Stichophthalma howqua', location: '中国南方及东南亚', description: '翅面有箭状斑纹环绕边缘，体型硕大，飞行缓慢优雅，是雨林中的大型蝴蝶。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Jungle%20queen%20butterfly%20specimen%20top%20view%20large%20brown%20orange%20wings%20on%20white%20background&image_size=square' },
  { id: 'ins-012', name: '萤火虫', scientificName: 'Lamprigera yunnana', location: '中国云南', description: '夜间能发出柔和的绿色荧光，是夏夜浪漫的象征，雌虫通体发光如绿宝石。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Firefly%20beetle%20specimen%20top%20view%20glowing%20abdomen%20on%20dark%20background&image_size=square' },
  { id: 'ins-013', name: '兰花螳螂', scientificName: 'Hymenopus coronatus', location: '马来西亚热带雨林', description: '外形酷似一朵兰花，四条步足如花瓣般展开，是昆虫界拟态进化的巅峰之作。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Orchid%20mantis%20specimen%20top%20view%20pink%20white%20flower%20mimic%20on%20white%20background&image_size=square' },
  { id: 'ins-014', name: '中华大刀螳', scientificName: 'Tenodera sinensis', location: '中国及东亚', description: '中国最常见的大型螳螂，体长可达10厘米，前肢如两把利刀，是农林业益虫。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20mantis%20specimen%20top%20view%20green%20large%20predatory%20insect%20on%20white%20background&image_size=square' },
  { id: 'ins-015', name: '独角仙', scientificName: 'Allomyrina dichotoma', location: '东亚地区', description: '雄性头部有一支雄壮的独角，是最受欢迎的宠物甲虫之一，力大无穷。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Japanese%20rhinoceros%20beetle%20specimen%20top%20view%20single%20horn%20on%20white%20background&image_size=square' },
  { id: 'ins-016', name: '长戟大兜虫', scientificName: 'Dynastes neptunus', location: '南美洲安第斯山脉', description: '胸角长而笔直如古代兵器画戟，是甲虫收藏界的贵族品种。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Neptune%20beetle%20specimen%20top%20view%20long%20horns%20dark%20blue%20sheen%20on%20white%20background&image_size=square' },
  { id: 'ins-017', name: '翠凤蝶', scientificName: 'Papilio bianor', location: '中国及东亚', description: '通体翠绿并泛金属光泽，后翅有蓝紫色新月斑，是春夏时节最常见的美丽蝴蝶。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20peacock%20butterfly%20specimen%20top%20view%20iridescent%20green%20blue%20on%20white%20background&image_size=square' },
  { id: 'ins-018', name: '虎甲', scientificName: 'Cicindela chinensis', location: '中国', description: '拥有老虎般的条纹和强健的大颚，是昆虫界的奔跑健将，捕食凶猛。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Tiger%20beetle%20specimen%20top%20view%20striped%20metallic%20green%20on%20white%20background&image_size=square' },
  { id: 'ins-019', name: '玉带凤蝶', scientificName: 'Papilio polytes', location: '东亚及东南亚', description: '雄蝶翅中部有一列整齐的白色斑点如一条玉带，优雅大方。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Common%20mormon%20butterfly%20specimen%20top%20view%20black%20white%20band%20on%20white%20background&image_size=square' },
  { id: 'ins-020', name: '斑衣蜡蝉', scientificName: 'Lycorma delicatula', location: '中国华北', description: '俗名"花姑娘"，前翅灰色带斑点，后翅鲜艳的红色与黑色，跳跃如飞。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Spotted%20lanternfly%20specimen%20top%20view%20colorful%20red%20black%20wings%20on%20white%20background&image_size=square' },
  { id: 'ins-021', name: '竹节虫', scientificName: 'Phryganistria chinensis', location: '中国广西', description: '世界上最长的昆虫之一，体长可达62厘米，拟态竹枝惟妙惟肖。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Giant%20stick%20insect%20specimen%20top%20view%20long%20slender%20brown%20on%20white%20background&image_size=square' },
  { id: 'ins-022', name: '帝王蝎', scientificName: 'Pandinus imperator', location: '非洲热带雨林', description: '世界上最大的蝎子之一，通体漆黑，钳子巨大有力，在紫外线下会发出幽蓝荧光。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Emperor%20scorpion%20specimen%20top%20view%20large%20black%20glossy%20on%20white%20background&image_size=square' },
  { id: 'ins-023', name: '金梳龟甲', scientificName: 'Aspidomorpha sanctaecrucis', location: '东南亚', description: '鞘翅半透明如黄金梳篦，中央有十字架形斑纹，被称为"圣甲虫"。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Golden%20tortoise%20beetle%20specimen%20top%20view%20transparent%20gold%20shell%20on%20white%20background&image_size=square' },
  { id: 'ins-024', name: '阳彩臂金龟', scientificName: 'Cheirotonus jansoni', location: '中国南方', description: '中国国家二级保护动物，雄虫前足极长超过身体，鞘翅泛金绿色金属光泽。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Long%20arm%20scarab%20beetle%20specimen%20top%20view%20metallic%20green%20on%20white%20background&image_size=square' },
  { id: 'ins-025', name: '太阳蛾', scientificName: 'Chrysiridia croesus', location: '坦桑尼亚', description: '翅膀如同彩虹般绚丽，从金黄到深红再到紫色的渐变色，被誉为"非洲的太阳"。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=African%20sunset%20moth%20specimen%20top%20view%20rainbow%20iridescent%20on%20white%20background&image_size=square' },
  { id: 'ins-026', name: '叩甲', scientificName: 'Campsosternus auratus', location: '中国南方', description: '俗称"叩头虫"，金属蓝绿色外观，遇险时会弹跳翻身发出"咔嗒"声。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Click%20beetle%20specimen%20top%20view%20metallic%20blue%20green%20on%20white%20background&image_size=square' },
  { id: 'ins-027', name: '美洲大螽斯', scientificName: 'Panacanthus cuspidatus', location: '南美洲亚马逊', description: '俗称"丛林之王螽斯"，头部有尖刺，体型巨大，是螽斯中的王者。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Giant%20spiny%20katydid%20specimen%20top%20view%20green%20spikes%20on%20white%20background&image_size=square' },
  { id: 'ins-028', name: '红翅裸花天牛', scientificName: 'Anoplodera rufipennis', location: '中国东北', description: '鞘翅赤红如火焰，身体修长，是森林中最艳丽的天牛种类之一。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Red%20winged%20longhorn%20beetle%20specimen%20top%20view%20bright%20red%20elytra%20on%20white%20background&image_size=square' },
  { id: 'ins-029', name: '青蜂', scientificName: 'Chrysis shanghaiensis', location: '中国上海', description: '身体如青金宝石般闪耀，俗称"杜鹃蜂"，将卵产在其他蜂类的巢中。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Cuckoo%20wasp%20specimen%20top%20view%20metallic%20blue%20green%20iridescent%20on%20white%20background&image_size=square' },
  { id: 'ins-030', name: '大蜻蜓', scientificName: 'Anotogaster sieboldii', location: '东亚', description: '中国最大的蜻蜓种类之一，翅展可达12厘米，飞行速度快，捕食蚊虫的空中猎手。', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Giant%20dragonfly%20specimen%20top%20view%20large%20transparent%20wings%20on%20white%20background&image_size=square' }
];

app.get('/api/insects', (req, res) => {
  res.json(INSECTS);
});

app.post('/api/save', (req, res) => {
  try {
    const dataPath = join(__dirname, 'data.json');
    const userData = req.body;
    let existingData = {};
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      existingData = JSON.parse(raw);
    }
    existingData[userData.username] = userData;
    fs.writeFileSync(dataPath, JSON.stringify(existingData, null, 2), 'utf-8');
    res.json({ success: true, message: '数据保存成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '保存失败: ' + error.message });
  }
});

app.get('/api/load/:username', (req, res) => {
  try {
    const dataPath = join(__dirname, 'data.json');
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const allData = JSON.parse(raw);
      const userData = allData[req.params.username];
      if (userData) {
        res.json({ success: true, data: userData });
      } else {
        res.json({ success: false, message: '用户数据不存在' });
      }
    } else {
      res.json({ success: false, message: '数据文件不存在' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '读取失败: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`虚拟昆虫博物馆后端服务运行在 http://localhost:${PORT}`);
});
