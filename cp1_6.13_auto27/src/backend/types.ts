export type TagType = '紧急' | '技术' | '团建' | '通知' | '其他';

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  tags: TagType[];
  author: User;
  createdAt: number;
  readCount: number;
  readBy: string[];
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  tags: TagType[];
  authorId: string;
}
