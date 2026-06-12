import React, { useState, useEffect, useCallback, useRef } from 'react';
import FlipCard, { Poem } from './components/FlipCard';

const POEMS: Poem[] = [
  { content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', author: '李白', title: '静夜思' },
  { content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', author: '孟浩然', title: '春晓' },
  { content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。', author: '王之涣', title: '登鹳雀楼' },
  { content: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。', author: '李绅', title: '悯农' },
  { content: '离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。', author: '白居易', title: '赋得古原草送别' },
  { content: '红豆生南国，春来发几枝。愿君多采撷，此物最相思。', author: '王维', title: '相思' },
  { content: '独在异乡为异客，每逢佳节倍思亲。', author: '王维', title: '九月九日忆山东兄弟' },
  { content: '明月几时有，把酒问青天。不知天上宫阙，今夕是何年。', author: '苏轼', title: '水调歌头' },
  { content: '但愿人长久，千里共婵娟。', author: '苏轼', title: '水调歌头' },
  { content: '人生若只如初见，何事秋风悲画扇。', author: '纳兰性德', title: '木兰词' },
  { content: '曾经沧海难为水，除却巫山不是云。', author: '元稹', title: '离思' },
  { content: '两情若是久长时，又岂在朝朝暮暮。', author: '秦观', title: '鹊桥仙' },
  { content: '衣带渐宽终不悔，为伊消得人憔悴。', author: '柳永', title: '蝶恋花' },
  { content: '问君能有几多愁，恰似一江春水向东流。', author: '李煜', title: '虞美人' },
  { content: '春花秋月何时了，往事知多少。', author: '李煜', title: '虞美人' },
  { content: '大漠孤烟直，长河落日圆。', author: '王维', title: '使至塞上' },
  { content: '海内存知己，天涯若比邻。', author: '王勃', title: '送杜少府之任蜀州' },
  { content: '会当凌绝顶，一览众山小。', author: '杜甫', title: '望岳' },
  { content: '国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。', author: '杜甫', title: '春望' },
  { content: '好雨知时节，当春乃发生。随风潜入夜，润物细无声。', author: '杜甫', title: '春夜喜雨' },
  { content: '千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。', author: '柳宗元', title: '江雪' },
  { content: '落霞与孤鹜齐飞，秋水共长天一色。', author: '王勃', title: '滕王阁序' },
  { content: '醉翁之意不在酒，在乎山水之间也。', author: '欧阳修', title: '醉翁亭记' },
  { content: '先天下之忧而忧，后天下之乐而乐。', author: '范仲淹', title: '岳阳楼记' },
  { content: '出淤泥而不染，濯清涟而不妖。', author: '周敦颐', title: '爱莲说' },
  { content: '人生自古谁无死，留取丹心照汗青。', author: '文天祥', title: '过零丁洋' },
  { content: '山重水复疑无路，柳暗花明又一村。', author: '陆游', title: '游山西村' },
  { content: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游', title: '冬夜读书示子聿' },
  { content: '问渠那得清如许，为有源头活水来。', author: '朱熹', title: '观书有感' },
  { content: '等闲识得东风面，万紫千红总是春。', author: '朱熹', title: '春日' },
  { content: '不识庐山真面目，只缘身在此山中。', author: '苏轼', title: '题西林壁' },
  { content: '竹外桃花三两枝，春江水暖鸭先知。', author: '苏轼', title: '惠崇春江晚景' },
  { content: '接天莲叶无穷碧，映日荷花别样红。', author: '杨万里', title: '晓出净慈寺送林子方' },
  { content: '小荷才露尖尖角，早有蜻蜓立上头。', author: '杨万里', title: '小池' },
  { content: '明月松间照，清泉石上流。', author: '王维', title: '山居秋暝' },
  { content: '行到水穷处，坐看云起时。', author: '王维', title: '终南别业' },
  { content: '采菊东篱下，悠然见南山。', author: '陶渊明', title: '饮酒' },
  { content: '忽如一夜春风来，千树万树梨花开。', author: '岑参', title: '白雪歌送武判官归京' },
  { content: '沉舟侧畔千帆过，病树前头万木春。', author: '刘禹锡', title: '酬乐天扬州初逢席上见赠' },
  { content: '落红不是无情物，化作春泥更护花。', author: '龚自珍', title: '己亥杂诗' },
  { content: '我劝天公重抖擞，不拘一格降人才。', author: '龚自珍', title: '己亥杂诗' },
  { content: '羌笛何须怨杨柳，春风不度玉门关。', author: '王之涣', title: '凉州词' },
  { content: '莫愁前路无知己，天下谁人不识君。', author: '高适', title: '别董大' },
  { content: '桃花潭水深千尺，不及汪伦送我情。', author: '李白', title: '赠汪伦' },
  { content: '飞流直下三千尺，疑是银河落九天。', author: '李白', title: '望庐山瀑布' },
  { content: '两岸猿声啼不住，轻舟已过万重山。', author: '李白', title: '早发白帝城' },
  { content: '孤帆远影碧空尽，唯见长江天际流。', author: '李白', title: '黄鹤楼送孟浩然之广陵' },
  { content: '天生我材必有用，千金散尽还复来。', author: '李白', title: '将进酒' },
  { content: '君不见黄河之水天上来，奔流到海不复回。', author: '李白', title: '将进酒' },
  { content: '朱门酒肉臭，路有冻死骨。', author: '杜甫', title: '自京赴奉先县咏怀五百字' },
  { content: '安得广厦千万间，大庇天下寒士俱欢颜。', author: '杜甫', title: '茅屋为秋风所破歌' },
  { content: '停车坐爱枫林晚，霜叶红于二月花。', author: '杜牧', title: '山行' },
  { content: '清明时节雨纷纷，路上行人欲断魂。', author: '杜牧', title: '清明' },
  { content: '春风得意马蹄疾，一日看尽长安花。', author: '孟郊', title: '登科后' },
  { content: '谁言寸草心，报得三春晖。', author: '孟郊', title: '游子吟' },
  { content: '日出江花红胜火，春来江水绿如蓝。', author: '白居易', title: '忆江南' },
  { content: '在天愿作比翼鸟，在地愿为连理枝。', author: '白居易', title: '长恨歌' },
  { content: '同是天涯沦落人，相逢何必曾相识。', author: '白居易', title: '琵琶行' },
  { content: '千呼万唤始出来，犹抱琵琶半遮面。', author: '白居易', title: '琵琶行' },
  { content: '身无彩凤双飞翼，心有灵犀一点通。', author: '李商隐', title: '无题' },
  { content: '春蚕到死丝方尽，蜡炬成灰泪始干。', author: '李商隐', title: '无题' },
  { content: '夕阳无限好，只是近黄昏。', author: '李商隐', title: '乐游原' },
  { content: '何当共剪西窗烛，却话巴山夜雨时。', author: '李商隐', title: '夜雨寄北' },
  { content: '天阶夜色凉如水，卧看牵牛织女星。', author: '杜牧', title: '秋夕' },
  { content: '借问酒家何处有，牧童遥指杏花村。', author: '杜牧', title: '清明' },
  { content: '千里莺啼绿映红，水村山郭酒旗风。', author: '杜牧', title: '江南春' },
  { content: '葡萄美酒夜光杯，欲饮琵琶马上催。', author: '王翰', title: '凉州词' },
  { content: '但使龙城飞将在，不教胡马度阴山。', author: '王昌龄', title: '出塞' },
  { content: '黄沙百战穿金甲，不破楼兰终不还。', author: '王昌龄', title: '从军行' },
  { content: '洛阳亲友如相问，一片冰心在玉壶。', author: '王昌龄', title: '芙蓉楼送辛渐' },
  { content: '青山遮不住，毕竟东流去。', author: '辛弃疾', title: '菩萨蛮' },
  { content: '众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。', author: '辛弃疾', title: '青玉案' },
  { content: '醉里挑灯看剑，梦回吹角连营。', author: '辛弃疾', title: '破阵子' },
  { content: '想当年，金戈铁马，气吞万里如虎。', author: '辛弃疾', title: '永遇乐' },
  { content: '凭谁问，廉颇老矣，尚能饭否。', author: '辛弃疾', title: '永遇乐' },
  { content: '多情自古伤离别，更那堪冷落清秋节。', author: '柳永', title: '雨霖铃' },
  { content: '今宵酒醒何处，杨柳岸晓风残月。', author: '柳永', title: '雨霖铃' },
  { content: '无可奈何花落去，似曾相识燕归来。', author: '晏殊', title: '浣溪沙' },
  { content: '昨夜西风凋碧树，独上高楼，望尽天涯路。', author: '晏殊', title: '蝶恋花' },
  { content: '天涯何处无芳草，多情却被无情恼。', author: '苏轼', title: '蝶恋花' },
  { content: '会挽雕弓如满月，西北望，射天狼。', author: '苏轼', title: '江城子' },
  { content: '十年生死两茫茫，不思量，自难忘。', author: '苏轼', title: '江城子' },
  { content: '莫等闲，白了少年头，空悲切。', author: '岳飞', title: '满江红' },
  { content: '三十功名尘与土，八千里路云和月。', author: '岳飞', title: '满江红' },
  { content: '壮志饥餐胡虏肉，笑谈渴饮匈奴血。', author: '岳飞', title: '满江红' },
  { content: '吾生也有涯，而知也无涯。', author: '庄子', title: '养生主' },
  { content: '三人行，必有我师焉。', author: '孔子', title: '论语' },
  { content: '学而时习之，不亦说乎。', author: '孔子', title: '论语' },
  { content: '有朋自远方来，不亦乐乎。', author: '孔子', title: '论语' },
  { content: '温故而知新，可以为师矣。', author: '孔子', title: '论语' },
  { content: '君子坦荡荡，小人长戚戚。', author: '孔子', title: '论语' },
  { content: '岁寒，然后知松柏之后凋也。', author: '孔子', title: '论语' },
  { content: '己所不欲，勿施于人。', author: '孔子', title: '论语' },
  { content: '老吾老，以及人之老；幼吾幼，以及人之幼。', author: '孟子', title: '孟子' },
  { content: '天时不如地利，地利不如人和。', author: '孟子', title: '孟子' },
  { content: '富贵不能淫，贫贱不能移，威武不能屈。', author: '孟子', title: '孟子' },
  { content: '生于忧患，死于安乐。', author: '孟子', title: '孟子' },
  { content: '路漫漫其修远兮，吾将上下而求索。', author: '屈原', title: '离骚' },
  { content: '举世皆浊我独清，众人皆醉我独醒。', author: '屈原', title: '渔父' },
  { content: '长风破浪会有时，直挂云帆济沧海。', author: '李白', title: '行路难' },
  { content: '少壮不努力，老大徒伤悲。', author: '汉乐府', title: '长歌行' },
  { content: '精诚所至，金石为开。', author: '佚名', title: '后汉书' },
  { content: '智者千虑，必有一失；愚者千虑，必有一得。', author: '佚名', title: '史记' }
];

const getRandomPoem = (): Poem => {
  const index = Math.floor(Math.random() * POEMS.length);
  return POEMS[index];
};

const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysDiff = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d1.getTime() - d2.getTime()) / oneDay);
};

interface FlipQueueItem {
  direction: 'forward' | 'backward';
  pages: number;
}

const App: React.FC = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [displayDate, setDisplayDate] = useState<Date>(today);
  const [currentPoem, setCurrentPoem] = useState<Poem>(getRandomPoem);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [shadowOffset, setShadowOffset] = useState({ x: 0, y: 0 });
  const [calendarOffset, setCalendarOffset] = useState({ x: 0, y: 0 });
  const [lcdScrolling, setLcdScrolling] = useState(false);
  const [lcdDisplay, setLcdDisplay] = useState({ start: 0, end: 0, total: 0 });
  
  const flipQueueRef = useRef<FlipQueueItem[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const diff = getDaysDiff(currentDate, today);
    if (diff >= 0) {
      setLcdDisplay({ start: 0, end: diff, total: diff });
    } else {
      setLcdDisplay({ start: diff, end: 0, total: Math.abs(diff) });
    }
  }, [currentDate, today]);

  const addDays = useCallback((date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }, []);

  const processQueue = useCallback(() => {
    if (flipQueueRef.current.length === 0 || isFlipping) return;

    const nextItem = flipQueueRef.current[0];
    if (nextItem.pages <= 0) {
      flipQueueRef.current.shift();
      processQueue();
      return;
    }

    setIsFlipping(true);
    setFlipDirection(nextItem.direction);
    
    const newDate = nextItem.direction === 'forward'
      ? addDays(currentDate, 1)
      : addDays(currentDate, -1);
    
    setCurrentDate(newDate);
    setCurrentPoem(getRandomPoem());
    setLcdScrolling(true);

    nextItem.pages--;

    setTimeout(() => {
      setLcdScrolling(false);
    }, 300);
  }, [isFlipping, currentDate, addDays]);

  const handleAnimationComplete = useCallback(() => {
    setDisplayDate(currentDate);
    setFlipDirection(null);
    setIsFlipping(false);

    setTimeout(() => {
      processQueue();
    }, 300);
  }, [currentDate, processQueue]);

  const handleFlip = useCallback((direction: 'forward' | 'backward', pages: number = 3) => {
    flipQueueRef.current.push({ direction, pages });
    if (!isFlipping) {
      processQueue();
    }
  }, [isFlipping, processQueue]);

  const handlePrevClick = useCallback(() => {
    handleFlip('backward', 3);
  }, [handleFlip]);

  const handleNextClick = useCallback(() => {
    handleFlip('forward', 3);
  }, [handleFlip]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const offsetX = (e.clientX - centerX) / centerX;
      const offsetY = (e.clientY - centerY) / centerY;
      
      setShadowOffset({
        x: offsetX * 15,
        y: offsetY * 8
      });
      
      setCalendarOffset({
        x: offsetX * 8,
        y: offsetY * 4
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const formatLCDDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const todayStr = formatLCDDate(today);
  const currentStr = formatLCDDate(displayDate);
  const diff = getDaysDiff(displayDate, today);

  return (
    <div className="desktop-container">
      <div className="wooden-desk"></div>
      
      <div
        ref={wrapperRef}
        className="calendar-wrapper"
        style={{
          transform: `translate(calc(-50% + ${calendarOffset.x}px), calc(-55% + ${calendarOffset.y}px))`
        }}
      >
        <div className="calendar-decoration"></div>
        
        <div
          className="calendar-shadow"
          style={{
            transform: `translate(calc(-50% + ${shadowOffset.x}px), calc(10px + ${shadowOffset.y}px))`
          }}
        ></div>
        
        <div className="calendar-stand">
          <div className="calendar-cover">
            <div className="calendar-cards-container">
              <FlipCard
                date={currentDate}
                poem={currentPoem}
                direction={flipDirection}
                onAnimationComplete={handleAnimationComplete}
              />
              <div className="metal-ring"></div>
            </div>
          </div>
          
          <div className="navigation-buttons">
            <button
              className="nav-btn prev-btn"
              onClick={handlePrevClick}
              disabled={isFlipping && flipQueueRef.current.length === 0}
            >
              ‹
            </button>
            <button
              className="nav-btn next-btn"
              onClick={handleNextClick}
              disabled={isFlipping && flipQueueRef.current.length === 0}
            >
              ›
            </button>
          </div>
        </div>
        
        <div className="lcd-display">
          <span className="lcd-text">
            {todayStr} ~ {currentStr} | 
            <span className={`lcd-digit ${lcdScrolling ? 'scrolling' : ''}`}>
              {diff >= 0 ? `+${diff}` : diff}
            </span>
            天
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
