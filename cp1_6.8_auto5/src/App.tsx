import { useState, useEffect, useCallback } from 'react';
import CheckinPanel from './CheckinPanel';
import ChartView from './ChartView';

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

export interface CheckinRecord {
  userId: string;
  userName: string;
  checkinTime: string;
}

export interface DailyStats {
  date: string;
  totalHours: number;
}

export interface TodayData {
  checkins: CheckinRecord[];
  members: TeamMember[];
}

function App() {
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('1');

  const fetchTodayData = useCallback(async () => {
    try {
      const response = await fetch('/api/today');
      const data = await response.json();
      setTodayData(data);
    } catch (error) {
      console.error('获取今日数据失败:', error);
    }
  }, []);

  const fetchWeeklyData = useCallback(async () => {
    try {
      const response = await fetch('/api/weekly');
      const data = await response.json();
      setWeeklyData(data);
    } catch (error) {
      console.error('获取周统计数据失败:', error);
    }
  }, []);

  const handleCheckin = useCallback(async () => {
    if (!todayData) return;
    
    const member = todayData.members.find((m) => m.id === currentUserId);
    if (!member) return;

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          userName: member.name,
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        fetchTodayData();
        fetchWeeklyData();
      }
      
      return result;
    } catch (error) {
      console.error('签到失败:', error);
      return { success: false, message: '网络错误' };
    }
  }, [currentUserId, todayData, fetchTodayData, fetchWeeklyData]);

  const hasCheckedIn = todayData?.checkins.some(
    (record) => record.userId === currentUserId
  ) || false;

  useEffect(() => {
    fetchTodayData();
    fetchWeeklyData();
  }, [fetchTodayData, fetchWeeklyData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodayData();
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchTodayData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeeklyData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchWeeklyData]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🏢 团队签到与工时看板</h1>
        <p>实时记录团队出勤，一目了然掌握工时数据</p>
      </header>

      <div className="main-content">
        <CheckinPanel
          data={todayData}
          hasCheckedIn={hasCheckedIn}
          currentUserId={currentUserId}
          onCheckin={handleCheckin}
          onUserChange={setCurrentUserId}
        />
        <ChartView data={weeklyData} />
      </div>
    </div>
  );
}

export default App;
