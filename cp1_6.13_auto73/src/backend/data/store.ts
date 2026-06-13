import { v4 as uuidv4 } from 'uuid';

export interface Profile {
  id: string;
  name: string;
  bio: string;
  signature: string;
  coverImage: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  audioUrl: string;
  duration: number;
  plays: number;
  tags: string[];
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  venueUrl: string;
  price: string;
  ticketUrl: string;
  description: string;
}

export interface DailyStats {
  date: string;
  plays: number;
}

let profile: Profile = {
  id: '1',
  name: '独立音乐人',
  bio: '热爱音乐，专注原创。用声音记录生活的点滴。',
  signature: '用音符诉说故事',
  coverImage: ''
};

let works: Work[] = [
  {
    id: uuidv4(),
    title: '星空漫步',
    description: '一首关于夜晚星空的轻音乐，带你漫步在银河之下。',
    coverImage: '',
    audioUrl: '',
    duration: 245,
    plays: 1280,
    tags: ['轻音乐', '钢琴', '夜晚'],
    createdAt: '2024-01-15'
  },
  {
    id: uuidv4(),
    title: '城市节拍',
    description: '都市生活的节奏，繁忙中寻找自己的韵律。',
    coverImage: '',
    audioUrl: '',
    duration: 198,
    plays: 856,
    tags: ['电子', '城市', '节奏'],
    createdAt: '2024-02-20'
  },
  {
    id: uuidv4(),
    title: '雨后晴天',
    description: '雨过天晴的清新，充满希望的旋律。',
    coverImage: '',
    audioUrl: '',
    duration: 312,
    plays: 2100,
    tags: ['流行', '治愈', '阳光'],
    createdAt: '2024-03-10'
  }
];

let events: Event[] = [
  {
    id: uuidv4(),
    title: '夏夜音乐祭',
    date: '2024-07-15',
    time: '19:30',
    venue: '星空音乐厅',
    venueUrl: 'https://example.com/venue',
    price: '￥180起',
    ticketUrl: 'https://example.com/tickets',
    description: '夏日夜晚的音乐盛宴，多首原创曲目首演。'
  },
  {
    id: uuidv4(),
    title: '不插电专场',
    date: '2024-08-20',
    time: '20:00',
    venue: '小酒馆LiveHouse',
    venueUrl: 'https://example.com/venue2',
    price: '￥120',
    ticketUrl: 'https://example.com/tickets2',
    description: '最纯粹的原声演绎，近距离感受音乐的温度。'
  }
];

let dailyStats: DailyStats[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split('T')[0],
    plays: Math.floor(Math.random() * 200) + 50
  };
});

export const dataStore = {
  getProfile: (): Profile => profile,
  updateProfile: (data: Partial<Profile>): Profile => {
    profile = { ...profile, ...data };
    return profile;
  },

  getWorks: (): Work[] => works,
  getWorkById: (id: string): Work | undefined => works.find(w => w.id === id),
  addWork: (work: Omit<Work, 'id' | 'plays' | 'createdAt'>): Work => {
    const newWork: Work = {
      ...work,
      id: uuidv4(),
      plays: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    works.push(newWork);
    return newWork;
  },
  deleteWork: (id: string): boolean => {
    const index = works.findIndex(w => w.id === id);
    if (index > -1) {
      works.splice(index, 1);
      return true;
    }
    return false;
  },
  incrementPlay: (id: string): Work | undefined => {
    const work = works.find(w => w.id === id);
    if (work) {
      work.plays += 1;
      const today = new Date().toISOString().split('T')[0];
      const stat = dailyStats.find(s => s.date === today);
      if (stat) {
        stat.plays += 1;
      } else {
        dailyStats.push({ date: today, plays: 1 });
      }
      return work;
    }
    return undefined;
  },

  getEvents: (): Event[] => events,
  getEventById: (id: string): Event | undefined => events.find(e => e.id === id),
  addEvent: (event: Omit<Event, 'id'>): Event => {
    const newEvent: Event = { ...event, id: uuidv4() };
    events.push(newEvent);
    return newEvent;
  },
  deleteEvent: (id: string): boolean => {
    const index = events.findIndex(e => e.id === id);
    if (index > -1) {
      events.splice(index, 1);
      return true;
    }
    return false;
  },

  getDailyStats: (): DailyStats[] => dailyStats
};
