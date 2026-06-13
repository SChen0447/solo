import gsap from 'gsap';

const POEMS: string[] = [
  '流光映水映前路，星河入梦入归途',
  '风起云涌知天意，月明松间照初心',
  '紫气东来逢吉运，金光西照遇贵人',
  '花开堪折直须折，莫待无花空折枝',
  '明月照花花映月，清风拂水水随风',
  '一念起时万水千山，一念灭时沧海桑田',
  '云深不知归何处，花开自有佳期至',
  '心若向阳花自开，人若向暖风自来',
  '命中有时终须有，命中无时莫强求',
  '星辰大海皆可期，山河远阔任君行',
  '山重水复疑无路，柳暗花明又一村',
  '长风破浪会有时，直挂云帆济沧海',
  '千里之行始足下，万事如意在今朝',
  '浮云散尽见明月，迷雾拨开遇知音',
  '春风化雨润无声，秋水长天映有情',
  '逆风如解意，容易莫摧残',
  '桃花流水窅然去，别有天地非人间',
  '青山遮不住，毕竟东流去',
  '此心安处是吾乡，随缘而安福自长',
  '道阻且长行则至，事虽难做做必成',
  '一花一世界，一叶一菩提',
  '云在青天水在瓶，心无挂碍路自平',
  '春有百花秋有月，夏有凉风冬有雪',
  '莫听穿林打叶声，何妨吟啸且徐行',
  '但行好事莫问前程，心之所向素履以往',
  '日出江花红胜火，春来江水绿如蓝',
  '沧海月明珠有泪，蓝田日暖玉生烟',
  '众里寻他千百度，蓦然回首灯火处',
  '世间万物皆有定，顺其自然福自临',
  '月出惊山鸟，时鸣春涧中',
];

export class Fortune {
  private container: HTMLDivElement;
  private textEl: HTMLSpanElement;
  private isShowing = false;
  private timeline: gsap.core.Timeline | null = null;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      width: '400px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '14px 24px',
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      borderRadius: '12px',
      border: '1px solid rgba(102, 126, 234, 0.3)',
      textAlign: 'center' as const,
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '10',
    });

    this.textEl = document.createElement('span');
    Object.assign(this.textEl.style, {
      color: '#e0e7ff',
      fontSize: '18px',
      lineHeight: '1.6',
      letterSpacing: '2px',
    });

    this.container.appendChild(this.textEl);
    document.body.appendChild(this.container);
  }

  updateLayout(isMobile: boolean, ballCenterY: number, ballRadius: number): void {
    this.container.style.width = isMobile ? '240px' : '400px';
    this.textEl.style.fontSize = isMobile ? '14px' : '18px';
    this.container.style.top = `${ballCenterY + ballRadius + 80}px`;
  }

  trigger(): void {
    if (this.isShowing) return;
    this.isShowing = true;

    if (this.timeline) {
      this.timeline.kill();
    }

    this.textEl.innerHTML = '';
    const poem = POEMS[Math.floor(Math.random() * POEMS.length)];
    const chars = poem.split('');

    const spans: HTMLSpanElement[] = [];
    chars.forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.opacity = '0';
      this.textEl.appendChild(span);
      spans.push(span);
    });

    const tl = gsap.timeline({
      onComplete: () => {
        this.isShowing = false;
      },
    });

    tl.to(this.container, { opacity: 1, duration: 0.3 });

    spans.forEach((span, i) => {
      tl.to(span, { opacity: 1, duration: 0.3 }, i * 0.1);
    });

    tl.to({}, { duration: 4 });

    tl.to(this.container, { opacity: 0, duration: 0.8 });

    this.timeline = tl;
  }

  destroy(): void {
    if (this.timeline) {
      this.timeline.kill();
    }
    this.container.remove();
  }
}
