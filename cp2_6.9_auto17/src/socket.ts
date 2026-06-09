import { io, Socket } from 'socket.io-client';

export interface User {
  id: string;
  nickname: string;
  avatar: string;
}

export interface Song {
  id: string;
  videoId: string;
  platform: 'youtube' | 'bilibili';
  title: string;
  thumbnail: string;
  duration?: string;
  addedBy: string;
  addedById: string;
}

export interface Reaction {
  reaction: string;
  userId: string;
  nickname: string;
  avatar: string;
}

export interface RoomState {
  users: User[];
  queue: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  yourId: string;
}

export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join_room',
  ROOM_STATE: 'room_state',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  ADD_SONG: 'add_song',
  REMOVE_SONG: 'remove_song',
  QUEUE_UPDATED: 'queue_updated',
  PLAY_NEXT: 'play_next',
  SONG_CHANGED: 'song_changed',
  PLAY_PAUSE: 'play_pause',
  PLAY_PAUSE_UPDATED: 'play_pause_updated',
  SEEK: 'seek',
  SEEK_UPDATED: 'seek_updated',
  SET_VOLUME: 'set_volume',
  VOLUME_UPDATED: 'volume_updated',
  SEND_REACTION: 'send_reaction',
  REACTION_RECEIVED: 'reaction_received',
  SONG_ENDED: 'song_ended'
} as const;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling']
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRoom(roomId: string, nickname: string): void {
  getSocket().emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, nickname });
}

export function addSong(song: Omit<Song, 'id'>): void {
  getSocket().emit(SOCKET_EVENTS.ADD_SONG, song);
}

export function removeSong(songId: string): void {
  getSocket().emit(SOCKET_EVENTS.REMOVE_SONG, { songId });
}

export function playNext(): void {
  getSocket().emit(SOCKET_EVENTS.PLAY_NEXT);
}

export function playPause(isPlaying: boolean): void {
  getSocket().emit(SOCKET_EVENTS.PLAY_PAUSE, { isPlaying });
}

export function seek(currentTime: number): void {
  getSocket().emit(SOCKET_EVENTS.SEEK, { currentTime });
}

export function setVolume(volume: number): void {
  getSocket().emit(SOCKET_EVENTS.SET_VOLUME, { volume });
}

export function sendReaction(reaction: string): void {
  getSocket().emit(SOCKET_EVENTS.SEND_REACTION, { reaction });
}

export function songEnded(): void {
  getSocket().emit(SOCKET_EVENTS.SONG_ENDED);
}

export function parseVideoUrl(url: string): { videoId: string; platform: 'youtube' | 'bilibili' } | null {
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { videoId: match[1], platform: 'youtube' };
    }
  }

  const bilibiliPatterns = [
    /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
    /b23\.tv\/([a-zA-Z0-9]+)/
  ];

  for (const pattern of bilibiliPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { videoId: match[1], platform: 'bilibili' };
    }
  }

  return null;
}

export function getThumbnailUrl(videoId: string, platform: 'youtube' | 'bilibili'): string {
  if (platform === 'youtube') {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return `https://picsum.photos/seed/${videoId}/320/180`;
}

export const REACTIONS = ['👍', '❤️', '😮', '😂', '🔥', '🎵'];
