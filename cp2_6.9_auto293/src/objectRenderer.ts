import type { Fragment } from './gameState';

const OBJECT_NAMES = ['壁炉老座钟', '书桌旧相册', '梳妆台骨瓷梳', '书房碎信纸'];

const FRAGMENT_DATA: Record<number, Fragment> = {
  0: { id: 'clock-frag', objectIndex: 0, timeIndex: 0, content: '午夜12:37 一声巨响' },
  1: { id: 'album-frag', objectIndex: 1, timeIndex: 20, content: '晚8点 一个女人匆匆离开' },
  2: { id: 'comb-frag', objectIndex: 2, timeIndex: 15, content: '下午3点 梳齿间缠绕的发丝微微发热' },
  3: { id: 'letter-frag', objectIndex: 3, timeIndex: 10, content: '上午10点 "我必须离开，请不要找我"' }
};

export class ObjectRenderer {
  private container: HTMLElement;
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(objectIndex: number, onBack: () => void): void {
    this.clear();
    this.container.classList.remove('hidden');

    const title = document.createElement('div');
    title.className = 'object-title';
    title.textContent = OBJECT_NAMES[objectIndex];
    this.container.appendChild(title);

    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.textContent = '← 返回房间';
    backBtn.addEventListener('click', onBack);
    this.container.appendChild(backBtn);

    switch (objectIndex) {
      case 0: this.renderClock(); break;
      case 1: this.renderAlbum(); break;
      case 2: this.renderComb(); break;
      case 3: this.renderLetter(); break;
    }
  }

  clear(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.container.innerHTML = '';
  }

  private emitFragmentCollected(fragment: Fragment): void {
    this.container.dispatchEvent(new CustomEvent('fragmentCollected', {
      detail: fragment,
      bubbles: true
    }));
  }

  private createFragmentChip(fragment: Fragment): HTMLElement {
    const chip = document.createElement('div');
    chip.className = 'memory-fragment';
    chip.textContent = fragment.content;
    chip.draggable = true;
    chip.dataset.fragmentId = fragment.id;
    chip.dataset.objectIndex = String(fragment.objectIndex);
    chip.dataset.timeIndex = String(fragment.timeIndex);
    chip.dataset.content = fragment.content;

    chip.addEventListener('dragstart', (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData('fragmentId', fragment.id);
        e.dataTransfer.setData('objectIndex', String(fragment.objectIndex));
        e.dataTransfer.setData('timeIndex', String(fragment.timeIndex));
        e.dataTransfer.setData('content', fragment.content);
      }
    });

    this.emitFragmentCollected(fragment);
    return chip;
  }

  private renderClock(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'clock-container';

    const canvas = document.createElement('canvas');
    canvas.width = 520;
    canvas.height = 520;
    wrapper.appendChild(canvas);

    const memText = document.createElement('div');
    memText.className = 'memory-text';
    wrapper.appendChild(memText);
    this.container.appendChild(wrapper);

    const fragment = FRAGMENT_DATA[0];
    let angle = 0;
    let gearAngle = 0;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, cy);

      for (let r = 180; r >= 100; r -= 20) {
        ctx.beginPath();
        ctx.strokeStyle = r === 180 ? '#D4AF37' : '#3A2E28';
        ctx.lineWidth = r === 180 ? 3 : 1.5;
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.rotate(gearAngle);
      this.drawGear(ctx, 80, 16, '#C4A882');
      ctx.restore();

      ctx.save();
      ctx.translate(-70, 70);
      ctx.rotate(-gearAngle * 1.5);
      this.drawGear(ctx, 36, 10, '#A08060');
      ctx.restore();

      ctx.save();
      ctx.translate(70, 70);
      ctx.rotate(-gearAngle * 1.5 + 0.3);
      this.drawGear(ctx, 36, 10, '#A08060');
      ctx.restore();

      ctx.strokeStyle = '#C4A882';
      ctx.lineWidth = 4;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x1 = Math.cos(a) * 150;
        const y1 = Math.sin(a) * 150;
        const x2 = Math.cos(a) * 168;
        const y2 = Math.sin(a) * 168;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      const hourA = ((angle % 3600) / 3600) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(hourA) * 90, Math.sin(hourA) * 90);
      ctx.stroke();

      const minA = ((angle % 60) / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = '#F5E6C8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(minA) * 130, Math.sin(minA) * 130);
      ctx.stroke();

      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      angle += 0.15;
      gearAngle += 0.012;

      if (angle > 120 && !memText.classList.contains('show')) {
        memText.textContent = fragment.content;
        memText.classList.add('show');
        const chip = this.createFragmentChip(fragment);
        wrapper.appendChild(chip);
      }

      this.animationFrameId = requestAnimationFrame(draw);
    };
    draw();
  }

  private drawGear(ctx: CanvasRenderingContext2D, radius: number, teeth: number, color: string): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#3A2E28';
    ctx.lineWidth = 1;
    const toothH = radius * 0.18;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2;
      const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
      const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
      const a4 = ((i + 0.8) / teeth) * Math.PI * 2;
      const rOut = radius + toothH;
      if (i === 0) ctx.moveTo(Math.cos(a1) * radius, Math.sin(a1) * radius);
      ctx.lineTo(Math.cos(a1) * rOut, Math.sin(a1) * rOut);
      ctx.lineTo(Math.cos(a2) * rOut, Math.sin(a2) * rOut);
      ctx.lineTo(Math.cos(a3) * radius, Math.sin(a3) * radius);
      ctx.lineTo(Math.cos(a4) * radius, Math.sin(a4) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = '#1A1410';
    ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderAlbum(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'album-container';

    const book = document.createElement('div');
    book.className = 'album-book';

    const pages = [
      { text: '泛黄的家族合影', photoStyle: '' },
      { text: '一个女人站在门口', photoStyle: 'filter: sepia(0.6) contrast(0.85) blur(0.5px);' },
      { text: '照片中身影模糊，似乎在匆匆离开', photoStyle: 'filter: sepia(0.7) contrast(0.8) blur(1px);' }
    ];

    const pageEls: HTMLElement[] = [];
    pages.forEach((p, i) => {
      const page = document.createElement('div');
      page.className = 'album-page';
      page.style.zIndex = String(pages.length - i);

      const slot = document.createElement('div');
      slot.className = 'photo-slot';
      slot.title = p.text;

      const photo = document.createElement('div');
      photo.className = 'photo-content';
      photo.style.cssText = p.photoStyle;
      slot.appendChild(photo);

      let dragging = false;
      let startX = 0, startY = 0, offX = 0, offY = 0;
      slot.addEventListener('mousedown', (e) => {
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(photo.style.transform || '');
        if (m) { offX = parseFloat(m[1]); offY = parseFloat(m[2]); }
        e.preventDefault();
      });
      const mm = (e: MouseEvent) => {
        if (!dragging) return;
        const dx = offX + (e.clientX - startX);
        const dy = offY + (e.clientY - startY);
        photo.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      const mu = () => { dragging = false; };
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);

      page.appendChild(slot);
      book.appendChild(page);
      pageEls.push(page);
    });

    wrapper.appendChild(book);

    const nav = document.createElement('div');
    nav.className = 'album-nav';
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀ 上一页';
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页 ▶';
    nav.appendChild(prevBtn); nav.appendChild(nextBtn);
    wrapper.appendChild(nav);

    this.container.appendChild(wrapper);

    let curPage = 0;
    const fragment = FRAGMENT_DATA[1];

    const update = () => {
      pageEls.forEach((p, i) => {
        if (i < curPage) p.classList.add('flipped');
        else p.classList.remove('flipped');
      });
      if (curPage >= 2 && !wrapper.querySelector('.memory-fragment')) {
        const chip = this.createFragmentChip(fragment);
        wrapper.appendChild(chip);
      }
    };
    prevBtn.addEventListener('click', () => { if (curPage > 0) { curPage--; update(); }});
    nextBtn.addEventListener('click', () => { if (curPage < pages.length - 1) { curPage++; update(); }});
    update();
  }

  private renderComb(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'comb-container';

    const comb = document.createElement('div');
    comb.className = 'comb';

    const body = document.createElement('div');
    body.className = 'comb-body';
    comb.appendChild(body);

    const teeth = document.createElement('div');
    teeth.className = 'comb-teeth';
    for (let i = 0; i < 22; i++) {
      const t = document.createElement('div');
      t.className = 'comb-tooth';
      teeth.appendChild(t);
    }
    comb.appendChild(teeth);

    const strands: HTMLElement[] = [];
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('div');
      s.className = 'hair-strand';
      const h = 40 + Math.random() * 40;
      s.style.height = `${h}px`;
      s.style.left = `${30 + i * 60}px`;
      s.style.top = '100px';
      strands.push(s);
      comb.appendChild(s);
    }
    wrapper.appendChild(comb);
    this.container.appendChild(wrapper);

    let dragging = false;
    let baseX = 0, baseY = 0;
    const fragment = FRAGMENT_DATA[2];
    let collected = false;
    let movedCount = 0;

    comb.addEventListener('mousedown', (e) => {
      dragging = true;
      baseX = e.clientX; baseY = e.clientY;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - baseX;
      const dy = e.clientY - baseY;
      comb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${dx * 0.05}deg)`;
      strands.forEach((s, i) => {
        s.style.transform = `rotate(${dx * 0.2 + Math.sin(Date.now() / 200 + i) * 5}deg)`;
        if (Math.abs(dx) > 20) s.classList.add('glow');
      });
      if (Math.abs(dx) > 10) movedCount++;
      if (movedCount > 30 && !collected) {
        collected = true;
        const chip = this.createFragmentChip(fragment);
        wrapper.appendChild(chip);
      }
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
      strands.forEach(s => s.classList.remove('glow'));
    });
  }

  private renderLetter(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'letter-container';

    const scrapsArea = document.createElement('div');
    scrapsArea.className = 'letter-scraps';

    const lines = [
      '亲爱的，',
      '我必须离开，',
      '请不要找我。',
      '—— E.'
    ];

    const slots: HTMLElement[] = [];
    const placed = new Set<number>();
    const fragment = FRAGMENT_DATA[3];
    let collected = false;

    const tryComplete = () => {
      if (placed.size === 4 && !collected) {
        collected = true;
        assembly.classList.add('complete');
        const chip = this.createFragmentChip(fragment);
        wrapper.appendChild(chip);
      }
    };

    lines.forEach((text, i) => {
      const scrap = document.createElement('div');
      scrap.className = 'letter-scrap';
      scrap.textContent = text;
      scrap.style.setProperty('--rot', `${(Math.random() - 0.5) * 30}deg`);
      scrap.style.left = `${20 + Math.random() * 280}px`;
      scrap.style.top = `${20 + Math.random() * 380}px`;
      scrap.dataset.lineIndex = String(i);
      scrap.draggable = true;

      let dragOffsetX = 0, dragOffsetY = 0;
      scrap.addEventListener('mousedown', (e) => {
        const r = scrap.getBoundingClientRect();
        dragOffsetX = e.clientX - r.left;
        dragOffsetY = e.clientY - r.top;
      });
      scrap.addEventListener('dragstart', (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('scrapIndex', String(i));
          e.dataTransfer.setData('type', 'letterScrap');
          e.dataTransfer.effectAllowed = 'move';
        }
      });
      scrapsArea.appendChild(scrap);
    });

    const assembly = document.createElement('div');
    assembly.className = 'letter-assembly';
    lines.forEach((text, i) => {
      const slot = document.createElement('div');
      slot.className = 'letter-assembly-slot';
      slot.dataset.slotIndex = String(i);
      slot.textContent = `第 ${i + 1} 行`;

      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!e.dataTransfer) return;
        const scrapIdx = parseInt(e.dataTransfer.getData('scrapIndex'), 10);
        const slotIdx = parseInt(slot.dataset.slotIndex || '-1', 10);
        if (scrapIdx === slotIdx && !placed.has(slotIdx)) {
          placed.add(slotIdx);
          slot.classList.add('filled');
          slot.textContent = lines[slotIdx];
          const scrap = scrapsArea.querySelector(`[data-line-index="${slotIdx}"]`) as HTMLElement;
          if (scrap) scrap.style.display = 'none';
          tryComplete();
        } else {
          slot.style.animation = 'shake 0.3s ease';
          setTimeout(() => { slot.style.animation = ''; }, 300);
        }
      });
      assembly.appendChild(slot);
      slots.push(slot);
    });

    wrapper.appendChild(scrapsArea);
    wrapper.appendChild(assembly);
    this.container.appendChild(wrapper);
  }
}
