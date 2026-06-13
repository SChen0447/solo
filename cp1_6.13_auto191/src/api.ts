export interface User {
  id: string;
  email: string;
  password: string;
}

export interface CrystalData {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  fixed: boolean;
}

export interface Vessel {
  id: string;
  userId: string;
  shape: { stretchRatio: number; flatRatio: number };
  colorA: string;
  colorB: string;
  crystals: CrystalData[];
  createdAt: number;
}

const USERS_KEY = 'ssgw_users';
const VESSELS_KEY = 'ssgw_vessels';
const SESSION_KEY = 'ssgw_session';

function readUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readVessels(): Vessel[] {
  try {
    return JSON.parse(localStorage.getItem(VESSELS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeVessels(vessels: Vessel[]): void {
  localStorage.setItem(VESSELS_KEY, JSON.stringify(vessels));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function register(email: string, password: string): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = readUsers();
      if (users.find(u => u.email === email)) {
        reject(new Error('该邮箱已注册'));
        return;
      }
      const user: User = { id: generateId(), email, password };
      users.push(user);
      writeUsers(users);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      resolve(user);
    }, 200);
  });
}

export function login(email: string, password: string): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = readUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        reject(new Error('邮箱或密码错误'));
        return;
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      resolve(user);
    }, 200);
  });
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveVessel(vessel: Omit<Vessel, 'id' | 'userId' | 'createdAt'>): Promise<Vessel> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = getCurrentUser();
      if (!user) {
        reject(new Error('请先登录'));
        return;
      }
      const vessels = readVessels().filter(v => v.userId === user.id);
      if (vessels.length >= 3) {
        reject(new Error('器皿数量已达上限（3个），请删除旧器皿'));
        return;
      }
      const newVessel: Vessel = {
        ...vessel,
        id: generateId(),
        userId: user.id,
        createdAt: Date.now(),
      };
      const allVessels = readVessels();
      allVessels.push(newVessel);
      writeVessels(allVessels);
      resolve(newVessel);
    }, 100);
  });
}

export function loadVessels(): Promise<Vessel[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = getCurrentUser();
      if (!user) {
        resolve([]);
        return;
      }
      const vessels = readVessels().filter(v => v.userId === user.id);
      resolve(vessels);
    }, 100);
  });
}

export function deleteVessel(id: string): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const vessels = readVessels().filter(v => v.id !== id);
      writeVessels(vessels);
      resolve();
    }, 100);
  });
}
