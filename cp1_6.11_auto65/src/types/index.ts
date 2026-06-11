export interface LyricLine {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
}

export interface RoomRules {
  allowHomophone: boolean;
  requireLastChar: boolean;
}

export interface Room {
  id: string;
  name: string;
  tags: string[];
  rules: RoomRules;
  lyrics: LyricLine[];
  users: string[];
  onlineUsers: string[];
  likes: number;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  joinedRooms: string[];
  likedRooms: string[];
  avatarInitial: string;
}

export interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  likeRoom: (roomId: string) => void;
  addLyric: (roomId: string, lyric: LyricLine) => void;
  createRoom: (room: Omit<Room, 'id' | 'lyrics' | 'users' | 'onlineUsers' | 'likes' | 'createdAt'>) => Room;
}
