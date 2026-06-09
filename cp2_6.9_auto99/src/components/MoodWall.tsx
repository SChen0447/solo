import React, { useEffect, useState, useMemo } from 'react';
import TrendChart, { DayData } from './TrendChart';
import { ColorHsl } from './ColorPicker';

export interface MoodRecord {
  id: string;
  date: string;
  colorHsl: ColorHsl;
  note: string;
  timestamp: number;
}

interface WeekRecord {
  date: string;
  records: MoodRecord[];
}

interface MoodWallProps {
  refreshTrigger?: number;
}

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function matchEmoji(color: ColorHsl): string {
  const { h, s, l } = color;
  if (l < 20) return '🌙';
  if (l > 85 && s < 20) return '🕊️';
  if (s < 30) {
    if (h >= 0 && h < 60) return '🌸';
    if (h >= 60 && h < 180) return '🌿';
    if (h >= 180 && h < 280) return '💧';
    return '🍃';
  }
  if (h >= 0 && h < 40) return l > 60 ? '🔥' : '⚠️';
  if (h >= 40 && h < 75) return l > 65 ? '☀️' : '🌻';
  if (h >= 75 && h < 160) return l > 60 ? '🌱' : '🌲';
  if (h >= 160 && h < 210) return l > 60 ? '💦' : '💧';
  if (h >= 210 && h < 280) return l > 60 ? '🦋' : '🔮';
  if (h >= 280 && h < 320) return l > 60 ? '💜' : '🌙';
  if (h >= 320 && h < 360) return l > 60 ? '💕' : '🌹';
  return '✨';
}

function matchLabel(color: ColorHsl): string {
  const { h, s, l } = color;
  if (l < 20) return '沉寂';
  if (l > 85 && s < 20) return '平和';
  if (s < 30) {
    if (h >= 0 && h < 60) return '温柔';
    if (h >= 60 && h < 180) return '宁静';
    if (h >= 180 && h < 280) return '忧郁';
    return '恬静';
  }
  if (h >= 0 && h < 40) return l > 60 ? '兴奋' : '焦虑';
  if (h >= 40 && h < 75) return l > 65 ? '愉悦' : '温暖';
  if (h >= 75 && h < 160) return l > 60 ? '希望' : '沉静';
  if (h >= 160 && h < 210) return l > 60 ? '清新' : '忧郁';
  if (h >= 210 && h < 280) return l > 60 ? '梦幻' : '沉思';
  if (h >= 280 && h < 320) return l > 60 ? '浪漫' : '神秘';
  if (h >= 320 && h < 360) return l > 60 ? '甜蜜' : '热忱';
  return '平和';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

const MoodWall: React.FC<MoodWallProps> = ({ refreshTrigger = 0 }) => {
  const [weekData, setWeekData] = useState<WeekRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/mood/week?start=${getWeekStart(today)}`);
        const data: WeekRecord[] = await res.json();
        setWeekData(data);
      } catch (e) {
        console.error('Failed to load mood data', e);
      }
      setLoading(false);
    };
    fetchData();
  }, [refreshTrigger, today]);

  const flatRecords = useMemo(() => {
    const all: (MoodRecord & { dateLabel: string })[] = [];
    weekData.forEach((w) => {
      w.records.forEach((r) => {
        all.push({ ...r, dateLabel: w.date });
      });
    });
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }, [weekData]);

  const trendData: DayData[] = useMemo(() => {
    return weekData.map((w) => {
      if (w.records.length === 0) {
        return { date: w.date, hue: null };
      }
      const avgHue =
        w.records.reduce((sum, r) => sum + r.colorHsl.h, 0) / w.records.length;
      const primaryRec = w.records[0];
      return {
        date: w.date,
        hue: Math.round(avgHue),
        label: matchLabel(primaryRec.colorHsl),
      };
    });
  }, [weekData]);

  const selectedDay = selectedDate
    ? weekData.find((w) => w.date === selectedDate)
    : null;

  if (loading && flatRecords.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999', fontFamily: 'Inter, sans-serif' }}>
        加载中...
      </div>
    );
  }

  if (flatRecords.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999', fontFamily: 'Inter, sans-serif' }}>
        还没有记录，开始混合你的第一个情绪色彩吧 ✨
      </div>
    );
  }

  return (
    <>
      <div
        className="mood-wall"
        style={{
          columnCount: 'auto',
          columnWidth: 200,
          columnGap: 16,
          width: '100%',
        }}
      >
        {flatRecords.map((record) => (
          <div
            key={record.id}
            onClick={() => setSelectedDate(record.dateLabel)}
            style={{
              display: 'inline-block',
              width: '100%',
              marginBottom: 16,
              breakInside: 'avoid',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
          >
            <div
              style={{
                width: '100%',
                height: record.note ? 140 : 180,
                background: hslToString(
                  record.colorHsl.h,
                  record.colorHsl.s,
                  record.colorHsl.l
                ),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                transition: 'background 0.5s ease',
              }}
            >
              {matchEmoji(record.colorHsl)}
            </div>
            <div style={{ padding: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  color: '#999',
                  marginBottom: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{formatDate(record.dateLabel)}</span>
                <span style={{ color: '#666', fontWeight: 500 }}>
                  {matchLabel(record.colorHsl)}
                </span>
              </div>
              {record.note && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#444',
                    lineHeight: 1.5,
                    marginTop: 6,
                  }}
                >
                  {record.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedDay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={() => setSelectedDate(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 24,
              boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
              maxWidth: 680,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 32,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#222' }}>
                  {formatDate(selectedDay.date)}
                </div>
                <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
                  共 {selectedDay.records.length} 条情绪记录
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#999',
                  padding: 8,
                  borderRadius: 8,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F0F0F0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                ✕
              </button>
            </div>

            {selectedDay.records.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginBottom: 28,
                  flexWrap: 'wrap',
                }}
              >
                {selectedDay.records.map((r, idx) => (
                  <div
                    key={r.id}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      background: '#FAFAFA',
                      borderRadius: 16,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: 120,
                        background: hslToString(
                          r.colorHsl.h,
                          r.colorHsl.s,
                          r.colorHsl.l
                        ),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 40,
                      }}
                    >
                      {matchEmoji(r.colorHsl)}
                    </div>
                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#999',
                          marginBottom: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>记录 {idx + 1}</span>
                        <span style={{ fontWeight: 500, color: '#666' }}>
                          {matchLabel(r.colorHsl)}
                        </span>
                      </div>
                      {r.note ? (
                        <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                          {r.note}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#BBB' }}>无备注</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                本周情绪趋势
              </div>
              <TrendChart data={trendData} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .mood-wall {
            column-count: 2 !important;
            column-width: auto !important;
          }
        }
      `}</style>
    </>
  );
};

export default MoodWall;
