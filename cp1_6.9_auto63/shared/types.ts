export interface UserAvatar {
  letter: string;
  color: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string;
  avatar: UserAvatar;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  nickname: string;
  avatar: UserAvatar;
}

export interface Bookmark {
  id: string;
  userId: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkWithUser extends Bookmark {
  user: PublicUser;
}

export interface Tag {
  name: string;
  count: number;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  bookmarkId: string;
  createdAt: string;
}

export interface ShortLink {
  hash: string;
  bookmarkId: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface BookmarkListResponse {
  bookmarks: Bookmark[];
  hasMore: boolean;
  total: number;
}

export interface TimelineResponse {
  bookmarks: BookmarkWithUser[];
  hasMore: boolean;
  total: number;
}

export interface ScrapeResponse {
  title: string;
  description: string;
}

export interface ShareResponse {
  shortUrl: string;
}
