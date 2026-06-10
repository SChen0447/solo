import { useEffect, useState } from 'react';
import type { CheckInRecord } from '@/types';
import { getHourFromTimestamp, interpolateColor, animateNumber } from '@/utils';

interface HeatMapProps {
  records: CheckInRecord[];
}

export default function HeatMap({ records }: HeatMapProps) {
  const [hourCounts, setHourCounts] = useState<number[]>(new Array(24).fill(0));
  const [totalCount, setTotalCount] = useState(0);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [avgTime, setAvgTime] = useState(0);

  useEffect(() => {
    const counts = new Array(24).fill(0);
    let male = 0;
    let female = 0;
    let totalMinutes = 0;

    records.forEach((record) => {
      const hour = getHourFromTimestamp(record.checkedAt);
      counts[hour] = (counts[hour] || 0) + 1;
      if (record.userCard.gender === 'male') male++;
      else female++;
      const date = new Date(record.checkedAt);
      totalMinutes += date.getHours() * 60 + date.getMinutes();
    });

    setHourCounts(counts);
    animateNumber(records.length, 800, setTotalCount);
    animateNumber(male, 800, setMaleCount);
    animateNumber(female, 800, setFemaleCount);
    setAvgTime(records.length > 0 ? Math.round(totalMinutes / records.length) : 0);
  }, [records]);

  const maxCount = Math.max(...hourCounts, 1);
  const avgHours = Math.floor(avgTime / 60);
  const avgMinutes = avgTime % 60;
  const malePercent = totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 50;
  const femalePercent = totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 50;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>📊 签到热力图</h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(12, 1fr)', 
        gap: '4px', 
        marginBottom: '24px' 
      }}>
        {hourCounts.slice(0, 12).map((count, hour) => (
          <div
            key={`am-${hour}`}
            title={`${hour}:00 - ${hour + 1}:00: ${count}人`}
            style={{
              height: '40px',
              borderRadius: '6px',
              background: interpolateColor(count / maxCount),
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              fontSize: '10px',
              paddingBottom: '2px'
            }}
          >
            {count > 0 ? count : ''}
          </div>
        ))}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(12, 1fr)', 
        gap: '4px', 
        marginBottom: '24px' 
      }}>
        {hourCounts.slice(12, 24).map((count, hour) => (
          <div
            key={`pm-${hour}`}
            title={`${hour + 12}:00 - ${hour + 13}:00: ${count}人`}
            style={{
              height: '40px',
              borderRadius: '6px',
              background: interpolateColor(count / maxCount),
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              fontSize: '10px',
              paddingBottom: '2px'
            }}
          >
            {count > 0 ? count : ''}
          </div>
        ))}
      </div>

      <div className="flex-between flex-wrap" style={{ gap: '16px' }}>
        <div className="stat-item" style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', background: 'linear-gradient(90deg, #3a86ff, #9d4edd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'countUp 0.8s ease' }}>
            {totalCount}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>总签到人数</div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>
            <span style={{ color: '#3a86ff' }}>♂ {maleCount}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
            <span style={{ color: '#e94560' }}>♀ {femaleCount}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            男 {malePercent}% / 女 {femalePercent}%
          </div>
        </div>
        <div className="stat-item" style={{ textAlign: 'center', flex: 1, minWidth: '120px' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>
            {avgHours.toString().padStart(2, '0')}:{avgMinutes.toString().padStart(2, '0')}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>平均签到时间</div>
        </div>
      </div>
    </div>
  );
}
