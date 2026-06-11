import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Room, User, LyricLine, AppContextType } from '../types';
import axios from 'axios';

const AppContext = createContext<AppContextType | undefined>(undefined);

const AVATAR_COLORS = [
  '#e94560', '#667eea', '#f59e0b', '#10b981',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'
];

const DEFAULT_USER: User = {
  id: 'current-user',
  name: '匿名用户',
  color: '#e94560',
  joinedRooms: [],
  likedRooms: [],
  avatarInitial: '匿'
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, usersRes] = await Promise.all([
          axios.get('/api/rooms'),
          axios.get('/api/users')
        ]);
        setRooms(roomsRes.data);
        setUsers(usersRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();

    const storedUser = localStorage.getItem('lyricChainUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const randomName = `用户${Math.floor(Math.random() * 10000)}`;
      const newUser: User = {
        ...DEFAULT_USER,
        id: `user_${Date.now()}`,
        name: randomName,
        color: randomColor,
        avatarInitial: randomName.charAt(0)
      };
      setCurrentUser(newUser);
      localStorage.setItem('lyricChainUser', JSON.stringify(newUser));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lyricChainUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const joinRoom = (roomId: string) => {
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        const newOnlineUsers = room.onlineUsers.includes(currentUser.id)
          ? room.onlineUsers
          : [...room.onlineUsers, currentUser.id];
        const newUsers = room.users.includes(currentUser.id)
          ? room.users
          : [...room.users, currentUser.id];
        return { ...room, onlineUsers: newOnlineUsers, users: newUsers };
      }
      return room;
    }));

    setCurrentUser(prev => {
      if (!prev) return prev;
      if (prev.joinedRooms.includes(roomId)) return prev;
      return { ...prev, joinedRooms: [...prev.joinedRooms, roomId] };
    });
  };

  const leaveRoom = (roomId: string) => {
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          onlineUsers: room.onlineUsers.filter(id => id !== currentUser.id)
        };
      }
      return room;
    }));
  };

  const likeRoom = (roomId: string) => {
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        const isLiked = currentUser?.likedRooms.includes(roomId);
        return {
          ...room,
          likes: isLiked ? room.likes - 1 : room.likes + 1
        };
      }
      return room;
    }));

    setCurrentUser(prev => {
      if (!prev) return prev;
      const isLiked = prev.likedRooms.includes(roomId);
      return {
        ...prev,
        likedRooms: isLiked
          ? prev.likedRooms.filter(id => id !== roomId)
          : [...prev.likedRooms, roomId]
      };
    });
  };

  const addLyric = (roomId: string, lyric: LyricLine) => {
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return { ...room, lyrics: [...room.lyrics, lyric] };
      }
      return room;
    }));
  };

  const createRoom = (roomData: Omit<Room, 'id' | 'lyrics' | 'users' | 'onlineUsers' | 'likes' | 'createdAt'>): Room => {
    const newRoom: Room = {
      ...roomData,
      id: `room_${Date.now()}`,
      lyrics: [],
      users: [currentUser.id],
      onlineUsers: [currentUser.id],
      likes: 0,
      createdAt: Date.now()
    };
    setRooms(prev => [newRoom, ...prev]);
    return newRoom;
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      rooms,
      setRooms,
      users,
      setUsers,
      joinRoom,
      leaveRoom,
      likeRoom,
      addLyric,
      createRoom
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
