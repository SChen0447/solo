import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import GroupBoard from './components/GroupBoard';
import Recording from './components/Recording';
import GroupDiscussion from './components/GroupDiscussion';
import Vocabulary from './components/Vocabulary';
import Leaderboard from './components/Leaderboard';

interface User {
  id: string;
  nickname: string;
  avatar: string;
  groupId: string;
  points: number;
}

interface Topic {
  id: string;
  title: string;
  prompt: string;
}

interface Member {
  id: string;
  nickname: string;
  avatar: string;
  online: boolean;
  points: number;
  weeklyPracticeMinutes: number;
}

type PageType = 'home' | 'record' | 'discussion' | 'vocabulary' | 'leaderboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [members, setMembers] = useState<Member[]>([]);
  const [todayTopic, setTodayTopic] = useState<Topic | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [pageVisible, setPageVisible] = useState(true);

  const connectWebSocket = useCallback((userId: string, groupId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:3001?userId=${userId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'group_update') {
          setMembers(data.members);
        }
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (user) {
          connectWebSocket(userId, groupId);
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [user]);

  const handleRegister = async () => {
    if (!nicknameInput.trim()) return;

    try {
      const response = await axios.post('/api/register', {
      nickname: nicknameInput.trim(),
    });
      const userData = response.data.user;
      setUser(userData);
      setTodayTopic(response.data.topic);
      connectWebSocket(userData.id, userData.groupId);
      fetchGroupData(userData.groupId);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const fetchGroupData = async (groupId: string) => {
    try {
      const response = await axios.get(`/api/group/${groupId}`);
      setMembers(response.data.members);
      setTodayTopic(response.data.topic);
    } catch (error) {
      console.error('Fetch group error:', error);
    }
  };

  const handlePointsUpdate = (newPoints: number) => {
    if (user) {
      setUser({ ...user, points: newPoints });
    }
  };

  const navigateTo = (page: PageType) => {
    setPageVisible(false);
    setMobileMenuOpen(false);
    setTimeout(() => {
      setCurrentPage(page);
      setPageVisible(true);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="glass-card" style={{ padding: '40px 30px', width: '100%', maxWidth: '360px', textAlign: 'center', opacity: 0', animation: 'fadeInUp 0.6s ease forwards' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗣️</div>
          <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', marginBottom: '10px' }}>
            语言练习小组
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '30px' }}>
            加入小组，每天进步一点点
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
              placeholder="请输入你的昵称"
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                border: 'none',
                outline: 'none',
                fontSize: '15px',
                background: 'rgba(255,255,255,0.9)',
                color: '#333',
              }}
            />
            <button
              className="btn btn-primary"
              onClick={handleRegister}
              disabled={!nicknameInput.trim()}
              style={{ width: '100%', padding: '14px' }}
            >
              开始练习
            </button>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', gap: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            <span>👥 6人小组</span>
            <span>📅 每日打卡</span>
            <span>🏆 积分排行</span>
          </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    const animationClass = pageVisible ? 'page-transition-enter' : '';

    switch (currentPage) {
      case 'home':
        return (
          <div className={animationClass} style={{ opacity: 0 }}>
            <GroupBoard
              members={members}
              topic={todayTopic}
              user={user}
              onStartRecord={() => navigateTo('record')}
              onPointsUpdate={handlePointsUpdate}
            />
          </div>
        );
      case 'record':
        return (
          <div className={animationClass} style={{ opacity: 0 }}>
            <Recording
              topic={todayTopic}
              user={user}
              onPointsUpdate={handlePointsUpdate}
              onBack={() => navigateTo('home')}
            />
          </div>
        );
      case 'discussion':
        return (
          <div className={animationClass} style={{ opacity: 0 }}>
            <GroupDiscussion
            members={members}
            topic={todayTopic}
            groupId={user.groupId}
            user={user}
          />
          </div>
        );
      case 'vocabulary':
        return (
          <div className={animationClass} style={{ opacity: 0 }}>
            <Vocabulary
              userId={user.id}
              onPointsUpdate={handlePointsUpdate}
            />
          </div>
        );
      case 'leaderboard':
        return (
          <div className={animationClass} style={{ opacity: 0 }}>
            <Leaderboard
              groupId={user.groupId}
              members={members}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'home' as const, label: '首页', icon: '🏠' },
    { id: 'record' as const, label: '录音', icon: '🎤' },
    { id: 'discussion' as const, label: '讨论', icon: '💬' },
    { id: 'vocabulary' as const, label: '词汇', icon: '📚' },
    { id: 'leaderboard' as const, label: '排行', icon: '🏆' },
  ];

  return (
    <div className="app-container">
      <button
        className="hamburger-menu"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        ☰
      </button>

      <div className={`overlay ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ marginBottom: '20px', padding: '10px' }}>
          <span style={{ fontSize: '24px' }}>{user.avatar}</span>
          <span style={{ marginLeft: '10px', fontSize: '16px', fontWeight: '600' }}>{user.nickname}</span>
          <div style={{ color: '#666', fontSize: '13px', marginTop: '5px' }}>
            积分: {user.points}
          </div>
        </div>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => navigateTo(item.id)}
          >
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '15px' }}>
        {renderPage()}
      </div>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => navigateTo(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default App;
