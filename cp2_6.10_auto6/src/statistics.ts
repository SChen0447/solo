import {
  TodoItem,
  storage,
  $,
  el,
  formatDate,
  isToday,
  isOverdue,
  getDaysAgo
} from './utils';
import { board } from './board';

const COMPLETION_LOG_KEY = 'completion_log';

interface Stats {
  completedToday: number;
  pendingTotal: number;
  overdueTotal: number;
  trend: { date: string; count: number }[];
}

class StatisticsModule {
  init(): void {
    this.render();
  }

  getStats(items: TodoItem[]): Stats {
    const log = storage<Record<string, number>>(COMPLETION_LOG_KEY) || {};
    const today = formatDate(new Date(), 'YYYY-MM-DD');

    let completedToday = 0;
    items.forEach((item) => {
      if (item.completed && item.completedAt) {
        const d = formatDate(new Date(item.completedAt), 'YYYY-MM-DD');
        if (d === today) completedToday++;
      }
    });
    completedToday = completedToday || (log[today] || 0);

    const pendingTotal = items.filter((i) => !i.completed).length;
    const overdueTotal = items.filter((i) => !i.completed && isOverdue(i.dueDate)).length;

    const trend: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = getDaysAgo(i);
      const shortDate = dateStr.slice(5);
      let count = 0;
      items.forEach((item) => {
        if (item.completed && item.completedAt) {
          const d = formatDate(new Date(item.completedAt), 'YYYY-MM-DD');
          if (d === dateStr) count++;
        }
      });
      count = count || (log[dateStr] || 0);
      trend.push({ date: shortDate, count });
    }

    return { completedToday, pendingTotal, overdueTotal, trend };
  }

  render(): void {
    const items = board.getItems();
    const stats = this.getStats(items);
    const panel = $('#statsPanel')!;
    panel.innerHTML = '';

    panel.appendChild(this.makeStatCard('今日已完成', String(stats.completedToday), '#10b981', 'linear-gradient(135deg, #d1fae5, #a7f3d0)'));
    panel.appendChild(this.makeStatCard('待处理总数', String(stats.pendingTotal), '#6366f1', 'linear-gradient(135deg, #e0e7ff, #c7d2fe)'));
    panel.appendChild(this.makeStatCard('超期任务', String(stats.overdueTotal), '#ef4444', 'linear-gradient(135deg, #fee2e2, #fecaca)'));

    const chartCard = el('div', { class: 'stat-card stat-card-chart' });
    const chartHeader = el('div', { class: 'stat-card-header' });
    chartHeader.appendChild(el('div', { class: 'stat-card-title' }, '近7天完成趋势'));
    const chartValue = el('div', { class: 'stat-card-value' });
    const total7 = stats.trend.reduce((s, d) => s + d.count, 0);
    chartValue.textContent = `${total7} 个`;
    chartHeader.appendChild(chartValue);
    chartCard.appendChild(chartHeader);

    const canvas = el('canvas', { class: 'trend-chart' }) as HTMLCanvasElement;
    canvas.width = 320;
    canvas.height = 100;
    chartCard.appendChild(canvas);
    panel.appendChild(chartCard);

    requestAnimationFrame(() => this.renderChart(canvas, stats.trend));
  }

  private makeStatCard(label: string, value: string, color: string, bg: string): HTMLElement {
    const card = el('div', { class: 'stat-card' });
    (card as HTMLElement).style.background = bg;
    const title = el('div', { class: 'stat-card-title' }, label);
    (title as HTMLElement).style.color = '#475569';
    const val = el('div', { class: 'stat-card-value' }, value);
    (val as HTMLElement).style.color = color;
    card.appendChild(title);
    card.appendChild(val);
    return card;
  }

  renderChart(canvas: HTMLCanvasElement, data: { date: string; count: number }[]): void {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 100;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 28;
    const padR = 10;
    const padT = 10;
    const padB = 22;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const maxVal = Math.max(1, ...data.map((d) => d.count));

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padT + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      const val = Math.round(maxVal - (maxVal / 3) * i);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), padL - 4, y + 3);
    }

    const step = data.length > 1 ? chartW / (data.length - 1) : 0;
    const points = data.map((d, i) => ({
      x: padL + step * i,
      y: padT + chartH - (d.count / maxVal) * chartH
    }));

    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.beginPath();
    ctx.moveTo(points[0].x, padT + chartH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#6366f1';
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(data[i].date, p.x, h - 6);
    });
    void isToday;
  }
}

export const statistics = new StatisticsModule();
