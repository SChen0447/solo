import express, { Request, Response } from 'express';
import cors from 'cors';
import { format, subDays, differenceInHours, differenceInMinutes, parseISO, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

interface CheckinRecord {
  userId: string;
  userName: string;
  checkinTime: string;
}

interface DailyStats {
  date: string;
  totalHours: number;
}

interface CheckinStore {
  [date: string]: {
    [userId: string]: CheckinRecord;
  };
}

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: '张三', avatar: '👨‍💻' },
  { id: '2', name: '李四', avatar: '👩‍💻' },
  { id: '3', name: '王五', avatar: '🧑‍💻' },
  { id: '4', name: '赵六', avatar: '👨‍🎨' },
  { id: '5', name: '钱七', avatar: '👩‍🔬' },
];

const checkinStore: CheckinStore = {};

const getTodayKey = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

const generateWeeklyData = (): DailyStats[] => {
  const stats: DailyStats[] = [];
  const todayKey = getTodayKey();
  const todayCheckins = checkinStore[todayKey] || {};
  
  let todayTotalHours = 0;
  Object.values(todayCheckins).forEach((record) => {
    const checkinDate = parseISO(record.checkinTime);
    const hours = differenceInMinutes(new Date(), checkinDate) / 60;
    todayTotalHours += Math.max(0, hours);
  });

  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (i === 0) {
      stats.push({
        date: dateStr,
        totalHours: Math.round(todayTotalHours * 10) / 10,
      });
    } else {
      const baseHours = 4 + Math.sin(i * 1.5) * 2 + Math.random() * 2;
      stats.push({
        date: dateStr,
        totalHours: Math.round(Math.max(2, Math.min(12, baseHours)) * 10) / 10,
      });
    }
  }

  return stats;
};

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/checkin', (req: Request, res: Response) => {
  const { userId, userName } = req.body;

  if (!userId || !userName) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数',
    });
  }

  const todayKey = getTodayKey();

  if (!checkinStore[todayKey]) {
    checkinStore[todayKey] = {};
  }

  if (checkinStore[todayKey][userId]) {
    return res.json({
      success: false,
      message: '今日已签到',
      record: checkinStore[todayKey][userId],
    });
  }

  const record: CheckinRecord = {
    userId,
    userName,
    checkinTime: new Date().toISOString(),
  };

  checkinStore[todayKey][userId] = record;

  res.json({
    success: true,
    message: '签到成功',
    record,
  });
});

app.get('/api/today', (_req: Request, res: Response) => {
  const todayKey = getTodayKey();
  const todayCheckins = checkinStore[todayKey] || {};
  
  const checkins: CheckinRecord[] = Object.values(todayCheckins).sort(
    (a, b) => new Date(a.checkinTime).getTime() - new Date(b.checkinTime).getTime()
  );

  res.json({
    checkins,
    members: TEAM_MEMBERS,
  });
});

app.get('/api/weekly', (_req: Request, res: Response) => {
  const stats = generateWeeklyData();
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
