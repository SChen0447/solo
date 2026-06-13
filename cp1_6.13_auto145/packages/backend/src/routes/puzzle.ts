import { Router, Request, Response } from 'express';

const router = Router();

interface Puzzle {
  id: number;
  name: string;
  question: string;
  answer: string;
  unlocked: boolean;
  painting: string;
  description: string;
}

const puzzles: Puzzle[] = [
  {
    id: 1,
    name: '谜·壹',
    question: '楚地将士渡河去，沉船砸锅无退路。背水一战成绝唱，何人破釜志如铁？',
    answer: '破釜沉舟',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20general%20breaking%20cauldrons%20at%20river%20ancient%20battle%20dramatic%20scene%20Song%20dynasty%20style&image_size=square',
    description: '秦末农民起义中，项羽率军渡漳水救赵，命将士沉船、砸锅，断绝退路，以示必死决心。此战大破秦军，成就千古传奇。破釜沉舟此后成为形容不留退路、拼死一搏的经典成语。'
  },
  {
    id: 2,
    name: '谜·贰',
    question: '越王忍辱归故国，柴草为床苦胆尝。十年生聚终雪耻，此志谁人能比肩？',
    answer: '卧薪尝胆',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20king%20sleeping%20on%20brushwood%20tasting%20bile%20ancient%20chamber%20Ming%20dynasty%20style&image_size=square',
    description: '春秋时期，越王勾践被吴国打败后忍辱为奴，归国后以柴草为床、每日舔尝苦胆，时刻不忘亡国之耻。经十年励精图治，终灭吴复仇。卧薪尝胆遂成忍辱负重、发愤图强之典范。'
  },
  {
    id: 3,
    name: '谜·叁',
    question: '饱读兵书论战法，长平一役误苍生。空有理论无实战，赵国何人祸社稷？',
    answer: '纸上谈兵',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20scholar%20reading%20military%20maps%20war%20tent%20paper%20strategy%20traditional&image_size=square',
    description: '战国时期赵国将领赵括，自幼熟读兵书却无实战经验，长平之战中替代廉颇为主将，照搬兵书理论指挥作战，导致赵军四十万将士被秦将白起坑杀，赵国从此一蹶不振。此成语讽刺空谈理论不切实际。'
  },
  {
    id: 4,
    name: '谜·肆',
    question: '垓下月夜闻乡音，楚军将士尽离散。英雄末路悲歌起，谁人突围终不还？',
    answer: '四面楚歌',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20surrounded%20soldiers%20hearing%20enemy%20songs%20moonlit%20battlefield%20desolate&image_size=square',
    description: '楚汉相争末期，汉军将项羽围困于垓下，夜间在四面唱起楚地民歌。项羽闻之以为楚地尽失，军心瓦解，将士纷纷逃散。项羽突围至乌江边自刎而亡。四面楚歌比喻陷入四面受敌、孤立无援的绝境。'
  },
  {
    id: 5,
    name: '谜·伍',
    question: '赵国危殆求援兵，齐军不赴邯郸城。直取敌都逼回师，何人妙计解重围？',
    answer: '围魏救赵',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20strategic%20military%20formation%20siege%20warfare%20classical%20brush%20style&image_size=square',
    description: '战国时期魏国围攻赵国都城邯郸，赵向齐求救。齐国军师孙膑不直接赴赵，反而率军直攻魏国都城大梁，魏军被迫回师自救，赵围遂解。此计避实击虚、攻其所必救，成为三十六计中的经典策略。'
  },
  {
    id: 6,
    name: '谜·陆',
    question: '秦王欲以城换玉，赵使据理不辱命。何人智勇全璧归，廷斥强秦显风骨？',
    answer: '完璧归赵',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20jade%20bi%20presented%20to%20king%20ancient%20palace%20elegant%20brushwork&image_size=square',
    description: '战国时期秦昭王提出以十五城换取赵国和氏璧，赵国使臣蔺相如携璧赴秦，发现秦王无意割城，便以智勇将和氏璧完好无损地送回赵国。完璧归赵后比喻把原物完好无损地归还本人，也赞誉机智勇敢的外交风范。'
  },
  {
    id: 7,
    name: '谜·柒',
    question: '老将身背荆条去，登门谢罪化恩仇。将相和好赵国安，何人知错能自省？',
    answer: '负荆请罪',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20general%20carrying%20thorn%20branches%20humble%20garden%20ancient%20Chinese&image_size=square',
    description: '战国时期赵国名将廉颇因不满蔺相如位高于己，屡次挑衅。蔺相如以国事为重处处忍让，廉颇得知后深感惭愧，赤裸上身背负荆条登门请罪，二人遂成刎颈之交。负荆请罪后表示真诚认错、主动道歉之意。'
  },
  {
    id: 8,
    name: '谜·捌',
    question: '赵国危难求楚援，门客挺身随使行。殿上陈词定盟约，何人自荐显奇才？',
    answer: '毛遂自荐',
    unlocked: false,
    painting: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20ink%20painting%20scholar%20stepping%20forward%20ancient%20court%20confident%20traditional%20style&image_size=square',
    description: '战国时期赵国平原君赴楚求援抗秦，门客毛遂主动推荐自己随行。在楚国朝堂上，毛遂凭借出色的辩才和勇气，说服楚王出兵救赵，促成楚赵合纵联盟。毛遂自荐后比喻自告奋勇、自我推荐担当重任。'
  }
];

router.get('/', (_req: Request, res: Response) => {
  const list = puzzles.map(({ answer, painting, description, ...rest }) => rest);
  res.json({ puzzles: list });
});

router.post('/:id/verify', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { answer } = req.body;

  const puzzle = puzzles.find(p => p.id === id);
  if (!puzzle) {
    res.status(404).json({ correct: false, painting: '', description: '' });
    return;
  }

  if (answer && puzzle.answer === answer.trim()) {
    puzzle.unlocked = true;
    res.json({ correct: true, painting: puzzle.painting, description: puzzle.description });
  } else {
    res.json({ correct: false, painting: '', description: '' });
  }
});

export default router;
