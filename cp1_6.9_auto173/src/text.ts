import p5 from 'p5';

export class TextManager {
  private p: p5;
  private pages: string[] = [];
  private currentPage: number = 0;
  private animating: boolean = false;
  private animProgress: number = 0;
  private readonly TEXT_COLOR = '#b0ccff';
  private readonly FONT_SIZE = 18;
  private readonly LINE_HEIGHT = 1.6;
  private readonly PADDING_LEFT = 200;
  private readonly PADDING_TOP = 40;
  private readonly PADDING_RIGHT = 40;
  private readonly PADDING_BOTTOM = 40;

  constructor(p: p5) {
    this.p = p;
    this.initializeDefaultPages();
  }

  private initializeDefaultPages(): void {
    this.pages = [
      `第一章 星尘的起源

在遥远的银河深处，有一片被遗忘的星域。
那里的星辰不再闪烁，仿佛陷入了永恒的沉睡。

古老的传说中，一位神秘的魔法师曾将
宇宙中最美丽的星尘封印在一本古老的书籍中。

每当有人翻开这本魔法书，
星尘便会重新绽放光芒，
唤醒沉睡的宇宙记忆...`,
      `第二章 魔法书的觉醒

当第一缕月光洒落在书脊上，
沉睡千年的文字开始苏醒。

金色的丝线在黑暗中交织，
编织出通往未知世界的道路。

书页中的每一个字都蕴含着古老的力量，
它们在等待着有缘人的到来，
一起踏上寻找真相的旅程。

星尘在指尖流转，
时间在这一刻凝固...`,
      `第三章 翻页者的旅程

翻页者啊，请倾听书页的低语。
每一页都是一个崭新的世界，
每一个字都是一颗闪烁的星辰。

你将穿越时空的裂隙，
见证宇宙诞生的壮丽，
触摸星辰熄灭的苍凉。

不要畏惧黑暗，
因为星尘永远与你同在，
照亮你前行的每一步...`,
      `终章 星尘永恒

当最后一页被翻开，
宇宙的终极奥秘将在你眼前展现。

所有的星辰，所有的故事，
所有的悲欢离合，
都化作一片绚烂的星云。

你会明白，
我们每个人都是星尘的孩子，
在宇宙的怀抱中诞生，
也终将回归星尘的永恒。

—— 完 ——`
    ];
  }

  setPageContent(pageIndex: number, content: string): void {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      this.pages[pageIndex] = content;
    }
  }

  addPage(content: string): void {
    this.pages.push(content);
  }

  setCurrentPage(index: number): void {
    this.currentPage = this.p.constrain(index, 0, this.pages.length - 1);
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getTotalPages(): number {
    return this.pages.length;
  }

  getPageContent(pageIndex: number): string {
    if (pageIndex >= 0 && pageIndex < this.pages.length) {
      return this.pages[pageIndex];
    }
    return '';
  }

  startAnimation(): void {
    this.animating = true;
    this.animProgress = 0;
  }

  endAnimation(): void {
    this.animating = false;
    this.animProgress = 0;
  }

  updateAnimation(progress: number): void {
    this.animProgress = this.p.constrain(progress, 0, 1);
  }

  isAnimating(): boolean {
    return this.animating;
  }

  draw(bookX: number, bookY: number, bookW: number, bookH: number, pageSide: 'left' | 'right'): void {
    const p = this.p;
    const contentX = bookX + (pageSide === 'left' ? this.PADDING_LEFT : bookW / 2 + 20);
    const contentY = bookY + this.PADDING_TOP;
    const contentW = bookW / 2 - this.PADDING_LEFT - this.PADDING_RIGHT;
    const contentH = bookH - this.PADDING_TOP - this.PADDING_BOTTOM;

    const displayPage = pageSide === 'left'
      ? this.currentPage
      : this.currentPage + 1;

    if (displayPage < 0 || displayPage >= this.pages.length) {
      return;
    }

    p.push();
    p.fill(this.TEXT_COLOR);
    p.noStroke();
    p.textSize(this.FONT_SIZE);
    p.textLeading(this.FONT_SIZE * this.LINE_HEIGHT);
    p.textAlign(p.LEFT, p.TOP);

    const textContent = this.pages[displayPage];
    const lines = this.wrapText(textContent, contentW);

    const animOffset = this.animating ? Math.sin(this.animProgress * Math.PI * 4) * 5 : 0;

    lines.forEach((line, index) => {
      const waveOffset = this.animating
        ? Math.sin((this.animProgress * Math.PI * 6) + index * 0.3) * 3
        : 0;
      const lineDelay = this.animating ? index * 0.02 : 0;
      const delayedProgress = this.p.constrain(this.animProgress - lineDelay, 0, 1);
      const lineAnimOffset = this.animating
        ? Math.sin(delayedProgress * Math.PI * 4) * 5
        : 0;

      const y = contentY + index * this.FONT_SIZE * this.LINE_HEIGHT;
      if (y < contentY + contentH) {
        p.text(
          line,
          contentX + animOffset + waveOffset + lineAnimOffset,
          y
        );
      }
    });

    p.pop();
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const p = this.p;
    const result: string[] = [];
    const paragraphs = text.split('\n');

    p.textSize(this.FONT_SIZE);
    p.textLeading(this.FONT_SIZE * this.LINE_HEIGHT);

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        result.push('');
        continue;
      }

      let currentLine = '';
      const chars = paragraph.split('');

      for (let i = 0; i < chars.length; i++) {
        const testLine = currentLine + chars[i];
        if (p.textWidth(testLine) > maxWidth && currentLine.length > 0) {
          result.push(currentLine);
          currentLine = chars[i];
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine.length > 0) {
        result.push(currentLine);
      }
    }

    return result;
  }
}
