export interface User {
  id: string;
  username: string;
  avatar: string;
  createdAt: string;
}

export interface CapsuleReply {
  id: string;
  content: string;
  createdAt: string;
}

export interface Capsule {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  mood: string;
  moodColor: string;
  content: string;
  photos: string[];
  openAt: string;
  createdAt: string;
  isOpened: boolean;
  openedAt: string | null;
  reply: CapsuleReply | null;
}

export type CapsuleStatus = 'all' | 'unopened' | 'opened' | 'replied';

export interface MoodOption {
  emoji: string;
  color: string;
  name: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { emoji: '😊', color: '#ffdd88', name: '开心' },
  { emoji: '😭', color: '#88ccff', name: '感动' },
  { emoji: '😢', color: '#88aaff', name: '难过' },
  { emoji: '😍', color: '#ff88cc', name: '热爱' },
  { emoji: '🌟', color: '#ffcc66', name: '期待' },
  { emoji: '🤔', color: '#aa88ff', name: '思考' },
  { emoji: '😌', color: '#88ffaa', name: '平静' },
  { emoji: '🔥', color: '#ff6666', name: '热血' }
];
