import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const READERS_FILE = path.join(DATA_DIR, 'readers.json');

app.use(cors());
app.use(express.json());

const readJsonFile = async (filePath) => {
  try {
    await fs.ensureFile(filePath);
    const data = await fs.readJson(filePath, { throws: false });
    return data || [];
  } catch {
    return [];
  }
};

const writeJsonFile = async (filePath, data) => {
  await fs.ensureDir(DATA_DIR);
  await fs.writeJson(filePath, data, { spaces: 2 });
};

app.get('/api/activities', async (req, res) => {
  try {
    const activities = await readJsonFile(ACTIVITIES_FILE);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: '获取活动列表失败' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { title, date, time, location, description, type, capacity } = req.body;
    if (!title || !date || !time || !location || !type || !capacity) {
      return res.status(400).json({ error: '缺少必要字段' });
    }
    const activities = await readJsonFile(ACTIVITIES_FILE);
    const newActivity = {
      id: uuidv4(),
      title,
      date,
      time,
      location,
      description,
      type,
      capacity: Number(capacity),
      signups: [],
      createdAt: new Date().toISOString()
    };
    activities.unshift(newActivity);
    await writeJsonFile(ACTIVITIES_FILE, activities);
    res.status(201).json(newActivity);
  } catch (error) {
    res.status(500).json({ error: '创建活动失败' });
  }
});

app.get('/api/activities/:id', async (req, res) => {
  try {
    const activities = await readJsonFile(ACTIVITIES_FILE);
    const activity = activities.find((a) => a.id === req.params.id);
    if (!activity) {
      return res.status(404).json({ error: '活动不存在' });
    }
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: '获取活动详情失败' });
  }
});

app.post('/api/activities/:id/signup', async (req, res) => {
  try {
    const { name, readerId, phone } = req.body;
    if (!name || !readerId || !phone) {
      return res.status(400).json({ error: '缺少必要字段' });
    }
    const activities = await readJsonFile(ACTIVITIES_FILE);
    const activityIndex = activities.findIndex((a) => a.id === req.params.id);
    if (activityIndex === -1) {
      return res.status(404).json({ error: '活动不存在' });
    }
    const activity = activities[activityIndex];
    if (activity.signups.length >= activity.capacity) {
      return res.status(400).json({ error: '活动已满员' });
    }
    const exists = activity.signups.find((s) => s.readerId === readerId);
    if (exists) {
      return res.status(400).json({ error: '您已报名此活动' });
    }
    const signup = {
      id: uuidv4(),
      name,
      readerId,
      phone,
      checkedIn: false,
      checkedInAt: null,
      signedUpAt: new Date().toISOString()
    };
    activity.signups.push(signup);
    activities[activityIndex] = activity;
    await writeJsonFile(ACTIVITIES_FILE, activities);
    res.status(201).json(signup);
  } catch (error) {
    res.status(500).json({ error: '报名失败' });
  }
});

app.put('/api/activities/:id/checkin', async (req, res) => {
  try {
    const { readerId } = req.body;
    if (!readerId) {
      return res.status(400).json({ error: '缺少读者证号' });
    }
    const activities = await readJsonFile(ACTIVITIES_FILE);
    const activityIndex = activities.findIndex((a) => a.id === req.params.id);
    if (activityIndex === -1) {
      return res.status(404).json({ error: '活动不存在' });
    }
    const activity = activities[activityIndex];
    const signupIndex = activity.signups.findIndex((s) => s.readerId === readerId);
    if (signupIndex === -1) {
      return res.status(404).json({ error: '该读者未报名此活动' });
    }
    if (activity.signups[signupIndex].checkedIn) {
      return res.status(400).json({ error: '该读者已签到' });
    }
    activity.signups[signupIndex].checkedIn = true;
    activity.signups[signupIndex].checkedInAt = new Date().toISOString();
    activities[activityIndex] = activity;
    await writeJsonFile(ACTIVITIES_FILE, activities);
    res.json(activity.signups[signupIndex]);
  } catch (error) {
    res.status(500).json({ error: '签到失败' });
  }
});

app.get('/api/readers/:readerId/books', async (req, res) => {
  try {
    const readers = await readJsonFile(READERS_FILE);
    const reader = readers.find((r) => r.readerId === req.params.readerId);
    if (!reader) {
      return res.status(404).json({ error: '读者不存在', borrowedBooks: [] });
    }
    res.json({ borrowedBooks: reader.borrowedBooks || [] });
  } catch (error) {
    res.status(500).json({ error: '获取借阅信息失败', borrowedBooks: [] });
  }
});

const initData = async () => {
  await fs.ensureDir(DATA_DIR);
  const activitiesExist = await fs.pathExists(ACTIVITIES_FILE);
  if (!activitiesExist) {
    const sampleActivities = [
      {
        id: uuidv4(),
        title: '《百年孤独》文学分享会',
        date: '2026-06-20',
        time: '14:00-16:00',
        location: '社区图书馆二楼活动室',
        description: '一起走进马尔克斯的魔幻现实主义世界，探讨布恩迪亚家族七代人的传奇故事。',
        type: '文学',
        capacity: 30,
        signups: [
          { id: uuidv4(), name: '张小明', readerId: '20240001', phone: '13800138001', checkedIn: true, checkedInAt: '2026-06-20T14:05:00.000Z', signedUpAt: '2026-06-10T10:00:00.000Z' },
          { id: uuidv4(), name: '李小红', readerId: '20240002', phone: '13800138002', checkedIn: false, checkedInAt: null, signedUpAt: '2026-06-11T09:30:00.000Z' }
        ],
        createdAt: '2026-06-01T10:00:00.000Z'
      },
      {
        id: uuidv4(),
        title: '《时间简史》科学探索沙龙',
        date: '2026-06-25',
        time: '19:00-21:00',
        location: '社区图书馆多功能厅',
        description: '跟随霍金的脚步，探索宇宙的起源、黑洞的奥秘以及时间的本质。',
        type: '科学',
        capacity: 40,
        signups: [],
        createdAt: '2026-06-05T14:00:00.000Z'
      },
      {
        id: uuidv4(),
        title: '古典诗词艺术鉴赏',
        date: '2026-07-05',
        time: '10:00-12:00',
        location: '社区图书馆文学区',
        description: '品味唐诗宋词之美，感受中华传统文化的博大精深。',
        type: '艺术',
        capacity: 25,
        signups: [],
        createdAt: '2026-06-08T09:00:00.000Z'
      },
      {
        id: uuidv4(),
        title: '生活美学：茶道与阅读',
        date: '2026-05-15',
        time: '15:00-17:00',
        location: '社区图书馆休闲区',
        description: '已结束的活动示例：在茶香中品味生活，在阅读中发现美好。',
        type: '生活',
        capacity: 20,
        signups: [
          { id: uuidv4(), name: '王大伟', readerId: '20240003', phone: '13800138003', checkedIn: true, checkedInAt: '2026-05-15T15:02:00.000Z', signedUpAt: '2026-05-10T10:00:00.000Z' }
        ],
        createdAt: '2026-05-01T10:00:00.000Z'
      }
    ];
    await writeJsonFile(ACTIVITIES_FILE, sampleActivities);
  }
  const readersExist = await fs.pathExists(READERS_FILE);
  if (!readersExist) {
    const sampleReaders = [
      {
        readerId: '20240001',
        borrowedBooks: [
          { id: 'b1', title: '百年孤独', author: '加西亚·马尔克斯', coverColor: '#d4a373' },
          { id: 'b2', title: '霍乱时期的爱情', author: '加西亚·马尔克斯', coverColor: '#c9a959' },
          { id: 'b3', title: '红楼梦', author: '曹雪芹', coverColor: '#b08968' }
        ]
      },
      {
        readerId: '20240002',
        borrowedBooks: [
          { id: 'b4', title: '活着', author: '余华', coverColor: '#a8d5ba' },
          { id: 'b5', title: '许三观卖血记', author: '余华', coverColor: '#95b899' }
        ]
      },
      {
        readerId: '20240003',
        borrowedBooks: [
          { id: 'b6', title: '茶经', author: '陆羽', coverColor: '#b7c9a7' },
          { id: 'b7', title: '中国人的生活美学', author: '刘悦笛', coverColor: '#a5a58d' },
          { id: 'b8', title: '器物滋养', author: '须永义臣', coverColor: '#cb997e' }
        ]
      }
    ];
    await writeJsonFile(READERS_FILE, sampleReaders);
  }
};

initData().then(() => {
  app.listen(PORT, () => {
    console.log(`读书会管理系统后端服务已启动: http://localhost:${PORT}`);
  });
});
