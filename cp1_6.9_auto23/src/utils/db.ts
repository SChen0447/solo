import axios from 'axios';

export interface Insect {
  id: string;
  name: string;
  scientificName: string;
  location: string;
  description: string;
  imageUrl: string;
}

export type Pose = 'symmetric' | 'flying' | 'resting';

export interface Specimen {
  id: string;
  insectId: string;
  temperature: number;
  pose: Pose;
  bgColor: string;
  hardness: number;
  position: number;
}

export interface Exhibition {
  id: string;
  title: string;
  curator: string;
  createdAt: number;
  specimens: Specimen[];
  thumbnail: string;
  likes: number;
}

export interface Comment {
  id: string;
  exhibitionId: string;
  author: string;
  content: string;
  createdAt: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
}

export interface UserData {
  username: string;
  exhibitions: Exhibition[];
  specimens: Specimen[];
  comments: Comment[];
  likes: Record<string, string[]>;
  badges: Badge[];
}

const STORAGE_KEY = 'insect_museum_user_data';
const USERNAME_KEY = 'insect_museum_username';

export const defaultUserData = (username: string): UserData => ({
  username,
  exhibitions: [],
  specimens: [],
  comments: [],
  likes: {},
  badges: []
});

export const saveUserData = async (data: UserData): Promise<boolean> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(USERNAME_KEY, data.username);
    try {
      await axios.post('/api/save', data);
    } catch (e) {
      console.warn('后端保存失败，数据已保存在本地');
    }
    return true;
  } catch (e) {
    console.error('保存数据失败:', e);
    return false;
  }
};

export const loadUserData = async (username?: string): Promise<UserData | null> => {
  try {
    const name = username || localStorage.getItem(USERNAME_KEY);
    if (!name) return null;
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.username === name) return parsed;
    }
    try {
      const res = await axios.get(`/api/load/${name}`);
      if (res.data.success) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.data));
        localStorage.setItem(USERNAME_KEY, name);
        return res.data.data;
      }
    } catch (e) {
      console.warn('后端读取失败');
    }
    return null;
  } catch (e) {
    console.error('读取数据失败:', e);
    return null;
  }
};

export const getUsername = (): string | null => localStorage.getItem(USERNAME_KEY);

export const setUsername = (name: string): void => {
  localStorage.setItem(USERNAME_KEY, name);
};

export const fetchInsects = async (): Promise<Insect[]> => {
  try {
    const res = await axios.get('/api/insects');
    return res.data;
  } catch (e) {
    console.error('获取昆虫数据失败:', e);
    return [];
  }
};

export const kelvinToRgb = (kelvin: number): string => {
  const temp = kelvin / 100;
  let red, green, blue;
  if (temp <= 66) {
    red = 255;
    green = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
    if (temp <= 19) {
      blue = 0;
    } else {
      blue = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    }
  } else {
    red = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    green = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    blue = 255;
  }
  return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, 0.35)`;
};

export const BG_COLORS = [
  '#8b0000', '#006400', '#000080', '#800080',
  '#8b4513', '#2f4f4f', '#191970', '#4a0e0e',
  '#0a3d0a', '#3d2b1f', '#1a1a4e', '#2d0a2d'
];
