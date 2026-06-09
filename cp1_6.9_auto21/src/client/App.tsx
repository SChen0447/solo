import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import CreateJoinPage from './pages/CreateJoinPage';
import StoryPage from './pages/StoryPage';
import type { Story } from '../shared/types';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io({ transports: ['websocket', 'polling'] });
  }
  return socketInstance;
}

function App() {
  const navigate = useNavigate();
  const [penName, setPenName] = useState<string>(() => {
    return localStorage.getItem('penName') || '';
  });
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);
    return () => {
      // 不主动断开，保持长连接
    };
  }, []);

  useEffect(() => {
    if (penName) {
      localStorage.setItem('penName', penName);
    }
  }, [penName]);

  const handleStoryCreated = useCallback((storyId: string) => {
    navigate(`/story/${storyId}`);
  }, [navigate]);

  const handleStoryJoined = useCallback((storyId: string) => {
    navigate(`/story/${storyId}`);
  }, [navigate]);

  return (
    <Routes>
      <Route
        path="/create"
        element={
          <CreateJoinPage
            penName={penName}
            onPenNameChange={setPenName}
            onStoryCreated={handleStoryCreated}
            onStoryJoined={handleStoryJoined}
          />
        }
      />
      <Route
        path="/story/:id"
        element={
          <StoryPage
            socket={socket}
            penName={penName}
            onRequirePenName={() => navigate('/create')}
          />
        }
      />
      <Route path="*" element={<Navigate to="/create" replace />} />
    </Routes>
  );
}

export default App;
