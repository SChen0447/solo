import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type MoodType = 'happy' | 'sad' | 'angry' | 'surprised' | 'calm' | 'confused';
export type UnlockDuration = '24h' | '7d' | '30d';
export type BadgeRarity = 'common' | 'rare' | 'legendary';

export interface Message {
  id: string;
  capsuleId: string;
  content: string;
  createdAt: number;
}

export interface Capsule {
  id: string;
  lat: number;
  lng: number;
  content: string;
  imageColor: string;
  mood: MoodType;
  unlockDuration: UnlockDuration;
  createdAt: number;
  unlockAt: number;
  isUnlocked: boolean;
  messages: Message[];
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  rarity: BadgeRarity;
  description: string;
  isCollected: boolean;
  collectedAt?: number;
}

export interface GhostCapsule {
  id: string;
  lat: number;
  lng: number;
  rewardBadge: Badge;
}

export interface GameState {
  capsules: Capsule[];
  userBadges: Badge[];
  ghostCapsules: GhostCapsule[];
  userPosition: { lat: number; lng: number } | null;
  isLocating: boolean;
}

type Action =
  | { type: 'SET_POSITION'; payload: { lat: number; lng: number } }
  | { type: 'SET_LOCATING'; payload: boolean }
  | { type: 'ADD_CAPSULE'; payload: Capsule }
  | { type: 'UNLOCK_CAPSULE'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'COLLECT_BADGE'; payload: Badge }
  | { type: 'REMOVE_GHOST'; payload: string }
  | { type: 'ADD_GHOST'; payload: GhostCapsule }
  | { type: 'INIT_STATE'; payload: GameState }
  | { type: 'TICK_UNLOCK' };

export const MOOD_EMOJI: Record<MoodType, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  calm: '😌',
  confused: '😕'
};

export const MOOD_LABEL: Record<MoodType, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  surprised: '惊讶',
  calm: '平静',
  confused: '困惑'
};

export const UNLOCK_HOURS: Record<UnlockDuration, number> = {
  '24h': 24,
  '7d': 168,
  '30d': 720
};

const RANDOM_BADGES: Omit<Badge, 'isCollected' | 'collectedAt'>[] = [
  { id: 'b1', name: '晨曦使者', emoji: '🌅', rarity: 'common', description: '在黎明时分发现的神秘徽章' },
  { id: 'b2', name: '月光猎手', emoji: '🌙', rarity: 'rare', description: '追寻月光轨迹的勇敢者' },
  { id: 'b3', name: '星辰守护', emoji: '⭐', rarity: 'legendary', description: '传说中只有命中注定之人能获得' },
  { id: 'b4', name: '深海之魂', emoji: '🌊', rarity: 'rare', description: '来自深海的古老祝福' },
  { id: 'b5', name: '森林精灵', emoji: '🌲', rarity: 'common', description: '与自然共鸣的证明' },
  { id: 'b6', name: '时光旅人', emoji: '⏰', rarity: 'legendary', description: '穿越时空的罕见徽章' },
  { id: 'b7', name: '彩虹拾荒者', emoji: '🌈', rarity: 'common', description: '收集美好瞬间的小确幸' },
  { id: 'b8', name: '孤独北极星', emoji: '❄️', rarity: 'rare', description: '在最冷的夜空中闪耀' },
];

const PLACEHOLDER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
];

const initialState: GameState = {
  capsules: [],
  userBadges: [],
  ghostCapsules: [],
  userPosition: null,
  isLocating: true
};

const STORAGE_KEY = 'time_capsule_game_state_v1';

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      return { ...parsed, isLocating: true };
    }
  } catch (e) {
    console.warn('Failed to load state', e);
  }
  return initialState;
}

function saveState(state: GameState) {
  try {
    const toSave = { ...state, isLocating: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save state', e);
  }
}

function reducer(state: GameState, action: Action): GameState {
  let next: GameState;
  switch (action.type) {
    case 'SET_POSITION':
      next = { ...state, userPosition: action.payload, isLocating: false };
      break;
    case 'SET_LOCATING':
      next = { ...state, isLocating: action.payload };
      break;
    case 'ADD_CAPSULE':
      next = { ...state, capsules: [...state.capsules, action.payload] };
      break;
    case 'UNLOCK_CAPSULE':
      next = {
        ...state,
        capsules: state.capsules.map(c =>
          c.id === action.payload ? { ...c, isUnlocked: true } : c
        )
      };
      break;
    case 'ADD_MESSAGE':
      next = {
        ...state,
        capsules: state.capsules.map(c =>
          c.id === action.payload.capsuleId
            ? { ...c, messages: [...c.messages, action.payload].sort((a, b) => a.createdAt - b.createdAt) }
            : c
        )
      };
      break;
    case 'COLLECT_BADGE': {
      const alreadyHas = state.userBadges.some(b => b.id === action.payload.id);
      if (alreadyHas) return state;
      next = { ...state, userBadges: [...state.userBadges, action.payload] };
      break;
    }
    case 'REMOVE_GHOST':
      next = { ...state, ghostCapsules: state.ghostCapsules.filter(g => g.id !== action.payload) };
      break;
    case 'ADD_GHOST':
      next = { ...state, ghostCapsules: [...state.ghostCapsules, action.payload] };
      break;
    case 'INIT_STATE':
      next = action.payload;
      break;
    case 'TICK_UNLOCK': {
      const now = Date.now();
      next = {
        ...state,
        capsules: state.capsules.map(c =>
          !c.isUnlocked && now >= c.unlockAt ? { ...c, isUnlocked: true } : c
        )
      };
      break;
    }
    default:
      return state;
  }
  return next;
}

function createMockCapsules(centerLat: number, centerLng: number): Capsule[] {
  const now = Date.now();
  const moods: MoodType[] = ['happy', 'sad', 'angry', 'surprised', 'calm', 'confused'];
  const samples = [
    { text: '今天的夕阳真美，希望你看到时也会微笑。愿时光温柔以待。', offsetKm: 2, duration: '24h' as UnlockDuration, mood: 'calm' as MoodType },
    { text: '失恋的第三天，雨下了一整夜。但我相信，总会有放晴的那天。', offsetKm: 5, duration: '24h' as UnlockDuration, mood: 'sad' as MoodType },
    { text: '收到offer啦！！！努力了这么久终于有回报！！！', offsetKm: 8, duration: '24h' as UnlockDuration, mood: 'happy' as MoodType },
    { text: '为什么世界上有周一这种东西啊！！！好气！！', offsetKm: 12, duration: '24h' as UnlockDuration, mood: 'angry' as MoodType },
    { text: '今天在路边遇到一只会招手的猫，太神奇了！', offsetKm: 18, duration: '24h' as UnlockDuration, mood: 'surprised' as MoodType },
    { text: '人生的意义是什么？我好像越来越迷茫了...', offsetKm: 25, duration: '24h' as UnlockDuration, mood: 'confused' as MoodType },
  ];
  return samples.map((s, i) => {
    const latOff = (Math.sin(i * 1.2) * s.offsetKm) / 111;
    const lngOff = (Math.cos(i * 1.2) * s.offsetKm) / (111 * Math.cos(centerLat * Math.PI / 180));
    const created = now - (UNLOCK_HOURS[s.duration] * 3600 * 1000) + (i * 3600 * 1000);
    return {
      id: 'mock_' + i,
      lat: centerLat + latOff,
      lng: centerLng + lngOff,
      content: s.text,
      imageColor: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
      mood: s.mood ?? moods[i % moods.length],
      unlockDuration: s.duration,
      createdAt: created,
      unlockAt: created + UNLOCK_HOURS[s.duration] * 3600 * 1000,
      isUnlocked: true,
      messages: i % 2 === 0 ? [
        { id: 'm1_' + i, capsuleId: 'mock_' + i, content: '看到这个的瞬间，我也想起了自己。', createdAt: now - 3600000 },
        { id: 'm2_' + i, capsuleId: 'mock_' + i, content: '抱抱你，一起加油！', createdAt: now - 1800000 }
      ] : []
    };
  });
}

function createMockGhosts(centerLat: number, centerLng: number): GhostCapsule[] {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 5) * Math.PI * 2;
    const distKm = 3 + i * 6;
    const latOff = (Math.sin(angle) * distKm) / 111;
    const lngOff = (Math.cos(angle) * distKm) / (111 * Math.cos(centerLat * Math.PI / 180));
    const template = RANDOM_BADGES[Math.floor(Math.random() * RANDOM_BADGES.length)];
    return {
      id: 'ghost_' + i + '_' + Date.now(),
      lat: centerLat + latOff,
      lng: centerLng + lngOff,
      rewardBadge: { ...template, isCollected: false }
    };
  });
}

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  buryCapsule: (lat: number, lng: number, content: string, mood: MoodType, duration: UnlockDuration) => void;
  addMessage: (capsuleId: string, content: string) => void;
  collectGhost: (ghostId: string) => Badge | null;
  spawnGhost: (centerLat: number, centerLng: number) => void;
  getRandomImageColor: () => string;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => loadState());

  useEffect(() => {
    saveState(state);
  }, [state.capsules, state.userBadges, state.ghostCapsules, state.userPosition]);

  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'TICK_UNLOCK' }), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!state.userPosition) return;
    if (state.capsules.length === 0) {
      const mocks = createMockCapsules(state.userPosition.lat, state.userPosition.lng);
      mocks.forEach(c => dispatch({ type: 'ADD_CAPSULE', payload: c }));
    }
    if (state.ghostCapsules.length === 0) {
      const ghosts = createMockGhosts(state.userPosition.lat, state.userPosition.lng);
      ghosts.forEach(g => dispatch({ type: 'ADD_GHOST', payload: g }));
    }
  }, [state.userPosition]);

  const buryCapsule = useCallback((lat: number, lng: number, content: string, mood: MoodType, duration: UnlockDuration) => {
    const now = Date.now();
    const capsule: Capsule = {
      id: uuidv4(),
      lat, lng,
      content,
      imageColor: PLACEHOLDER_COLORS[Math.floor(Math.random() * PLACEHOLDER_COLORS.length)],
      mood,
      unlockDuration: duration,
      createdAt: now,
      unlockAt: now + UNLOCK_HOURS[duration] * 3600 * 1000,
      isUnlocked: false,
      messages: []
    };
    dispatch({ type: 'ADD_CAPSULE', payload: capsule });
  }, []);

  const addMessage = useCallback((capsuleId: string, content: string) => {
    const msg: Message = {
      id: uuidv4(),
      capsuleId,
      content,
      createdAt: Date.now()
    };
    dispatch({ type: 'ADD_MESSAGE', payload: msg });
  }, []);

  const collectGhost = useCallback((ghostId: string): Badge | null => {
    const ghost = state.ghostCapsules.find(g => g.id === ghostId);
    if (!ghost) return null;
    const badge: Badge = { ...ghost.rewardBadge, isCollected: true, collectedAt: Date.now() };
    dispatch({ type: 'COLLECT_BADGE', payload: badge });
    dispatch({ type: 'REMOVE_GHOST', payload: ghostId });
    return badge;
  }, [state.ghostCapsules]);

  const spawnGhost = useCallback((centerLat: number, centerLng: number) => {
    const angle = Math.random() * Math.PI * 2;
    const distKm = 5 + Math.random() * 35;
    const latOff = (Math.sin(angle) * distKm) / 111;
    const lngOff = (Math.cos(angle) * distKm) / (111 * Math.cos(centerLat * Math.PI / 180));
    const template = RANDOM_BADGES[Math.floor(Math.random() * RANDOM_BADGES.length)];
    const ghost: GhostCapsule = {
      id: 'ghost_' + uuidv4(),
      lat: centerLat + latOff,
      lng: centerLng + lngOff,
      rewardBadge: { ...template, isCollected: false }
    };
    dispatch({ type: 'ADD_GHOST', payload: ghost });
  }, []);

  const getRandomImageColor = useCallback(() => {
    return PLACEHOLDER_COLORS[Math.floor(Math.random() * PLACEHOLDER_COLORS.length)];
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, buryCapsule, addMessage, collectGhost, spawnGhost, getRandomImageColor }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatCountdown(targetTime: number): string {
  const diff = targetTime - Date.now();
  if (diff <= 0) return '已解锁';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  if (days > 0) return `${days}天 ${hours}小时 ${minutes}分`;
  if (hours > 0) return `${hours}小时 ${minutes}分 ${seconds}秒`;
  return `${minutes}分 ${seconds}秒`;
}
