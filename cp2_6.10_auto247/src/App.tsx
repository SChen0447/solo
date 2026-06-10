import { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import type {
  Schedule,
  Song,
  Member,
  TodoItem,
  MemberStatusType,
  ScheduleType,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { addDays, formatISO } from 'date-fns';

const initialMembers: Member[] = [
  { id: uuidv4(), name: 'Alex', color: '#7c4dff', status: 'idle' },
  { id: uuidv4(), name: 'Blake', color: '#448aff', status: 'idle' },
  { id: uuidv4(), name: 'Casey', color: '#69f0ae', status: 'rehearsing' },
  { id: uuidv4(), name: 'Dylan', color: '#ff6d00', status: 'resting' },
];

const today = new Date();
const tomorrow = addDays(today, 1);
const dayAfter = addDays(today, 2);

const initialSchedules: Schedule[] = [
  {
    id: uuidv4(),
    title: '新曲目排练',
    type: 'rehearsal' as ScheduleType,
    date: formatISO(today.setHours(19, 0, 0, 0)),
    location: 'B2排练室',
    notes: '重点练习新歌《Midnight》副歌部分',
    completed: false,
    cancelled: false,
  },
  {
    id: uuidv4(),
    title: '周末小型演出',
    type: 'gig' as ScheduleType,
    date: formatISO(tomorrow.setHours(20, 0, 0, 0)),
    location: '星光Livehouse',
    notes: '提前1小时到场调音，准备5首曲目',
    completed: false,
    cancelled: false,
  },
  {
    id: uuidv4(),
    title: '编曲讨论',
    type: 'rehearsal' as ScheduleType,
    date: formatISO(dayAfter.setHours(15, 0, 0, 0)),
    location: '线上会议',
    notes: '讨论新EP整体编曲方向',
    completed: false,
    cancelled: false,
  },
];

const initialSongs: Song[] = [
  {
    id: uuidv4(),
    title: 'Midnight',
    key: 'Em',
    bpm: 110,
    content:
      '[Verse]\nEm        C\n深夜的街道空无一人\nG         D\n只有霓虹在闪烁\n\n[Chorus]\nEm    C    G    D\nMidnight~ 我们的歌\nEm    C    G    D\nMidnight~ 永不落幕',
  },
  {
    id: uuidv4(),
    title: 'Echoes',
    key: 'Am',
    bpm: 95,
    content:
      '[Intro] Am F C G\n\n[Verse 1]\nAm        F\n回声在山谷间游荡\nC         G\n带着我们的梦想',
  },
  {
    id: uuidv4(),
    title: 'Neon Lights',
    key: 'D',
    bpm: 128,
    content:
      '[Verse]\nD         A\n霓虹灯下的城市\nBm        G\n每个人都在奔跑',
  },
];

const initialTodos: TodoItem[] = [
  { id: uuidv4(), text: '购买新的吉他弦', completed: false },
  { id: uuidv4(), text: '联系演出场地确认时间', completed: true },
  { id: uuidv4(), text: '录制《Midnight》Demo', completed: false },
];

function App() {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);

  const addSchedule = useCallback(
    (data: Omit<Schedule, 'id' | 'completed' | 'cancelled'>) => {
      setSchedules((prev) => [
        ...prev,
        { ...data, id: uuidv4(), completed: false, cancelled: false },
      ]);
    },
    []
  );

  const completeSchedule = useCallback((id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: true } : s))
    );
  }, []);

  const cancelSchedule = useCallback((id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, cancelled: true } : s))
    );
  }, []);

  const addSong = useCallback(
    (data: Omit<Song, 'id'>) => {
      setSongs((prev) => [...prev, { ...data, id: uuidv4() }]);
    },
    []
  );

  const updateSong = useCallback((id: string, data: Partial<Song>) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
  }, []);

  const deleteSong = useCallback((id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggleMemberStatus = useCallback((id: string) => {
    const statusCycle: MemberStatusType[] = ['idle', 'rehearsing', 'resting'];
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const idx = statusCycle.indexOf(m.status);
        const nextIdx = (idx + 1) % statusCycle.length;
        return { ...m, status: statusCycle[nextIdx] };
      })
    );
  }, []);

  const addTodo = useCallback((text: string) => {
    setTodos((prev) => [...prev, { id: uuidv4(), text, completed: false }]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Dashboard
      schedules={schedules}
      songs={songs}
      members={members}
      todos={todos}
      addSchedule={addSchedule}
      completeSchedule={completeSchedule}
      cancelSchedule={cancelSchedule}
      addSong={addSong}
      updateSong={updateSong}
      deleteSong={deleteSong}
      toggleMemberStatus={toggleMemberStatus}
      addTodo={addTodo}
      toggleTodo={toggleTodo}
      deleteTodo={deleteTodo}
    />
  );
}

export default App;
