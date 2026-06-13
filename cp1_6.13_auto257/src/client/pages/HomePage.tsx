import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DiaryEntrySummary } from '../types';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

function getHueFromTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const minute = date.getMinutes();
  return ((hour * 60 + minute) / 1440) * 360;
}

function HomePage() {
  const [entries, setEntries] = useState<DiaryEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/entries');
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (id: string) => {
    navigate(`/read/${id}`);
  };

  const handleNewEntry = () => {
    navigate('/edit');
  };

  const cardStyle = (timestamp: number) => {
    const hue = getHueFromTimestamp(timestamp);
    return {
      background: `linear-gradient(135deg, hsla(${hue}, 70%, 25%, 0.4) 0%, hsla(${hue + 30}, 60%, 15%, 0.3) 100%)`,
    };
  };

  return (
    <div className="home-page">
      <style>{`
        .home-page {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 80px;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }

        .home-header {
          width: 100%;
          max-width: 900px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .home-title {
          font-size: 24px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 2px;
        }

        .new-entry-btn {
          padding: 12px 28px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border: 0.5px solid rgba(167, 139, 250, 0.5);
          border-radius: 8px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .new-entry-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(167, 139, 250, 0.8);
        }

        .entries-timeline {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .entry-card {
          width: 100%;
          padding: 24px 28px;
          border-radius: 16px;
          border: 0.5px solid rgba(167, 139, 250, 0.5);
          backdrop-filter: blur(12px);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          position: relative;
          overflow: hidden;
        }

        .entry-card:hover {
          transform: translateY(-5px);
          backdrop-filter: blur(20px);
          border-color: rgba(167, 139, 250, 0.8);
        }

        .entry-card-content {
          position: relative;
          z-index: 1;
        }

        .entry-date {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 8px;
        }

        .entry-meta {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .entry-preview-colors {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }

        .empty-state {
          width: 100%;
          max-width: 900px;
          text-align: center;
          padding: 80px 0;
          color: rgba(255, 255, 255, 0.5);
        }

        .empty-state p {
          margin-bottom: 24px;
          font-size: 16px;
        }

        .loading {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .home-page {
            padding: 40px 16px;
          }

          .home-header {
            margin-bottom: 30px;
          }

          .home-title {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="home-header">
        <h1 className="home-title">笔迹·光时序</h1>
        <button className="new-entry-btn" onClick={handleNewEntry}>
          + 新建条目
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <p>还没有日记条目，开始创建你的第一幅光影画作吧</p>
          <button className="new-entry-btn" onClick={handleNewEntry}>
            + 新建条目
          </button>
        </div>
      ) : (
        <div className="entries-timeline">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="entry-card"
              style={cardStyle(entry.timestamp)}
              onClick={() => handleCardClick(entry.id)}
            >
              <div className="entry-card-content">
                <div className="entry-date">{formatDate(entry.timestamp)}</div>
                <div className="entry-meta">{entry.pathCount} 条笔迹</div>
                {entry.previewPaths && entry.previewPaths.length > 0 && (
                  <div className="entry-preview-colors">
                    {entry.previewPaths.map((p, i) => (
                      <div
                        key={i}
                        className="color-dot"
                        style={{ backgroundColor: p.color, color: p.color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
