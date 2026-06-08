import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 58321;

app.use(express.json());

export type ApplicationStatus = 'applied' | 'interviewing' | 'rejected' | 'offer';

export interface Application {
  id: string;
  company: string;
  position: string;
  applyDate: string;
  status: ApplicationStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

let applications: Application[] = [
  {
    id: uuidv4(),
    company: '字节跳动',
    position: '高级前端工程师',
    applyDate: '2026-06-01',
    status: 'interviewing',
    notes: '一面已通过，等待二面通知',
    createdAt: new Date('2026-06-01').toISOString(),
    updatedAt: new Date('2026-06-01').toISOString(),
  },
  {
    id: uuidv4(),
    company: '阿里巴巴',
    position: '前端开发工程师',
    applyDate: '2026-05-28',
    status: 'applied',
    notes: '内推投递，等待HR联系',
    createdAt: new Date('2026-05-28').toISOString(),
    updatedAt: new Date('2026-05-28').toISOString(),
  },
  {
    id: uuidv4(),
    company: '腾讯',
    position: '全栈开发工程师',
    applyDate: '2026-05-20',
    status: 'rejected',
    notes: '三面后未通过，反馈是系统设计有待加强',
    createdAt: new Date('2026-05-20').toISOString(),
    updatedAt: new Date('2026-06-05').toISOString(),
  },
  {
    id: uuidv4(),
    company: '美团',
    position: 'React开发工程师',
    applyDate: '2026-05-15',
    status: 'offer',
    notes: '已收到offer，薪资25k*16，考虑中',
    createdAt: new Date('2026-05-15').toISOString(),
    updatedAt: new Date('2026-06-03').toISOString(),
  },
  {
    id: uuidv4(),
    company: '京东',
    position: '前端架构师',
    applyDate: '2026-06-05',
    status: 'applied',
    notes: '',
    createdAt: new Date('2026-06-05').toISOString(),
    updatedAt: new Date('2026-06-05').toISOString(),
  },
  {
    id: uuidv4(),
    company: '小米',
    position: '高级前端开发',
    applyDate: '2026-06-03',
    status: 'interviewing',
    notes: '技术面已完成，HR面约在下周',
    createdAt: new Date('2026-06-03').toISOString(),
    updatedAt: new Date('2026-06-06').toISOString(),
  },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/api/applications', async (req: Request, res: Response) => {
  await delay(100);
  const { status } = req.query;
  let result = [...applications];
  if (status && status !== 'all') {
    result = result.filter(app => app.status === status);
  }
  result.sort((a, b) => new Date(b.applyDate).getTime() - new Date(a.applyDate).getTime());
  res.json(result);
});

app.get('/api/applications/:id', async (req: Request, res: Response) => {
  await delay(50);
  const app = applications.find(a => a.id === req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Application not found' });
  }
  res.json(app);
});

app.post('/api/applications', async (req: Request, res: Response) => {
  await delay(100);
  const { company, position, applyDate, status, notes } = req.body;
  if (!company || !position || !applyDate || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const newApp: Application = {
    id: uuidv4(),
    company,
    position,
    applyDate,
    status,
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  applications.unshift(newApp);
  res.status(201).json(newApp);
});

app.put('/api/applications/:id', async (req: Request, res: Response) => {
  await delay(100);
  const index = applications.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const { company, position, applyDate, status, notes } = req.body;
  applications[index] = {
    ...applications[index],
    company: company ?? applications[index].company,
    position: position ?? applications[index].position,
    applyDate: applyDate ?? applications[index].applyDate,
    status: status ?? applications[index].status,
    notes: notes !== undefined ? notes : applications[index].notes,
    updatedAt: new Date().toISOString(),
  };
  res.json(applications[index]);
});

app.delete('/api/applications/:id', async (req: Request, res: Response) => {
  await delay(100);
  const index = applications.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }
  const deleted = applications.splice(index, 1)[0];
  res.json(deleted);
});

app.get('/api/stats', async (req: Request, res: Response) => {
  await delay(50);
  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === 'applied').length,
    interviewing: applications.filter(a => a.status === 'interviewing').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    offer: applications.filter(a => a.status === 'offer').length,
  };
  res.json(stats);
});

app.get('/api/export', async (req: Request, res: Response) => {
  await delay(200);
  const headers = ['公司', '职位', '投递日期', '状态', '备注'];
  const statusMap: Record<string, string> = {
    applied: '已投递',
    interviewing: '面试中',
    rejected: '已拒绝',
    offer: '已offer',
  };
  const rows = applications.map(app => [
    app.company,
    app.position,
    app.applyDate,
    statusMap[app.status] || app.status,
    app.notes || '',
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
  res.send('\uFEFF' + csvContent);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
