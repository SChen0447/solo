export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  coverUrl: string;
  description: string;
  status: 'available' | 'exchanged';
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
}

export interface Match {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromBookId: string;
  toBookId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  content: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  isRead: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}
