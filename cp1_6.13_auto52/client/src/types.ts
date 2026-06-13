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
  fromBook?: Book;
  toBook?: Book;
  fromUser?: User;
  toUser?: User;
  otherUser?: User;
  lastMessage?: Message;
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

export interface CreateBookRequest {
  title: string;
  author: string;
  year: number;
  coverUrl: string;
  description: string;
}

export interface CreateMatchRequest {
  toUserId: string;
  fromBookId: string;
  toBookId: string;
}

export interface CreateMessageRequest {
  content: string;
}
