import type { EmotionRecord } from './types';

interface TimelineNavProps {
  records: EmotionRecord[];
  onMonthClick: (month: string) => void;
}

interface MonthData {
  month: string;
  label: string;
  count: number;
  avgColor: string | null;
  summary: string;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function averageColors(colors: string[]): string {
  if (colors.length === 0) return '';
  let r = 0, g = 0, b = 0;
  let validCount = 0;
  for (const color of colors) {
    const rgb = hexToRgb(color);
    if (rgb) {
      r += rgb[0];
      g += rgb[1];
      b += rgb[2];
      validCount++;
    }
  }
  if (validCount === 0) return '#636E72';
  return rgbToHex(
    Math.round(r / validCount),
    Math.round(g / validCount),
    Math.round(b / validCount)
  );
}

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function TimelineNav({ records, onMonthClick }: TimelineNavProps) {
  const months: MonthData[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < 12; i++) {
    const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    const monthRecords = records.filter((r) => r.date.startsWith(monthStr));
    const colors: string[] = [];
    monthRecords.forEach((r) => {
      colors.push(r.gradientStart);
      colors.push(r.gradientEnd);
    });

    const mostCommonEmotion = (() => {
      const counts: Record<string, number> = {};
      monthRecords.forEach((r) => {
        if (r.emotionLabel) {
          counts[r.emotionLabel] = (counts[r.emotionLabel] || 0) + 1;
        }
      });
      let max = 0;
      let result = '';
      for (const [label, count] of Object.entries(counts)) {
        if (count > max) {
          max = count;
          result = label;
        }
      }
      return result;
    })();

    const totalLikes = monthRecords.reduce((sum, r) => sum + r.likes, 0);

    months.push({
      month: monthStr,
      label: MONTH_LABELS[i],
      count: monthRecords.length,
      avgColor: monthRecords.length > 0 ? averageColors(colors) : null,
      summary:
        monthRecords.length > 0
          ? `${MONTH_LABELS[i]}：${monthRecords.length}条记录，主打情绪"${mostCommonEmotion || '-'}",共${totalLikes}个赞`
          : `${MONTH_LABELS[i]}：暂无记录`,
    });
  }

  return (
    <div className="timeline-nav">
      {months.map((m) => (
        <div
          key={m.month}
          className={`month-dot ${m.count === 0 ? 'empty' : ''}`}
          style={m.avgColor ? { background: m.avgColor } : undefined}
          onClick={() => m.count > 0 && onMonthClick(m.month)}
          title={m.label}
        >
          <div className="month-tooltip">{m.summary}</div>
        </div>
      ))}
    </div>
  );
}
