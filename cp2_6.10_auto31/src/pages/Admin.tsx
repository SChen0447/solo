import { useNavigate } from 'react-router-dom';
import type { Album, AppAction } from '../types';
import { clearStorage } from '../utils/storage';

interface AdminProps {
  albums: Album[];
  dispatch: React.Dispatch<AppAction>;
}

export default function Admin({ albums }: AdminProps) {
  const navigate = useNavigate();

  const handleReset = () => {
    if (confirm('确定要重置所有数据吗？此操作不可恢复。')) {
      clearStorage();
      window.location.reload();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0e1a',
      color: '#fff',
      padding: '40px 24px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '16px',
                transition: 'all 0.3s ease'
              }}
            >
              ← 返回首页
            </button>
            <h1 style={{ fontSize: '32px', fontWeight: 700 }}>⚙️ 后台管理</h1>
          </div>
          <button
            onClick={handleReset}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              background: 'rgba(255, 107, 107, 0.1)',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
            }}
          >
            🗑️ 重置所有数据
          </button>
        </div>

        <div style={{
          background: 'rgba(26, 31, 53, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(124, 92, 252, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>📊 数据概览</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px'
          }}>
            <StatCard title="专辑总数" value={albums.length.toString()} color="#7c5cfc" />
            <StatCard
              title="总筹集金额"
              value={`¥${albums.reduce((sum, a) => sum + a.pledgedAmount, 0).toLocaleString()}`}
              color="#4ecdc4"
            />
            <StatCard
              title="总目标金额"
              value={`¥${albums.reduce((sum, a) => sum + a.goalAmount, 0).toLocaleString()}`}
              color="#ff6b6b"
            />
            <StatCard
              title="总投票数"
              value={albums.reduce((sum, a) => sum + a.votes.reduce((s, v) => s + v.totalVotes, 0), 0).toString()}
              color="#ffd93d"
            />
          </div>
        </div>

        <div style={{
          background: 'rgba(26, 31, 53, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(124, 92, 252, 0.2)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600 }}>🎵 专辑列表</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={thStyle}>专辑</th>
                <th style={thStyle}>艺术家</th>
                <th style={thStyle}>进度</th>
                <th style={thStyle}>已筹集</th>
                <th style={thStyle}>状态</th>
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => {
                const percentage = Math.min((album.pledgedAmount / album.goalAmount) * 100, 100);
                return (
                  <tr
                    key={album.id}
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/album/${album.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(124, 92, 252, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: album.coverGradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px'
                        }}>
                          {album.coverEmoji}
                        </div>
                        <span style={{ fontWeight: 500 }}>{album.title}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{album.artist}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '80px',
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '999px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #ff6b6b, #7c5cfc, #4ecdc4)',
                            borderRadius: '999px'
                          }} />
                        </div>
                        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>¥{album.pledgedAmount.toLocaleString()}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: percentage >= 100
                          ? 'rgba(78, 205, 196, 0.15)'
                          : 'rgba(124, 92, 252, 0.15)',
                        color: percentage >= 100 ? '#4ecdc4' : '#7c5cfc'
                      }}>
                        {percentage >= 100 ? '已达成' : '进行中'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '16px 24px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const tdStyle: React.CSSProperties = {
  padding: '16px 24px',
  fontSize: '14px'
};

function StatCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${color}20`
    }}>
      <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}
