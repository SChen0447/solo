import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { 情绪标签, 诗句 as 诗句类型 } from '../server/炉心';

interface 诗页属性 {
  诗句列表: 诗句类型[];
  提交回调: (文本: string, 情绪: 情绪标签) => Promise<void>;
  悬停变更: (id: string | null) => void;
}

const 情绪列表: 情绪标签[] = ['欢快', '忧郁', '激昂', '宁静', '思念', '幻梦', '炽热', '空灵'];

const 情绪颜色: Record<情绪标签, string> = {
  欢快: '#ff6b6b',
  忧郁: '#48dbfb',
  激昂: '#ff9ff3',
  宁静: '#b2bec3',
  思念: '#ff7675',
  幻梦: '#a29bfe',
  炽热: '#e17055',
  空灵: '#81ecec'
};

const 格式化时间 = (时间戳: number): string => {
  const 差 = Date.now() - 时间戳;
  const 分钟 = Math.floor(差 / 60000);
  const 小时 = Math.floor(差 / 3600000);
  if (分钟 < 1) return '刚刚';
  if (分钟 < 60) return `${分钟}分钟前`;
  if (小时 < 24) return `${小时}小时前`;
  return new Date(时间戳).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

interface 卡片属性 {
  诗句: 诗句类型;
  索引: number;
  悬停中: boolean;
  悬停开始: () => void;
  悬停结束: () => void;
}

const 诗卡: React.FC<卡片属性> = React.memo(({ 诗句, 索引, 悬停中, 悬停开始, 悬停结束 }) => {
  const 悬停定时器引用 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [已悬停够, 设置已悬停够] = useState(false);

  const 处理进入 = useCallback(() => {
    if (悬停定时器引用.current) clearTimeout(悬停定时器引用.current);
    悬停定时器引用.current = setTimeout(() => {
      设置已悬停够(true);
      悬停开始();
    }, 500);
  }, [悬停开始]);

  const 处理离开 = useCallback(() => {
    if (悬停定时器引用.current) clearTimeout(悬停定时器引用.current);
    设置已悬停够(false);
    悬停结束();
  }, [悬停结束]);

  useEffect(() => () => {
    if (悬停定时器引用.current) clearTimeout(悬停定时器引用.current);
  }, []);

  const 情绪色 = 情绪颜色[诗句.情绪];
  const 边框色 = (已悬停够 || 悬停中) ? 情绪色 : '#667eea';
  const 发光强度 = (已悬停够 || 悬停中) ? '20px' : '8px';

  return (
    <div
      onMouseEnter={处理进入}
      onMouseLeave={处理离开}
      style={{
        width: '280px',
        maxWidth: '100%',
        padding: '16px 18px',
        borderRadius: '16px',
        background: 'rgba(26, 26, 46, 0.85)',
        border: `1px solid ${边框色}`,
        color: '#e0e0e0',
        boxShadow: `0 0 ${发光强度} ${边框色}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
        transition: 'all 0.3s ease',
        animation: `淡入 0.5s ease forwards`,
        animationDelay: `${Math.min(索引 * 0.1, 1)}s`,
        opacity: 0,
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flexShrink: 0
      }}
    >
      <div style={{ fontSize: '15px', lineHeight: 1.6, fontWeight: 500, letterSpacing: '0.3px' }}>
        {诗句.文本}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600,
            background: `${情绪色}22`,
            color: 情绪色,
            border: `1px solid ${情绪色}44`,
            letterSpacing: '0.5px'
          }}
        >
          {诗句.情绪}
        </span>
        <span style={{ fontSize: '11px', color: 'rgba(224, 224, 224, 0.5)', fontWeight: 400 }}>
          {格式化时间(诗句.提交时间)}
        </span>
      </div>
    </div>
  );
});

诗卡.displayName = '诗卡';

const 诗页: React.FC<诗页属性> = ({ 诗句列表, 提交回调, 悬停变更 }) => {
  const [输入文本, 设置输入文本] = useState('');
  const [选中情绪, 设置选中情绪] = useState<情绪标签 | null>(null);
  const [提交中, 设置提交中] = useState(false);
  const [当前悬停, 设置当前悬停] = useState<string | null>(null);
  const 输入框引用 = useRef<HTMLTextAreaElement>(null);

  const 悬停开始 = useCallback((id: string) => {
    设置当前悬停(id);
    悬停变更(id);
  }, [悬停变更]);

  const 悬停结束 = useCallback(() => {
    设置当前悬停(null);
    悬停变更(null);
  }, [悬停变更]);

  const 处理提交 = useCallback(async () => {
    if (提交中) return;
    const 文本 = 输入文本.trim();
    if (!文本) {
      输入框引用.current?.focus();
      return;
    }
    if (文本.length > 50) return;
    if (!选中情绪) return;

    设置提交中(true);
    try {
      await 提交回调(文本, 选中情绪);
      设置输入文本('');
      设置选中情绪(null);
    } catch (e) {
      console.error('提交失败', e);
    } finally {
      设置提交中(false);
    }
  }, [输入文本, 选中情绪, 提交中, 提交回调]);

  const 按键处理 = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      处理提交();
    }
  }, [处理提交]);

  const 剩余字数 = useMemo(() => 50 - 输入文本.length, [输入文本]);
  const 可提交 = 输入文本.trim().length > 0 && 选中情绪 && !提交中;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        gap: '16px',
        position: 'relative'
      }}
    >
      <style>{`
        @keyframes 淡入 {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes 脉冲发光 {
          0%, 100% { box-shadow: 0 0 10px #667eea; }
          50% { box-shadow: 0 0 20px #667eea, 0 0 30px #667eea44; }
        }
        textarea:focus, button:focus {
          outline: none;
          animation: 脉冲发光 2s ease infinite;
        }
        @media (max-width: 768px) {
          .卡片容器 {
            flex-direction: row !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            height: 200px !important;
            width: 100% !important;
            padding: 12px !important;
          }
          .卡片容器 > div {
            width: 200px !important;
          }
          .输入区 {
            width: 100% !important;
            padding: 12px 16px !important;
          }
        }
      `}</style>

      <div
        className="卡片容器"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '4px 4px 8px 4px',
          minHeight: 0
        }}
      >
        {诗句列表.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(224,224,224,0.4)',
              fontSize: '14px'
            }}
          >
            尚无诗行，<br />成为第一个留下碎光的人吧
          </div>
        ) : (
          诗句列表.map((诗句, idx) => (
            <诗卡
              key={诗句.id}
              诗句={诗句}
              索引={idx}
              悬停中={当前悬停 === 诗句.id}
              悬停开始={() => 悬停开始(诗句.id)}
              悬停结束={悬停结束}
            />
          ))
        )}
      </div>

      <div
        className="输入区"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '12px 0 0 0',
          borderTop: '1px solid rgba(102,126,234,0.2)',
          flexShrink: 0
        }}
      >
        <div style={{ position: 'relative' }}>
          <textarea
            ref={输入框引用}
            value={输入文本}
            onChange={(e) => 设置输入文本(e.target.value.slice(0, 50))}
            onKeyDown={按键处理}
            placeholder="写下你的诗句片段（最多50字）…"
            rows={2}
            style={{
              width: '80%',
              maxWidth: '100%',
              height: '48px',
              minHeight: '48px',
              maxHeight: '80px',
              borderRadius: '24px',
              background: '#1a1a2e',
              border: '1px solid #667eea',
              color: '#ffffff',
              padding: '12px 18px',
              fontSize: '14px',
              resize: 'none',
              lineHeight: '1.5',
              transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
              fontFamily: 'inherit'
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '22%',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: 剩余字数 <= 5 ? '#ff6b6b' : 'rgba(224,224,224,0.5)',
              pointerEvents: 'none'
            }}
          >
            {剩余字数}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {情绪列表.map(情绪 => {
            const 选中 = 选中情绪 === 情绪;
            const 色 = 情绪颜色[情绪];
            return (
              <button
                key={情绪}
                type="button"
                onClick={() => 设置选中情绪(选中 ? null : 情绪)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  background: 选中 ? 色 : '#2d2d44',
                  color: 选中 ? '#0a0b16' : '#e0e0e0',
                  transform: 选中 ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  boxShadow: 选中 ? `0 0 12px ${色}aa` : 'none'
                }}
              >
                {情绪}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={处理提交}
            disabled={!可提交}
            style={{
              width: '120px',
              height: '44px',
              borderRadius: '22px',
              border: 'none',
              cursor: 可提交 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '1px',
              color: '#ffffff',
              background: 可提交
                ? 'linear-gradient(135deg, #667eea 0%, #76e0cc 100%)'
                : 'linear-gradient(135deg, #3a3a55 0%, #2d2d44 100%)',
              opacity: 可提交 ? 1 : 0.5,
              transition: 'all 0.3s ease',
              boxShadow: 可提交 ? '0 4px 20px rgba(102,126,234,0.4)' : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>
              {提交中 ? '提交…' : '提交诗行'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default 诗页;
