import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  ruleId?: string | null;
  isTransferring?: boolean;
}

interface HistoryRecord {
  id: string;
  userMessage: string;
  botReply: string;
  ruleId: string | null;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  '退换货政策是什么？',
  '物流一般几天到？',
  '现在有什么优惠活动？',
  '如何选择合适的尺码？',
  '商品有质量问题怎么办？',
  '如何联系人工客服？'
];

const ChatBox = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uuidv4(),
      role: 'bot',
      content: '您好！欢迎使用智能客服，请问有什么可以帮您的？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageQueueRef = useRef<ChatMessage[]>([]);
  const isProcessingRef = useRef(false);
  const lastSendTimeRef = useRef(0);

  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('bot_reply', (data: { reply: string; ruleId: string | null; transferHuman: boolean; userMessageId: string }) => {
      const botMessage: ChatMessage = {
        id: uuidv4(),
        role: 'bot',
        content: data.reply,
        timestamp: new Date(),
        ruleId: data.ruleId
      };

      if (data.transferHuman) {
        botMessage.isTransferring = true;
        setIsTransferring(true);
      }

      addMessageToQueue(botMessage);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const processQueue = useCallback(() => {
    if (isProcessingRef.current || messageQueueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const nextMessage = messageQueueRef.current.shift();

    if (nextMessage) {
      setMessages((prev) => [...prev, nextMessage]);
      setTimeout(() => {
        isProcessingRef.current = false;
        processQueue();
      }, 300);
    }
  }, []);

  const addMessageToQueue = useCallback((message: ChatMessage) => {
    messageQueueRef.current.push(message);
    processQueue();
  }, [processQueue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const throttle = (func: () => void, limit: number) => {
    const now = Date.now();
    if (now - lastSendTimeRef.current >= limit) {
      lastSendTimeRef.current = now;
      func();
    }
  };

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || !isConnected) return;

    throttle(() => {
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: inputValue.trim(),
        timestamp: new Date()
      };

      addMessageToQueue(userMessage);

      socketRef.current?.emit('user_message', {
        messageId: userMessage.id,
        content: inputValue.trim(),
        timestamp: userMessage.timestamp.toISOString()
      });

      setInputValue('');
      setIsTransferring(false);
    }, 100);
  }, [inputValue, isConnected, addMessageToQueue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    setTimeout(() => {
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: question,
        timestamp: new Date()
      };
      addMessageToQueue(userMessage);
      socketRef.current?.emit('user_message', {
        messageId: userMessage.id,
        content: question,
        timestamp: userMessage.timestamp.toISOString()
      });
      setInputValue('');
      setIsTransferring(false);
      if (isMobile) {
        setPanelOpen(false);
      }
    }, 50);
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history?limit=20');
      const data = await response.json();
      setHistoryRecords(data.history || []);
      setShowHistory(true);
    } catch (error) {
      console.error('获取历史记录失败:', error);
    }
  };

  const handleTransferClick = () => {
    setIsTransferring(true);
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: '转人工客服',
      timestamp: new Date()
    };
    addMessageToQueue(userMessage);
    socketRef.current?.emit('user_message', {
      messageId: userMessage.id,
      content: '转人工客服',
      timestamp: userMessage.timestamp.toISOString()
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      <div style={chatAreaStyle}>
        <div style={chatHeaderStyle}>
          <div style={headerTitleStyle}>
            <div style={onlineDotStyle}></div>
            <span>智能客服小助手</span>
            <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '8px' }}>
              {isTransferring ? '转接人工中...' : (isConnected ? '在线' : '连接中...')}
            </span>
          </div>
          <button
            onClick={handleTransferClick}
            style={transferButtonStyle}
            className="pulse-button"
          >
            转接人工
          </button>
        </div>

        <div style={messagesContainerStyle}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...messageWrapperStyle,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
              className="message-enter"
            >
              <div
                style={{
                  ...bubbleBaseStyle,
                  ...(msg.role === 'user' ? userBubbleStyle : botBubbleStyle)
                }}
              >
                <span>{msg.content}</span>
                {msg.isTransferring && (
                  <div style={transferringStyle}>
                    <span className="transferring-dot"></span>
                    <span className="transferring-dot" style={{ animationDelay: '0.2s' }}></span>
                    <span className="transferring-dot" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                )}
                <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={inputContainerStyle}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入您的问题..."
            style={inputStyle}
          />
          <button onClick={handleSendMessage} style={sendButtonStyle} className="hover-scale">
            发送
          </button>
        </div>
      </div>

      <div style={{
        ...panelStyle,
        ...(isMobile ? {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: panelOpen ? '50%' : '60px',
          zIndex: 100,
          borderTop: '1px solid #38384D'
        } : {})
      }}>
        <div style={panelHeaderStyle} onClick={() => isMobile && setPanelOpen(!panelOpen)}>
          <span style={panelTitleStyle}>常见问题</span>
          <button
            onClick={(e) => { e.stopPropagation(); fetchHistory(); }}
            style={historyButtonStyle}
            className="hover-scale"
          >
            查看历史
          </button>
        </div>

        {(panelOpen || !isMobile) && (
          <div style={questionsContainerStyle}>
            {QUICK_QUESTIONS.map((question, index) => (
              <div
                key={index}
                onClick={() => handleQuickQuestion(question)}
                style={questionCardStyle}
                className="hover-scale"
              >
                {question}
              </div>
            ))}
          </div>
        )}
      </div>

      {showHistory && (
        <div style={modalOverlayStyle} onClick={() => setShowHistory(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>对话历史</span>
              <button onClick={() => setShowHistory(false)} style={closeButtonStyle}>
                关闭
              </button>
            </div>
            <div style={modalBodyStyle}>
              {historyRecords.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>
                  暂无历史记录
                </div>
              ) : (
                historyRecords.map((record) => (
                  <div key={record.id} style={historyItemStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#3B82F6', fontWeight: 500 }}>用户</span>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        {new Date(record.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px', color: '#E5E7EB' }}>{record.userMessage}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#7C3AED', fontWeight: 500 }}>机器人</span>
                      {record.ruleId && <span style={{ fontSize: '11px', color: '#6B7280' }}>规则: {record.ruleId}</span>}
                    </div>
                    <div style={{ color: '#D1D5DB' }}>{record.botReply}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .message-enter {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 300ms ease-out forwards;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hover-scale {
          transition: all 200ms ease;
          cursor: pointer;
        }

        .hover-scale:hover {
          transform: scale(1.05);
          filter: brightness(0.9);
        }

        .pulse-button {
          position: relative;
          overflow: hidden;
        }

        .pulse-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .pulse-button:active::after {
          width: 200px;
          height: 200px;
        }

        .transferring-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #7C3AED;
          margin: 0 2px;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

const chatAreaStyle: React.CSSProperties = {
  width: '70%',
  backgroundColor: '#2A2A3D',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0
};

const chatHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0
};

const headerTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '16px',
  fontWeight: 600
};

const onlineDotStyle: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#10B981',
  marginRight: '8px'
};

const transferButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px'
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  minHeight: 0
};

const messageWrapperStyle: React.CSSProperties = {
  display: 'flex',
  width: '100%'
};

const bubbleBaseStyle: React.CSSProperties = {
  maxWidth: '70%',
  padding: '12px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  lineHeight: 1.5,
  wordBreak: 'break-word'
};

const userBubbleStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
  color: 'white'
};

const botBubbleStyle: React.CSSProperties = {
  backgroundColor: '#38384D',
  color: '#E5E7EB'
};

const transferringStyle: React.CSSProperties = {
  marginTop: '8px',
  display: 'flex',
  alignItems: 'center'
};

const inputContainerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderTop: '1px solid #38384D',
  display: 'flex',
  gap: '12px',
  flexShrink: 0
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  backgroundColor: '#38384D',
  border: '1px solid #4A4A5D',
  borderRadius: '8px',
  color: '#E5E7EB',
  fontSize: '14px',
  outline: 'none'
};

const sendButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500
};

const panelStyle: React.CSSProperties = {
  width: '30%',
  backgroundColor: '#2A2A3D',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  backgroundColor: '#2A2A3D',
  borderBottom: '1px solid #38384D',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#E5E7EB'
};

const historyButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#38384D',
  color: '#E5E7EB',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px'
};

const questionsContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  overflowY: 'auto'
};

const questionCardStyle: React.CSSProperties = {
  padding: '14px 16px',
  backgroundColor: '#EDE9FE',
  color: '#4C1D95',
  borderRadius: '8px',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: 500
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#2A2A3D',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const modalHeaderStyle: React.CSSProperties = {
  padding: '20px',
  borderBottom: '1px solid #38384D',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#38384D',
  color: '#E5E7EB',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer'
};

const modalBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px'
};

const historyItemStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#38384D',
  borderRadius: '8px',
  marginBottom: '12px'
};

export default ChatBox;
