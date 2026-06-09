import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Message } from '../types';

const AVATAR_COLORS = ['#F06292', '#BA68C8', '#7986CB', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F', '#FF8A65'];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

const MessagePanel: React.FC = () => {
  const { currentPage, currentProjectId, sendMessage, users } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [shaking, setShaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const activeProjectId = currentPage === 'kanban' ? currentProjectId : null;

  useEffect(() => {
    if (!activeProjectId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/projects/${activeProjectId}/messages`);
        const data = await res.json();
        setMessages(data);
        prevCountRef.current = data.length;
      } catch (e) {
        console.error('Failed to load messages:', e);
      }
    };
    loadMessages();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${activeProjectId}/messages`);
        const data = await res.json();
        if (data.length > prevCountRef.current) {
          setMessages(data);
          setShaking(true);
          setTimeout(() => setShaking(false), 300);
          prevCountRef.current = data.length;
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [activeProjectId]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !activeProjectId) return;
    const sender = users[0]?.name || '用户';
    await sendMessage(activeProjectId, sender, input.trim());
    setInput('');
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/messages`);
      const data = await res.json();
      setMessages(data);
      prevCountRef.current = data.length;
    } catch (e) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeProjectId) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={shaking ? 'animate-shake' : ''}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: '#333333',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          zIndex: 200,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          border: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        {messages.length > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: '#E53935',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className="animate-fade-in-scale"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        width: 300,
        height: 400,
        borderRadius: 16,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(100, 255, 218, 0.2)'
      }}
    >
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,0,0,0.08)'
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1E1E2E' }}>团队消息</span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
            padding: 4,
            borderRadius: 4,
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 12
      }}>
        <div ref={messagesEndRef} />
        {[...messages].reverse().map((msg, idx) => {
          const avatarColor = AVATAR_COLORS[msg.sender.charCodeAt(0) % AVATAR_COLORS.length];
          return (
            <div
              key={msg.id}
              className="animate-fade-in-up"
              style={{
                display: 'flex',
                gap: 10,
                animationDelay: `${idx * 0.03}s`
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: avatarColor,
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {msg.sender.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1E1E2E' }}>{msg.sender}</span>
                  <span style={{ fontSize: 10, color: '#888' }}>{formatTime(msg.timestamp)}</span>
                </div>
                <p style={{
                  fontSize: 14,
                  color: '#333',
                  marginTop: 3,
                  lineHeight: 1.5,
                  wordBreak: 'break-word'
                }}>
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#999',
            fontSize: 12,
            padding: '20px 0'
          }}>
            暂无消息
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        gap: 8
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 8,
            fontSize: 13,
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: '#1E1E2E'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            padding: '8px 14px',
            backgroundColor: input.trim() ? '#64FFDA' : '#ccc',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.1s ease'
          }}
          onMouseDown={(e) => {
            if (input.trim()) e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default MessagePanel;
