import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { CardDeck, Card, ReviewRecord } from '../types';
import { isDueToday } from '../srsEngine';

interface StatsDashboardProps {
  decks: CardDeck[];
  cards: Record<string, Card[]>;
  reviewRecords: ReviewRecord[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ decks, cards, reviewRecords }) => {
  const ringOption = useMemo(() => {
    const data = decks.map(deck => {
      const deckCards = cards[deck.id] || [];
      const dueCount = deckCards.filter(isDueToday).length;
      const totalCount = deckCards.length;
      return {
        name: deck.title,
        value: totalCount,
        dueCount,
        completedCount: totalCount - dueCount
      };
    });

    const colors = ['#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#EFEBE9'];

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = data.find(d => d.name === params.name);
          if (item) {
            return `${params.name}<br/>总计: ${item.value} 张<br/>到期: ${item.dueCount} 张<br/>已掌握: ${item.completedCount} 张`;
          }
          return params.name;
        }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: {
          color: '#5D4037',
          fontFamily: 'Nunito, sans-serif'
        }
      },
      series: [
        {
          name: '卡包进度',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#F5E6CA',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#5D4037'
            }
          },
          labelLine: {
            show: false
          },
          data: data.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: colors[index % colors.length]
            }
          }))
        }
      ]
    };
  }, [decks, cards]);

  const heatmapOption = useMemo(() => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const dailyCounts: Record<string, number> = {};
    reviewRecords.forEach(record => {
      const date = record.date;
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const dates: string[] = [];
    const data: [string, number][] = [];
    let d = new Date(oneYearAgo);
    while (d <= today) {
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      data.push([dateStr, dailyCounts[dateStr] || 0]);
      d.setDate(d.getDate() + 1);
    }

    const weeks: string[][] = [];
    let currentWeek: string[] = [];
    const startDay = oneYearAgo.getDay();
    
    for (let i = 0; i < startDay; i++) {
      currentWeek.push('');
    }
    
    dates.forEach(date => {
      currentWeek.push(date);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push('');
      }
      weeks.push(currentWeek);
    }

    const maxCount = Math.max(...Object.values(dailyCounts), 1);

    const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];

    const months: { name: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstValidDate = week.find(d => d !== '');
      if (firstValidDate) {
        const month = new Date(firstValidDate).getMonth();
        if (month !== lastMonth) {
          months.push({ name: `${month + 1}月`, weekIndex });
          lastMonth = month;
        }
      }
    });

    return {
      tooltip: {
        formatter: (params: any) => {
          if (params.value && params.value[0]) {
            const count = dailyCounts[params.value[0]] || 0;
            return `${params.value[0]}<br/>复习了 ${count} 张卡片`;
          }
          return '';
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        top: '15%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: weeks.map((_, i) => i),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          show: true,
          formatter: (value: number) => {
            const month = months.find(m => m.weekIndex === value);
            return month ? month.name : '';
          },
          color: '#5D4037',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'category',
        data: weekLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#5D4037',
          fontSize: 11
        }
      },
      series: [
        {
          type: 'heatmap',
          data: data
            .map(([date, count]) => {
              const dateObj = new Date(date);
              const dayOfWeek = dateObj.getDay();
              let weekNum = 0;
              for (let i = 0; i < weeks.length; i++) {
                if (weeks[i].includes(date)) {
                  weekNum = i;
                  break;
                }
              }
              return [weekNum, dayOfWeek, count, date];
            })
            .filter(item => item[0] !== undefined),
          label: { show: false },
          itemStyle: {
            borderRadius: 2,
            borderWidth: 1,
            borderColor: '#F5E6CA'
          },
          emphasis: {
            itemStyle: {
              borderColor: '#5D4037',
              borderWidth: 1
            }
          }
        }
      ],
      visualMap: {
        min: 0,
        max: maxCount,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#EFEBE9', '#C8E6C9', '#81C784', '#4CAF50', '#2E7D32']
        },
        textStyle: {
          color: '#5D4037',
          fontSize: 11
        },
        show: true
      }
    };
  }, [reviewRecords]);

  const totalCards = decks.reduce((sum, deck) => sum + (cards[deck.id]?.length || 0), 0);
  const totalDue = decks.reduce((sum, deck) => {
    const deckCards = cards[deck.id] || [];
    return sum + deckCards.filter(isDueToday).length;
  }, 0);
  const totalReviewedToday = reviewRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length;

  return (
    <div className="stats-dashboard fade-in">
      <h2>学习统计</h2>
      
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-number">{decks.length}</div>
          <div className="stat-label">卡包数量</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalCards}</div>
          <div className="stat-label">总卡片数</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-number">{totalDue}</div>
          <div className="stat-label">今日待复习</div>
        </div>
        <div className="stat-card success">
          <div className="stat-number">{totalReviewedToday}</div>
          <div className="stat-label">今日已复习</div>
        </div>
      </div>

      <div className="chart-section">
        <h3>卡包分布</h3>
        <div className="chart-container ring-chart">
          {decks.length > 0 ? (
            <ReactECharts option={ringOption} style={{ height: '300px' }} />
          ) : (
            <div className="empty-chart">暂无数据，创建卡包后显示统计</div>
          )}
        </div>
      </div>

      <div className="chart-section">
        <h3>复习日历</h3>
        <div className="chart-container heatmap-chart">
          <ReactECharts option={heatmapOption} style={{ height: '200px' }} />
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
