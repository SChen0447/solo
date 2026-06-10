import { GazeAction } from './gazeTracker';

const STORAGE_KEY = 'gaze_reader_current_page';
const TOTAL_PAGES = 20;

const POEM_CONTENT: string[] = [
  `第1页 唐诗三百首·卷一
《静夜思》李白
床前明月光，疑是地上霜。
举头望明月，低头思故乡。

《登鹳雀楼》王之涣
白日依山尽，黄河入海流。
欲穷千里目，更上一层楼。

《春晓》孟浩然
春眠不觉晓，处处闻啼鸟。
夜来风雨声，花落知多少。

《相思》王维
红豆生南国，春来发几枝。
愿君多采撷，此物最相思。

《杂诗》王维
君自故乡来，应知故乡事。
来日绮窗前，寒梅著花未。`,

  `第2页 唐诗三百首·卷二
《鹿柴》王维
空山不见人，但闻人语响。
返景入深林，复照青苔上。

《送别》王维
山中相送罢，日暮掩柴扉。
春草明年绿，王孙归不归。

《竹里馆》王维
独坐幽篁里，弹琴复长啸。
深林人不知，明月来相照。

《辛夷坞》王维
木末芙蓉花，山中发红萼。
涧户寂无人，纷纷开且落。

《山居秋暝》王维
空山新雨后，天气晚来秋。
明月松间照，清泉石上流。
竹喧归浣女，莲动下渔舟。
随意春芳歇，王孙自可留。`,

  `第3页 唐诗三百首·卷三
《将进酒》李白
君不见黄河之水天上来，奔流到海不复回。
君不见高堂明镜悲白发，朝如青丝暮成雪。
人生得意须尽欢，莫使金樽空对月。
天生我材必有用，千金散尽还复来。
烹羊宰牛且为乐，会须一饮三百杯。
岑夫子，丹丘生，将进酒，杯莫停。
与君歌一曲，请君为我倾耳听。
钟鼓馔玉不足贵，但愿长醉不愿醒。
古来圣贤皆寂寞，惟有饮者留其名。
陈王昔时宴平乐，斗酒十千恣欢谑。
主人何为言少钱，径须沽取对君酌。
五花马，千金裘，呼儿将出换美酒，与尔同销万古愁。`,

  `第4页 唐诗三百首·卷四
《望庐山瀑布》李白
日照香炉生紫烟，遥看瀑布挂前川。
飞流直下三千尺，疑是银河落九天。

《早发白帝城》李白
朝辞白帝彩云间，千里江陵一日还。
两岸猿声啼不住，轻舟已过万重山。

《黄鹤楼送孟浩然之广陵》李白
故人西辞黄鹤楼，烟花三月下扬州。
孤帆远影碧空尽，唯见长江天际流。

《赠汪伦》李白
李白乘舟将欲行，忽闻岸上踏歌声。
桃花潭水深千尺，不及汪伦送我情。

《行路难》李白
金樽清酒斗十千，玉盘珍羞直万钱。
停杯投箸不能食，拔剑四顾心茫然。
欲渡黄河冰塞川，将登太行雪满山。
闲来垂钓碧溪上，忽复乘舟梦日边。
行路难，行路难，多歧路，今安在。
长风破浪会有时，直挂云帆济沧海。`,

  `第5页 唐诗三百首·卷五
《春望》杜甫
国破山河在，城春草木深。
感时花溅泪，恨别鸟惊心。
烽火连三月，家书抵万金。
白头搔更短，浑欲不胜簪。

《望岳》杜甫
岱宗夫如何，齐鲁青未了。
造化钟神秀，阴阳割昏晓。
荡胸生曾云，决眦入归鸟。
会当凌绝顶，一览众山小。

《登高》杜甫
风急天高猿啸哀，渚清沙白鸟飞回。
无边落木萧萧下，不尽长江滚滚来。
万里悲秋常作客，百年多病独登台。
艰难苦恨繁霜鬓，潦倒新停浊酒杯。

《蜀相》杜甫
丞相祠堂何处寻，锦官城外柏森森。
映阶碧草自春色，隔叶黄鹂空好音。
三顾频烦天下计，两朝开济老臣心。
出师未捷身先死，长使英雄泪满襟。`,

  `第6页 唐诗三百首·卷六
《茅屋为秋风所破歌》杜甫
八月秋高风怒号，卷我屋上三重茅。
茅飞渡江洒江郊，高者挂罥长林梢，下者飘转沉塘坳。
南村群童欺我老无力，忍能对面为盗贼。
公然抱茅入竹去，唇焦口燥呼不得，归来倚杖自叹息。
俄顷风定云墨色，秋天漠漠向昏黑。
布衾多年冷似铁，娇儿恶卧踏里裂。
床头屋漏无干处，雨脚如麻未断绝。
自经丧乱少睡眠，长夜沾湿何由彻。
安得广厦千万间，大庇天下寒士俱欢颜，风雨不动安如山。
呜呼，何时眼前突兀见此屋，吾庐独破受冻死亦足。`,

  `第7页 唐诗三百首·卷七
《长恨歌》白居易
汉皇重色思倾国，御宇多年求不得。
杨家有女初长成，养在深闺人未识。
天生丽质难自弃，一朝选在君王侧。
回眸一笑百媚生，六宫粉黛无颜色。
春寒赐浴华清池，温泉水滑洗凝脂。
侍儿扶起娇无力，始是新承恩泽时。
云鬓花颜金步摇，芙蓉帐暖度春宵。
春宵苦短日高起，从此君王不早朝。
承欢侍宴无闲暇，春从春游夜专夜。
后宫佳丽三千人，三千宠爱在一身。
金屋妆成娇侍夜，玉楼宴罢醉和春。
姊妹弟兄皆列土，可怜光彩生门户。
遂令天下父母心，不重生男重生女。`,

  `第8页 唐诗三百首·卷八
《长恨歌》续
骊宫高处入青云，仙乐风飘处处闻。
缓歌慢舞凝丝竹，尽日君王看不足。
渔阳鼙鼓动地来，惊破霓裳羽衣曲。
九重城阙烟尘生，千乘万骑西南行。
翠华摇摇行复止，西出都门百余里。
六军不发无奈何，宛转蛾眉马前死。
花钿委地无人收，翠翘金雀玉搔头。
君王掩面救不得，回看血泪相和流。
黄埃散漫风萧索，云栈萦纡登剑阁。
峨嵋山下少人行，旌旗无光日色薄。
蜀江水碧蜀山青，圣主朝朝暮暮情。
行宫见月伤心色，夜雨闻铃肠断声。`,

  `第9页 唐诗三百首·卷九
《琵琶行》白居易
浔阳江头夜送客，枫叶荻花秋瑟瑟。
主人下马客在船，举酒欲饮无管弦。
醉不成欢惨将别，别时茫茫江浸月。
忽闻水上琵琶声，主人忘归客不发。
寻声暗问弹者谁，琵琶声停欲语迟。
移船相近邀相见，添酒回灯重开宴。
千呼万唤始出来，犹抱琵琶半遮面。
转轴拨弦三两声，未成曲调先有情。
弦弦掩抑声声思，似诉平生不得志。
低眉信手续续弹，说尽心中无限事。
轻拢慢捻抹复挑，初为霓裳后六幺。
大弦嘈嘈如急雨，小弦切切如私语。
嘈嘈切切错杂弹，大珠小珠落玉盘。`,

  `第10页 唐诗三百首·卷十
《赋得古原草送别》白居易
离离原上草，一岁一枯荣。
野火烧不尽，春风吹又生。
远芳侵古道，晴翠接荒城。
又送王孙去，萋萋满别情。

《江雪》柳宗元
千山鸟飞绝，万径人踪灭。
孤舟蓑笠翁，独钓寒江雪。

《渔翁》柳宗元
渔翁夜傍西岩宿，晓汲清湘燃楚竹。
烟销日出不见人，欸乃一声山水绿。
回看天际下中流，岩上无心云相逐。

《秋思》张籍
洛阳城里见秋风，欲作家书意万重。
复恐匆匆说不尽，行人临发又开封。

《离思》元稹
曾经沧海难为水，除却巫山不是云。
取次花丛懒回顾，半缘修道半缘君。`,

  `第11页 宋词三百首·卷一
《水调歌头》苏轼
明月几时有，把酒问青天。
不知天上宫阙，今夕是何年。
我欲乘风归去，又恐琼楼玉宇，高处不胜寒。
起舞弄清影，何似在人间。
转朱阁，低绮户，照无眠。
不应有恨，何事长向别时圆。
人有悲欢离合，月有阴晴圆缺，此事古难全。
但愿人长久，千里共婵娟。

《念奴娇·赤壁怀古》苏轼
大江东去，浪淘尽，千古风流人物。
故垒西边，人道是，三国周郎赤壁。
乱石穿空，惊涛拍岸，卷起千堆雪。
江山如画，一时多少豪杰。`,

  `第12页 宋词三百首·卷二
《念奴娇·赤壁怀古》续
遥想公瑾当年，小乔初嫁了，雄姿英发。
羽扇纶巾，谈笑间，樯橹灰飞烟灭。
故国神游，多情应笑我，早生华发。
人生如梦，一尊还酹江月。

《江城子·乙卯正月二十日夜记梦》苏轼
十年生死两茫茫，不思量，自难忘。
千里孤坟，无处话凄凉。
纵使相逢应不识，尘满面，鬓如霜。
夜来幽梦忽还乡，小轩窗，正梳妆。
相顾无言，惟有泪千行。
料得年年肠断处，明月夜，短松冈。

《定风波》苏轼
莫听穿林打叶声，何妨吟啸且徐行。
竹杖芒鞋轻胜马，谁怕，一蓑烟雨任平生。
料峭春风吹酒醒，微冷，山头斜照却相迎。
回首向来萧瑟处，归去，也无风雨也无晴。`,

  `第13页 宋词三百首·卷三
《蝶恋花》柳永
伫倚危楼风细细，望极春愁，黯黯生天际。
草色烟光残照里，无言谁会凭阑意。
拟把疏狂图一醉，对酒当歌，强乐还无味。
衣带渐宽终不悔，为伊消得人憔悴。

《雨霖铃》柳永
寒蝉凄切，对长亭晚，骤雨初歇。
都门帐饮无绪，留恋处，兰舟催发。
执手相看泪眼，竟无语凝噎。
念去去，千里烟波，暮霭沉沉楚天阔。
多情自古伤离别，更那堪，冷落清秋节。
今宵酒醒何处，杨柳岸，晓风残月。
此去经年，应是良辰好景虚设。
便纵有千种风情，更与何人说。`,

  `第14页 宋词三百首·卷四
《声声慢》李清照
寻寻觅觅，冷冷清清，凄凄惨惨戚戚。
乍暖还寒时候，最难将息。
三杯两盏淡酒，怎敌他、晚来风急。
雁过也，正伤心，却是旧时相识。
满地黄花堆积，憔悴损，如今有谁堪摘。
守着窗儿，独自怎生得黑。
梧桐更兼细雨，到黄昏、点点滴滴。
这次第，怎一个愁字了得。

《如梦令》李清照
常记溪亭日暮，沉醉不知归路。
兴尽晚回舟，误入藕花深处。
争渡，争渡，惊起一滩鸥鹭。

《一剪梅》李清照
红藕香残玉簟秋，轻解罗裳，独上兰舟。
云中谁寄锦书来，雁字回时，月满西楼。
花自飘零水自流，一种相思，两处闲愁。
此情无计可消除，才下眉头，却上心头。`,

  `第15页 宋词三百首·卷五
《醉花阴》李清照
薄雾浓云愁永昼，瑞脑消金兽。
佳节又重阳，玉枕纱厨，半夜凉初透。
东篱把酒黄昏后，有暗香盈袖。
莫道不销魂，帘卷西风，人比黄花瘦。

《武陵春》李清照
风住尘香花已尽，日晚倦梳头。
物是人非事事休，欲语泪先流。
闻说双溪春尚好，也拟泛轻舟。
只恐双溪舴艋舟，载不动许多愁。

《永遇乐·京口北固亭怀古》辛弃疾
千古江山，英雄无觅孙仲谋处。
舞榭歌台，风流总被雨打风吹去。
斜阳草树，寻常巷陌，人道寄奴曾住。
想当年，金戈铁马，气吞万里如虎。`,

  `第16页 宋词三百首·卷六
《永遇乐·京口北固亭怀古》续
元嘉草草，封狼居胥，赢得仓皇北顾。
四十三年，望中犹记，烽火扬州路。
可堪回首，佛狸祠下，一片神鸦社鼓。
凭谁问，廉颇老矣，尚能饭否。

《青玉案·元夕》辛弃疾
东风夜放花千树，更吹落、星如雨。
宝马雕车香满路。
凤箫声动，玉壶光转，一夜鱼龙舞。
蛾儿雪柳黄金缕，笑语盈盈暗香去。
众里寻他千百度，
蓦然回首，那人却在，灯火阑珊处。

《破阵子·为陈同甫赋壮词以寄之》辛弃疾
醉里挑灯看剑，梦回吹角连营。
八百里分麾下炙，五十弦翻塞外声，沙场秋点兵。
马作的卢飞快，弓如霹雳弦惊。
了却君王天下事，赢得生前身后名。可怜白发生。`,

  `第17页 宋词三百首·卷七
《摸鱼儿》辛弃疾
更能消、几番风雨，匆匆春又归去。
惜春长怕花开早，何况落红无数。
春且住，见说道、天涯芳草无归路。
怨春不语。
算只有殷勤，画檐蛛网，尽日惹飞絮。
长门事，准拟佳期又误。蛾眉曾有人妒。
千金纵买相如赋，脉脉此情谁诉。
君莫舞，君不见、玉环飞燕皆尘土。
闲愁最苦。
休去倚危栏，斜阳正在，烟柳断肠处。

《贺新郎》辛弃疾
甚矣吾衰矣。
怅平生、交游零落，只今余几。
白发空垂三千丈，一笑人间万事。
问何物、能令公喜。
我见青山多妩媚，料青山、见我应如是。
情与貌，略相似。`,

  `第18页 宋词三百首·卷八
《满江红》岳飞
怒发冲冠，凭栏处、潇潇雨歇。
抬望眼，仰天长啸，壮怀激烈。
三十功名尘与土，八千里路云和月。
莫等闲、白了少年头，空悲切。
靖康耻，犹未雪。臣子恨，何时灭。
驾长车，踏破贺兰山缺。
壮志饥餐胡虏肉，笑谈渴饮匈奴血。
待从头、收拾旧山河，朝天阙。

《钗头凤》陆游
红酥手，黄縢酒，满城春色宫墙柳。
东风恶，欢情薄，一怀愁绪，几年离索。错错错。
春如旧，人空瘦，泪痕红浥鲛绡透。
桃花落，闲池阁，山盟虽在，锦书难托。莫莫莫。

《卜算子·咏梅》陆游
驿外断桥边，寂寞开无主。
已是黄昏独自愁，更著风和雨。
无意苦争春，一任群芳妒。
零落成泥碾作尘，只有香如故。`,

  `第19页 宋词三百首·卷九
《虞美人》李煜
春花秋月何时了，往事知多少。
小楼昨夜又东风，故国不堪回首月明中。
雕栏玉砌应犹在，只是朱颜改。
问君能有几多愁，恰似一江春水向东流。

《相见欢》李煜
无言独上西楼，月如钩。
寂寞梧桐深院锁清秋。
剪不断，理还乱，是离愁。
别是一般滋味在心头。

《浪淘沙令》李煜
帘外雨潺潺，春意阑珊。
罗衾不耐五更寒。
梦里不知身是客，一晌贪欢。
独自莫凭栏，无限江山。
别时容易见时难。
流水落花春去也，天上人间。

《苏幕遮》范仲淹
碧云天，黄叶地，秋色连波，波上寒烟翠。
山映斜阳天接水，芳草无情，更在斜阳外。
黯乡魂，追旅思，夜夜除非，好梦留人睡。
明月楼高休独倚，酒入愁肠，化作相思泪。`,

  `第20页 宋词三百首·卷十
《渔家傲·秋思》范仲淹
塞下秋来风景异，衡阳雁去无留意。
四面边声连角起，千嶂里，长烟落日孤城闭。
浊酒一杯家万里，燕然未勒归无计。
羌管悠悠霜满地，人不寐，将军白发征夫泪。

《浣溪沙》晏殊
一曲新词酒一杯，去年天气旧亭台。
夕阳西下几时回。
无可奈何花落去，似曾相识燕归来。
小园香径独徘徊。

《蝶恋花》晏殊
槛菊愁烟兰泣露，罗幕轻寒，燕子双飞去。
明月不谙离恨苦，斜光到晓穿朱户。
昨夜西风凋碧树，独上高楼，望尽天涯路。
欲寄彩笺兼尺素，山长水阔知何处。

《踏莎行》欧阳修
候馆梅残，溪桥柳细，草薰风暖摇征辔。
离愁渐远渐无穷，迢迢不断如春水。
寸寸柔肠，盈盈粉泪，楼高莫近危阑倚。
平芜尽处是春山，行人更在春山外。

（全书完）`
];

interface PageRendererOptions {
  onPageChange?: (page: number) => void;
}

export class PageRenderer {
  private currentPage: number = 1;
  private cardEl: HTMLElement;
  private contentEl: HTMLElement;
  private indexEl: HTMLElement;
  private labelEl: HTMLElement;
  private modalOverlay: HTMLElement;
  private modalInput: HTMLInputElement;
  private modalConfirm: HTMLElement;
  private modalCancel: HTMLElement;
  private isAnimating: boolean = false;
  private options: PageRendererOptions;

  constructor(options: PageRendererOptions = {}) {
    this.options = options;
    this.cardEl = document.getElementById('card')!;
    this.contentEl = document.getElementById('page-content')!;
    this.indexEl = document.getElementById('page-index')!;
    this.labelEl = document.getElementById('page-label')!;
    this.modalOverlay = document.getElementById('modal-overlay')!;
    this.modalInput = document.getElementById('modal-input') as HTMLInputElement;
    this.modalConfirm = document.getElementById('modal-confirm')!;
    this.modalCancel = document.getElementById('modal-cancel')!;

    this.loadPageFromStorage();
    this.bindEvents();
    this.render();
  }

  public getCurrentPage(): number {
    return this.currentPage;
  }

  public getTotalPages(): number {
    return TOTAL_PAGES;
  }

  public handleAction(action: GazeAction): void {
    switch (action) {
      case 'prev_page':
        this.prevPage();
        break;
      case 'next_page':
        this.nextPage();
        break;
      case 'scroll_top':
        this.scrollToTop();
        break;
      case 'scroll_bottom':
        this.scrollToBottom();
        break;
    }
  }

  public nextPage(): void {
    if (this.isAnimating || this.currentPage >= TOTAL_PAGES) return;
    this.currentPage++;
    this.animateAndRender('slide-left');
    this.savePageToStorage();
  }

  public prevPage(): void {
    if (this.isAnimating || this.currentPage <= 1) return;
    this.currentPage--;
    this.animateAndRender('slide-right');
    this.savePageToStorage();
  }

  public goToPage(page: number, withFlip: boolean = false): void {
    if (this.isAnimating) return;
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, page));
    if (clamped === this.currentPage && !withFlip) return;
    this.currentPage = clamped;
    if (withFlip) {
      this.animateAndRender('flip-reset');
    } else {
      this.render();
    }
    this.savePageToStorage();
  }

  public resetToFirstPage(): void {
    if (this.isAnimating) return;
    this.currentPage = 1;
    this.animateAndRender('flip-reset');
    this.savePageToStorage();
  }

  public scrollToTop(): void {
    this.contentEl.scrollTo({ top: 0, behavior: 'smooth' });
  }

  public scrollToBottom(): void {
    this.contentEl.scrollTo({ top: this.contentEl.scrollHeight, behavior: 'smooth' });
  }

  private animateAndRender(animClass: string): void {
    this.isAnimating = true;
    this.cardEl.classList.remove('slide-left', 'slide-right', 'flip-reset');
    void this.cardEl.offsetWidth;
    this.cardEl.classList.add(animClass);

    setTimeout(() => {
      this.render();
    }, animClass === 'flip-reset' ? 250 : 150);

    const duration = animClass === 'flip-reset' ? 500 : 300;
    setTimeout(() => {
      this.cardEl.classList.remove(animClass);
      this.isAnimating = false;
    }, duration);
  }

  private render(): void {
    const content = POEM_CONTENT[this.currentPage - 1] || '';
    this.contentEl.innerHTML = content.split('\n').map(line => `<p>${line}</p>`).join('');
    this.indexEl.textContent = `— ${this.currentPage} —`;
    this.labelEl.textContent = `第${this.currentPage}/${TOTAL_PAGES}页`;
    this.contentEl.scrollTop = 0;
    this.options.onPageChange?.(this.currentPage);
  }

  private bindEvents(): void {
    this.labelEl.addEventListener('dragstart', (e) => {
      this.labelEl.classList.add('dragging');
      e.dataTransfer?.setData('text/plain', String(this.currentPage));
    });

    this.labelEl.addEventListener('dragend', () => {
      this.labelEl.classList.remove('dragging');
      this.savePageToStorage();
    });

    this.labelEl.addEventListener('click', () => {
      this.openModal();
    });

    this.modalConfirm.addEventListener('click', () => {
      this.confirmModal();
    });

    this.modalCancel.addEventListener('click', () => {
      this.closeModal();
    });

    this.modalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirmModal();
      if (e.key === 'Escape') this.closeModal();
    });

    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });
  }

  private openModal(): void {
    this.modalInput.value = String(this.currentPage);
    this.modalOverlay.classList.add('active');
    setTimeout(() => this.modalInput.focus(), 50);
  }

  private closeModal(): void {
    this.modalOverlay.classList.remove('active');
  }

  private confirmModal(): void {
    const val = parseInt(this.modalInput.value, 10);
    if (!isNaN(val)) {
      this.goToPage(val);
    }
    this.closeModal();
  }

  private savePageToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.currentPage));
    } catch (_) {
    }
  }

  private loadPageFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const page = parseInt(saved, 10);
        if (!isNaN(page) && page >= 1 && page <= TOTAL_PAGES) {
          this.currentPage = page;
        }
      }
    } catch (_) {
    }
  }
}
