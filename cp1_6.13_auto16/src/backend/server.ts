import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json());

interface Course {
  id: string;
  name: string;
  coach: string;
  date: string;
  timeSlot: string;
  maxCapacity: number;
  bookedMembers: string[];
}

interface WorkoutRecord {
  id: string;
  memberId: string;
  date: string;
  courseName: string;
  duration: number;
}

const courses: Course[] = [
  {
    id: '1',
    name: 'HIIT燃脂',
    coach: '李教练',
    date: '2026-06-15',
    timeSlot: '09:00-10:00',
    maxCapacity: 15,
    bookedMembers: ['user1', 'user2', 'user3'],
  },
  {
    id: '2',
    name: '瑜伽放松',
    coach: '王教练',
    date: '2026-06-15',
    timeSlot: '10:30-11:30',
    maxCapacity: 10,
    bookedMembers: ['user1'],
  },
  {
    id: '3',
    name: '力量训练',
    coach: '张教练',
    date: '2026-06-16',
    timeSlot: '14:00-15:00',
    maxCapacity: 20,
    bookedMembers: ['user2', 'user4'],
  },
  {
    id: '4',
    name: '搏击操',
    coach: '赵教练',
    date: '2026-06-16',
    timeSlot: '16:00-17:00',
    maxCapacity: 12,
    bookedMembers: [],
  },
  {
    id: '5',
    name: '普拉提核心',
    coach: '李教练',
    date: '2026-06-17',
    timeSlot: '09:00-10:00',
    maxCapacity: 8,
    bookedMembers: ['user1', 'user3', 'user5'],
  },
  {
    id: '6',
    name: '动感单车',
    coach: '陈教练',
    date: '2026-06-17',
    timeSlot: '18:00-19:00',
    maxCapacity: 18,
    bookedMembers: ['user2'],
  },
];

const workoutRecords: WorkoutRecord[] = [
  { id: 'r1', memberId: 'user1', date: '2026-06-08', courseName: 'HIIT燃脂', duration: 60 },
  { id: 'r2', memberId: 'user1', date: '2026-06-09', courseName: '瑜伽放松', duration: 60 },
  { id: 'r3', memberId: 'user1', date: '2026-06-10', courseName: '力量训练', duration: 90 },
  { id: 'r4', memberId: 'user1', date: '2026-06-12', courseName: '搏击操', duration: 45 },
  { id: 'r5', memberId: 'user1', date: '2026-06-13', courseName: '普拉提核心', duration: 55 },
];

let nextCourseId = 7;
let nextRecordId = 6;

app.get('/api/courses', (_req, res) => {
  res.json(courses);
});

app.post('/api/courses', (req, res) => {
  const { name, coach, date, timeSlot, maxCapacity } = req.body;
  if (!name || !coach || !date || !timeSlot || !maxCapacity) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  if (maxCapacity < 5 || maxCapacity > 20) {
    res.status(400).json({ error: '最大容纳人数需在5-20人之间' });
    return;
  }
  const course: Course = {
    id: String(nextCourseId++),
    name,
    coach,
    date,
    timeSlot,
    maxCapacity,
    bookedMembers: [],
  };
  courses.push(course);
  res.status(201).json(course);
});

app.post('/api/courses/:id/book', (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body;
  const course = courses.find((c) => c.id === id);
  if (!course) {
    res.status(404).json({ error: '课程不存在' });
    return;
  }
  if (course.bookedMembers.includes(memberId)) {
    res.status(400).json({ error: '已预约该课程' });
    return;
  }
  if (course.bookedMembers.length >= course.maxCapacity) {
    res.status(400).json({ error: '课程已满' });
    return;
  }
  course.bookedMembers.push(memberId);
  res.json({ success: true, course });
});

app.post('/api/courses/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body;
  const course = courses.find((c) => c.id === id);
  if (!course) {
    res.status(404).json({ error: '课程不存在' });
    return;
  }
  const idx = course.bookedMembers.indexOf(memberId);
  if (idx === -1) {
    res.status(400).json({ error: '未预约该课程' });
    return;
  }
  course.bookedMembers.splice(idx, 1);
  res.json({ success: true, course });
});

app.get('/api/progress/:memberId', (req, res) => {
  const { memberId } = req.params;
  const records = workoutRecords.filter((r) => r.memberId === memberId);
  res.json(records);
});

app.post('/api/progress', (req, res) => {
  const { memberId, date, courseName, duration } = req.body;
  if (!memberId || !date || !courseName || !duration) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const record: WorkoutRecord = {
    id: String(nextRecordId++),
    memberId,
    date,
    courseName,
    duration,
  };
  workoutRecords.push(record);
  res.status(201).json(record);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
