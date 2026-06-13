import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import 诗炉 from './诗炉';
import 诗页 from './诗页';
import type { 诗句 as 诗句类型, 情绪标签 } from '../server/炉心';

const API_BASE = '';

const 获取用户ID = (): string => {
  let id = localStorage.getItem('碎光用户ID');
  if (!id) {
    id = 'user-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('碎光用户ID', id);
  }
  return id;
};

const 获取诗句列表 = async (): Promise<诗句类型[]> => {
  const 响应 = await fetch(`${API_BASE}/诗句`);
  if (!响应.ok) throw new Error('获取诗句失败');
  return 响应.json();
};

const 提交诗句 = async (文本: string, 情绪: 情绪标签): Promise<诗句类型> => {
  const 响应 = await fetch(`${API_BASE}/诗句`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 文本, 情绪, 用户ID: 获取用户ID() })
  });
  if (!响应.ok) {
    const 错误 = await 响应.json().catch(() => ({ 错误: '提交失败' }));
    throw new Error(错误.错误 || '提交失败');
  }
  return 响应.json();
};

const 获取在线用户数 = async (): Promise<number> => {
  try {
    const 响应 = await fetch(`${API_BASE}/在线`);
    if (!响应.ok) return 0;
    const 数据 = await 响应.json();
    return 数据.在线用户数 || 0;
  } catch {
    return 0;
  }
};

const 应用: React.FC = () => {
  const [诗句列表, 设置诗句列表] = useState<诗句类型[]>([]);
  const [加载中, 设置加载中] = useState(true);
  const [错误, 设置错误] = useState<string | null>(null);
  const [在线用户数, 设置在线用户数] = useState(0);
  const [悬停诗句ID, 设置悬停诗句ID] = useState<string | null>(null);
  const 初始化引用 = useRef(false);

  const 加载诗句 = useCallback(async () => {
    try {
      设置错误(null);
      const 列表 = await 获取诗句列表();
      设置诗句列表(列表);
    } catch (e) {
      设置错误(e instanceof Error ? e.message : '加载失败');
    } finally {
      设置加载中(false);
    }
  }, []);

  useEffect(() => {
    if (初始化引用.current) return;
    初始化引用.current = true;
    加载诗句();
    获取在线用户数().then(设置在线用户数);
    const 轮询 = setInterval(() => {
      获取在线用户数().then(设置在线用户数);
    }, 5000);
    return () => clearInterval(轮询);
  }, [加载诗句]);

  const 提交回调 = useCallback(async (文本: string, 情绪: 情绪标签) => {
    const 新诗句 = await 提交诗句(文本, 情绪);
    设置诗句列表(prev => [新诗句, ...prev]);
  }, []);

  const 悬停变更 = useCallback((id: string | null) => {
    设置悬停诗句ID(id);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0b16',
        color: '#e0e0e0',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .主布局 {
            flex-direction: column !important;
          }
          .画布区 {
            width: 100% !important;
            height: calc(100vh - 56px - 200px - 220px) !important;
            min-height: 280px !important;
          }
          .卡片区 {
            width: 100% !important;
            height: 100% !important;
            max-height: none !important;
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'rgba(10, 11, 22, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #76e0cc 50%, #a29bfe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: '0 0 16px rgba(102,126,234,0.5)'
            }}
          >
            ✦
          </div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '2px',
              background: 'linear-gradient(135deg, #667eea 0%, #76e0cc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            碎光·诗册
          </h1>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'rgba(224,224,224,0.7)',
            fontWeight: 500
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#55efc4',
              boxShadow: '0 0 8px #55efc4',
              animation: '脉冲光点 2s ease infinite'
            }}
          />
          <style>{`
            @keyframes 脉冲光点 {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.3); }
            }
          `}</style>
          <span>{在线用户数}</span>
          <span style={{ opacity: 0.6 }}>位诗人在线</span>
        </div>
      </div>

      <div
        className="主布局"
        style={{
          flex: 1,
          display: 'flex',
          width: '100%',
          height: 'calc(100% - 56px)',
          marginTop: '56px',
          padding: '20px',
          gap: '20px',
          minHeight: 0,
          boxSizing: 'border-box'
        }}
      >
        <div
          className="画布区"
          style={{
            flex: 0,
            flexGrow: 0,
            width: '65%',
            height: '85%',
            minHeight: '400px',
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxSizing: 'border-box'
          }}
        >
          {加载中 ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '20px',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                background: 'rgba(26,26,46,0.5)'
              }}
            >
              <div style={{ textAlign: 'center', color: 'rgba(224,224,224,0.6)' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>✧</div>
                <div>诗册正在苏醒…</div>
              </div>
            </div>
          ) : 错误 ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '20px',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                background: 'rgba(26,26,46,0.5)'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff6b6b', marginBottom: '12px', fontSize: '24px' }}>⚠</div>
                <div style={{ color: '#ff6b6b', marginBottom: '16px' }}>{错误}</div>
                <button
                  onClick={加载诗句}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: '1px solid #667eea',
                    background: 'rgba(102,126,234,0.2)',
                    color: '#e0e0e0',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  重新加载
                </button>
              </div>
            </div>
          ) : (
            <诗炉 诗句列表={诗句列表} 悬停诗句ID={悬停诗句ID} />
          )}
        </div>

        <div
          className="卡片区"
          style={{
            flex: 1,
            width: '35%',
            height: '100%',
            minHeight: 0,
            maxHeight: 'calc(100vh - 96px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            paddingRight: '16px',
            background: 'rgba(26,26,46,0.4)',
            borderRadius: '20px',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(224,224,224,0.6)',
              letterSpacing: '1px',
              marginBottom: '12px',
              textTransform: 'uppercase',
              flexShrink: 0
            }}
          >
            诗行碎光 · {诗句列表.length}
          </div>
          <诗页 诗句列表={诗句列表} 提交回调={提交回调} 悬停变更={悬停变更} />
        </div>
      </div>
    </div>
  );
};

const 根 = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
根.render(
  <React.StrictMode>
    <应用 />
  </React.StrictMode>
);
