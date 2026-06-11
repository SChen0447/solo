import React, { useState, useEffect, useRef } from 'react';
import { Room, User } from '../types';
import { useApp } from '../context/AppContext';
import axios from 'axios';
import '../styles/collabPanel.css';

interface CollabPanelProps {
  room: Room;
  onInspirationClick: (text: string) => void;
}

const CollabPanel: React.FC<CollabPanelProps> = ({ room, onInspirationClick }) => {
  const { users, currentUser } = useApp();
  const [inspirations, setInspirations] = useState<string[]>([]);
  const [currentInspiration, setCurrentInspiration] = useState('');
  const [isFading, setIsFading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const inspirationRef = useRef<number | null>(null);

  const roomUsers = users.filter(u => room.users.includes(u.id));
  const onlineUsers = roomUsers.filter(u => room.onlineUsers.includes(u.id));
  const offlineUsers = roomUsers.filter(u => !room.onlineUsers.includes(u.id));

  useEffect(() => {
    const fetchInspirations = async () => {
      try {
        const allInspirations: string[] = [];
        for (const tag of room.tags) {
          try {
            const res = await axios.get(`/api/inspirations/${tag}`);
            if (res.data) {
              allInspirations.push(...res.data);
            }
          } catch (e) {
          }
        }
        if (allInspirations.length > 0) {
          setInspirations(allInspirations);
          setCurrentInspiration(allInspirations[Math.floor(Math.random() * allInspirations.length)]);
        }
      } catch (error) {
        const defaultInspirations = [
          '灵感是瞬间的火花',
          '让文字自由流淌',
          '用心感受节奏',
          '每一句都是故事'
        ];
        setInspirations(defaultInspirations);
        setCurrentInspiration(defaultInspirations[0]);
      }
    };

    fetchInspirations();
  }, [room.tags]);

  useEffect(() => {
    if (inspirations.length === 0) return;

    inspirationRef.current = window.setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * inspirations.length);
        setCurrentInspiration(inspirations[randomIndex]);
        setIsFading(false);
      }, 500);
    }, 30000);

    return () => {
      if (inspirationRef.current) {
        clearInterval(inspirationRef.current);
      }
    };
  }, [inspirations]);

  const handleInspirationClick = (text: string, index: number) => {
    onInspirationClick(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 500);
  };

  return (
    <div className="collab-panel">
      <div className="card users-section">
        <h3 className="panel-title">
          <span className="title-icon">👥</span>
          在线协作
        </h3>
        <div className="users-list">
          <div className="users-section">
            <span className="users-section-title">
              <span className="online-indicator"></span>
              在线 ({onlineUsers.length})
            </span>
            <div className="user-avatars">
              {onlineUsers.map(user => (
                <div key={user.id} className="user-avatar-wrap" title={user.name}>
                  <div
                    className="user-avatar online"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.avatarInitial}
                  </div>
                  <span className="user-name-tooltip">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
          {offlineUsers.length > 0 && (
            <div className="users-section">
              <span className="users-section-title offline">
                离线 ({offlineUsers.length})
              </span>
              <div className="user-avatars">
                {offlineUsers.map(user => (
                  <div key={user.id} className="user-avatar-wrap" title={user.name}>
                    <div
                      className="user-avatar offline"
                      style={{ backgroundColor: '#666' }}
                    >
                      {user.avatarInitial}
                    </div>
                    <span className="user-name-tooltip">{user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card inspiration-section">
        <h3 className="panel-title">
          <span className="title-icon">💡</span>
          创意灵感
        </h3>
        <div className="inspiration-content">
          <div className={`inspiration-main ${isFading ? 'fading' : ''}`}>
            <p className="inspiration-text">"{currentInspiration}"</p>
          </div>
          <div className="inspiration-list">
            {inspirations.slice(0, 4).map((text, index) => (
              <button
                key={index}
                className={`inspiration-item ${copiedIndex === index ? 'copied' : ''}`}
                onClick={() => handleInspirationClick(text, index)}
              >
                <span className="inspiration-item-text">{text}</span>
                <span className="inspiration-item-icon">
                  {copiedIndex === index ? '✓' : '→'}
                </span>
              </button>
            ))}
          </div>
          <p className="inspiration-hint">每30秒自动刷新 · 点击复制到输入框</p>
        </div>
      </div>

      <div className="card rules-section">
        <h3 className="panel-title">
          <span className="title-icon">📋</span>
          接龙规则
        </h3>
        <ul className="rules-list">
          <li className="rule-item">
            <span className={`rule-dot ${room.rules.requireLastChar ? 'active' : ''}`}></span>
            末字开头
            {room.rules.allowHomophone && <span className="rule-sub">（含同音字）</span>}
          </li>
          <li className="rule-item">
            <span className={`rule-dot ${room.rules.allowHomophone ? 'active' : ''}`}></span>
            允许同音字
          </li>
          <li className="rule-item">
            <span className="rule-dot active"></span>
            每句15-40字
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CollabPanel;
